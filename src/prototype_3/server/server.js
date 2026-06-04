/**
 * WatchTower Prototype 3 - Core Production Infrastructure Server
 * Orchestrates multi-tenant analytical ingestion profiles, dynamically maps schemas,
 * and maintains reactive Server-Sent-Events streams.
 *
 * @module prototype_3/server
 */

const { sendAlert } = require("./mailer");
const { getClerkAlertRecipients } = require("./clerk-alert-recipients");
const { evaluateErrorThreshold } = require("./alert-threshold");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { createRemoteJWKSet, jwtVerify } = require("jose");
const eventStoreModule = require("./event-store");
const {
  isFiniteNumber,
  isValidEvent,
  calculateAverage,
  calculatePercentile,
  parseTimestamp,
  safeString,
  clampNumber,
  normalizeEnvironment,
  deriveEventName,
  deriveIngestionLatency,
  normalizeStreamFilters,
  toInspectorEvent,
  queryEventsWithFilters,
  getRecentEvents,
  computeMaxConcurrentUsers,
} = require("./server-helpers");

const PORT = process.env.PORT || 3000;
const MAX_EVENTS = Number.isFinite(parseInt(process.env.MAX_EVENTS, 10))
  ? parseInt(process.env.MAX_EVENTS, 10)
  : 10000;
const ACTIVE_USER_WINDOW = Number.isFinite(parseInt(process.env.ACTIVE_USER_WINDOW_MS, 10))
  ? parseInt(process.env.ACTIVE_USER_WINDOW_MS, 10)
  : 30000;
const ERROR_ALERT_THRESHOLD = Number.isFinite(parseInt(process.env.ERROR_ALERT_THRESHOLD, 10))
  ? parseInt(process.env.ERROR_ALERT_THRESHOLD, 10)
  : 5;
const ERROR_ALERT_WINDOW_MS = Number.isFinite(parseInt(process.env.ERROR_ALERT_WINDOW_MS, 10))
  ? parseInt(process.env.ERROR_ALERT_WINDOW_MS, 10)
  : 300000;
const ALERT_COOLDOWN_MS = Number.isFinite(parseInt(process.env.ALERT_COOLDOWN_MS, 10))
  ? parseInt(process.env.ALERT_COOLDOWN_MS, 10)
  : 900000;
// Window for the "active issues" error count. Counted directly against the
// store (not the capped event feed) so it does not shrink as non-error
// traffic pushes errors out of the recent-events window. 0 = count all errors.
const ERROR_WINDOW_MS = Number.isFinite(parseInt(process.env.ERROR_WINDOW_MS, 10))
  ? parseInt(process.env.ERROR_WINDOW_MS, 10)
  : 24 * 60 * 60 * 1000;
const FEATURE_FLAG_DEFINITIONS = [
  {
    key: "new-checkout-ui",
    description: "Swap checkout flow to the modular v2 UI.",
    rolloutPercent: 35,
    environments: ["production", "staging", "preview"],
    ruleSummary: ["Production rules validation.", "Rollout slice matching < 35%."]
  },
  {
    key: "fraud-guard-ml",
    description: "Attach fraud-score signals to checkout events.",
    rolloutPercent: 20,
    environments: ["production", "staging"],
    ruleSummary: ["Geographic restriction matching applied."]
  }
];

const GOVERNANCE_MASKING_RULES = [
  { field: "email", action: "hash" },
  { field: "phone", action: "partial-mask" },
  { field: "token", action: "redact" },
  { field: "password", action: "drop" }
];

const sseClients = new Set();
const eventStore = eventStoreModule.createConfiguredEventStore({ maxEvents: MAX_EVENTS });
let lastErrorAlertSentAt = 0;

// ─── Clerk session-token verification ─────────────────────────────────────────
// Production security: instead of trusting the X-Clerk-User-Id header, verify the
// Clerk session JWT against Clerk's public JWKS and read the user id from the
// signed `sub` claim. The issuer is the Clerk Frontend API origin, which is
// base64-encoded inside the publishable key (or set explicitly via env).
//
// When no real Clerk instance is configured (placeholder/empty key, e.g. CI and
// local memory-store runs), verification is disabled and we fall back to trusting
// the header so the prototype/tests keep working. Set
// WATCHTOWER_TRUST_USER_HEADER=true to force the header fallback even when a real
// key is present (useful for header-only API tests).
const TRUST_USER_HEADER = safeString(process.env.WATCHTOWER_TRUST_USER_HEADER).trim() === "true";

function resolveClerkIssuer() {
  const explicit = safeString(process.env.CLERK_JWT_ISSUER).trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const pk = safeString(process.env.CLERK_PUBLISHABLE_KEY).trim();
  if (!pk || !/^pk_(test|live)_/.test(pk) || pk.indexOf("REPLACE_ME") !== -1) return "";
  const encoded = pk.replace(/^pk_(test|live)_/, "");
  try {
    const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$+$/, "");
    return host ? "https://" + host : "";
  } catch (_error) {
    return "";
  }
}

const CLERK_ISSUER = resolveClerkIssuer();
let clerkJwks = null;
if (CLERK_ISSUER) {
  try {
    clerkJwks = createRemoteJWKSet(new URL(CLERK_ISSUER + "/.well-known/jwks.json"));
  } catch (error) {
    console.error("[prototype_3] Could not initialize Clerk JWKS:", error.message);
  }
}
const CLERK_VERIFICATION_ENABLED = Boolean(clerkJwks);

/**
 * Verify a Clerk session JWT and return its subject (the Clerk user id).
 * @param {string} token - Raw JWT from the Authorization header.
 * @returns {Promise<string>} The verified `sub`, or "" if verification fails.
 */
async function verifyClerkToken(token) {
  if (!clerkJwks || !token) return "";
  try {
    const { payload } = await jwtVerify(token, clerkJwks, { issuer: CLERK_ISSUER });
    return safeString(payload && payload.sub).trim();
  } catch (error) {
    console.warn("[prototype_3] Clerk token verification failed:", error.message);
    return "";
  }
}

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function streamAbsoluteFile(res, targetPath) {
  responseWithMime(res, targetPath);
  fs.createReadStream(targetPath).pipe(res);
}

function responseWithMime(res, targetPath) {
  res.writeHead(200, { "Content-Type": MIME[path.extname(targetPath)] || "application/octet-stream" });
}

function inferValueType(v) {
  if (v == null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function flattenObject(obj, prefix, target) {
  if (!obj || typeof obj !== "object") return target;
  Object.keys(obj).forEach(function (k) {
    let p = prefix ? prefix + "." + k : k;
    if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k])) {
      flattenObject(obj[k], p, target);
    } else {
      target[p] = obj[k];
    }
  });
  return target;
}

function hashString(str) {
  let s = safeString(str), h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getEventColumnValue(ev, col) {
  let c = safeString(col).trim().toLowerCase();
  if (c === "type") return ev.type;
  if (c === "eventname") return ev.eventName || deriveEventName(ev);
  if (c === "userid") return ev.userId || null;
  if (c === "sessionid") return ev.sessionId || null;
  if (c === "route") return ev.route || "/";
  if (c === "timestamp") return ev.timestamp || null;
  if (c === "receivedat") return ev.receivedAt || null;
  if (c === "deployversion") return ev.deployVersion || "unknown";
  if (c === "environment") return ev.environment || "production";
  if (c === "sdkversion") return ev.sdkVersion || "unknown";
  if (c === "ingestionlatencyms") return deriveIngestionLatency(ev);
  if (c.indexOf("data.") === 0) {
    let target = ev.data, parts = col.slice(5).split(".");
    for (let i = 0; i < parts.length; i++) {
      if (target == null) return null;
      target = target[parts[i]];
    }
    return target;
  }
  return ev[col] || null;
}

function incrementMap(target, key, amount) {
  let resolvedKey = safeString(key || "unknown") || "unknown";
  target[resolvedKey] = (target[resolvedKey] || 0) + (amount || 1);
}

function mapToCountRows(map, keyName, countName) {
  return Object.keys(map).map(function (key) {
    let row = {};
    row[keyName] = key;
    row[countName] = map[key];
    return row;
  }).sort(function (a, b) { return b[countName] - a[countName]; });
}

function getNumericDataValue(eventRecord, keys) {
  for (let i = 0; i < keys.length; i++) {
    let value = eventRecord && eventRecord.data ? Number(eventRecord.data[keys[i]]) : NaN;
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function summarizeNumeric(values) {
  let valid = (values || []).filter(isFiniteNumber);
  return {
    p95: Math.round(calculatePercentile(valid, 95) * 100) / 100,
    avg: Math.round(calculateAverage(valid) * 100) / 100,
    sampleCount: valid.length
  };
}

function detectPiiFields(eventRecord) {
  let flat = flattenObject(eventRecord.data || {}, "", {});
  let detections = [];
  Object.keys(flat).forEach(function (field) {
    let lowerField = field.toLowerCase();
    let value = safeString(flat[field]);
    let signal = "";
    if (lowerField.indexOf("email") !== -1 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) signal = "email";
    else if (lowerField.indexOf("phone") !== -1 || /\+?\d[\d\s().-]{7,}/.test(value)) signal = "phone";
    else if (lowerField.indexOf("token") !== -1 || lowerField.indexOf("password") !== -1 || lowerField.indexOf("secret") !== -1) signal = "secret";
    if (signal) {
      detections.push({
        field: field,
        signal: signal,
        eventName: eventRecord.eventName || deriveEventName(eventRecord),
        timestamp: eventRecord.timestamp
      });
    }
  });
  return detections;
}

function getAllowedCorsOrigin(origin) {
  const configured = safeString(process.env.CORS_ALLOWED_ORIGINS).trim();
  if (!configured || configured === "*") return "*";
  const allowedOrigins = configured.split(",").map(function (value) {
    return value.trim();
  }).filter(Boolean);
  return allowedOrigins.indexOf(origin) !== -1 ? origin : "";
}

function applyCors(res, req) {
  const origin = req && req.headers ? safeString(req.headers.origin) : "";
  const allowedOrigin = getAllowedCorsOrigin(origin);
  if (allowedOrigin) res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  if (allowedOrigin && allowedOrigin !== "*") res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Clerk-User-Id, Authorization");
}

function sendJson(res, status, payload, req) {
  applyCors(res, req);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

/**
 * Read the raw `X-Clerk-User-Id` header (trusted only when JWT verification is
 * not enforced — see resolveCurrentUserId).
 *
 * @param {http.IncomingMessage} request - Incoming HTTP request.
 * @returns {string} Trimmed Clerk user id header value, or "" when absent.
 */
function getCurrentUserIdHeader(request) {
  const raw = request && request.headers ? request.headers["x-clerk-user-id"] : "";
  return safeString(raw).trim();
}

/**
 * Extract a Bearer token from the Authorization header.
 * @param {http.IncomingMessage} request - Incoming HTTP request.
 * @returns {string} The token, or "" when absent.
 */
function getBearerToken(request) {
  const raw = request && request.headers ? safeString(request.headers["authorization"]).trim() : "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

/**
 * Resolve the current Clerk user id for a request.
 *
 * Preference order:
 *   1. A verified Clerk session JWT (Authorization: Bearer ...) — authoritative.
 *   2. The `X-Clerk-User-Id` header, but ONLY when JWT verification is not
 *      enforced (no real Clerk instance configured, or the header-trust escape
 *      hatch is enabled). This keeps the prototype/tests working.
 *
 * @param {http.IncomingMessage} request - Incoming HTTP request.
 * @returns {Promise<string>} The Clerk user id, or "" when unauthenticated.
 */
async function resolveCurrentUserId(request) {
  if (CLERK_VERIFICATION_ENABLED) {
    const token = getBearerToken(request);
    if (token) {
      const verified = await verifyClerkToken(token);
      if (verified) return verified;
    }
    // A real Clerk instance is configured: do not trust the raw header unless
    // the explicit escape hatch is on.
    return TRUST_USER_HEADER ? getCurrentUserIdHeader(request) : "";
  }
  // No verifiable Clerk instance configured (prototype/CI): trust the header.
  return getCurrentUserIdHeader(request);
}

/**
 * Resolve the current Clerk user or fail the request with a 401.
 *
 * @param {http.IncomingMessage} request - Incoming HTTP request.
 * @param {http.ServerResponse} response - HTTP response (used to send 401).
 * @returns {Promise<string>} The Clerk user id, or "" after a 401 has been sent.
 */
async function requireCurrentUser(request, response) {
  const userId = await resolveCurrentUserId(request);
  if (!userId) {
    sendJson(response, 401, { error: "Authentication required" }, request);
    return "";
  }
  return userId;
}

function readJsonBody(req) {
  return new Promise(function (resolve, reject) {
    let chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function broadcastEvents(batch) {
  let str = JSON.stringify(batch);
  sseClients.forEach(c => c.write("data: " + str + "\n\n"));
}

function buildLatencySummary(events) {
  let routes = {};
  (events || []).forEach(function (e) {
    if (e.type === "pageload" && e.data && e.data.duration != null) {
      if (!routes[e.route]) routes[e.route] = [];
      routes[e.route].push(Number(e.data.duration));
    } else if (e.type === "performance" && e.data) {
      let val = Number(e.data.value || e.data.duration || e.data.latency);
      if (Number.isFinite(val) && val > 0) {
        let route = e.route || "/";
        if (!routes[route]) routes[route] = [];
        routes[route].push(val);
      }
    }
  });
  return Object.keys(routes).reduce(function (acc, r) {
    acc[r] = {
      count: routes[r].length,
      p95: Math.round(calculatePercentile(routes[r], 95)),
      avg: Math.round(calculateAverage(routes[r]))
    };
    return acc;
  }, {});
}

function getDashboardStats(events) {
  const sourceEvents = events || [];
  let activeSessions = new Set(), errorsByVersion = {}, recentErrors = [], totalErrors = 0;
  let cutoff = Date.now() - ACTIVE_USER_WINDOW;

  for (let i = sourceEvents.length - 1; i >= 0; i--) {
    let e = sourceEvents[i];
    if (parseTimestamp(e.timestamp) >= cutoff) activeSessions.add(e.sessionId);
    if (e.type === "error") {
      totalErrors += 1;
      errorsByVersion[e.deployVersion] = (errorsByVersion[e.deployVersion] || 0) + 1;
      if (recentErrors.length < 1000) recentErrors.push(e);
    }
  }

  return {
    activeUsers: activeSessions.size,
    maxUsers: computeMaxConcurrentUsers(sourceEvents, ACTIVE_USER_WINDOW),
    totalEvents: sourceEvents.length,
    totalErrors: totalErrors,
    errorsByVersion: errorsByVersion,
    latencyByRoute: buildLatencySummary(sourceEvents),
    recentErrors: recentErrors,
    recentActivity: sourceEvents.slice(-20)
  };
}

function buildSchemaRegistry(events) {
  let grouped = {};
  events.forEach(function (e) {
    let name = e.eventName || deriveEventName(e);
    if (!grouped[name]) {
      grouped[name] = {
        eventName: name,
        count: 0,
        firstSeen: e.timestamp,
        lastSeen: e.timestamp,
        malformedEvents: 0,
        missingRequiredFields: {},
        propertyMap: {}
      };
    }
    let b = grouped[name];
    b.count += 1;
    if ((parseTimestamp(e.timestamp) || 0) < (parseTimestamp(b.firstSeen) || 0)) b.firstSeen = e.timestamp;
    if ((parseTimestamp(e.timestamp) || 0) > (parseTimestamp(b.lastSeen) || 0)) b.lastSeen = e.timestamp;
    ["type", "eventName", "timestamp", "sessionId", "environment", "sdkVersion"].forEach(function (field) {
      if (!e[field]) {
        b.malformedEvents += 1;
        incrementMap(b.missingRequiredFields, field, 1);
      }
    });
    let flat = flattenObject(e.data || {}, "", {});
    if (e.type === "custom" && !flat.name && name === "custom") {
      b.malformedEvents += 1;
      incrementMap(b.missingRequiredFields, "data.name", 1);
    }
    Object.keys(flat).forEach(p => {
      if (!b.propertyMap[p]) b.propertyMap[p] = { types: {}, samples: 0 };
      let t = inferValueType(flat[p]);
      b.propertyMap[p].types[t] = (b.propertyMap[p].types[t] || 0) + 1;
      b.propertyMap[p].samples += 1;
    });
  });

  return Object.keys(grouped).map(k => {
    let b = grouped[k];
    let properties = Object.keys(b.propertyMap).map(p => ({
      path: p,
      types: Object.keys(b.propertyMap[p].types),
      coveragePct: Math.round((b.propertyMap[p].samples / b.count) * 100),
      drift: Object.keys(b.propertyMap[p].types).length > 1
    }));
    let drift = properties.filter(function (prop) { return prop.drift; }).map(function (prop) { return prop.path; });
    return {
      eventName: k,
      volume: b.count,
      firstSeen: b.firstSeen,
      lastSeen: b.lastSeen,
      properties: properties.sort(function (a, b) { return a.path.localeCompare(b.path); }),
      schemaDriftProperties: drift,
      malformedEvents: b.malformedEvents,
      missingRequiredFields: mapToCountRows(b.missingRequiredFields, "field", "count")
    };
  }).sort(function (a, b) { return b.volume - a.volume; });
}

function buildSessionReplayModel(events) {
  let sessions = {};
  events.forEach(function (e) {
    if (!sessions[e.sessionId]) {
      sessions[e.sessionId] = {
        sessionId: e.sessionId,
        userId: e.userId,
        environment: e.environment,
        timeline: [],
        errors: 0,
        networkFailures: 0,
        featureFlags: new Set(),
        routeTransitions: 0,
        performanceSamples: 0,
        startedAt: e.timestamp,
        lastSeen: e.timestamp
      };
    }
    let s = sessions[e.sessionId];
    if (e.userId) s.userId = e.userId;
    if ((parseTimestamp(e.timestamp) || 0) < (parseTimestamp(s.startedAt) || 0)) s.startedAt = e.timestamp;
    if ((parseTimestamp(e.timestamp) || 0) > (parseTimestamp(s.lastSeen) || 0)) s.lastSeen = e.timestamp;
    s.timeline.push({
      timestamp: e.timestamp,
      eventName: e.eventName || deriveEventName(e),
      type: e.type,
      route: e.route,
      latencyMs: deriveIngestionLatency(e)
    });
    if (e.type === "error") s.errors += 1;
    if (e.type === "route_transition") s.routeTransitions += 1;
    if (e.type === "pageload" || e.type === "performance") s.performanceSamples += 1;
    if (e.type === "network" || (e.data && Number(e.data.status) >= 400) || safeString(e.eventName).toLowerCase().indexOf("network") !== -1) s.networkFailures += 1;
    if (e.data && e.data.flagKey) s.featureFlags.add(e.data.flagKey);
  });
  return {
    sessions: Object.keys(sessions).map(k => ({
      sessionId: k,
      userId: sessions[k].userId,
      environment: sessions[k].environment,
      eventCount: sessions[k].timeline.length,
      consoleErrorCount: sessions[k].errors,
      networkFailureCount: sessions[k].networkFailures,
      featureFlags: Array.from(sessions[k].featureFlags),
      routeTransitionCount: sessions[k].routeTransitions,
      performanceSampleCount: sessions[k].performanceSamples,
      startedAt: sessions[k].startedAt,
      lastSeen: sessions[k].lastSeen,
      timeline: sessions[k].timeline.sort(function (a, b) { return (parseTimestamp(a.timestamp) || 0) - (parseTimestamp(b.timestamp) || 0); })
    })).sort(function (a, b) { return (parseTimestamp(b.lastSeen) || 0) - (parseTimestamp(a.lastSeen) || 0); }),
    sessionCount: Object.keys(sessions).length
  };
}

function buildSdkDiagnostics(events) {
  let sdkEvents = events.filter(function (e) { return e.type === "sdk_diagnostic"; });
  let versionCounts = {};
  let dropped = 0;
  let retries = 0;
  let successes = 0;
  let failures = 0;
  let offlineBuffered = 0;
  let queueDepths = [];
  events.forEach(function (e) { incrementMap(versionCounts, e.sdkVersion || "unknown", 1); });
  sdkEvents.forEach(function (e) {
    let action = safeString(e.data && e.data.action).toLowerCase();
    let count = Number(e.data && e.data.count) || 1;
    if (action === "drop") dropped += count;
    if (action === "retry") retries += count;
    if (action === "delivery-success") successes += count;
    if (action === "delivery-failure") failures += count;
    if (action === "offline-buffer") offlineBuffered += count;
    if (Number.isFinite(Number(e.data && e.data.queueDepth))) queueDepths.push(Number(e.data.queueDepth));
  });
  let deliveryTotal = successes + failures;
  let oneMinuteAgo = Date.now() - 60000;
  let throughputPerMinute = events.filter(function (e) {
    let t = parseTimestamp(e.receivedAt || e.timestamp);
    return t !== null && t >= oneMinuteAgo;
  }).length;
  return {
    droppedEvents: dropped,
    retryQueueHealth: retries > 3 || calculateAverage(queueDepths) > 100 ? "degraded" : "stable",
    retryAttempts: retries,
    deliverySuccessRate: deliveryTotal ? Math.round((successes / deliveryTotal) * 100) : 100,
    offlineBufferedEvents: offlineBuffered,
    adblockDetected: failures > successes && failures > 2,
    sdkVersionAdoption: mapToCountRows(versionCounts, "sdkVersion", "eventVolume"),
    throughputPerMinute: throughputPerMinute,
    queueDepthP95: summarizeNumeric(queueDepths).p95
  };
}

function buildPerformanceInsights(events) {
  let pageLoad = [];
  let ttfb = [];
  let navigationFetchStartToResponse = [];
  let dns = [];
  let tcp = [];
  let tls = [];
  let redirect = [];
  let domInteractive = [];
  let domComplete = [];
  let resourceCount = [];
  let lcp = [];
  let cls = [];
  let inp = [];
  let apiLatency = [];
  let bundleCost = [];
  let routeTransitions = {};
  events.forEach(function (e) {
    if (e.type === "pageload") {
      let duration = getNumericDataValue(e, ["duration", "loadComplete"]);
      if (duration !== null) pageLoad.push(duration);
      let ttfbValue = getNumericDataValue(e, ["ttfb"]);
      if (ttfbValue !== null) ttfb.push(ttfbValue);
      let navigationFetchValue = getNumericDataValue(e, ["navigationFetchStartToResponse"]);
      if (navigationFetchValue !== null) navigationFetchStartToResponse.push(navigationFetchValue);
      let dnsValue = getNumericDataValue(e, ["dns"]);
      if (dnsValue !== null) dns.push(dnsValue);
      let tcpValue = getNumericDataValue(e, ["tcp"]);
      if (tcpValue !== null) tcp.push(tcpValue);
      let tlsValue = getNumericDataValue(e, ["tls"]);
      if (tlsValue !== null) tls.push(tlsValue);
      let redirectValue = getNumericDataValue(e, ["redirect"]);
      if (redirectValue !== null) redirect.push(redirectValue);
      let domInteractiveValue = getNumericDataValue(e, ["domInteractive"]);
      if (domInteractiveValue !== null) domInteractive.push(domInteractiveValue);
      let domCompleteValue = getNumericDataValue(e, ["domComplete"]);
      if (domCompleteValue !== null) domComplete.push(domCompleteValue);
      let resourceCountValue = getNumericDataValue(e, ["resourceCount"]);
      if (resourceCountValue !== null) resourceCount.push(resourceCountValue);
      let transferSize = getNumericDataValue(e, ["transferSize", "encodedBodySize"]);
      if (transferSize !== null) bundleCost.push(Math.round(transferSize / 1024));
    }
    let metricName = safeString(e.data && (e.data.metricName || e.data.name)).toLowerCase();
    let metricValue = getNumericDataValue(e, ["value", "duration", "latencyMs"]);
    if (metricValue !== null && (e.type === "performance" || metricName)) {
      if (metricName.indexOf("lcp") !== -1) lcp.push(metricValue);
      else if (metricName.indexOf("cls") !== -1) cls.push(metricValue);
      else if (metricName.indexOf("inp") !== -1) inp.push(metricValue);
      else if (metricName.indexOf("api") !== -1 || metricName.indexOf("fetch") !== -1) apiLatency.push(metricValue);
    }
    if (e.type === "route_transition") {
      let duration = getNumericDataValue(e, ["durationMs", "duration"]);
      let route = safeString(e.data && e.data.to) || e.route || "/";
      if (!routeTransitions[route]) routeTransitions[route] = [];
      if (duration !== null) routeTransitions[route].push(duration);
    }
  });
  return {
    pageLoad: summarizeNumeric(pageLoad),
    ttfb: summarizeNumeric(ttfb),
    navigationFetchStartToResponse: summarizeNumeric(navigationFetchStartToResponse),
    dns: summarizeNumeric(dns),
    tcp: summarizeNumeric(tcp),
    tls: summarizeNumeric(tls),
    redirect: summarizeNumeric(redirect),
    domInteractive: summarizeNumeric(domInteractive),
    domComplete: summarizeNumeric(domComplete),
    resourceCount: summarizeNumeric(resourceCount),
    lcp: summarizeNumeric(lcp),
    cls: summarizeNumeric(cls),
    inp: summarizeNumeric(inp),
    apiLatencyMs: summarizeNumeric(apiLatency),
    jsBundleCostKb: summarizeNumeric(bundleCost),
    routeTransitions: Object.keys(routeTransitions).map(function (route) {
      let summary = summarizeNumeric(routeTransitions[route]);
      return { route: route, p95: summary.p95, sampleCount: summary.sampleCount };
    }).sort(function (a, b) { return b.p95 - a.p95; })
  };
}

function getErrorSignature(e) {
  let msg = safeString(e.data && e.data.message) || "Runtime error";
  return msg.split("\n")[0].slice(0, 140);
}

function buildErrorMonitoring(events) {
  let grouped = {};
  events.filter(function (e) { return e.type === "error"; }).forEach(function (e) {
    let signature = getErrorSignature(e);
    if (!grouped[signature]) {
      grouped[signature] = {
        signature: signature,
        count: 0,
        users: {},
        sessions: {},
        release: e.deployVersion || "unknown",
        lastSeen: e.timestamp,
        stack: e.data && e.data.stack ? e.data.stack : "",
        route: e.route || "/"
      };
    }
    let group = grouped[signature];
    group.count += 1;
    if (e.userId) incrementMap(group.users, e.userId, 1);
    incrementMap(group.sessions, e.sessionId, 1);
    if ((parseTimestamp(e.timestamp) || 0) > (parseTimestamp(group.lastSeen) || 0)) group.lastSeen = e.timestamp;
  });
  let groupedErrors = Object.keys(grouped).map(function (key) {
    let group = grouped[key];
    return {
      signature: group.signature,
      count: group.count,
      affectedUsers: Object.keys(group.users).length,
      affectedSessions: Object.keys(group.sessions).length,
      release: group.release,
      lastSeen: group.lastSeen,
      route: group.route,
      stack: group.stack,
      sourcemapStatus: group.release === "unknown" ? "missing release" : "mapped",
      linkedSessionReplay: Object.keys(group.sessions)[0] || ""
    };
  }).sort(function (a, b) { return b.count - a.count; });
  let trendMap = {};
  events.filter(function (e) { return e.type === "error"; }).forEach(function (e) {
    let hour = new Date(parseTimestamp(e.timestamp) || Date.now()).toISOString().slice(0, 13) + ":00";
    incrementMap(trendMap, hour, 1);
  });
  return {
    groupedErrors: groupedErrors,
    trend: mapToCountRows(trendMap, "bucket", "count"),
    latest: getRecentEvents(events.filter(function (e) { return e.type === "error"; }), 8).map(toInspectorEvent)
  };
}

function buildPipelineObservability(events) {
  let sdk = buildSdkDiagnostics(events);
  let latencies = events.map(deriveIngestionLatency).filter(isFiniteNumber);
  let retryEvents = events.filter(function (e) {
    return e.type === "sdk_diagnostic" && safeString(e.data && e.data.action).toLowerCase() === "retry";
  });
  let failures = events.filter(function (e) {
    let action = safeString(e.data && e.data.action).toLowerCase();
    return action === "delivery-failure" || action === "webhook-failure";
  });
  return {
    queueDepth: sdk.queueDepthP95 || 0,
    processingLatencyMs: summarizeNumeric(latencies),
    webhookFailures: failures.length,
    retryAttempts: retryEvents.length,
    warehouseSync: { status: failures.length > 2 ? "degraded" : "healthy", lastSync: new Date().toISOString() },
    throughputPerMinute: sdk.throughputPerMinute,
    destinationLogs: getRecentEvents(events, 30).map(function (e) {
      let isFailure = e.type === "error" || safeString(e.data && e.data.action).indexOf("failure") !== -1;
      return {
        timestamp: e.receivedAt || e.timestamp,
        channel: e.environment || "production",
        status: isFailure ? "warning" : "delivered",
        message: (e.eventName || deriveEventName(e)) + " routed to warehouse"
      };
    })
  };
}

function buildIdentityResolution(events) {
  let nodes = {};
  let edges = {};
  let sessionUsers = {};
  let mergeHistory = [];
  events.forEach(function (e) {
    let sessionId = e.sessionId || "unknown-session";
    let sessionNode = "session:" + sessionId;
    nodes[sessionNode] = { id: sessionNode, type: "anonymous", label: sessionId.slice(0, 10), eventCount: (nodes[sessionNode] && nodes[sessionNode].eventCount || 0) + 1 };
    if (e.userId) {
      let userNode = "user:" + e.userId;
      nodes[userNode] = { id: userNode, type: "user", label: e.userId, eventCount: (nodes[userNode] && nodes[userNode].eventCount || 0) + 1 };
      edges[sessionNode + "->" + userNode] = { from: sessionNode, to: userNode, type: "session_stitch", count: (edges[sessionNode + "->" + userNode] && edges[sessionNode + "->" + userNode].count || 0) + 1 };
      if (!sessionUsers[sessionId]) sessionUsers[sessionId] = {};
      sessionUsers[sessionId][e.userId] = true;
      if (e.type === "login") mergeHistory.push({ timestamp: e.timestamp, sessionId: sessionId, userId: e.userId, action: "anonymous to authenticated" });
    }
  });
  let duplicates = Object.keys(sessionUsers).filter(function (sid) {
    return Object.keys(sessionUsers[sid]).length > 1;
  }).map(function (sid) {
    return { sessionId: sid, users: Object.keys(sessionUsers[sid]) };
  });
  return {
    nodes: Object.keys(nodes).map(function (id) { return nodes[id]; }),
    edges: Object.keys(edges).map(function (id) { return edges[id]; }),
    duplicateIdentities: duplicates,
    mergeHistory: mergeHistory.slice(-20)
  };
}

function evaluateFlagsForUser(userId, environment, country) {
  let identityKey = safeString(userId || "anonymous") + "|" + safeString(environment || "production") + "|" + safeString(country || "");
  return FEATURE_FLAG_DEFINITIONS.map(function (flag) {
    let envAllowed = flag.environments.indexOf(environment || "production") !== -1;
    let bucket = hashString(identityKey + "|" + flag.key) % 100;
    let matched = envAllowed && bucket < flag.rolloutPercent;
    let reasons = [];
    reasons.push(envAllowed ? "Environment allowed." : "Environment excluded.");
    reasons.push("Bucket " + bucket + " compared with rollout " + flag.rolloutPercent + "%.");
    if (country) reasons.push("Country override context: " + country + ".");
    return {
      key: flag.key,
      rolloutPercent: flag.rolloutPercent,
      matched: matched,
      reasons: reasons.concat(flag.ruleSummary || []),
      targetingLogic: flag.environments.join(", ")
    };
  });
}

function buildFeatureFlagInsights(events) {
  let users = {};
  events.forEach(function (e) {
    if (e.userId) users[e.userId] = e.environment || "production";
  });
  let userIds = Object.keys(users);
  if (userIds.length === 0) userIds = ["anonymous"];
  return {
    definitions: FEATURE_FLAG_DEFINITIONS,
    evaluations: userIds.slice(0, 40).map(function (userId) {
      return { userId: userId, environment: users[userId] || "production", flags: evaluateFlagsForUser(userId, users[userId] || "production", "") };
    }),
    exposureHistory: getRecentEvents(events.filter(function (e) {
      return safeString(e.eventName).toLowerCase().indexOf("flag") !== -1 || Boolean(e.data && e.data.flagKey);
    }), 30).map(function (e) {
      return { userId: e.userId || "anonymous", eventName: e.eventName || deriveEventName(e), timestamp: e.timestamp, flagKey: e.data && e.data.flagKey };
    })
  };
}

function buildGovernance(events) {
  let piiDetections = [];
  let envCounts = {};
  events.forEach(function (e) {
    detectPiiFields(e).forEach(function (detection) { piiDetections.push(detection); });
    incrementMap(envCounts, e.environment || "production", 1);
  });
  return {
    retentionDays: 30,
    piiDetections: piiDetections.slice(-60).reverse(),
    maskingRules: GOVERNANCE_MASKING_RULES,
    auditLogs: getRecentEvents(events, 20).map(function (e) {
      return { timestamp: e.receivedAt || e.timestamp, actor: "ingestion-api", action: "accepted " + (e.eventName || deriveEventName(e)) };
    }),
    accessControls: [
      { role: "Admin", scope: "all environments" },
      { role: "Developer", scope: "raw events, schemas, replay diagnostics" },
      { role: "Manager", scope: "aggregated dashboards only" }
    ],
    environments: mapToCountRows(envCounts, "environment", "eventVolume")
  };
}

function buildDeveloperInsights(events) {
  let schemaRegistry = buildSchemaRegistry(events);
  let queryFields = ["type", "eventName", "userId", "sessionId", "route", "timestamp", "receivedAt", "deployVersion", "environment", "sdkVersion", "ingestionLatencyMs"];
  schemaRegistry.forEach(function (schema) {
    (schema.properties || []).forEach(function (prop) {
      let field = "data." + prop.path;
      if (queryFields.indexOf(field) === -1) queryFields.push(field);
    });
  });
  return {
    schemaRegistry: schemaRegistry,
    sessionReplay: buildSessionReplayModel(events),
    sdkDiagnostics: buildSdkDiagnostics(events),
    performance: buildPerformanceInsights(events),
    errorMonitoring: buildErrorMonitoring(events),
    pipeline: buildPipelineObservability(events),
    identityResolution: buildIdentityResolution(events),
    featureFlags: buildFeatureFlagInsights(events),
    governance: buildGovernance(events),
    queryExplorer: { fields: queryFields }
  };
}

function parseSelectFields(text) {
  return text.split(",").map(t => {
    let tr = t.trim();
    let aliasMatch = tr.match(/^(.+?)\s+as\s+([a-zA-Z_][\w]*)$/i);
    let expr = aliasMatch ? aliasMatch[1].trim() : tr;
    let alias = aliasMatch ? aliasMatch[2].trim() : expr;
    if (expr.toLowerCase() === "count(*)") return { type: "count", alias: alias === "count(*)" ? "count" : alias };
    return { type: "field", field: expr, alias: alias };
  });
}

function parseWhereClause(whereText) {
  if (!whereText) return null;
  let match = whereText.match(/^([\w.]+)\s*(=|!=|contains)\s*['"]?(.+?)['"]?$/i);
  if (!match) return null;
  return { field: match[1], operator: match[2].toLowerCase(), value: match[3].toLowerCase() };
}

function eventPassesWhere(eventRecord, where) {
  if (!where) return true;
  let value = safeString(getEventColumnValue(eventRecord, where.field)).toLowerCase();
  if (where.operator === "=") return value === where.value;
  if (where.operator === "!=") return value !== where.value;
  if (where.operator === "contains") return value.indexOf(where.value) !== -1;
  return true;
}

// Processing subset query operations inside server.js
function executeDeveloperQuery(queryText, events) {
  let startedAt = Date.now();
  let compactQuery = safeString(queryText).trim().replace(/\s+/g, " ");
  let parsed = compactQuery.match(/^select (.+?) from events(?: where (.+?))?(?: group by (.+?))?(?: order by (.+?))?(?: limit (\d+))?$/i);

  if (!parsed) {
    return {
      error: "Syntax error. Supported: SELECT field, count(*) FROM events [WHERE field = 'val'] [GROUP BY field]",
      rows: [],
      columns: []
    };
  }

  let selectText = parsed[1];
  let whereClause = parseWhereClause(parsed[2]);
  let groupByField = parsed[3] ? parsed[3].trim() : "";
  let orderByField = parsed[4] ? parsed[4].trim().split(/\s+/)[0] : "";
  let orderDescending = parsed[4] ? parsed[4].toLowerCase().indexOf(" asc") === -1 : true;
  let limit = clampNumber(parseInt(parsed[5] || "50", 10) || 50, 1, 250);
  let selectFields = parseSelectFields(selectText);

  if (parsed[2] && !whereClause) {
    return { error: "Unsupported WHERE clause. Use field = 'value', field != 'value', or field contains 'value'.", rows: [], columns: [] };
  }

  let filteredEvents = (events || []).filter(function (eventRecord) { return eventPassesWhere(eventRecord, whereClause); });
  let rows;
  if (groupByField) {
    let groupedRows = {};
    filteredEvents.forEach(function (eventRecord) {
      let groupValue = safeString(getEventColumnValue(eventRecord, groupByField)) || "unknown";
      if (!groupedRows[groupValue]) groupedRows[groupValue] = { __events: [] };
      groupedRows[groupValue].__events.push(eventRecord);
    });
    rows = Object.keys(groupedRows).map(function (groupValue) {
      let row = {};
      selectFields.forEach(function (f) {
        if (f.type === "count") row[f.alias] = groupedRows[groupValue].__events.length;
        else row[f.alias] = f.field === groupByField ? groupValue : getEventColumnValue(groupedRows[groupValue].__events[0], f.field);
      });
      if (!selectFields.some(function (f) { return f.field === groupByField; })) row[groupByField] = groupValue;
      return row;
    });
  } else {
    rows = filteredEvents.map(function (eventRecord) {
      let row = {};
      selectFields.forEach(function (f) {
        if (f.type === "count") row[f.alias] = 1;
        else row[f.alias] = getEventColumnValue(eventRecord, f.field);
      });
      return row;
    });
  }

  if (orderByField) {
    rows.sort(function (a, b) {
      let left = a[orderByField];
      let right = b[orderByField];
      if (typeof left === "number" && typeof right === "number") return orderDescending ? right - left : left - right;
      return orderDescending ? safeString(right).localeCompare(safeString(left)) : safeString(left).localeCompare(safeString(right));
    });
  }

  return {
    error: null,
    durationMs: Date.now() - startedAt,
    rowCount: rows.length,
    columns: Object.keys(rows[0] || selectFields.reduce(function (acc, field) { acc[field.alias] = true; return acc; }, {})),
    rows: rows.slice(0, limit)
  };
}
function evaluateFeatureFlagsForIdentity(identity) {
  let userId = safeString(identity && (identity.userId || identity.user || identity.id)) || "anonymous";
  let environment = normalizeEnvironment(identity && identity.environment, "");
  let country = safeString(identity && identity.country);
  return {
    userId: userId,
    environment: environment,
    flags: evaluateFlagsForUser(userId, environment, country)
  };
}

function getIncomingEvents(body) {
  if (body && Array.isArray(body.events)) return body.events;
  if (Array.isArray(body)) return body;
  return [body];
}

async function maybeSendErrorThresholdAlert() {
  let now = Date.now();
  let events = await eventStore.allEvents(MAX_EVENTS);
  let evaluation = evaluateErrorThreshold(events, {
    now: now,
    threshold: ERROR_ALERT_THRESHOLD,
    windowMs: ERROR_ALERT_WINDOW_MS,
    cooldownMs: ALERT_COOLDOWN_MS,
    lastSentAt: lastErrorAlertSentAt
  });

  if (!evaluation.shouldSend) return;

  let recipients = await getClerkAlertRecipients(now);
  if (!recipients.length) return;

  lastErrorAlertSentAt = now;
  sendAlert(evaluation.alert, recipients).catch(err => console.error("[mailer] Failed to send alert:", err));
}

async function ingestEventsBody(body, ownerUserId) {
  let arr = getIncomingEvents(body).filter(isValidEvent);
  // When an authenticated dashboard user owns this ingest call, stamp every
  // event with their Clerk user id so it is scoped to them. External/SDK
  // events arrive without an owner and keep whatever userId they carry.
  if (ownerUserId) {
    arr = arr.map(function (event) {
      return Object.assign({}, event, { userId: ownerUserId });
    });
  }
  let norm = await eventStore.insertEvents(arr);
  await eventStore.pruneOldest(MAX_EVENTS);

  if (norm.length) {
    broadcastEvents(norm);

    if (norm.some(function (eventRecord) { return eventRecord.type === "error"; })) {
      maybeSendErrorThresholdAlert().catch(err => console.error("[mailer] Failed to evaluate alert threshold:", err));
    }
  }

  return norm;
}

const server = http.createServer(async function (request, response) {
  let parsedUrl = new URL(request.url, "http://localhost");
  let pathname = parsedUrl.pathname;
  // Landing-Page and Log-In-Page live inside the prototype_3 directory.
  let prototypeRoot = path.join(__dirname, "..");
  let landingRoot = path.join(prototypeRoot, "Landing-Page");
  let loginRoot = path.join(prototypeRoot, "Log-In-Page");

  if (request.method === "OPTIONS") {
    applyCors(response, request); response.writeHead(204); response.end(); return;
  }
  if (request.method === "POST" && pathname === "/api/alert-recipient") {
    try {
      let body = await readJsonBody(request);
      let email = safeString(body && body.email).trim();
      if (!isEmailLike(email)) {
        sendJson(response, 400, { error: "Valid email is required" }, request);
        return;
      }
      registeredAlertRecipient = email;
      console.log("[mailer] Registered alert recipient " + registeredAlertRecipient);
      sendJson(response, 200, { ok: true }, request);
    } catch (error) {
      console.error("[prototype_3] Failed to register alert recipient:", error);
      sendJson(response, 500, { error: "Failed to register alert recipient" }, request);
    }
    return;
  }
  if (request.method === "POST" && pathname === "/api/users/sync") {
    try {
      let body = await readJsonBody(request);
      // Prefer the verified token subject; fall back to the body/header id when
      // verification is not enforced (prototype/tests).
      let clerkUserId = (await resolveCurrentUserId(request)) || safeString(body && body.clerkUserId).trim();
      if (!clerkUserId) {
        sendJson(response, 400, { error: "clerkUserId is required" }, request);
        return;
      }
      let user = await eventStore.syncUser({
        clerkUserId: clerkUserId,
        email: safeString(body && body.email).trim(),
        displayName: safeString(body && body.displayName).trim(),
      });
      sendJson(response, 200, { ok: true, user: user }, request);
    } catch (error) {
      console.error("[prototype_3] Failed to sync user:", error);
      sendJson(response, 500, { error: "Failed to sync user" }, request);
    }
    return;
  }
  if (request.method === "POST" && pathname === "/api/events") {
    try {
      let body = await readJsonBody(request);
      // External SDK events may be unauthenticated for now, so we never reject
      // a missing user id here; we just stamp ownership when it is present.
      let userId = await resolveCurrentUserId(request);
      let norm = await ingestEventsBody(body, userId || null);
      sendJson(response, 200, { accepted: norm.length }, request);
    } catch (error) {
      console.error("[prototype_3] Failed to ingest events:", error);
      sendJson(response, 500, { error: "Failed to store events" }, request);
    }
    return;
  }
  if (request.method === "POST" && pathname === "/api/beacon") {
    try {
      let body = await readJsonBody(request);
      let userId = await resolveCurrentUserId(request);
      await ingestEventsBody(body, userId || null);
    } catch (_error) {
      // Beacon callers ignore response bodies, so keep this endpoint fail-closed.
    }
    applyCors(response, request);
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === "GET" && pathname === "/api/events") {
    try {
      let userId = await requireCurrentUser(request, response);
      if (!userId) return;
      let events = await eventStore.listEvents(100, { userId: userId });
      sendJson(response, 200, { events: events }, request);
    } catch (error) {
      console.error("[prototype_3] Failed to list events:", error);
      sendJson(response, 500, { error: "Failed to fetch events" }, request);
    }
    return;
  }
  if (request.method === "GET" && pathname === "/api/developer/stream") {
    try {
      let userId = await requireCurrentUser(request, response);
      if (!userId) return;
      let events = await eventStore.allEvents(MAX_EVENTS, { userId: userId });
      let f = normalizeStreamFilters(parsedUrl.searchParams);
      sendJson(response, 200, queryEventsWithFilters(events, f), request);
    } catch (error) {
      console.error("[prototype_3] Failed to load developer stream:", error);
      sendJson(response, 500, { error: "Failed to fetch developer stream" }, request);
    }
    return;
  }
  if (request.method === "GET" && pathname === "/api/developer/insights") {
    try {
      let userId = await requireCurrentUser(request, response);
      if (!userId) return;
      let events = await eventStore.allEvents(MAX_EVENTS, { userId: userId });
      sendJson(response, 200, buildDeveloperInsights(events), request);
    } catch (error) {
      console.error("[prototype_3] Failed to build developer insights:", error);
      sendJson(response, 500, { error: "Failed to fetch developer insights" }, request);
    }
    return;
  }
  if (request.method === "POST" && pathname === "/api/developer/query") {
    try {
      let userId = await requireCurrentUser(request, response);
      if (!userId) return;
      let body = await readJsonBody(request);
      let events = await eventStore.allEvents(MAX_EVENTS, { userId: userId });
      sendJson(response, 200, executeDeveloperQuery(body.query, events), request);
    } catch (error) {
      console.error("[prototype_3] Failed to execute developer query:", error);
      sendJson(response, 500, { error: "Failed to execute developer query" }, request);
    }
    return;
  }
  if (request.method === "POST" && pathname === "/api/developer/feature-flags/evaluate") {
    try {
      let body = await readJsonBody(request);
      sendJson(response, 200, evaluateFeatureFlagsForIdentity(body), request);
    } catch (error) {
      console.error("[prototype_3] Failed to evaluate feature flags:", error);
      sendJson(response, 500, { error: "Failed to evaluate feature flags" }, request);
    }
    return;
  }
  if (request.method === "GET" && pathname === "/api/stats") {
    try {
      let userId = await requireCurrentUser(request, response);
      if (!userId) return;
      let events = await eventStore.allEvents(MAX_EVENTS, { userId: userId });
      let stats = getDashboardStats(events);
      // Override the window-bound error count with a real count from the store
      // so "active issues" reflects actual errors, not just errors that happen
      // to remain in the recent-events window. Scoped to the current user.
      if (typeof eventStore.countErrors === "function") {
        let since = ERROR_WINDOW_MS > 0 ? Date.now() - ERROR_WINDOW_MS : null;
        stats.totalErrors = await eventStore.countErrors({ sinceMs: since, userId: userId });
      }
      sendJson(response, 200, stats, request);
    } catch (error) {
      console.error("[prototype_3] Failed to fetch stats:", error);
      sendJson(response, 500, { error: "Failed to fetch stats" }, request);
    }
    return;
  }
  if (request.method === "GET" && pathname === "/api/events/stream") {
    applyCors(response, request);
    response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
    response.write(":\n\n"); sseClients.add(response);
    request.on("close", () => sseClients.delete(response)); return;
  }

  if (request.method === "GET" && pathname === "/") {
    response.writeHead(302, { Location: "/landing/" });
    response.end();
    return;
  }

  if (request.method === "GET" && (pathname === "/landing" || pathname === "/landing/")) {
    streamAbsoluteFile(response, path.join(landingRoot, "index.html"));
    return;
  }

  if (request.method === "GET" && pathname.indexOf("/landing/") === 0) {
    let requestedLanding = pathname.slice("/landing/".length);
    let landingPath = path.normalize(path.join(landingRoot, requestedLanding));
    if (landingPath.indexOf(landingRoot) !== 0) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    fs.stat(landingPath, function (landingErr, landingStats) {
      if (landingErr || !landingStats.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      streamAbsoluteFile(response, landingPath);
    });
    return;
  }

  if (request.method === "GET" && pathname === "/login") {
    response.writeHead(302, { Location: "/login/" });
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/login/") {
    streamAbsoluteFile(response, path.join(loginRoot, "login.html"));
    return;
  }

  if (request.method === "GET" && pathname.indexOf("/login/") === 0) {
    let requestedLogin = pathname.slice("/login/".length);
    let loginPath = path.normalize(path.join(loginRoot, requestedLogin));
    if (loginPath.indexOf(loginRoot) !== 0) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    fs.stat(loginPath, function (loginErr, loginStats) {
      if (loginErr || !loginStats.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      streamAbsoluteFile(response, loginPath);
    });
    return;
  }

  if (request.method === "GET" && (pathname === "/dashboard" || pathname === "/product" || pathname === "/product/")) {
    streamAbsoluteFile(response, path.join(__dirname, "..", "index.html"));
    return;
  }

  // Fallback static routing
  let root = path.join(__dirname, "..");
  let file = pathname === "/" ? "/index.html" : pathname;
  let fPath = path.join(root, file);

  function streamStaticFile(targetPath) {
    streamAbsoluteFile(response, targetPath);
  }

  fs.stat(fPath, (err, stats) => {
    if (err) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    if (stats.isDirectory()) {
      let indexPath = path.join(fPath, "index.html");
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (indexErr || !indexStats.isFile()) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }
        streamStaticFile(indexPath);
      });
      return;
    }

    if (!stats.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    streamStaticFile(fPath);
  });
});

server.listen(PORT, function () {
  console.log("Observability dashboard shell active at http://localhost:" + PORT);
  console.log("Prototype 3 event storage: " + eventStore.type + (eventStore.tableName ? " (" + eventStore.tableName + ")" : ""));
  if (CLERK_VERIFICATION_ENABLED) {
    console.log("Clerk session verification: ENABLED (issuer " + CLERK_ISSUER + ")" + (TRUST_USER_HEADER ? " + header escape hatch" : ""));
  } else {
    console.log("Clerk session verification: DISABLED (trusting X-Clerk-User-Id header — prototype/test mode)");
  }
});
