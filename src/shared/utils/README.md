# Shared Utils (`src/shared/utils`)

**Status:** Active.

| File | Purpose |
|---|---|
| `event-utils.js` | Pure helpers for event validation, normalization, averaging, and percentile calculation. This is the canonical implementation used by the backend. |

These functions are pure (no I/O, no globals), so they are unit-tested directly
in [`../../../tests/unit`](../../../tests/unit). Keep them free of Node-only or
browser-only dependencies so both sides can reuse them.

See [`../README.md`](../README.md).
