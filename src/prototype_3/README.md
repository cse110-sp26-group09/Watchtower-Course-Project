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
SUPABASE_P3_USERS_TABLE=app_users
ACTIVE_USER_WINDOW_MS=30000
```

The `SUPABASE_P3_EVENTS_TABLE` value defaults to `prototype3_events`, and
`SUPABASE_P3_USERS_TABLE` defaults to `app_users`. The tables should already
exist in Supabase with this shape:

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
create index if not exists idx_prototype3_events_user_received_at
  on public.prototype3_events(user_id, received_at);
create index if not exists idx_prototype3_events_user_type_received_at
  on public.prototype3_events(user_id, type, received_at);
create index if not exists idx_prototype3_events_user_route_received_at
  on public.prototype3_events(user_id, route, received_at);

create table if not exists public.app_users (
  clerk_user_id text primary key,
  email text default '',
  display_name text default '',
  last_seen_at timestamptz not null
);

create index if not exists idx_app_users_last_seen_at
  on public.app_users(last_seen_at);

grant usage on schema public to service_role;
grant select, insert, update, delete on public.prototype3_events to service_role;
grant select, insert, update, delete on public.app_users to service_role;
```

Prototype 1 remains separate and can continue using its own `events` table.

## Alert emails

Prototype 3 sends threshold alert emails from server-side WatchTower telemetry
only. Demo pages and browser telemetry payloads do not provide recipient email
addresses.

Alert recipients are intentionally disabled for now. The threshold and mailer
template remain in place, but `getClerkAlertRecipients()` returns an empty list
until Clerk-backed delivery is restored.

Configure Gmail OAuth and alert controls:

```env
GMAIL_ADDRESS=akatsuki.watchtower@gmail.com
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
ERROR_ALERT_THRESHOLD=5
ERROR_ALERT_WINDOW_MS=300000
ALERT_COOLDOWN_MS=900000
```

The default alert condition is 5 stored error events in 5 minutes, with one
email at most every 15 minutes. Later, restore recipient selection with Clerk's
Backend API for every registered WatchTower user with a verified primary email.

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
