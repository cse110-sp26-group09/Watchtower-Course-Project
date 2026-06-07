# Unit Tests (`tests/unit`)

**Status:** Active. Jest unit tests for the pure `src/backend` modules. No server
or network is required.

Run with:

```bash
npm run test:unit
```

| File | Covers |
|---|---|
| `prototype3-server-helpers.test.js` | Ingestion/stream/query helpers in `src/backend/server-helpers.js`. |
| `prototype3-event-store.test.js` | Event store normalization and per-user scoping. |
| `prototype3-alert-threshold.test.js` | Error-rate threshold evaluation. |
| `prototype3-mailer.test.js` | Alert email composition. |
| `prototype3-clerk-alert-recipients.test.js` | Clerk alert-recipient lookup. |

> File names keep the `prototype3-` prefix for git history continuity; they test
> the active `src/backend` modules.

See [`../README.md`](../README.md) for the full testing overview.
