# WatchTower — Auth Pages

Static Login, Sign Up, and Forgot Password pages for WatchTower.  
Pure frontend — no backend, no API calls, no database.  
Ready for backend wiring in future sprints.

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
│   ├── watchtower-logo.png       # Main logo (light background)
│   └── watchtower-dark-logo.png  # Dark background variant
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
