# Shared (`src/shared`)

**Status:** Active. Cross-cutting utilities shared by the backend (and reusable
by other code) — the source of truth for event helpers.

| Path | Purpose |
|---|---|
| [`utils/`](utils/) | Pure helper functions (event validation, normalization, math). |

These modules are dependency-free and pure, which makes them easy to unit-test
(see [`../../tests/unit`](../../tests/unit)).

See [`../README.md`](../README.md) for the full source layout.
