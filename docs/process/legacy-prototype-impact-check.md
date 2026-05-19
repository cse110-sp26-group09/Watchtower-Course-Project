# Legacy Prototype Impact Check

| Field | Value |
|---|---|
| Project | WatchTower |
| Document | `docs/process/legacy-prototype-impact-check.md` |
| Purpose | Audit whether the legacy `src/Prototype1/` folder is still referenced anywhere, and recommend whether it is safe to keep, archive, or delete. |
| Related docs | [`sprint-2-comparison-readout.md`](../sprint/sprint-2-comparison-readout.md), [`prototype-comparison-rubric.md`](./prototype-comparison-rubric.md) |
| Author | Tooling / repo audit |

---

## 1. Background

The current prototype layout is two parallel implementations of the same WatchTower product:

- `src/prototype_1/` — frontend-only candidate (static HTML/CSS/JS dashboard, no backend, no SDK).
- `src/prototype_2/` — full vertical slice (dashboard, SDK, Node.js server, hosted ShopDemo, event utilities).

A third folder also exists at the case-sensitive path `src/Prototype1/` (capital `P`, no underscore). This folder contains an earlier checkpoint of the original prototype before the team split it into two named candidates.

This document audits whether `src/Prototype1/` is still wired into anything the team currently depends on, so we can decide what to do with it.

## 2. Files Found in the Legacy Folder

`src/Prototype1/` (tracked in git) contains:

```
src/Prototype1/
├── README.md
├── dashboard/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── demo/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── hosted_demo/
│   ├── README.md
│   ├── app.js
│   ├── index.html
│   └── style.css
├── sdk/
│   └── watchtower.js
├── server/
│   └── server.js
└── utils/
    └── event-utils.js
```

A byte-for-byte comparison shows that `src/Prototype1/server/server.js` and `src/Prototype1/utils/event-utils.js` are identical to their counterparts in `src/prototype_2/`. The dashboard, demo, and SDK files are an earlier subfolder-based variant of the same idea (the current `prototype_2` is a flat layout, not nested under `dashboard/`, `demo/`, `sdk/`).

## 3. Reference Audit

For each candidate consumer of the legacy folder, I checked whether `src/Prototype1/` (or any file inside it) is referenced.

| Consumer | Referenced? | Evidence |
|---|---|---|
| `package.json` scripts | No | `start` runs `src/prototype_2/server/server.js`. `test`, `test:unit`, `test:e2e`, `docs:js` do not point at `Prototype1/`. |
| Jest unit tests (`tests/unit/`) | No | Only `tests/unit/event-utils.test.js`, and it imports from `src/prototype_2/utils/event-utils` (now repointed to `src/shared/utils/event-utils`). |
| Playwright e2e tests (`tests/e2e/`) | No | `tests/e2e/watchtower.spec.js` hits `/`, `/demo`, and `/api/...`, all served by the prototype 2 server. The selectors that used to look like `#active-users`, `#total-events`, `#total-errors`, `#error-feed`, `#activity-feed` were inherited from the legacy `Prototype1/dashboard/app.js`, but those tests have been rewritten to target the current `prototype_2` UI. |
| GitHub Actions CI (`.github/workflows/ci.yml`) | No | The structure step checks for `src/prototype_1` (lowercase + underscore). It does not require `src/Prototype1`. HTML / CSS / JS lint steps `find src -type f`, so they walk into `Prototype1/` if it exists, but they do not require it. |
| `src/` source code imports | No | Grep for `require(...event-utils...)` and `from ...event-utils` returns only `tests/unit/event-utils.test.js`. Nothing under `src/prototype_1/` or `src/prototype_2/` imports anything from `src/Prototype1/`. |
| Local server routing | No | `src/prototype_2/server/server.js` serves its sibling files (`path.join(__dirname, "..")` resolves inside `src/prototype_2/`). It cannot accidentally reach into `src/Prototype1/`. |
| GitHub Pages workflow | Not applicable | The repository does not currently have a GitHub Pages workflow. The hosted ShopDemo lives at `src/prototype_2/hosted_demo/` and is described in its own README. |
| JSDoc generation (`npm run docs:js`) | Yes (incidental) | `jsdoc src -r -d docs/api` walks `src/` recursively, so it _does_ pick up the `Prototype1/` files and generates `docs/api/Prototype1_*.html`. Removing `src/Prototype1/` would simply stop those duplicate HTML files from being regenerated. No other documentation links to them. |
| Top-level `README.md` | No | The project overview mentions `src/prototype_1/` and `src/prototype_2/`. It does not mention the legacy `src/Prototype1/`. |
| `src/README.md` | No | Describes `src/prototype_1/`. The legacy folder is not referenced. |
| `docs/` content | No (only an old standup line) | Only `docs/meetings/standups.md` contains the text "Prototype1 & 2", which is conversational, not a file reference. |
| Hardcoded paths in any tool | No | Grep across the repo for `src/Prototype1` returns no source-code matches. |

## 4. What Would Break If We Delete `src/Prototype1/`?

Based on the audit, deleting `src/Prototype1/` would:

- Have **no effect** on `npm start`, `npm test`, `npm run test:unit`, `npm run test:e2e`, or any GitHub Actions job.
- Cause the next run of `npm run docs:js` to drop the `Prototype1_*.html` pages from `docs/api/`. Nothing links to those pages.
- Not break any user-facing route or any developer workflow that the team currently relies on.

## 5. Recommendation

**Recommendation: archive, do not delete unilaterally.**

Reasoning:
- Deletion is technically safe based on the audit above.
- The folder is the original Prototype 1 snapshot from before the candidate / prototype renames, and the team's Sprint 2 comparison readout treats both current prototypes as candidates for the Sprint 3 direction. Keeping the original on disk for one more sprint preserves history that GitHub history alone can also provide.
- The student-team policy in this audit is "do not delete legacy code without team approval", so this report does not delete it.

If the team approves removal at the next standup or sprint kickoff, the cleanup is exactly:

```
git rm -r src/Prototype1
git commit -m "chore: remove legacy Prototype1 snapshot superseded by prototype_1 and prototype_2"
```

If the team prefers to archive instead of delete, the suggested archive path is:

```
docs/archive/legacy-prototype-1/
```

This keeps the legacy snapshot accessible for the prototype comparison rubric and the Sprint 3 hybrid plan without leaving it under `src/`, where it can confuse new contributors who expect everything under `src/` to be a live prototype.

## 6. Out of Scope for This Report

- The current `src/prototype_1/` (frontend-only candidate) is not legacy. It is actively maintained and referenced by CI, the top-level README, and the prototype comparison readout. **Do not touch it.**
- The current `src/prototype_2/` (full vertical slice) is the working base for the recommended hybrid direction. **Do not touch it.**
- Sprint 3 hybrid composition decisions belong in [`sprint-2-comparison-readout.md`](../sprint/sprint-2-comparison-readout.md), not in this audit.
