const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MAX_EVENTS = 10000;
const ACTIVE_USER_WINDOW = 5 * 60 * 1000;

const events = [];
const sseClients = new Set();

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

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

function broadcast(eventList) {
  var data = JSON.stringify(eventList);
  sseClients.forEach(function (res) {
    res.write("data: " + data + "\n\n");
  });
}

function serveStatic(req, res, urlPath) {
  var root = path.join(__dirname, "..");

  if (urlPath === "/" || urlPath === "") urlPath = "/dashboard/index.html";
  else if (urlPath === "/demo") urlPath = "/demo/index.html";
  else if (urlPath === "/demo/") urlPath = "/demo/index.html";

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
