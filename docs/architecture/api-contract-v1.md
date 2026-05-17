# API Contract v1

**Applies to:** `src/prototype_1` (Candidate 1), `src/candidate_2` (Candidate 2)  
**Status:** Accepted  
**Sprint:** 2

See also: [Event Schema v1](event-schema-v1.md)

---

## Overview

Both candidates expose the same HTTP API. The server is intentionally framework-free (plain Node.js `http` module). CORS is open (`*`) so the SDK can post from any origin.

**Base URL:** `http://localhost:3000` (configurable via `PORT` env var)

---

## POST /api/events

Ingest one or more events. The SDK sends batches using the `events` array form.

**Request body - single event:**

```json
{
  "type": "click",
  "timestamp": "2026-05-16T18:00:00.000Z",
  "sessionId": "a1b2c3d4-e5f6-4789",
  "data": { "target": "button#submit", "text": "Submit" }
}
```

**Request body - batch:**

```json
{
  "events": [
    { "type": "pageload", "timestamp": "2026-05-16T18:00:00.000Z", "data": { "duration": 312, "ttfb": 45, "domContentLoaded": 210, "loadComplete": 312, "transferSize": 14200 } },
    { "type": "click",    "timestamp": "2026-05-16T18:00:05.000Z", "data": { "target": "a.nav-link", "text": "Dashboard" } }
  ]
}
```

**Response `200 OK`:**

```json
{ "accepted": 2 }
```

**Response `400 Bad Request`** (body is not valid JSON):

```json
{ "error": "Invalid JSON" }
```

**Notes:**
- The server does not validate per-field types beyond JSON parsing; malformed events are stored as-is.
- The in-memory buffer is capped at 10,000 events (oldest events are dropped first).
- Each accepted event has `receivedAt` (ISO-8601) appended before storage.
- Newly ingested events are broadcast to all connected SSE clients immediately.

---

## GET /api/events

Retrieve stored events with optional filtering.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `type` | `string` | Filter to events where `event.type === type`. |
| `version` | `string` | Filter to events where `event.deployVersion === version`. |
| `limit` | `number` | Maximum number of events to return (default: `100`). Returns the most recent `limit` events. |

**Example:**

```
GET /api/events?type=error&limit=50&version=v1.0.0
```

**Response `200 OK`:**

```json
{
  "events": [
    {
      "type": "error",
      "timestamp": "2026-05-16T18:00:01.234Z",
      "sessionId": "a1b2c3d4-e5f6-4789",
      "deployVersion": "v1.0.0",
      "data": { "message": "Cannot read properties of undefined", "source": "app.js", "line": 42, "col": 8, "stack": "..." },
      "receivedAt": "2026-05-16T18:00:01.300Z"
    }
  ]
}
```

---

## GET /api/stats

Return aggregated statistics computed from the in-memory event buffer. Used by the dashboard.

**Response `200 OK`:**

```json
{
  "activeUsers": 3,
  "totalEvents": 142,
  "totalErrors": 7,
  "errorsByVersion": {
    "v1.0.0": 5,
    "v1.1.0": 2
  },
  "latencyByRoute": {
    "/dashboard": {
      "count": 18,
      "p50": 290,
      "p95": 520,
      "avg": 315,
      "points": [
        { "duration": 290, "ttfb": 40, "timestamp": "2026-05-16T17:55:00.000Z" }
      ]
    }
  },
  "recentErrors": [
    {
      "type": "error",
      "timestamp": "2026-05-16T18:00:01.234Z",
      "data": { "message": "Cannot read properties of undefined", "source": "app.js", "line": 42, "col": 8, "stack": "..." }
    }
  ]
}
```

**Response Field Definitions:**

| Field | Type | Description |
|---|---|---|
| `activeUsers` | `number` | Count of distinct `sessionId` values seen in the last 5 minutes. |
| `totalEvents` | `number` | Total events currently in the in-memory buffer. |
| `totalErrors` | `number` | Count of `error`-type events in `recentErrors` (capped at 50). |
| `errorsByVersion` | `object` | Error counts keyed by `deployVersion`. |
| `latencyByRoute` | `object` | Per-route `pageload` latency summary (see below). |
| `recentErrors` | `Event[]` | Up to 50 most recent `error`-type events. |

**`latencyByRoute[route]` Fields:**

| Field | Type | Description |
|---|---|---|
| `count` | `number` | Number of `pageload` events recorded for this route. |
| `p50` | `number` | 50th percentile duration in milliseconds. |
| `p95` | `number` | 95th percentile duration in milliseconds. |
| `avg` | `number` | Average duration in milliseconds (rounded). |
| `points` | `array` | Up to 100 most recent `{duration, ttfb, timestamp}` samples. |

---

## GET /api/events/stream

Server-Sent Events (SSE) stream. The dashboard subscribes to this endpoint to receive newly ingested events in real time without polling.

**Response headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Stream format:** Each broadcast is a standard SSE `data` line followed by a blank line.

```
data: [{"type":"error","timestamp":"2026-05-16T18:00:01.234Z","data":{...},"receivedAt":"..."}]

```

**Notes:**
- The server sends a keep-alive comment (`: \n\n`) immediately on connection.
- Clients are removed from the broadcast set on connection close.
- There is no authentication or rate limiting on this endpoint in either prototype.

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| v1 | 2026-05-16 | Initial API contract covering both prototypes. |
