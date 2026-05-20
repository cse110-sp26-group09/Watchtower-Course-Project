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
 * Pure logic (stats aggregation, event buffer cap, GET /api/events
 * filtering, and static-file path safety) lives in `./server-helpers.js`
 * so it can be unit tested without spinning up an HTTP server. The unit
 * test suite is `tests/unit/server-helpers.test.js`.
 *
 * @module server
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const {
  resolveAlias,
  isPathSafe,
  appendWithCap,
  filterEvents,
  computeStats,
} = require("./server-helpers");

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
 * Path resolution and traversal protection live in `server-helpers.js`
 * so they can be unit tested directly.
 *
 * @param {http.IncomingMessage} req - Incoming HTTP request.
 * @param {http.ServerResponse} res - HTTP response object.
 * @param {string} urlPath - URL pathname (without query string).
 * @returns {void}
 */
function serveStatic(req, res, urlPath) {
  var root = path.join(__dirname, "..");
  var aliased = resolveAlias(urlPath);

  if (!isPathSafe(root, aliased)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  var resolved = path.resolve(path.join(root, aliased));

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
        });
        appendWithCap(events, incoming, MAX_EVENTS);
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
    var version = parsed.searchParams.get("version");
    var rawLimit = parsed.searchParams.get("limit");
    var limit = rawLimit ? parseInt(rawLimit, 10) : 100;
    json(res, 200, {
      events: filterEvents(events, { type: type, version: version, limit: limit }),
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/stats") {
    json(res, 200, computeStats(events, Date.now(), ACTIVE_USER_WINDOW));
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
