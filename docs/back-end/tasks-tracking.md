# Backend Requirements Tracking — Prototype 2

Maps each requirement in [`docs/product/requirements.md`](../product/requirements.md)
to the backend work it implies, the current state of `src/prototype_2`,
and who should own the remaining work. Use this when planning Sprint 3.

Status legend:
- **Done** — implemented and (where applicable) covered by tests
- **Partial** — some of it exists; gap noted
- **Missing** — not started
- **Out of scope** — not realistic for a course prototype; tracked as "future"

Ownership reflects the Sprint 2 team table; reassign freely.

Related:
- [Prototype 2 backlog](../../src/prototype_2/Backlog.md)
- [API contract v1](../architecture/api-contract-v1.md)
- [Event schema v1](../architecture/event-schema-v1.md)

---

## Functional Requirements

### F1 — Error Event Capture
**Backend role:** Accept and store error events with the required fields.
**Status:** Partial.
- `POST /api/events` accepts error events; `normalizeErrorEvent` fills
  `message`, `source`, `line`, `col`, `stack`.
- **Gap:** the requirement also lists `severity level` and `service name`,
  which are not in the current event schema.
- **Gap:** the server stores events without validating them (see Bug #2).

**Tasks**
- [ ] Add `severity` and `service` fields to the error schema and SDK. — Owner: Jason / Backend
- [ ] Validate incoming events with `isValidEvent` before storing. — Owner: Woosik
- [ ] Unit + e2e test: a submitted error event is stored and retrievable. — Owner: Woosik

### F2 — Performance Metric Capture
**Backend role:** Accept and store performance events.
**Status:** Partial.
- `pageload` events carry `duration`, `ttfb`, `domContentLoaded`,
  `loadComplete`, `transferSize`.
- **Gap:** requirement lists `CPU utilization` and `memory usage`, which a
  browser SDK cannot capture. These would need server-side metrics or are
  out of scope for a browser-only prototype.

**Tasks**
- [ ] Decide scope: keep browser perf metrics only, or mark CPU/memory as future. — Owner: Backend lead
- [ ] Unit test: performance event is stored and surfaces in `/api/stats.latencyByRoute`. — Owner: Woosik

### F3 — User Feedback Capture
**Backend role:** Accept and store 1–5 ratings and free-text feedback.
**Status:** Partial.
- `normalizeFeedbackEvent` clamps rating to 1–5, trims/caps message at 500
  chars, defaults category to `"general"`.
- **Gap:** confirm the SDK / a UI widget actually emits `feedback` events
  end to end; verify the server path stores them.

**Tasks**
- [ ] Verify feedback flows from a UI widget → SDK → server. — Owner: Frontend + Jason
- [ ] Unit test: feedback rating clamping and message cap (partly covered by event-utils tests). — Owner: Woosik

### F4 — Event Dashboard
**Backend role:** Provide the aggregated data the dashboard renders.
**Status:** Done (backend side).
- `GET /api/stats` returns `recentErrors`, `errorsByVersion`,
  `latencyByRoute` (count, p50, p95, avg), `activeUsers`, `totalEvents`,
  `totalErrors`.
- Aggregation logic is now covered by `tests/unit/server-helpers.test.js`.

**Tasks**
- [x] Unit-test the stats aggregation. — Owner: Woosik

### F5 — Real-Time Visibility (< 5 seconds)
**Backend role:** Push new events to dashboards in real time.
**Status:** Partial / blocked.
- `GET /api/events/stream` (SSE) broadcasts new events on ingest.
- **Blocked by Bug #1:** SDK and dashboard use port 8000 while the server
  listens on 3000, so live events never flow.

**Tasks**
- [ ] Fix the port mismatch (Bug #1). — Owner: Jason + Alex
- [ ] e2e test: post an event, confirm a subscribed client receives it within 5s. — Owner: Woosik

### F6 — Build and Deployment Correlation
**Backend role:** Store and group events by build metadata.
**Status:** Partial.
- Events carry `deployVersion`; `/api/stats.errorsByVersion` groups by it.
- **Gap:** requirement lists Build ID, Commit SHA, Branch, Environment, and
  Deployment timestamp — none of these exist yet.

**Tasks**
- [ ] Extend the event schema with build metadata fields. — Owner: Jason / Backend
- [ ] Allow `/api/stats` and `/api/events` to group/filter by build ID. — Owner: Backend
- [ ] Unit test the new grouping. — Owner: Woosik

### F7 — Alerting on Critical Conditions
**Backend role:** Evaluate thresholds and generate alerts.
**Status:** Missing (planned as US-13, Sprint 2+).
- The Alerts view currently renders seed/static alert rows; there is no
  server-side threshold evaluation.

**Tasks**
- [ ] Define threshold rules (error rate, latency, avg rating). — Owner: Backend
- [ ] Implement server-side evaluation + an alerts endpoint or SSE channel. — Owner: Backend
- [ ] Unit test threshold logic. — Owner: Woosik

### F8 — Data Filtering and Export
**Backend role:** Filter stored events and export them.
**Status:** Partial.
- `GET /api/events` filters by `type`, `version`, and `limit`
  (`filterEvents`, covered by 9 unit tests).
- **Gap:** no `time range` or `service`/`environment` filter; no CSV/JSON
  export.

**Tasks**
- [ ] Add time-range and service/environment filters to `GET /api/events`. — Owner: Backend
- [ ] Add a CSV/JSON export endpoint. — Owner: Backend
- [ ] Unit + e2e test the new filters and export. — Owner: Woosik

---

## Non-Functional Requirements

### NF1 — Availability (99.9% uptime)
**Status:** Out of scope (deployment/ops concern, not prototype code).
Track as future if a hosted deployment is added.

### NF2 — Event Durability (99.99% persisted)
**Backend role:** Persist events reliably.
**Status:** Partial / prototype-limited.
- Events live in an in-memory array capped at 10,000 (covered by
  `appendWithCap` tests). Everything is lost on restart.
- **Gap:** real durability needs a file or DB store — likely future scope.

**Tasks**
- [ ] Decide whether to add simple file persistence (JSON append) for the demo. — Owner: Backend lead

### NF3 — API Responsiveness (< 200 ms p95)
**Backend role:** Keep ingestion + query endpoints fast.
**Status:** Likely met; unproven.

**Tasks**
- [ ] Write a small benchmark for `POST /api/events` and `/api/stats`. — Owner: Woosik

### NF4 — Dashboard Responsiveness (< 2 s)
**Status:** Mostly frontend; backend keeps `/api/stats` cheap. No action
needed at prototype scale.

### NF5 — Scalability (10k events/sec, horizontal)
**Status:** Out of scope for a course prototype. Mark as future.

### NF6 — Fault Tolerance (auto-retry, < 0.01% loss)
**Backend role:** Retry and avoid losing queued events.
**Status:** Partial.
- The SDK re-queues failed batches on network error (client side).
- **Gap:** no server-side durability or retry; tied to NF2.

**Tasks**
- [ ] Unit test the SDK re-queue behavior. — Owner: Woosik

### NF7 — Maintainability (80% coverage, CI, linting)
**Backend role / Woosik's core lane.**
**Status:** On track.
- CI runs lint (HTML/CSS/JS), unit tests, e2e, JSDoc, and `npm audit`.
- Unit tests: 64 total (27 event-utils + 37 server-helpers).

**Tasks**
- [ ] Add a coverage gate to CI (`jest --coverage`, fail under 80%). — Owner: Woosik + Aditya
- [ ] Keep adding unit/e2e tests as backend features land. — Owner: Woosik

### NF8 — Security (HTTPS, auth, RBAC)
**Backend role:** Secure transport and access control.
**Status:** Missing (acceptable for prototype; flagged).
- Open CORS (`*`), no auth, no rate limiting on any endpoint.

**Tasks**
- [ ] Research a minimal auth/rate-limit approach for Sprint 3 if hosted. — Owner: Backend (research)
- [ ] Document the current "no auth, prototype only" posture in SECURITY.md. — Owner: Woosik

---

## Summary — Woosik's Backend Testing / QA Queue

Ordered by fit with the Backend Testing / Research / QA role:

1. **Done** — NF7 unit tests (37 new), F4 stats aggregation coverage.
2. F1 — add `isValidEvent` validation + tests (also closes Backlog Bug #2).
3. F8 — extend filter tests to e2e; cover new filters as they land.
4. F5 — real-time (<5s) e2e test once Bug #1 (port) is fixed.
5. NF3 — simple response-time benchmark.
6. NF7 — add an 80% coverage gate to CI.
7. QA — write `docs/process/qa-checklist.md` covering F1–F8 manual verification.
