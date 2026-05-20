"use strict";

/**
 * Pure helper functions extracted from the WatchTower prototype server.
 *
 * Everything in this module is side-effect-free and IO-free so it can be
 * unit-tested without spinning up an HTTP server. `server.js` requires
 * these helpers and wires them into the actual request handlers.
 *
 * Extracted by the Backend Testing / QA role so we have meaningful
 * coverage of the stats aggregation, event buffer, query filtering, and
 * static-file path-traversal protection.
 *
 * @module server-helpers
 */

const path = require("path");

/**
 * Map a request URL to the static file path the server actually serves.
 *
 * The prototype server exposes two friendly aliases:
 *   - `/`        → `/index.html`
 *   - `/demo`    → `/hosted_demo/index.html`
 *
 * Any other path is returned unchanged.
 *
 * @param {string} urlPath - Pathname from the incoming request.
 * @returns {string} The resolved static path to serve.
 */
function resolveAlias(urlPath) {
  if (urlPath === "/" || urlPath === "" || urlPath === undefined || urlPath === null) {
    return "/index.html";
  }
  if (urlPath === "/demo" || urlPath === "/demo/") {
    return "/hosted_demo/index.html";
  }
  return urlPath;
}

/**
 * Decide whether a request path is safe to serve from `root`.
 *
 * Joins `root` with `urlPath`, resolves the absolute path, and checks
 * that the result still lives under `root`. This blocks classic
 * path-traversal attempts like `/../../etc/passwd`.
 *
 * @param {string} root - Absolute directory the server is allowed to serve from.
 * @param {string} urlPath - Pathname from the incoming request.
 * @returns {boolean} `true` when the resolved path is inside `root`.
 */
function isPathSafe(root, urlPath) {
  if (typeof root !== "string" || typeof urlPath !== "string") {
    return false;
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(path.join(root, urlPath));
  return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep);
}

/**
 * Append `incoming` events to a bounded `buffer`, evicting the oldest
 * entries when the buffer exceeds `maxEvents`.
 *
 * Mutates `buffer` in place to mirror the existing server behavior, and
 * also returns it for convenience. Non-array `incoming` is treated as
 * empty so the helper is safe to call with `body.events || [body]`-style
 * shapes.
 *
 * @param {Array<Object>} buffer - Existing event buffer (mutated).
 * @param {Array<Object>} incoming - Events to append.
 * @param {number} maxEvents - Maximum buffer size; older events are dropped first.
 * @returns {Array<Object>} The mutated `buffer`.
 */
function appendWithCap(buffer, incoming, maxEvents) {
  if (!Array.isArray(buffer)) {
    return [];
  }
  const cap = Number.isFinite(maxEvents) && maxEvents >= 0 ? Math.floor(maxEvents) : 0;
  if (Array.isArray(incoming)) {
    for (let i = 0; i < incoming.length; i++) {
      buffer.push(incoming[i]);
    }
  }
  while (buffer.length > cap) {
    buffer.shift();
  }
  return buffer;
}

/**
 * Filter a list of events the way `GET /api/events` does.
 *
 * Supports filtering by `type` and `deployVersion`, and returns the most
 * recent `limit` events (default 100). The input array is never mutated.
 *
 * @param {Array<Object>} events - Full event buffer.
 * @param {Object} [options] - Query parameters.
 * @param {string} [options.type] - Restrict to events with this `type`.
 * @param {string} [options.version] - Restrict to events with this `deployVersion`.
 * @param {number} [options.limit] - Maximum number of events to return.
 * @returns {Array<Object>} A new array of matching events.
 */
function filterEvents(events, options) {
  if (!Array.isArray(events)) {
    return [];
  }
  const opts = options && typeof options === "object" ? options : {};
  let filtered = events;
  if (typeof opts.type === "string" && opts.type.length > 0) {
    filtered = filtered.filter(function (e) { return e && e.type === opts.type; });
  }
  if (typeof opts.version === "string" && opts.version.length > 0) {
    filtered = filtered.filter(function (e) { return e && e.deployVersion === opts.version; });
  }
  const rawLimit = opts.limit;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 100;
  return filtered.slice(-limit);
}

/**
 * Compute dashboard statistics from an in-memory event buffer.
 *
 * This is the pure version of the server's `/api/stats` handler. The
 * caller supplies the "current" timestamp and the active-user window so
 * the function is deterministic and testable without faking timers.
 *
 * Returned fields:
 *   - `activeUsers`: distinct `sessionId` values seen in the window.
 *   - `totalEvents`: total events in the buffer.
 *   - `totalErrors`: number of recent error events (capped at 50).
 *   - `errorsByVersion`: error counts grouped by `deployVersion`.
 *   - `latencyByRoute`: per-route latency summary with `count`, `p50`,
 *     `p95`, `avg`, and up to 100 recent sample points.
 *   - `recentErrors`: up to 50 most recent error events.
 *
 * @param {Array<Object>} events - Event buffer.
 * @param {number} now - Current time in milliseconds (e.g. `Date.now()`).
 * @param {number} activeUserWindowMs - How far back to look for active users.
 * @returns {{
 *   activeUsers: number,
 *   totalEvents: number,
 *   totalErrors: number,
 *   errorsByVersion: Object<string, number>,
 *   latencyByRoute: Object<string, Object>,
 *   recentErrors: Array<Object>
 * }}
 */
function computeStats(events, now, activeUserWindowMs) {
  const list = Array.isArray(events) ? events : [];
  const currentTime = Number.isFinite(now) ? now : Date.now();
  const windowMs = Number.isFinite(activeUserWindowMs) && activeUserWindowMs >= 0
    ? activeUserWindowMs
    : 5 * 60 * 1000;
  const cutoff = currentTime - windowMs;

  const activeSessions = new Set();
  const errorsByVersion = {};
  const latencyByRoute = {};
  const recentErrors = [];

  for (let i = list.length - 1; i >= 0; i--) {
    const ev = list[i];
    if (!ev || typeof ev !== "object") {
      continue;
    }

    const ts = ev.timestamp ? new Date(ev.timestamp).getTime() : NaN;
    if (Number.isFinite(ts) && ts >= cutoff && ev.sessionId) {
      activeSessions.add(ev.sessionId);
    }

    if (ev.type === "error") {
      const ver = ev.deployVersion || "unknown";
      errorsByVersion[ver] = (errorsByVersion[ver] || 0) + 1;
      if (recentErrors.length < 50) {
        recentErrors.push(ev);
      }
    }

    if (ev.type === "pageload" && ev.data && ev.data.duration != null) {
      const route = ev.route || "/";
      if (!latencyByRoute[route]) {
        latencyByRoute[route] = [];
      }
      latencyByRoute[route].push({
        duration: ev.data.duration,
        ttfb: ev.data.ttfb,
        timestamp: ev.timestamp,
      });
    }
  }

  const latencySummary = {};
  Object.keys(latencyByRoute).forEach(function (route) {
    const durations = latencyByRoute[route]
      .map(function (d) { return d.duration; })
      .filter(function (d) { return Number.isFinite(d); })
      .sort(function (a, b) { return a - b; });
    const total = durations.reduce(function (a, b) { return a + b; }, 0);
    latencySummary[route] = {
      count: durations.length,
      p50: durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] || durations[durations.length - 1] : 0,
      p95: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1] : 0,
      avg: durations.length > 0 ? Math.round(total / durations.length) : 0,
      points: latencyByRoute[route].slice(-100),
    };
  });

  return {
    activeUsers: activeSessions.size,
    totalEvents: list.length,
    totalErrors: recentErrors.length,
    errorsByVersion: errorsByVersion,
    latencyByRoute: latencySummary,
    recentErrors: recentErrors,
  };
}

module.exports = {
  resolveAlias,
  isPathSafe,
  appendWithCap,
  filterEvents,
  computeStats,
};