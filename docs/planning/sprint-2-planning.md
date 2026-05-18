# Sprint 2 Prototype Plan

## Project Name

WatchTower

## Sprint

Sprint 2

## Document Purpose

This document locks the two-team prototype plan for Sprint 2 so both prototype teams stay aligned to one shared WatchTower product direction.

The goal of Sprint 2 is to build two different versions of the same WatchTower website/dashboard, compare both versions using shared criteria, and decide whether the final product should use Prototype 1, Prototype 2, or a hybrid of both.

---

## Sprint 2 Goal

Sprint 2 focuses on parallel prototype development, stronger engineering process, and prototype evaluation.

By the end of Sprint 2, the team should have:

- Two working WatchTower prototype directions
- Clear team ownership for each prototype
- Shared MVP expectations across both prototypes
- Consistent event categories and data assumptions
- Basic frontend/backend integration for each prototype
- Early testing and documentation evidence
- A shared rubric for comparing both prototypes
- A decision flow for choosing one prototype or combining both
- Completed CI, testing, JSDoc, and security integration work to support both prototype teams

---

## Core Product Direction

Both teams are building versions of the same product:

**WatchTower is a lightweight observability web application that captures and displays user events, JavaScript errors, browser performance metrics, user feedback, and related monitoring signals through a dashboard.**

The prototypes should not become two separate products. They should explore two possible implementations of the same WatchTower vision.

---

## Prototype Model

Sprint 2 will use a two-track prototype model.

| Prototype | Purpose |
|---|---|
| Prototype 1 | Build one version of the WatchTower dashboard and event monitoring flow |
| Prototype 2 | Build a second version of the WatchTower dashboard and event monitoring flow |

At the end of the prototype phase, the team will evaluate both versions and choose one of the following paths:

1. Continue with Prototype 1 as the final direction
2. Continue with Prototype 2 as the final direction
3. Combine the strongest parts of both prototypes into a hybrid final direction

The prototype comparison should be collaborative, not competitive in a negative way. The goal is to explore two possible directions, learn from both, and make the strongest final product decision.

---

## Overall Leadership

| Role | Member | Responsibilities |
|---|---|---|
| Scrum Master | Aditya | Sprint coordination, blockers, GitHub Issues, PR flow, team alignment |
| Backend Lead | Aditya | Backend direction, event schema consistency, SDK/API alignment, testing/CI support |
| Architecture Mediator | Aditya | Ensure both prototypes stay aligned to the same WatchTower product |
| Frontend Lead | James | Frontend consistency, UI standards, dashboard layout guidance, frontend review |

Aditya will float between both prototype teams, with a primary focus on backend, architecture, CI/testing, security, and process consistency.

James will help guide frontend direction across both teams so the two prototypes remain comparable.

---

## Team Split

## Prototype 1 Team

### Prototype 1 Goal

Prototype 1 will build one version of the WatchTower website/dashboard using the shared MVP requirements, event categories, and process standards.

### Frontend Team

| Member | Role | Responsibilities |
|---|---|---|
| James | Frontend Lead / UI Implementation | Lead frontend structure, dashboard layout, UI implementation, frontend review |
| Hieu | UI/UX + Prompt Engineer / Researcher | Wireframes, user flow, design reasoning, usability research, prompt support |
| Hemendra | Frontend Components / Styling Developer | Reusable components, styling consistency, layout cleanup, CSS organization |

### Backend Team

| Member | Role | Responsibilities |
|---|---|---|
| Daniel | Backend / Instrumentation Developer | Backend logic, instrumentation flow, server/API support, testable backend behavior |
| Waleed | Event Schema / Data Flow / API Logic Developer | Event schema, data normalization, API response structure, stats/data flow |

---

## Prototype 2 Team

### Prototype 2 Goal

Prototype 2 will build a second version of the same WatchTower website/dashboard. This version should explore a different implementation or design direction while still following the shared MVP expectations.

### Frontend Team

| Member | Role | Responsibilities |
|---|---|---|
| Alex | Frontend Developer | Frontend implementation, dashboard sections, UI behavior, prototype buildout |
| Fahad | Product/Design + Prompt Engineer / Researcher | Product alignment, design thinking, research, prompt support, MVP fit |
| Josh | Frontend Documentation / User Flow Support | User flow documentation, frontend decision notes, research notes, documentation clarity |

### Backend Team

| Member | Role | Responsibilities |
|---|---|---|
| Jason | SDK / Client-Side Instrumentation Developer | SDK behavior, JavaScript event capture, monitored-site event sending |
| Woosik | Backend Testing / Research / AI Tools Support | Testing support, backend research, QA checklist, AI tools support |

---

## Floating Role

| Member | Floating Responsibilities |
|---|---|
| Aditya | Review backend consistency, review event schema decisions, support CI/testing, resolve blockers, mediate architecture decisions, keep both teams aligned |

Aditya should not become a bottleneck for every small decision. Each prototype team can make local implementation decisions as long as they do not conflict with shared product direction, event schema, CI/testing requirements, or architecture expectations.

---

## Shared Foundation for Both Prototypes

Both prototype teams must follow the same shared foundation.

### Shared Product Goal

Both prototypes should represent WatchTower as a lightweight observability dashboard.

### Shared MVP Features

Each prototype should aim to include:

- JavaScript error tracking
- Browser performance tracking
- User interaction or feedback tracking
- Dashboard view for captured events
- Basic event filtering or organization
- Clear user flow
- Documentation explaining setup and design decisions

### Shared Event Categories

Both prototypes should use the same general event categories:

| Event Category | Meaning |
|---|---|
| Error Events | JavaScript errors, unhandled promise rejections, runtime issues |
| Performance Events | Page load timing, latency, route timing, browser performance signals |
| User Feedback Events | User-submitted feedback, ratings, comments, or issue reports |
| User Interaction Events | Button clicks, navigation actions, session activity, key user actions |

### Shared Process Expectations

Both teams must use:

- GitHub Issues for task tracking
- Pull Requests for review
- CI checks before merging
- Clear commit messages
- Documentation updates when decisions change
- JSDoc comments for important functions
- Unit/e2e tests where appropriate
- Minimal dependencies unless approved by the team

---

## Sprint 2 Completed Infrastructure Work

As part of Sprint 2 setup, the team also completed important infrastructure, CI, testing, documentation, and security integration work. This work was led and completed by Aditya to support a stronger software engineering process before deeper prototype implementation.

### Completed by Aditya

| Area | Completed Work |
|---|---|
| CI Pipeline | Expanded GitHub Actions workflow for repository checks, HTML validation, CSS validation, JavaScript linting, unit tests, end-to-end tests, JSDoc generation, and dependency audit |
| Testing Setup | Added structure for unit tests and end-to-end tests using Jest and Playwright |
| JSDoc Setup | Added JSDoc generation support to document important JavaScript functions |
| Dependency Management | Added minimal required dev dependencies for testing and documentation: Jest, Playwright, and JSDoc |
| Security Policy | Added `SECURITY.md` to define the project’s vulnerability reporting and security process |
| Dependabot | Added Dependabot configuration for dependency and GitHub Actions updates |
| Dependency Alerts | Enabled Dependabot alerts and dependency graph support |
| Security Scanning | Set up CodeQL/code scanning for JavaScript and GitHub Actions |
| CI Runtime | Updated CI to use Node.js 24 to avoid Node.js 20 deprecation issues |
| Workflow Optimization | Updated CI workflow to reduce unnecessary runs by limiting triggers to relevant project files |

### Why This Matters

This infrastructure work supports the Sprint 2 prototype phase by making sure both prototype teams work under the same quality and security process.

The goal is not to overbuild the product, but to make sure the project demonstrates:

- Clean GitHub workflow
- Automated quality checks
- Testing readiness
- Security awareness
- Dependency maintenance
- JSDoc/code documentation
- Consistent engineering process

These updates give both prototype teams a stable foundation before implementation continues.

---

## Test App / External Website Direction

The team discussed that WatchTower should eventually monitor an external website, not only a demo inside the same repository.

The long-term direction is:

1. Keep internal demo/testing files in the main repo for development, CI, and debugging.
2. Use hosted/static demo files for GitHub Pages when needed.
3. Later create a separate test website repository that integrates with the WatchTower SDK like a real external monitored website.

This keeps the current development process practical while still aligning with the real purpose of WatchTower.

---

## Work Style for Sprint 2

Sprint 2 will use a combination of solo work, pairing, and small-group collaboration.

### Solo Work

Use solo work for:

- Small UI components
- Documentation updates
- Research notes
- JSDoc comments
- Simple utility functions
- Small test additions

### Pairing

Use pairing for:

- SDK integration
- Backend/API work
- Event schema decisions
- Debugging CI/test failures
- Frontend/backend integration
- E2E testing setup

### Small Group Collaboration

Use small-group collaboration for:

- Prototype design review
- Dashboard layout decisions
- Event flow walkthroughs
- Final prototype comparison
- Hybrid decision discussion

---

## Sprint 2 Deliverables

By the end of Sprint 2, the team should have:

| Deliverable | Owner(s) | Notes |
|---|---|---|
| Prototype 1 frontend direction | Prototype 1 Frontend Team | Dashboard UI, layout, user flow |
| Prototype 1 backend/event direction | Prototype 1 Backend Team | Event schema, backend/API logic, instrumentation flow |
| Prototype 2 frontend direction | Prototype 2 Frontend Team | Alternate dashboard UI and user flow |
| Prototype 2 backend/event direction | Prototype 2 Backend Team | SDK/event flow and backend/testing support |
| Shared prototype comparison rubric | Aditya + Fahad + James | Used to compare both prototypes fairly |
| Prototype decision notes | Aditya + Team Leads | Pick Prototype 1, Prototype 2, or hybrid |
| CI and security integration | Aditya | Completed as part of Sprint 2 infrastructure setup: CI pipeline, Jest/Playwright/JSDoc setup, Dependabot, CodeQL, dependency audit, and security policy |
| Updated documentation | All task owners | Each owner updates docs related to their work |
| Testing evidence | Backend teams + Aditya | Unit/e2e tests where appropriate |
| JSDoc evidence | Developers | Important functions documented |

---

## GitHub Issue Expectations

Each major task should have a GitHub Issue.

Each issue should include:

- Summary
- Scope
- Owner
- Support
- Reviewer
- Deliverable
- Acceptance Criteria

Each PR should link to the related issue.

---

## Definition of Done for Sprint 2 Tasks

A Sprint 2 task is considered done when:

- The assigned deliverable is completed
- Work is connected to a GitHub Issue
- Code or documentation is committed through a branch/PR
- CI checks pass when applicable
- Documentation is updated when applicable
- JSDoc comments are added for important new functions
- Unit/e2e tests are added or updated when appropriate
- Reviewer has approved the work
- The related issue is updated or closed

---

## Prototype Comparison Plan

At the end of the prototype phase, both teams will present their version of WatchTower.

Each team should explain:

- What they built
- How the user flows through the dashboard
- How events are represented
- What frontend decisions they made
- What backend/instrumentation decisions they made
- What is working
- What is incomplete
- What risks or blockers remain
- What they would improve next

---

## Decision Flow

The final decision should follow this process:

1. Prototype 1 team demos their version.
2. Prototype 2 team demos their version.
3. Each team explains design and technical tradeoffs.
4. The whole team scores both prototypes using the shared rubric.
5. Aditya and James review technical/frontend consistency.
6. The team discusses whether to choose Prototype 1, Prototype 2, or a hybrid.
7. The final direction is documented in an ADR.
8. Sprint 3 tasks are created based on the chosen direction.

---

## Decision Outcomes

The team can choose one of three outcomes:

| Outcome | Meaning |
|---|---|
| Pick Prototype 1 | Prototype 1 becomes the base for the final WatchTower product |
| Pick Prototype 2 | Prototype 2 becomes the base for the final WatchTower product |
| Hybrid | The team combines the strongest frontend/backend ideas from both prototypes |

The hybrid option should only be chosen if it is realistic and does not create unnecessary complexity.

---

## Risks and Mitigations

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Prototypes become two separate products | High | Use shared MVP, shared event categories, and shared rubric | Aditya |
| Teams duplicate work without learning from each other | Medium | Hold midpoint syncs and share decisions | Aditya + James |
| Backend/event schema becomes inconsistent | High | Backend lead reviews shared event assumptions | Aditya |
| Frontend designs become too different to compare | Medium | Frontend lead keeps dashboard expectations aligned | James |
| One team overbuilds while another stays minimal | Medium | Use the same MVP checklist and rubric | Fahad |
| Dependencies increase unnecessarily | Medium | New dependencies require team discussion | Aditya |
| Testing is delayed | High | Add tests as features are built, not at the end | Daniel + Woosik |
| Documentation falls behind | Medium | Task owners update docs as part of Definition of Done | Josh + Fahad |

---

## Communication Expectations

Teams should communicate progress clearly.

Use Slack for:

- Quick blockers
- Progress updates
- Meeting reminders
- Prototype questions
- Cross-team coordination

Use GitHub for:

- Issues
- Pull Requests
- Code review
- Documentation changes
- CI results
- Final decisions

If a major decision is made in Slack, it should be documented in GitHub or in the appropriate Markdown file.

---

## Sprint 2 Checkpoints

### Start of Sprint 2

- Confirm team split
- Confirm prototype goals
- Confirm shared MVP expectations
- Confirm GitHub Issues for each team

### Midpoint Check

- Each prototype team shares progress
- Identify blockers
- Compare event/data assumptions
- Confirm both teams are still aligned
- Confirm CI/testing/security workflow is still passing after implementation changes

### End of Sprint 2

- Demo both prototypes
- Score both prototypes using the rubric
- Decide Prototype 1, Prototype 2, or hybrid
- Document final direction
- Create Sprint 3 implementation issues

---

## Team Confirmation

Both prototype teams should confirm that they understand:

- They are building two versions of the same WatchTower product
- The goal is not competition for its own sake
- The final product may use one prototype or a hybrid
- Both teams must follow shared MVP and process expectations
- The comparison rubric will be used for the final decision
- CI, testing, JSDoc, and security checks are now part of the project process

### Confirmation Checklist

| Team | Confirmed? |
|---|---|
| Prototype 1 Team | [X] |
| Prototype 2 Team | [X] |
| Frontend Lead | [X] |
| Backend Lead / Scrum Master | [X] |

---
