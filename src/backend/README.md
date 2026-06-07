# Backend (`src/backend`)

**Status:** Active. This is the live WatchTower server.

The framework-free Node.js HTTP server, data layer, and alerting logic. Started
by `npm start` (which runs `node src/backend/server.js`).

## Files

| File | Purpose |
|---|---|
| `server.js` | HTTP routing, JSON API (`/api/*`), static serving of `src/frontend` and `src/sdk`, SSE stream, Clerk JWT verification. |
| `server-helpers.js` | Pure ingestion/stream/query helpers (unit-tested in `tests/unit`). |
| `event-store.js` | Event + user store. Uses Supabase/Postgres when configured; falls back to in-memory storage otherwise. |
| `mailer.js` | Gmail-OAuth threshold alert emails. |
| `alert-threshold.js` | Error-rate threshold evaluation. |
| `clerk-alert-recipients.js` | Optional Clerk-sourced alert recipient lookup. |

## Notes

- Configuration is read from environment variables — see the root
  [`.env.example`](../../.env.example). Never commit real secrets.
- The frontend it serves lives in [`../frontend`](../frontend); the SDK in
  [`../sdk`](../sdk); shared helpers in [`../shared`](../shared).
- API and event contracts are documented in
  [`docs/architecture/api-contract-v2.md`](../../docs/architecture/api-contract-v2.md)
  and [`docs/architecture/event-schema-v2.md`](../../docs/architecture/event-schema-v2.md).

See [`../README.md`](../README.md) for the full source layout.
