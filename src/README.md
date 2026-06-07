# Source Code

This directory contains the active WatchTower implementation (the current
product, formerly "Prototype 3"). Historical prototypes live in
[`../archive/`](../archive/).

## Layout

```
src/
├── backend/        # Framework-free Node.js HTTP server + data layer
│   ├── server.js               # Routing, API endpoints, static serving, SSE
│   ├── server-helpers.js       # Pure ingestion/stream/query helpers (unit-tested)
│   ├── event-store.js          # Supabase/Postgres store with in-memory fallback
│   ├── mailer.js               # Gmail-OAuth threshold alert emails
│   ├── alert-threshold.js      # Error-rate threshold evaluation
│   └── clerk-alert-recipients.js # Optional Clerk-sourced alert recipients
│
├── frontend/       # Browser UI served by the backend
│   ├── dashboard/              # Authenticated dashboard (index.html, app.js, auth-guard.js, style.css)
│   ├── landing/                # Public landing page (served at /landing/)
│   ├── auth/                   # Clerk login/signup/forgot pages (served at /login/)
│   ├── demo/                   # Monitored ShopDemo app (served at /demo/)
│   ├── dashboard-demo/         # Static dashboard preview (served at /dashboard-demo/)
│   └── assets/                 # Shared images, logos, team photos (served at /assets/)
│
├── sdk/            # Browser SDK that monitored apps embed
│   └── watchtower.js           # Served at /sdk/watchtower.js
│
└── shared/         # Cross-cutting utilities
    └── utils/event-utils.js    # Event validation/normalization (source of truth)
```

## Running

From the repository root:

```bash
npm start    # runs config:clerk, then boots src/backend/server.js on :3000
```

Served routes:

| URL | Page |
|---|---|
| `/` | Redirects to `/landing/` |
| `/landing/` | Public landing page |
| `/login/` | Clerk login / signup |
| `/dashboard` | Authenticated dashboard |
| `/demo/` | Monitored ShopDemo |
| `/dashboard-demo/` | Static dashboard preview |
| `/sdk/watchtower.js` | Browser SDK |
| `/api/*` | JSON ingestion & dashboard APIs |

See the root [README](../README.md) for full setup, environment variables, and
deployment details, and [`docs/architecture/auth-workflow.md`](../docs/architecture/auth-workflow.md)
for the authentication flow.

## Technologies

HTML, CSS, JavaScript, Node.js, PostgreSQL/Supabase, Render, Clerk, the Beacon
API, and Navigation Timing.

## Related Documentation

- [Project Overview](../README.md)
- [Architecture Decisions](../docs/adr/)
- [Development Workflow](../docs/process/workflow.md)
