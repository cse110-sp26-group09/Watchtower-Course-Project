# Testing

This directory contains the WatchTower unit and end-to-end tests, along with notes on what they verify.

## What's in Here

```
tests/
├── README.md
├── unit/
│   └── event-utils.test.js   # Jest tests for shared event utilities
└── e2e/
    └── watchtower.spec.js    # Playwright smoke tests for the dashboard, demo, and API
```

## Running Tests

### Unit tests (Jest)

```bash
npm run test:unit
```

Runs every `*.test.js` file in `tests/unit/`. No server is required.

### End-to-end tests (Playwright)

End-to-end tests target the prototype 2 HTTP server. Start it once, then run the tests in a separate terminal:

```bash
# Terminal 1
npm start

# Terminal 2
npm run test:e2e
```

Set `BASE_URL` if the server is not on `http://localhost:3000` (for example, `BASE_URL=http://127.0.0.1:4000 npm run test:e2e`).

CI starts the server in the background before running the suite; see `.github/workflows/ci.yml`.

## What the Unit Tests Verify

`tests/unit/event-utils.test.js` imports from the canonical shared module at `src/shared/utils/event-utils.js` and covers:

- `createBaseEvent` — envelope contains `type`, ISO `timestamp`, and an object `data`; defaults `type` to `"custom"`; coerces non-object data to `{}`; always produces an event that `isValidEvent` accepts.
- `isValidEvent` — accepts well-formed envelopes; rejects missing/empty type, invalid timestamps, non-object data, primitives, `null`, and `undefined`.
- `normalizeErrorEvent` — fills safe defaults, preserves provided fields, produces a valid envelope, and handles non-object input without throwing.
- `normalizeFeedbackEvent` — clamps rating to 1–5, returns `null` for non-finite rating, trims and caps message length, defaults category to `"general"`, and produces a valid envelope.
- `calculateAverage` — arithmetic mean of finite values, ignores non-finite, returns `0` for empty/invalid input.
- `calculatePercentile` — nearest-rank percentile, clamps percentile to 0–100, returns `0` for empty/non-numeric input, and accepts unsorted input without mutating it.
- `KNOWN_EVENT_TYPES` — contains the core types (`error`, `pageload`, `click`, `login`, `feedback`) and is frozen so callers cannot mutate it.

These are real assertions against real behavior; they should not pass if the utility is broken.

## What the E2E Tests Verify

`tests/e2e/watchtower.spec.js` runs against the prototype 2 server and verifies:

- **Dashboard home (`/`)** — page title contains "WatchTower", the home heading and hero stat cards (`#stat-active-users`, `#stat-errors`, `#stat-latency`, `#stat-uptime`) are visible, the sidebar nav (`#nav-home`, `#nav-analytics`, `#nav-alerts`) is visible, and the analytics / alerts containers are attached to the DOM.
- **Dashboard navigation** — clicking `#nav-analytics` activates the analytics view and shows the latency canvas and volume chart; clicking `#nav-alerts` activates the alerts view and shows the alerts feed and search input.
- **Hosted ShopDemo (`/demo`)** — the page title contains "ShopDemo" or "WatchTower", `nav .brand` shows "ShopDemo", `#app` is attached, the version picker (`#version-select`) is visible, and the static nav links render. (The server's `/demo` alias does not currently serve the page's relative `app.js`; the next test exercises the working route.)
- **Hosted ShopDemo direct route (`/hosted_demo/index.html`)** — when opened at its real path, the SPA hydrates and the home view shows "Welcome to ShopDemo".
- **`GET /api/stats`** — returns JSON with `activeUsers`, `totalEvents`, `totalErrors`, `errorsByVersion`, `latencyByRoute`, and `recentErrors`.
- **`POST /api/events` round-trip** — accepts a batch, returns `{ accepted: N }`, and the event then appears in `GET /api/events?type=custom`.
- **Error events surface in stats** — posting an `error` event with a `deployVersion` bumps `totalErrors` and shows up under `errorsByVersion` in `/api/stats`.

These selectors target the current `src/prototype_2/` UI. The legacy ids (`#active-users`, `#total-events`, `#total-errors`, `#error-feed`, `#activity-feed`) came from the older `src/Prototype1/dashboard/` snapshot, which is no longer served by `npm start`; see [`docs/process/legacy-prototype-impact-check.md`](../docs/process/legacy-prototype-impact-check.md).

## Known Limitations

- E2E tests share a single in-memory event buffer with the running server, so total counts shift between runs. The assertions are written as `greaterThan(0)` / `toHaveProperty` so they tolerate this.
- `tests/integration/` and `tests/performance/` are not yet implemented. They are listed in the strategy section below as future work and not as something CI currently runs.

## Testing Strategy

### Unit Tests

- Test SDK functions and event utilities in isolation
- Validate error capture, validation, and normalization logic
- Test small helpers (averages, percentiles) used by the dashboard

### Integration Tests *(future)*

- Test SDK → API communication end-to-end
- Validate event storage and retrieval round-trips
- Verify error categorization across the schema

### End-to-End Tests

- Smoke-test that the dashboard loads and shows the right top-level UI
- Smoke-test the API contract (`/api/events`, `/api/stats`)
- Verify the hosted ShopDemo renders

### Performance Tests *(future)*

- SDK overhead on the client
- API response times
- Dashboard rendering performance

## Writing Tests

### Best Practices

- **Clear names** – Describe what is being tested
- **Arrange-Act-Assert** – Use AAA pattern for test structure
- **One concept per test** – Keep tests focused
- **Mock external dependencies** – Isolate what you're testing
- **Test behavior, not implementation** – Focus on outcomes, not how it's done

### Example Unit Test

```javascript
const { createBaseEvent, isValidEvent } = require("../../src/shared/utils/event-utils");

describe("createBaseEvent", () => {
  test("produces an envelope that passes isValidEvent", () => {
    const event = createBaseEvent("click", { target: "BUTTON" });
    expect(isValidEvent(event)).toBe(true);
  });
});
```

## Continuous Integration

Tests run automatically on:

- Every pull request
- Pushes to the `main` branch

See [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) for the full pipeline (repository structure checks, HTML / CSS / JS lint, unit tests, e2e tests, JSDoc generation, and `npm audit`).

## Related Documentation

- [Development Workflow](../docs/process/workflow.md)
- [Legacy Prototype Impact Check](../docs/process/legacy-prototype-impact-check.md)
- [Sprint 2 Prototype Comparison](../docs/sprint/sprint-2-comparison-readout.md)
- [Project Overview](../README.md)
