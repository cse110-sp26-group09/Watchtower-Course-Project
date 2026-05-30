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

### ADR-0001: Initial WatchTower Architecture
- **Status:** Accepted
- **Date:** *(Sprint 1)*
- **Summary:** Lightweight static prototype using vanilla JavaScript, HTML, CSS, and Node.js backend.
- **Link:** [ADR-0001.md](./ADR-0001.md) or see content below

### ADR-0002: Use Node.js for WatchTower Backend
- **Status:** Accepted
- **Date:** *(Sprint 3)*
- **Summary:** Use Node.js as the backend runtime due to its event-driven architecture, native JSON support, and suitability for telemetry ingestion.
- **Link:** [ADR-0002.md](./ADR-0002.md) or see content below

### ADR-0003: Use SQLite for WatchTower Event Storage
- **Status:** Superseded
- **Date:** *(Sprint 4)*
- **Summary:** Initial database choice for MVP development. Superseded by ADR-0007.
- **Link:** [ADR-0003.md](./ADR-0003.md) or see content below

### ADR-0004: Use Navigation Timing API for Frontend Performance Telemetry
- **Status:** Accepted
- **Date:** *(Sprint 4)*
- **Summary:** Use the browser-native Navigation Timing API to collect frontend performance metrics and Real User Monitoring (RUM) data.
- **Link:** [ADR-0004.md](./ADR-0004.md) or see content below

### ADR-0005: Use Beacon API for Reliable Telemetry Delivery
- **Status:** Accepted
- **Date:** *(Sprint 4)*
- **Summary:** Use the browser-native Beacon API to reliably deliver frontend telemetry and session finalization events.
- **Link:** [ADR-0005.md](./ADR-0005.md) or see content below

### ADR-0006: Use Clerk for WatchTower Authentication
- **Status:** Accepted
- **Date:** *(Sprint 4)*
- **Summary:** Use Clerk as the managed authentication provider for user authentication, session management, and route protection.
- **Link:** [ADR-0006.md](./ADR-0006.md) or see content below

### ADR-0007: Migrate WatchTower Event Storage from SQLite to PostgreSQL
- **Status:** Accepted
- **Date:** *(Sprint 4)*
- **Summary:** Replace SQLite with PostgreSQL to better support hosted deployment architecture and production database requirements.
- **Link:** [ADR-0007.md](./ADR-0007.md) or see content below

### ADR-0008: Use Supabase for Managed PostgreSQL Hosting
- **Status:** Accepted
- **Date:** *(Sprint 4)*
- **Summary:** Use Supabase as the managed PostgreSQL provider to simplify database hosting, maintenance, and administration.
- **Link:** [ADR-0008.md](./ADR-0008.md) or see content below

### ADR-0009: Use Render for WatchTower Application Hosting
- **Status:** Accepted
- **Date:** *(Sprint 4)*
- **Summary:** Use Render as the primary hosting platform for WatchTower's frontend and backend services.
- **Link:** [ADR-0009.md](./ADR-0009.md) or see content below

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
Accepted

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

- **Status:** Superseded  
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
Accepted

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
Accepted

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

---

## ADR-0006: Use Clerk for WatchTower Authentication

### Status
Accepted

### Date
2026-05-30

---

### Context

WatchTower requires user authentication to support:
- protected dashboard access
- user-specific data
- secure project ownership
- team/member-based access control
- future role-based permissions and UI

Building authentication from scratch would require implementing:
- secure password storage
- session management
- login and signup flows
- password reset flows
- token validation
- account security protections

This would add security risk and development overhead that is outside the core scope of WatchTower.

---

### Decision

Use **Clerk** as the authentication provider for WatchTower.

Clerk will handle:
- user signup and login
- session management
- authentication UI components
- OAuth/social login support
- frontend/backend authentication integration

---

### Rationale

- Clerk provides managed authentication with minimal setup
- Reduces security risk compared to custom authentication
- Speeds up development by providing prebuilt auth flows and UI components
- Integrates well with modern JavaScript and Node.js applications
- Supports protected frontend routes and backend request validation
- Allows WatchTower to focus on observability features instead of authentication infrastructure
- Provides a path for future user/team management and role-based access control

---

### Alternatives Considered

#### Custom Authentication

Rejected because it would require implementing and maintaining sensitive security functionality, including password hashing, session handling, password resets, and account protection.

#### Auth0

Rejected because it adds more configuration and platform complexity than needed for the current WatchTower scope.

#### Firebase Authentication

Rejected because it would couple authentication more closely with the Firebase ecosystem, while WatchTower is currently built around a Node.js and SQLite architecture.

---

### Consequences

#### Positive
- Faster authentication implementation
- Reduced security burden
- Built-in login, signup, and session management
- Easier route protection
- Supports future team and organization features
- Allows the team to focus on WatchTower telemetry and dashboard functionality

#### Negative
- Adds dependency on an external authentication provider
- Introduces vendor lock-in risk (marrying decision)
- Authentication behavior depends on Clerk service availability
- Some customization may be limited by Clerk’s platform features
- Pricing or plan limits may matter if WatchTower scales

---

### Conclusion

Clerk was selected because it provides a secure, developer-friendly authentication layer that aligns with WatchTower’s lightweight MVP goals while supporting future expansion into protected dashboards, user-owned projects, and team-based access control.

---

## ADR-0007: Migrate WatchTower Event Storage from SQLite to PostgreSQL

### Status
Accepted

### Date
2026-05-30

---

### Context

ADR-0003 selected SQLite as the primary database for WatchTower due to its lightweight setup and suitability for rapid MVP development.

As WatchTower has evolved, the project has moved toward a fully hosted architecture consisting of:
- a deployed frontend
- a deployed Node.js backend
- cloud-hosted infrastructure

While SQLite was appropriate during local development, its file-based architecture introduces challenges in hosted environments:
- database files must be managed alongside application deployments
- persistence becomes dependent on server filesystem storage
- database access is tied to a single application instance

WatchTower requires a database solution that is designed for hosted and production environments.

---

### Decision

Replace SQLite with PostgreSQL as the primary database for WatchTower.

PostgreSQL will be used for:
- telemetry event storage
- user and project metadata
- performance metrics
- error logs
- feedback submissions

This decision supersedes ADR-0003.

---

### Rationale

- PostgreSQL is designed for hosted and production deployments
- Separates application infrastructure from data storage
- Allows the backend and database to be deployed independently
- Supported by major cloud providers and hosting platforms
- Simplifies long-term deployment and maintenance
- Provides a clear path for future scalability without requiring another database migration
- Integrates well with the existing Node.js backend architecture

---

### Alternatives Considered

#### Continue Using SQLite

Rejected because SQLite is primarily intended for local and embedded use cases. Its file-based storage model creates deployment and infrastructure limitations for a hosted observability platform.

#### MongoDB

Rejected because WatchTower's DB accesses are configured for relational queries and migrating would incur a big overhead.

---

### Consequences

#### Positive
- Better alignment with hosted deployment architecture
- Clear separation between application and database infrastructure
- Easier cloud deployment and management
- Improved maintainability
- Supports future growth without another database migration

#### Negative
- Increased deployment complexity
- Requires management of a dedicated database service
- Higher operational overhead compared to SQLite
- Existing SQLite data may require migration

---

### Supersedes

ADR-0003: Use SQLite for WatchTower Event Storage

---

### Conclusion

PostgreSQL was selected because it better aligns with WatchTower's transition from a local prototype to a hosted observability platform. While SQLite was effective for MVP development, PostgreSQL provides a more suitable foundation for deployment, maintenance, and future expansion.

---

## ADR-0008: Use Supabase for Managed PostgreSQL Hosting

### Status
Accepted

### Date
2026-05-30

---

### Context

ADR-0007 selected PostgreSQL as the primary database for WatchTower to support the project's transition from a local prototype to a hosted application.

While PostgreSQL provides a suitable production database solution, self-hosting PostgreSQL would require:
- database provisioning
- infrastructure management
- backups and recovery configuration
- monitoring and maintenance
- security configuration

WatchTower's primary focus is observability and telemetry functionality rather than database administration.

The project requires a managed PostgreSQL solution that simplifies deployment while remaining compatible with the existing Node.js backend architecture.

---

### Decision

Use Supabase as the managed PostgreSQL provider for WatchTower.

Supabase will provide:
- managed PostgreSQL hosting
- database administration tools
- automated backups
- secure database access
- cloud-hosted infrastructure

WatchTower will continue to interact directly with PostgreSQL through the backend application.

---

### Rationale

- Supabase provides fully managed PostgreSQL infrastructure
- Reduces operational overhead associated with database administration
- Simplifies deployment and maintenance
- Includes useful database management and monitoring tools
- Supports secure remote access from the hosted backend
- Allows the development team to focus on application functionality rather than infrastructure management
- Provides a free tier suitable for academic and MVP development

---

### Alternatives Considered

#### Self-Hosted PostgreSQL

Rejected because managing database infrastructure would introduce additional operational complexity that is outside the project's primary scope.

#### Railway PostgreSQL

Rejected because Supabase provides a more mature PostgreSQL management experience and additional tooling useful during development.

#### Neon

Rejected because while Neon provides hosted PostgreSQL, Supabase offers a broader ecosystem of management tools and developer features that simplify database administration.
---

### Consequences

#### Positive
- Reduced infrastructure management burden
- Managed backups and maintenance
- Simplified deployment process
- Production-ready PostgreSQL hosting
- Easy integration with existing backend architecture
- Suitable for MVP and future project growth

#### Negative
- Introduces dependency on a third-party hosting provider
- Potential vendor lock-in
- Service availability depends on Supabase infrastructure
- Future pricing may impact long-term deployment decisions

---

### Conclusion

Supabase was selected because it provides a managed PostgreSQL platform that aligns with WatchTower’s hosted deployment architecture while minimizing operational complexity. This allows the team to focus on observability functionality rather than database administration.

## ADR-0009: Use Render for WatchTower Application Hosting

### Status
Accepted

### Date
2026-05-30

---

### Context

WatchTower requires a hosting solution for its deployed application components, including:
- frontend dashboard
- Node.js backend API
- telemetry ingestion endpoints

The hosting platform must:
- support full-stack deployment
- support long-running backend services
- integrate easily with GitHub
- provide a straightforward deployment workflow
- align with the project's hosted architecture goals

As WatchTower transitions from a local prototype to a hosted observability platform, a deployment solution is needed that can host both the frontend and backend components in a single ecosystem.

---

### Decision

Use Render as the primary hosting platform for WatchTower.

Render will host:
- the frontend application
- the Node.js backend service
- deployment infrastructure required for telemetry ingestion and dashboard functionality

---

### Rationale

- Render provides managed hosting for both static sites and backend services
- Supports Node.js applications without requiring significant infrastructure configuration
- Integrates directly with GitHub for automated deployments
- Simplifies deployment and maintenance workflows
- Provides a centralized platform for hosting WatchTower services
- Reduces operational complexity compared to self-managed infrastructure
- Suitable for MVP

---

### Alternatives Considered

#### GitHub Pages

Rejected because GitHub Pages only supports static site hosting and cannot host the WatchTower Node.js backend or telemetry ingestion endpoints.

#### Vercel

Rejected because while Vercel provides excellent frontend hosting, its architecture is more heavily optimized for frontend and serverless workloads. Render provides a more straightforward environment for hosting a persistent Node.js backend service alongside the frontend application.

---

### Consequences

#### Positive
- Simple deployment workflow
- Native support for Node.js backend services
- GitHub integration with automatic deployments
- Centralized hosting platform for frontend and backend components
- Reduced infrastructure management burden

#### Negative
- Dependency on a third-party hosting provider
- Service availability depends on Render infrastructure
- Potential future pricing considerations
- Some platform-specific deployment configurations may create migration effort if another hosting provider is adopted later

---

### Conclusion

Render was selected because it provides a straightforward hosting platform that supports both WatchTower's frontend and backend requirements while minimizing deployment complexity. Its support for persistent Node.js services and GitHub-based deployment workflows makes it a strong fit for WatchTower's hosted architecture.