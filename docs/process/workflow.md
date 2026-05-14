# WatchTower Workflow Guide

## 1) Purpose

This document defines how the WatchTower team plans, tracks, builds, reviews, and closes work in GitHub for Sprint 1 and future sprints. It keeps team execution consistent, transparent, and easy to follow for a class project environment.

## 2) Sprint 1 Focus and Deadline

- **Sprint 1 focus:** planning, requirements, MVP definition, research, repository setup, and first prototypes
- **Sprint 1 deadline:** **May 10, 2026**
- **Sprint 1 outcome target:** a complete, organized, and labeled backlog with core project process artifacts and initial technical direction

## 3) Repository Workflow Steps

1. Create or select a GitHub issue from the backlog.
2. Confirm issue labels (sprint, priority, type, status) and owner/support/reviewer fields.
3. Create a branch from `main` using branch naming conventions.
4. Implement one scoped change per branch.
5. Commit using Conventional Commits.
6. Push branch and open a pull request linked to the issue.
7. Request review and address feedback.
8. Merge only after acceptance criteria are met and reviewer approval is received.
9. Update issue status labels and close the issue.

## 4) Branch Naming Convention

Use short, descriptive branch names:

- `feature/short-description`
- `docs/short-description`
- `fix/short-description`
- `chore/short-description`

Examples:

- `feature/error-logger`
- `feature/dashboard-layout`
- `docs/mvp-definition`
- `chore/github-actions-setup`

## 5) Conventional Commit Format

Use this format:

`<type>: <short summary>`

Common types:

- `feat`
- `fix`
- `docs`
- `chore`
- `test`
- `refactor`
- `ci`

Examples:

- `feat: add error logger prototype`
- `fix: resolve dashboard layout issue`
- `docs: add sprint 1 planning notes`
- `chore: create issue template`
- `test: add logger unit tests`

## 6) Pull Request Expectations

Every major change goes through a pull request.

Each PR must include:

- What changed
- Why it changed
- Linked GitHub issue
- Testing notes (or why testing is not applicable)
- Screenshot/video for UI-related changes
- Risks or follow-up work (if needed)

PR checklist expectations:

- Scope matches linked issue acceptance criteria
- Labels on issue/PR are accurate
- Reviewer is assigned
- No unresolved review comments before merge

## 7) GitHub Issue Body Convention

Use this body format for all backlog issues:

- **Title**
- **Labels**
- **Summary**
- **Scope**
- **Owner**
- **Support**
- **Reviewer**
- **Deliverable**
- **Acceptance Criteria**

Minimum rule: every issue must include **Owner**, **Support**, and **Reviewer** in the issue body.

## 8) Owner / Support / Reviewer Definitions

- **Owner:** accountable person who drives the issue to completion.
- **Support:** teammate(s) who actively help with research, implementation, or documentation.
- **Reviewer:** teammate responsible for quality check and sign-off before completion.

## 9) Label Conventions

Use labels from all required groups for each issue.

### Sprint Labels

- `sprint-1`: work targeted for Sprint 1
- `sprint-2`: work targeted for Sprint 2
- `sprint-3`: work targeted for Sprint 3
- `post-mvp`: work deferred until after MVP scope

### Priority Labels

- `priority-high`: critical to sprint success or blocking other tasks
- `priority-medium`: important but not immediate blocker
- `priority-low`: useful improvement or later follow-up

### Type Labels

- `type-docs`
- `type-process`
- `type-frontend`
- `type-backend`
- `type-instrumentation`
- `type-testing`
- `type-design`
- `type-devops`
- `type-research`

### Status Labels

- `status-ready`: defined and ready to start
- `status-in-progress`: actively being worked on
- `status-blocked`: cannot proceed due to dependency/blocker
- `status-review`: ready for review/sign-off
- `status-done`: completed and accepted

### Recommended Label Combinations

- Planning/process issue: `sprint-1` + `priority-high` + `type-process` + `status-ready`
- Research issue: `sprint-1` + `priority-medium` + `type-research` + `status-ready`
- Frontend prototype issue: `sprint-1` + `priority-high` + `type-frontend` + `status-ready`
- Future testing placeholder: `sprint-2` + `priority-medium` + `type-testing` + `status-ready`
- Post-MVP integration placeholder: `post-mvp` + `priority-low` + `type-devops` + `status-ready`

## 10) Sprint 1 Backlog Expectations

- Create and maintain the initial Sprint 1 process/documentation backlog.
- Ensure Sprint 1 includes all required planning and setup tasks.
- Maintain clear acceptance criteria on every Sprint 1 issue.
- Ensure Sprint 1 backlog has clear ownership and review assignments.
- Target: at least 15 total issues in the project backlog.

## 11) Future Placeholder Issue Expectations

Add placeholder issues for future work so the roadmap is visible early. Placeholders should include:

- instrumentation expansion tasks
- dashboard evolution tasks
- testing strategy tasks
- deployment/build signal integration tasks

Each placeholder must still include labels, owner/support/reviewer, and acceptance criteria even if implementation is in a later sprint.

## 12) Backlog Review Requirement

The backlog must be reviewed at least once during a team sync. During the review:

- verify issue scope and acceptance criteria quality
- verify label consistency (sprint + priority + type + status)
- confirm owner/support/reviewer for each issue
- adjust priorities based on dependencies

## 13) Standup Expectations

Team members provide regular standup updates (live or async) using:

- what was completed
- what is next
- blockers or risks

Standup updates should reference active issue numbers when possible.

## 14) Documentation Folder Structure

Use `docs/` as the primary project documentation directory:

- `docs/workflow.md` - team workflow, issue/label conventions, process standards
- `docs/git-workflow.md` - legacy quick git workflow reference
- `docs/sprint-1-planning.md` - sprint plan and milestones
- `docs/requirements.md` - functional and non-functional requirements
- `docs/mvp.md` - MVP definition and boundaries
- `docs/adr/` - architecture decision records
- `docs/research/` - research notes and findings
- `docs/retrospectives/` - sprint retrospective records

## 15) GenAI Usage Convention

GenAI tools are allowed for brainstorming, drafting, and code/documentation assistance with the following rules:

- humans remain accountable for final technical and process decisions
- all AI-generated outputs must be reviewed before merge/use
- avoid sharing secrets or private credentials with AI tools
- document significant AI-assisted outputs in PR notes when relevant

## 16) Definition of Done (Project-Wide)

A task is done when:

- acceptance criteria are fully met
- implementation or document changes are complete
- PR is reviewed and approved
- related issue is updated and closed
- status label is set to `status-done`

## 17) Sprint 1 Definition of Done

Sprint 1 is done when:

- Sprint 1 planning, MVP, requirements, and user stories are completed
- core research and early prototype foundation tasks are completed or clearly handed off
- workflow, issue, and label conventions are documented in `docs/workflow.md`
- backlog contains at least 15 issues with owner/support/reviewer fields
- backlog has been reviewed at least once during team sync

## 18) Continuous Integration & Quality Pipeline

Every push to `main` and every pull request targeting `main` runs the
GitHub Actions workflow defined in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). The
pipeline is structured as small, independent jobs so failures point
directly at the responsible area of the codebase.

### CI Jobs

- **Repository structure checks** — verify required root files,
  documentation folders, and key documentation files exist.
- **HTML validation** — run Nu HTML Checker (`vnu.jar`) against all
  `.html` files under `src/`.
- **CSS validation** — run Stylelint (via `npx`) against all `.css`
  files under `src/` using a temporary, opinionated rule set.
- **JavaScript lint** — run ESLint (via `npx`) against all `.js` files
  under `src/` and `tests/` using a temporary config that supports both
  browser and Node globals.
- **Unit tests** — `npm run test:unit` (Jest, tests in `tests/unit/`).
- **End-to-end tests** — `npm run test:e2e` (Playwright, tests in
  `tests/e2e/`). The workflow starts the server with `npm start`, waits
  for `http://localhost:3000`, runs the tests, and stops the server.
- **JSDoc generation** — `npm run docs:js` produces `docs/api/` so we
  always know the docs build cleanly.
- **Dependency security audit** — `npm audit --audit-level=high`.

### Dependency philosophy

- Committed dependencies are intentionally minimal.
- Only **Jest**, **@playwright/test**, and **JSDoc** are committed as
  dev dependencies because they directly support testing and
  documentation requirements.
- HTML, CSS, and JavaScript validation use CI-runner tooling
  (`vnu.jar`, `npx stylelint`, `npx eslint`) with temporary configs
  inside the runner, so we don't add permanent lint config files to the
  repository unless the team agrees they are needed.
- The workflow runs on **Node.js 24** (with
  `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`) so it stays ahead of the
  GitHub Actions Node.js 20 deprecation and remains future-ready.

### Running the pipeline locally

```bash
npm install
npm run test:unit       # Jest unit tests
npm run docs:js         # generate docs/api/
npm start               # start the WatchTower server on :3000
npm run test:e2e        # Playwright smoke tests (in a separate terminal)
```

## 19) Communication Expectations

- Keep GitHub issues and PRs up to date as the source of truth.
- Use slack for communicating any difficulties or schedule conflicts.
- Raise blockers early in team chat and tag affected owner/reviewer.
- Keep feedback constructive, specific, and issue-linked.
- Use clear handoff notes when moving work between teammates.
- Prefer documented decisions (issues/PRs/ADRs) over undocumented verbal decisions.
