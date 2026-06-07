# Architecture Documentation

Architecture index for WatchTower. This folder documents how the current product
(`src/backend`, `src/frontend`, `src/sdk`, `src/shared`) is designed.

## Current (active)

These describe the system as it is built today:

- [system-overview.md](system-overview.md) — high-level architecture and the dependencies WatchTower uses.
- [api-contract-v2.md](api-contract-v2.md) — current API contract (applies to `src/backend`).
- [event-schema-v2.md](event-schema-v2.md) — current event schema (applies to `src/backend`).
- [auth-workflow.md](auth-workflow.md) — Clerk authentication and dashboard data-ownership flow.
- [external-test-app-plan.md](external-test-app-plan.md) — plan for the external GitHub Pages test app.

## Historical (superseded)

Kept for context; **not** the current design:

- [api-contract-v1.md](api-contract-v1.md) — first-draft API contract.
- [event-schema-v1.md](event-schema-v1.md) — first-draft event schema (kept canonical across early prototype candidates).
- Prototype 1 SQLite storage notes now live in [../archive/event-storage.md](../archive/event-storage.md).

Up: [../README.md](../README.md). Decisions behind these docs are recorded in
[../adr/](../adr/).