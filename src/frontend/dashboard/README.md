# Dashboard (`src/frontend/dashboard`)

**Status:** Active. The authenticated WatchTower dashboard, served at `/dashboard`.

| File | Purpose |
|---|---|
| `index.html` | Single-page dashboard shell (Home, Issues, Health, Analytics, Settings). |
| `app.js` | Fetches live data from `/api/*` and renders every view; manager/developer modes. |
| `auth-guard.js` | Client-side Clerk route guard; hides the shell until a session is confirmed and redirects anonymous users to `/login/`. |
| `style.css` | Dashboard styling (light/dark themes). |

## Notes

- The guard relies on `/login/clerk-config.js` (generated, gitignored) being
  loaded before `auth-guard.js`.
- Client-side guarding is UX-level only; the backend independently scopes and
  authorizes API reads. See
  [`docs/architecture/auth-workflow.md`](../../../docs/architecture/auth-workflow.md).

See [`../README.md`](../README.md) for the frontend overview.
