"use strict";

/**
 * Pure helpers for the WatchTower Prototype 3 server.
 *
 * Side-effect-free utilities used by `server.js` and unit tests.
 *
 * @module backend/server-helpers
 */

const DEFAULT_STREAM_LIMIT = 80;
const MAX_STREAM_LIMIT = 500;

const KNOWN_ENVIRONMENTS = ["production", "staging", "development", "preview"];

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidEvent(ev) {
  return Boolean(ev && typeof ev === "object" && typeof ev.type === "string");
}

function calculateAverage(arr) {
  const valid = (arr || []).filter(isFiniteNumber);
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : 0;
}

function calculatePercentile(arr, p) {
  const valid = (arr || []).filter(isFiniteNumber).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const pos = (p / 100) * (valid.length - 1);
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return low === high ? valid[low] : valid[low] + (valid[high] - valid[low]) * (pos - low);
}

function parseTimestamp(v) {
  if (v == null || v === "") return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

function safeString(v) {
  return v == null ? "" : String(v);
}

function clampNumber(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeEnvironment(v, host) {
  const raw = safeString(v).trim().toLowerCase();
  if (KNOWN_ENVIRONMENTS.indexOf(raw) !== -1) return raw;
  const h = safeString(host).toLowerCase();
  if (h.indexOf("localhost") !== -1 || h.indexOf("127.0.0.1") !== -1 || h.indexOf("dev") !== -1) {
    return "development";
  }
  if (h.indexOf("preview") !== -1 || h.indexOf("vercel") !== -1) return "preview";
  if (h.indexOf("staging") !== -1) return "staging";
  return "production";
}

function deriveEventName(ev) {
  if (ev.type === "custom") return safeString(ev.data && ev.data.name).trim() || "custom";
  if (ev.type === "performance") return "performance:" + safeString(ev.data && ev.data.metricName);
  return safeString(ev.type) || "unknown";
}

function deriveIngestionLatency(ev) {
  const em = parseTimestamp(ev.timestamp);
  const rc = parseTimestamp(ev.receivedAt);
  return em === null || rc === null ? null : Math.max(0, rc - em);
}

function getEventSortTimestamp(e) {
  return parseTimestamp(e.receivedAt || e.timestamp) || 0;
}

function buildEventSearchBlob(e) {
  return [e.type, e.userId, e.sessionId, e.route, JSON.stringify(e.data || {})].join(" ").toLowerCase();
}

function normalizeIncomingEvent(raw) {
  const n = {
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
    receivedAt: new Date().toISOString(),
  };
  if (!n.eventName) n.eventName = deriveEventName(n);
  return n;
}

function normalizeStreamFilters(searchParams) {
  const fromRaw = searchParams.get("dateFrom");
  const toRaw = searchParams.get("dateTo");
  const from = fromRaw ? parseTimestamp(fromRaw) : null;
  const to = toRaw ? parseTimestamp(toRaw) : null;
  const limit = parseInt(searchParams.get("limit") || "80", 10);
  const cursor = parseInt(searchParams.get("cursor") || "0", 10);

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
    cursor: Math.max(0, Number.isFinite(cursor) ? cursor : 0),
  };
}

function matchesStreamFilters(e, f) {
  const et = parseTimestamp(e.timestamp);
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
  const lat = deriveIngestionLatency(e);
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
    raw: e,
  };
}

function compareEventsByRecency(a, b) {
  const byReceived = getEventSortTimestamp(b) - getEventSortTimestamp(a);
  if (byReceived !== 0) return byReceived;
  return (parseTimestamp(b.timestamp) || 0) - (parseTimestamp(a.timestamp) || 0);
}

function queryEventsWithFilters(events, f) {
  const filtered = events
    .filter((e) => matchesStreamFilters(e, f))
    .sort(compareEventsByRecency);
  const start = f.cursor;
  const end = start + f.limit;
  return {
    total: filtered.length,
    cursor: start,
    nextCursor: end < filtered.length ? end : null,
    events: filtered.slice(start, end).map(toInspectorEvent),
  };
}

function getRecentEvents(events, limit) {
  return (events || [])
    .slice()
    .sort(compareEventsByRecency)
    .slice(0, limit || 50);
}

/**
 * Peak number of distinct active sessions observed within any rolling
 * `windowMs` span across the given events. This is the historical maximum
 * of concurrent users; because it is derived from the persisted event
 * history it never resets or decreases on restart (unlike a value held only
 * in memory). Always >= the current active-user count for the same window.
 *
 * @param {Array<Object>} events - Events with `timestamp` and `sessionId`.
 * @param {number} [windowMs] - Rolling window size in ms. Defaults to 30000.
 * @returns {number} Peak concurrent distinct sessions.
 */
function computeMaxConcurrentUsers(events, windowMs) {
  const span = isFiniteNumber(windowMs) && windowMs > 0 ? windowMs : 30000;
  const points = [];
  (events || []).forEach(function (ev) {
    const ts = parseTimestamp(ev && ev.timestamp);
    const sid = ev && ev.sessionId;
    if (ts !== null && sid) points.push({ ts: ts, sid: sid });
  });
  points.sort(function (a, b) { return a.ts - b.ts; });

  const counts = new Map();
  let left = 0;
  let max = 0;
  for (let right = 0; right < points.length; right++) {
    const sid = points[right].sid;
    counts.set(sid, (counts.get(sid) || 0) + 1);
    while (points[right].ts - points[left].ts > span) {
      const leftSid = points[left].sid;
      const remaining = counts.get(leftSid) - 1;
      if (remaining <= 0) counts.delete(leftSid); else counts.set(leftSid, remaining);
      left++;
    }
    if (counts.size > max) max = counts.size;
  }
  return max;
}

module.exports = {
  DEFAULT_STREAM_LIMIT,
  MAX_STREAM_LIMIT,
  KNOWN_ENVIRONMENTS,
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
  getEventSortTimestamp,
  buildEventSearchBlob,
  normalizeIncomingEvent,
  normalizeStreamFilters,
  matchesStreamFilters,
  toInspectorEvent,
  compareEventsByRecency,
  queryEventsWithFilters,
  getRecentEvents,
  computeMaxConcurrentUsers,
};
