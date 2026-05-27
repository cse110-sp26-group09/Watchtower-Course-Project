# WatchTower Documentation

Welcome to the WatchTower documentation index. This folder contains all project documentation needed to understand, develop, and maintain the WatchTower observability platform.

## Purpose

This documentation directory serves as the single source of truth for:
- **Product vision and requirements**: What we're building and why
- **Architecture and design decisions**: How the system is structured
- **Planning and tracking**: Sprint plans, backlogs, and retrospectives
- **Research and discoveries**: Findings that inform our decisions
- **Process and workflow**: How we work together as a team
- **Meeting records**: Team discussions and decisions

---

## Documentation Structure

Our documentation is organized by purpose to make it easy to find what you need:

### 📦 Product ([product/](product/))
Define what we're building and for whom.
- [project-brief.md](product/project-brief.md) – High-level project overview
- [mvp.md](product/mvp.md) – Core features for the Minimum Viable Product
- [requirements.md](product/requirements.md) – Detailed functional and non-functional requirements
- [user-stories.md](product/user-stories.md) – User-centered features and acceptance criteria

### 📋 Planning ([planning/](planning/))
Track progress, manage the backlog, and run sprints effectively.
- [backlog-issues.md](planning/backlog-issues.md) – Prioritized list of features and bug fixes
- [sprint-1-planning.md](planning/sprint-1-planning.md) – Sprint 1 goals, tasks, and role assignments
- [retrospectives/](planning/retrospectives/) – Lessons learned and improvements from each sprint

### 🔨 Process ([process/](process/))
Establish and document how we work together.
- [workflow.md](process/workflow.md) – Daily development workflow and best practices
- [git-workflow.md](process/git-workflow.md) – Branching strategy and commit conventions
- [genai-usage.md](process/genai-usage.md) – Guidelines for using generative AI tools responsibly
- [jsdoc-standards.md](process/jsdoc-standards.md) - Guidelines for using JSdocs 

### 🔍 Research ([research/](research/))
Document discovery, experimentation, and design thinking.
- Team research findings and competitive analysis
- Technology exploration and proof-of-concept learnings

### 🎨 Design ([design/](design/))
Visual and interactive design specifications.
- [Wireframe/](design/Wireframe/) – UI mockups and user interface layouts

### 📸 Media ([media/](media/))
Images, diagrams, and visual assets for documentation and project materials.
- Project logos, screenshots, and referenced images

### 🏗️ Architecture ([adr/](adr/))
Record major technical decisions and trade-offs.
- [Architectural Decision Records (ADRs)](adr/) – Documented reasoning for system design choices
- [system-overview.md](architecture/system-overview.md) - overview of the system architecture
- [api-contract-v1.md](architecture/api-contract-v1.md) - Documented usage of APIs
- [event-schema-v1.md](architecture/event-schema-v1.md) - Documented event schemas
- [external-test-app-plan.md](architecture/external-test-app-plan.md) - Plan for using external app for testing

### 💬 Meetings ([meetings/](meetings/))
Preserve team discussions and decisions.
- [decision-log.md](meetings/decision-log.md) – Key decisions and their rationale
- [planning.md](meetings/planning.md) – Planning session notes
- [standups.md](meetings/standups.md) – Daily standup summaries and blockers

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [Project Brief](product/project-brief.md) | Get up to speed on what WatchTower is |
| [Requirements](product/requirements.md) | Understand detailed feature specifications |
| [Sprint Planning](planning/sprint-1-planning.md) | See current sprint goals and assignments |
| [Git Workflow](process/git-workflow.md) | Review branching and commit conventions |
| [Decision Log](meetings/decision-log.md) | Track important project decisions |

---

## Documentation Standards

To keep our documentation useful and maintainable, please follow these standards:

### 1. **Keep Docs Updated**
   - Update documentation as work changes, not after
   - If you modify code behavior or architecture, update the related docs within the same PR
   - Add a note to the commit message when documentation changes are significant

### 2. **Use Clear File Names**
   - Use lowercase with hyphens (e.g., `sprint-planning.md`, not `Sprint Planning.md`)
   - Choose names that clearly describe the content
   - Organize files in logical folders

### 3. **Link Related Work**
   - Reference GitHub issues: `[#123](https://github.com/org/repo/issues/123)`
   - Reference pull requests: `[PR #456](https://github.com/org/repo/pull/456)`
   - Cross-link related documents using relative paths: `[See Product Brief](../product/project-brief.md)`

### 4. **Document Major Decisions**
   - Create an ADR in [adr/](adr/) for significant technical or product decisions
   - Include the problem statement, options considered, decision, and rationale
   - Use ADRs to build institutional knowledge

### 5. **Organize Meeting Notes**
   - Add new entries to existing meeting docs (e.g., `standups.md`, `decision-log.md`)
   - Include date, attendees, and key outcomes
   - Link to related GitHub issues or PRs for context

### 6. **Use Markdown Formatting**
   - Use headers (`#`, `##`, etc.) for structure
   - Use bullet points for lists and numbered lists for sequences
   - Include code blocks with language tags for clarity
   - Use tables for comparisons

---

## When to Update Documentation

| Scenario | What to Update |
|----------|----------------|
| Adding a new feature | [Requirements](product/requirements.md), [Sprint notes](planning/sprint-1-planning.md) |
| Changing architecture | [Architecture Decision Records](adr/) |
| Making a team decision | [Decision Log](meetings/decision-log.md) |
| Completing a sprint | [Retrospectives](planning/retrospectives/), backlog |
| Discovering something new | [Research folder](research/) or relevant document |
| Changing the workflow | [Process docs](process/) |
| Blocked or discovering an issue | [Standups](meetings/standups.md) |

---

## Documentation Ownership

Every team member contributes to documentation as part of their work:

- **Feature owners**: Update [product](product/) and [design](design/) docs
- **Task implementers**: Update [process](process/) docs and add ADRs as needed
- **Meeting facilitators**: Maintain [meetings](meetings/) notes
- **Sprint leads**: Manage [planning](planning/) docs and retrospectives
- **All contributors**: Review docs for accuracy and clarity in code reviews

**Key principle**: The person who makes a change is responsible for updating the related documentation.

---

## Notes for Future Maintainers

- This documentation structure scales well as the project grows
- Don't let documentation become stale—outdated docs are worse than no docs
- When in doubt, add clarity rather than assume people will know context
- Use this README as a guide for what should exist; create new docs when needed
- Consider automating documentation where possible (e.g., API docs, changelogs)

---

## How to Navigate

- **New to WatchTower?** Start with [project-brief.md](product/project-brief.md)
- **Joining the team?** Read the [workflow guide](process/workflow.md) and [git workflow](process/git-workflow.md)
- **Starting a task?** Check [requirements](product/requirements.md) and [sprint planning](planning/sprint-1-planning.md)
- **Making a design decision?** Review [decision log](meetings/decision-log.md) and relevant ADRs
- **Need context?** Check [research](research/) and [meeting notes](meetings/)