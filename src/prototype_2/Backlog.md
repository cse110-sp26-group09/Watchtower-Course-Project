# Prototype 2 Backlog

Work items specific to the prototype 2 candidate. Items are grouped by
area and roughly ordered by priority within each section.

Status legend:
- `[ ]` Open
- `[~]` In progress
- `[x]` Done

Owners are best-guesses based on the Sprint 2 team table; reassign
freely as Sprint 3 starts.

Related docs:
- [Sprint 2 comparison readout](../../docs/sprint/sprint-2-comparison-readout.md)
- [Shared API contract v1](../../docs/architecture/api-contract-v1.md)
- [Shared event schema v1](../../docs/architecture/event-schema-v1.md)
- [Legacy prototype impact check](../../docs/process/legacy-prototype-impact-check.md)

---

## Bugs (Highest Priority)

- [ ] **SDK + dashboard point at the wrong port**
  - `src/prototype_2/sdk.js` posts to `http://localhost:8000/api/events`
    and `src/prototype_2/dashboard.js` consumes `http://localhost:8000/api/stats`
    and `/api/events/stream`. The server actually listens on port 3000
    (`PORT` env var, default 3000), so live ingestion is broken end to
    end when running `npm start`.
  - Fix: read the host/port from a single config point (or default to
    relative `/api/...` paths so the SDK and dashboard inherit the
    page origin).
  - Owner: Jason (SDK) + Alex (dashboard)
  - Acceptance: open the dashboard via `npm start`, trigger a JS error
    on the demo page, see the event appear in `/api/stats.totalErrors`
    within 5 seconds.

- [ ] **Server stores malformed events without validation**
  - `POST /api/events` only checks that the body parses as JSON. The
    documented [event schema v1](../../docs/architecture/event-schema-v1.md)
    requires `type`, `timestamp`, and `data` — none of these are
    enforced today.
  - Fix: call `isValidEvent` from `src/shared/utils/event-utils.js` on
    each incoming event, drop invalid ones, and either skip them
    silently or return them in a `rejected` array in the response.
  - Owner: Backend team (Jason / Woosik)
  - Acceptance: posting `{type: "", timestamp: "nope", data: null}` no
    longer increments `totalEvents`; covered by a unit test.

---

## Backend / Testing

- [x] **Add Jest unit tests for the server**
  - Extracted pure helpers into `server-helpers.js`, added 37 tests in
    `tests/unit/server-helpers.test.js`. 64/64 unit tests passing.
  - Owner: Woosik

- [ ] **Add e2e coverage for SSE stream**
  - Existing Playwright suite only smoke-tests `/api/events`,
    `/api/stats`, and a few view transitions. Open a second tab,
    subscribe to `/api/events/stream`, post an event in the first tab,
    confirm the second tab receives it.
  - Owner: Woosik
  - Acceptance: new test in `tests/e2e/watchtower.spec.js` passes in CI.

- [ ] **Add e2e coverage for filter sidebar**
  - Alerts view filters (status, patch version, security, service) are
    only verified by manual testing per `src/prototype_2/README.md`.
  - Owner: Frontend team + Woosik (QA support)

- [ ] **Retire the `src/prototype_2/utils/event-utils.js` re-export shim**
  - Currently the file only does `module.exports = require("../../shared/utils/event-utils")`.
    Migrate the remaining callers to import the shared module directly,
    then delete the shim and add a deprecation note in the CHANGELOG.
  - Owner: Backend team

- [ ] **Add input length / shape limits to `POST /api/events`**
  - Server currently accepts arbitrarily large payloads. Cap batch size
    (e.g. 100 events per request) and individual `data` size (e.g. 32
    KB) to match the SDK's `FLUSH_INTERVAL` and prevent buffer abuse.
  - Owner: Backend team
  - Acceptance: oversized batch returns `413 Payload Too Large`; unit
    tested.

- [ ] **Add rate-limit / replay protection on `/api/events`**
  - Open CORS, no auth, no rate limit. Acceptable for a prototype but
    should be flagged. Pick a simple token-bucket per session ID for
    Sprint 3 if a hosted deployment is in scope.
  - Owner: Backend team (research first)

---

## Frontend / Dashboard

- [ ] **Wire SSE stream into the live dashboard feeds**
  - `dashboard.js` opens an `EventSource` but ingestion is broken by
    the port bug above. Once the bug is fixed, confirm new events
    actually update the alerts feed, hero stats, and latency chart in
    real time (US-6 acceptance criterion: "new events appear within 5
    seconds of submission").
  - Owner: Alex
  - Acceptance: manual + e2e test from the SSE backlog item.

- [ ] **Persist settings panel choices**
  - Theme, language, alert volume, and notification toggles in the
    settings panel reset on reload. Use the same `sessionStorage` key
    pattern the SDK already uses so we stay framework-free.
  - Owner: Frontend team

- [ ] **Replace seed data with `/api/stats` data on first load**
  - The dashboard renders seed data until the first SSE message
    arrives. Once `/api/stats` is reachable (see port bug), use its
    `recentErrors`, `errorsByVersion`, and `latencyByRoute` to bootstrap
    each view.
  - Owner: Alex

- [ ] **Add an empty-state for each view**
  - With zero events, the Alerts feed currently shows seed rows that
    look like real data. Add a real empty state ("No alerts in the
    last 24 hours") and only show it when both the seed and live
    sources are empty.
  - Owner: Frontend team

---

## Documentation / Process

- [ ] **Write the QA checklist for prototype 2**
  - `src/prototype_2/README.md` lists 25 manually-tested features as a
    table. Convert that into a reusable QA checklist at
    `docs/process/qa-checklist.md` so the team can re-run it before
    every demo.
  - Owner: Woosik

- [ ] **Document the deploy / hosting plan**
  - The MVP requires "a deployed website that explains and
    demonstrates WatchTower" (US-9). No hosting target has been picked
    yet. Evaluate GitHub Pages (static demo only), Render, or Fly.io
    for the Node server, write up the decision as an ADR.
  - Owner: Aditya + Frontend lead

- [ ] **Update CHANGELOG once port bug and validation land**
  - Both are user-visible fixes and belong in `Fixed` under the next
    version bump.
  - Owner: Whoever lands the fix

---

## Sprint 2 → 3 Transition

- [ ] **Archive `src/Prototype1/`**
  - Per [legacy prototype impact check](../../docs/process/legacy-prototype-impact-check.md),
    deletion is safe but deferred for team approval; archiving (move to
    `archive/Prototype1/` or a `prototype-1-snapshot` tag) is the
    recommendation. Decide and execute at Sprint 3 kickoff.
  - Owner: Aditya (decision) + Backend team (execution)

- [ ] **Decide on the prototype 2 → app rename**
  - `src/README.md` already calls out the eventual rename of
    `prototype_2/` to `app/` once Sprint 3 starts. Confirm or defer.
  - Owner: Aditya

---

## Done (recent)

- [x] Move `event-utils.js` to `src/shared/utils/event-utils.js`
- [x] Repoint unit and e2e tests at the shared module and prototype 2 ids
- [x] Refactor server.js — extract pure helpers into `server-helpers.js`
- [x] Add 37 unit tests for server helpers (`tests/unit/server-helpers.test.js`)