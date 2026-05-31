# WatchTower Prototype 3

Prototype 3 merges the strongest parts of `prototype_1` and `prototype_2` into one app shell and one visual system.

## Goals

- Keep one consistent UI/UX and color scheme in both light and dark mode.
- Support two dashboard perspectives from the same frontend and backend data:
  - `Manager view` for concise, high-level monitoring.
  - `Developer view` for deeper diagnostics and route/version pressure signals.
- Stay compatible with the same monitored demo/backend event flow (`/api/stats`, `/api/events`, SSE stream).

## Run

From project root:

```bash
npm run start:prototype3
```

Open:

- Dashboard: `http://localhost:3000/`
- Demo app: `http://localhost:3000/demo`

## Storage

Prototype 3 uses Supabase/PostgreSQL when Supabase credentials are configured.
Use the same Supabase project keys as the rest of the app, while keeping
Prototype 3 pointed at its own table:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_P3_EVENTS_TABLE=prototype3_events
ACTIVE_USER_WINDOW_MS=30000
```

The `SUPABASE_P3_EVENTS_TABLE` value defaults to `prototype3_events`. The table
should already exist in Supabase with this shape:

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

create index if not exists idx_prototype3_events_type
  on public.prototype3_events(type);
create index if not exists idx_prototype3_events_event_name
  on public.prototype3_events(event_name);
create index if not exists idx_prototype3_events_session_id
  on public.prototype3_events(session_id);
create index if not exists idx_prototype3_events_environment
  on public.prototype3_events(environment);
create index if not exists idx_prototype3_events_received_at
  on public.prototype3_events(received_at);

grant usage on schema public to service_role;
grant select, insert, update, delete on public.prototype3_events to service_role;
```

Prototype 1 remains separate and can continue using its own `events` table.

## CORS

The API defaults to permissive CORS for prototype work. Set
`CORS_ALLOWED_ORIGINS` to a comma-separated allowlist before exposing the
backend publicly:

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-demo-site.example
```

## Included in this merged baseline

- Sidebar + topbar navigation from the `prototype_1` style system.
- Settings-based `Dashboard mode` selector (Manager vs Developer).
- Manager summary panels for simplified operational status.
- Developer diagnostics panels for route latency, version error concentration, event mix, and route pressure.
- Existing dark mode toggle and settings controls.
