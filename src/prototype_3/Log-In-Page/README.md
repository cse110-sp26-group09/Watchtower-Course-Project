# WatchTower — Auth Pages

Login and Sign Up pages for WatchTower, using our own UI shell with
**[Clerk](https://clerk.com)** for real authentication, sessions, and sign-out.

WatchTower stores **no passwords** — Clerk owns the credential lifecycle. The
Clerk *publishable* key is injected at runtime into `clerk-config.js` (generated,
gitignored) from the `CLERK_PUBLISHABLE_KEY` environment variable. A Clerk
*secret* key must never be added here or committed.

### Configure Clerk

```bash
cp .env.example .env          # set CLERK_PUBLISHABLE_KEY=pk_test_...
npm run config:clerk          # writes src/prototype_3/Log-In-Page/clerk-config.js
```

On **Render**, add `CLERK_PUBLISHABLE_KEY` under Environment. Start scripts run
`config:clerk` automatically before the server boots.

See [`docs/architecture/auth-workflow.md`](../../docs/architecture/auth-workflow.md)
and [`docs/adr/ADR-0006-use-clerk-for-dashboard-auth.md`](../../docs/adr/ADR-0006-use-clerk-for-dashboard-auth.md).

## How Clerk is wired

- `clerk-config.js` (generated from `CLERK_PUBLISHABLE_KEY`) exposes
  `window.CLERK_PUBLISHABLE_KEY` and loads **before** `auth.js` on both pages.
- `auth.js` derives the Clerk CDN from the key, loads the browser SDK, and:
  - mounts the Sign In component into `#clerk-sign-in` (login.html),
  - mounts the Sign Up component into `#clerk-sign-up` (signup.html),
  - redirects to `../index.html` (the Prototype 3 dashboard) after auth (and
    immediately if a session already exists).
- The earlier fake password forms were removed; they never authenticated anyone
  and never sent passwords anywhere.
- `forgot-password.html` now directs users to Clerk's built-in "Forgot
  password?" link inside the sign-in box.

## Pages

| File                    | Purpose                              |
|-------------------------|--------------------------------------|
| `login.html`            | Sign in with email & password        |
| `signup.html`           | Create a new account                 |
| `forgot-password.html`  | Request a password reset link        |

## Navigation Flow

```
login.html  ──→  signup.html          (via "Create one" link)
signup.html ──→  login.html           (via "Sign in" link)
login.html  ──→  forgot-password.html (via "Forgot password?" link)
forgot-password.html ──→ login.html   (via "Back to sign in" link)
```

## File Structure

```
Log-In-Page/
├── assets/
│   └── watchtower-transparent.png # Transparent WatchTower logo
├── login.html                    # Login page
├── signup.html                   # Sign up page
├── forgot-password.html          # Forgot password page
├── style.css                     # Shared styles for all 3 pages
├── auth.js                       # Shared validation & interactions
└── README.md                     # This file
```

## Features

### Validation UI States
Each input field has 3 visual states controlled by CSS classes:
- **Focus** — Teal border + teal glow (`.field input:focus`)
- **Error** — Coral border + coral glow + inline error message (`.field.has-error`)
- **Valid** — Green border + green glow (`.field.is-valid`)

Validation runs:
1. **On blur** — When the user leaves a field, it validates in real time
2. **On submit** — All fields checked at once; first invalid field gets focus

### Password Strength Meter (Sign Up only)
Shows a colored bar as the user types:
- **Weak** (red) — Less than 8 characters
- **Fair** (amber) — 8+ chars with uppercase, lowercase, and a digit
- **Strong** (green) — 10+ chars with uppercase, lowercase, digit, and symbol

### Show/Hide Password Toggle
Eye icon button inside each password field toggles between `type="password"` and `type="text"`.

### Google Sign Up Button (Sign Up only)
Styled button on the signup page. Not functional without a Google Client ID — visual placeholder for OAuth integration.

## Backend Wiring Guide

When backend is ready, replace the placeholder lines in `auth.js`:

Each form already has:
- `method="POST"` and `action=""` — set the action URL or use fetch()
- `name` attributes on all inputs — ready for `FormData` or JSON body
- Proper `autocomplete` hints — browsers will offer autofill


## How to View

Open any `.html` file directly in a browser — no build step or server needed.
