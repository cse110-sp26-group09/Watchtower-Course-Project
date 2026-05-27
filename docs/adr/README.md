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
- **Status:** Accepted
- **Date:** *(Sprint 1)*
- **Summary:** Lightweight static prototype using vanilla JavaScript, HTML, CSS, and Node.js backend
- **Link:** [ADR-0001.md](./ADR-0001.md) or see content below

### ADR-0002: Use Node.js for WatchTower Backend
- **Status:** Accepted
- **Date:** *(Sprint 3)*
- **Summary:** Usage of Node.js as backend due to its simply front-backend integration, live event handling capacity, and native JSON handling. 
- **Link:** [ADR-0002.md](./ADR-0002.md) or see content below


### ADR-0003: Use SQLite for WatchTower Event Storage
- **Status:** Accepted
- **Date:** *(Sprint 4)*
- **Summary:** Usage of SQLite as the primary database due to its lightweight setup and easy integration with the Node.js backend architecture.
- **Link:** [ADR-0003.md](./ADR-0003.md) or see content below

### ADR-0004: Use Navigation Timing API for Frontend Performance Telemetry
- **Status:** Proposed
- **Date:** *(Sprint 4)*
- **Summary:** Usage of the browser-native Navigation Timing API for frontend performance and Real User Monitoring (RUM) metrics.
- **Link:** [ADR-0004.md](./ADR-0004.md) or see content below

### ADR-0005: Use Beacon API for Reliable Telemetry Delivery
- **Status:** Proposed
- **Date:** *(Sprint 4)*
- **Summary:** Usage of the browser-native Beacon API for frontend telemetry delivery and session finalization events.
- **Link:** [ADR-0005.md](./ADR-0005.md) or see content below


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
## ADR-0002: Use Node.js for WatchTower Backend

- **Status:** Accepted  
- **Date:** 2026-05-20  

### Context

WatchTower is a centralized observability system that captures:
- user interaction
- errors
- performance signals
- deployment telemetry

The system requires:
- live event updates
- network communication
- lightweight deployment compatibility

---

### Decision

Use **Node.js** as the backend runtime for WatchTower.

---

### Rationale

- Node.js is optimized for **I/O-bound and event-driven systems**
- WatchTower primarily handles:
  - incoming telemetry
  - DB connections
  - network requests
  - streaming updates
- Node.js supports realtime communication naturally through:
  - async event handling
  - event loops
  - callback functions
- JSON handling is native and aligns well with browser-based telemetry data
- Shared style wtih JS so frontend and backend readability is increased and complexity is reduced

---

### Alternatives Considered

#### Go
Rejected due to skill overhead needed to proficiently write in Go and increased backend complexity.

#### Python
Rejected because of potential compilation overhead and less natural live event handling.

#### Java/Spring
Rejected due to architectural and technical overhead.

---

### Consequences

#### Positive
- Strong realtime support
- Efficient concurrent connection handling
- Fast prototyping
- Simplified frontend/backend integration

#### Negative
- CPU-intensive operations can block the event loop
- Heavy computation may require worker threads or external services

---

### Conclusion

Node.js was selected due to it being able to efficiently handle asynchronous telemetry ingestion and live operational updates, key specifications for a Watchtower.

---

## ADR-0003: Use SQLite for WatchTower Event Storage

- **Status:** Accepted  
- **Date:** 2026-05-26  

### Context

WatchTower requires persistent storage for:
- user interactions
- error logs
- performance metrics
- user feedback
- deployment metadata

The database solution must:
- remain lightweight for MVP development
- support rapid development
- minimize complexity
- work well with Node.js

---

### Decision

Use **SQLite** as the primary database for WatchTower.

---

### Rationale

- SQLite is lightweight
- No separate database server setup is required
- Can easily switch to more powerful databases if needed
- Fast local development and testing
- Works naturally with Node.js backend architecture
- Suitable for moderate workloads

---

### Alternatives Considered

#### PostgreSQL
Rejected due to increased infrastructure and thus overhead needed for a working prototype.

#### MongoDB
Rejected because WatchTower's event structure works better for relational (SQL) queries.

#### MySQL
Rejected due to unnecessary server management complexity compared to SQLite.

---

### Consequences

#### Positive
- Simple setup
- Lightweight deployment
- Fast prototyping

#### Negative
- Not ideal for very high workloads
- Less scalable than dedicated database servers
- May require migration to PostgreSQL or another DB if system scale increases

---

### Conclusion

SQLite was selected because it provides a lightweight and low-maintenance framework that suits with WatchTower’s current (MVP) scope.

## ADR-0004: Use Navigation Timing API for Frontend Performance Metrics

### Status
Proposed

### Date
2026-05-26

---

### Context

WatchTower aims to provide lightweight frontend observability for:
- application performance
- user experience feedback
- operational diagnostics

The system requires a native way to accurately collect lighweight frontend page

WatchTower also requires:
- low-overhead (low latency) metric collection
- standardized browser timing data
- compatibility with modern browsers
- support for Real User Monitoring (RUM)

---

### Decision

Use the browser-native Navigation Timing API as the primary mechanism for collecting frontend page load performance telemetry.

---

### Rationale

- Enables collection of:
  - Time To First Byte (TTFB)
  - DOMContentLoaded timing
  - full page load duration
  - navigation type
- Requires no external SDKs
- Lightweight and supported by modern browsers

---

### Alternatives Considered

#### Custom JavaScript Timing Logic

Rejected because manually measuring events is less accurate and harder to maintain.

#### Third-Party Observability SDKs

Rejected due to:
- dependency overhead
- marrying decision
- increased third party dependencies
- unnecessary complexity for current project scope

#### Resource Timing API Only

Rejected because Resource Timing focuses on asset timing rather than full page navigation metrics.

---

### Consequences

#### Positive
- Lightweight implementation
- Accurate browser-native timing metrics
- No external dependency overhead
- Enables future RUM and performance dashboard features

#### Negative
- Browser support differences may require normalization logic
- Only captures navigation-level metrics
- Does not provide deeper interaction latency metrics alone

---

### Conclusion

The Navigation Timing API was selected because it provides lightweight, standardized, and browser-native performance telemetry suitable for WatchTower’s frontend observability goals.

---

## ADR-0005: Use Beacon API for Telemetry Delivery

### Status
Proposed

### Date
2026-05-26

---

### Context

WatchTower requires reliable frontend telemetry delivery for:
- session summaries
- performance reports
- frontend error diagnostics
- user interaction telemetry

Traditional asynchronous HTTP requests may fail during:
- page unload
- navigation events
- tab closure
- browser backgrounding

This can result in information loss and incomplete observability data.

WatchTower requires a mechanism for reliably transmitting final-session telemetry events without affecting user experience.

---

### Decision

Use the browser-native Beacon API fortelemetry delivery and session finalization events.

---

### Rationale

- Beacon API is specifically designed for lightweight asynchronous telemetry delivery
- Allows telemetry transmission during:
  - tab close
  - page refresh
  - route navigation
  - browser backgrounding
- Does not block page unload or navigation
- Reduces telemetry loss during session termination
- Lightweight and browser-native
- Best for:
  - frontend observability
  - analytics
  - error reporting
  - performance telemetry

---

### Alternatives Considered

#### Standard Fetch API

Rejected because requests may be cancelled during unload or navigation events.

#### Fetch API with `keepalive`

Considered but rejected as the primary mechanism because browser support and reliability is not as reliable as Beacon APIsemantics.

#### WebSockets

Rejected because bidirectional connections arenot needed for a monitoring app.

---

### Consequences

#### Positive
- Improved telemetry reliability
- Better session-end diagnostics
- Minimal user experience impact
- Lightweight implementation with no external dependencies

#### Negative
- Limited payload size
- No response body handling
- Best-effort delivery only
- Not suitable for transactional or critical application operations

---

### Conclusion

The Beacon API was selected because it provides a lightweight and unload-safe mechanism for transmitting critical frontend telemetry data, improving the reliability and completeness of WatchTower observability signals.