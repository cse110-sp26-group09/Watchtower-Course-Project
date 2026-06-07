# Sprint 4 Planning Summary

> **Note:** Like the Sprint 3 summary, this document was **reconstructed after
> the fact** from the Sprint 4 standup notes, the Sprint 4 retrospective, and the
> Sprint 4 decision log. Items not explicitly stated in those notes are marked.
> Sources: [`../meetings/Sprint/4/`](../meetings/Sprint/4/),
> [`retrospectives/Retrospective 4.md`](retrospectives/Retrospective%204.md).

## Project

WatchTower (Group 09 — "Akatsuki")

## Sprint Goal

Build the **final, single product** (the version formerly called "Prototype 3")
by combining the best of Prototype 1 and 2, finishing a usable MVP dashboard with
**manager (executive) and developer views**, and standing up **hosted**
backend + frontend + demo that communicate across URLs.

## What Changed From Sprint 3

- Stopped iterating two prototypes; committed to **one final prototype** merging
  both.
- Moved from local-only/event-listener coupling toward **separately hosted**
  components (demo, backend, dashboard) communicating over HTTP.
- Selected major dependencies/architecture: **Clerk** (auth), **Render**
  (hosting), and a **PostgreSQL** migration target.

## Major Planned / Tracked Work

Reconstructed from the Sprint 4 standups and decision log:

| Item | Focus | Issue |
|---|---|---|
| Landing page content + information architecture | Frontend | #60 |
| Landing page UI with Login / Sign Up CTA | Frontend | #61 |
| Static Login and Sign Up screens | Frontend | #62 |
| Navigation polish (Back, Return Home, route consistency) | Frontend | #63 |
| UI quality pass to reduce the AI-generated look | Frontend | #64 |
| Dual dashboard modes (Executive + Developer views) | Frontend | #65 |
| Single logo (remove redundant light/dark variants) | Frontend | #71 |
| Research Clerk (auth) and Resend (email alerts) | Backend/Research | #78 |
| Hosting on Render; split frontend/backend; `.env` for API keys | Backend/Infra | — (standup) |
| Migrate event storage SQLite → PostgreSQL | Backend | — (standup; ADR-0007) |
| Beacon API + Navigation Timing for capture | Backend | — (standup) |

## Focus Areas

- **Frontend:** Final merged dashboard with manager/developer views, landing +
  login/signup pages, and a UI-quality pass to remove "AI slop."
- **Backend:** Hosting/CORS across URLs, stable endpoints (`/api/events`,
  `/api/health`, `/api/stats`), DB migration to PostgreSQL, and auth via Clerk.
- **Docs/Process:** Update ADRs for the new technologies (Clerk, PostgreSQL,
  Render); weigh dependency pros/cons as code freeze approaches.

## Owners (from notes)

- **Authorization (Clerk) & PostgreSQL:** Aditya and Jason.
- **Beacon & Navigation Timing:** Daniel and Woosik.
- **Frontend (landing/login, dual views, UI polish, misc. issues):** Frontend
  team (James, Hemendra, Hieu, Alexis, Josh; product/design input from Fahad).
- Some standups had absences; owners above reflect the assignments recorded in
  the action-item tables.

## Risks / Blockers (from notes & retrospective)

- **AI-generated frontend** introduced alignment/consistency issues and "slop
  debt" requiring manual cleanup (CSS consistency was the weak point).
- **Dependency tradeoffs**: Clerk/Resend speed delivery but add security,
  maintenance, and outage/version-mismatch risk near code freeze.
- **SDK double-fire bug** (two events per click) noted in standups.
- DB migration required moving off local SQLite to cloud-hosted PostgreSQL.

## Outcome / Status

- MVP **minimally finished**: both Developer and Manager views working with
  connected backend endpoints.
- Landing + login/signup screens built; navigation polished.
- Clerk/Render/PostgreSQL chosen and recorded in ADRs (see
  [`../adr/`](../adr/)). UI-polish work continued past this sprint (#87 open at
  retro time) and is captured in [`retrospectives/Retrospective 5.md`](retrospectives/Retrospective%205.md).

## Related Docs

- Standups: [`../meetings/Sprint/4/`](../meetings/Sprint/4/)
- Retrospective: [`retrospectives/Retrospective 4.md`](retrospectives/Retrospective%204.md)
- ADRs (Clerk, PostgreSQL, Supabase, Render): [`../adr/`](../adr/)
- Auth flow: [`../architecture/auth-workflow.md`](../architecture/auth-workflow.md)
- Previous sprint: [`sprint-3-planning.md`](sprint-3-planning.md)
