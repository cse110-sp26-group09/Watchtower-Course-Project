# End-to-End Tests (`tests/e2e`)

**Status:** Active. Playwright tests that exercise a running WatchTower server.

Start the server first, then run the suite:

```bash
# Terminal 1
npm start
# Terminal 2
npm run test:e2e
```

Set `BASE_URL` to target a non-default host (default `http://localhost:3000`).
CI starts the server automatically before running these — see
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

| File | Covers |
|---|---|
| `watchtower.spec.js` | Landing (`/landing/`), dashboard (`/dashboard`, stubbed Clerk), ShopDemo (`/demo/`), and `GET/POST /api/*` smoke tests. |
| `api-events-filters.spec.js` | `GET /api/events` shape and `GET /api/developer/stream` session/search/limit/cursor filters. |

> Dashboard tests stub Clerk client-side; they do not exercise real sign-in. API
> specs authenticate as a single synthetic user via the `X-Clerk-User-Id` header.

See [`../README.md`](../README.md) for the full testing overview.
