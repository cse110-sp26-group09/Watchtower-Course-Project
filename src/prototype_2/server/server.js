/**
 * WatchTower prototype server.
 *
 * A small Node.js HTTP server that:
 *   - serves the dashboard, demo, and SDK static files
 *   - accepts JSON event payloads on `POST /api/events`
 *   - returns stored events and aggregated stats over JSON
 *   - streams new events to connected dashboards via Server-Sent Events
 *
 * The server is intentionally framework-free so the prototype stays
 * easy to read and run for an undergraduate course project.
 *
 * @module server
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MAX_EVENTS = 10000;
const ACTIVE_USER_WINDOW = 5 * 60 * 1000;

const events = [];
const sseClients = new Set();

/**
 * File extension to MIME type mapping for the static file handler.
 * @type {Object<string, string>}
 */
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

/**
 * Apply permissive CORS headers so the SDK can post events from any origin.
 *
 * @param {http.ServerResponse} res - HTTP response object.
 * @returns {void}
 */
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Send a JSON response to the client.
 *
 * @param {http.ServerResponse} res - HTTP response object.
 * @param {number} status - HTTP status code.
 * @param {Object} data - Response payload that will be JSON-serialized.
 * @returns {void}
 */
function json(res, status, data) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * Read a request body and parse it as JSON.
 *
 * @param {http.IncomingMessage} req - Incoming HTTP request.
 * @returns {Promise<Object>} Resolves with the parsed body, or rejects on invalid JSON.
 */
function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

/**
 * Broadcast a batch of events to every connected SSE client.
 *
 * @param {Array<Object>} eventList - Newly ingested events.
 * @returns {void}
 */
function broadcast(eventList) {
  var data = JSON.stringify(eventList);
  sseClients.forEach(function (res) {
    res.write("data: " + data + "\n\n");
  });
}

/**
 * Serve a static file from the prototype root, with a small set of
 * friendly URL aliases for the dashboard and demo pages.
 *
 * The function applies basic path-traversal protection so that requests
 * cannot escape the prototype directory.
 *
 * @param {http.IncomingMessage} req - Incoming HTTP request.
 * @param {http.ServerResponse} res - HTTP response object.
 * @param {string} urlPath - URL pathname (without query string).
 * @returns {void}
 */
function serveStatic(req, res, urlPath) {
  var root = path.join(__dirname, "..");

  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";
  else if (urlPath === "/demo" || urlPath === "/demo/") urlPath = "/hosted_demo/index.html";

  var filePath = path.join(root, urlPath);
  var resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(root))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(resolved, function (err, stat) {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    var ext = path.extname(resolved);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(resolved).pipe(res);
  });
}

/**
 * Compute dashboard statistics from the in-memory event buffer.
 *
 * Returned fields:
 *   - `activeUsers`: count of distinct sessions seen in the last 5 minutes.
 *   - `totalEvents`: total events currently stored.
 *   - `totalErrors`: count of recent error events (capped at 50).
 *   - `errorsByVersion`: error counts grouped by `deployVersion`.
 *   - `latencyByRoute`: per-route latency summary with count, p50, p95,
 *     average, and the most recent sample points.
 *   - `recentErrors`: up to 50 most recent error events.
 *
 * @returns {{
 *   activeUsers: number,
 *   totalEvents: number,
 *   totalErrors: number,
 *   errorsByVersion: Object<string, number>,
 *   latencyByRoute: Object<string, Object>,
 *   recentErrors: Array<Object>
 * }}
 */
function getStats() {
  var now = Date.now();
  var cutoff = now - ACTIVE_USER_WINDOW;

  var activeSessions = new Set();
  var errorsByVersion = {};
  var latencyByRoute = {};
  var recentErrors = [];

  for (var i = events.length - 1; i >= 0; i--) {
    var ev = events[i];
    var ts = new Date(ev.timestamp).getTime();

    if (ts >= cutoff) {
      activeSessions.add(ev.sessionId);
    }

    if (ev.type === "error") {
      var ver = ev.deployVersion || "unknown";
      errorsByVersion[ver] = (errorsByVersion[ver] || 0) + 1;
      if (recentErrors.length < 50) recentErrors.push(ev);
    }

    if (ev.type === "pageload" && ev.data && ev.data.duration != null) {
      var route = ev.route || "/";
      if (!latencyByRoute[route]) latencyByRoute[route] = [];
      latencyByRoute[route].push({
        duration: ev.data.duration,
        ttfb: ev.data.ttfb,
        timestamp: ev.timestamp,
      });
    }
  }

  var latencySummary = {};
  Object.keys(latencyByRoute).forEach(function (route) {
    var durations = latencyByRoute[route]
      .map(function (d) { return d.duration; })
      .sort(function (a, b) { return a - b; });
    latencySummary[route] = {
      count: durations.length,
      p50: durations[Math.floor(durations.length * 0.5)] || 0,
      p95: durations[Math.floor(durations.length * 0.95)] || 0,
      avg: Math.round(durations.reduce(function (a, b) { return a + b; }, 0) / durations.length),
      points: latencyByRoute[route].slice(-100),
    };
  });

  return {
    activeUsers: activeSessions.size,
    totalEvents: events.length,
    totalErrors: recentErrors.length,
    errorsByVersion: errorsByVersion,
    latencyByRoute: latencySummary,
    recentErrors: recentErrors,
  };
}

var server = http.createServer(function (req, res) {
  var parsed = new URL(req.url, "http://localhost");
  var pathname = parsed.pathname;

  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && pathname === "/api/events") {
    readBody(req)
      .then(function (body) {
        var incoming = body.events || [body];
        incoming.forEach(function (ev) {
          ev.receivedAt = new Date().toISOString();
          events.push(ev);
        });
        while (events.length > MAX_EVENTS) events.shift();
        broadcast(incoming);
        json(res, 200, { accepted: incoming.length });
      })
      .catch(function () {
        json(res, 400, { error: "Invalid JSON" });
      });
    return;
  }

  if (req.method === "GET" && pathname === "/api/events") {
    var type = parsed.searchParams.get("type");
    var limit = parseInt(parsed.searchParams.get("limit") || "100", 10);
    var version = parsed.searchParams.get("version");

    var filtered = events;
    if (type) filtered = filtered.filter(function (e) { return e.type === type; });
    if (version) filtered = filtered.filter(function (e) { return e.deployVersion === version; });
    json(res, 200, { events: filtered.slice(-limit) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/stats") {
    json(res, 200, getStats());
    return;
  }

  if (req.method === "GET" && pathname === "/api/events/stream") {
    cors(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(":\n\n");
    sseClients.add(res);
    req.on("close", function () { sseClients.delete(res); });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, function () {
  console.log("WatchTower running at http://localhost:" + PORT);
  console.log("  Dashboard : http://localhost:" + PORT + "/");
  console.log("  Demo app  : http://localhost:" + PORT + "/demo");
  console.log("  API       : http://localhost:" + PORT + "/api/events");
});
