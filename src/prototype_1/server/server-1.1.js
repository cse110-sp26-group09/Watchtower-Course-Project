const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const MAX_EVENTS = 10000;
const ACTIVE_USER_WINDOW = 5 * 60 * 1000;
const sseClients = new Set();
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const db = new Database('app.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    session_id TEXT,
    user_id TEXT,
    deploy_version TEXT,
    app_name TEXT,
    event_url TEXT,
    route TEXT,
    data_json TEXT NOT NULL,
    received_at TEXT NOT NULL
  )
`).run();

db.prepare('CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_events_deploy_version ON events(deploy_version)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_events_received_at ON events(received_at)').run();

const insertEventStmt = db.prepare(`
  INSERT INTO events (
    type, timestamp, session_id, user_id, deploy_version, app_name,
    event_url, route, data_json, received_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const deleteOverflowStmt = db.prepare(`
  DELETE FROM events
  WHERE id IN (
    SELECT id FROM events
    ORDER BY id ASC
    LIMIT ?
  )
`);

const countEventsStmt = db.prepare('SELECT COUNT(*) AS count FROM events');

/**
 * Sends a JSON response with standard CORS headers.
 * @param {import('http').ServerResponse} res - HTTP response object.
 * @param {number} status - HTTP status code.
 * @param {*} data - JSON-serializable response payload.
 * @returns {void}
 */
function sendJson(res, status, data) {
  applyCors(res);
  res.writeHead(status, {
    'Content-Type': 'application/json'
  });

  res.end(JSON.stringify(data));
}

/**
 * Applies permissive CORS headers to a response.
 * @param {import('http').ServerResponse} res - HTTP response object.
 * @returns {void}
 */
function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Parses the request body as JSON.
 * @param {import('http').IncomingMessage} req - HTTP request object.
 * @returns {Promise.<*>} Parsed JSON payload.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

/**
 * Checks whether a value is a plain object (not null, not array).
 * @param {*} value - Value to inspect.
 * @returns {boolean}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks whether a value is a non-empty string after trimming.
 * @param {*} value - Value to inspect.
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that a value is a parseable timestamp string.
 * @param {*} value - Candidate timestamp.
 * @returns {boolean}
 */
function isValidTimestamp(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

/**
 * Validates optional context fields on an event envelope.
 * @param {Object.<string, *>} event - Event object to validate.
 * @returns {string|null} Error message on failure, otherwise null.
 */
function validateOptionalContext(event) {
  if (event.sessionId !== undefined && typeof event.sessionId !== 'string') {
    return 'sessionId must be a string when provided';
  }

  if (event.userId !== undefined && event.userId !== null && typeof event.userId !== 'string') {
    return 'userId must be a string or null when provided';
  }

  if (event.deployVersion !== undefined && typeof event.deployVersion !== 'string') {
    return 'deployVersion must be a string when provided';
  }

  if (event.appName !== undefined && typeof event.appName !== 'string') {
    return 'appName must be a string when provided';
  }

  if (event.url !== undefined && typeof event.url !== 'string') {
    return 'url must be a string when provided';
  }

  if (event.route !== undefined && typeof event.route !== 'string') {
    return 'route must be a string when provided';
  }

  return null;
}

/**
 * Validates required event envelope fields and optional context fields.
 * @param {*} event - Event payload to validate.
 * @returns {string|null} Error message on failure, otherwise null.
 */
function validateEvent(event) {
  if (!isObject(event)) {
    return 'Event must be a non-null object';
  }

  if (!isNonEmptyString(event.type)) {
    return 'type is required and must be a non-empty string';
  }

  if (!isValidTimestamp(event.timestamp)) {
    return 'timestamp is required and must be a valid ISO-8601 string';
  }

  if (!isObject(event.data)) {
    return 'data is required and must be a non-null object';
  }

  return validateOptionalContext(event);
}

/**
 * Maps a database row into API event shape.
 * @param {{
 *   type: string,
 *   timestamp: string,
 *   session_id: string|null,
 *   user_id: string|null,
 *   deploy_version: string|null,
 *   app_name: string|null,
 *   event_url: string|null,
 *   route: string|null,
 *   data_json: string,
 *   received_at: string
 * }} row - Row fetched from the events table.
 * @returns {{
 *   type: string,
 *   timestamp: string,
 *   sessionId: string|null,
 *   userId: string|null,
 *   deployVersion: string|null,
 *   appName: string|null,
 *   url: string|null,
 *   route: string|null,
 *   data: Object.<string, *>,
 *   receivedAt: string
 * }}
 */
function rowToEvent(row) {
  return {
    type: row.type,
    timestamp: row.timestamp,
    sessionId: row.session_id,
    userId: row.user_id,
    deployVersion: row.deploy_version,
    appName: row.app_name,
    url: row.event_url,
    route: row.route,
    data: JSON.parse(row.data_json),
    receivedAt: row.received_at
  };
}

/**
 * Enforces the configured event cap by removing oldest rows first.
 * @returns {void}
 */
function pruneIfNeeded() {
  const total = countEventsStmt.get().count;

  if (total > MAX_EVENTS) {
    deleteOverflowStmt.run(total - MAX_EVENTS);
  }
}

/**
 * Computes a percentile value from an ascending-sorted numeric array.
 * @param {number[]} sortedValues - Values sorted ascending.
 * @param {number} p - Percentile in range [0, 100].
 * @returns {number}
 */
function percentile(sortedValues, p) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const rank = Math.ceil((p / 100) * sortedValues.length) - 1;
  const index = Math.min(Math.max(rank, 0), sortedValues.length - 1);
  return sortedValues[index];
}

/**
 * Parses a positive integer query value with fallback.
 * @param {string|null} value - Raw query parameter value.
 * @param {number} fallback - Default value if parse fails.
 * @returns {number}
 */
function parseLimit(value, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return n;
}

/**
 * Sends event batches to all active SSE clients.
 * @param {Array.<Object.<string, *>>} eventBatch - Newly accepted events.
 * @returns {void}
 */
function broadcastEvents(eventBatch) {
  const eventPayload = JSON.stringify(eventBatch);
  for (const client of sseClients) {
    client.write(`data: ${eventPayload}\n\n`);
  }
}

/**
 * Resolves app routes into static asset paths.
 * @param {string} pathname - Incoming URL pathname.
 * @returns {string}
 */
function resolveStaticPath(pathname) {
  if (pathname === '/' || pathname === '') {
    return '/index.html';
  }
  if (pathname === '/demo' || pathname === '/demo/') {
    return '/demo/index.html';
  }
  if (pathname === '/sdk/watchtower.js') {
    return '/sdk/watchtower.js';
  }
  return pathname;
}

/**
 * Serves a static file from the repository parent directory.
 * @param {import('http').ServerResponse} res - HTTP response object.
 * @param {string} pathname - Incoming URL pathname.
 * @returns {void}
 */
function serveStaticFile(res, pathname) {
  const candidateRoot = path.join(__dirname, '..');
  const requestedPath = resolveStaticPath(pathname);
  const filePath = path.join(candidateRoot, requestedPath);
  const resolvedFilePath = path.resolve(filePath);
  const resolvedRoot = path.resolve(candidateRoot);

  if (!resolvedFilePath.startsWith(resolvedRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(resolvedFilePath, (error, fileStat) => {
    if (error || !fileStat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const extension = path.extname(resolvedFilePath);
    res.writeHead(200, {
      'Content-Type': MIME[extension] || 'application/octet-stream'
    });
    fs.createReadStream(resolvedFilePath).pipe(res);
  });
}

/**
 * Builds fixed 7-slot series data aligned right with zero padding.
 * @param {Array.<Object.<string, *>>} events - Source events ordered oldest-to-newest.
 * @param {function(Object.<string, *>, number, Array.<Object.<string, *>>): number} valueGetter - Series value callback.
 * @returns {{labels: string[], values: number[]}}
 */
function buildSeries(events, valueGetter) {
  const labels = ['1', '2', '3', '4', '5', '6', '7'];
  const values = [0, 0, 0, 0, 0, 0, 0];
  const window = events.slice(-7);

  for (let i = 0; i < window.length; i += 1) {
    values[labels.length - window.length + i] = valueGetter(window[i], i, window);
  }

  return { labels, values };
}

/**
 * Main HTTP request handler for the WatchTower event API.
 * @param {import('http').IncomingMessage} req - HTTP request object.
 * @param {import('http').ServerResponse} res - HTTP response object.
 * @returns {Promise.<void>}
 */
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.writeHead(204);
    return res.end();
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = requestUrl.pathname;

  if (req.method === 'POST' && path === '/api/events') {
    try {
      const payload = await parseBody(req);
      const events = Array.isArray(payload?.events) ? payload.events : [payload];

      if (events.length === 0) {
        return sendJson(res, 400, { error: 'events array must not be empty' });
      }

      for (let i = 0; i < events.length; i += 1) {
        const err = validateEvent(events[i]);
        if (err) {
          return sendJson(res, 400, {
            error: `Invalid event at index ${i}: ${err}`
          });
        }
      }

      const receivedAt = new Date().toISOString();

      for (const event of events) {
        insertEventStmt.run(
          event.type,
          event.timestamp,
          event.sessionId ?? null,
          event.userId ?? null,
          event.deployVersion ?? null,
          event.appName ?? null,
          event.url ?? null,
          event.route ?? null,
          JSON.stringify(event.data),
          receivedAt
        );
      }

      pruneIfNeeded();
      broadcastEvents(events.map((event) => ({
        type: event.type,
        timestamp: event.timestamp,
        sessionId: event.sessionId ?? null,
        userId: event.userId ?? null,
        deployVersion: event.deployVersion ?? null,
        appName: event.appName ?? null,
        url: event.url ?? null,
        route: event.route ?? null,
        data: event.data,
        receivedAt
      })));
      return sendJson(res, 200, { accepted: events.length });
    } catch (err) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
  }

  if (req.method === 'GET' && path === '/api/events') {
    const type = requestUrl.searchParams.get('type');
    const version = requestUrl.searchParams.get('version');
    const limit = parseLimit(requestUrl.searchParams.get('limit'), 100);

    const conditions = [];
    const params = [];

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    if (version) {
      conditions.push('deploy_version = ?');
      params.push(version);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT * FROM events
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
    `).all(...params, limit);

    return sendJson(res, 200, { events: rows.map(rowToEvent) });
  }

  if (req.method === 'GET' && path === '/api/stats') {
    const totalEvents = countEventsStmt.get().count;

    const activeUsersRows = db.prepare(`
      SELECT COUNT(DISTINCT session_id) AS count
      FROM events
      WHERE session_id IS NOT NULL
      AND received_at >= ?
    `).get(new Date(Date.now() - ACTIVE_USER_WINDOW).toISOString());

    const errorsByVersionRows = db.prepare(`
      SELECT COALESCE(deploy_version, 'unknown') AS deploy_version, COUNT(*) AS count
      FROM events
      WHERE type = 'error'
      GROUP BY COALESCE(deploy_version, 'unknown')
    `).all();

    const recentErrorRows = db.prepare(`
      SELECT * FROM events
      WHERE type = 'error'
      ORDER BY id DESC
      LIMIT 20
    `).all();

    const recentActivityRows = db.prepare(`
      SELECT * FROM events
      ORDER BY id DESC
      LIMIT 20
    `).all();

    const lastSevenRowsAsc = db.prepare(`
      SELECT * FROM (
        SELECT * FROM events
        ORDER BY id DESC
        LIMIT 7
      )
      ORDER BY id ASC
    `).all();

    const analyticsSourceRows = db.prepare(`
      SELECT type, session_id, data_json
      FROM events
      ORDER BY id ASC
    `).all();

    const pageloadRows = db.prepare(`
      SELECT route, timestamp, data_json
      FROM events
      WHERE type = 'pageload'
      ORDER BY id DESC
      LIMIT 5000
    `).all();

    const latencyByRoute = {};

    for (const row of pageloadRows) {
      const data = JSON.parse(row.data_json);
      const route = row.route || 'unknown';
      const duration = Number(data.duration);
      const ttfb = Number(data.ttfb);

      if (!Number.isFinite(duration)) {
        continue;
      }

      if (!latencyByRoute[route]) {
        latencyByRoute[route] = {
          durations: [],
          ttfbValues: [],
          points: []
        };
      }

      latencyByRoute[route].durations.push(duration);
      if (Number.isFinite(ttfb)) {
        latencyByRoute[route].ttfbValues.push(ttfb);
      }

      if (latencyByRoute[route].points.length < 100) {
        latencyByRoute[route].points.push({
          duration: Math.round(duration),
          ttfb: Number.isFinite(ttfb) ? Math.round(ttfb) : 0,
          timestamp: row.timestamp
        });
      }
    }

    const outputLatencyByRoute = {};

    for (const [route, values] of Object.entries(latencyByRoute)) {
      const sorted = [...values.durations].sort((a, b) => a - b);
      const avg = Math.round(values.durations.reduce((sum, d) => sum + d, 0) / values.durations.length);

      outputLatencyByRoute[route] = {
        count: values.durations.length,
        p50: Math.round(percentile(sorted, 50)),
        p95: Math.round(percentile(sorted, 95)),
        avg,
        points: values.points
      };
    }

    const errorsByVersion = {};
    for (const row of errorsByVersionRows) {
      errorsByVersion[row.deploy_version] = row.count;
    }

    const breakdownCounts = {
      performance: 0,
      errors: 0,
      feedback: 0,
      clicks: 0
    };
    const feedbackBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const feedbackRatings = [];
    let customActivityTotal = 0;

    for (const row of analyticsSourceRows) {
      if (row.type === 'pageload') {
        breakdownCounts.performance += 1;
      }
      if (row.type === 'error') {
        breakdownCounts.errors += 1;
      }
      if (row.type === 'click') {
        breakdownCounts.clicks += 1;
      }
      if (row.type === 'custom' || row.type === 'login' || row.type === 'feedback') {
        customActivityTotal += 1;
      }
      if (row.type === 'feedback') {
        breakdownCounts.feedback += 1;
        try {
          const data = JSON.parse(row.data_json);
          const rating = Number(data.rating);
          if (Number.isFinite(rating)) {
            feedbackRatings.push(rating);
            if (feedbackBreakdown[rating] === undefined) {
              feedbackBreakdown[rating] = 0;
            }
            feedbackBreakdown[rating] += 1;
          }
        } catch (_ignored) {
          // Ignore malformed payloads in analytics-only projections.
        }
      }
    }

    const userSeries = buildSeries(lastSevenRowsAsc.map((row) => ({
      sessionId: row.session_id
    })), (_event, index, relevantEvents) => {
      const uniqueSessionIds = new Set();
      for (let i = 0; i <= index; i += 1) {
        uniqueSessionIds.add(relevantEvents[i].sessionId);
      }
      return uniqueSessionIds.size;
    });

    const activitySeries = buildSeries(lastSevenRowsAsc.map((row) => ({
      type: row.type
    })), (event) => {
      if (event.type === 'custom' || event.type === 'feedback' || event.type === 'login') {
        return 1;
      }
      return 0;
    });

    return sendJson(res, 200, {
      activeUsers: activeUsersRows.count,
      totalEvents,
      totalErrors: recentErrorRows.length,
      errorsByVersion,
      latencyByRoute: outputLatencyByRoute,
      recentErrors: recentErrorRows.map(rowToEvent),
      recentActivity: recentActivityRows.map(rowToEvent),
      analytics: {
        userSeries,
        activitySeries,
        breakdownCounts,
        feedbackAverage: feedbackRatings.length > 0 ? calculateAverage(feedbackRatings) : 0,
        feedbackTotal: feedbackRatings.length,
        feedbackBreakdown,
        customActivityTotal
      }
    });
  }

  if (req.method === 'GET' && path === '/api/events/stream') {
    applyCors(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write(':\n\n');
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  return serveStaticFile(res, path);
});

/**
 * Computes the arithmetic mean for a numeric array.
 * @param {number[]} values - Input values.
 * @returns {number}
 */
function calculateAverage(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

server.listen(PORT, () => {
  console.log("Candidate 1 dashboard running at http://localhost:" + PORT);
  console.log("  Dashboard : http://localhost:" + PORT + "/");
  console.log("  Demo app  : http://localhost:" + PORT + "/demo");
  console.log("  SDK       : http://localhost:" + PORT + "/sdk/watchtower.js");
});
