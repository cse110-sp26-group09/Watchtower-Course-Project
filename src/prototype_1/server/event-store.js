"use strict";

/**
 * Prototype 1 Supabase-backed event store.
 *
 * Persists WatchTower telemetry to the `events` table in Supabase Postgres.
 * Pure helpers (`normalizeForStorage`, `rowToApiEvent`, `generateEventId`,
 * `isValidTimestamp`) are exported so they can be unit tested without opening
 * a network connection.
 *
 * Expected Supabase table:
 *
 * | column       | type        | notes                                              |
 * |--------------|-------------|----------------------------------------------------|
 * | id           | text        | primary key, generated server-side if not provided |
 * | type         | text        | event type (page_view, error, performance, ...)    |
 * | timestamp    | timestamptz | client-side event timestamp                        |
 * | source       | text        | optional originating script/label                  |
 * | session_id   | text        | per-tab session id from the SDK                    |
 * | page_url     | text        | full URL or pathname when the event was created    |
 * | message      | text        | human-readable summary, e.g. error message         |
 * | severity     | text        | optional severity label                            |
 * | app_version  | text        | deploy/release label                               |
 * | metadata     | jsonb       | extras (data payload, userId, appName, route, ...) |
 * | received_at  | timestamptz | server ingestion time                              |
 *
 * @module prototype_1/server/event-store
 */

import path from "path";
import { fileURLToPath } from "url";

import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

loadEnv({ quiet: true });
loadEnv({ path: path.join(REPO_ROOT, ".env"), quiet: true });

const DEFAULT_EVENTS_TABLE = "events";
const MAX_STATS_ROWS = Number.isFinite(parseInt(process.env.EVENT_STORE_STATS_LIMIT, 10))
  ? parseInt(process.env.EVENT_STORE_STATS_LIMIT, 10)
  : 10000;

const EVENTS_TABLE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS public.events (
  id text PRIMARY KEY,
  type text NOT NULL,
  timestamp timestamptz NOT NULL,
  source text,
  session_id text,
  page_url text,
  message text,
  severity text,
  app_version text,
  metadata jsonb DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
CREATE INDEX IF NOT EXISTS idx_events_app_version ON public.events(app_version);
CREATE INDEX IF NOT EXISTS idx_events_received_at ON public.events(received_at);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON public.events(session_id);
`;

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

function isValidTimestamp(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

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

function firstNonEmptyString(candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return null;
}

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

  const metadataPayload = Object.assign({}, userMetadata, {
    data: dataObject,
    userId: event.userId !== undefined ? event.userId : null,
    appName: typeof event.appName === "string" ? event.appName : null,
    url: typeof event.url === "string" ? event.url : null,
    route: typeof event.route === "string" ? event.route : null,
    deployVersion: appVersion,
  });

  return {
    id,
    type,
    timestamp,
    source,
    session_id: sessionId,
    page_url: pageUrl,
    message,
    severity,
    app_version: appVersion,
    metadata: metadataPayload,
    received_at: new Date().toISOString(),
  };
}

function parseMetadata(metadataValue) {
  if (!metadataValue) {
    return {};
  }
  if (typeof metadataValue === "object" && !Array.isArray(metadataValue)) {
    return metadataValue;
  }
  if (typeof metadataValue === "string" && metadataValue.length > 0) {
    try {
      const parsed = JSON.parse(metadataValue);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  return {};
}

function rowToApiEvent(row) {
  if (!row) {
    return null;
  }

  const metadata = parseMetadata(row.metadata);
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
    appName,
    userId: metadata.userId !== undefined ? metadata.userId : null,
    url,
    route,
    data: dataPayload,
    metadata,
    receivedAt: row.received_at,
    received_at: row.received_at,
  };
}

function createSupabaseClient(options) {
  const opts = options || {};
  const supabaseUrl = opts.supabaseUrl || process.env.SUPABASE_URL;
  const supabaseKey =
    opts.supabaseKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required for the event store");
  }
  if (!supabaseKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required for the event store");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function openDatabase(options) {
  return createSupabaseClient(options);
}

function assertSupabaseResult(result, context) {
  if (result.error) {
    throw new Error(context + ": " + result.error.message);
  }
  return result;
}

function createEventStore(client, options) {
  const opts = options || {};
  const supabase = client || createSupabaseClient(opts);
  const tableName = opts.tableName || process.env.SUPABASE_EVENTS_TABLE || DEFAULT_EVENTS_TABLE;

  async function insertRows(rows) {
    if (rows.length === 0) {
      return [];
    }
    const result = await supabase
      .from(tableName)
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
      .select("*");
    assertSupabaseResult(result, "Failed to insert events");
    return rows.map(rowToApiEvent);
  }

  async function insertEvent(event) {
    const stored = await insertRows([normalizeForStorage(event)]);
    return stored[0] || null;
  }

  async function insertEventBatch(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }
    return insertRows(events.map(normalizeForStorage));
  }

  async function getEvents(options) {
    const opts = options || {};
    const limit = Number.isFinite(opts.limit) && opts.limit > 0 ? Math.floor(opts.limit) : 100;

    let query = supabase
      .from(tableName)
      .select("*")
      .order("received_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (typeof opts.type === "string" && opts.type.length > 0) {
      query = query.eq("type", opts.type);
    }
    if (typeof opts.version === "string" && opts.version.length > 0) {
      query = query.eq("app_version", opts.version);
    }

    const result = await query;
    assertSupabaseResult(result, "Failed to fetch events");
    return (result.data || []).map(rowToApiEvent);
  }

  async function countEvents() {
    const result = await supabase
      .from(tableName)
      .select("id", { count: "exact", head: true });
    assertSupabaseResult(result, "Failed to count events");
    return result.count || 0;
  }

  async function pruneOldest(maxRows) {
    if (!Number.isFinite(maxRows) || maxRows <= 0) {
      return 0;
    }

    const total = await countEvents();
    if (total <= maxRows) {
      return 0;
    }

    const overflow = total - maxRows;
    const oldestResult = await supabase
      .from(tableName)
      .select("id")
      .order("received_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(overflow);
    assertSupabaseResult(oldestResult, "Failed to find old events");

    const ids = (oldestResult.data || []).map((row) => row.id).filter(Boolean);
    if (ids.length === 0) {
      return 0;
    }

    const deleteResult = await supabase.from(tableName).delete().in("id", ids);
    assertSupabaseResult(deleteResult, "Failed to prune old events");
    return ids.length;
  }

  async function getStats(activeUserWindowMs) {
    const windowMs = Number.isFinite(activeUserWindowMs) ? activeUserWindowMs : 5 * 60 * 1000;
    const activeWindowStart = new Date(Date.now() - windowMs).toISOString();

    const [
      totalEvents,
      activeUsersResult,
      allRowsResult,
      recentErrorRowsResult,
      recentActivityRowsResult,
      performanceRowsResult,
    ] = await Promise.all([
      countEvents(),
      supabase
        .from(tableName)
        .select("session_id")
        .not("session_id", "is", null)
        .gte("received_at", activeWindowStart)
        .limit(MAX_STATS_ROWS),
      supabase
        .from(tableName)
        .select("*")
        .order("received_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(MAX_STATS_ROWS),
      supabase
        .from(tableName)
        .select("*")
        .eq("type", "error")
        .order("received_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(20),
      supabase
        .from(tableName)
        .select("*")
        .order("received_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50),
      supabase
        .from(tableName)
        .select("*")
        .in("type", ["performance", "pageload"])
        .order("received_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(5000),
    ]);

    assertSupabaseResult(activeUsersResult, "Failed to fetch active users");
    assertSupabaseResult(allRowsResult, "Failed to fetch analytics rows");
    assertSupabaseResult(recentErrorRowsResult, "Failed to fetch recent errors");
    assertSupabaseResult(recentActivityRowsResult, "Failed to fetch recent activity");
    assertSupabaseResult(performanceRowsResult, "Failed to fetch performance rows");

    const allRows = allRowsResult.data || [];
    const eventsByType = {};
    const errorsByVersion = {};
    let totalErrors = 0;

    for (const row of allRows) {
      eventsByType[row.type] = (eventsByType[row.type] || 0) + 1;
      if (row.type === "error") {
        const version = row.app_version || "unknown";
        errorsByVersion[version] = (errorsByVersion[version] || 0) + 1;
        totalErrors += 1;
      }
    }

    const activeSessions = new Set();
    for (const row of activeUsersResult.data || []) {
      if (row.session_id) {
        activeSessions.add(row.session_id);
      }
    }

    const latencyByRoute = buildLatencyByRoute(performanceRowsResult.data || []);
    const analytics = computeAnalytics(allRows);

    return {
      totalEvents,
      totalErrors,
      activeUsers: activeSessions.size,
      eventsByType,
      errorsByVersion,
      latencyByRoute: latencyByRoute.byRoute,
      recentErrors: (recentErrorRowsResult.data || []).map(rowToApiEvent),
      recentActivity: (recentActivityRowsResult.data || []).map(rowToApiEvent),
      averageLatency: latencyByRoute.averageLatency,
      analytics,
    };
  }

  async function close() {
    return undefined;
  }

  return {
    insertEvent,
    insertEventBatch,
    getEvents,
    getStats,
    countEvents,
    pruneOldest,
    close,
    _client: supabase,
    _tableName: tableName,
  };
}

function buildLatencyByRoute(rows) {
  const latencyByRoute = {};

  for (const row of rows) {
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
  let perfSampleCount = 0;
  let perfDurationSum = 0;

  for (const [route, bucket] of Object.entries(latencyByRoute)) {
    const sortedDurations = bucket.durations.slice().sort((a, b) => a - b);
    const durationSum = bucket.durations.reduce((sum, value) => sum + value, 0);
    perfSampleCount += bucket.durations.length;
    perfDurationSum += durationSum;
    outputLatencyByRoute[route] = {
      count: bucket.durations.length,
      p50: percentile(sortedDurations, 50),
      p95: percentile(sortedDurations, 95),
      avg: bucket.durations.length === 0 ? 0 : Math.round(durationSum / bucket.durations.length),
      points: bucket.points,
    };
  }

  return {
    byRoute: outputLatencyByRoute,
    averageLatency: perfSampleCount === 0 ? 0 : Math.round(perfDurationSum / perfSampleCount),
  };
}

function percentile(sortedValues, percent) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(100, percent));
  const rank = Math.ceil((clamped / 100) * sortedValues.length) - 1;
  const index = Math.min(Math.max(rank, 0), sortedValues.length - 1);
  return Math.round(sortedValues[index]);
}

function computeAnalytics(rows) {
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

  for (const row of rows) {
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
      const metadata = parseMetadata(row.metadata);
      const data = metadata.data && typeof metadata.data === "object" ? metadata.data : {};
      const rating = Number(data.rating);
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
        const bucket = Math.round(rating);
        feedbackBreakdown[bucket] = (feedbackBreakdown[bucket] || 0) + 1;
        feedbackSum += bucket;
        feedbackTotal += 1;
      }
    }
  }

  const lastSevenRows = rows.slice(-7);
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

export {
  EVENTS_TABLE_SCHEMA_SQL,
  KNOWN_EVENT_TYPES,
  generateEventId,
  isValidTimestamp,
  validateEvent,
  normalizeForStorage,
  rowToApiEvent,
  createSupabaseClient,
  openDatabase,
  createEventStore,
};
