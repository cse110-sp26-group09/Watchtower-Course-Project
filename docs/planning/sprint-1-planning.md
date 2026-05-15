# Sprint 1 Planning Document

## Project Name

WatchTower

## Sprint

Sprint 1

## Sprint Deadline

Sunday, May 10, 2026

## Sprint Focus

Sprint 1 focuses on research, team alignment, MVP definition, workflow setup, and early prototype planning.

The goal of this sprint is not to build the full product. The goal is to make sure every team member understands the project, knows their role, and has a clear direction for future implementation.

---

## Sprint Goal

By the end of Sprint 1, the team should have a shared understanding of WatchTower, a clearly defined MVP, initial research completed, GitHub workflow established, and early prototype direction documented.

### Sprint Goal Statement

Our Sprint 1 goal is to align the entire team around the WatchTower project, define the MVP, organize the GitHub workflow, complete early research, and prepare the team for focused implementation in future sprints.

---

## Expected Sprint Outcomes

By Sunday, May 10, 2026, the team should have:

- Research notes completed
- Shared understanding of the WatchTower project
- MVP definition drafted
- Functional and non-functional requirements drafted
- User stories drafted
- Initial dashboard wireframes or design direction
- Initial prototype direction documented
- GitHub Issues created and assigned
- Workflow and label conventions documented
- Communication norms documented
- Risk log documented
- Team acknowledgment completed

---

## Project Summary

WatchTower is a lightweight observability system that helps teams understand what their software is doing.

At a minimum, WatchTower should help capture and display:

- JavaScript errors
- Browser performance signals
- User feedback signals
- Basic deployment or build-related context if feasible

The project should prioritize a clear software engineering process, including planning, documentation, GitHub Issues, Pull Requests, reviews, standups, and retrospectives.

---

## Sprint 1 Main Deliverables

| Deliverable | Description | Owner | Support | Reviewer |
|---|---|---|---|---|
| `docs/sprint-1-planning.md` | Sprint goal, roles, workflow, risks, cadence, and plan | Aditya | Josh | Fahad |
| `docs/workflow.md` | GitHub workflow, labels, issue conventions, PR rules | Aditya | Josh | Fahad |
| `docs/mvp.md` | Minimum viable product definition | Fahad | Aditya | James |
| `docs/requirements.md` | Functional and non-functional requirements | Josh | Fahad | Aditya |
| `docs/user-stories.md` | User stories for the MVP | Josh | Hieu | Fahad |
| `docs/design/sprint-1-wireframes.md` | Initial dashboard wireframes or design direction | Hieu | James | Aditya |
| GitHub Issues Backlog | At least 18 initial issues (minimum 15) with owner/support/reviewer fields | Aditya | Josh | Fahad |
| Prototype Direction | Initial plan for dashboard and instrumentation prototype | Daniel | Jason, Waleed | Aditya |

---

## Team Roles and Responsibilities

### Aditya — Technical Lead / GitHub / CI-CD / Architecture

Responsibilities:

- Set up repository structure
- Create branch naming and commit message guidelines
- Set up GitHub Issues, PR template, and issue template
- Start GitHub Actions / CI workflow
- Review architecture and technical decisions
- Help define MVP from a technical feasibility perspective
- Review major technical Pull Requests
- Help identify technical risks early

---

### Fahad — Product / Process / Sprint Documentation Lead

Responsibilities:

- Help define the MVP
- Draft sprint planning documentation
- Organize functional and non-functional requirements
- Track sprint progress
- Help prepare TA/professor questions
- Support design and product decisions
- Help keep the team aligned with Sprint 1 goals

---

### James — Frontend Lead

Responsibilities:

- Lead dashboard frontend structure
- Help define main UI pages and components
- Work on static dashboard prototype
- Support responsive layout and visual consistency
- Coordinate frontend tasks with Hieu, Alex, and Hemendra
- Review frontend implementation tasks

---

### Hieu — UI/UX Lead

Responsibilities:

- Create initial wireframes
- Help define user flow
- Work on dashboard design and layout
- Support user-centered design artifacts
- Help make the product clear and usable
- Support user stories from a usability perspective

---

### Daniel — Instrumentation / Backend Prototype Lead

Responsibilities:

- Research and prototype error/performance event capture
- Help define event schemas
- Work with Jason and Waleed on data flow
- Support testing strategy later in the sprint
- Help connect prototype logic with dashboard needs
- Support CI/testing discussions with Aditya

---

### Jason — JavaScript Instrumentation Owner

Responsibilities:

- Research browser-side JavaScript error capture
- Prototype error logging using client-side JavaScript
- Support performance tracking prototype
- Work with Daniel on test app/demo page behavior
- Document early technical findings

---

### Waleed — Data / Backend Logic Owner

Responsibilities:

- Help define data schemas for error, performance, and feedback events
- Work on data normalization
- Support storage approach for prototype data
- Work with Daniel and Jason on event flow
- Help decide what event fields are needed for the dashboard

---

### Josh — Documentation / Communication / Requirements Support

Responsibilities:

- Help document research findings
- Support MVP, requirements, and user story documentation
- Help capture meeting notes and sprint updates
- Keep documentation organized in GitHub
- Support backlog and workflow documentation

---

### Woosik — Research / QA / AI Tools Support

Responsibilities:

- Support research on observability, security, and testing
- Help create QA checklists
- Use AI tools carefully to support research/prototype exploration
- Document useful GenAI contributions
- Support future testing strategy planning

---

### Alex — Frontend Prototype Support

Responsibilities:

- Help build dashboard cards, tables, and basic UI sections
- Support frontend implementation with James and Hieu
- Help test responsiveness and usability
- Support prototype development

---

### Hemendra — Frontend Components / Styling Support

Responsibilities:

- Help build reusable frontend components
- Support styling consistency
- Work on dashboard layout sections
- Help document frontend component decisions
- Support James and Hieu with frontend implementation

---

## Owner / Support / Reviewer Model

Each major task should have:

- **Owner:** Person responsible for completing and moving the task forward
- **Support:** Person helping with research, drafting, coding, testing, or review preparation
- **Reviewer:** Person responsible for checking the work before it is considered done

### Expectations

The owner should:

- Understand the task
- Ask questions early
- Keep the GitHub Issue updated
- Complete the deliverable
- Open a Pull Request if needed

The support person should:

- Help the owner complete the task
- Pair when useful
- Review drafts before the final review
- Help unblock the owner

The reviewer should:

- Check that the work matches the acceptance criteria
- Confirm documentation is clear
- Request changes if needed
- Approve the work when complete

---

## Sprint 1 Work Breakdown by Role

### Product and Process Work

| Task | Owner | Support | Reviewer |
|---|---|---|---|
| Create Sprint 1 planning document | Aditya | Josh | Fahad |
| Define WatchTower MVP | Fahad | Aditya | James |
| Create functional and non-functional requirements | Fahad | Josh | Aditya |
| Create user stories for WatchTower MVP | Josh | Hieu | Fahad |
| Prepare TA/professor questions | Hemendra | Hieu | Aditya |
| Track team acknowledgment | James | Josh | Aditya |

---

### Research Work

| Task | Owner | Support | Reviewer |
|---|---|---|---|
| Research observability tools | Josh | Fahad | Aditya |
| Research browser error capture | Jason | Daniel | Aditya |
| Research browser performance capture | Daniel | Waleed | Aditya |
| Research security/privacy concerns | Woosik | Aditya | Fahad |
| Research dashboard patterns | Hieu | James | Fahad |

---

### Technical Setup Work

| Task | Owner | Support | Reviewer |
|---|---|---|---|
| Set up repository structure | Aditya | Daniel | James |
| Create GitHub Issue and PR templates | Aditya | Josh | Fahad |
| Create initial GitHub Actions CI workflow | Aditya | Daniel | Waleed |
| Create workflow and label convention documentation | Aditya | Josh | Fahad |
| Create initial architecture decision record | Aditya | Daniel | Fahad |
| Create backlog issues | Aditya | Josh | Fahad |

---

### Prototype Planning Work

| Task | Owner | Support | Reviewer |
|---|---|---|---|
| Define event data schemas | Waleed | Daniel | Aditya |
| Create initial dashboard wireframes | Hieu | James | Aditya |
| Build static dashboard prototype direction | James | Alex, Hemendra | Hieu |
| Create feedback widget prototype direction | Hieu | Alex | James |
| Create instrumentation prototype direction | Daniel | Jason, Waleed | Aditya |

---

## Work Style for Sprint 1

The team will use a mix of mobbing, pairing, and solo work.

### Mobbing

Use mobbing when the whole team needs shared understanding.

Mobbing should be used for:

- Project understanding
- MVP definition
- Sprint planning
- Wireframe review
- Backlog review
- Sprint review
- Retrospective

### Pairing

Use pairing when the task is technical, unclear, or benefits from collaboration.

Pairing should be used for:

- Prototype work
- Frontend dashboard work
- Instrumentation research
- Event schema design
- CI/CD setup
- Testing strategy planning

### Solo Work

Use solo work only for clearly defined tasks.

Solo work is appropriate for:

- Research notes
- Documentation drafts
- Small GitHub setup tasks
- Meeting notes
- Simple Markdown updates
- QA checklist drafting

No major task should be worked on without a GitHub Issue.

---

## Date Plan Through Sunday, May 10, 2026

### Day 1 — Sprint Planning and Alignment

Goals:

- Confirm Sprint 1 focus
- Confirm team roles
- Review project prompt
- Create or review GitHub Issues
- Begin research assignments

Deliverables:

- Sprint 1 roles posted
- Initial GitHub Issues created
- Research topics assigned
- Sprint planning document started

---

### Day 2 — Research and MVP Drafting

Goals:

- Continue observability research
- Draft MVP document
- Start requirements document
- Start user stories
- Begin dashboard design direction

Deliverables:

- Research notes in progress
- MVP draft started
- Requirements draft started
- User stories draft started
- Wireframe ideas started

---

### Day 3 — Workflow and Prototype Direction

Goals:

- Complete workflow documentation
- Define label conventions
- Create issue and PR conventions
- Start event schema planning
- Start technical prototype direction

Deliverables:

- `docs/workflow.md`
- Initial backlog issues
- Event schema draft
- Prototype approach notes

---

### Day 4 — Team Review and TA Questions

Goals:

- Review MVP draft as a team
- Review backlog as a team
- Identify unclear project expectations
- Prepare questions for TA and Professor Powell
- Review wireframe direction

Deliverables:

- Updated MVP draft
- Updated backlog
- TA/professor question list
- Wireframe review notes

---

### Day 5 — Documentation Cleanup and Early Prototype Planning

Goals:

- Clean up Sprint 1 documentation
- Finalize requirements draft
- Finalize user stories draft
- Clarify prototype tasks for Sprint 2
- Confirm all issues have owner/support/reviewer fields

Deliverables:

- `docs/requirements.md`
- `docs/user-stories.md`
- Cleaned backlog
- Prototype task list

---

### Day 6 — Sprint Review Preparation

Goals:

- Review what was completed
- Prepare sprint review notes
- Make sure team members have visible contributions
- Update GitHub Issues and labels
- Identify remaining blockers

Deliverables:

- Sprint review draft
- Updated GitHub Issues
- Team acknowledgment progress
- Risk log updated

---

### Day 7 — Sunday, May 10, 2026: Sprint Close

Goals:

- Complete Sprint 1 documentation
- Complete backlog review
- Complete team acknowledgment
- Hold review/retro if possible
- Prepare Sprint 2 direction

Deliverables:

- Sprint 1 planning document completed
- MVP draft completed
- Research notes completed or linked
- Backlog reviewed once in team sync
- Team acknowledgment completed
- Sprint 2 priorities drafted

---

## Meeting Cadence

### Sprint Planning

Purpose:

- Define sprint goal
- Assign tasks
- Confirm roles
- Review deliverables

Cadence:

- Once at the beginning of Sprint 1

Required attendees:

- All team members when possible

Output:

- Sprint planning notes saved in GitHub

---

### Standups

Purpose:

- Share progress
- Identify blockers
- Keep team aligned

Cadence:

- At least 3 times per week

Each standup should answer:

1. What did I work on since the last update?
2. What will I work on next?
3. Am I blocked by anything?

Output:

- Standup notes saved under `docs/standups/`

---

### Backlog Review

Purpose:

- Review Sprint 1 and future placeholder issues
- Confirm owner/support/reviewer fields
- Confirm labels and priorities
- Make sure tasks are realistic

Cadence:

- Once during Sprint 1

Output:

- Backlog reviewed by team
- Unclear issues updated

---

### Sprint Review

Purpose:

- Review what was completed
- Show completed documents, research, workflow, and prototype direction
- Discuss what is ready for Sprint 2

Cadence:

- End of Sprint 1

Output:

- Sprint review notes saved in GitHub

---

### Retrospective

Purpose:

- Discuss what went well
- Discuss what did not go well
- Decide what to improve for Sprint 2

Cadence:

- End of Sprint 1

Output:

- Retrospective notes saved under `docs/retrospectives/`

---

## Communication Norms

### Slack

Use Slack for:

- Quick questions
- Status updates
- Blockers
- Meeting reminders
- Team coordination
- Asking for help

Expected behavior:

- Respond to direct questions within a reasonable time
- Post blockers early
- Keep updates clear and specific
- Use threads when possible to avoid clutter

---

### GitHub

Use GitHub for:

- Issues
- Pull Requests
- Code review
- Documentation
- Sprint evidence
- Final decisions
- Tracking task ownership

Expected behavior:

- Each task should have a GitHub Issue
- Each issue should include owner/support/reviewer
- Each PR should link to an issue
- Major decisions should be documented

---

### Documentation

Use documentation for:

- Workflow rules
- Sprint plans
- Meeting notes
- Requirements
- MVP definition
- Research findings
- Architecture decisions
- Retrospectives

Expected behavior:

- Update documentation throughout the sprint
- Do not wait until the end
- Keep documents clear and organized

---

## Escalation Path

If a team member is blocked, use this escalation path:

1. **Ask the support person** assigned to the issue.
2. **Ask the reviewer** if the blocker is related to acceptance criteria or direction.
3. **Ask the relevant lead**:
   - Technical blocker: Aditya
   - Frontend/UI blocker: James or Hieu
   - Product/process blocker: Fahad
   - Instrumentation/backend blocker: Daniel or Waleed
4. **Ask in the team Slack channel** if the blocker affects multiple people.
5. **Bring the question to TA ** if it affects project expectations, scope, or grading.
6. **Bring the question to Professor Powell** if it affects stakeholder expectations or major project direction.

Blockers should be raised early. A task should not stay blocked silently.

---

## Definition of Done for Documentation and Process Tasks

A documentation or process task is considered done when:

- The required document exists in the correct folder
- The content is clear and complete enough for the team to use
- The task has a related GitHub Issue
- The issue includes owner/support/reviewer fields
- Acceptance criteria are completed
- The work has been reviewed
- Any important decision is documented
- Any GenAI usage is disclosed if meaningful
- The related Pull Request is merged, if a PR was used

---

## Definition of Done for Sprint 1

Sprint 1 is considered complete when:

- Sprint 1 planning document exists
- Workflow documentation exists
- MVP draft exists
- Requirements draft exists
- User stories draft exists
- Research notes are completed or in progress with clear owners
- At least 15 GitHub Issues are created
- Major tasks include owner/support/reviewer model
- Date plan through May 10, 2026 is documented
- Communication norms are documented
- Escalation path is documented
- Risk log is documented
- Backlog is reviewed once in team sync
- Team acknowledgment is completed

---

## Risk Log

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| Team members may not fully understand the project scope | High | Medium | Use Sprint 1 for alignment, research, MVP discussion, and Slack clarification | Fahad |
| Too much coding may start before MVP is defined | High | Medium | Require MVP and requirements draft before heavy implementation | Aditya |
| GitHub Issues may become inconsistent | Medium | Medium | Use issue templates and workflow documentation | Aditya |
| Backend/instrumentation work may be unclear | High | Medium | Pair Daniel, Jason, and Waleed on research and prototype direction | Daniel |
| Frontend team may build UI before data schema is clear | Medium | Medium | Coordinate dashboard structure with event schema work | James |
| Documentation may be left until the end | High | Medium | Assign documentation owners and require incremental commits | Fahad |
| Testing may be delayed | Medium | Medium | Create future testing placeholder issue and involve Daniel/Woosik early | Daniel |
| Team members may work without review | Medium | Medium | Require owner/support/reviewer model for major tasks | Aditya |
| Communication may become scattered | Medium | Medium | Use Slack for quick coordination and GitHub for official tracking | Fahad |
| TA/stakeholder expectations may be unclear | High | Medium | Collect questions and bring them to TA or Professor Powell early | Fahad |

---

## Team Acknowledgment

Each team member should acknowledge that they understand:

- Sprint 1 goal
- Their role
- Their assigned responsibilities
- The owner/support/reviewer model
- Communication norms
- Escalation path
- May 10, 2026 deadline

### Acknowledgment Checklist

| Team Member | Acknowledged? |
|---|---|
| Aditya | [ ] |
| Fahad | [ ] |
| James | [ ] |
| Hieu | [ ] |
| Daniel | [ ] |
| Jason | [ ] |
| Waleed | [ ] |
| Josh | [ ] |
| Woosik | [ ] |
| Alex | [ ] |
| Hemendra | [ ] |

---

## Questions for TA / Professor Powell

The team should collect and refine questions during Sprint 1.

Initial questions:

1. Are we expected to build our own test app, or will one be provided?
2. Are we allowed to modify a test app to add logging scripts?
3. Can prototype data be stored locally or in static JSON for the MVP?
4. Are external libraries allowed for charts, testing, or dashboard UI?
5. What level of deployment/build signal integration is expected?
6. What are the minimum expectations for unit and e2e testing?
7. Should WatchTower prioritize developer users, project managers, or both?
8. How much functionality is expected by the end of the quarter versus how much process evidence?

---

## Final Sprint 1 Priority

The most important Sprint 1 outcome is team alignment.

By the end of the sprint, everyone should understand:

- What WatchTower is
- What problem it solves
- What the MVP includes
- What their role is
- How work is tracked
- How to ask for help
- What needs to happen next in Sprint 2