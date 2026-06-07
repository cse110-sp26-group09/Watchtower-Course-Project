"use strict";

/**
 * Prototype 3 event store.
 *
 * Uses Supabase/PostgreSQL when explicitly configured for Prototype 3 and
 * falls back to the existing in-memory behavior for local/CI runs.
 *
 * @module backend/event-store
 */

const path = require("path");
const { randomUUID } = require("crypto");
const { config: loadEnv } = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const {
  calculateAverage,
  calculatePercentile,
  computeMaxConcurrentUsers,
  normalizeIncomingEvent,
  parseTimestamp,
} = require("./server-helpers");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_TABLE = "prototype3_events";
const DEFAULT_USERS_TABLE = "app_users";
const DEFAULT_MAX_EVENTS = 10000;

loadEnv({ quiet: true });
loadEnv({ path: path.join(REPO_ROOT, ".env"), quiet: true });

// Run this ALTER TABLE once against the Supabase project to add the timezone
// column to app_users. The default empty string keeps existing rows valid so
// the migration is non-destructive and can be applied without downtime.
const APP_USERS_TIMEZONE_MIGRATION_SQL = `
alter table public.app_users
  add column if not exists timezone text not null default '';
`;

const EVENTS_TABLE_SCHEMA_SQL = `
create table if not exists public.prototype3_events (
  id text primary key,
  type text not null,
  event_name text,
  timestamp timestamptz not null,
  session_id text,
  user_id text,
  route text,
  deploy_version text,
  app_name text,
  environment text,
  sdk_version text,
  data jsonb default '{}'::jsonb,
  received_at timestamptz not null
);

create index if not exists idx_prototype3_events_type
  on public.prototype3_events(type);

create index if not exists idx_prototype3_events_event_name
  on public.prototype3_events(event_name);

create index if not exists idx_prototype3_events_session_id
  on public.prototype3_events(session_id);

create index if not exists idx_prototype3_events_environment
  on public.prototype3_events(environment);

create index if not exists idx_prototype3_events_received_at
  on public.prototype3_events(received_at);

create index if not exists idx_prototype3_events_user_received_at
  on public.prototype3_events(user_id, received_at);

create index if not exists idx_prototype3_events_user_type_received_at
  on public.prototype3_events(user_id, type, received_at);

create index if not exists idx_prototype3_events_user_route_received_at
  on public.prototype3_events(user_id, route, received_at);

create index if not exists idx_prototype3_events_user_timestamp
  on public.prototype3_events(user_id, timestamp);

create table if not exists public.app_users (
  clerk_user_id text primary key,
  email text default '',
  display_name text default '',
  last_seen_at timestamptz not null
);

create index if not exists idx_app_users_last_seen_at
  on public.app_users(last_seen_at);
`;

const ANALYTICS_RANGES = [
  { key: "24h", windowMs: 24 * 60 * 60 * 1000, buckets: 8 },
  { key: "7d", windowMs: 7 * 24 * 60 * 60 * 1000, buckets: 7 },
  { key: "30d", windowMs: 30 * 24 * 60 * 60 * 1000, buckets: 5 },
];
const MAX_ANALYTICS_WINDOW_MS = ANALYTICS_RANGES.reduce(function (max, range) {
  return Math.max(max, range.windowMs);
}, 0);

function generateEventId() {
  if (typeof randomUUID === "function") return randomUUID();
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function hasSupabaseConfig(env) {
  const source = env || process.env;
  const hasUrl = Boolean(source.SUPABASE_URL);
  const hasKey = Boolean(source.SUPABASE_SERVICE_ROLE_KEY || source.SUPABASE_ANON_KEY);
  return hasUrl && hasKey;
}

function normalizeForStorage(rawEvent) {
  const normalized = normalizeIncomingEvent(rawEvent && typeof rawEvent === "object" ? rawEvent : {});
  return Object.assign({}, normalized, {
    id: rawEvent && typeof rawEvent.id === "string" && rawEvent.id.length > 0 ? rawEvent.id : generateEventId(),
  });
}

function eventToRow(event) {
  return {
    id: event.id,
    type: event.type,
    event_name: event.eventName,
    timestamp: event.timestamp,
    session_id: event.sessionId,
    user_id: event.userId,
    route: event.route,
    deploy_version: event.deployVersion,
    app_name: event.appName,
    environment: event.environment,
    sdk_version: event.sdkVersion,
    data: event.data || {},
    received_at: event.receivedAt,
  };
}

function rowToEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    eventName: row.event_name || row.type || "unknown",
    timestamp: row.timestamp,
    sessionId: row.session_id || "unknown-session",
    userId: row.user_id || null,
    deployVersion: row.deploy_version || "unknown",
    appName: row.app_name || "shopdemo",
    environment: row.environment || "production",
    sdkVersion: row.sdk_version || "sdk-unknown",
    route: row.route || "/",
    data: row.data && typeof row.data === "object" ? row.data : {},
    receivedAt: row.received_at,
  };
}

function getEventTimestampMs(event) {
  return parseTimestamp(event && (event.timestamp || event.receivedAt));
}

function getLatencyMs(event) {
  if (!event || !event.data) return null;
  if (event.type === "pageload") {
    const duration = Number(event.data.duration);
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  }
  if (event.type === "performance") {
    const metricName = String(event.data.metricName || event.data.name || "").toLowerCase();
    const explicitLatency = Number(event.data.duration || event.data.latency || event.data.latencyMs);
    if (Number.isFinite(explicitLatency) && explicitLatency > 0) return explicitLatency;
    const value = Number(event.data.value);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (
      metricName.indexOf("latency") !== -1 ||
      metricName.indexOf("duration") !== -1 ||
      metricName.indexOf("ttfb") !== -1 ||
      metricName.indexOf("load") !== -1 ||
      metricName.indexOf("api") !== -1 ||
      metricName.indexOf("fetch") !== -1
    ) {
      return value;
    }
  }
  return null;
}

function getFeedbackRating(event) {
  const value = event && event.data ? Number(event.data.rating) : NaN;
  return Number.isFinite(value) ? Math.min(5, Math.max(1, Math.round(value))) : null;
}

function getEventBreakdownKey(event) {
  const type = event && event.type ? String(event.type) : "";
  if (type === "pageload" || type === "performance") return "performance";
  if (type === "error") return "errors";
  if (type === "feedback") return "feedback";
  if (type === "click" || type === "custom" || type === "login") return "clicks";
  return null;
}

function buildLatencyByRoute(events) {
  const routes = {};
  (events || []).forEach(function (event) {
    const latency = getLatencyMs(event);
    if (!Number.isFinite(latency)) return;
    const route = event.route || "/";
    if (!routes[route]) routes[route] = [];
    routes[route].push(latency);
  });
  return Object.keys(routes).reduce(function (summary, route) {
    summary[route] = {
      count: routes[route].length,
      p95: Math.round(calculatePercentile(routes[route], 95)),
      avg: Math.round(calculateAverage(routes[route])),
    };
    return summary;
  }, {});
}

function buildFeedbackCounts(events) {
  const ratingCounts = [0, 0, 0, 0, 0];
  let total = 0;
  let sum = 0;
  (events || []).forEach(function (event) {
    if (event.type !== "feedback") return;
    const rating = getFeedbackRating(event);
    if (rating === null) return;
    ratingCounts[rating - 1] += 1;
    total += 1;
    sum += rating;
  });
  return {
    total,
    average: total === 0 ? 0 : Number((sum / total).toFixed(2)),
    ratingCounts,
  };
}

function buildEventBreakdown(events) {
  const counts = {
    performance: 0,
    errors: 0,
    feedback: 0,
    clicks: 0,
  };
  (events || []).forEach(function (event) {
    const key = getEventBreakdownKey(event);
    if (key) counts[key] += 1;
  });
  return counts;
}

function buildFeatureCounts(events) {
  const counts = {};
  (events || []).forEach(function (event) {
    let featureName = "";
    if (event.type === "click") {
      featureName = event.data && (event.data.text || event.data.target) ? String(event.data.text || event.data.target) : "";
    } else if (event.type === "custom") {
      featureName = event.data && event.data.name ? String(event.data.name) : "";
    }
    if (featureName) counts[featureName] = (counts[featureName] || 0) + 1;
  });
  return Object.keys(counts).map(function (name) {
    return { name, count: counts[name] };
  }).sort(function (a, b) { return b.count - a.count; });
}

function getStartOfDayMs(valueMs) {
  const date = new Date(valueMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getRangeBucketIndex(ts, nowMs, range) {
  const bucketCount = range.buckets;
  if (range.key === "7d") {
    const daysAgo = Math.floor((getStartOfDayMs(nowMs) - getStartOfDayMs(ts)) / (24 * 60 * 60 * 1000));
    if (daysAgo < 0 || daysAgo >= bucketCount) return null;
    return bucketCount - 1 - daysAgo;
  }
  if (range.key === "30d") {
    const daysAgo = Math.floor((getStartOfDayMs(nowMs) - getStartOfDayMs(ts)) / (24 * 60 * 60 * 1000));
    if (daysAgo < 0 || daysAgo >= 30) return null;
    const weeksAgo = Math.floor(daysAgo / 7);
    if (weeksAgo >= bucketCount) return null;
    return bucketCount - 1 - weeksAgo;
  }
  const cutoff = nowMs - range.windowMs;
  if (ts < cutoff) return null;
  const span = Math.max(nowMs - cutoff, 1);
  return Math.min(bucketCount - 1, Math.max(0, Math.floor(((ts - cutoff) / span) * bucketCount)));
}

function buildBucketSeries(events, nowMs, range, valuePicker) {
  const bucketCount = range.buckets;
  const buckets = Array.from({ length: bucketCount }, function () { return 0; });
  (events || []).forEach(function (event) {
    const ts = getEventTimestampMs(event);
    if (ts === null) return;
    const bucketIndex = getRangeBucketIndex(ts, nowMs, range);
    if (bucketIndex === null) return;
    buckets[bucketIndex] += valuePicker(event);
  });
  return buckets;
}

function buildUniqueBucketSeries(events, nowMs, range, keyPicker) {
  const bucketCount = range.buckets;
  const bucketSets = Array.from({ length: bucketCount }, function () { return new Set(); });
  (events || []).forEach(function (event) {
    const ts = getEventTimestampMs(event);
    if (ts === null) return;
    const key = keyPicker(event);
    if (!key) return;
    const bucketIndex = getRangeBucketIndex(ts, nowMs, range);
    if (bucketIndex === null) return;
    bucketSets[bucketIndex].add(String(key));
  });
  return bucketSets.map(function (bucketSet) { return bucketSet.size; });
}

function buildLatencyBucketSeries(events, nowMs, range) {
  const bucketCount = range.buckets;
  const buckets = Array.from({ length: bucketCount }, function () { return []; });
  (events || []).forEach(function (event) {
    const ts = getEventTimestampMs(event);
    if (ts === null) return;
    const latency = getLatencyMs(event);
    if (!Number.isFinite(latency)) return;
    const bucketIndex = getRangeBucketIndex(ts, nowMs, range);
    if (bucketIndex === null) return;
    buckets[bucketIndex].push(latency);
  });
  return buckets.map(function (bucket) {
    return bucket.length ? Math.round(calculateAverage(bucket)) : 0;
  });
}

function buildRangeAnalytics(events, range, nowMs) {
  const cutoff = nowMs - range.windowMs;
  const rangeEvents = (events || []).filter(function (event) {
    const ts = getEventTimestampMs(event);
    return ts === null || ts >= cutoff;
  });
  return {
    windowMs: range.windowMs,
    bucketCount: range.buckets,
    uniqueUsers: new Set(rangeEvents.map(function (event) {
      return event.sessionId || event.userId || null;
    }).filter(Boolean)).size,
    actionCount: rangeEvents.filter(function (event) {
      return event.type === "click" || event.type === "custom" || event.type === "feedback";
    }).length,
    totalEvents: rangeEvents.length,
    latencyByRoute: buildLatencyByRoute(rangeEvents),
    feedbackCounts: buildFeedbackCounts(rangeEvents),
    eventBreakdown: buildEventBreakdown(rangeEvents),
    featureCounts: buildFeatureCounts(rangeEvents),
    userActivitySeries: buildUniqueBucketSeries(rangeEvents, nowMs, range, function (event) {
      return event.sessionId || event.userId || null;
    }),
    actionSeries: buildBucketSeries(rangeEvents, nowMs, range, function (event) {
      return event.type === "custom" || event.type === "click" ? 1 : 0;
    }),
    errorSeries: buildBucketSeries(rangeEvents, nowMs, range, function (event) {
      return event.type === "error" ? 1 : 0;
    }),
    latencySeries: buildLatencyBucketSeries(rangeEvents, nowMs, range),
  };
}

function buildAnalyticsSnapshot(events, options) {
  const opts = options || {};
  const sourceEvents = events || [];
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const activeWindowMs = Number.isFinite(opts.activeUserWindowMs) && opts.activeUserWindowMs > 0
    ? opts.activeUserWindowMs
    : 30000;
  const activeCutoff = nowMs - activeWindowMs;
  const activeSessions = new Set();
  const errorsByVersion = {};
  const recentErrors = [];
  let totalErrors = 0;

  for (let i = sourceEvents.length - 1; i >= 0; i--) {
    const event = sourceEvents[i];
    if (getEventTimestampMs(event) >= activeCutoff && event.sessionId) activeSessions.add(event.sessionId);
    if (event.type === "error") {
      totalErrors += 1;
      errorsByVersion[event.deployVersion] = (errorsByVersion[event.deployVersion] || 0) + 1;
      if (recentErrors.length < 1000) recentErrors.push(event);
    }
  }

  const analyticsRanges = {};
  ANALYTICS_RANGES.forEach(function (range) {
    analyticsRanges[range.key] = buildRangeAnalytics(sourceEvents, range, nowMs);
  });

  return {
    activeUsers: activeSessions.size,
    maxUsers: computeMaxConcurrentUsers(sourceEvents, activeWindowMs),
    totalEvents: sourceEvents.length,
    totalErrors,
    errorsByVersion,
    latencyByRoute: buildLatencyByRoute(sourceEvents),
    feedbackCounts: buildFeedbackCounts(sourceEvents),
    eventBreakdown: buildEventBreakdown(sourceEvents),
    featureCounts: buildFeatureCounts(sourceEvents),
    userActivity: {
      activeUsers: activeSessions.size,
      maxUsers: computeMaxConcurrentUsers(sourceEvents, activeWindowMs),
      windowMs: activeWindowMs,
    },
    analyticsRanges,
    recentErrors,
    recentActivity: sourceEvents.slice(-20),
  };
}

function assertSupabaseResult(result, context) {
  if (result && result.error) {
    throw new Error(context + ": " + result.error.message);
  }
  return result;
}

function createSupabaseClientFromEnv(env) {
  const source = env || process.env;
  const supabaseUrl = source.SUPABASE_URL;
  const supabaseKey = source.SUPABASE_SERVICE_ROLE_KEY || source.SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createMemoryEventStore(options) {
  const opts = options || {};
  const maxEvents = Number.isFinite(opts.maxEvents) ? opts.maxEvents : DEFAULT_MAX_EVENTS;
  const events = [];

  async function insertEvents(rawEvents) {
    const normalized = (rawEvents || []).map(normalizeForStorage);
    normalized.forEach(function (event) {
      events.push(event);
    });
    while (events.length > maxEvents) events.shift();
    return normalized;
  }

  function filterByOwner(source, filters) {
    const owner = filters && filters.userId ? filters.userId : "";
    if (!owner) return source;
    return source.filter(function (event) {
      return event.userId === owner;
    });
  }

  async function listEvents(limit, filters) {
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
    return filterByOwner(events, filters).slice(-resolvedLimit);
  }

  async function allEvents(limit, filters) {
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : maxEvents;
    return filterByOwner(events, filters).slice(-resolvedLimit);
  }

  async function analyticsEvents(options) {
    const o = options || {};
    const owner = o.userId || "";
    const sinceMs = Number.isFinite(o.sinceMs) ? o.sinceMs : null;
    const resolvedLimit = Number.isFinite(o.maxEvents) && o.maxEvents > 0 ? Math.floor(o.maxEvents) : maxEvents;
    return filterByOwner(events, { userId: owner }).filter(function (event) {
      if (sinceMs === null) return true;
      const ts = getEventTimestampMs(event);
      return ts === null || ts >= sinceMs;
    }).slice(-resolvedLimit);
  }

  async function syncUser(user) {
    // The in-memory store keeps no user table; return the input as a no-op so
    // callers (and tests) get a consistent shape without persistence.
    return user || null;
  }

  async function pruneOldest(maxRows) {
    const resolvedMax = Number.isFinite(maxRows) && maxRows > 0 ? Math.floor(maxRows) : maxEvents;
    let removed = 0;
    while (events.length > resolvedMax) {
      events.shift();
      removed += 1;
    }
    return removed;
  }

  async function countErrors(options) {
    const o = options || {};
    const since = Number.isFinite(o.sinceMs) ? o.sinceMs : null;
    const owner = o.userId || "";
    return events.filter(function (e) {
      if (e.type !== "error") return false;
      if (owner && e.userId !== owner) return false;
      if (since === null) return true;
      const ts = Date.parse(e.receivedAt || e.timestamp);
      return Number.isFinite(ts) ? ts >= since : true;
    }).length;
  }

  async function countEvents(options) {
    const o = options || {};
    const owner = o.userId || "";
    return events.filter(function (e) {
      if (owner && e.userId !== owner) return false;
      if (Number.isFinite(o.sinceMs)) {
        const ts = Date.parse(e.receivedAt || e.timestamp);
        if (Number.isFinite(ts) && ts < o.sinceMs) return false;
      }
      return true;
    }).length;
  }

  async function getAnalyticsSnapshot(options) {
    const o = options || {};
    const nowMs = Number.isFinite(o.nowMs) ? o.nowMs : Date.now();
    const source = await analyticsEvents({
      userId: o.userId || "",
      sinceMs: nowMs - MAX_ANALYTICS_WINDOW_MS,
      maxEvents: o.maxEvents || maxEvents,
    });
    const snapshot = buildAnalyticsSnapshot(source, Object.assign({}, o, { nowMs }));
    snapshot.totalEvents = await countEvents({ userId: o.userId || "" });
    if (Number.isFinite(o.errorSinceMs)) {
      snapshot.totalErrors = await countErrors({ sinceMs: o.errorSinceMs, userId: o.userId || "" });
    }
    return snapshot;
  }

  return {
    type: "memory",
    tableName: null,
    insertEvents,
    listEvents,
    allEvents,
    analyticsEvents,
    syncUser,
    pruneOldest,
    countEvents,
    countErrors,
    getAnalyticsSnapshot,
    _events: events,
  };
}

function createSupabaseEventStore(client, options) {
  const opts = options || {};
  const tableName = opts.tableName || process.env.SUPABASE_P3_EVENTS_TABLE || DEFAULT_TABLE;
  const usersTableName = opts.usersTableName || process.env.SUPABASE_P3_USERS_TABLE || DEFAULT_USERS_TABLE;

  async function insertEvents(rawEvents) {
    const normalized = (rawEvents || []).map(normalizeForStorage);
    if (normalized.length === 0) return [];
    const rows = normalized.map(eventToRow);
    const result = await client
      .from(tableName)
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
      .select("*");
    assertSupabaseResult(result, "Failed to insert Prototype 3 events");
    return (result.data && result.data.length ? result.data.map(rowToEvent) : normalized);
  }

  async function listEvents(limit, filters) {
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
    let query = client
      .from(tableName)
      .select("*")
      .order("received_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(resolvedLimit);
    if (filters && filters.userId) query = query.eq("user_id", filters.userId);
    const result = await query;
    assertSupabaseResult(result, "Failed to list Prototype 3 events");
    return (result.data || []).map(rowToEvent).reverse();
  }

  async function allEvents(limit, filters) {
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_MAX_EVENTS;
    let query = client
      .from(tableName)
      .select("*")
      .order("received_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(resolvedLimit);
    if (filters && filters.userId) query = query.eq("user_id", filters.userId);
    const result = await query;
    assertSupabaseResult(result, "Failed to load Prototype 3 events");
    return (result.data || []).map(rowToEvent).reverse();
  }

  async function analyticsEvents(options) {
    const o = options || {};
    const resolvedLimit = Number.isFinite(o.maxEvents) && o.maxEvents > 0 ? Math.floor(o.maxEvents) : DEFAULT_MAX_EVENTS;
    let query = client
      .from(tableName)
      .select("*")
      .order("timestamp", { ascending: false })
      .order("id", { ascending: false })
      .limit(resolvedLimit);
    if (o.userId) query = query.eq("user_id", o.userId);
    if (Number.isFinite(o.sinceMs)) query = query.gte("timestamp", new Date(o.sinceMs).toISOString());
    const result = await query;
    assertSupabaseResult(result, "Failed to load Prototype 3 analytics events");
    return (result.data || []).map(rowToEvent).reverse();
  }

  async function syncUser(user) {
    const input = user || {};
    const clerkUserId = input.clerkUserId;
    if (!clerkUserId) {
      throw new Error("Failed to sync app user: clerkUserId is required");
    }
    const row = {
      clerk_user_id: clerkUserId,
      email: input.email || "",
      display_name: input.displayName || "",
      // Empty string rather than null so the NOT NULL column constraint is
      // satisfied even when the user has not selected a timezone yet.
      timezone: input.timezone || "",
      last_seen_at: new Date().toISOString(),
    };
    const result = await client
      .from(usersTableName)
      .upsert(row, { onConflict: "clerk_user_id" })
      .select("*");
    assertSupabaseResult(result, "Failed to sync app user");
    return (result.data && result.data.length ? result.data[0] : row);
  }

  async function countEvents(options) {
    const o = options || {};
    let query = client
      .from(tableName)
      .select("id", { count: "exact", head: true });
    if (o.userId) {
      query = query.eq("user_id", o.userId);
    }
    if (Number.isFinite(o.sinceMs)) {
      query = query.gte("received_at", new Date(o.sinceMs).toISOString());
    }
    const result = await query;
    assertSupabaseResult(result, "Failed to count Prototype 3 events");
    return result.count || 0;
  }

  async function pruneOldest(maxRows) {
    if (!Number.isFinite(maxRows) || maxRows <= 0) return 0;
    const total = await countEvents();
    if (total <= maxRows) return 0;

    const overflow = total - maxRows;
    const oldest = await client
      .from(tableName)
      .select("id")
      .order("received_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(overflow);
    assertSupabaseResult(oldest, "Failed to find old Prototype 3 events");

    const ids = (oldest.data || []).map(function (row) { return row.id; }).filter(Boolean);
    if (ids.length === 0) return 0;

    const deleted = await client.from(tableName).delete().in("id", ids);
    assertSupabaseResult(deleted, "Failed to prune old Prototype 3 events");
    return ids.length;
  }

  async function countErrors(options) {
    const o = options || {};
    let query = client
      .from(tableName)
      .select("id", { count: "exact", head: true })
      .eq("type", "error");
    if (o.userId) {
      query = query.eq("user_id", o.userId);
    }
    if (Number.isFinite(o.sinceMs)) {
      query = query.gte("received_at", new Date(o.sinceMs).toISOString());
    }
    const result = await query;
    assertSupabaseResult(result, "Failed to count Prototype 3 errors");
    return result.count || 0;
  }

  async function getAnalyticsSnapshot(options) {
    const o = options || {};
    const nowMs = Number.isFinite(o.nowMs) ? o.nowMs : Date.now();
    const source = await analyticsEvents({
      userId: o.userId || "",
      sinceMs: nowMs - MAX_ANALYTICS_WINDOW_MS,
      maxEvents: o.maxEvents || DEFAULT_MAX_EVENTS,
    });
    const snapshot = buildAnalyticsSnapshot(source, Object.assign({}, o, { nowMs }));
    snapshot.totalEvents = await countEvents({ userId: o.userId || "" });
    if (Number.isFinite(o.errorSinceMs)) {
      snapshot.totalErrors = await countErrors({ sinceMs: o.errorSinceMs, userId: o.userId || "" });
    }
    return snapshot;
  }

  return {
    type: "supabase",
    tableName,
    usersTableName,
    insertEvents,
    listEvents,
    allEvents,
    analyticsEvents,
    syncUser,
    pruneOldest,
    countEvents,
    countErrors,
    getAnalyticsSnapshot,
    _client: client,
  };
}

function createConfiguredEventStore(options) {
  const opts = options || {};
  const env = opts.env || process.env;
  const maxEvents = Number.isFinite(opts.maxEvents) ? opts.maxEvents : DEFAULT_MAX_EVENTS;

  if (opts.client) {
    return createSupabaseEventStore(opts.client, {
      tableName: opts.tableName || env.SUPABASE_P3_EVENTS_TABLE || DEFAULT_TABLE,
      usersTableName: opts.usersTableName || env.SUPABASE_P3_USERS_TABLE || DEFAULT_USERS_TABLE,
    });
  }

  if (hasSupabaseConfig(env)) {
    return createSupabaseEventStore(createSupabaseClientFromEnv(env), {
      tableName: env.SUPABASE_P3_EVENTS_TABLE || DEFAULT_TABLE,
      usersTableName: env.SUPABASE_P3_USERS_TABLE || DEFAULT_USERS_TABLE,
    });
  }

  return createMemoryEventStore({ maxEvents });
}

module.exports = {
  DEFAULT_TABLE,
  DEFAULT_USERS_TABLE,
  EVENTS_TABLE_SCHEMA_SQL,
  APP_USERS_TIMEZONE_MIGRATION_SQL,
  hasSupabaseConfig,
  generateEventId,
  normalizeForStorage,
  eventToRow,
  rowToEvent,
  buildAnalyticsSnapshot,
  createMemoryEventStore,
  createSupabaseEventStore,
  createConfiguredEventStore,
};
