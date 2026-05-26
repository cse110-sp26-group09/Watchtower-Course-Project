"use strict";

/**
 * Prototype 1 SQLite event store.
 *
 * Wraps `better-sqlite3` so the prototype 1 server can persist WatchTower
 * telemetry to a single-file database. Pure helpers (`normalizeForStorage`,
 * `rowToApiEvent`, `generateEventId`, `isValidTimestamp`) are exported so
 * they can be unit tested without opening a database file.
 *
 * Schema (single `events` table):
 *
 * | column       | type | notes                                              |
 * |--------------|------|----------------------------------------------------|
 * | id           | TEXT | primary key, generated server-side if not provided |
 * | type         | TEXT | event type (page_view, error, performance, ...)    |
 * | timestamp    | TEXT | ISO-8601, client-side                              |
 * | source       | TEXT | optional originating script/label                  |
 * | session_id   | TEXT | per-tab session id from the SDK                    |
 * | page_url     | TEXT | full URL or pathname when the event was created    |
 * | message      | TEXT | human-readable summary, e.g. error message         |
 * | severity     | TEXT | optional severity label                            |
 * | app_version  | TEXT | deploy/release label                               |
 * | metadata     | TEXT | JSON-stringified extras (data payload, userId, ..) |
 * | received_at  | TEXT | ISO-8601 server ingestion time                     |
 *
 * @module prototype_1/server/event-store
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const KNOWN_EVENT_TYPES = Object.freeze([
  "page_view",
  "error",
  "performance",
  "interaction",
  "feedback",
  "custom",
  "pageload",
  "click",
  "login",
  "logout",
]);

/**
 * Generate a short pseudo-random event identifier.
 *
 * Uses `crypto.randomUUID` when available; falls back to a timestamp+random
 * id so old Node versions still work.
 *
 * @returns {string} A stable event id (e.g. `"7f1c3d8e-..."`).
 */
function generateEventId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Return true if the value is a non-empty string that parses as a valid date.
 *
 * @param {unknown} value - Value to inspect.
 * @returns {boolean}
 */
function isValidTimestamp(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

/**
 * Validate the minimum envelope of a WatchTower event.
 *
 * @param {unknown} event - Candidate event.
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return { ok: false, reason: "Event must be a non-null object" };
  }
  if (typeof event.type !== "string" || event.type.trim().length === 0) {
    return { ok: false, reason: "type is required and must be a non-empty string" };
  }
  if (event.timestamp !== undefined && !isValidTimestamp(event.timestamp)) {
    return { ok: false, reason: "timestamp must be a valid ISO-8601 string" };
  }
  if (event.data !== undefined && (event.data === null || typeof event.data !== "object" || Array.isArray(event.data))) {
    return { ok: false, reason: "data must be an object when provided" };
  }
  return { ok: true };
}

/**
 * Pick the first non-empty string from a list of candidates.
 *
 * @private
 * @param {Array<unknown>} candidates - Values to search.
 * @returns {string|null}
 */
function firstNonEmptyString(candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return null;
}

/**
 * Translate an inbound event (camelCase or snake_case, SDK or external)
 * into the snake_case row shape used by the SQLite `events` table.
 *
 * Anything that isn't a first-class column (notably `data`, `userId`,
 * `appName`, `route`, and arbitrary `metadata` extras) is preserved inside
 * the JSON-stringified `metadata` column so {@link rowToApiEvent} can
 * reconstruct the original event for the dashboard.
 *
 * @param {Object} rawEvent - Inbound event payload.
 * @returns {{
 *   id: string,
 *   type: string,
 *   timestamp: string,
 *   source: string|null,
 *   session_id: string|null,
 *   page_url: string|null,
 *   message: string|null,
 *   severity: string|null,
 *   app_version: string|null,
 *   metadata: string,
 *   received_at: string
 * }} A row ready for the prepared INSERT statement.
 */
function normalizeForStorage(rawEvent) {
  const event = rawEvent && typeof rawEvent === "object" ? rawEvent : {};
  const dataObject = event.data && typeof event.data === "object" && !Array.isArray(event.data) ? event.data : {};
  const userMetadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata : {};

  const id = typeof event.id === "string" && event.id.length > 0 ? event.id : generateEventId();
  const type = String(event.type || "custom").trim() || "custom";
  const timestamp = isValidTimestamp(event.timestamp) ? event.timestamp : new Date().toISOString();

  const sessionId = firstNonEmptyString([event.sessionId, event.session_id]);
  const pageUrl = firstNonEmptyString([event.pageUrl, event.page_url, event.url, event.route]);
  const appVersion = firstNonEmptyString([event.appVersion, event.app_version, event.deployVersion]);
  const source = firstNonEmptyString([event.source, dataObject.source]);
  const message = firstNonEmptyString([event.message, dataObject.message]);
  const severity = firstNonEmptyString([event.severity, type === "error" ? "critical" : null]);

  const metadataPayload = Object.assign(
    {},
    userMetadata,
    {
      data: dataObject,
      userId: event.userId !== undefined ? event.userId : null,
      appName: typeof event.appName === "string" ? event.appName : null,
      url: typeof event.url === "string" ? event.url : null,
      route: typeof event.route === "string" ? event.route : null,
      deployVersion: appVersion,
    }
  );

  return {
    id,
    type,
    timestamp,
    source: source,
    session_id: sessionId,
    page_url: pageUrl,
    message,
    severity,
    app_version: appVersion,
    metadata: JSON.stringify(metadataPayload),
    received_at: new Date().toISOString(),
  };
}

/**
 * Translate a SQLite row back into the dashboard-friendly event shape.
 *
 * The returned object exposes both camelCase fields (used by the existing
 * prototype 1 dashboard such as `sessionId`, `deployVersion`, `appName`,
 * `url`, `route`, `data`) and the canonical column-aligned fields
 * (`session_id`, `page_url`, `app_version`, `severity`).
 *
 * @param {Object} row - Row fetched from the events table.
 * @returns {Object} Dashboard-compatible event object.
 */
function rowToApiEvent(row) {
  if (!row) {
    return null;
  }

  let metadata = {};
  if (typeof row.metadata === "string" && row.metadata.length > 0) {
    try {
      metadata = JSON.parse(row.metadata);
      if (!metadata || typeof metadata !== "object") {
        metadata = {};
      }
    } catch (_error) {
      metadata = {};
    }
  }

  const dataPayload = metadata.data && typeof metadata.data === "object" ? metadata.data : {};
  const route = typeof metadata.route === "string" && metadata.route.length > 0 ? metadata.route : null;
  const url = typeof metadata.url === "string" && metadata.url.length > 0 ? metadata.url : (row.page_url || null);
  const appName = typeof metadata.appName === "string" ? metadata.appName : null;

  return {
    id: row.id,
    type: row.type,
    timestamp: row.timestamp,
    source: row.source,
    severity: row.severity,
    message: row.message,
    sessionId: row.session_id,
    session_id: row.session_id,
    pageUrl: row.page_url,
    page_url: row.page_url,
    appVersion: row.app_version,
    app_version: row.app_version,
    deployVersion: row.app_version,
    appName: appName,
    userId: metadata.userId !== undefined ? metadata.userId : null,
    url: url,
    route: route,
    data: dataPayload,
    metadata: metadata,
    receivedAt: row.received_at,
    received_at: row.received_at,
  };
}

/**
 * Open (or create) the SQLite database file and ensure the events table
 * and indexes exist.
 *
 * The directory containing `databasePath` is created automatically when
 * missing so callers do not have to coordinate filesystem setup.
 *
 * @param {string} databasePath - Absolute filesystem path to the .sqlite file.
 * @returns {Object} An opened `better-sqlite3` database handle.
 */
function openDatabase(databasePath) {
  const directory = path.dirname(databasePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");

  db.prepare(
    "CREATE TABLE IF NOT EXISTS events (" +
      "id TEXT PRIMARY KEY, " +
      "type TEXT NOT NULL, " +
      "timestamp TEXT NOT NULL, " +
      "source TEXT, " +
      "session_id TEXT, " +
      "page_url TEXT, " +
      "message TEXT, " +
      "severity TEXT, " +
      "app_version TEXT, " +
      "metadata TEXT, " +
      "received_at TEXT NOT NULL" +
      ")"
  ).run();

  db.prepare("CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)").run();
  db.prepare("CREATE INDEX IF NOT EXISTS idx_events_app_version ON events(app_version)").run();
  db.prepare("CREATE INDEX IF NOT EXISTS idx_events_received_at ON events(received_at)").run();
  db.prepare("CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)").run();

  return db;
}

/**
 * Create a high-level event store bound to an opened database handle.
 *
 * Returned methods:
 * - `insertEvent(event)` - persist a normalized event, returns the stored row's API shape.
 * - `getEvents({type, version, limit})` - filtered listing, most-recent first.
 * - `getStats(activeUserWindowMs)` - aggregated dashboard stats.
 * - `countEvents()` - convenience count.
 * - `pruneOldest(maxRows)` - cap the table size by deleting oldest rows.
 * - `close()` - close the underlying database handle.
 *
 * @param {Object} db - Opened `better-sqlite3` database handle.
 * @returns {Object} Event store API.
 */
function createEventStore(db) {
  const insertStatement = db.prepare(
    "INSERT INTO events (" +
      "id, type, timestamp, source, session_id, page_url, message, severity, app_version, metadata, received_at" +
      ") VALUES (" +
      "@id, @type, @timestamp, @source, @session_id, @page_url, @message, @severity, @app_version, @metadata, @received_at" +
      ")"
  );

  const upsertStatement = db.prepare(
    "INSERT INTO events (" +
      "id, type, timestamp, source, session_id, page_url, message, severity, app_version, metadata, received_at" +
      ") VALUES (" +
      "@id, @type, @timestamp, @source, @session_id, @page_url, @message, @severity, @app_version, @metadata, @received_at" +
      ") ON CONFLICT(id) DO NOTHING"
  );

  const countStatement = db.prepare("SELECT COUNT(*) AS count FROM events");

  const deleteOverflowStatement = db.prepare(
    "DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY received_at ASC, rowid ASC LIMIT ?)"
  );

  /**
   * Insert one normalized event. If an event with the same id already
   * exists, the insert is skipped silently.
   *
   * @param {Object} event - Inbound event payload (camelCase or snake_case).
   * @returns {Object} The stored event in dashboard API shape.
   */
  function insertEvent(event) {
    const row = normalizeForStorage(event);
    upsertStatement.run(row);
    return rowToApiEvent(row);
  }

  /**
   * Insert a batch of events inside a single transaction.
   *
   * @param {Array<Object>} events - Inbound events.
   * @returns {Array<Object>} Stored events in dashboard API shape.
   */
  function insertEventBatch(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }
    const insertMany = db.transaction((items) => {
      const stored = [];
      for (const item of items) {
        const row = normalizeForStorage(item);
        upsertStatement.run(row);
        stored.push(rowToApiEvent(row));
      }
      return stored;
    });
    return insertMany(events);
  }

  /**
   * Filtered event listing. Returns the most-recent N rows that match the
   * optional filters, in descending insertion order.
   *
   * @param {Object} [options] - Filter options.
   * @param {string} [options.type] - Optional `type` exact-match filter.
   * @param {string} [options.version] - Optional `app_version` exact-match filter.
   * @param {number} [options.limit] - Maximum rows to return (default 100).
   * @returns {Array<Object>} Events in dashboard API shape.
   */
  function getEvents(options) {
    const opts = options || {};
    const conditions = [];
    const params = [];

    if (typeof opts.type === "string" && opts.type.length > 0) {
      conditions.push("type = ?");
      params.push(opts.type);
    }
    if (typeof opts.version === "string" && opts.version.length > 0) {
      conditions.push("app_version = ?");
      params.push(opts.version);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const limit = Number.isFinite(opts.limit) && opts.limit > 0 ? Math.floor(opts.limit) : 100;

    const rows = db
      .prepare("SELECT * FROM events " + whereClause + " ORDER BY received_at DESC, rowid DESC LIMIT ?")
      .all(...params, limit);

    return rows.map(rowToApiEvent);
  }

  /**
   * Compute dashboard statistics.
   *
   * Stats include:
   * - `totalEvents`, `totalErrors`
   * - `activeUsers` (distinct sessions in the last `activeUserWindowMs`)
   * - `eventsByType`, `errorsByVersion`
   * - `latencyByRoute` (computed from performance / pageload metadata)
   * - `recentErrors`, `recentActivity`
   * - `analytics` (breakdownCounts, feedbackBreakdown, userSeries, etc.)
   *
   * @param {number} [activeUserWindowMs] - Active-user lookback window. Defaults to 5 minutes.
   * @returns {Object} Dashboard stats payload.
   */
  function getStats(activeUserWindowMs) {
    const windowMs = Number.isFinite(activeUserWindowMs) ? activeUserWindowMs : 5 * 60 * 1000;
    const totalEvents = countStatement.get().count;

    const activeWindowStart = new Date(Date.now() - windowMs).toISOString();
    const activeUserRow = db
      .prepare(
        "SELECT COUNT(DISTINCT session_id) AS count FROM events " +
          "WHERE session_id IS NOT NULL AND received_at >= ?"
      )
      .get(activeWindowStart);

    const eventsByTypeRows = db
      .prepare("SELECT type, COUNT(*) AS count FROM events GROUP BY type")
      .all();
    const eventsByType = {};
    for (const row of eventsByTypeRows) {
      eventsByType[row.type] = row.count;
    }

    const errorsByVersionRows = db
      .prepare(
        "SELECT COALESCE(app_version, 'unknown') AS app_version, COUNT(*) AS count " +
          "FROM events WHERE type = 'error' GROUP BY COALESCE(app_version, 'unknown')"
      )
      .all();
    const errorsByVersion = {};
    let totalErrors = 0;
    for (const row of errorsByVersionRows) {
      errorsByVersion[row.app_version] = row.count;
      totalErrors += row.count;
    }

    const recentErrorRows = db
      .prepare("SELECT * FROM events WHERE type = 'error' ORDER BY received_at DESC, rowid DESC LIMIT 20")
      .all();
    const recentActivityRows = db
      .prepare("SELECT * FROM events ORDER BY received_at DESC, rowid DESC LIMIT 50")
      .all();

    const recentErrors = recentErrorRows.map(rowToApiEvent);
    const recentActivity = recentActivityRows.map(rowToApiEvent);

    const performanceRows = db
      .prepare(
        "SELECT * FROM events WHERE type IN ('performance', 'pageload') ORDER BY received_at DESC, rowid DESC LIMIT 5000"
      )
      .all();

    const latencyByRoute = {};
    for (const row of performanceRows) {
      const apiEvent = rowToApiEvent(row);
      const data = apiEvent.data || {};
      const duration = Number(data.duration);
      if (!Number.isFinite(duration)) {
        continue;
      }
      const routeKey = apiEvent.route || apiEvent.page_url || "/";
      if (!latencyByRoute[routeKey]) {
        latencyByRoute[routeKey] = {
          durations: [],
          ttfbValues: [],
          points: [],
        };
      }
      latencyByRoute[routeKey].durations.push(duration);
      const ttfb = Number(data.ttfb);
      if (Number.isFinite(ttfb)) {
        latencyByRoute[routeKey].ttfbValues.push(ttfb);
      }
      if (latencyByRoute[routeKey].points.length < 100) {
        latencyByRoute[routeKey].points.push({
          duration: Math.round(duration),
          ttfb: Number.isFinite(ttfb) ? Math.round(ttfb) : 0,
          timestamp: apiEvent.timestamp,
        });
      }
    }

    const outputLatencyByRoute = {};
    for (const [route, bucket] of Object.entries(latencyByRoute)) {
      const sortedDurations = bucket.durations.slice().sort((a, b) => a - b);
      const avg = bucket.durations.length === 0
        ? 0
        : Math.round(
            bucket.durations.reduce((sum, value) => sum + value, 0) /
              bucket.durations.length
          );
      outputLatencyByRoute[route] = {
        count: bucket.durations.length,
        p50: percentile(sortedDurations, 50),
        p95: percentile(sortedDurations, 95),
        avg,
        points: bucket.points,
      };
    }

    let averageLatency = 0;
    let perfSampleCount = 0;
    let perfDurationSum = 0;
    for (const bucket of Object.values(latencyByRoute)) {
      perfSampleCount += bucket.durations.length;
      perfDurationSum += bucket.durations.reduce((sum, value) => sum + value, 0);
    }
    if (perfSampleCount > 0) {
      averageLatency = Math.round(perfDurationSum / perfSampleCount);
    }

    const analytics = computeAnalytics(db);

    return {
      totalEvents,
      totalErrors,
      activeUsers: activeUserRow.count,
      eventsByType,
      errorsByVersion,
      latencyByRoute: outputLatencyByRoute,
      recentErrors,
      recentActivity,
      averageLatency,
      analytics,
    };
  }

  /**
   * @returns {number} Total number of stored events.
   */
  function countEvents() {
    return countStatement.get().count;
  }

  /**
   * Trim the table to at most `maxRows` rows by deleting the oldest entries.
   *
   * @param {number} maxRows - Maximum number of rows to keep.
   * @returns {number} Number of rows deleted.
   */
  function pruneOldest(maxRows) {
    if (!Number.isFinite(maxRows) || maxRows <= 0) {
      return 0;
    }
    const total = countStatement.get().count;
    if (total <= maxRows) {
      return 0;
    }
    const result = deleteOverflowStatement.run(total - maxRows);
    return result.changes || 0;
  }

  function close() {
    db.close();
  }

  return {
    insertEvent,
    insertEventBatch,
    getEvents,
    getStats,
    countEvents,
    pruneOldest,
    close,
    _db: db,
    _insertStatement: insertStatement,
  };
}

/**
 * Nearest-rank percentile over an ascending-sorted array.
 *
 * @private
 * @param {number[]} sortedValues - Ascending-sorted samples.
 * @param {number} percent - Percentile in [0, 100].
 * @returns {number}
 */
function percentile(sortedValues, percent) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(100, percent));
  const rank = Math.ceil((clamped / 100) * sortedValues.length) - 1;
  const index = Math.min(Math.max(rank, 0), sortedValues.length - 1);
  return Math.round(sortedValues[index]);
}

/**
 * Compute the analytics block returned by `getStats`. Kept separate so
 * the SQL projection can stay readable.
 *
 * @private
 * @param {Object} db - Opened `better-sqlite3` database handle.
 * @returns {Object} Analytics summary.
 */
function computeAnalytics(db) {
  const breakdownCounts = {
    performance: 0,
    errors: 0,
    feedback: 0,
    clicks: 0,
  };
  const feedbackBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let feedbackTotal = 0;
  let feedbackSum = 0;
  let customActivityTotal = 0;

  const summaryRows = db
    .prepare("SELECT type, metadata FROM events ORDER BY received_at ASC, rowid ASC")
    .all();

  for (const row of summaryRows) {
    if (row.type === "pageload" || row.type === "performance") {
      breakdownCounts.performance += 1;
    } else if (row.type === "error") {
      breakdownCounts.errors += 1;
    } else if (row.type === "click" || row.type === "interaction") {
      breakdownCounts.clicks += 1;
    } else if (row.type === "custom" || row.type === "login" || row.type === "feedback" || row.type === "page_view") {
      customActivityTotal += 1;
    }

    if (row.type === "feedback") {
      breakdownCounts.feedback += 1;
      try {
        const metadata = JSON.parse(row.metadata || "{}");
        const data = metadata.data && typeof metadata.data === "object" ? metadata.data : {};
        const rating = Number(data.rating);
        if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
          const bucket = Math.round(rating);
          feedbackBreakdown[bucket] = (feedbackBreakdown[bucket] || 0) + 1;
          feedbackSum += bucket;
          feedbackTotal += 1;
        }
      } catch (_error) {
        // Ignore malformed feedback payloads.
      }
    }
  }

  const lastSevenRows = db
    .prepare(
      "SELECT * FROM (" +
        "SELECT events.*, events.rowid AS _row_order FROM events " +
        "ORDER BY received_at DESC, events.rowid DESC LIMIT 7" +
      ") ORDER BY received_at ASC, _row_order ASC"
    )
    .all();

  const userSeriesValues = [0, 0, 0, 0, 0, 0, 0];
  const activitySeriesValues = [0, 0, 0, 0, 0, 0, 0];
  const seenSessions = new Set();
  const offset = userSeriesValues.length - lastSevenRows.length;

  lastSevenRows.forEach((row, index) => {
    if (row.session_id) {
      seenSessions.add(row.session_id);
    }
    userSeriesValues[offset + index] = seenSessions.size;
    activitySeriesValues[offset + index] =
      row.type === "custom" || row.type === "feedback" || row.type === "login" || row.type === "page_view"
        ? 1
        : 0;
  });

  return {
    breakdownCounts,
    feedbackBreakdown,
    feedbackTotal,
    feedbackAverage: feedbackTotal === 0 ? 0 : feedbackSum / feedbackTotal,
    customActivityTotal,
    userSeries: {
      labels: ["1", "2", "3", "4", "5", "6", "7"],
      values: userSeriesValues,
    },
    activitySeries: {
      labels: ["1", "2", "3", "4", "5", "6", "7"],
      values: activitySeriesValues,
    },
  };
}

module.exports = {
  KNOWN_EVENT_TYPES,
  generateEventId,
  isValidTimestamp,
  validateEvent,
  normalizeForStorage,
  rowToApiEvent,
  openDatabase,
  createEventStore,
};
