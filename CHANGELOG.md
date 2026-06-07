# Changelog

All notable changes to this project will be documented in this file.

This project follows Semantic Versioning where possible.

Format:
- `Added` for new features
- `Changed` for updates to existing functionality
- `Fixed` for bug fixes
- `Removed` for removed features
- `Docs` for documentation-only updates
- `Process` for project management, sprint, GitHub, or workflow updates

---

## [1.0.0] - 2026-06-06

Course handoff release.

### Added
- **WatchTower observability platform (current product).** A dependency-free
  browser **SDK** captures JavaScript errors, user interactions, and
  performance/latency metrics (Navigation Timing) and delivers them to the
  backend via the **Beacon API** and `POST /api/events`.
- **Node.js backend** with JSON APIs for event ingestion and dashboard stats
  (`/api/events`, `/api/stats`, `/api/health`, developer endpoints) plus a live
  Server-Sent Events stream.
- **Clerk authentication** for the dashboard (login, signup, sessions,
  sign-out). The backend verifies Clerk session JWTs, and every dashboard read is
  **scoped to the signed-in user**.
- **Manager (executive) and developer dashboard views** with health-status logic,
  a Critical/Warning/Info severity legend, threshold-based status colors, and
  error/latency analytics.
- **Persistent storage on PostgreSQL via Supabase**, with an in-memory fallback
  for local development; user records are synced into Supabase on sign-in.
- **Email alerts** (Gmail + Nodemailer OAuth2) that notify the team when error
  counts cross a threshold (validated locally; production routing is future work).
- **Public landing page** with a product preview and a **Privacy Policy** page.
- **Deployment:** backend hosted on **Render**; an external monitored test app
  hosted on **GitHub Pages** exercises the SDK like a real customer site.
- Professional active-source layout: `src/backend/`, `src/frontend/` (`dashboard/`,
  `landing/`, `auth/`, `demo/`, `dashboard-demo/`, shared `assets/`), `src/sdk/`,
  and `src/shared/`.
- Initial project repository structure.
- Starter documentation folder for sprint planning, MVP, requirements, ADRs, and standups.
- Basic GitHub workflow structure.
- Initial `.gitignore`.
- Initial PR and issue template placeholders.

### Changed
- Moved the active Prototype 3 source out of `src/prototype_3/` into the
  frontend/backend/sdk/shared structure and updated every path reference
  (server static routing, frontend HTML/JS, SDK serving route, Clerk config
  generation, `package.json` scripts, unit-test imports, `.gitignore`, and docs).
- `start` script now runs `node src/backend/server.js`; `docs:js` now scopes
  JSDoc to active code (`src/backend`, `src/sdk`, `src/shared`).
- Generated Clerk config now writes to `src/frontend/auth/clerk-config.js`
  (served at `/login/clerk-config.js`).
- Rewrote the root `README.md` and `src/README.md` for onboarding accuracy and
  refreshed `.env.example` with the variables the code actually reads.

### Fixed
- Landing/auth redirects now detect "served by server" via protocol (works on
  Render, not just `localhost:3000`) and use the new `src/frontend/auth/` paths.

### Removed
- Removed the `admin/` directory (large local status video) after preserving the
  code-review feedback under `docs/process/`.
- Removed broken `start:prototype1`/`start:prototype2`/`start:prototype3` scripts
  and obsolete `landing.html` / `auth.html` redirect stubs.

### Docs
- Finalized the repo for handoff: polished the root `README.md` with status
  badges, project links, and private-handoff guidance, and added
  `docs/onboard.md` (onboarding guide for graders and future maintainers).
- Improved directory README coverage: added READMEs for `.github/`,
  `.github/ISSUE_TEMPLATE/`, `archive/`, `scripts/`, `docs/archive/`,
  `docs/design/`, `docs/process/`, `docs/product/`, `docs/planning/`,
  `src/backend/`, `src/frontend/` (and `dashboard/`, `demo/`), `src/sdk/`,
  `src/shared/` (and `utils/`), and `tests/unit/` & `tests/e2e/`. Each states
  whether the folder is active, historical, generated, or documentation-only.
- Reconstructed `docs/planning/sprint-3-planning.md` and
  `docs/planning/sprint-4-planning.md` from existing standup, retrospective, and
  decision-log notes (clearly labeled as reconstructed) and added a
  `docs/planning/README.md` index listing all sprint planning docs.
- Cross-checked the docs index: fixed broken/stale links in `docs/README.md`
  (removed a non-existent `media/` entry, corrected `Wireframe`, `architecture/`,
  and `standups` links), linked `docs/onboard.md`, and refreshed the architecture,
  workflows, and retrospectives README indexes to point at active v2 docs.
- Preserved external code-review feedback at `docs/process/code-review-feedback.md`
  and linked it from `docs/README.md`.
- Updated `docs/architecture/auth-workflow.md` to the new source paths and
  `npm start` command.
- Added starter README outline.
- Added Sprint 1 planning direction.
- Added initial Git workflow documentation.

### Process
- Verified unit tests, server route smoke checks, and JSDoc generation after the
  restructure.
- Defined Sprint 1 focus as research, alignment, MVP definition, and prototype planning.
- Assigned initial Sprint 1 roles and responsibilities.
- Started tracking work through GitHub Issues.

---
