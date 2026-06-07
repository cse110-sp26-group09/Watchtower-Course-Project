# WatchTower Landing Page

Static single-page landing page for WatchTower, served by the backend at
`/landing/`.

## How to view

Run `npm start` from the repository root and open
`http://localhost:3000/landing/`. You can also open
`src/frontend/landing/index.html` directly in a browser for static preview.

## Navigation

- The primary "Get Started" CTA routes to the login page (`/login` when served
  by the Node server, `../auth/login.html` in the static/file flow).
- The "View dashboard demo" links route to `/dashboard-demo/`.
- The install-snippet modal shows the SDK `<script>` tag for monitored apps.
- Shared images (logos, GIFs, team photos) are served from `/assets/`.
