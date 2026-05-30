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
    (`#auth-user-label`) is populated, and logout controls are wired.
  - **Signed out / Clerk fails to load / key missing:** the guard *fails
    closed* and redirects to `./Log-In-Page/login.html`.

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

## Why frontend-only protection is acceptable for the prototype
- Prototype 3's goal is to demonstrate the dashboard experience and the
  landing → login → dashboard journey, not to harden a production deployment.
- The guard meaningfully improves the demo: anonymous users are bounced to
  login and never see dashboard content.
- It is explicitly **not** a security boundary: a determined user could call the
  open `/api/*` endpoints directly. That is an accepted, documented limitation.

### Future backend verification plan
- The Prototype 3 server (`src/prototype_3/server/server.js`) currently serves
  static files and the `/api/events`, `/api/stats`, `/api/developer/*`, and
  `/api/events/stream` endpoints **without** auth.
- For production, protected dashboard API routes must verify the Clerk
  **session token** server-side (e.g. via Clerk's backend SDK / JWKS
  verification) before returning data. The browser would attach the token from
  `Clerk.session.getToken()` as a `Bearer` header.
- The event schema does not change for this — only an auth middleware is added
  in front of the protected routes.

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

### Automated checks (unaffected by this work)
```bash
npm run test:unit   # event-store + shared utils
npm run test:e2e    # Playwright
npm run docs:js     # JSDoc generation
```
These cover event tracking and are intentionally not weakened by the auth
changes.
