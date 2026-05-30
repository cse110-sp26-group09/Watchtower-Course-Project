"use strict";

/**
 * Prototype 1 PostgreSQL-backed WatchTower server.
 *
 * Serves the prototype 1 dashboard, the monitored ShopDemo app, and the
 * browser SDK as static files; persists ingested events to a single
 * PostgreSQL database using Supabase via {@link module:prototype_1/server/event-store};
 * exposes a small JSON API (`/api/health`, `/api/events`, `/api/stats`,
 * `/api/events/stream`) used both by the dashboard and the local
 * verification workflow described in `docs/architecture/event-storage.md`.
 *
 * Database connection:
 *   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`
 *
 * Override the events table with the `SUPABASE_EVENTS_TABLE` environment variable.
 *
 * @module prototype_1/server
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const eventStoreModule = require("./event-store");

const PORT = process.env.PORT || 3000;
const MAX_EVENTS = Number.isFinite(parseInt(process.env.MAX_EVENTS, 10))
  ? parseInt(process.env.MAX_EVENTS, 10)
  : 10000;
const ACTIVE_USER_WINDOW_MS = 5 * 60 * 1000;
const EVENTS_TABLE = process.env.SUPABASE_EVENTS_TABLE || "events";

const sseClients = new Set();

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const database = eventStoreModule.openDatabase();
const store = eventStoreModule.createEventStore(database);

/**
 * Apply permissive CORS headers used by the SDK and verification scripts.
 *
 * @param {http.ServerResponse} response - HTTP response object.
 * @returns {void}
 */
function applyCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Send a JSON response with CORS headers.
 *
 * @param {http.ServerResponse} response - HTTP response object.
 * @param {number} statusCode - HTTP status code.
 * @param {Object} payload - JSON-serializable response body.
 * @returns {void}
 */
function sendJson(response, statusCode, payload) {
  applyCors(response);
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

/**
 * Read a request body and parse it as JSON.
 *
 * @param {http.IncomingMessage} request - Incoming HTTP request.
 * @returns {Promise<Object>} Resolves with the parsed body.
 */
function readJsonBody(request) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    request.on("data", function (chunk) {
      chunks.push(chunk);
    });
    request.on("end", function () {
      const raw = Buffer.concat(chunks).toString();
      if (raw.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

/**
 * Send a batch of events to all connected SSE clients.
 *
 * @param {Array<Object>} eventBatch - Newly stored events.
 * @returns {void}
 */
function broadcastEvents(eventBatch) {
  if (!Array.isArray(eventBatch) || eventBatch.length === 0) {
    return;
  }
  const payload = JSON.stringify(eventBatch);
  sseClients.forEach(function (response) {
    response.write("data: " + payload + "\n\n");
  });
}

/**
 * Resolve URL aliases to concrete static paths.
 *
 * @param {string} pathname - Incoming URL pathname.
 * @returns {string}
 */
function resolveStaticPath(pathname) {
  if (pathname === "/" || pathname === "") {
    return "/index.html";
  }
  if (pathname === "/demo" || pathname === "/demo/") {
    return "/demo/index.html";
  }
  return pathname;
}

/**
 * Serve a static file from the prototype 1 root, with traversal protection.
 *
 * @param {http.ServerResponse} response - HTTP response object.
 * @param {string} pathname - Incoming URL pathname.
 * @returns {void}
 */
function serveStaticFile(response, pathname) {
  const prototypeRoot = path.resolve(__dirname, "..");
  const requestedPath = resolveStaticPath(pathname);
  const candidatePath = path.resolve(path.join(prototypeRoot, requestedPath));

  if (!candidatePath.startsWith(prototypeRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(candidatePath, function (error, fileStat) {
    if (error || !fileStat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    const extension = path.extname(candidatePath);
    response.writeHead(200, {
      "Content-Type": MIME[extension] || "application/octet-stream",
    });
    fs.createReadStream(candidatePath).pipe(response);
  });
}

/**
 * Handle `POST /api/events`. Accepts either a single event or `{events: [...]}`,
 * validates each event, persists the valid ones, and broadcasts to SSE.
 *
 * @param {http.IncomingMessage} request - HTTP request.
 * @param {http.ServerResponse} response - HTTP response.
 * @returns {Promise<void>}
 */
async function handleIngestEvents(request, response) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (_error) {
    sendJson(response, 400, { error: "Invalid JSON" });
    return;
  }

  const incomingEvents = Array.isArray(body && body.events)
    ? body.events
    : Array.isArray(body)
    ? body
    : [body];

  const validEvents = [];
  let rejected = 0;
  for (const candidate of incomingEvents) {
    const validation = eventStoreModule.validateEvent(candidate);
    if (!validation.ok) {
      rejected += 1;
      continue;
    }
    validEvents.push(candidate);
  }

  let storedEvents = [];
  if (validEvents.length > 0) {
    try {
      storedEvents = await store.insertEventBatch(validEvents);
      await store.pruneOldest(MAX_EVENTS);
    } catch (error) {
      console.error("[prototype_1] Failed to insert events:", error);
      sendJson(response, 500, { error: "Failed to store events" });
      return;
    }
  }

  if (storedEvents.length > 0) {
    broadcastEvents(storedEvents);
  }

  sendJson(response, 200, {
    accepted: storedEvents.length,
    rejected,
    events: storedEvents,
  });
}

/**
 * Handle `GET /api/events` with optional `type`, `version`, and `limit` filters.
 *
 * @param {http.ServerResponse} response - HTTP response.
 * @param {URL} parsedUrl - Parsed request URL.
 * @returns {Promise<void>}
 */
async function handleListEvents(response, parsedUrl) {
  const typeFilter = parsedUrl.searchParams.get("type");
  const versionFilter = parsedUrl.searchParams.get("version");
  const rawLimit = parsedUrl.searchParams.get("limit");
  const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 100;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;

  let events;
  try {
    events = await store.getEvents({
      type: typeFilter || undefined,
      version: versionFilter || undefined,
      limit,
    });
  } catch (error) {
    console.error("[prototype_1] Failed to fetch events:", error);
    sendJson(response, 500, { error: "Failed to fetch events" });
    return;
  }

  sendJson(response, 200, { events });
}

/**
 * Handle `GET /api/stats`.
 *
 * @param {http.ServerResponse} response - HTTP response.
 * @returns {Promise<void>}
 */
async function handleStats(response) {
  let stats;
  try {
    stats = await store.getStats(ACTIVE_USER_WINDOW_MS);
  } catch (error) {
    console.error("[prototype_1] Failed to fetch stats:", error);
    sendJson(response, 500, { error: "Failed to fetch stats" });
    return;
  }
  sendJson(response, 200, stats);
}

/**
 * Handle `GET /api/health`.
 *
 * @param {http.ServerResponse} response - HTTP response.
 * @returns {Promise<void>}
 */
async function handleHealth(response) {
  let eventCount = 0;
  try {
    eventCount = await store.countEvents();
  } catch (error) {
    console.error("[prototype_1] Failed to count events:", error);
    sendJson(response, 500, {
      status: "error",
      storage: "postgresql",
      table: EVENTS_TABLE,
      error: "Failed to count events",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  sendJson(response, 200, {
    status: "ok",
    storage: "postgresql",
    table: EVENTS_TABLE,
    eventCount,
    knownEventTypes: eventStoreModule.KNOWN_EVENT_TYPES,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle `GET /api/events/stream`. Subscribes the response to the SSE
 * broadcast set until the connection is closed.
 *
 * @param {http.IncomingMessage} request - HTTP request.
 * @param {http.ServerResponse} response - HTTP response.
 * @returns {void}
 */
function handleEventStream(request, response) {
  applyCors(response);
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  response.write(":\n\n");
  sseClients.add(response);
  request.on("close", function () {
    sseClients.delete(response);
  });
}

const server = http.createServer(async function (request, response) {
  const parsedUrl = new URL(request.url, "http://localhost");
  const pathname = parsedUrl.pathname;

  if (request.method === "OPTIONS") {
    applyCors(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/api/health") {
    await handleHealth(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/events") {
    await handleIngestEvents(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/events") {
    await handleListEvents(response, parsedUrl);
    return;
  }

  if (request.method === "GET" && pathname === "/api/stats") {
    await handleStats(response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/events/stream") {
    handleEventStream(request, response);
    return;
  }

  serveStaticFile(response, pathname);
});

if (require.main === module) {
  server.listen(PORT, function () {
    console.log("Prototype 1 (PostgreSQL) WatchTower running at http://localhost:" + PORT);
    console.log("  Dashboard : http://localhost:" + PORT + "/");
    console.log("  Demo app  : http://localhost:" + PORT + "/demo");
    console.log("  SDK       : http://localhost:" + PORT + "/sdk/watchtower.js");
    console.log("  Health    : http://localhost:" + PORT + "/api/health");
    console.log("  Table     : " + EVENTS_TABLE);
  });
}

module.exports = {
  server,
  store,
  database,
  EVENTS_TABLE,
};
