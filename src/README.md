# Source Code

This directory contains all WatchTower implementation code. During Sprint 2 the team built two parallel prototypes; they are compared in [`docs/sprint/sprint-2-comparison-readout.md`](../docs/sprint/sprint-2-comparison-readout.md).

## Structure

### `prototype_1/` – Static Frontend Candidate

A standalone static dashboard (no backend, no SDK) modeled after the WatchTower wireframes. Useful for trying out UI layouts and accessibility controls.

- Open `src/prototype_1/index.html` directly in a browser.
- See [`prototype_1/README.md`](prototype_1/README.md) for details.

### `prototype_2/` – Full Vertical Slice (used by `npm start`)

A working capture → ingest → display loop:

- `index.html`, `dashboard.js`, `style.css` – three-view dashboard (Home, Analytics, Alerts).
- `sdk.js` – client-side SDK that auto-captures `window.onerror` and Navigation Timing metrics and POSTs to `/api/events` in 2-second batches.
- `server/server.js` – framework-free Node.js HTTP server that exposes `POST /api/events`, `GET /api/events`, `GET /api/stats`, and `GET /api/events/stream` (SSE) on port 3000.
- `hosted_demo/` – static ShopDemo page for traffic checks.
- `utils/event-utils.js` – thin re-export of the canonical `src/shared/utils/event-utils.js` for backwards compatibility.

See [`prototype_2/README.md`](prototype_2/README.md) for details.

### `shared/` – Cross-prototype utilities

Code that both prototypes (and any Sprint 3 hybrid) can rely on:

- `shared/utils/event-utils.js` – pure helpers for event validation, normalization, averaging, and percentile calculation. This is the source of truth; the prototype 2 path is a re-export shim.

**Technologies:** HTML, CSS, JavaScript, Node.js

## Development Guidelines

### Code Organization
- Keep code modular and single-responsibility
- Use clear, descriptive variable and function names
- Comment complex logic and non-obvious design decisions

### Testing
- Write tests for new features (see [../../tests/](../../tests/))
- Run all tests before committing
- Aim for meaningful coverage, not just high percentages

### Documentation
- Update code comments when logic changes
- Document APIs and their parameters
- Add examples for complex features

### Building & Deployment
- Follow the build process outlined in each prototype's README
- Test locally before pushing
- Follow conventional commit messages

## Next Steps

As the project grows, this directory may include:

- `shared/sdk/` – SDK extracted from prototype 2 once both prototypes share it
- `shared/server/` – Backend API as a shared module
- `shared/components/` – Reusable UI components
- `app/` – The chosen hybrid (renamed from prototype_2) after Sprint 3 kickoff

## Related Documentation

- [Project Overview](../README.md)
- [Architecture Decisions](../docs/adr/)
- [Development Workflow](../docs/process/workflow.md)
