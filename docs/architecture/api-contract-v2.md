# API Contract v2

**Applies to:** `src/prototype_3`  
**Status:** Accepted  
**Sprint:** 5
**Supersedes:** [API Contract v1](api-contract-v1.md)

See also:
- [Event Schema v1](event-schema-v1.md)
- [Authentication Workflow](auth-workflow.md)
- [System Overview](system-overview.md)
- [ADR-0004: Navigation Timing API](../adr/ADR-0004.md)
- [ADR-0005: Beacon API](../adr/ADR-0005.md)
- [ADR-0006: Clerk](../adr/ADR-0006.md)
- [ADR-0008: Supabase](../adr/ADR-0008.md)
- [ADR-0009: Render](../adr/ADR-0009.md)

---

## Overview

API Contract v2 documents the current Prototype 3 HTTP surface. It keeps the
v1 telemetry ingestion shape, then adds the newer APIs required by the current
architecture:

- **Navigation Timing API** telemetry from the browser SDK.
- **Beacon API** delivery through `POST /api/beacon`.
- **Clerk** dashboard authentication and user scoping.
- **Supabase PostgreSQL** persistence through the server event store.
- **Render** hosted deployment support.

**Local Base URL:** `http://localhost:3000`  
**Hosted Base URL:** `https://watchtower-course-project-g8dv.onrender.com`

All JSON endpoints send CORS headers. Ingestion remains open for SDK traffic.
Dashboard read routes require the current Clerk user.

---

## Authentication Model

There are two separate auth concerns:

| Concern | Current API behavior |
|---|---|
| Dashboard user auth | Clerk session. Protected read routes require a current user. |
| SDK event ingestion auth | Not implemented yet. `POST /api/events`, `POST /api/beacon`, and `GET /api/events/stream` remain open. |

Protected routes resolve the user in this order:

1. `Authorization: Bearer <Clerk session JWT>` verified against Clerk JWKS.
2. `X-Clerk-User-Id: <clerk_user_id>` only when token verification is not
   configured or `WATCHTOWER_TRUST_USER_HEADER=true`.

If a protected route cannot resolve a user, it returns `401 Unauthorized`.

---

## Event Envelope

The server accepts the v1 event envelope and the newer Prototype 3 fields.

```json
{
  "type": "error",
  "eventName": "error",
  "timestamp": "2026-06-05T18:00:01.234Z",
  "sessionId": "session-123",
  "userId": "user_2abc",
  "deployVersion": "v1.2.0",
  "appName": "shopdemo",
  "environment": "production",
  "sdkVersion": "sdk-unknown",
  "route": "/checkout",
  "data": {
    "message": "Cannot read properties of undefined",
    "source": "checkout.js",
    "line": 42,
    "col": 8
  }
}
```

Server normalization fills missing values:

| Field | Default / behavior |
|---|---|
| `type` | Required for a meaningful event; defaults to `custom` in normalization paths. |
| `eventName` | Derived from `type` when absent. |
| `timestamp` | Current server time when absent. |
| `sessionId` | `unknown-session` when absent. |
| `userId` | Authenticated ingest owner, `DEFAULT_INGEST_OWNER_USER_ID`, payload `userId`, or `null`. |
| `deployVersion` | `unknown` when absent. |
| `appName` | `shopdemo` when absent. |
| `environment` | Normalized to `production`, `staging`, `development`, or `preview`. |
| `sdkVersion` | `sdk-unknown` when absent. |
| `route` | `/` when absent. |
| `data` | Empty object when absent or invalid. |
| `receivedAt` | Server-generated ISO timestamp. |

---

## POST /api/events

Ingest one event or a batch of events. This is the primary SDK endpoint.

**Auth:** Open. If a Clerk user is present, the server stamps events with that
user. Otherwise it uses `DEFAULT_INGEST_OWNER_USER_ID` when configured, then
falls back to anonymous storage.

**Request body - single event:**

```json
{
  "type": "custom",
  "timestamp": "2026-06-05T18:00:00.000Z",
  "sessionId": "session-123",
  "route": "/demo",
  "data": { "name": "manual-verification" }
}
```

**Request body - batch:**

```json
{
  "events": [
    {
      "type": "pageload",
      "timestamp": "2026-06-05T18:00:00.000Z",
      "sessionId": "session-123",
      "route": "/checkout",
      "data": { "duration": 640, "ttfb": 45, "transferSize": 51200 }
    },
    {
      "type": "error",
      "timestamp": "2026-06-05T18:00:05.000Z",
      "sessionId": "session-123",
      "route": "/checkout",
      "data": { "message": "boom", "source": "checkout.js" }
    }
  ]
}
```

**Response `200 OK`:**

```json
{ "accepted": 2 }
```

**Response `500 Internal Server Error`:**

```json
{ "error": "Failed to store events" }
```

Accepted events are persisted through Supabase when configured, broadcast to
SSE clients, and included in dashboard stats for their resolved owner.

---

## POST /api/beacon

Ingest events sent with the browser Beacon API. This endpoint supports unload
and session-finalization telemetry where callers do not inspect a JSON response.

**Auth:** Open. Ownership resolution matches `POST /api/events`.

**Request body:** same as `POST /api/events`.

**Response `204 No Content`:**

No response body is returned, including for malformed or ignored payloads.

---

## GET /api/events

Return the most recent events for the authenticated dashboard user.

**Auth:** Required.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `limit` | `number` | Maximum events to return. Defaults to `100`; clamped between `1` and the server maximum. |

**Response `200 OK`:**

```json
{
  "events": [
    {
      "type": "error",
      "eventName": "error",
      "timestamp": "2026-06-05T18:00:01.234Z",
      "sessionId": "session-123",
      "userId": "user_2abc",
      "deployVersion": "v1.2.0",
      "appName": "shopdemo",
      "environment": "production",
      "sdkVersion": "sdk-unknown",
      "route": "/checkout",
      "data": { "message": "boom", "source": "checkout.js" },
      "receivedAt": "2026-06-05T18:00:01.300Z"
    }
  ]
}
```

**Response `401 Unauthorized`:**

```json
{ "error": "Unauthorized" }
```

---

## GET /api/stats

Return dashboard aggregates for the authenticated dashboard user.

**Auth:** Required.

**Response `200 OK`:**

```json
{
  "activeUsers": 3,
  "totalEvents": 142,
  "totalErrors": 7,
  "eventsByType": { "error": 7, "pageload": 80, "custom": 12 },
  "errorsByVersion": { "v1.2.0": 5, "v1.2.1": 2 },
  "latencyByRoute": {
    "/checkout": {
      "count": 18,
      "p50": 290,
      "p95": 520,
      "avg": 315,
      "points": [
        { "duration": 290, "ttfb": 40, "timestamp": "2026-06-05T17:55:00.000Z" }
      ]
    }
  },
  "averageLatency": 315,
  "recentErrors": [],
  "recentActivity": [],
  "analytics": {
    "breakdownCounts": { "performance": 80, "errors": 7, "feedback": 4, "clicks": 21 },
    "feedbackBreakdown": { "1": 0, "2": 0, "3": 1, "4": 1, "5": 2 },
    "feedbackTotal": 4,
    "feedbackAverage": 4.25,
    "customActivityTotal": 12,
    "userSeries": { "labels": ["1", "2", "3"], "values": [1, 2, 3] },
    "activitySeries": { "labels": ["1", "2", "3"], "values": [5, 8, 13] }
  }
}
```

---

## GET /api/events/stream

Server-Sent Events stream for newly ingested events.

**Auth:** Open.

**Response headers:**

```text
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Stream format:**

```text
data: [{"type":"error","timestamp":"2026-06-05T18:00:01.234Z","data":{}}]
```

The server sends an initial keep-alive comment and removes clients on close.

---

## POST /api/users/sync

Create or update the current application user in Supabase `app_users`.

**Auth:** Current user is preferred from a verified Clerk token or trusted
header. The body `clerkUserId` is accepted as a fallback in prototype/test
environments.

**Request body:**

```json
{
  "clerkUserId": "user_2abc",
  "email": "dev@example.com",
  "displayName": "Dev User",
  "timezone": "America/Los_Angeles"
}
```

**Response `200 OK`:**

```json
{
  "ok": true,
  "user": {
    "clerkUserId": "user_2abc",
    "email": "dev@example.com",
    "displayName": "Dev User",
    "timezone": "America/Los_Angeles"
  }
}
```

**Response `400 Bad Request`:**

```json
{ "error": "clerkUserId is required" }
```

---

## GET /api/developer/stream

Return a filtered, paginated event inspector feed for the authenticated user.

**Auth:** Required.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `eventName` | `string` | Case-insensitive event-name contains filter. |
| `user` | `string` | Case-insensitive user id contains filter. |
| `session` | `string` | Case-insensitive session id contains filter. |
| `environment` | `string` | Exact environment filter. |
| `sdkVersion` | `string` | Case-insensitive SDK version contains filter. |
| `search` | `string` | Case-insensitive full-text search over type, user, session, route, and data. |
| `dateFrom` | ISO date | Lower timestamp bound. |
| `dateTo` | ISO date | Upper timestamp bound. |
| `limit` | `number` | Page size. Defaults to `80`; max `500`. |
| `cursor` | `number` | Zero-based offset cursor. Defaults to `0`. |

**Response `200 OK`:**

```json
{
  "total": 5,
  "cursor": 0,
  "nextCursor": 2,
  "events": [
    {
      "id": "2026-06-05T18:00:01.234Z|session-123|error|/checkout",
      "type": "error",
      "eventName": "error",
      "userId": "user_2abc",
      "sessionId": "session-123",
      "environment": "production",
      "sdkVersion": "sdk-unknown",
      "deployVersion": "v1.2.0",
      "route": "/checkout",
      "timestamp": "2026-06-05T18:00:01.234Z",
      "receivedAt": "2026-06-05T18:00:01.300Z",
      "ingestionLatencyMs": 66,
      "data": { "message": "boom" },
      "raw": {}
    }
  ]
}
```

---

## GET /api/developer/insights

Return derived developer diagnostics for the authenticated user's event history.

**Auth:** Required.

**Response `200 OK`:**

The response is a JSON object with performance, error, and activity summaries.
The exact object is derived server-side from recent events. Current e2e coverage
requires Navigation Timing metrics such as:

```json
{
  "performance": {
    "ttfb": { "sampleCount": 1 },
    "navigationFetchStartToResponse": { "sampleCount": 1 },
    "resourceCount": { "sampleCount": 1 }
  }
}
```

---

## POST /api/developer/query

Execute a saved developer query against the authenticated user's recent events.

**Auth:** Required.

**Request body:**

```json
{ "query": "SELECT type, route, count(*) FROM events WHERE type = 'error' GROUP BY route" }
```

**Response `200 OK`:**

```json
{
  "error": null,
  "durationMs": 3,
  "rowCount": 1,
  "columns": ["type", "route", "count"],
  "rows": [
    { "type": "error", "route": "/checkout", "count": 4 }
  ]
}
```

Supported syntax:

```text
SELECT field, count(*) FROM events [WHERE field = 'value'] [GROUP BY field] [ORDER BY field] [LIMIT n]
```

---

## POST /api/developer/feature-flags/evaluate

Evaluate feature flags for an identity payload. This route is used by the
Prototype 3 dashboard.

**Auth:** Not required by the current server route.

**Request body:**

```json
{
  "userId": "user_2abc",
  "email": "dev@example.com",
  "environment": "production"
}
```

**Response `200 OK`:**

```json
{
  "userId": "user_2abc",
  "environment": "production",
  "flags": {}
}
```

---

## POST /api/alert-recipient

Register the email address that receives prototype alert emails.

**Auth:** Not required by the current server route.

**Request body:**

```json
{ "email": "dev@example.com" }
```

**Response `200 OK`:**

```json
{ "ok": true }
```

**Response `400 Bad Request`:**

```json
{ "error": "Valid email is required" }
```

## Error Responses

Common errors:

| Status | Example | Meaning |
|---|---|---|
| `400` | `{ "error": "clerkUserId is required" }` | Required field missing. |
| `401` | `{ "error": "Unauthorized" }` | Protected route without a current user. |
| `404` | `{ "error": "Not found" }` | Unknown API path. |
| `500` | `{ "error": "Failed to fetch events" }` | Server/store failure. |

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| v2 | 2026-06-05 | Current Prototype 3 API contract using Clerk-scoped dashboard reads, Supabase-backed event storage, Beacon API ingestion, developer routes, and Render deployment. |
| v1 | 2026-05-16 | Initial prototype contract for open in-memory event ingestion and dashboard stats. |
