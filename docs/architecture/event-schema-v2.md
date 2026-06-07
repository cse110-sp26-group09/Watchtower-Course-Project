# Shared Event Schema v2

**Applies to:** `src/backend` (active WatchTower source)  
**Status:** Accepted  
**Sprint:** 5
**Supersedes:** [event-schema-v1](event-schema-v1.md)
See also: [API Contract v2](api-contract-v2.md)

---

## Overview

Event Schema v2 extends the shared event envelope for Prototype 3. It keeps the
core v1 fields while adding metadata used for authenticated, environment-aware
dashboard filtering and Supabase-backed storage.

---

## Event Envelope

Prototype 3 accepts the v1 event envelope and adds these normalized fields:

| Field | Type | Description |
|---|---|---|
| `user_id` | `string \| null` | Owner or application user associated with the event. May be `null` for anonymous events. |
| `app_name` | `string` | Logical application name that emitted the event. |
| `environment` | `string` | Runtime environment, normalized to values such as `production`, `staging`, `development`, or `preview`. |
| `sdk_version` | `string` | SDK version that emitted the event. Defaults to `sdk-unknown` when unavailable. |
| `event_name` | `string` | Display/query name for the event. Derived from `type` when not provided. |

The browser/API payload may use camelCase names such as `userId`, `appName`,
`sdkVersion`, and `eventName`; the stored Prototype 3 schema uses the snake_case
field names above.

### Example Event

```json
{
  "type": "error",
  "event_name": "error",
  "timestamp": "2026-06-05T18:00:01.234Z",
  "session_id": "session-123",
  "user_id": "user_2abc",
  "deploy_version": "v1.2.0",
  "app_name": "shopdemo",
  "environment": "production",
  "sdk_version": "sdk-unknown",
  "route": "/checkout",
  "data": {
    "message": "Cannot read properties of undefined",
    "source": "checkout.js",
    "line": 42,
    "col": 8
  },
  "received_at": "2026-06-05T18:00:01.300Z"
}
```

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| v1 | 2026-05-16 | Initial schema definition covering both prototypes. |
| v2 | 2026-06-05 | Prototype 3 schema adds `user_id`, `app_name`, `environment`, `sdk_version`, and `event_name`. |
