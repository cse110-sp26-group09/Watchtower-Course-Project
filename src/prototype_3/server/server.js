/**
 * WatchTower Prototype 3 - Core Production Infrastructure Server
 * Orchestrates multi-tenant analytical ingestion profiles, dynamically maps schemas,
 * and maintains reactive Server-Sent-Events streams.
 *
 * @module prototype_3/server
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MAX_EVENTS = 10000;
const ACTIVE_USER_WINDOW = 5 * 60 * 1000;
const DEFAULT_STREAM_LIMIT = 80;
const MAX_STREAM_LIMIT = 500;

const KNOWN_ENVIRONMENTS = ["production", "staging", "development", "preview"];
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

const storedEvents = [];
const sseClients = new Set();

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

function isFiniteNumber(v) { return typeof v === "number" && Number.isFinite(v); }
function isValidEvent(ev) { return Boolean(ev && typeof ev === "object" && typeof ev.type === "string"); }

function calculateAverage(arr) {
  let valid = (arr || []).filter(isFiniteNumber);
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : 0;
}

function calculatePercentile(arr, p) {
  let valid = (arr || []).filter(isFiniteNumber).sort((a, b) => a - b);
  if (!valid.length) return 0;
  let pos = (p / 100) * (valid.length - 1);
  let low = Math.floor(pos), high = Math.ceil(pos);
  return low === high ? valid[low] : valid[low] + (valid[high] - valid[low]) * (pos - low);
}

function parseTimestamp(v) { let t = new Date(v).getTime(); return Number.isFinite(t) ? t : null; }
function safeString(v) { return v == null ? "" : String(v); }
function clampNumber(v, min, max) { return Math.max(min, Math.min(max, v)); }

function normalizeEnvironment(v, host) {
  let raw = safeString(v).trim().toLowerCase();
  if (KNOWN_ENVIRONMENTS.indexOf(raw) !== -1) return raw;
  let h = safeString(host).toLowerCase();
  if (h.indexOf("localhost") !== -1 || h.indexOf("127.0.0.1") !== -1 || h.indexOf("dev") !== -1) return "development";
  if (h.indexOf("preview") !== -1 || h.indexOf("vercel") !== -1) return "preview";
  if (h.indexOf("staging") !== -1) return "staging";
  return "production";
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

function deriveEventName(ev) {
  if (ev.type === "custom") return safeString(ev.data && ev.data.name).trim() || "custom";
  if (ev.type === "performance") return "performance:" + safeString(ev.data && ev.data.metricName);
  return safeString(ev.type) || "unknown";
}

function deriveIngestionLatency(ev) {
  let em = parseTimestamp(ev.timestamp), rc = parseTimestamp(ev.receivedAt);
  return (em === null || rc === null) ? null : Math.max(0, rc - em);
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

function getRecentEvents(events, limit) {
  return (events || []).slice().sort(function (a, b) {
    return getEventSortTimestamp(b) - getEventSortTimestamp(a);
  }).slice(0, limit || 50);
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

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, payload) {
  applyCors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
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

function normalizeIncomingEvent(raw) {
  let n = {
    type: raw.type || "custom",
    eventName: safeString(raw.eventName || raw.name || "").trim(),
    timestamp: raw.timestamp || new Date().toISOString(),
    sessionId: raw.sessionId || "unknown-session",
    userId: raw.userId || null,
    deployVersion: raw.deployVersion || "unknown",
    appName: raw.appName || "shopdemo",
    environment: normalizeEnvironment(raw.environment || raw.env, raw.url),
    sdkVersion: raw.sdkVersion || "sdk-unknown",
    route: raw.route || "/",
    data: raw.data && typeof raw.data === "object" ? raw.data : {},
    receivedAt: new Date().toISOString()
  };
  if (!n.eventName) n.eventName = deriveEventName(n);
  return n;
}

function buildLatencySummary() {
  let routes = {};
  storedEvents.forEach(function (e) {
    if (e.type !== "pageload" || !e.data || e.data.duration == null) return;
    if (!routes[e.route]) routes[e.route] = [];
    routes[e.route].push(e.data.duration);
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

function getDashboardStats() {
  let activeSessions = new Set(), errorsByVersion = {}, recentErrors = [];
  let cutoff = Date.now() - (5 * 60 * 1000);

  for (let i = storedEvents.length - 1; i >= 0; i--) {
    let e = storedEvents[i];
    if (parseTimestamp(e.timestamp) >= cutoff) activeSessions.add(e.sessionId);
    if (e.type === "error") {
      errorsByVersion[e.deployVersion] = (errorsByVersion[e.deployVersion] || 0) + 1;
      if (recentErrors.length < 20) recentErrors.push(e);
    }
  }

  return {
    activeUsers: activeSessions.size,
    totalEvents: storedEvents.length,
    totalErrors: recentErrors.length,
    errorsByVersion: errorsByVersion,
    latencyByRoute: buildLatencySummary(),
    recentErrors: recentErrors,
    recentActivity: storedEvents.slice(-20)
  };
}

function getEventSortTimestamp(e) { return parseTimestamp(e.receivedAt || e.timestamp) || 0; }
function buildEventSearchBlob(e) { return [e.type, e.userId, e.sessionId, e.route, JSON.stringify(e.data || {})].join(" ").toLowerCase(); }

function normalizeStreamFilters(searchParams) {
  let from = parseTimestamp(searchParams.get("dateFrom"));
  let to = parseTimestamp(searchParams.get("dateTo"));
  let limit = parseInt(searchParams.get("limit") || "80", 10);
  let cursor = parseInt(searchParams.get("cursor") || "0", 10);

  return {
    eventName: safeString(searchParams.get("eventName")).toLowerCase(),
    user: safeString(searchParams.get("user")).toLowerCase(),
    session: safeString(searchParams.get("session")).toLowerCase(),
    environment: safeString(searchParams.get("environment")).toLowerCase(),
    sdkVersion: safeString(searchParams.get("sdkVersion")).toLowerCase(),
    search: safeString(searchParams.get("search")).toLowerCase(),
    dateFrom: from,
    dateTo: to,
    limit: clampNumber(Number.isFinite(limit) ? limit : DEFAULT_STREAM_LIMIT, 1, MAX_STREAM_LIMIT),
    cursor: Math.max(0, Number.isFinite(cursor) ? cursor : 0)
  };
}

function matchesStreamFilters(e, f) {
  let et = parseTimestamp(e.timestamp);
  if (f.eventName && (e.eventName || "").toLowerCase().indexOf(f.eventName) === -1) return false;
  if (f.user && (e.userId || "").toLowerCase().indexOf(f.user) === -1) return false;
  if (f.session && (e.sessionId || "").toLowerCase().indexOf(f.session) === -1) return false;
  if (f.environment && (e.environment || "production").toLowerCase() !== f.environment) return false;
  if (f.sdkVersion && (e.sdkVersion || "unknown").toLowerCase().indexOf(f.sdkVersion) === -1) return false;
  if (f.dateFrom !== null && (et === null || et < f.dateFrom)) return false;
  if (f.dateTo !== null && (et === null || et > f.dateTo)) return false;
  if (f.search && buildEventSearchBlob(e).indexOf(f.search) === -1) return false;
  return true;
}

function toInspectorEvent(e) {
  let lat = deriveIngestionLatency(e);
  return {
    id: [e.timestamp, e.sessionId, e.type, e.route].join("|"),
    type: e.type,
    eventName: e.eventName || deriveEventName(e),
    userId: e.userId,
    sessionId: e.sessionId,
    environment: e.environment || "production",
    sdkVersion: e.sdkVersion || "unknown",
    deployVersion: e.deployVersion || "unknown",
    route: e.route || "/",
    timestamp: e.timestamp,
    receivedAt: e.receivedAt,
    ingestionLatencyMs: lat === null ? null : Math.round(lat),
    data: e.data || {},
    raw: e
  };
}

function queryEventsWithFilters(events, f) {
  let filtered = events.filter(e => matchesStreamFilters(e, f)).sort((a, b) => getEventSortTimestamp(b) - getEventSortTimestamp(a));
  let start = f.cursor, end = start + f.limit;
  return {
    total: filtered.length,
    cursor: start,
    nextCursor: end < filtered.length ? end : null,
    events: filtered.slice(start, end).map(toInspectorEvent)
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

const server = http.createServer(function (request, response) {
  let parsedUrl = new URL(request.url, "http://localhost");
  let pathname = parsedUrl.pathname;
  // Landing-Page and Log-In-Page live inside the prototype_3 directory.
  let prototypeRoot = path.join(__dirname, "..");
  let landingRoot = path.join(prototypeRoot, "Landing-Page");
  let loginRoot = path.join(prototypeRoot, "Log-In-Page");

  if (request.method === "OPTIONS") {
    applyCors(response); response.writeHead(204); response.end(); return;
  }
  if (request.method === "POST" && pathname === "/api/events") {
    readJsonBody(request).then(body => {
      let arr = Array.isArray(body.events) ? body.events : [body];
      let norm = arr.filter(isValidEvent).map(normalizeIncomingEvent);
      norm.forEach(e => storedEvents.push(e));
      while (storedEvents.length > MAX_EVENTS) storedEvents.shift();
      if (norm.length) broadcastEvents(norm);
      sendJson(response, 200, { accepted: norm.length });
    });
    return;
  }
  if (request.method === "GET" && pathname === "/api/events") {
    sendJson(response, 200, { events: storedEvents.slice(-100) }); return;
  }
  if (request.method === "GET" && pathname === "/api/developer/stream") {
    let f = normalizeStreamFilters(parsedUrl.searchParams);
    sendJson(response, 200, queryEventsWithFilters(storedEvents, f)); return;
  }
  if (request.method === "GET" && pathname === "/api/developer/insights") {
    sendJson(response, 200, buildDeveloperInsights(storedEvents)); return;
  }
  if (request.method === "POST" && pathname === "/api/developer/query") {
    readJsonBody(request).then(body => sendJson(response, 200, executeDeveloperQuery(body.query, storedEvents))); return;
  }
  if (request.method === "POST" && pathname === "/api/developer/feature-flags/evaluate") {
    readJsonBody(request).then(body => sendJson(response, 200, evaluateFeatureFlagsForIdentity(body))); return;
  }
  if (request.method === "GET" && pathname === "/api/stats") {
    sendJson(response, 200, getDashboardStats()); return;
  }
  if (request.method === "GET" && pathname === "/api/events/stream") {
    applyCors(response);
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
});
