# Sprint 2 Prototype Comparison Readout

| Field | Value |
|---|---|
| Project | WatchTower |
| Sprint | Sprint 2 |
| Document | `docs/sprint/sprint-2-comparison-readout.md` |
| Authors | Aditya (Scrum Master, Backend Lead, Architecture Mediator), with frontend review by James |
| Related docs | [`prototype-comparison-rubric.md`](../process/prototype-comparison-rubric.md), [`sprint-2-planning.md`](../planning/sprint-2-planning.md), [`mvp.md`](../product/mvp.md), [`requirements.md`](../product/requirements.md), [`event-schema-v1.md`](../architecture/event-schema-v1.md), [`api-contract-v1.md`](../architecture/api-contract-v1.md) |
| Purpose | Compare both WatchTower prototypes against the agreed rubric and recommend the Sprint 3 direction: Prototype 1, Prototype 2, or hybrid. |

---

## 1. Executive Summary

Sprint 2 used a two-prototype exploration model. Both prototypes are two implementations of the same WatchTower product (lightweight observability dashboard with SDK event capture). They are not separate products and should converge into one direction for Sprint 3.

After inspecting the repo, the two prototypes are not at the same level of completion:

- `src/prototype_1/` is a polished, static frontend candidate (HTML, CSS, vanilla JS) closely modeled after the wireframe. It has no SDK, no server, no event utilities, and explicitly lists frontend and backend integration as open TODOs in `src/prototype_1/Backlog.md`.
- `src/prototype_2/` is a full vertical slice: SDK (`sdk.js`), Node.js server (`server/server.js`), shared event utilities (`utils/event-utils.js`), dashboard (`index.html` + `dashboard.js`), and a hosted ShopDemo (`hosted_demo/`). It implements the agreed event schema and API contract, with some known integration bugs.

The supporting infrastructure (CI, Jest, Playwright, JSDoc generation, Dependabot, CodeQL, npm audit, `SECURITY.md`) was completed during Sprint 2 as part of the engineering process and applies to both prototypes equally.

**Recommended direction:** **Hybrid, with `prototype_2` as the working base**.

In short: keep prototype 2's working SDK, server, event utilities, and event flow, and pull prototype 1's wireframe-aligned dashboard layout, accessibility controls, and assignment/triage UI on top of that base. Pure prototype 1 is not recommended because the team would need to rebuild the backend, SDK, and event flow from scratch with only two sprints of runway. Pure prototype 2 is not recommended because the existing dashboard UI is less aligned with the agreed wireframe and has known visual rough edges.

---

## 2. Prototype Overview

### Prototype 1 (`src/prototype_1/`)

| Aspect | Details |
|---|---|
| Purpose | A static frontend candidate that explores the WatchTower dashboard look, layout, and accessibility behavior. |
| Implementation status | Frontend only. No SDK, no server, no event ingestion. Backlog explicitly lists frontend HTML cleanup, schema compatibility, and backend connections as open work. |
| Main frontend direction | Vanilla HTML, CSS, and JavaScript app shell with three views (Home, Analytics, Settings), hash-based view switching, segmented time-range control, settings accordions, assignment dropdowns on issues, high-contrast toggle, and a text-size slider. |
| Main backend / instrumentation direction | None implemented. The README describes this prototype as "a standalone static frontend candidate based on the WatchTower wireframes". |
| Evidence in repo | `src/prototype_1/index.html` (about 493 lines), `app.js` (about 160 lines, all functions have JSDoc), `style.css`, `README.md`, `Backlog.md` (4 open TODOs). |
| Known limitations | All metrics, issues, services, and events are hardcoded into the HTML. No event schema implementation, no SDK, no real server. Cannot fulfill the MVP "events appear in dashboard" loop on its own. |

### Prototype 2 (`src/prototype_2/`)

| Aspect | Details |
|---|---|
| Purpose | A full-stack candidate that explores a complete WatchTower vertical slice: capture → ingest → display. |
| Implementation status | Working SDK, working Node.js server (HTTP, no framework), working dashboard with three views (Home, Analytics, Alerts) and a settings panel, plus a separate static hosted ShopDemo. Several integration bugs exist (see limitations). |
| Main frontend direction | Vanilla HTML, CSS, and JavaScript. `dashboard.js` (about 865 lines) implements view switching, hero stat cards, insight panels, version history timeline, two bar charts, a canvas-drawn latency line chart, an alerts feed with status, patch, security, and service filters, search, and a mute toggle. |
| Main backend / instrumentation direction | `sdk.js` auto-captures `window.onerror` and Navigation Timing API page-load metrics, generates a session ID, and POSTs events in 2-second batches. `server/server.js` exposes `POST /api/events`, `GET /api/events`, `GET /api/stats`, and `GET /api/events/stream` (SSE) with permissive CORS. `utils/event-utils.js` provides `createBaseEvent`, `isValidEvent`, `normalizeErrorEvent`, `normalizeFeedbackEvent`, `calculateAverage`, `calculatePercentile`, and `KNOWN_EVENT_TYPES`. |
| Evidence in repo | `src/prototype_2/index.html`, `dashboard.js`, `sdk.js`, `style.css` (1086 lines, themed), `server/server.js`, `utils/event-utils.js`, `hosted_demo/` (static ShopDemo), `README.md` with a manual testing pass/fail table. |
| Known limitations | (1) Port mismatch: `server/server.js` listens on `PORT || 3000` while `sdk.js` and `dashboard.js` post and read from `http://localhost:8000`. (2) `server/server.js` aliases `/` to `/dashboard/index.html` and `/demo` to `/demo/index.html`, paths that do not exist in the current flat layout. (3) `fetchStats()` consumes fields like `maxUsers`, `avgLatency`, and `uptime` that the server does not currently return. (4) Insight panels, version history, and alerts feed still render from hardcoded mock arrays in `dashboard.js`. (5) `Backlog.md` is empty. |

### Shared Sprint 2 Infrastructure (applies to both prototypes)

- GitHub Actions CI pipeline (`.github/workflows/ci.yml`) with repository checks, HTML, CSS, and JavaScript validation, unit tests, end-to-end tests, JSDoc generation, and npm audit.
- Jest, Playwright, and JSDoc as the only committed dev dependencies (see `package.json`).
- Dependabot configuration (`.github/dependabot.yml`).
- CodeQL code scanning.
- `SECURITY.md` security policy.
- Shared event schema v1 and API contract v1 in `docs/architecture/`.

A small but real risk: the unit test file `tests/unit/event-utils.test.js` currently imports from `../../src/prototype_1/utils/event-utils`, which does not exist (the file lives at `src/prototype_2/utils/event-utils.js`). The `npm start` script in `package.json` similarly points at `src/prototype_1/server/server.js`, which also does not exist. Both should be repointed (or the utilities moved) as part of Sprint 3 cleanup. This is a cross-cutting issue, not a prototype-specific defect.

---

## 3. Criteria-Based Scoring Results

Scores are 1 to 5 per the rubric in [`prototype-comparison-rubric.md`](../process/prototype-comparison-rubric.md). Rationale is grounded in observable repo evidence, not intent.

| Category | Weight | P1 Score | Prototype 1 Rationale | P2 Score | Prototype 2 Rationale |
|---|---:|---:|---|---:|---|
| MVP Completeness | 20% | 2 | Visualizes the MVP look but does not capture, store, or display real events. No SDK, no server, no event filtering against captured data. Backlog explicitly lists this work as open. | 4 | Implements the full MVP loop in principle (SDK auto-captures errors and page-load performance, server accepts batches, dashboard reads stats over HTTP and consumes a live SSE stream). Feedback events are defined in the schema but not exposed end-to-end yet, and several panels still use mock data. |
| User Experience / UI Clarity | 15% | 4 | Wireframe-aligned, semantic HTML, clear three-view layout, severity pills, visible time-range selector, accessibility toggles (high contrast, text size), and assignment dropdowns. Visual hierarchy is consistent across the home, analytics, and settings views. | 4 | Themed and visually polished with hero stat cards, insight panels, version timeline, two bar charts, a canvas latency chart, and a faceted alerts feed. Some UX rough edges exist (no obvious empty state, hardcoded copy, and the "Past 1 Day" selector does not filter the feed yet). |
| Event Flow / Data Model | 15% | 1 | No event flow. All data is inline HTML. The Backlog mentions a frontend/backend schema as future work. | 4 | Implements the shared event envelope (`type`, `timestamp`, `data`, plus optional `sessionId` and `deployVersion`), normalizes error and feedback events, and matches the API contract for `POST /api/events`, `GET /api/events`, `GET /api/stats`, and the SSE stream. Some dashboard panels do not yet bind to live data. |
| Technical Simplicity / Maintainability | 15% | 4 | Tight, single-file behavior in `app.js`, IIFE with `"use strict"`, small focused functions, JSDoc on every initializer, and no dependencies beyond the browser. Easy for the team to extend. | 3 | The vertical slice is more code to maintain. `dashboard.js` is about 865 lines in a single IIFE with mixed concerns (view switching, charts, filters, insights, alerts feed). Server and SDK are small and readable but have the integration bugs listed above (port mismatch, server static aliases, stats shape mismatch). |
| Testing Readiness | 10% | 2 | No backend or utilities to unit test. UI is testable via Playwright, but the current e2e test (`tests/e2e/watchtower.spec.js`) targets API routes and DOM ids that this prototype does not expose. | 4 | `utils/event-utils.js` is the natural home for the existing Jest suite (the import path just needs to be repointed). The server exposes the JSON endpoints that the e2e suite already exercises. End-to-end alignment requires fixing the port and stats shape and aligning the e2e selectors. |
| Documentation Quality | 10% | 3 | `README.md` is short but accurate. All JS functions have JSDoc. There is no dedicated event-flow or setup-to-demo write-up in this folder, partly because there is no backend to document. | 4 | `README.md` includes structure, views, SDK behavior, theme variables, expected backend endpoints, and a manual testing pass/fail table. JSDoc is thorough across the SDK, server, dashboard, and utilities. The hosted demo has its own README. The shared event schema and API contract docs in `docs/architecture/` describe the system this prototype implements. |
| Integration Readiness | 10% | 2 | Cannot ingest external events today. Static frontend is easy to host, but integrating an SDK and server would be most of a sprint of work by itself. | 4 | The SDK already targets a generic `/api/events` endpoint with permissive CORS, which is the same shape any external monitored site would use. The server is framework-free and easy to point at a separate test app once the port and static-routing bugs are fixed. |
| Team Confidence | 5% | 3 | Frontend team is confident about extending the UI. Backend team has not yet started against this prototype because there is no backend in this folder. | 4 | Both teams can see a working slice end to end, even if rough. The backend team can ship bug fixes against an existing server rather than starting cold. |

A note on fairness: prototype 1 is not a weak prototype, it is a deliberately scoped frontend exploration. The lower scores in MVP completeness, event flow, testing readiness, and integration readiness reflect that it does not yet contain the backend half of the product, not that the frontend work is low quality.

---

## 4. Weighted Score Summary

Formula: `weighted = score / 5 * weight`.

| Category | Weight | Prototype 1 Weighted | Prototype 2 Weighted |
|---|---:|---:|---:|
| MVP Completeness | 20 | 8.0 | 16.0 |
| User Experience / UI Clarity | 15 | 12.0 | 12.0 |
| Event Flow / Data Model | 15 | 3.0 | 12.0 |
| Technical Simplicity / Maintainability | 15 | 12.0 | 9.0 |
| Testing Readiness | 10 | 4.0 | 8.0 |
| Documentation Quality | 10 | 6.0 | 8.0 |
| Integration Readiness | 10 | 4.0 | 8.0 |
| Team Confidence | 5 | 3.0 | 4.0 |
| **Total (out of 100)** | **100** | **52.0** | **77.0** |

Prototype 2 scores higher overall, mostly on the categories that depend on a working backend and event flow. Prototype 1 ties or wins on UI clarity and code simplicity, which is why the recommended direction is a hybrid rather than dropping prototype 1 outright.

---

## 5. Strengths and Risks

### Prototype 1

**Strengths**
- Closest match to the agreed wireframe and the User Interface Decisions notes (bottom mobile nav, simplified settings).
- Clear three-view structure with semantic HTML and accessibility controls (high contrast, text size) that prototype 2 does not have.
- Small surface area, easy to read, easy to extend, no third-party dependencies.
- Useful issue-row pattern with severity pills, build metadata, and assignment dropdowns, which fits the WatchTower triage user flow.

**Risks**
- Entire backend half of the MVP is unbuilt. Picking this prototype as the base means rebuilding the SDK, server, event utilities, and integration with the agreed schema before any feature work can happen.
- Several panels (services, recent events, latency SVG) would still need to be rewritten to consume live data once a backend exists.
- No tests target this prototype yet.

**Missing pieces**
- SDK (event capture, batching, session tracking).
- Server and API endpoints from the API contract v1.
- Event utilities and validation logic.
- Wiring between the static UI and any data source.

**Recommended next steps (if used as the base)**
- Port the SDK, server, and `event-utils.js` from prototype 2 underneath this UI.
- Replace the inline HTML mock data in `index.html` with bindings to `/api/stats` and `/api/events`.
- Add e2e selectors and IDs that match the existing Playwright tests.

### Prototype 2

**Strengths**
- Implements the full MVP loop: SDK captures errors and page-load timings, server ingests batches, dashboard reads stats and subscribes to an SSE stream.
- Matches the shared event schema and API contract closely.
- Comes with a separate hosted ShopDemo that already simulates errors, promise rejections, and custom events, which makes the future "external test app" direction easier.
- Includes a manual testing checklist in its README and thorough JSDoc.
- Provides the `utils/event-utils.js` module that the existing Jest suite is built around.

**Risks**
- Port mismatch between server (`3000`) and client (`8000`) means the dashboard does not actually receive live data out of the box. Fix is small but required.
- The server's static path aliases (`/dashboard/index.html`, `/demo/index.html`) reflect an earlier directory layout and do not match the current flat `prototype_2/` structure.
- `dashboard.js` calls `fetchStats()` and expects keys (`maxUsers`, `avgLatency`, `uptime`) that the server does not currently compute. Live stats will not populate without a server-side or client-side change.
- A large portion of the visible dashboard (insights, version history, alerts feed) still renders from hardcoded mock arrays rather than from real events.
- `dashboard.js` is one large IIFE; long-term it will benefit from being broken into smaller modules.

**Missing pieces**
- Feedback capture is in the schema but not yet wired through the SDK or dashboard.
- Filter selections on the alerts view are not yet driven by real ingested events.
- Authentication, persistent storage, and alerting thresholds are intentionally out of scope per the MVP doc.

**Recommended next steps (if used as the base)**
- Fix the port mismatch (pick `3000`, update `sdk.js` and `dashboard.js`, or read from a `<meta>` config tag).
- Either move `index.html` to `src/prototype_2/dashboard/index.html` or remove the alias logic from the server.
- Align the `getStats()` response with what the dashboard reads (`maxUsers`, `avgLatency`, `uptime`) or update the dashboard to use the current shape.
- Repoint `tests/unit/event-utils.test.js` and `package.json` start script at the real paths, and update the Playwright e2e selectors to match the actual dashboard ids.

---

## 6. Recommendation and Reasoning

**Recommended direction: Hybrid, using `prototype_2` as the working base and pulling in the wireframe-aligned UI ideas from `prototype_1`.**

Reasoning across the rubric:

- **MVP completeness:** Prototype 2 already implements the capture → ingest → display loop. Prototype 1 does not. Rebuilding that loop from scratch on top of prototype 1 would consume most of Sprint 3.
- **Maintainability:** Prototype 1's frontend code is cleaner per file, but prototype 2's split across SDK, server, utils, and dashboard matches the actual product shape. The maintainability gap closes once prototype 2's `dashboard.js` is broken into smaller modules.
- **Testing readiness:** The existing Jest unit suite and the e2e tests are aimed at the architecture that prototype 2 implements. Repointing the tests is much smaller than writing them from scratch.
- **Event flow clarity:** Prototype 2 matches the shared event schema and API contract. Prototype 1 has no event flow today.
- **UI clarity:** Prototype 1 is more wireframe-aligned and includes accessibility controls. This is the strongest reason not to drop prototype 1 entirely.
- **Documentation:** Both are documented; prototype 2's README and JSDoc are slightly more thorough and include the manual testing table.
- **Future external test-app integration:** Prototype 2's permissive-CORS `/api/events` endpoint and the existing `hosted_demo/` ShopDemo are a good starting point for the separate monitored test app described in `docs/architecture/external-test-app-plan.md`.
- **Team ability to complete on time:** Two sprints remain. Building backend from zero on top of prototype 1 is the highest-risk path for a 10-person student team. Fixing known bugs in prototype 2 and grafting in prototype 1's UI patterns is lower risk.

### Hybrid Composition

**Take from `prototype_2`:**
- `sdk.js` (event capture, batching, session ID).
- `server/server.js` (HTTP API, SSE stream, in-memory event buffer).
- `utils/event-utils.js` (shared validation, normalization, percentile helpers).
- `hosted_demo/` ShopDemo as the public static demo for the external test app direction.
- The Alerts view with status, patch, security, and service facets (once it is wired to real events).

**Take from `prototype_1`:**
- The home view layout: simple health summary, errors-by-version triage panel, services status, build metadata grid, and a recent events timeline. This matches the wireframe and the User Interface Decisions notes more directly.
- The Settings view structure (accordion sections) and the accessibility toggles (high contrast, text size).
- The Analytics view's segmented time-range control and the SVG-based latency-by-route line chart, which read cleanly in a presentation setting.
- The assignment dropdown UX on issue rows.

**Do not merge:**
- Two parallel servers, two parallel SDKs, or two parallel `event-utils` files. There must be one of each.
- Two parallel `index.html` files in `src/`. Pick one as the canonical dashboard entry point.
- Conflicting alerts UIs. Either keep prototype 2's faceted alerts view or rebuild it; do not ship both.
- The hardcoded mock arrays from prototype 2's `dashboard.js` once real data is flowing. They are useful for the demo today but should be removed when the live data binds.

**Why this hybrid is realistic for a student team:**
- It is bug-fix and refactor work on prototype 2, plus a UI lift from prototype 1. It is not a rewrite.
- The shared event schema and API contract are already accepted, so the data plane does not need to be redesigned.
- CI, JSDoc, Dependabot, CodeQL, and `SECURITY.md` already cover the codebase and do not need to be redone.
- The work fits naturally into the existing prototype 1 and prototype 2 sub-teams: prototype 1 frontend members lead the UI lift, prototype 2 backend members lead the server and SDK fixes, and Aditya mediates the schema and integration points.

---

## 7. Follow-Up Issue List for Sprint 3

These are the concrete follow-up issues the team should create at the start of Sprint 3 if the hybrid recommendation is accepted. Owners are suggestions based on the Sprint 2 role assignments and should be confirmed at the Sprint 3 kickoff.

| # | Title | Type | Suggested Owner(s) | Notes |
|---|---|---|---|---|
| 1 | Decide canonical hybrid directory (rename `prototype_2` to `app` or `src/watchtower`) and update `package.json` `start` script | chore | Aditya | Unblocks every other issue below. |
| 2 | Fix port mismatch in SDK and dashboard (target the same port as the server) | fix | Jason, Woosik | Pick `3000`, or read from a `<meta name="watchtower-api">` tag. |
| 3 | Align `getStats()` response with dashboard expectations (`maxUsers`, `avgLatency`, `uptime`) | fix | Daniel, Waleed | Either extend the server response or update `dashboard.js`. |
| 4 | Remove or correct the server's `/dashboard/...` and `/demo/...` static aliases for the flat layout | fix | Daniel | One-line change in `server/server.js`. |
| 5 | Repoint `tests/unit/event-utils.test.js` import and confirm Jest suite passes locally and in CI | test | Woosik | Move file or update path; do not duplicate the utility. |
| 6 | Update Playwright selectors in `tests/e2e/watchtower.spec.js` to match the chosen hybrid dashboard ids | test | Woosik, Aditya | Aligns CI e2e with reality. |
| 7 | Port the Home view layout from prototype 1 (health summary, services, build metadata, recent events) into the hybrid dashboard | feature | James, Hieu, Hemendra | Pull the markup and styles; rebind to live data where possible. |
| 8 | Port the Settings accordions and accessibility toggles (high contrast, text size) from prototype 1 | feature | Hieu, Hemendra | Keep the prototype 1 UX decisions. |
| 9 | Replace hardcoded insight, version history, and alerts arrays in `dashboard.js` with live data from `/api/events` and `/api/stats` | feature | Alex, Fahad, Josh | Reduce the mock surface area visible to demo viewers. |
| 10 | Wire feedback capture end to end (SDK `trackFeedback`, server normalization, dashboard panel) | feature | Jason, Daniel | Closes the third MVP event category. |
| 11 | Write an ADR documenting the hybrid decision and the parts taken from each prototype | docs | Aditya | Required by the rubric's review process. |
| 12 | Plan the separate external test app repo following `docs/architecture/external-test-app-plan.md` | research | Fahad, Aditya | Do not split the repo yet; produce a plan and acceptance criteria. |

---

## Acceptance Criteria Checklist

- [x] Criteria-based scoring results included
- [x] Strengths and risks included for both prototypes
- [x] Recommendation is explicit and actionable
- [x] Follow-up issue list included for next sprint
- [x] Documentation is updated
