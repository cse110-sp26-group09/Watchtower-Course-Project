# Testing

This directory contains the WatchTower unit and end-to-end tests for **Prototype 3**.

## What's in Here

```
tests/
├── README.md
├── unit/                                    # Jest tests for src/backend pure modules
│   ├── prototype3-server-helpers.test.js    # Ingestion/stream/query helpers
│   ├── prototype3-event-store.test.js       # Event store normalization & scoping
│   ├── prototype3-alert-threshold.test.js   # Error-rate threshold evaluation
│   ├── prototype3-mailer.test.js            # Alert email composition
│   └── prototype3-clerk-alert-recipients.test.js # Clerk recipient lookup
└── e2e/
    ├── watchtower.spec.js               # Landing, dashboard, demo, API smoke tests
    └── api-events-filters.spec.js       # /api/events and /api/developer/stream filters
```

## Running Tests

### Unit tests (Jest)

```bash
npm run test:unit
```

Runs every `*.test.js` file in `tests/unit/`. No server is required.

### End-to-end tests (Playwright)

End-to-end tests target the Prototype 3 HTTP server (`npm start`). Start it once, then run the tests in a separate terminal:

```bash
# Terminal 1
npm start

# Terminal 2
npm run test:e2e
```

Set `BASE_URL` if the server is not on `http://localhost:3000` (for example, `BASE_URL=http://127.0.0.1:4000 npm run test:e2e`).

CI starts the server in the background before running the suite; see `.github/workflows/ci.yml`.

## What the Unit Tests Verify

`tests/unit/prototype3-server-helpers.test.js` covers the ingestion and developer-stream helpers in `src/backend/server-helpers.js`: event validation, average/percentile math, environment normalization, event-name derivation, incoming-event normalization, stream filter parsing, paginated `queryEventsWithFilters`, recency sorting, and timestamp/clamp utilities.

## What the E2E Tests Verify

`tests/e2e/watchtower.spec.js` runs against the Prototype 3 server and verifies:

- **Landing (`/landing/`)** — title and branding, primary CTA, dashboard demo link.
- **Dashboard (`/dashboard`)** — KPI tiles, sidebar navigation (with a stubbed Clerk session).
- **Analytics / Issues navigation** — sidebar switches activate `#analytics-view` and `#issues-view`.
- **ShopDemo (`/demo/`)** — ShopDemo brand, version picker, and hydrated home view.
- **`GET /api/stats`** — documented JSON shape.
- **`POST /api/events` round-trip** — batch ingest and retrieval via `GET /api/events`.
- **Error events in stats** — errors bump `totalErrors` and appear under `errorsByVersion`.

`tests/e2e/api-events-filters.spec.js` verifies:

- **`GET /api/events`** — `{ events: [...] }` shape and seeded event visibility.
- **`GET /api/developer/stream`** — session and search filters, limit/cursor pagination, and invalid-limit fallback.

## Known Limitations

- E2E tests share a single in-memory event buffer with the running server. Stream tests isolate data with a unique session prefix per run.
- Dashboard UI tests stub Clerk client-side; they do not exercise real Clerk sign-in.
- `tests/integration/` and `tests/performance/` are not yet implemented.

## Continuous Integration

Tests run automatically on pull requests and pushes to `main`. See [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
