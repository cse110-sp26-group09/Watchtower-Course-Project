# WatchTower

[![CI](https://github.com/cse110-sp26-group09/Watchtower-Course-Project/actions/workflows/ci.yml/badge.svg)](https://github.com/cse110-sp26-group09/Watchtower-Course-Project/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-24.x-339933?logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/e2e-Playwright-45ba4b?logo=playwright&logoColor=white)
![Jest](https://img.shields.io/badge/unit-Jest-C21325?logo=jest&logoColor=white)
![Backend](https://img.shields.io/badge/backend-Render-46E3B7?logo=render&logoColor=black)
![Database](https://img.shields.io/badge/database-Supabase-3ECF8E?logo=supabase&logoColor=white)
![Auth](https://img.shields.io/badge/auth-Clerk-6C47FF?logo=clerk&logoColor=white)
![SDK](https://img.shields.io/badge/sdk-browser%20tracking-orange)
![Docs](https://img.shields.io/badge/docs-onboarding-blue)

WatchTower is a lightweight observability platform for web applications. A small browser SDK embedded in a monitored app captures JavaScript errors, user interactions, and performance metrics and streams them to a Node.js backend, which persists them to Postgres (Supabase) and renders them in a real-time, per-user dashboard. It is built by CSE 110 Team 09 as a course project, but it is structured and documented to run as a real, deployable product.

## Overview

Modern web teams need to know what is actually happening in production: which errors users hit, how fast pages load, which routes are slow, and what users do. WatchTower provides that visibility without a heavy agent or vendor lock-in. Drop the SDK into any web page, point it at a WatchTower backend, and the dashboard fills with live error feeds, latency charts, active-user counts, and deploy-version breakdowns. Dashboard access is authenticated with Clerk and data is scoped per user.

## Project Links

- **Live WatchTower backend (Render):** https://watchtower-course-project-g8dv.onrender.com
- **External GitHub Pages test app:** https://cse110-sp26-group09.github.io/Watchtower-test-app/
- **Team status video:** [YouTube](https://youtu.be/9Bn4ElbA7Js)
- **Private handoff video:** TODO - add unlisted YouTube link before submission
- **Documentation index:** [docs/README.md](docs/README.md)
- **Onboarding guide:** [docs/onboard.md](docs/onboard.md)

> Demo GIF/Screenshot: TODO - add short GIF or screenshot before final submission if available.

## Key Features

- **JavaScript error tracking** – automatically capture unhandled errors and group them by signature, release, and affected sessions.
- **Event & user-interaction tracking** – record clicks, custom events, route transitions, and session activity.
- **Performance & latency monitoring** – page-load timing, Navigation Timing breakdowns, web-vitals-style metrics, and p95 latency per route.
- **Deploy / version visibility** – tie errors and metrics to specific deploy versions for faster regression hunting.
- **User-scoped dashboard data** – every dashboard read is scoped to the signed-in Clerk user, so users only see their own telemetry.
- **Supabase / Postgres persistence** – events and users are stored in Postgres; the server falls back to in-memory storage when no database is configured.
- **Email alerts** – optional threshold-based alerting. The current implementation was validated locally; production alert routing is documented as future work.
- **SDK integration** – a dependency-free browser SDK that any external monitored app can embed.

## Architecture

```
External monitored app
   │  (embeds src/sdk/watchtower.js)
   ▼
WatchTower SDK  ──POST /api/events──►  Node.js backend (Render)
                                          │  src/backend/server.js
                                          ▼
                                 Supabase / Postgres
                                          │
                                          ▼
                          WatchTower dashboard (Clerk-authenticated)
```

- **Clerk** handles all dashboard authentication (login, signup, sessions, sign-out). The backend verifies Clerk session JWTs against Clerk's public JWKS; WatchTower stores no passwords.
- **Supabase / Postgres** is the application database (events + users). With no Supabase credentials configured, the server runs fully in-memory for local development.
- **Render** hosts the Node.js backend in production.
- **GitHub Pages** hosts a separate [external test app](https://cse110-sp26-group09.github.io/Watchtower-test-app/) that embeds the SDK and sends real cross-origin telemetry to the Render backend. GitHub Pages serves only that static demo — it does **not** run the backend or database.
- **`DEFAULT_INGEST_OWNER_USER_ID`** is a *temporary* prototype mapping: because the external test app has no Clerk session, its otherwise-anonymous events are attributed to one demo owner so they appear on a dashboard. The long-term replacement is a **per-app/project key** ingestion model so each monitored app maps to the correct owner without a human login.

See [`docs/architecture/auth-workflow.md`](docs/architecture/auth-workflow.md) for the full authentication and data-scoping flow.

## Repository Structure

```
.github/        # Issue templates, Dependabot, and CI workflows
archive/        # Historical Prototype 1 & 2 code (kept for project history)
docs/           # Product, architecture, ADRs, process, research, sprint docs
scripts/        # Build/startup helpers (e.g. Clerk config generation)
src/
├── backend/    # Node.js HTTP server, event store, mailer, alert logic
├── frontend/   # dashboard/, landing/, auth/, demo/, dashboard-demo/, assets/
├── sdk/         # Browser SDK (watchtower.js)
└── shared/      # Shared utilities (event-utils.js)
tests/          # unit/ (Jest) and e2e/ (Playwright)
```

See [`src/README.md`](src/README.md) for the source layout and [`docs/README.md`](docs/README.md) for the documentation index.

## Getting Started

**Prerequisites:** Node.js 18 or later and npm.

1. **Clone the repository**

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

4. **Configure Clerk / Supabase / alerts as needed** (all optional for a basic local run — see [Environment Variables](#environment-variables)). Without Supabase the server uses in-memory storage; without a real Clerk key it runs in prototype/header-trust mode so tests and local development work.

5. **Start the server**

   ```bash
   npm start
   ```

   The `start` script runs `npm run config:clerk` to generate `src/frontend/auth/clerk-config.js` from `CLERK_PUBLISHABLE_KEY`, then boots `src/backend/server.js`.

6. **Open the app**

   | URL | Description |
   |---|---|
   | `http://localhost:3000/` | Redirects to the landing page |
   | `http://localhost:3000/landing/` | Public landing page |
   | `http://localhost:3000/dashboard` | Dashboard (requires Clerk sign-in) |
   | `http://localhost:3000/demo/` | Monitored demo app that sends events |
   | `http://localhost:3000/dashboard-demo/` | Static dashboard preview (no sign-in) |

## Environment Variables

All configuration is via environment variables. Copy [`.env.example`](.env.example) to `.env` and fill in the values you need — it documents every variable with comments. Highlights:

| Variable | Required | Description |
|---|---|---|
| `CLERK_PUBLISHABLE_KEY` | For real auth | Clerk publishable key (`pk_test_...` / `pk_live_...`). |
| `SUPABASE_URL` | For persistence | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | For persistence | Supabase service-role key. |
| `SUPABASE_ANON_KEY` | Optional | Supabase anon key (fallback when no service-role key). |
| `SUPABASE_P3_EVENTS_TABLE` | No | Events table name (default `prototype3_events`). |
| `DEFAULT_INGEST_OWNER_USER_ID` | No | **Temporary** demo-only owner for unauthenticated external events. Replace with project/app keys for production. |
| `GMAIL_ADDRESS` / `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` | For alerts | Gmail OAuth credentials for threshold alert emails. |
| `PORT` | No | Server port (Render sets this automatically; default `3000`). |

> Never commit `.env` or a generated `clerk-config.js` containing a real key. Only `.env.example` and `clerk-config.example.js` carry placeholders.

### Database setup (Supabase only)

If using Supabase, run the SQL in [`docs/architecture/auth-workflow.md`](docs/architecture/auth-workflow.md) (or the snippet below) once in the Supabase SQL editor to create the `prototype3_events` and `app_users` tables and grant the service role access:

```sql
create table if not exists public.prototype3_events (
  id text primary key,
  type text not null,
  event_name text,
  timestamp timestamptz not null,
  session_id text,
  user_id text,
  route text,
  deploy_version text,
  app_name text,
  environment text,
  sdk_version text,
  data jsonb default '{}'::jsonb,
  received_at timestamptz not null
);
create index if not exists idx_prototype3_events_type on public.prototype3_events(type);
create index if not exists idx_prototype3_events_user_received_at on public.prototype3_events(user_id, received_at);

create table if not exists public.app_users (
  clerk_user_id text primary key,
  email text not null default '',
  display_name text not null default '',
  timezone text not null default '',
  last_seen_at timestamptz not null
);

grant usage on schema public to service_role;
grant select, insert, update, delete on public.prototype3_events to service_role;
grant select, insert, update, delete on public.app_users to service_role;
```

## Running Tests

```bash
npm run test:unit   # Jest unit tests for src/backend pure modules (no server needed)
npm run test:e2e    # Playwright end-to-end tests (start the server first; see below)
npm run docs:js     # Generate JSDoc API docs into docs/api/ (gitignored)
```

The end-to-end tests target a running server. Start it in one terminal (`npm start`) and run `npm run test:e2e` in another, or set `BASE_URL` to point at a different host. CI starts the server in the background automatically — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml), which also runs HTML/CSS/JS validation and a dependency audit. More detail in [`tests/README.md`](tests/README.md).

## Deployment

- **Backend (Render):** the Render service runs `npm start`, which generates `clerk-config.js` from `CLERK_PUBLISHABLE_KEY` and boots `src/backend/server.js`. Set `CLERK_PUBLISHABLE_KEY`, the `SUPABASE_*` variables, and any alert/`DEFAULT_INGEST_OWNER_USER_ID` values under Render → Environment.
- **Database (Supabase):** provision the `prototype3_events` and `app_users` tables (see above). The backend uses the service-role key server-side only.
- **External test app (GitHub Pages):** a static page embeds the SDK pointed at the Render `/api/events` endpoint. GitHub Pages serves static files only and runs neither the backend nor the database.
- **Clerk:** add `CLERK_PUBLISHABLE_KEY` to the backend environment; the publishable key is the only Clerk value exposed to the browser.

## Documentation

Start at the documentation index: [`docs/README.md`](docs/README.md).

- **Architecture:** [`docs/architecture/`](docs/architecture/) (system overview, API contracts, event schemas, auth workflow)
- **Decisions:** [`docs/adr/`](docs/adr/) (Architecture Decision Records)
- **Process & onboarding:** [`docs/process/`](docs/process/) (workflow, git workflow, JSDoc standards, [code-review feedback](docs/process/code-review-feedback.md))
- **Product & planning:** [`docs/product/`](docs/product/), [`docs/planning/`](docs/planning/) (sprint plans + retrospectives)
- **Generated API docs:** run `npm run docs:js` to produce `docs/api/` (gitignored)
- **Security policy:** [`SECURITY.md`](SECURITY.md)

## Known Limitations / Future Work

- **Temporary demo owner mapping.** `DEFAULT_INGEST_OWNER_USER_ID` hard-maps all unauthenticated external events to one owner. This should be replaced with a multi-tenant **project/app key** ingestion model.
- **Archived prototypes.** Prototype 1 and 2 remain under `archive/` for history only; they are not part of the active product.
- **Production hardening.** Further defense-in-depth (e.g. Supabase RLS scoped to the Clerk `sub` claim) is recommended before broad production use.
- **Alerting.** Alerting is threshold-based and email-only today; richer routing and recipient management are future work.

## Team / Course Context

WatchTower is the CSE 110 (Spring 2026) Team 09 course project. Roles:

| Role | Member |
|------|--------|
| Technical Lead / CI-CD / Architecture | Aditya |
| Product / Process / Sprint Documentation Lead | Fahad |
| Frontend Lead | James |
| UI/UX Lead | Hieu |
| Instrumentation / Backend Prototype Lead | Daniel |
| JavaScript Instrumentation Owner | Jason |
| Data / Backend Logic Owner | Waleed |
| Documentation / Communication / Requirements Support | Josh |
| Research / QA / AI Tools Support | Woosik |
| Frontend Prototype Support | Alex |
| Frontend Components / Styling Support | Hemendra |

- **Team status video:** [YouTube](https://youtu.be/9Bn4ElbA7Js)
- **Task tracking:** [Google Sheets](https://docs.google.com/spreadsheets/d/1YbTkdP8IoodHzIj99lgunic5pRqk6BzqM248CaaaCRw/)

## Handoff / Private Video

This repository is prepared for CSE 110 project handoff. The private handoff video should be uploaded as an unlisted YouTube video and linked here before submission.

- **Private handoff video:** TODO - add unlisted YouTube link
- **Onboarding guide:** [docs/onboard.md](docs/onboard.md)
- **Documentation index:** [docs/README.md](docs/README.md)

The video should cover:

- Team name and number
- How to access the repo
- Repo organization
- How to run WatchTower
- A small change demo and build/test process
- CI/CD pipeline explanation
- Agile retrospective: what worked, what did not, and what the team learned
- Future work for the next team

## Contributing

1. Review the [workflow guidelines](docs/process/workflow.md).
2. Follow the [git workflow](docs/process/git-workflow.md) and Conventional Commits.
3. Update documentation in the same PR as the code change.
4. Major decisions get an ADR in [`docs/adr/`](docs/adr/).
