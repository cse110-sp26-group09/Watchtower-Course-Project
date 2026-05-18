# WatchTower - Candidate 2 Prototype

A real-time observability dashboard built with vanilla HTML, CSS, and JavaScript. No frameworks or build tools required - open `index.html` in a browser to run.

## Project Structure

```
candidate_2/
  index.html      — Main HTML layout (sidebar, 3 views, settings panel)
  style.css       — All styling and theme variables ("Dark Slate & Sandstone")
  dashboard.js    — UI logic: view switching, charts, alerts feed, seed data
  sdk.js          — Client-side event capture SDK with batched sending
```

## Views

The dashboard has 3 main views, switched via the left sidebar:

1. **Home** - Overview with hero stats (active users, errors, latency, uptime), top issues, latency windows, peak traffic insights, and a version history timeline.
2. **Analytics** - Event volume bar chart, user activity bar chart, and a canvas-drawn response latency line chart with a 250ms threshold line.
3. **Alerts** - Real-time alert feed with severity levels (critical, error, warning, info). Includes a collapsible filter sidebar with facets for status, patch version, security type, and service. Supports search, mute toggle, and time range selection.

## SDK (sdk.js)

The SDK provides client-side event capture:

- **Auto-capture**: JS errors (`window.onerror`) and page load performance metrics (DNS, TTFB, DOM load, transfer size).
- **Manual tracking**: `window.WatchTowerSDK.track(type, tags, data)` to send custom events.
- **Batching**: Events queue locally and flush every 2 seconds via POST to `/api/events`.
- **Session tracking**: Each page load generates a unique session ID attached to all events.
- **Graceful shutdown**: Flushes the queue on `beforeunload` so events are not lost.

## Theme / Color Scheme

All colors are defined as CSS custom properties in `:root` inside `style.css`. Current theme is "Dark Slate & Sandstone":

| Variable           | Hex       | Role                              |
|--------------------|-----------|-----------------------------------|
| `--bg-primary`     | `#1A1C1E` | Main body background              |
| `--bg-secondary`   | `#25272A` | Cards, panels, containers         |
| `--bg-tertiary`    | `#2F3235` | Inputs, nested elements           |
| `--cerulean`       | `#111214` | Sidebar background                |
| `--text-primary`   | `#F0EBE1` | Headings, primary text            |
| `--text-secondary` | `#A89F95` | Subtitles, descriptions           |
| `--text-muted`     | `#6B6560` | Labels, timestamps                |
| `--honey`          | `#dfdc2d` | Primary accent (active states)    |
| `--red`            | `#E05252` | Error states                      |
| `--green`          | `#2e971c` | Success / operational states      |
| `--grape`          | `#8e44ad` | Critical severity                 |

## Backend Endpoints (Expected)

The frontend expects these endpoints when connected to a backend:

- `POST /api/events` - Receives batched event payloads from the SDK
- `GET /api/events/stream` - SSE stream for real-time alert ingestion
- `GET /api/stats` - Returns dashboard stats (activeUsers, maxUsers, totalErrors, avgLatency, uptime)

The dashboard works without a backend by using seed data loaded on init.

## Manual Testing

All features were manually tested in-browser. Results:

| Feature | Status |
|---|---|
| View switching (Home, Analytics, Alerts) | Pass |
| Hero stat cards display | Pass |
| Top 3 Issues click navigates to matching alert | Pass |
| High Latency Windows and Peak Traffic insights | Pass |
| Version History timeline | Pass |
| Event Volume bar chart renders | Pass |
| User Activity bar chart renders | Pass |
| Latency line chart with threshold line | Pass |
| Alert feed loads seed data | Pass |
| Alert row click expands detail panel | Pass |
| Filter sidebar: status filters | Pass |
| Filter sidebar: patch version filters | Pass |
| Filter sidebar: security tag filters | Pass |
| Filter sidebar: service tag filters | Pass |
| Filter sidebar: Clear All button | Pass |
| Alert search bar | Pass |
| Mute/Unmute toggle | Pass |
| Settings panel open/close | Pass |
| Filter sidebar collapse/expand | Pass |
| SDK auto-captures JS errors | Pass |
| SDK auto-captures page load performance | Pass |
| SDK manual tracking via `WatchTowerSDK.track()` | Pass |
| SDK batched flush every 2 seconds | Pass |
| Responsive canvas chart on window resize | Pass |

## How to Run

1. Open `index.html` directly in a browser (no server needed for the UI).
2. To receive live events, run a backend server on `localhost:8000` implementing the endpoints above.
