"use strict";

/**
 * Prototype 3 event store.
 *
 * Uses Supabase/PostgreSQL when explicitly configured for Prototype 3 and
 * falls back to the existing in-memory behavior for local/CI runs.
 *
 * @module prototype_3/server/event-store
 */

const path = require("path");
const { randomUUID } = require("crypto");
const { config: loadEnv } = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const { normalizeIncomingEvent } = require("./server-helpers");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DEFAULT_TABLE = "prototype3_events";
const DEFAULT_MAX_EVENTS = 10000;

loadEnv({ quiet: true });
loadEnv({ path: path.join(REPO_ROOT, ".env"), quiet: true });

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
`;

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

  async function listEvents(limit) {
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
    return events.slice(-resolvedLimit);
  }

  async function allEvents(limit) {
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : maxEvents;
    return events.slice(-resolvedLimit);
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

  return {
    type: "memory",
    tableName: null,
    insertEvents,
    listEvents,
    allEvents,
    pruneOldest,
    _events: events,
  };
}

function createSupabaseEventStore(client, options) {
  const opts = options || {};
  const tableName = opts.tableName || process.env.SUPABASE_P3_EVENTS_TABLE || DEFAULT_TABLE;

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

  async function listEvents(limit) {
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
    const result = await client
      .from(tableName)
      .select("*")
      .order("received_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(resolvedLimit);
    assertSupabaseResult(result, "Failed to list Prototype 3 events");
    return (result.data || []).map(rowToEvent).reverse();
  }

  async function allEvents(limit) {
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_MAX_EVENTS;
    const result = await client
      .from(tableName)
      .select("*")
      .order("received_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(resolvedLimit);
    assertSupabaseResult(result, "Failed to load Prototype 3 events");
    return (result.data || []).map(rowToEvent).reverse();
  }

  async function countEvents() {
    const result = await client
      .from(tableName)
      .select("id", { count: "exact", head: true });
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

  return {
    type: "supabase",
    tableName,
    insertEvents,
    listEvents,
    allEvents,
    pruneOldest,
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
    });
  }

  if (hasSupabaseConfig(env)) {
    return createSupabaseEventStore(createSupabaseClientFromEnv(env), {
      tableName: env.SUPABASE_P3_EVENTS_TABLE || DEFAULT_TABLE,
    });
  }

  return createMemoryEventStore({ maxEvents });
}

module.exports = {
  DEFAULT_TABLE,
  EVENTS_TABLE_SCHEMA_SQL,
  hasSupabaseConfig,
  generateEventId,
  normalizeForStorage,
  eventToRow,
  rowToEvent,
  createMemoryEventStore,
  createSupabaseEventStore,
  createConfiguredEventStore,
};
