# Future Repo Structure Proposal

| Field | Value |
|---|---|
| Project | WatchTower |
| Document | `docs/process/future-repo-structure-proposal.md` |
| Author | Aditya (Technical Lead) |
| Purpose | Propose a professional repository layout once Prototype 3 is finalized. |
| Status | Proposal only — no files should be moved until the migration checklist is complete. |
| Related docs | [`docs-redundancy-review.md`](docs-redundancy-review.md), [`jsdoc-wiki-plan.md`](jsdoc-wiki-plan.md) |

---

## Purpose

Prototype 3 is the active direction for WatchTower. It merges the strongest parts of Prototype 1 (UI/UX) and Prototype 2 (backend, SDK, event flow) into a single unified application. The final repository cleanup should happen **after** the frontend and backend reach feature freeze — not before.

This document proposes the target professional structure and the safe migration plan to get there.

---

## Current State

### Active code
- `src/prototype_3/` is the final merged direction. It contains:
  - Frontend dashboard (`index.html`, `app.js`, `style.css`)
  - Landing page (`Landing-Page/`)
  - Login/signup pages with Clerk auth (`Log-In-Page/`)
  - Backend Node.js server (`server/server.js`, `server/event-store.js`, `server/server-helpers.js`, `server/mailer.js`, `server/alert-threshold.js`, `server/clerk-alert-recipients.js`)
  - Client SDK (`sdk/watchtower.js`)
  - Auth guard (`auth-guard.js`)
  - Local demo app (`demo/`)
  - Dashboard demo (`dashboard-demo/`)
  - Static assets (`assets/`)
- `src/shared/utils/event-utils.js` provides cross-prototype utility functions.
- `scripts/generate-clerk-config.js` generates the Clerk configuration at build time.

### Archived prototypes
- `archive/prototype_1/` — the original Prototype 1 (static frontend + SQLite backend).
- `archive/prototype_2/` — the original Prototype 2 (full vertical slice with in-memory storage).
- `archive/Prototype1/` — the legacy pre-rename Prototype 1 snapshot.
- `src/prototype_1/` and `src/prototype_2/` no longer exist under `src/` (moved to `archive/`).

### Infrastructure
- Product is hosted on **Render** (start command: `npm start` → `node src/prototype_3/server/server.js`).
- Database is **Supabase/PostgreSQL** (`prototype3_events` table, `app_users` table).
- Authentication is **Clerk** (publishable key in env, JWT verification at the API layer).
- External test app is hosted on **GitHub Pages** in a separate repository.
- CI runs via **GitHub Actions** (`.github/workflows/ci.yml`).

### Testing
- Unit tests: `tests/unit/` (Jest) — 5 test files targeting Prototype 3 server modules.
- E2E tests: `tests/e2e/` (Playwright) — 2 spec files testing API endpoints and dashboard flows.
- Playwright config: `playwright.config.js` at repo root.

---

## Recommended Professional Structure

```
watchtower/
├── src/
│   ├── frontend/                    # All client-side code
│   │   ├── dashboard/               # Main dashboard UI
│   │   │   ├── index.html
│   │   │   ├── app.js
│   │   │   └── style.css
│   │   ├── landing/                 # Public landing page
│   │   │   ├── index.html
│   │   │   ├── landing.js
│   │   │   ├── landing.css
│   │   │   ├── style.css
│   │   │   └── assets/
│   │   ├── auth/                    # Login, signup, password reset pages
│   │   │   ├── login.html
│   │   │   ├── signup.html
│   │   │   ├── forgot-password.html
│   │   │   ├── auth.js
│   │   │   ├── auth-guard.js
│   │   │   ├── clerk-config.example.js
│   │   │   ├── style.css
│   │   │   └── assets/
│   │   ├── demo/                    # Local demo app for testing
│   │   │   ├── index.html
│   │   │   ├── app.js
│   │   │   └── style.css
│   │   ├── dashboard-demo/          # Dashboard demo variant
│   │   │   ├── index.html
│   │   │   ├── app.js
│   │   │   └── style.css
│   │   └── assets/                  # Shared images, logos, team photos
│   │       ├── logos/
│   │       └── team_pics/
│   │
│   ├── backend/                     # All server-side code
│   │   ├── server.js                # HTTP server entry point
│   │   ├── event-store.js           # Supabase/PostgreSQL event storage
│   │   ├── server-helpers.js        # Stats aggregation, filtering
│   │   ├── mailer.js                # Gmail OAuth email sender
│   │   ├── alert-threshold.js       # Error rate threshold evaluation
│   │   └── clerk-alert-recipients.js # Clerk-based alert recipient lookup
│   │
│   ├── sdk/                         # Client-side WatchTower SDK
│   │   └── watchtower.js
│   │
│   └── shared/                      # Cross-concern utilities
│       └── utils/
│           └── event-utils.js
│
├── tests/
│   ├── unit/                        # Jest unit tests
│   ├── e2e/                         # Playwright end-to-end tests
│   └── fixtures/                    # Shared test data/fixtures
│
├── scripts/                         # Build and config scripts
│   └── generate-clerk-config.js
│
├── docs/                            # Project documentation
│   ├── architecture/
│   ├── adr/
│   ├── product/
│   ├── planning/
│   ├── process/
│   ├── design/
│   ├── research/
│   ├── meetings/
│   ├── sprint/
│   └── archive/                     # Superseded docs
│
├── archive/                         # Historical prototype code
│   ├── prototype_1/
│   ├── prototype_2/
│   └── Prototype1/
│
├── .github/
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── dependabot.yml
│
├── package.json
├── playwright.config.js
├── README.md
├── CHANGELOG.md
├── SECURITY.md
└── .gitignore
```

### Why This Structure Is More Professional

1. **Separates frontend/backend/SDK/shared** — each concern has its own top-level directory under `src/`, making it immediately clear what runs in the browser vs. on the server.
2. **Makes deployment clearer** — the Render start command can point directly at `src/backend/server.js`. Static file serving paths are predictable.
3. **Avoids active code being hidden inside prototype folders** — new contributors see `src/frontend/` and `src/backend/`, not `src/prototype_3/` (which implies the code is still experimental).
4. **Keeps old prototypes available but not mixed with active code** — the `archive/` directory preserves history without cluttering the active source tree.
5. **Makes tests and docs easier to maintain** — test file naming can mirror the source structure (`tests/unit/backend-event-store.test.js`), and docs can reference stable paths.
6. **Scales naturally** — adding new frontend pages, backend services, or SDK variants follows the existing directory pattern.

---

## Migration Plan

This is the safe step-by-step process. Each step must be verified before proceeding.

### Prerequisites
1. Frontend and backend are feature-frozen (no active feature branches targeting `src/prototype_3/`).
2. Prototype 3 is stable — all CI checks pass on `main`.
3. Team agrees on the migration timing (standup or sprint kickoff).

### Steps

| # | Step | Details |
|---|---|---|
| 1 | Create a cleanup branch | `git checkout -b chore/repo-restructure` — all changes happen on this branch. |
| 2 | Move Prototype 3 frontend files | Move `src/prototype_3/*.html`, `app.js`, `style.css` → `src/frontend/dashboard/`. Move `Landing-Page/` → `src/frontend/landing/`. Move `Log-In-Page/` → `src/frontend/auth/`. Move `auth-guard.js` → `src/frontend/auth/`. Move `demo/` → `src/frontend/demo/`. Move `dashboard-demo/` → `src/frontend/dashboard-demo/`. Move `assets/` → `src/frontend/assets/`. |
| 3 | Move Prototype 3 backend files | Move `src/prototype_3/server/*` → `src/backend/`. |
| 4 | Move SDK | Move `src/prototype_3/sdk/` → `src/sdk/`. |
| 5 | Keep shared utils | `src/shared/` stays in place (already correctly located). |
| 6 | Update all internal imports | Update `require()` and relative path references in server, SDK, and HTML `<script src>` tags. |
| 7 | Update `package.json` scripts | Change `start` script from `node src/prototype_3/server/server.js` to `node src/backend/server.js`. Update `start:prototype3` similarly. Remove or alias `start:prototype1` and `start:prototype2` (they point to archived code). |
| 8 | Update `server.js` static file routing | The server serves static files relative to `__dirname`. Update the base paths for dashboard, landing, login, demo, SDK, and assets. |
| 9 | Update CI workflow | Update path triggers in `.github/workflows/ci.yml` if any reference `src/prototype_3/` explicitly. Update the repo structure check to verify `src/frontend/` and `src/backend/` instead of `src/prototype_3/`. |
| 10 | Update Render start command | In Render dashboard: change the start command to match the updated `npm start` script. |
| 11 | Update `playwright.config.js` | Verify base URL and any path assumptions still work. |
| 12 | Update JSDoc source paths | Change `docs:js` script from `jsdoc src -r -d docs/api` to scope appropriately (the recursive `src` walk will still work if `src/` is the root). |
| 13 | Update `.gitignore` | Change `src/prototype_3/Log-In-Page/clerk-config.js` to `src/frontend/auth/clerk-config.js`. |
| 14 | Update `README.md` | Rewrite the project structure tree. Update quick start instructions. Update all internal links. |
| 15 | Update `src/README.md` | Rewrite to describe `frontend/`, `backend/`, `sdk/`, `shared/`. |
| 16 | Update script `src` paths in HTML | All `<script src="...">` tags in HTML files that reference prototype_3-relative paths must be updated. |
| 17 | Update Clerk config paths | `npm run config:clerk` writes to a path — update `scripts/generate-clerk-config.js` if it hardcodes the output location. |
| 18 | Run full test suite | `npm run test:unit && npm run test:e2e && npm run docs:js` — all must pass. |
| 19 | Manually verify deployment | Start the server locally with `npm start`, verify all routes: `/`, `/landing/`, `/login`, `/demo`, `/api/health`, `/api/events`, `/api/stats`. |
| 20 | Open PR, get team review | The PR should describe every path change. Reviewers verify their owned areas still work. |
| 21 | Merge and redeploy | After approval, merge to `main` and verify the Render deployment. |

---

## Paths That Must Be Updated During Future Cleanup

| Path/Config | Current Value | Future Value |
|---|---|---|
| `package.json` → `start` script | `node src/prototype_3/server/server.js` | `node src/backend/server.js` |
| `package.json` → `start:prototype3` | `node src/prototype_3/server/server.js` | Remove or alias to `start` |
| Render start command | `npm start` (runs prototype_3 server) | Same command, but internal path changes |
| CI `paths` triggers | `src/**` (works for both layouts) | No change needed |
| CI repo structure check | `test -d src/prototype_3` | `test -d src/frontend && test -d src/backend` |
| Playwright config | `baseURL: http://localhost:3000` | No change (URL stays the same) |
| JSDoc `docs:js` script | `jsdoc src -r -d docs/api` | No change (still walks `src/` recursively) |
| `README.md` links | `src/prototype_1/README.md`, `src/prototype_2/hosted_demo/README.md` | `src/frontend/README.md` or remove |
| Server static routing | `path.join(__dirname, "..")` resolves to `src/prototype_3/` | Update `__dirname` references to point at `src/frontend/` |
| `<script src>` paths in HTML | Relative to `src/prototype_3/` | Relative to new frontend subdirectories |
| Auth config paths | `src/prototype_3/Log-In-Page/clerk-config.js` | `src/frontend/auth/clerk-config.js` |
| SDK path in HTML | `<script src="sdk/watchtower.js">` or server route `/sdk/watchtower.js` | Server route stays the same; file moves to `src/sdk/` |
| `.gitignore` generated Clerk config | `src/prototype_3/Log-In-Page/clerk-config.js` | `src/frontend/auth/clerk-config.js` |
| GitHub Pages test app docs | `external-test-app-plan.md` references | Update to reflect new paths |

---

## Do Not Move Yet

**No source restructuring should happen until the following conditions are met:**

1. All planned frontend touch-ups for the final presentation are complete.
2. All planned backend features (alerting, export, etc.) are implemented or explicitly deferred.
3. The team has agreed on the migration timing.
4. A clean CI pass exists on `main` with no open blocking PRs.

Premature restructuring during active feature work creates merge conflicts, breaks developer workflows, and risks deployment failures. The current `src/prototype_3/` layout is functional and correctly deployed — it is not blocking any feature work.

The restructuring is a **one-time cleanup** that should happen as one of the final tasks before the course project is submitted, or as a post-submission polish step.
