# Authentication Workflow (Clerk) — Prototype 1

This document describes how authentication works for the WatchTower dashboard in
the **Prototype 1** flow. We use [Clerk](https://clerk.com) for all real
authentication. WatchTower keeps its own UI shell (landing, login, signup) and
delegates identity, sessions, sign-in, sign-up, password reset, and sign-out to
Clerk.

> **Decision record:** see
> [`docs/adr/ADR-0006-use-clerk-for-dashboard-auth.md`](../adr/ADR-0006-use-clerk-for-dashboard-auth.md).

---

## End-to-end flow

```
Landing Page (public)
   src/Landing-Page/index.html
        │  "Get Started" / Login
        ▼
Login / Signup (our shell + Clerk component)
   src/Log-In-Page/login.html   → #clerk-sign-in
   src/Log-In-Page/signup.html  → #clerk-sign-up
        │  Clerk authenticates and starts a session
        ▼
Protected WatchTower UI
   src/prototype_1/index.html   (guarded by auth-guard.js)
        │  Logout
        ▼
Back to Landing Page (public)
```

---

## Page-by-page responsibilities

### 1. Public landing page — `src/Landing-Page/index.html`
- Fully public. No authentication is required or attempted here.
- The "Get Started" / primary CTA routes to `../Log-In-Page/login.html`
  (file/static flow). The login page links onward to `signup.html`.

### 2. Login / signup pages — `src/Log-In-Page/`
- We keep our own branding, header, and card layout (the "UI shell").
- The previous **fake** password forms have been removed. They never performed
  real authentication and never sent passwords anywhere — they only did
  client-side validation. No migration of credentials was needed.
- `login.html` contains `<div id="clerk-sign-in"></div>`; `signup.html`
  contains `<div id="clerk-sign-up"></div>`.
- Load order on both pages:
  1. `./clerk-config.js` — exposes `window.CLERK_PUBLISHABLE_KEY`.
  2. `./auth.js` — loads Clerk, mounts the component, handles redirects.
- After a successful sign-in or sign-up, Clerk redirects to
  `../prototype_1/index.html`.
- If an already-signed-in user opens login/signup, `auth.js` redirects them
  straight to the dashboard.
- `forgot-password.html` no longer pretends to send reset emails; it points
  users to the "Forgot password?" link inside Clerk's sign-in box.

### 3. Protected dashboard — `src/prototype_1/index.html`
- Load order:
  1. `../Log-In-Page/clerk-config.js` — publishable key.
  2. `./auth-guard.js` — client-side route guard (in `<head>`).
  3. `./app.js` — the existing dashboard logic (unchanged).
- `auth-guard.js` hides the dashboard shell until Clerk confirms a session.
  - **Signed in:** the shell is revealed, the user label
    (`#auth-user-label`) is populated, and logout controls are wired.
  - **Signed out / Clerk fails to load / key missing:** the guard *fails
    closed* and redirects to `../Log-In-Page/login.html`.

---

## Logout behavior
- A `#logout-button` lives in the dashboard topbar; the existing Settings →
  "Sign out" button (`#sign-out-button`) is also wired.
- Both call `Clerk.signOut()` and then redirect to the public landing page
  (`../Landing-Page/index.html`).

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
| Event ingestion + SQLite storage | WatchTower (unrelated to user auth) |

### Why WatchTower does not store passwords
Storing passwords means owning hashing, salting, breach response, reset flows,
and compliance. Clerk is purpose-built for this. By delegating, WatchTower never
receives a password, so there is nothing sensitive to leak from our database or
backend. The Prototype 1 SQLite database stores **telemetry events only** — no
credentials.

---

## Why frontend-only protection is acceptable for the prototype
- Prototype 1's goal is to demonstrate the dashboard experience and the
  landing → login → dashboard journey, not to harden a production deployment.
- The guard meaningfully improves the demo: anonymous users are bounced to
  login and never see dashboard content.
- It is explicitly **not** a security boundary: a determined user could call the
  open `/api/*` endpoints directly. That is an accepted, documented limitation.

### Future backend verification plan
- The Prototype 1 server (`src/prototype_1/server/server.js`) currently serves
  static files and the `/api/events`, `/api/stats`, `/api/health`,
  `/api/events/stream` endpoints **without** auth.
- For production, protected dashboard API routes must verify the Clerk
  **session token** server-side (e.g. via Clerk's backend SDK / JWKS
  verification) before returning data. The browser would attach the token from
  `Clerk.session.getToken()` as a `Bearer` header.
- The SQLite layer and event schema do not change for this — only an auth
  middleware is added in front of the protected routes.

---

## Dashboard user auth vs SDK event ingestion auth (important distinction)

These are **two different authentication problems** and must not be conflated:

| | Dashboard user auth | SDK event ingestion auth |
| --- | --- | --- |
| Who authenticates | A human operator viewing dashboards | A monitored application sending events |
| Mechanism | Clerk login/signup/session | A future per-app/project key or token |
| Requires a user login? | Yes | **No** — must work headless/server-side |
| Implemented today | Clerk (this work) | Not yet — ingestion is currently open |

The browser SDK (`src/prototype_1/sdk/watchtower.js`) and the ingestion endpoint
should **never** require a normal Clerk user login. A separate app/project key
or signed token is the correct future mechanism so that monitored apps can send
telemetry without a human signing in.

---

## Configuration & secrets
- The only Clerk value in the frontend is the **publishable key**, written at
  runtime to `src/Log-In-Page/clerk-config.js` by `npm run config:clerk` from
  the `CLERK_PUBLISHABLE_KEY` environment variable (see `.env.example`).
- `clerk-config.js` is **gitignored** — set the key in a local `.env` file or in
  Render Environment settings, not in committed source.
- **Never** add a Clerk *secret* key to any frontend file or commit it. Secret
  keys belong only on a backend, in environment variables, when backend
  verification is added later.

### Note on running via the Prototype 1 Node server
The cross-folder paths (`../Log-In-Page/clerk-config.js`) are designed for the
static/file flow where `src/` is the served root. The Prototype 1 Node server
(`npm run start:prototype1`) serves only the `prototype_1/` directory, so it does
**not** serve the Log-In-Page assets. The Clerk-guarded flow is intended for the
static file flow; wiring the guard into the Node server is a follow-up task.

---

## Manual verification steps

1. Open `src/Landing-Page/index.html`.
2. Click **Get Started / Login**.
3. Confirm `src/Log-In-Page/login.html` loads.
4. Confirm the Clerk **sign-in** UI appears inside the card.
5. Sign in through Clerk.
6. Confirm redirect to `src/prototype_1/index.html`.
7. Refresh the dashboard while signed in.
8. Confirm you stay on the WatchTower UI (no bounce to login) and the user
   label shows your email/username.
9. Click **Logout**.
10. Confirm redirect to the landing (or login) page.
11. Open `src/prototype_1/index.html` directly while signed out.
12. Confirm you are redirected to the login page.
13. Open `src/Log-In-Page/signup.html`.
14. Confirm the Clerk **sign-up** UI appears.
15. Sign up and confirm redirect to the Prototype 1 dashboard.

### Automated checks (unaffected by this work)
```bash
npm run test:unit   # event-store + shared utils
npm run test:e2e    # Playwright; boots its own Prototype 1 server on port 3110
npm run docs:js     # JSDoc generation
```
These cover SQLite/event tracking and are intentionally not weakened by the auth
changes.
