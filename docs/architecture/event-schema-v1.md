# Shared Event Schema v1

**Applies to:** `src/prototype_1`, `src/prototype_2`  
**Status:** Accepted  
**Sprint:** 2

See also: [API Contract v1](api-contract-v1.md)

---

## Overview

This document defines the canonical event schema shared by both WatchTower prototypes. All SDK clients, servers, and dashboards must conform to this schema so that either candidate's backend can serve either candidate's frontend without modification.

---

## Event Envelope

Every event - regardless of type - uses the same outer envelope. The three required fields are set by the SDK before the event is queued; optional context fields are populated from SDK configuration; `receivedAt` is added server-side on ingestion.

### Required Fields

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Event type (see [Event Types](#event-types)). Must be a non-empty string. |
| `timestamp` | `string` | ISO-8601 client-side creation time (e.g. `"2026-05-16T18:00:00.000Z"`). |
| `data` | `object` | Type-specific payload (see per-type schemas below). Must be an object, never `null`. |

### Optional Context Fields

These fields are set by the SDK from its configuration and are present on every real event sent from a browser, but are not enforced by the server validator.

| Field | Type | Description |
|---|---|---|
| `sessionId` | `string` | Stable per-tab identifier stored in `sessionStorage`. Used for active-user counting. |
| `userId` | `string \| null` | Application-level user identifier. `null` until `setUser()` or `trackLogin()` is called. |
| `deployVersion` | `string` | Deploy/release label (e.g. `"v1.2.3"`). Defaults to `"unknown"`. |
| `appName` | `string` | Logical application name. Defaults to `location.hostname`. |
| `url` | `string` | Full `location.href` at the time the event was created. |
| `route` | `string` | `location.pathname` at the time the event was created. |

### Server-Added Fields

| Field | Type | Description |
|---|---|---|
| `receivedAt` | `string` | ISO-8601 server ingestion time, added by the server before the event is stored. |

### Minimal Valid Event (Example)

```json
{
  "type": "click",
  "timestamp": "2026-05-16T18:00:00.000Z",
  "data": { "target": "button#submit", "text": "Submit" }
}
```

### Full SDK-Emitted Event (Example)

```json
{
  "type": "error",
  "timestamp": "2026-05-16T18:00:01.234Z",
  "sessionId": "a1b2c3d4-e5f6-4789",
  "userId": "user_42",
  "deployVersion": "v1.0.0",
  "appName": "my-app.example.com",
  "url": "https://my-app.example.com/dashboard",
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

## Event Types

The server accepts any non-empty `type` string, but the dashboard only renders the following built-in types. New types can be added to the SDK without a coordinated server deploy.

### `error`

Captured automatically via `window.onerror` / `unhandledrejection`, or sent manually via `WatchTower.trackError(error)`.

| Field | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | `"Unknown error"` | Human-readable error message. |
| `source` | `string` | `""` | Originating script filename or label (`"manual"` for manually tracked errors, `"unhandledrejection"` for promise rejections). |
| `line` | `number` | `0` | Line number where the error occurred. |
| `col` | `number` | `0` | Column number where the error occurred. |
| `stack` | `string` | `""` | Stack trace string, if available. |

### `pageload`

Captured automatically on `window.load` using the Navigation Timing API (`PerformanceNavigationTiming`).

| Field | Type | Description |
|---|---|---|
| `duration` | `number` | Total navigation duration in milliseconds (rounded). |
| `ttfb` | `number` | Time to first byte in milliseconds (`responseStart - requestStart`, rounded). |
| `domContentLoaded` | `number` | Time until `DOMContentLoaded` event fired in milliseconds. |
| `loadComplete` | `number` | Time until `load` event fired in milliseconds. |
| `transferSize` | `number` | Transfer size of the main document in bytes. `0` if unavailable. |

### `click`

Sent via `WatchTower.trackClick(target, text)`.

| Field | Type | Description |
|---|---|---|
| `target` | `string` | Description of the clicked element (e.g. CSS-like selector `"button#submit"`). |
| `text` | `string` | Visible text on the element, truncated to 100 characters. |

### `login`

Sent via `WatchTower.trackLogin(userId, method)`. Also sets `userId` on the SDK instance for all subsequent events.

| Field | Type | Default | Description |
|---|---|---|---|
| `userId` | `string` | (required) | The user's application-level identifier. |
| `method` | `string` | `"unknown"` | Authentication method label (e.g. `"google"`, `"email"`). |

### `logout`

Sent via `WatchTower.trackEvent("logout", payload)` or custom integration. No standardized `data` fields; use `data: {}` or include app-specific context.

### `feedback`

Sent via `WatchTower.trackEvent("feedback", feedbackData)` or direct server POST. The server normalizes this type before storage.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `rating` | `number \| null` | Integer, clamped to `[1, 5]`. `null` if omitted or non-finite. | User satisfaction rating. |
| `message` | `string` | Trimmed, max 500 characters. | Free-form feedback text. |
| `category` | `string` | Defaults to `"general"` if absent. | Optional grouping label. |

### `custom`

Sent via `WatchTower.trackEvent(name, payload)`.

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Short event name (e.g. `"add-to-cart"`, `"tutorial-complete"`). |
| `payload` | `object` | Arbitrary JSON-serializable details. Defaults to `{}`. |

---

## Validation Rules

The `isValidEvent` utility (in `src/prototype_2/utils/event-utils.js`) enforces the minimum envelope check used in tests. The server itself stores events without re-validating them.

An event **passes** validation when:
1. It is a non-null object.
2. `type` is a non-empty string.
3. `timestamp` is a non-empty string that parses as a finite date (`Date.parse` returns a finite number).
4. `data` is a non-null, non-undefined object.

An event **fails** if any of the above is violated.

---

## SDK Batching Behavior

The SDK queues events locally and flushes in batches every 2 seconds (`FLUSH_INTERVAL = 2000 ms`). It also flushes immediately when `document.visibilityState` changes to `"hidden"` (tab switch or close). Failed batches are re-prepended to the queue for retry on the next flush cycle. Each flush sends at most 50 events.

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| v1 | 2026-05-16 | Initial schema definition covering both prototypes. |
