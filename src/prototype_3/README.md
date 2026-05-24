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
node src/prototype_3/server/server.js
```

Open:

- Dashboard: `http://localhost:3000/`
- Demo app: `http://localhost:3000/demo`

## Included in this merged baseline

- Sidebar + topbar navigation from the `prototype_1` style system.
- Settings-based `Dashboard mode` selector (Manager vs Developer).
- Manager summary panels for simplified operational status.
- Developer diagnostics panels for route latency, version error concentration, event mix, and route pressure.
- Existing dark mode toggle and settings controls.
