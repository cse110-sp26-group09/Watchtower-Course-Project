"use strict";

/**
 * Pure helpers for the WatchTower Prototype 3 server.
 *
 * Side-effect-free utilities used by `server.js` and unit tests.
 *
 * @module prototype_3/server/server-helpers
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
 * Build error-count time series for the dashboard's standard ranges.
 *
 * Buckets are computed in UTC (timestamps are stored/returned in UTC; the
 * frontend converts for display). Each range returns chart-ready arrays:
 * `{ labels, values, total }`.
 *
 * Ranges:
 * - `24h`   : 24 hourly buckets ending at the current hour
 * - `today` : hourly buckets from UTC midnight through the current hour
 * - `7d`    : 7 daily buckets ending today (this week)
 * - `30d`   : 30 daily buckets ending today
 *
 * @param {Array<Object>} events - Events; only `type === "error"` are counted.
 * @param {number} [nowMs] - Reference "now" in ms. Defaults to Date.now().
 * @returns {{ "24h": Object, today: Object, "7d": Object, "30d": Object }}
 */
function buildErrorsOverTime(events, nowMs) {
  const now = isFiniteNumber(nowMs) ? nowMs : Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;

  const errorTimes = [];
  (events || []).forEach(function (ev) {
    if (ev && ev.type === "error") {
      const t = parseTimestamp(ev.timestamp);
      if (t !== null) errorTimes.push(t);
    }
  });

  const hourLabel = function (ms) {
    return String(new Date(ms).getUTCHours()).padStart(2, "0") + ":00";
  };
  const dayLabel = function (ms) {
    const d = new Date(ms);
    return String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  };

  function series(startMs, bucketMs, count, labelFn) {
    const values = new Array(count).fill(0);
    for (let i = 0; i < errorTimes.length; i++) {
      const t = errorTimes[i];
      if (t < startMs || t > now) continue;
      let idx = Math.floor((t - startMs) / bucketMs);
      if (idx < 0) idx = 0;
      if (idx >= count) idx = count - 1;
      values[idx] += 1;
    }
    const labels = [];
    for (let i = 0; i < count; i++) labels.push(labelFn(startMs + i * bucketMs));
    const total = values.reduce(function (sum, v) { return sum + v; }, 0);
    return { labels: labels, values: values, total: total };
  }

  const currentHourStart = Math.floor(now / HOUR) * HOUR;
  const midnight = Math.floor(now / DAY) * DAY;
  const hoursToday = Math.floor((now - midnight) / HOUR) + 1;

  return {
    "24h": series(currentHourStart - 23 * HOUR, HOUR, 24, hourLabel),
    today: series(midnight, HOUR, hoursToday, hourLabel),
    "7d": series(midnight - 6 * DAY, DAY, 7, dayLabel),
    "30d": series(midnight - 29 * DAY, DAY, 30, dayLabel),
  };
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
  buildErrorsOverTime,
};
