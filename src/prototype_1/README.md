# WatchTower Prototype 1

A responsive WatchTower dashboard candidate based on the wireframes,
wired to a monitored ShopDemo app and a lightweight SQLite-backed event
ingestion server.

## Run It

```bash
npm install
npm run start:prototype1
```

Open in a browser:

- **Dashboard:** <http://localhost:3000/>
- **Monitored demo app:** <http://localhost:3000/demo>
- **Health probe:** <http://localhost:3000/api/health>
- **Browser SDK:** <http://localhost:3000/sdk/watchtower.js>

> The default `npm start` script still launches Prototype 2 on port 3000.
> Use `npm run start:prototype1` for the SQLite-backed flow.

## What's Included

- Responsive WatchTower app shell.
- Home dashboard with live health summary, issue queue, build metadata, and recent events.
- Analytics view with user activity, purchases, latency, feedback, and service charts.
- Settings view with profile, accessibility, and notification accordions.
- Desktop side navigation and mobile bottom navigation.
- Browser SDK that captures `page_view`, `error`, performance, click, and custom events.
- Monitored ShopDemo app with a "Local SQLite verification" panel for one-click event generation.
- HTTP server with `/api/health`, `/api/events`, `/api/stats`, and `/api/events/stream`.

## Navigation Polish

- Sidebar, mobile navigation, topbar shortcuts, and in-page metric links all use the same hash-based routes.
- Secondary screens include Back and Home controls so users can leave Analytics, Settings, Health, and Issues without a dead-end.
- Active sidebar and mobile navigation states are synced with the visible route.
- UI check screenshots:
  - [Analytics navigation](../../docs/design/media/prototype-1-navigation-analytics.png)
  - [Settings navigation](../../docs/design/media/prototype-1-navigation-settings.png)

## Storage

Events are persisted to a single SQLite file via
[`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3):

- **Path:** `data/prototype_1/watchtower.sqlite` (created automatically).
- **Override:** `WATCHTOWER_P1_DB=/abs/path/file.sqlite`.
- **Schema and verification flow:** see
  [`docs/architecture/event-storage.md`](../../docs/architecture/event-storage.md).

The legacy SQLite spike at `server/server-1.1.js` and the legacy
`app.db` file are kept in the repo for reference and are **not** used
by the active server. Both will be removed once the team agrees the
SQLite-promoted flow is stable.

## Layout

```
prototype_1/
├── README.md              this file
├── index.html             dashboard shell
├── style.css              dashboard styles
├── app.js                 dashboard logic
├── assets/                logos
├── demo/                  monitored ShopDemo app served at /demo
│   ├── index.html
│   ├── app.js             includes "Local SQLite verification" panel
│   └── style.css
├── sdk/
│   └── watchtower.js      browser SDK with `sendWatchTowerEvent` helper
└── server/
    ├── server.js          ACTIVE: SQLite-backed HTTP server
    ├── event-store.js     better-sqlite3 wrapper + pure helpers (unit tested)
    └── server-1.1.js      legacy SQLite spike, kept for reference
```

## Tests

```bash
npm run test:unit                                      # event-store + shared utils
npx playwright test tests/e2e/prototype1-sqlite.spec.js  # boots its own server
```

The e2e suite uses port `3110` and a temp database, so it does not
collide with a running local Prototype 1 server.
