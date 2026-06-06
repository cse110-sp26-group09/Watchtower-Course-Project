# Event Storage (Prototype 1, SQLite)

**Applies to:** `src/prototype_1`
**Status:** Accepted (local validation)
**Sprint:** 3
**Related docs:** [Event Schema v1](event-schema-v1.md), [API Contract v1](api-contract-v1.md), [External Test App Plan](external-test-app-plan.md)

---

## Overview

Prototype 1 persists ingested telemetry to a single SQLite file using
[`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3). The goal of
this document is to describe the local end-to-end flow and the exact
verification steps the team uses before promoting the same pattern into
Prototype 3 or wiring an external GitHub Pages test app to a public
WatchTower backend.

---

## Active Files

| Concern | File | Notes |
|---|---|---|
| HTTP entry point | [`src/prototype_1/server/server.js`](../../src/prototype_1/server/server.js) | Run via `npm run start:prototype1`. Default port `3000`. |
| Storage layer | [`src/prototype_1/server/event-store.js`](../../src/prototype_1/server/event-store.js) | Pure helpers + `better-sqlite3` wrapper. Unit tested. |
| Browser SDK | [`src/prototype_1/sdk/watchtower.js`](../../src/prototype_1/sdk/watchtower.js) | Captures `page_view`, errors, performance, clicks. Exposes `sendWatchTowerEvent`. |
| Local demo | [`src/prototype_1/demo/`](../../src/prototype_1/demo/) | Served by the same backend at `/demo`. Has a `Local SQLite verification` panel. |
| Legacy SQLite reference | [`src/prototype_1/server/server-1.1.js`](../../src/prototype_1/server/server-1.1.js) | Earlier SQLite spike. Kept for history; not used by `npm run start:prototype1`. |

---

## Database

| Setting | Value |
|---|---|
| Path | `data/prototype_1/watchtower.sqlite` (relative to repo root) |
| Override | `WATCHTOWER_P1_DB=/abs/path/file.sqlite` |
| Driver | `better-sqlite3` (synchronous, single-process) |
| Journal mode | `WAL` |
| Auto-create | The `data/prototype_1/` directory is created at startup if missing. |
| Git tracking | The `data/` tree is ignored. See `.gitignore`. |

> **Note:** A legacy `src/prototype_1/app.db` file from earlier spikes still
> exists in the repo. The active server does not read or write that file.
> Plan to `git rm --cached src/prototype_1/app.db` once the team agrees the
> spike is no longer needed; the gitignore patterns will keep it from being
> re-added.

---

## Schema

Single `events` table. The columns map directly to the spec event fields,
plus a JSON `metadata` column that stores the full original payload so
the existing dashboard can keep consuming events with no UI changes.

```sql
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  timestamp   TEXT NOT NULL,
  source      TEXT,
  session_id  TEXT,
  page_url    TEXT,
  message     TEXT,
  severity    TEXT,
  app_version TEXT,
  metadata    TEXT,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type         ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_app_version  ON events(app_version);
CREATE INDEX IF NOT EXISTS idx_events_received_at  ON events(received_at);
CREATE INDEX IF NOT EXISTS idx_events_session_id   ON events(session_id);
```

### Field mapping

The frontend SDK speaks camelCase. The backend normalizes inbound events
(camelCase **or** snake_case) into the snake_case columns above. The full
mapping lives in `normalizeForStorage` in `event-store.js`:

| Inbound (any of) | Column |
|---|---|
| `id` (or generated UUID) | `id` |
| `type` | `type` |
| `timestamp` (or server-generated) | `timestamp` |
| `source` / `data.source` | `source` |
| `sessionId` / `session_id` | `session_id` |
| `pageUrl` / `page_url` / `url` / `route` | `page_url` |
| `message` / `data.message` | `message` |
| `severity` (default `"critical"` for `type === "error"`) | `severity` |
| `appVersion` / `app_version` / `deployVersion` | `app_version` |
| `data`, `userId`, `appName`, `url`, `route`, custom `metadata` | JSON in `metadata` |
| (server) `new Date().toISOString()` | `received_at` |

On read, `rowToApiEvent` reconstructs the dashboard-friendly shape and
returns both camelCase fields (`sessionId`, `deployVersion`, `appName`,
`url`, `route`, `data`) and the canonical column-aligned fields
(`session_id`, `page_url`, `app_version`, `severity`).

### Supported event types

The server is permissive about `type`, but the SDK and dashboard recognize:

`page_view`, `error`, `performance`, `interaction`, `feedback`, `custom`,
plus the historic SDK types `pageload`, `click`, `login`, `logout`.

---

## API Endpoints

All endpoints share the prototype 2 contract documented in
[`api-contract-v1.md`](api-contract-v1.md), with one addition.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness + storage probe (new). |
| `POST` | `/api/events` | Ingest one event or `{events: [...]}`. |
| `GET` | `/api/events?type=&version=&limit=` | List recent events with optional filters. |
| `GET` | `/api/stats` | Aggregated dashboard stats. |
| `GET` | `/api/events/stream` | Server-Sent Events broadcast for newly ingested events. |

### `GET /api/health`

```json
{
  "status": "ok",
  "storage": "sqlite",
  "databasePath": "/.../data/prototype_1/watchtower.sqlite",
  "eventCount": 7,
  "knownEventTypes": ["page_view", "error", "performance", "interaction", "feedback", "custom", "pageload", "click", "login", "logout"],
  "timestamp": "2026-05-25T21:29:04.282Z"
}
```

### `GET /api/stats`

In addition to the v1 stats fields, the SQLite-backed implementation adds
`eventsByType` and `averageLatency` for convenience:

```json
{
  "totalEvents": 7,
  "totalErrors": 2,
  "activeUsers": 1,
  "eventsByType": { "error": 2, "page_view": 1, "performance": 4 },
  "errorsByVersion": { "verify": 2 },
  "latencyByRoute": { "/demo": { "count": 4, "p50": 250, "p95": 412, "avg": 286, "points": [...] } },
  "averageLatency": 286,
  "recentErrors": [...],
  "recentActivity": [...],
  "analytics": {
    "breakdownCounts": { "performance": 4, "errors": 2, "feedback": 0, "clicks": 0 },
    "feedbackBreakdown": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    "feedbackTotal": 0,
    "feedbackAverage": 0,
    "customActivityTotal": 1,
    "userSeries": { "labels": ["1","2","3","4","5","6","7"], "values": [...] },
    "activitySeries": { "labels": ["1","2","3","4","5","6","7"], "values": [...] }
  }
}
```

---

## Local Prototype 1 Verification

This is the canonical "did the SQLite flow work" checklist used before
the team adds the WatchTower script to any external page.

### 1. Start the SQLite-backed Prototype 1 backend

```bash
npm run start:prototype1
```

Expected console output:

```
Prototype 1 (SQLite) WatchTower running at http://localhost:3000
  Dashboard : http://localhost:3000/
  Demo app  : http://localhost:3000/demo
  SDK       : http://localhost:3000/sdk/watchtower.js
  Health    : http://localhost:3000/api/health
  Database  : .../data/prototype_1/watchtower.sqlite
```

### 2. Open the local demo

Open <http://localhost:3000/demo> in a browser. The `ShopDemo` page is
served by the same backend, so the SDK can use the relative
`/api/events` endpoint.

Open DevTools and check the **Console** tab. The SDK logs:

```
[ShopDemo] WatchTower SDK initialized. Endpoint: /api/events session: <session-id>
```

A `page_view` event is enqueued automatically and flushes within ~2 s.

### 3. Generate test signals

In the **Local SQLite verification** panel on the demo home view, click:

- **Send Test Event** &rarr; posts a `custom` event tagged `manual-verification`.
- **Trigger Test Error** &rarr; posts an `error` event with severity `critical`.
- **Send Performance Event** &rarr; posts a `performance` event with `duration` and `ttfb`.
- **Send Feedback Event** &rarr; posts a `feedback` event with rating `5`.

The DevTools **Network** tab should show `POST /api/events` with status
`200` and a body of `{"accepted": 1, "rejected": 0, "events": [...]}`.

### 4. Verify through the API

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/events?limit=10
Invoke-RestMethod http://localhost:3000/api/stats
```

Bash / WSL:

```bash
curl http://localhost:3000/api/health
curl 'http://localhost:3000/api/events?limit=10'
curl http://localhost:3000/api/stats
```

Expected: `health.storage === "sqlite"`, `stats.totalEvents` matches the
number of clicks you made, `stats.totalErrors >= 1` after clicking
**Trigger Test Error**, `stats.latencyByRoute["/demo"]` populated after
**Send Performance Event**.

### 5. Verify SQLite directly (optional)

If the `sqlite3` CLI is installed:

```bash
sqlite3 data/prototype_1/watchtower.sqlite \
  "SELECT id, type, timestamp, source, severity, message FROM events ORDER BY received_at DESC LIMIT 10;"
```

If it isn't, the API verification in step 4 is sufficient.

### 6. Run the automated suite (CI parity)

Unit tests cover `event-store.js` end-to-end against an in-memory SQLite
database, no HTTP server needed:

```bash
npm run test:unit
```

The Prototype 1 e2e spec boots its own server on port `3110` against a
temp database and exercises every endpoint:

```bash
npx playwright test tests/e2e/prototype1-sqlite.spec.js
```

---

## Known Limitations

- **Single-process writer.** `better-sqlite3` is synchronous and the
  server uses a single `Database` handle. That is fine for a local demo,
  but two server processes pointed at the same file would still serialize
  through SQLite's WAL.
- **No authentication.** All endpoints are open. Suitable for local
  validation only.
- **Permissive CORS (`*`).** Required so the demo page (and later, an
  external page) can POST without a preflight failing. Tighten before
  any internet-facing deployment.
- **No retention policy beyond `MAX_EVENTS = 10000`.** Oldest rows are
  pruned by `received_at`. There is no automatic time-based deletion.
- **Legacy `src/prototype_1/app.db` is still tracked in git.** The new
  active database is at `data/prototype_1/watchtower.sqlite`. The legacy
  file is not read by any active server file. Once the team agrees, run
  `git rm --cached src/prototype_1/app.db` to untrack it; the new
  ignore patterns prevent accidental re-adds.
- **Default `npm start` is unchanged.** It still launches Prototype 2
  (in-memory). Use `npm run start:prototype1` for the SQLite flow until
  the team formally promotes Prototype 1.

---

## External GitHub Pages Test App Next Step

Once the local Prototype 1 flow is validated:

1. Copy `src/prototype_1/sdk/watchtower.js` (or load it directly from the
   eventual public WatchTower URL) into the external test app.
2. Replace the relative `endpoint: "/api/events"` with the **public**
   WatchTower backend URL. For local exposure during a demo, an
   ngrok / cloudflared tunnel pointed at `http://localhost:3000`
   produces the necessary public URL.
3. The backend already sends `Access-Control-Allow-Origin: *`, but the
   GitHub Pages origin will need to be explicitly listed once we tighten
   CORS.
4. Verify the same flow from the external page using the same checklist
   above (DevTools Network panel and `/api/events` / `/api/stats`).

This work is intentionally **out of scope** for the current local
validation task, and no external repository changes have been made.

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| v1 | 2026-05-25 | Initial document. SQLite event store promoted into `prototype_1/server/server.js` with database at `data/prototype_1/watchtower.sqlite`. |
