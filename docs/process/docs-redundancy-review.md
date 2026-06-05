# Docs Redundancy Review

| Field | Value |
|---|---|
| Project | WatchTower |
| Document | `docs/process/docs-redundancy-review.md` |
| Author | Aditya (Technical Lead) |
| Purpose | Identify duplicate, stale, overlapping, or unclear documentation before final repo cleanup. |
| Related docs | [`future-repo-structure-proposal.md`](future-repo-structure-proposal.md), [`jsdoc-wiki-plan.md`](jsdoc-wiki-plan.md) |

---

## Purpose

This review identifies duplicate, stale, overlapping, or unclear documentation across the `docs/` directory and related README files. No files are deleted or moved — this document only records findings and recommends actions for the team to approve before cleanup.

---

## Current Docs Map

| Area | Current Files/Folders | Purpose | Status |
|---|---|---|---|
| **Docs index** | `docs/README.md` | Documentation hub and navigation guide | Current — but references Sprint 1 as the active sprint and links to nonexistent `meetings/planning.md` and `meetings/standups.md` |
| **Architecture** | `docs/architecture/` (6 files + README) | System design, API contract, event schema, storage, auth, external test app | Mixed — `system-overview.md` and `auth-workflow.md` are current for Prototype 3; `event-storage.md` is Prototype 1–specific; `api-contract-v1.md` and `event-schema-v1.md` describe Prototype 1/2 contracts |
| **ADRs** | `docs/adr/` (9 ADRs + README) | Architecture decision records | Current — ADRs are append-only by convention |
| **Process** | `docs/process/` (6 files) | Workflow, git, JSDoc standards, GenAI, rubric, legacy audit | Mixed — `prototype-comparison-rubric.md` and `legacy-prototype-impact-check.md` are historical process artifacts from Sprint 2 |
| **Product** | `docs/product/` (4 files) | Brief, MVP, requirements, user stories | Needs review — `mvp.md` and `requirements.md` describe Sprint 1 scope and aspirational NFRs that don't match the course prototype |
| **Planning** | `docs/planning/` (3 files + retrospectives/) | Sprint plans, backlog, retrospectives | Current — `sprint-2-planning.md` and retrospectives are historical records |
| **Research** | `docs/research/` (8 files + README) | Individual research notes and technical investigations | Current — research docs are point-in-time; no update needed |
| **Design** | `docs/design/` (3 files + media/) | Wireframes, UI decisions, event schema copy | Needs review — `event-schema-v1.md` is a duplicate of the architecture version |
| **Meetings** | `docs/meetings/` (decision log + Sprint standups) | Standup notes organized by sprint week | Current — append-only meeting records |
| **Sprint** | `docs/sprint/` (1 file) | Sprint 2 comparison readout | Current — historical record of the prototype comparison |
| **Back-end** | `docs/back-end/` (1 file) | Backend requirements tracking for Prototype 2 | Stale — tracks Prototype 2 backend tasks; Prototype 3 is now active |
| **Generated API docs** | `docs/api/` (gitignored) | JSDoc-generated HTML output | Not tracked — correctly gitignored |
| **Root README** | `README.md` | Project overview and quick start | Needs review — still points to `prototype_1` and `prototype_2` for setup; project structure tree is outdated |
| **Src README** | `src/README.md` | Source code overview | Needs review — describes only `prototype_1` and `prototype_2`; does not mention `prototype_3` |

---

## Redundancy Findings

| File or Folder | Possible Redundancy | Why It May Be Redundant | Recommendation |
|---|---|---|---|
| `docs/design/event-schema-v1.md` | Duplicate of `docs/architecture/event-schema-v1.md` | Nearly identical content — both define the shared event schema and API contract. The `design/` copy merges event schema + API contract into a single file, while `architecture/` keeps them split. | **Merge**: keep the authoritative split files in `architecture/`, add a one-line redirect note in `design/`, or delete the `design/` copy after team approval. |
| `docs/architecture/event-storage.md` | Prototype 1–specific SQLite docs | Describes the Prototype 1 SQLite storage layer, schema, and verification flow. Prototype 3 uses Supabase/PostgreSQL. | **Archive**: move to `docs/archive/` or mark as "historical — Prototype 1 only" at the top. Prototype 3 storage is documented in `src/prototype_3/README.md` and `auth-workflow.md`. |
| `docs/architecture/api-contract-v1.md` | Applies to Prototype 1/2 only | Header says "Applies to: `src/prototype_1`, `src/prototype_2`". Prototype 3 has additional endpoints (`/api/users/sync`, `/api/developer/*`, `/api/beacon`) not documented here. | **Update**: either add a Prototype 3 API contract addendum or mark v1 as historical and create a v2 contract. |
| `docs/architecture/event-schema-v1.md` | Applies to Prototype 1/2 only | Same "Applies to" header. Prototype 3 adds fields like `user_id`, `app_name`, `environment`, `sdk_version`, `event_name`. | **Update**: same as above — create a v2 addendum or mark v1 as baseline and document Prototype 3 extensions. |
| `docs/back-end/tasks-tracking.md` | Prototype 2 backend tracking | Maps requirements to Prototype 2 backend state. References `src/prototype_2/Backlog.md` (which no longer exists under `src/`). Prototype 3 supersedes this. | **Archive**: move to `docs/archive/` or add a header noting it is historical. |
| `docs/process/legacy-prototype-impact-check.md` | Completed audit | Audited the old `src/Prototype1/` folder (capital P). That folder has since been moved to `archive/Prototype1/`. The audit's recommendations have been acted on. | **Archive**: keep as historical record; add a note that the recommended archive was completed. |
| `docs/process/prototype-comparison-rubric.md` | Sprint 2 process artifact | The rubric was used for the Sprint 2 prototype comparison. The scoring sheet at the bottom is still blank (scores are in the companion readout). | **Keep** as process reference. No action needed — it documents how the comparison was done. |
| `docs/sprint/sprint-2-comparison-readout.md` | References Prototype 1/2 as active candidates | The readout recommended a hybrid direction that became Prototype 3. Still says "do not touch" about `prototype_1` and `prototype_2`. | **Keep** as historical record. Consider adding a postscript noting that the hybrid became `prototype_3`. |
| `README.md` (root) | Outdated project structure and quick start | Project structure tree shows only `prototype_1`. Quick start points to `src/prototype_1/README.md`. Does not mention Prototype 3, Supabase, Clerk, or Render. Missing `archive/` from the tree. | **Update**: rewrite to reflect Prototype 3 as the active direction, update project structure tree, update quick start to `npm start`. |
| `src/README.md` | Does not mention Prototype 3 | Describes `prototype_1` (static frontend) and `prototype_2` (full vertical slice). "Next Steps" section describes a future `app/` rename that is now superseded by Prototype 3. | **Update**: add a Prototype 3 section and mark Prototype 1/2 descriptions as archived. |
| `docs/README.md` | Broken links and Sprint 1 references | Links to `meetings/planning.md` and `meetings/standups.md` (don't exist — actual files are in `meetings/Sprint/` subfolders). References Sprint 1 as the active sprint. Does not list `docs/sprint/` or `docs/back-end/`. | **Update**: fix broken links, update sprint references, add missing folder listings. |
| `docs/product/mvp.md` | Sprint 1 scope only | Lists "Not in Sprint 1: Authentication, Real backend/database" — both are now implemented in Prototype 3. "Sprint 1 Prototype Direction" says "store data locally (JSON or in-memory)". | **Update**: either add a "Current State" section reflecting Prototype 3 achievements or mark the Sprint 1 scope sections as historical. |
| `docs/product/requirements.md` | Aspirational NFRs | Lists 99.9% uptime, 10K events/sec, 10M-event dashboard loads — unrealistic for a course prototype and not tested. Functional requirements reference "CPU utilization" and "memory usage" which aren't browser-capturable. | **Keep** as aspirational requirements doc. Consider adding a "Prototype Scope" note clarifying which NFRs are out of scope. |
| `docs/architecture/external-test-app-plan.md` | References Prototype 2 only | "Current In-Repo Demo Usage" describes `src/prototype_2/`. The external test app now exists as a separate GitHub Pages repo. | **Update**: reflect current state — the test app was created, is hosted on GitHub Pages, and points at the Render-hosted Prototype 3 backend. |

---

## Recommended Docs Structure

After cleanup, the docs directory should follow this professional layout:

```
docs/
├── README.md                    # Documentation index (updated)
├── architecture/                # System design, schemas, contracts
│   ├── README.md
│   ├── system-overview.md       # Technology stack and dependencies
│   ├── auth-workflow.md         # Clerk authentication flow (Prototype 3)
│   ├── api-contract-v1.md       # Baseline API contract (add v2 addendum)
│   ├── event-schema-v1.md       # Baseline event schema (add v2 addendum)
│   └── external-test-app-plan.md
├── adr/                         # Architecture Decision Records (append-only)
│   ├── README.md
│   └── ADR-0001..0009.md
├── product/                     # Product vision and requirements
│   ├── project-brief.md
│   ├── mvp.md
│   ├── requirements.md
│   └── user-stories.md
├── planning/                    # Sprint plans and retrospectives
│   ├── sprint-1-planning.md
│   ├── sprint-2-planning.md
│   ├── backlog-issues.md
│   └── retrospectives/
├── process/                     # Workflow, standards, planning docs
│   ├── workflow.md
│   ├── git-workflow.md
│   ├── genai-usage.md
│   ├── jsdoc-standards.md
│   ├── docs-redundancy-review.md   (this file)
│   ├── future-repo-structure-proposal.md
│   └── jsdoc-wiki-plan.md
├── design/                      # Wireframes, UI decisions, media
│   ├── Wireframe.md
│   ├── User-Interface-Decisions.md
│   └── media/
├── research/                    # Individual research notes
│   ├── README.md
│   └── *.md
├── meetings/                    # Standup and decision records
│   ├── decision-log.md
│   ├── Readme.md
│   └── Sprint/
├── sprint/                      # Sprint readouts and comparison docs
│   └── sprint-2-comparison-readout.md
├── archive/                     # Historical docs moved here after cleanup
│   ├── event-storage-prototype1.md
│   ├── tasks-tracking-prototype2.md
│   ├── legacy-prototype-impact-check.md
│   └── design-event-schema-v1-duplicate.md
└── api/                         # Generated JSDoc output (gitignored)
```

---

## Suggested Docs Cleanup Plan

### Phase 1: Review and Mark Stale Docs
1. Add "Historical" or "Superseded" headers to docs that reference Prototype 1/2 as active.
2. Add a "Current State" annotation to `mvp.md` and `requirements.md` noting what has been achieved in Prototype 3.
3. Fix broken links in `docs/README.md` (the `meetings/planning.md` and `meetings/standups.md` references).

### Phase 2: Merge Overlapping Architecture Docs
1. Remove `docs/design/event-schema-v1.md` (duplicate of `docs/architecture/event-schema-v1.md`) or replace with a redirect note.
2. Create an API contract v2 addendum or update the v1 doc header to include Prototype 3 endpoints.
3. Update `docs/architecture/external-test-app-plan.md` to reflect the completed GitHub Pages separation.

### Phase 3: Move Historical Prototype Docs into Archive
1. Move `docs/back-end/tasks-tracking.md` to `docs/archive/`.
2. Move `docs/architecture/event-storage.md` to `docs/archive/` (Prototype 1 SQLite–specific).
3. Add a completion note to `docs/process/legacy-prototype-impact-check.md`.

### Phase 4: Finalize Docs Index
1. Update `docs/README.md` to list all current folders including `sprint/` and `archive/`.
2. Update root `README.md` to reflect Prototype 3 as the active version, update the project structure tree, and fix the quick start.
3. Update `src/README.md` to describe `prototype_3/` and note that `prototype_1/` and `prototype_2/` were archived.

### Phase 5: Verify Links
1. Check all cross-references between docs for broken links.
2. Verify `docs/README.md` quick links table points to existing files.
3. Verify ADR cross-references still resolve.

---

## Notes

- No files are deleted or moved by this review.
- All recommendations require team approval before execution.
- The `archive/` directory at the repo root already exists and contains `prototype_1/`, `prototype_2/`, and `Prototype1/` code. A parallel `docs/archive/` folder is recommended for documentation that has been superseded.
- Generated `docs/api/` output is correctly gitignored and should stay that way.
