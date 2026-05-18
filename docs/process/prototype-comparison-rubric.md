# Prototype Comparison Rubric

## Project Name

WatchTower

## Sprint

Sprint 2

## Purpose

This rubric will be used to compare the two WatchTower prototype versions created during Sprint 2.

Both prototypes are different versions of the same WatchTower product. The goal is not to create two separate products, but to explore two possible directions and decide which one should become the final project direction.

At the end of the prototype phase, the team will use this rubric to choose one of three outcomes:

1. Continue with Prototype 1
2. Continue with Prototype 2
3. Combine the strongest parts of both prototypes into a hybrid final direction

---

## Evaluation Method

Each prototype will be scored using the categories below.

Each category should be scored from **1 to 5**.

| Score | Meaning |
|---|---|
| 1 | Poor / missing / unclear |
| 2 | Partially present but weak |
| 3 | Acceptable / meets basic expectations |
| 4 | Strong / clearly useful |
| 5 | Excellent / highly polished and effective |

The final score should not be the only deciding factor. The team should also discuss maintainability, implementation risk, team confidence, and whether a hybrid approach makes more sense.

---

## Prototype Evaluation Categories

| Category | Weight | What We Are Evaluating |
|---|---:|---|
| MVP Completeness | 20% | Does the prototype cover the core WatchTower MVP features? |
| User Experience / UI Clarity | 15% | Is the dashboard easy to understand and navigate? |
| Event Flow / Data Model | 15% | Are events captured, structured, and displayed clearly? |
| Technical Simplicity / Maintainability | 15% | Is the code understandable, maintainable, and realistic for the team? |
| Testing Readiness | 10% | Can the prototype be tested with unit/e2e tests? |
| Documentation Quality | 10% | Are setup steps, decisions, and design choices documented clearly? |
| Integration Readiness | 10% | Can the prototype work with the WatchTower SDK and future external test app? |
| Team Confidence | 5% | Does the team feel confident continuing with this prototype? |

Total: **100%**

---

# Detailed Rubric

## 1. MVP Completeness

**Weight:** 20%

This category evaluates whether the prototype covers the minimum WatchTower functionality.

| Score | Criteria |
|---|---|
| 1 | Most MVP features are missing or unclear |
| 2 | Some MVP features exist, but the prototype feels incomplete |
| 3 | Basic MVP features are present |
| 4 | MVP features are clearly implemented and usable |
| 5 | MVP is complete, clear, and ready to extend |

### MVP Features to Check

- JavaScript error tracking
- Browser performance tracking
- User feedback or interaction tracking
- Dashboard view for captured events
- Basic event organization or filtering
- Clear connection between event capture and dashboard display

### Notes

**Prototype 1:**

-

**Prototype 2:**

-

---

## 2. User Experience / UI Clarity

**Weight:** 15%

This category evaluates how easy the dashboard is to understand and use.

| Score | Criteria |
|---|---|
| 1 | UI is confusing or difficult to use |
| 2 | UI has some structure but lacks clarity |
| 3 | UI is understandable and usable |
| 4 | UI is clean, organized, and easy to navigate |
| 5 | UI feels polished, intuitive, and presentation-ready |

### Things to Check

- Clear dashboard layout
- Readable cards, tables, charts, or event lists
- Good visual hierarchy
- Consistent spacing and styling
- Clear labels and terminology
- Useful empty states or error states
- Easy-to-understand user flow

### Notes

**Prototype 1:**

-

**Prototype 2:**

-

---

## 3. Event Flow / Data Model

**Weight:** 15%

This category evaluates how well the prototype handles WatchTower event data.

| Score | Criteria |
|---|---|
| 1 | Event flow is missing or unclear |
| 2 | Some event data exists, but structure is inconsistent |
| 3 | Event data is basically structured and usable |
| 4 | Event flow is clear and consistent |
| 5 | Event model is strong, extensible, and easy to integrate |

### Things to Check

- Events have consistent fields
- Error, performance, feedback, and interaction events are clearly represented
- Dashboard can display event data meaningfully
- Event schema is understandable
- Data flow from SDK/demo/backend/dashboard is clear
- Data assumptions are documented

### Shared Event Categories

| Event Category | Expected Purpose |
|---|---|
| Error Events | JavaScript errors, unhandled promise rejections, runtime issues |
| Performance Events | Page load timing, latency, route timing, browser performance signals |
| User Feedback Events | User-submitted feedback, ratings, comments, or issue reports |
| User Interaction Events | Button clicks, navigation actions, session activity, key user actions |

### Notes

**Prototype 1:**

-

**Prototype 2:**

-

---

## 4. Technical Simplicity / Maintainability

**Weight:** 15%

This category evaluates whether the prototype is realistic for the team to continue building.

| Score | Criteria |
|---|---|
| 1 | Code is difficult to understand or too fragile |
| 2 | Code works partially but is hard to maintain |
| 3 | Code is understandable enough to continue |
| 4 | Code is organized, readable, and maintainable |
| 5 | Code is simple, clean, and easy for the whole team to extend |

### Things to Check

- Code is organized clearly
- Functions and files have understandable responsibilities
- No unnecessary dependencies
- No over-engineering
- Naming is clear
- Major logic is not duplicated unnecessarily
- Prototype can be extended without a full rewrite
- Team members can understand how it works

### Notes

**Prototype 1:**

-

**Prototype 2:**

-

---

## 5. Testing Readiness

**Weight:** 10%

This category evaluates how easily the prototype can be tested.

| Score | Criteria |
|---|---|
| 1 | Prototype is not testable or tests cannot run |
| 2 | Some parts may be testable but structure is unclear |
| 3 | Basic tests can be written and run |
| 4 | Prototype has clear testable units and e2e flow |
| 5 | Prototype is well-structured for unit, e2e, and CI testing |

### Things to Check

- Unit-testable utility functions exist
- E2E flow can be tested with Playwright
- Prototype works with current CI pipeline
- Important behavior is not hidden inside untestable code
- Tests can be added without major restructuring
- CI failures are understandable

### Notes

**Prototype 1:**

-

**Prototype 2:**

-

---

## 6. Documentation Quality

**Weight:** 10%

This category evaluates whether the prototype is documented clearly enough for the team and future reviewers.

| Score | Criteria |
|---|---|
| 1 | Little or no documentation exists |
| 2 | Documentation exists but is incomplete or unclear |
| 3 | Basic documentation exists and is usable |
| 4 | Documentation is clear and helpful |
| 5 | Documentation is complete, organized, and easy to follow |

### Things to Check

- Setup instructions are clear
- Prototype decisions are documented
- Event flow is explained
- Any assumptions or limitations are stated
- JSDoc comments exist for important functions
- README or supporting docs explain how to run/demo the prototype
- GitHub Issues/PRs connect to the work

### Notes

**Prototype 1:**

-

**Prototype 2:**

-

---

## 7. Integration Readiness

**Weight:** 10%

This category evaluates whether the prototype can support the future WatchTower direction, including monitoring an external website.

| Score | Criteria |
|---|---|
| 1 | Prototype is isolated and hard to integrate |
| 2 | Integration path is unclear |
| 3 | Prototype could integrate with some cleanup |
| 4 | Prototype has a clear integration path |
| 5 | Prototype is ready to support SDK/external test app integration |

### Things to Check

- SDK integration is possible
- Event format can be shared across prototypes
- Prototype can support local demo and future external test app
- API/data flow can evolve without major rewrite
- Static hosted demo direction is considered if relevant
- External monitoring concept is supported

### Notes

**Prototype 1:**

-

**Prototype 2:**

-

---

## 8. Team Confidence

**Weight:** 5%

This category evaluates whether the team feels confident continuing with the prototype.

| Score | Criteria |
|---|---|
| 1 | Team is not confident continuing with this direction |
| 2 | Major concerns exist |
| 3 | Team can continue with some concerns |
| 4 | Team is mostly confident |
| 5 | Team is highly confident this is the right direction |

### Things to Consider

- Can most team members understand the prototype?
- Can frontend and backend teams continue building on it?
- Are blockers manageable?
- Does the team understand the tradeoffs?
- Is the prototype realistic for the remaining timeline?

### Notes

**Prototype 1:**

-

**Prototype 2:**

-

---

# Scoring Sheet

Use this table during the final prototype review.

| Category | Weight | Prototype 1 Score | Prototype 1 Weighted Score | Prototype 2 Score | Prototype 2 Weighted Score |
|---|---:|---:|---:|---:|---:|
| MVP Completeness | 20% |  |  |  |  |
| User Experience / UI Clarity | 15% |  |  |  |  |
| Event Flow / Data Model | 15% |  |  |  |  |
| Technical Simplicity / Maintainability | 15% |  |  |  |  |
| Testing Readiness | 10% |  |  |  |  |
| Documentation Quality | 10% |  |  |  |  |
| Integration Readiness | 10% |  |  |  |  |
| Team Confidence | 5% |  |  |  |  |
| **Total** | **100%** |  |  |  |  |

## Weighted Score Formula

```txt
Weighted Score = Score × Weight
```

Example:

```txt
If Prototype 1 gets 4/5 for MVP Completeness:
4 × 20 = 80 weighted points out of 100 for that category
```

For simplicity, the team may also use the raw 1–5 scores and discuss the result without calculating exact weighted totals.

---

# Review Process

Use the following process during the final Sprint 2 prototype review.

1. Prototype 1 team presents their demo.
2. Prototype 1 team explains design and technical decisions.
3. Prototype 2 team presents their demo.
4. Prototype 2 team explains design and technical decisions.
5. The full team scores both prototypes using this rubric.
6. Aditya reviews backend, event flow, architecture, and CI/testing fit.
7. James reviews frontend consistency, usability, and dashboard clarity.
8. The team discusses whether to pick Prototype 1, Prototype 2, or a hybrid.
9. The final decision is documented in an ADR.
10. Sprint 3 issues are created based on the chosen direction.

---

# Decision Options

| Decision | When to Choose It |
|---|---|
| Pick Prototype 1 | Prototype 1 is clearly stronger, more maintainable, and better aligned with the MVP |
| Pick Prototype 2 | Prototype 2 is clearly stronger, more maintainable, and better aligned with the MVP |
| Hybrid | Both prototypes have valuable pieces that can be combined without creating unnecessary complexity |

---

# Hybrid Decision Guidelines

Choose a hybrid only if:

- The strongest pieces can be merged realistically
- The team understands how the merged version will work
- The hybrid does not create too much complexity
- The event schema and architecture can stay consistent
- The team can complete the hybrid direction within the remaining timeline

Do not choose a hybrid only to avoid making a decision. If one prototype is clearly stronger, use it as the base.

---

# Final Decision Record

After scoring and discussion, complete this section.

## Selected Direction

Choose one:

- [ ] Prototype 1
- [ ] Prototype 2
- [ ] Hybrid

## Reason for Decision

Write the main reason for the decision here.

## Strengths of Prototype 1

-

-

-

## Strengths of Prototype 2

-

-

-

## If Hybrid, Which Parts Are Being Combined?

-

-

-

## Main Risks Going Into Sprint 3

-

-

-

## Sprint 3 Follow-Up Tasks

-

-

-

---

# Required Team Agreement

Before finalizing the prototype decision, both teams should confirm that the rubric was applied fairly.

| Group | Confirmed? |
|---|---|
| Prototype 1 Team | [ ] |
| Prototype 2 Team | [ ] |
| Frontend Lead | [ ] |
| Backend Lead / Scrum Master | [ ] |

---

# Notes

This rubric may be updated if the team receives new guidance from the professor, TA, or stakeholder. Any major changes to the comparison criteria should be documented in the Sprint 2 planning document or an ADR.
