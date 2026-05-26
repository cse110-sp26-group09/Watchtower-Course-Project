# Event Capture Research

**Issue:** #56  
**Owner:** @waleedA13  
**Date:** 2026-05-25  
**Schema reviewed:** `docs/design/event-schema-v1.md`  
**Server reviewed:** `src/prototype_1/server/server-1.1.js`  
**SDK reviewed:** `src/prototype_1/sdk/watchtower.js`

---

## Summary

Every field defined in event-schema-v1 was checked against the SDK and server. All required and optional envelope fields are captured and stored. All per-type `data` payloads are captured correctly for `error`, `pageload`, `click`, `login`, and `custom` events. Two minor gaps exist for `feedback` and `logout` event types. Neither gap blocks functionality.

---

## Envelope Fields

### Required Fields

| Field | Schema Says | SDK Does | Server Does | Verdict |
|---|---|---|---|---|
| `type` | Non-empty string | Set as first arg to `_enqueue()` | Stored in `type` column, validated as non-empty string | Covered |
| `timestamp` | ISO-8601 string | `new Date().toISOString()` | Stored in `timestamp` column, validated with `Date.parse()` | Covered |
| `data` | Non-null object | Set as second arg to `_enqueue()` | Stored as JSON string in `data_json` column, validated as non-null object | Covered |

### Optional Context Fields

| Field | Schema Says | SDK Does | Server Does | Verdict |
|---|---|---|---|---|
| `sessionId` | Stable per-tab ID from `sessionStorage` | Generated via `crypto.getRandomValues` or fallback, persisted in `sessionStorage` | Stored in `session_id` column | Covered |
| `userId` | App-level user ID, null until `setUser()`/`trackLogin()` | Starts as `null`, set by `setUser()` and `trackLogin()` | Stored in `user_id` column | Covered |
| `deployVersion` | Deploy/release label | Taken from config, defaults to `"unknown"` | Stored in `deploy_version` column | Covered |
| `appName` | App name | Taken from config, defaults to `location.hostname` | Stored in `app_name` column | Covered |
| `url` | Full `location.href` | Captured from `location.href` at enqueue time | Stored in `event_url` column | Covered |
| `route` | `location.pathname` | Captured from `location.pathname` at enqueue time | Stored in `route` column | Covered |

### Server-Added Fields

| Field | Schema Says | Server Does | Verdict |
|---|---|---|---|
| `receivedAt` | ISO-8601 ingestion time | Added via `new Date().toISOString()` before insert | Covered |

---

## Per-Type Data Payloads

### `error`

Captured automatically via `window.onerror` and `unhandledrejection`. Also sent manually via `trackError()`.

| Field | Type | SDK Source | Verdict |
|---|---|---|---|
| `message` | string | `event.message`, falls back to `"Unknown error"` | Covered |
| `source` | string | `event.filename`, or `"unhandledrejection"`, or `"manual"` | Covered |
| `line` | number | `event.lineno`, falls back to `0` | Covered |
| `col` | number | `event.colno`, falls back to `0` | Covered |
| `stack` | string | `event.error.stack`, falls back to `""` | Covered |

### `pageload`

Captured automatically on `window.load` using the Navigation Timing API.

| Field | Type | SDK Source | Browser API | Verdict |
|---|---|---|---|---|
| `duration` | number | `Math.round(entry.duration)` | `PerformanceNavigationTiming.duration` | Covered |
| `ttfb` | number | `Math.round(entry.responseStart - entry.requestStart)` | `PerformanceNavigationTiming` | Covered |
| `domContentLoaded` | number | `Math.round(entry.domContentLoadedEventEnd - entry.startTime)` | `PerformanceNavigationTiming` | Covered |
| `loadComplete` | number | `Math.round(entry.loadEventEnd - entry.startTime)` | `PerformanceNavigationTiming` | Covered |
| `transferSize` | number | `entry.transferSize \|\| 0` | `PerformanceNavigationTiming.transferSize` | Covered |

**API note:** `performance.getEntriesByType("navigation")` is the Navigation Timing Level 2 API. Supported in Chrome 57+, Firefox 58+, Safari 15+, Edge 12+. No new APIs are needed.

### `click`

Sent via `trackClick(target, text)`.

| Field | Type | SDK Source | Verdict |
|---|---|---|---|
| `target` | string | Passed by caller, defaults to `""` | Covered |
| `text` | string | Passed by caller, truncated to 100 chars | Covered |

### `login`

Sent via `trackLogin(userId, method)`.

| Field | Type | SDK Source | Verdict |
|---|---|---|---|
| `userId` | string | Passed by caller | Covered |
| `method` | string | Passed by caller, defaults to `"unknown"` | Covered |

### `custom`

Sent via `trackEvent(name, payload)`.

| Field | Type | SDK Source | Verdict |
|---|---|---|---|
| `name` | string | Passed by caller | Covered |
| `payload` | object | Passed by caller, defaults to `{}` | Covered |

---

## Gaps

### Gap 1: `feedback` events arrive as `type: "custom"`

**What the schema says:** There should be a `feedback` event type with `rating` (number, 1-5), `message` (string, max 500 chars), and `category` (string, defaults to `"general"`).

**What actually happens:** The SDK has no `trackFeedback()` method. To send feedback, you call `trackEvent("feedback", {rating: 4, message: "good"})`. But `trackEvent()` wraps everything as `type: "custom"` with the real data nested inside `data.payload`. So the event arrives labeled as a custom event, not a feedback event.

**Impact:** The data still reaches the server, but the server can't identify it as feedback by checking `type === "feedback"`. The dashboard's feedback analytics (rating averages, breakdown counts) rely on `type === "feedback"`, so feedback sent through the SDK this way won't show up in those stats.

**Fix options:**
- Add a `trackFeedback(rating, message, category)` method to the SDK that calls `_enqueue("feedback", {...})` directly
- Or have the server check `data.name === "feedback"` on custom events and reclassify them

### Gap 2: `logout` events arrive as `type: "custom"`

**What the schema says:** `logout` is its own event type with no standardized data fields.

**What actually happens:** Same as feedback. The demo app sends logout via `trackEvent("logout", {userId: ...})`, which arrives as `type: "custom"` instead of `type: "logout"`.

**Impact:** Low. The schema says logout has no required data fields, and the server doesn't do any special processing for logout events. The only effect is that filtering events by `type=logout` returns nothing.

**Fix options:**
- Add a `trackLogout()` method to the SDK
- Or call `_enqueue("logout", {})` directly in app code instead of going through `trackEvent()`

---

## Fields That Cannot Be Captured

None. Every field in the schema can be captured with existing browser APIs. No new APIs or technologies are needed.

---

## Conclusion

The SDK and server cover 100% of the schema's required fields, optional context fields, and per-type data payloads for the core event types (error, pageload, click, login, custom). The two gaps (feedback and logout) are labeling issues, not data-capture issues. Both can be fixed with small SDK changes that don't require new dependencies or APIs.
