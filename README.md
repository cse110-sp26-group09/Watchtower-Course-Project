# WatchTower

A lightweight observability platform that captures and visualizes real user events, JavaScript errors, performance metrics, and user interactions through an intuitive real-time dashboard.

## About WatchTower

WatchTower helps development teams understand what's happening in production. By capturing user events, tracking errors, and monitoring performance, teams gain visibility into application health and user experience in real time.

### Key Features

- **JavaScript Error Tracking** – Automatically capture and categorize unhandled errors
- **Performance Monitoring** – Track page load times and latency per route
- **User Interaction Capture** – Record user actions and session events
- **Real-Time Dashboard** – View error feeds, latency charts, and active user counts
- **Version Tracking** – Tie errors to specific deployments for faster debugging
- **Event Storage & Filtering** – Query and analyze historical events

## Quick Start

### Running Prototype 3 (Current)

**Prerequisites:** Node.js 18 or later, npm.

**1. Clone the repository**

```bash
git clone https://github.com/cse110-sp26-group09/Watchtower-Course-Project.git
cd Watchtower-Course-Project
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable | Required | Description |
|---|---|---|
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (`pk_test_...`). Found in the Clerk dashboard under Configure > API Keys. |
| `SUPABASE_URL` | For persistence | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | For persistence | Supabase service role key. |
| `SUPABASE_P3_EVENTS_TABLE` | No | Events table name. Defaults to `prototype3_events`. |
| `ACTIVE_USER_WINDOW_MS` | No | Active session window in ms. Defaults to `30000`. |
| `PORT` | No | Server port. Defaults to `3000`. |

See `.env.example` for all optional variables including Gmail alert settings and CORS.

**4. Set up the database (Supabase only)**

If using Supabase, run these SQL statements once in the Supabase SQL editor:

```sql
-- Events table
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
create index if not exists idx_prototype3_events_received_at on public.prototype3_events(received_at);

grant usage on schema public to service_role;
grant select, insert, update, delete on public.prototype3_events to service_role;

-- Users table
create table if not exists public.app_users (
  clerk_user_id text primary key,
  email text not null default '',
  display_name text not null default '',
  timezone text not null default '',
  last_seen_at timestamptz not null
);

grant select, insert, update, delete on public.app_users to service_role;
```

If the `app_users` table already exists without the `timezone` column, run this migration:

```sql
alter table public.app_users
  add column if not exists timezone text not null default '';
```

**5. Start the server**

```bash
npm run start:prototype3
```

The start script automatically generates `clerk-config.js` from `CLERK_PUBLISHABLE_KEY` before launching.

**6. Open in the browser**

| URL | Description |
|---|---|
| `http://localhost:3000/` | Main dashboard (requires Clerk sign-in) |
| `http://localhost:3000/demo` | Demo app that sends events to the dashboard |
| `http://localhost:3000/dashboard-demo` | Static dashboard demo (no sign-in required) |

> Without Supabase credentials the server runs with in-memory storage. Events are lost on restart but everything else works for local development.

### For Documentation & Project Info
- **Project Overview** - See [Documentation](docs/README.md)
- **Requirements** - See [Requirements](docs/product/requirements.md)
- **Sprint Planning** - See [Sprint 1 Planning](docs/planning/sprint-1-planning.md)
- **Security Policy** - See [Security Policy](SECURITY.md)

## Project Structure

```
.
├── .github/
│   ├── ISSUE_TEMPLATE/           # GitHub issue templates
│   └── workflows/
│       └── ci.yml                # CI pipeline (lint, HTML/CSS validation, unit + e2e tests)
│
├── docs/
│   ├── adr/                      # Architecture decision records
│   ├── architecture/             # System architecture diagrams and notes
│   ├── back-end/                 # Backend team workflow notes
│   ├── design/                   # Wireframes, user flows, and design notes
│   │   └── media/                # Images, diagrams, and screenshots
│   ├── meetings/                 # Standup notes and TA meeting notes
│   │   └── Sprint/               # Notes organized by sprint (0-4)
│   ├── planning/                 # Sprint plans, backlog, and retrospectives
│   ├── process/                  # Git workflow, conventions, and GenAI usage docs
│   ├── product/                  # MVP definition, requirements, and user stories
│   ├── research/                 # Technical research and investigation notes
│   └── README.md                 # Documentation index
│
├── scripts/
│   └── generate-clerk-config.js  # Generates clerk-config.js from CLERK_PUBLISHABLE_KEY
│
├── src/
│   ├── prototype_3/              # Current active prototype
│   │   ├── Landing-Page/         # Public marketing landing page
│   │   ├── Log-In-Page/          # Clerk-backed authentication pages
│   │   ├── assets/               # Logos, favicons, and team photos
│   │   ├── dashboard-demo/       # Static dashboard demo (no auth required)
│   │   ├── demo/                 # Demo app that fires events at the dashboard
│   │   ├── sdk/
│   │   │   └── watchtower.js     # Client-side instrumentation SDK
│   │   ├── server/
│   │   │   ├── server.js         # Node.js HTTP server and all API routes
│   │   │   ├── event-store.js    # Supabase/in-memory event and user persistence
│   │   │   ├── server-helpers.js # Request parsing, normalization utilities
│   │   │   ├── alert-threshold.js# Error-rate threshold and cooldown logic
│   │   │   ├── clerk-alert-recipients.js # Clerk-backed alert recipient lookup
│   │   │   └── mailer.js         # Gmail OAuth alert email sender
│   │   ├── app.js                # Dashboard frontend (single-page app)
│   │   ├── auth-guard.js         # Clerk session guard and user sync
│   │   ├── index.html            # Dashboard shell
│   │   ├── auth.html             # Auth redirect handler
│   │   ├── landing.html          # Landing page entry point
│   │   ├── style.css             # Dashboard styles
│   │   └── README.md             # Prototype 3 setup and configuration reference
│   ├── prototype_1/              # Archived - original prototype
│   └── prototype_2/              # Archived - second iteration
│
├── tests/
│   ├── e2e/                      # Playwright end-to-end tests
│   ├── unit/                     # Jest unit tests
│   └── README.md                 # Testing overview
│
├── .env.example                  # Environment variable template (copy to .env)
├── .gitignore
├── CHANGELOG.md
├── package.json                  # npm scripts: start, test:unit, test:e2e, docs:js
├── package-lock.json
├── playwright.config.js
├── README.md
└── SECURITY.md
```

For a detailed breakdown of the documentation structure, see [docs/README.md](docs/README.md).

## Working Guidelines

We follow these standards to keep our work organized and clear:

- **Conventional Commits** – Use clear, structured commit messages
- **Feature Branches** – Create branches for all work
- **Documentation First** – Update docs as you change code
- **Code Review** – All changes require review before merging
- **ADRs for Decisions** – Major decisions documented in [docs/adr/](docs/adr/)

## Team Roles

| Role | Responsibility |
|------|----------------|
| **Technical Lead / CI-CD / Architecture** (Aditya) | Repo setup, branch/commit guidelines, GitHub Actions, architecture and technical decisions |
| **Product / Process / Sprint Documentation Lead** (Fahad) | MVP definition, sprint planning, requirements, sprint tracking, TA communication |
| **Frontend Lead** (James) | Dashboard frontend structure, UI pages/components, responsive layout, frontend coordination |
| **UI/UX Lead** (Hieu) | Wireframes, user flow, dashboard design, user-centered design artifacts |
| **Instrumentation / Backend Prototype Lead** (Daniel) | Error/performance event capture, event schemas, data flow, prototype-to-dashboard integration |
| **JavaScript Instrumentation Owner** (Jason) | Browser-side error capture, client-side logging prototype, performance tracking, demo page behavior |
| **Data / Backend Logic Owner** (Waleed) | Data schemas, normalization, storage approach, event flow with Daniel and Jason |
| **Documentation / Communication / Requirements Support** (Josh) | Research docs, MVP and user story docs, meeting notes, GitHub documentation organization |
| **Research / QA / AI Tools Support** (Woosik) | Observability and security research, QA checklists, GenAI contribution documentation |
| **Frontend Prototype Support** (Alex) | Dashboard cards, tables, UI sections, responsiveness and usability testing |
| **Frontend Components / Styling Support** (Hemendra) | Reusable components, styling consistency, dashboard layout, component documentation |

See [docs/planning/sprint-1-planning.md](docs/planning/sprint-1-planning.md) for the full team structure and task assignments.

## Resources

- **Task Tracking**: [Google Sheets](https://docs.google.com/spreadsheets/d/1YbTkdP8IoodHzIj99lgunic5pRqk6BzqM248CaaaCRw/)
- **Documentation**: [docs/](docs/README.md)
- **Decisions & Logs**: [docs/meetings/](docs/meetings/)
- **Research**: [docs/research/](docs/research/)
- **Team Status Video** :[Youtube](https://youtu.be/9Bn4ElbA7Js) , [docs/videos](docs\videos\statusvideo1.mp4)
## Contributing

Before you start work:

1. Review the [workflow guidelines](docs/process/workflow.md)
2. Check the [git workflow](docs/process/git-workflow.md)
3. Understand your role and sprint goals in [planning docs](docs/planning/)

See [docs/README.md](docs/README.md) for complete documentation guidance.
