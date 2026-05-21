# WatchTower Candidate 1

A responsive WatchTower candidate based on the wireframes, now wired to a monitored demo app and lightweight event-ingestion server.

## Open It

Run the Candidate 1 server:

```bash
node src/candidate_1/server/server.js
```

Then open:

- Dashboard: `http://localhost:3100/`
- Demo app: `http://localhost:3100/demo`

## What Is Included

- Responsive WatchTower app shell
- Home dashboard with live health summary, issue queue, build metadata, and recent events
- Analytics view with user activity, purchases, latency, feedback, and service charts
- Settings view with profile, accessibility, and notification accordions
- Desktop side navigation and mobile bottom navigation
- Interactive view switching, settings accordions, assignment controls, and visual preference toggles
- Browser SDK copied from the prototype for tracking errors, page-load latency, clicks, and custom events
- Monitored demo app that generates real events for Candidate 1
- Candidate 1 server with `/api/events`, `/api/stats`, and `/api/events/stream`
