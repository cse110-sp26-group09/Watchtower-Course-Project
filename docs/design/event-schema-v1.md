# Prototype 3 Event Schema v1 + Storage Contract

**Applies to:** `src/prototype_3`  
**Source of truth:** `src/prototype_3/server/event-store.js`  
**Status:** Accepted  
**Sprint:** 2

---

## Overview

This document describes the event and user schemas used by Prototype 3's backend event store. The runtime store uses Supabase/PostgreSQL when Supabase environment variables are configured, and an in-memory store with the same normalized event shape for local and CI runs.

The default Supabase tables are:

| Logical data | Default table | Override |
|---|---|---|
| Events | `prototype3_events` | `SUPABASE_P3_EVENTS_TABLE` |
| Users | `app_users` | `SUPABASE_P3_USERS_TABLE` |

---

## Runtime Event Shape

Incoming events are normalized before storage. The in-memory store keeps this camelCase shape, and the Supabase store maps it to snake_case columns.

| Field | Type | Default / normalization | Description |
|---|---|---|---|
| `id` | `string` | Existing non-empty `rawEvent.id`, else generated UUID/fallback id. | Primary event identifier. |
| `type` | `string` | `raw.type || "custom"` | Event type. Server validation only requires `type` to be a string before ingestion. |
| `eventName` | `string` | `raw.eventName || raw.name`, else derived from event content. | Human-readable event name for filtering/display. |
| `timestamp` | `string` | `raw.timestamp || new Date().toISOString()` | Client event time, stored as `timestamptz` in Supabase. |
| `sessionId` | `string` | `raw.sessionId || "unknown-session"` | Session identifier used for active-user metrics. |
| `userId` | `string \| null` | `raw.userId || null`, unless request ownership stamps/overrides it. | Application/Clerk owner id used for per-user filtering. |
| `deployVersion` | `string` | `raw.deployVersion || "unknown"` | Release/deploy label. |
| `appName` | `string` | `raw.appName || "shopdemo"` | Logical app name. |
| `environment` | `string` | Normalized from `raw.environment || raw.env` and `raw.url`; defaults to `"production"`. | One of `production`, `staging`, `development`, or `preview` when recognized. |
| `sdkVersion` | `string` | `raw.sdkVersion || "sdk-unknown"` | SDK/client version label. |
| `route` | `string` | `raw.route || "/"` | App route associated with the event. |
| `data` | `object` | `raw.data` when it is an object, else `{}` | Type-specific JSON payload. |
| `receivedAt` | `string` | `new Date().toISOString()` | Server ingestion time. |

### Event Name Derivation

If `eventName` is missing after reading `eventName`/`name`, the server derives it as follows:

| Condition | Derived `eventName` |
|---|---|
| `type === "custom"` | `data.name` if present, else `"custom"` |
| `type === "performance"` | `"performance:" + data.metricName` |
| Any other type | `type`, else `"unknown"` |

### Minimal Accepted Event

`POST /api/events` filters incoming events through `isValidEvent`, which only requires a non-null object with `type` as a string.

```json
{
  "type": "click"
}
```

After normalization this event is stored with generated/default fields such as `id`, `timestamp`, `sessionId`, `eventName`, `data`, and `receivedAt`.

### Normalized Event Example

```json
{
  "id": "4f2080f7-9a22-4df8-a3fd-7a7f51b28a59",
  "type": "error",
  "eventName": "error",
  "timestamp": "2026-05-16T18:00:01.234Z",
  "sessionId": "a1b2c3d4-e5f6-4789",
  "userId": "user_42",
  "deployVersion": "v1.0.0",
  "appName": "shopdemo",
  "environment": "production",
  "sdkVersion": "sdk-unknown",
  "route": "/dashboard",
  "data": {
    "message": "Cannot read properties of undefined",
    "source": "dashboard.js",
    "line": 142,
    "col": 8,
    "stack": "TypeError: Cannot read properties of undefined\n    at ..."
  },
  "receivedAt": "2026-05-16T18:00:01.300Z"
}
```

---

## Supabase Event Table

`event-store.js` exposes the following SQL in `EVENTS_TABLE_SCHEMA_SQL`.

```sql
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
```

### Event Column Mapping

| Runtime field | Database column | Database type |
|---|---|---|
| `id` | `id` | `text primary key` |
| `type` | `type` | `text not null` |
| `eventName` | `event_name` | `text` |
| `timestamp` | `timestamp` | `timestamptz not null` |
| `sessionId` | `session_id` | `text` |
| `userId` | `user_id` | `text` |
| `route` | `route` | `text` |
| `deployVersion` | `deploy_version` | `text` |
| `appName` | `app_name` | `text` |
| `environment` | `environment` | `text` |
| `sdkVersion` | `sdk_version` | `text` |
| `data` | `data` | `jsonb default '{}'::jsonb` |
| `receivedAt` | `received_at` | `timestamptz not null` |

### Event Indexes

The schema creates indexes for common listing, filtering, ownership, and analytics queries:

```sql
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
```

---

## User Table

Prototype 3 also syncs dashboard/application users through `eventStore.syncUser()`.

```sql
create table if not exists public.app_users (
  clerk_user_id text primary key,
  email text default '',
  display_name text default '',
  last_seen_at timestamptz not null
);

create index if not exists idx_app_users_last_seen_at
  on public.app_users(last_seen_at);
```

The current code also defines a separate migration for `timezone`:

```sql
alter table public.app_users
  add column if not exists timezone text not null default '';
```

### User Column Mapping

| Runtime input | Database column | Database type / default | Description |
|---|---|---|---|
| `clerkUserId` | `clerk_user_id` | `text primary key` | Required user id. |
| `email` | `email` | `text default ''` | Email, normalized to an empty string when missing. |
| `displayName` | `display_name` | `text default ''` | Display name, normalized to an empty string when missing. |
| `timezone` | `timezone` | `text not null default ''` | Timezone preference; empty string means unset/default. |
| Server-generated | `last_seen_at` | `timestamptz not null` | Updated to current server time on each sync. |

---

## Store Behavior

### Insert

`insertEvents(rawEvents)`:

1. Normalizes each raw event.
2. Generates an `id` when one is not supplied.
3. Supabase mode upserts rows into the event table with `onConflict: "id"` and `ignoreDuplicates: true`.
4. In-memory mode appends normalized events and drops the oldest rows when the configured maximum is exceeded.

### Read

`listEvents(limit, { userId })` and `allEvents(limit, { userId })`:

| Store | Ordering | Filtering | Returned shape |
|---|---|---|---|
| Supabase | Most recent `received_at`/`id` rows are selected, then reversed to chronological order. | Optional `user_id === userId`. | Runtime camelCase event shape. |
| Memory | Takes the most recent events from the array. | Optional `userId === userId`. | Runtime camelCase event shape. |

### Analytics Query Window

`analyticsEvents({ userId, sinceMs, maxEvents })` filters by `userId` and, when `sinceMs` is finite, by event `timestamp`. Supabase mode orders by `timestamp` descending and returns the final result in chronological order.

---

## Analytics Snapshot Shape

`getAnalyticsSnapshot()` returns the shape built by `buildAnalyticsSnapshot()`:

| Field | Type | Description |
|---|---|---|
| `activeUsers` | `number` | Count of sessions active within the configured active-user window. |
| `maxUsers` | `number` | Maximum concurrent users computed over the active-user window. |
| `totalEvents` | `number` | Total event count for the selected owner. |
| `totalErrors` | `number` | Error count, optionally constrained by `errorSinceMs`. |
| `errorsByVersion` | `object` | Error counts keyed by `deployVersion`. |
| `latencyByRoute` | `object` | Per-route latency summary with `count`, `p95`, and `avg`. |
| `feedbackCounts` | `object` | Feedback `total`, `average`, and five-element `ratingCounts` array. |
| `eventBreakdown` | `object` | Counts for `performance`, `errors`, `feedback`, and `clicks`. |
| `featureCounts` | `array` | `{ name, count }` entries derived from click/custom events. |
| `userActivity` | `object` | `{ activeUsers, maxUsers, windowMs }`. |
| `analyticsRanges` | `object` | Range summaries for `24h`, `7d`, and `30d`. |
| `recentErrors` | `Event[]` | Up to 1000 recent error events from the analytics source window. |
| `recentActivity` | `Event[]` | Last 20 events from the analytics source window. |

### Analytics Ranges

| Range | Window | Buckets |
|---|---|---|
| `24h` | 24 hours | 8 |
| `7d` | 7 days | 7 |
| `30d` | 30 days | 5 |

Each range contains:

| Field | Type |
|---|---|
| `windowMs` | `number` |
| `bucketCount` | `number` |
| `uniqueUsers` | `number` |
| `actionCount` | `number` |
| `totalEvents` | `number` |
| `latencyByRoute` | `object` |
| `feedbackCounts` | `object` |
| `eventBreakdown` | `object` |
| `featureCounts` | `array` |
| `userActivitySeries` | `number[]` |
| `actionSeries` | `number[]` |
| `errorSeries` | `number[]` |
| `latencySeries` | `number[]` |

---

## HTTP Endpoints Using This Store

| Endpoint | Store interaction | Notes |
|---|---|---|
| `POST /api/events` | `insertEvents()`, then `pruneOldest()` | Accepts a single event or `{ "events": [...] }`; responds `{ "accepted": count }`. |
| `POST /api/beacon` | `insertEvents()`, then `pruneOldest()` | Same ingestion path as `/api/events`; returns `204`. |
| `GET /api/events` | `listEvents(limit, { userId })` | Requires the current user and only returns that user's events. |
| `GET /api/stats` | `getAnalyticsSnapshot({ userId, ... })` | Requires the current user. |
| `GET /api/developer/stream` | `allEvents(MAX_EVENTS, { userId })` | Applies additional in-process filters. |
| `GET /api/developer/insights` | `allEvents(MAX_EVENTS, { userId })` | Builds developer insight summaries. |
| `POST /api/developer/query` | `allEvents(MAX_EVENTS, { userId })` | Runs developer queries against the user's events. |
| `POST /api/users/sync` | `syncUser()` | Upserts into `app_users`. |

---

## Validation Rules

Prototype 3 ingestion uses `isValidEvent()` from `src/prototype_3/server/server-helpers.js` before calling the event store.

An incoming event passes validation when:

1. It is a non-null object.
2. `type` is a string.

The event store then fills defaults for missing fields during normalization. Type-specific `data` schemas are not enforced by `event-store.js`.

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| v1 | 2026-05-16 | Initial shared schema definition. |
| v1 update | 2026-06-05 | Revised to match Prototype 3 `event-store.js` Supabase and in-memory schemas. |
