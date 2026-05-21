# Architectural Decision Records (ADRs)

This directory contains Architectural Decision Records – documents that capture important technical decisions made during WatchTower's development.

## Purpose

ADRs help us:

- **Document decisions** – Record why we chose one approach over others
- **Preserve context** – Capture reasoning that might otherwise be lost
- **Enable learning** – Help new team members understand design choices
- **Facilitate discussion** – Provide a structured format for evaluating tradeoffs
- **Build institutional knowledge** – Create a searchable history of decisions

## What is an ADR?

An ADR is a concise document that records:

- **The decision** – What we chose to do
- **The problem** – What we were trying to solve
- **The options** – Alternatives we considered
- **The tradeoffs** – Why this option over others
- **The consequences** – Impact and implications of the decision
- **Status** – Whether it's proposed, accepted, or superseded

## ADR Format

```markdown
# ADR NNNN: [Title describing the decision]

## Status
Proposed | Accepted | Superseded | Deprecated

## Context
Describe the issue or problem we're facing and why a decision is needed.

## Decision
State the decision clearly and concisely.

## Consequences
What are the positive outcomes and tradeoffs of this decision?

## Alternatives Considered
What other options did we evaluate and why were they not chosen?
```

## Current ADRs

### ADR 0001: Initial WatchTower Architecture
- **Status:** Proposed
- **Date:** *(Sprint 1)*
- **Summary:** Lightweight static prototype using vanilla JavaScript, HTML, CSS, and Node.js backend
- **Link:** [ADR-0001.md](ADR-0001.md) or see content below

## Writing ADRs

### When to Write an ADR

Write an ADR when making a decision that:

- Is architecture-related (system design, technology choices, patterns)
- Has significant consequences or tradeoffs
- Might be questioned or reconsidered later
- Should be remembered by future maintainers

**Don't write ADRs for:** Minor implementation details, temporary workarounds, or decisions that are obvious given the context.

### Process

1. **Identify the decision** – What are we deciding?
2. **Gather context** – What problem are we solving?
3. **List options** – What alternatives exist?
4. **Evaluate tradeoffs** – Why is one better than others?
5. **Write the ADR** – Capture in standard format
6. **Get feedback** – Share with the team for discussion
7. **Accept or revise** – Finalize and update status
8. **Save in this folder** – File with descriptive name (e.g., `ADR-0002-database-choice.md`)

### Naming Convention

Use one of these formats:

- `ADR-NNNN-description.md` – e.g., `ADR-0002-use-react.md`
- `NNNN-description.md` – e.g., `0002-use-react.md`
- Numeric sequence starting from 0001

## Maintaining ADRs

### Updating Status

When circumstances change, update the ADR status:

- **Proposed** – Decision made but not yet implemented
- **Accepted** – Team has agreed and we're moving forward
- **Superseded** – A newer ADR replaces this one
- **Deprecated** – No longer relevant or used

### Superseding an ADR

If a decision changes, don't delete the old ADR. Instead:

1. Create a new ADR explaining the new decision
2. Update the old ADR status to "Superseded"
3. Link the old and new ADRs together

Example in new ADR:
```
## Supersedes
ADR-0002: Use JavaScript (now using TypeScript instead)
```

## Related Documentation

- [Architecture Overview](../product/project-brief.md)
- [Design Documentation](../design/)
- [Decision Log](../meetings/decision-log.md)
- [Project Overview](../../README.md)

---

## ADR 0001: Initial WatchTower Architecture

*This ADR is embedded below for reference. Consider moving to a separate file (ADR-0001.md) for clarity.*

### Status
Proposed

### Context
WatchTower is a lightweight observability system for tracking frontend errors, performance signals, user feedback, and deployment/build-related signals.

For Sprint 1, we need a simple architecture that allows us to prototype quickly while staying within course constraints.

### Decision
We will begin with a lightweight static web application prototype using HTML, CSS, and vanilla JavaScript. We will use mock JSON data and browser APIs to simulate event collection. The prototype will include:

- A dashboard page
- A test/demo page
- Error capture prototype
- Performance capture prototype
- Feedback capture prototype
- Mock event data

### Consequences
This approach keeps the project simple, easy to deploy, and easier for all team members to understand. It also allows us to demonstrate the core WatchTower concept before adding complexity.

### Alternatives Considered
- React-based frontend – Would add build complexity and require more setup
- Node.js backend – Would require database and deployment infrastructure
- External charting libraries – Would add dependency management overhead
- Full database integration – Not needed for prototype validation

These may be considered later only if approved and justified.

---

## ADR 0002: CI/CD Pipeline Setup

### Status
Approved

### Context
For Sprint 2, we need to keep a solid CI/CD pipeline to guide our process to make progress as smooth and accessible, keeping our main branches clean, while also keeping our documentation clear 

### Decision
We will use familiar dependencies that we have used in our labs for easy implementation since we are familiar with the technology while also using some unfamiliar dependancies to insure stronger code security

**Familar Dependancies**
- **Jest** for unit testing
- **Playwright** for end-to-end testing
- **Github actions** for automated testing/ keeping up good coding practice 
- **HTML/CSS/JS validation** for basic test that all code is syntatically correct


**Unfamiliar Dependancies**
- **Dependabot** used for keeping up with any dependancy updates/ conflicts with dependancy source of truth
- **npm security audit in CI** used to make sure any dependancies can't create any security issues
- **CodeQL** used to scan codebase to find any security vulnerabilities

### Consequences
This approach keeps our process clean and organized so whenver we update our code we make sure every aspect is covered in terms of documentation, security, and avoid errors that won't affect our main branch.

### Alternatives Considered
- Vitest (Alternative to Jest) A modern unit testing framework built on Vite. It uses almost identical syntax to Jest, meaning your team won't have to relearn how to write tests, but it runs significantly faster.

- Cypress (Alternative to Playwright) A developer-friendly end-to-end testing framework that runs directly inside the browser. It features a powerful visual runner that makes debugging failing UI tests much easier for beginners.

- GitLab CI/CD (Alternative to GitHub Actions) A powerful, built-in automation platform. While GitHub Actions is native to your current code hosting, GitLab CI/CD is the industry's leading native alternative if you ever shift repository hosting.

- ESLint & Prettier (Alternative to HTML/CSS/JS Validation) Instead of just checking if syntax is valid, this combination actively enforces uniform code formatting and catches tricky logical bugs before your code even reaches the main branch.

- Renovate (Alternative to Dependabot) An automated dependency checker that reduces "PR noise" by grouping multiple package updates into a single Pull Request, preventing your team from being flooded with notifications.

- Snyk (Alternative to npm security audit) A dedicated security tool that scans your external packages for vulnerabilities, offering automated fixes and much clearer instructions on how to patch security flaws than standard npm audits.

- SonarCloud (Alternative to CodeQL) A cloud-based code analysis tool that scans your codebase for security vulnerabilities, bugs, and "code smell." It provides a clean dashboard visual grade (A through F) for your code quality.

These may be considered later only if approved and justified.