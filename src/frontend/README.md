# Frontend (`src/frontend`)

**Status:** Active. Browser UI served by the backend ([`../backend`](../backend)).

All pages are plain HTML/CSS/JS (no build step). The backend serves them on
these stable routes:

| Folder | Served at | Description |
|---|---|---|
| [`dashboard/`](dashboard/) | `/dashboard` | Authenticated dashboard (Clerk). |
| [`landing/`](landing/) | `/landing/` | Public marketing/landing page. |
| [`auth/`](auth/) | `/login/` | Clerk login / signup / forgot-password. |
| [`demo/`](demo/) | `/demo/` | Monitored ShopDemo that emits telemetry. |
| `dashboard-demo/` | `/dashboard-demo/` | Static dashboard preview (no sign-in). |
| `assets/` | `/assets/` | Shared images, logos, and team photos. |

## Notes

- `auth/clerk-config.js` is **generated** at startup from
  `CLERK_PUBLISHABLE_KEY` and is gitignored — do not edit or commit it. Only
  `auth/clerk-config.example.js` is committed.
- Page-local references use root-relative URLs (e.g. `/assets/...`,
  `/dashboard/...`) so they resolve regardless of the served path.

See [`../README.md`](../README.md) for the full source layout.
