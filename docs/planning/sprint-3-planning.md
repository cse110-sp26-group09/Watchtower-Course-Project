# Sprint 3 Planning Summary

> **Note:** Sprints 1 and 2 have detailed planning documents written up front.
> This Sprint 3 summary was **reconstructed after the fact** from the Sprint 3
> standup notes, the Sprint 3 retrospective, and the Sprint 3 decision log.
> Items that are not explicitly documented in those notes are marked as such.
> Sources: [`../meetings/Sprint/3/`](../meetings/Sprint/3/),
> [`retrospectives/Retrospective 3.md`](retrospectives/Retrospective%203.md).

## Project

WatchTower (Group 09 — "Akatsuki")

## Sprint Goal

Move from two parallel prototypes toward a single product direction: merge the
strongest frontend ideas from both prototypes into a people-focused UI, harden
the event capture/backend plumbing behind it, and produce the Agile **Team
Status Video**.

## What Changed From Sprint 2

- Sprint 2 ran two competing prototypes; Sprint 3 began converging on **one**
  combined direction (the work that became the current product).
- Instructor feedback shifted emphasis from backend ("ultimately just plumbing")
  toward **consumer-facing UI/UX**.
- The in-repo test/demo site was moved out to a **separate GitHub Pages repo** so
  WatchTower is exercised like a real external monitored site.

## Major Planned / Tracked Work

Reconstructed from the Sprint 3 decision log:

| Item | Focus | Issue |
|---|---|---|
| Restructure standup/meeting docs to be readable and easy to update | Process/Docs | #45 |
| Update ADRs to reflect new backend technologies | Docs | #53 |
| Add filters for querying the event database | Backend | #54 |
| SDK logic to send correct JSON to the correct endpoints | Backend/SDK | #55 |
| Verify the event schema fields can all be captured (research new APIs if not) | Backend | #56 |
| Merge the two frontend candidates into one design | Frontend | #57 |
| Produce the Team Status Video (slides + script + recording) | Whole team | — |

## Focus Areas

- **Frontend:** Combine Prototype 1 + 2 into a single, more intuitive,
  people-focused dashboard direction.
- **Backend:** Event-schema field coverage, query filters, and correct SDK →
  endpoint JSON flow (groundwork; deeper backend MVP planned for Sprint 4).
- **Docs/Process:** Cleaner standup structure, more real-time ADR/retrospective
  updates, and clearer GenAI-usage logging.

## Owners (from notes)

- **Status video roles:** Intro/Organization — Josh, Woosik; Prototype 1 —
  Daniel, Hieu, James; Prototype 2 — Hemendra, Alexis; Test website — Jason;
  CI/CD + Process + Editing — Aditya.
- **Frontend merge:** Joint frontend team. **Documentation cadence:** Josh + team.
- Per-issue owners beyond the video are *not explicitly documented* in the notes.

## Risks / Blockers (from the retrospective)

- Both prototypes were judged **unintuitive/confusing** in instructor feedback —
  UI/UX needed to become people-focused.
- **Unfocused development**: too much weight on backend before UI was usable.
- **Irregular documentation**: GenAI-usage, ADRs, and retrospectives lagged,
  creating ambiguity about Sprint 1/2 process.

## Outcome / Status

- Frontend MVP **mostly complete**; final merge of the two designs carried into
  Sprint 4 (#57 still open at retro time).
- Test/demo website **fully migrated** to a separate repo.
- Status video planned and recorded.
- Backend MVP intentionally **deferred** to Sprint 4.

## Related Docs

- Standups: [`../meetings/Sprint/3/`](../meetings/Sprint/3/)
- Retrospective: [`retrospectives/Retrospective 3.md`](retrospectives/Retrospective%203.md)
- Prototype comparison rubric: [`../process/prototype-comparison-rubric.md`](../process/prototype-comparison-rubric.md)
- Previous sprint: [`sprint-2-planning.md`](sprint-2-planning.md)
