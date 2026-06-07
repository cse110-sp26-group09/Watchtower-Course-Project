# WatchTower Onboarding Guide

## Purpose

This guide is a practical, hands-on companion for the **CSE 110 Team 09 private
handoff video** and for any future maintainer picking up WatchTower. It explains
how to access, run, change, test, and deploy the project. For the product
overview and full reference, start at the root [`README.md`](../README.md); for
the documentation map, see [`docs/README.md`](README.md).

## Quick Start

**Prerequisites:** Node.js 18+ (CI runs Node 24) and npm.

1. **Clone the repo**

   ```bash
   git clone https://github.com/cse110-sp26-group09/Watchtower-Course-Project.git
   cd Watchtower-Course-Project
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create your environment file**

   ```bash
   cp .env.example .env
   ```

4. **Fill in env vars if needed.** All are optional for a basic local run. Set
   `CLERK_PUBLISHABLE_KEY` for real sign-in, the `SUPABASE_*` vars for
   persistence, and the `GMAIL_*` vars for alert emails. With none of these the
   server runs in-memory with header-trust auth, which is enough for local
   development and tests.

5. **Start the server**

   ```bash
   npm start
   ```

   This runs `npm run config:clerk` (generates `src/frontend/auth/clerk-config.js`)
   then boots `src/backend/server.js` on port 3000.

6. **Open the local URLs**

   | URL | Description |
   |---|---|
   | `http://localhost:3000/` | Redirects to the landing page |
   | `http://localhost:3000/landing/` | Public landing page |
   | `http://localhost:3000/dashboard` | Dashboard (requires Clerk sign-in) |
   | `http://localhost:3000/demo/` | Monitored demo app that sends events |
   | `http://localhost:3000/dashboard-demo/` | Static dashboard preview (no sign-in) |

## Repo Tour

```
.github/        # Issue/PR templates, Dependabot config, and CI workflows
archive/        # Historical Prototype 1 & 2 code, kept for project history only
docs/           # Product, architecture, ADRs, process, research, sprint docs (+ this guide)
scripts/        # Build/startup helpers (e.g. generate-clerk-config.js)
src/
├── backend/    # Node.js HTTP server, event store, mailer, alert logic
├── frontend/   # dashboard/, landing/, auth/, demo/, dashboard-demo/, shared assets/
├── sdk/        # Browser SDK (watchtower.js) that monitored apps embed
└── shared/     # Cross-cutting utilities (event-utils.js)
tests/          # unit/ (Jest) and e2e/ (Playwright)
```

See [`src/README.md`](../src/README.md) for the served routes and a deeper source
breakdown.

## Build and Test Pipeline

| Command | What it does |
|---|---|
| `npm start` | Generates the Clerk config, then runs `src/backend/server.js`. |
| `npm run test:unit` | Jest unit tests for the `src/backend` pure modules (no server needed). |
| `npm run test:e2e` | Playwright end-to-end tests against a running server. |
| `npm run docs:js` | Generates JSDoc API docs into `docs/api/` (gitignored). |

- **GitHub Actions CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml))
  runs on every push and pull request to `main`: repo-structure checks,
  HTML/CSS/JS validation, unit tests, a JSDoc generation check, a dependency
  audit, and the Playwright e2e suite (CI starts the server in the background
  before running e2e).
- **Render deployment** hosts the backend. The Render service runs `npm start`
  with `CLERK_PUBLISHABLE_KEY`, the `SUPABASE_*` vars, and any alert vars set
  under Render → Environment.
- **GitHub Pages external test app**
  (<https://cse110-sp26-group09.github.io/Watchtower-test-app/>) is a separate
  static site that embeds the SDK and sends real cross-origin telemetry to the
  Render `/api/events` endpoint. It does **not** run the backend or database.

## Making a Small Change

A safe, demo-friendly change for the handoff video — for example, edit a piece of
copy text on the landing page (`src/frontend/landing/index.html`) or a dashboard
card label (`src/frontend/dashboard/index.html`):

1. Create a branch: `git checkout -b demo/small-copy-change`.
2. Edit the text in the chosen HTML file.
3. Run the app and verify visually:

   ```bash
   npm start    # open http://localhost:3000/landing/
   ```

4. Run the unit tests to confirm nothing broke:

   ```bash
   npm run test:unit
   ```

5. Commit, push the branch, and open a pull request.
6. GitHub Actions CI runs automatically on the PR; merge once checks are green.

## Runtime Architecture

```
External test app ──► WatchTower SDK ──POST /api/events──► Node.js backend
                                                              │
                                                              ▼
                                                       Supabase / Postgres
                                                              │
                                                              ▼
                                              WatchTower dashboard (per user)
```

A monitored app embeds the SDK, which batches events to `POST /api/events`. The
backend normalizes and stores them in Supabase (or in-memory when Supabase is not
configured), and the Clerk-authenticated dashboard reads back only the signed-in
user's events.

## Auth and Data Ownership

- **Clerk** owns all dashboard authentication (login, signup, sessions,
  sign-out). The backend verifies Clerk session JWTs against Clerk's public JWKS;
  WatchTower stores no passwords.
- **`app_users`** (Supabase) holds one row per Clerk user, keyed by
  `clerk_user_id`. The dashboard upserts it via `POST /api/users/sync`.
- **`prototype3_events.user_id`** scopes telemetry: dashboard reads only return
  rows whose `user_id` matches the signed-in Clerk user.
- **`DEFAULT_INGEST_OWNER_USER_ID`** is a **temporary, demo-only** mapping. The
  external test app has no Clerk session, so its otherwise-anonymous events would
  store with `user_id = NULL` and never appear on a dashboard. Setting this env
  var attributes those events to one demo owner so they show up during a live
  demo.
- **Future project/app keys:** the long-term fix is a per-app/project key
  ingestion model so each monitored app maps to the correct owner without a human
  login and without a single global default.

See [`docs/architecture/auth-workflow.md`](architecture/auth-workflow.md) for the
full flow.

## Common Troubleshooting

- **Clerk config not generated.** If sign-in misbehaves, run `npm run config:clerk`
  (or just `npm start`, which runs it first). It writes
  `src/frontend/auth/clerk-config.js` from `CLERK_PUBLISHABLE_KEY`. The file is
  gitignored — set the key in `.env` or in Render → Environment.
- **Supabase env vars missing.** With no `SUPABASE_URL` / key, the server falls
  back to **in-memory** storage; events are lost on restart but everything else
  works. The startup log prints which store is active.
- **GitHub Pages events return `200` but don't appear.** The external app ingests
  without a Clerk session, so events store with `user_id = NULL`. Set
  `DEFAULT_INGEST_OWNER_USER_ID` (Render env) to the demo owner's Clerk id so they
  land on that owner's dashboard.
- **Playwright needs a running server.** Locally, start the server (`npm start`)
  in one terminal and run `npm run test:e2e` in another, or set `BASE_URL`. CI
  starts the server automatically.
- **Never commit secrets.** Do not commit `.env` or a generated
  `clerk-config.js` that contains a real key. Only `.env.example` and
  `clerk-config.example.js` carry placeholder values.

## Handoff Video Checklist

- [ ] Team name and number (CSE 110 Team 09)
- [ ] How to access the repo
- [ ] Repo tour / organization
- [ ] Run the project (`npm start` + local URLs)
- [ ] Make a small change (see above)
- [ ] Run the build / tests (`npm run test:unit`, `npm run test:e2e`, `npm run docs:js`)
- [ ] Discuss the CI/CD pipeline (GitHub Actions + Render + GitHub Pages)
- [ ] Agile retrospective: what went well, what did not, challenges, victories
- [ ] Next steps / future work for the next team

## Future Work

- Replace `DEFAULT_INGEST_OWNER_USER_ID` with a proper project/app key model for
  multi-tenant ingestion.
- Improve alerting (richer routing and recipient management beyond threshold
  email).
- Harden production auth and database security (e.g. Supabase RLS scoped to the
  Clerk `sub` claim).
- Improve deployment documentation (Render + Supabase + Clerk setup runbooks).
- Continue UI polish across the dashboard and landing pages.
- Archive or remove stale historical docs only after a deliberate review.
