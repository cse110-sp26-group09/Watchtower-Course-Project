# Authentication Workflow (Clerk) — Prototype 3

This document describes how authentication works for the WatchTower dashboard in
the **Prototype 3** flow. We use [Clerk](https://clerk.com) for all real
authentication. WatchTower keeps its own UI shell (landing, login, signup) and
delegates identity, sessions, sign-in, sign-up, password reset, and sign-out to
Clerk.

> **Decision record:** see
> [`docs/adr/ADR-0006-use-clerk-for-dashboard-auth.md`](../adr/ADR-0006-use-clerk-for-dashboard-auth.md).

---

## End-to-end flow

```
Landing Page (public)
   src/prototype_3/Landing-Page/index.html
        │  "Get Started" / Login
        ▼
Login / Signup (our shell + Clerk component)
   src/prototype_3/Log-In-Page/login.html   → #clerk-sign-in
   src/prototype_3/Log-In-Page/signup.html  → #clerk-sign-up
        │  Clerk authenticates and starts a session
        ▼
Protected WatchTower UI
   src/prototype_3/index.html   (guarded by auth-guard.js)
        │  Logout
        ▼
Back to Landing Page (public)
```

---

## Page-by-page responsibilities

### 1. Public landing page — `src/prototype_3/Landing-Page/index.html`
- Fully public. No authentication is required or attempted here.
- The "Get Started" / primary CTA routes to the login page (`/login` when served
  by the Node server, or `../Log-In-Page/login.html` in the static/file flow).

### 2. Login / signup pages — `src/prototype_3/Log-In-Page/`
- We keep our own branding, header, and card layout (the "UI shell").
- The previous **fake** password forms have been removed. They never performed
  real authentication and never sent passwords anywhere — they only did
  client-side validation. No migration of credentials was needed.
- `login.html` contains `<div id="clerk-sign-in"></div>`; `signup.html`
  contains `<div id="clerk-sign-up"></div>`.
- Load order on both pages:
  1. `./clerk-config.js` — exposes `window.CLERK_PUBLISHABLE_KEY`.
  2. `./auth.js` — loads Clerk, mounts the component, handles redirects.
- After a successful sign-in or sign-up, Clerk redirects to `../index.html`
  (the Prototype 3 dashboard).
- If an already-signed-in user opens login/signup, `auth.js` redirects them
  straight to the dashboard.
- `forgot-password.html` no longer pretends to send reset emails; it points
  users to the "Forgot password?" link inside Clerk's sign-in box.

### 3. Protected dashboard — `src/prototype_3/index.html`
- Load order:
  1. `./Log-In-Page/clerk-config.js` — publishable key.
  2. `./auth-guard.js` — client-side route guard (in `<head>`).
  3. `app.js` — the existing dashboard logic (unchanged).
- `auth-guard.js` hides the dashboard shell until Clerk confirms a session.
  - **Signed in:** the shell is revealed, the user label
    (`#auth-user-label`) is populated, logout controls are wired, and the guard
    upserts the user into Supabase via `POST /api/users/sync` (see below).
  - **Signed out / Clerk fails to load / key missing:** the guard *fails
    closed* and redirects to `./Log-In-Page/login.html`.
- All dashboard data fetches in `app.js` (`/api/events`, `/api/stats`,
  `/api/developer/stream`, `/api/developer/insights`, `/api/developer/query`)
  send an `X-Clerk-User-Id` header so the backend returns only that user's data.

---

## Per-user data scoping

WatchTower keeps **Clerk as the only authentication provider** and uses
**Supabase purely as the application database** — there is no Supabase Auth and
no password is ever stored.

| Concern | Where it lives |
| --- | --- |
| Identity / sessions / sign-in | Clerk |
| Application users | Supabase `public.app_users` (keyed by `clerk_user_id`) |
| Telemetry events | Supabase `public.prototype3_events`, scoped by `user_id` |

### How a user is recognized
1. After Clerk confirms a session, `auth-guard.js` calls `POST /api/users/sync`
   with `{ clerkUserId, email, displayName }` and an `X-Clerk-User-Id` header.
2. The server calls `eventStore.syncUser(...)`, which **upserts** a row into
   `app_users` (`clerk_user_id`, `email`, `display_name`, `last_seen_at`). No
   password or credential is stored — Clerk owns those.

### How data is scoped
- Dashboard read routes (`GET /api/events`, `GET /api/stats`,
  `GET /api/developer/stream`, `GET /api/developer/insights`,
  `POST /api/developer/query`) call `requireCurrentUser(...)`. With no
  `X-Clerk-User-Id` header they return **401**.
- They load events with `eventStore.listEvents(limit, { userId })` /
  `eventStore.allEvents(limit, { userId })`, which filter
  `prototype3_events.user_id = <Clerk user id>`.
- `POST /api/events` reads the same header and, when present, stamps each
  incoming event with `user_id = <Clerk user id>` before insert.

### Monitored ShopDemo bridge (`/demo/`)
- The demo is a same-origin stand-in for an external monitored app. Its SDK
  sends events to `POST /api/events` **without** the dashboard's Clerk header.
- So the dashboard can show demo-generated events, `auth-guard.js` stores the
  signed-in Clerk id in `localStorage` (`watchtower_clerk_user_id`), and
  `demo/app.js` initializes the SDK with `userId = <that id>`. The id then rides
  in the event payload and is persisted as `prototype3_events.user_id`.
- Open `/demo/` **after** signing in to the dashboard (or refresh it) so the id
  is present. A truly external app on another origin has no such id and ingests
  as anonymous (`user_id = null`) — which is the intended future "needs a
  project/app key" path.

### Resulting behavior
- **First-time user:** no rows yet, so stats and feeds start at **0**.
- **Returning user:** the same `clerk_user_id` filters back the rows persisted
  during earlier sessions, so they see their saved data after logging back in.
- **Different user:** a different `clerk_user_id` never matches the first
  user's `user_id`, so users cannot see each other's events.

### Trust model & token verification
The backend resolves the current user id with this preference order
(`resolveCurrentUserId` in `server.js`):

1. **Verified Clerk session JWT** — the browser sends
   `Authorization: Bearer <Clerk.session.getToken()>`. The server verifies the
   signature against Clerk's public **JWKS** (`<issuer>/.well-known/jwks.json`)
   and the `iss` claim, then takes the user id from the signed `sub` claim.
   This is cryptographically authoritative and cannot be spoofed.
2. **`X-Clerk-User-Id` header fallback** — used **only** when token verification
   is not configured (no real Clerk key, e.g. CI / local memory-store runs) or
   when `WATCHTOWER_TRUST_USER_HEADER=true` is explicitly set.

The Clerk **issuer** (Frontend API origin, e.g.
`https://your-app.clerk.accounts.dev`) is derived from `CLERK_PUBLISHABLE_KEY`
(base64-encoded inside the key) or set explicitly via `CLERK_JWT_ISSUER`.
**No Clerk secret key is needed** — JWKS verification uses only public keys.

When a real Clerk instance is configured, the dashboard routes **require** a
valid token: a request with only a (forged) `X-Clerk-User-Id` header and no
valid token is rejected with 401.

---

## Logout behavior
- A `#logout-button` lives in the dashboard topbar; the existing Settings →
  "Sign out" button (`#sign-out-button`) is also wired.
- Both call `Clerk.signOut()` and then redirect to the public landing page
  (`./Landing-Page/index.html`).

---

## Clerk vs WatchTower responsibilities

| Concern | Owner |
| --- | --- |
| Sign-in / sign-up UI components | Clerk (mounted into our shell) |
| Password handling & storage | **Clerk only** — WatchTower stores nothing |
| Sessions & tokens | Clerk |
| Password reset / email verification | Clerk |
| Page branding & layout shell | WatchTower |
| Routing between landing/login/dashboard | WatchTower |
| Event ingestion + storage | WatchTower (unrelated to user auth) |

### Why WatchTower does not store passwords
Storing passwords means owning hashing, salting, breach response, reset flows,
and compliance. Clerk is purpose-built for this. By delegating, WatchTower never
receives a password, so there is nothing sensitive to leak from our database or
backend. The dashboard stores **telemetry events only** — no credentials.

---

## Protection model
- Prototype 3 demonstrates the dashboard experience, the
  landing → login → dashboard journey, and **per-user data isolation**.
- The client guard bounces anonymous users to login so they never see dashboard
  content.
- The dashboard read routes (`GET /api/events`, `GET /api/stats`,
  `GET /api/developer/stream`, `GET /api/developer/insights`,
  `POST /api/developer/query`) require an authenticated user (401 otherwise) and
  scope all data to that user.
- When a real Clerk instance is configured, the user id comes from a
  **verified Clerk session JWT** (see "Trust model & token verification"), so it
  cannot be spoofed. The `X-Clerk-User-Id` header is only a fallback for
  unconfigured/test environments.
- `POST /api/events`, `POST /api/beacon`, and `/api/events/stream` remain open so
  external/SDK ingestion keeps working without a dashboard login.

### Remaining hardening (optional, defense-in-depth)
- Token verification is enforced at the API layer. A further step is to push
  scoping into the database via **Supabase RLS** using the Clerk Third-Party
  Auth integration (policies on `auth.jwt() ->> 'sub'`), so even an API bug
  cannot leak cross-user rows. This requires the DB client to carry the Clerk
  token (the server currently uses the service-role key, which bypasses RLS).
- The event schema does not change for any of this.

---

## Dashboard user auth vs SDK event ingestion auth (important distinction)

These are **two different authentication problems** and must not be conflated:

| | Dashboard user auth | SDK event ingestion auth |
| --- | --- | --- |
| Who authenticates | A human operator viewing dashboards | A monitored application sending events |
| Mechanism | Clerk login/signup/session | A future per-app/project key or token |
| Requires a user login? | Yes | **No** — must work headless/server-side |
| Implemented today | Clerk (this work) | Not yet — ingestion is currently open |

The browser SDK (`src/prototype_3/sdk/watchtower.js`) and the ingestion endpoint
should **never** require a normal Clerk user login. A separate app/project key
or signed token is the correct future mechanism so that monitored apps can send
telemetry without a human signing in.

---

## Configuration & secrets
- The only Clerk value in the frontend is the **publishable key**, written at
  runtime to `src/prototype_3/Log-In-Page/clerk-config.js` by
  `npm run config:clerk` from the `CLERK_PUBLISHABLE_KEY` environment variable
  (see `.env.example`).
- `clerk-config.js` is **gitignored** — set the key in a local `.env` file or in
  Render Environment settings, not in committed source.
- **Never** add a Clerk *secret* key to any frontend file or commit it. Secret
  keys belong only on a backend, in environment variables, when backend
  verification is added later.

### Running via the Prototype 3 Node server
```bash
npm run start:prototype3   # runs config:clerk, then boots the prototype_3 server
```
The Prototype 3 server serves the dashboard at `/` and `/dashboard`, the login
shell at `/login`, and the landing page at `/landing/`. Because the Landing-Page
and Log-In-Page now live inside `src/prototype_3/`, the server resolves all three
from the prototype_3 directory, so the full Clerk flow works end to end through
the Node server (not just the static file flow).

---

## Manual verification steps

1. Set `CLERK_PUBLISHABLE_KEY` in `.env`, then run `npm run start:prototype3`.
2. Open `http://localhost:3000/landing/`.
3. Click **Get Started / Login**.
4. Confirm the login page loads at `/login`.
5. Confirm the Clerk **sign-in** UI appears inside the card.
6. Sign in through Clerk.
7. Confirm redirect to the Prototype 3 dashboard (`/` or `/index.html`).
8. Refresh the dashboard while signed in.
9. Confirm you stay on the WatchTower UI (no bounce to login) and the user
   label shows your email/username.
10. Click **Logout**.
11. Confirm redirect to the landing (or login) page.
12. Open the dashboard directly while signed out.
13. Confirm you are redirected to the login page.
14. Open the signup page.
15. Confirm the Clerk **sign-up** UI appears, and signing up redirects to the
    Prototype 3 dashboard.

### Per-user scoping verification (requires Supabase configured)
1. Sign in as **User A**.
2. In Supabase, confirm a row for User A appears in `app_users`
   (`clerk_user_id` = User A's Clerk id, with `last_seen_at` set).
3. Confirm User A's dashboard shows their own stats/events (a brand-new user
   starts at **0**).
4. Generate events as User A (the dashboard sends `X-Clerk-User-Id`, so new
   `prototype3_events` rows get `user_id` = User A's Clerk id).
5. Log out, then log back in as User A.
6. Confirm User A still sees the same saved events/stats.
7. Sign in as a different **User B**.
8. Confirm User B starts at **0** and does **not** see any of User A's data.

### Automated checks
```bash
npm run test:unit   # event-store + shared utils
npm run test:e2e    # Playwright
npm run docs:js     # JSDoc generation
```
The Playwright API specs send an `X-Clerk-User-Id` header so they post and read
back events as a single synthetic user, validating the per-user scoping without
weakening external SDK ingestion (which stays open).
