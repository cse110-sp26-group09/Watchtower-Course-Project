# Generative AI Usage Documentation

[Format](#genai-usage-format)
[Example](#example)
[Sprint 1](#sprint-1)
[Sprint 2](#sprint-2)
[Sprint 3](#sprint-3)
[Sprint 4](#sprint-4)
---
## GenAI Usage format:
- **Name:**
- **Date:**
- **Sprint #:**
- **Model:** What model and version of GenAI did you use (e.g. Codex 5.2 medium reasoning)
- **LOC:** How many lines of code did it write
- **Scale:** What files/folders did GenAI change/create in codebase (e.g. in 'x' file, 'y' folder)
- **Description:** Give a small description of what you asked GenAI to do and why it was it was needed.
- **Prompt:** What prompt did you feed model

***Make sure to create new header for new sprint and link it at the top***
---
## Example:
- **Name:** Josh Victoria
- **Date:** 05/10/2026
- **Sprint #**: 1 
- **Model:**Codex 5.2 medium reasoning
- **LOC:** 9
- **Scale:** `requirements.md`
- **Description:** Used Codex to create a example of what a requirement would look like and used it as a template to create other requirements 
- **Prompt:** "Give me a template for what a requirement for a code product with a verfication parameter using markdown"

---

# Sprint 1
- **Name:** Josh Victoria
- **Date:** 05/10/2026
- **Sprint #**: 1 
- **Model:**Codex 5.2 medium reasoning
- **LOC:** 9
- **Scale:** `requirements.md`
- **Description:** Used Codex to create a example of what a requirement would look like and used it as a template to create other requirements 
===
# Sprint 2


===
# Sprint 3

- **Name:** Hemendra Ande
- **Date:** May 20, 2026
- **Sprint #:** 3
- **Model** GPT-5.3-Codex (Medium reasoning)
- **LOC:** ~1,600 lines written (plus ~800 lines edited/refactored)
- **Scale:** Updated src/prototype_2/index.html, src/prototype_2/style.css, and src/prototype_2/dashboard.js
- **Description:** Asked GenAI to redesign the WatchTower UI/UX into a cleaner, developer-focused dashboard (dark/light theme support, improved sidebar/navigation, tighter alert-table readability, and bundling overview KPIs with related detail sections), while preserving existing functionality and state behavior. Also used it to fix an index.html structure/syntax issue and keep keyboard accessibility intact.

- **Name:** Woosik Kim
- **Date:** May 20, 2026
- **Sprint #:** 3
- **Model:** Claude Opus 4.6 (Anthropic, Cowork desktop mode)
- **LOC:** ~168 lines written (one new e2e test file)
- **Scale:** Created `tests/e2e/api-events-filters.spec.js`
- **Description:** Asked the assistant to write end-to-end tests for the `GET /api/events` query filters (requirement F8), which the existing suite did not cover beyond a single smoke check. It first read the actual backend (`server.js`, `server-helpers.js`'s `filterEvents`, `src/shared/utils/event-utils.js`, the existing `watchtower.spec.js`, and `playwright.config.js`) to match the real contract, then wrote 9 Playwright API tests covering the `type`, `version` (maps to `deployVersion`), and `limit` parameters, including most-recent-N ordering, no-match, and invalid/zero-limit fallback. Each test seeds its own events under a unique `deployVersion` tag so assertions stay deterministic against the shared in-memory buffer. The assistant ran the tests against a live `npm start` server on `main` and confirmed all 9 pass.
---
- **Name:** Hieu Le
- **Date:** 05/20/2026
- **Sprint #**: 3
- **Model:**Codex 5.2 medium reasoning
- **LOC:** +1,520 lines written -3,803 lines deleted
- **Scale:** Updated WatchTower transparent logo assets and related prototype 1 server files.
- **Description:** Asked GenAI to implement a dark / light theme , improved UI / UX, make it compatible with the backend, fixed couple UI issues, implemented professor's feedback, aiming to make it more simplistic and UI friendly.
===

- **Name:** Josh Victoria
- **Date:** 05/20/2026
- **Sprint #**: 3 
- **Model:**Gemini flash 3
- **LOC:** 14
- **Scale:** `Adr/ReadME.md`
- **Description:** Used Gemini to generate a couple of alternatives for our ADR with a small description of what their strengths are
---
- **Name:** Jason Nguyen
- **Date:** 05/24/2026
- **Sprint #**: 3 
- **Model:** GPT-5.3-Codex (Medium reasoning)
- **LOC:** 394
- **Scale:** `Course-Project/src/prototype_1/server/server-1.1.js`
- **Description:** Used codex to generate a server that connects a database using the event schemas defined for our project.
---
- **Name:** Jason Nguyen
- **Date:** 05/24/2026
- **Sprint #**: 3 
- **Model:** GPT-5.3-Codex (Medium reasoning)
- **LOC:** 602
- **Scale:** `Course-Project/src/prototype_1/server/server-1.1.js`
- **Description:** Used codex to update server.js to integrate with our prototype 1 demo and watchtower app.
---
- **Name:** Jason Nguyen
- **Date:** 05/24/2026
- **Sprint #**: 3 
- **Model:** GPT-5.3-Codex (Medium reasoning)
- **LOC:** 604
- **Scale:** `Course-Project/src/prototype_1/server/server-1.1.js`
- **Description:** Used codex to update server-1.1.js JSDoc to use classic JSDoc grammar.
===

# Sprint 4

- **Name:** Josh Victoria
- **Date:** 05/26/2026
- **Sprint #**: 4
- **Model:**Gemini flash 3
- **LOC:** 3549
- **Scale:** `Course-Project/src/Landing-Page/`
- **Description:** Used Gemini to generate a landing page based off of a wire frame then tweaked that inital page
- **Prompt:** Create a Landing page based off of the wireframe in `design/media/Landing Page.png`, In the whitespace below the get started button, create a meet the team section using this picture in `src/Landing-Page/assets`

- **Name:** Hieu Le
- **Date:** 05/26/26
- **Sprint #:** 4
- **Model:** What model and version of GenAI did you use (e.g. Codex 5.2 medium reasoning)
- **LOC:** How many lines of code did it write
- **Scale:** What files/folders did GenAI change/create in codebase (e.g. in 'x' file, 'y' folder)
- **Description:** Give a small description of what you asked GenAI to do and why it was it was needed.
- **Prompt:** What prompt did you feed model


- **Name:** Hemendra
- **Date:** 05/27/26
- **Sprint #:** Sprint 4
- **Model:** OpenAI Codex
- **LOC:** Approximately 2,000+ lines modified across Prototype 3 frontend/backend files
- **Scale:** Modified src/prototype_3/app.js, src/prototype_3/index.html, src/prototype_3/style.css, src/prototype_3/server/server.js, and src/prototype_3/sdk/watchtower.js
- **Description:** Asked GenAI to polish Prototype 3 and build out the Developer View for a PostHog-style analytics/observability platform. This was needed to make Developer View feel closer to DevTools/Datadog/Sentry/Segment debugger, with real event inspection, schema diagnostics, SDK health, query tools, feature flag debugging, identity resolution, performance/error monitoring, pipeline observability, governance panels, and CI fixes.
- **Prompt:** Polish up the UI and features of prototype-3. Work on Prototype 3. Build a developer-focused analytics workspace that feels closer to Chrome DevTools, Datadog, Sentry, and Segment debugger than a traditional analytics dashboard. Prioritize observability, debugging, instrumentation trust, raw event inspection, schema validation, realtime diagnostics, and operational visibility. Implement live event stream, schema registry, session replay dev overlay, SDK diagnostics, query playground, feature flag debugger, identity resolution viewer, performance monitoring, error monitoring, pipeline observability, environment support, and data governance. Maintain existing code style and fix failing CI/lint issues.


- **Name:** Jason Nguyen
- **Date:** 05/30/26
- **Sprint #:** 4
- **Model:** Codex 5.5 medium reasoning
- **LOC:** 532
- **Scale:** src/prototype_1/event-store.js
- **Description:** Asked codex to reformat event-store.js to migrate from sqlite to postgresql access patterns so that it is compatible with supabase.
- **Prompt:** can you reformat event-store.js to migrate all code using SQLite to work with PostgreSQL Supabase

- **Name:** Jason Nguyen
- **Date:** 05/30/26
- **Sprint #:** 4
- **Model:** Codex 5.5 medium reasoning
- **LOC:** 342
- **Scale:** src/prototype_1/server.js
- **Description:** Asked codex to reformat server.js to migrate from sqlite to postgresql access patterns so that it is compatible with supabase.
- **Prompt:** can you rewrite server.js to use PostgreSQL to match event-store.js
===

# Sprint 5

- **Name:** Jason Nguyen
- **Date:** 06/03/26
- **Sprint #:** 5
- **Model:** Codex 5.5 medium reasoning
- **LOC:** 249
- **Scale:** sdk/watchtower.js, app.js, index.html
- **Description:** Asked codex to add UI element interaction tracking to the standalone SDK to mimic the functionality in the demo.
- **Prompt:** look under Course-project/src/prototype_3/demo/app.js and notice the event listeners that allow the app to track specific UI element interaction counts. Now look at the current tracking capabilities in watchtower-test-app. Please tell me if this functionality can be captured by only modifying watchtower-test-app/sdk/watchtower.js

- **Name:** Jason Nguyen
- **Date:** 06/05/26
- **Sprint #:** 5
- **Model:** Codex 5.5 medium reasoning
- **LOC:** 139
- **Scale:** src/prototype_3/demo/app.js, src/prototype_3/demo/style.css
- **Description:** Asked codex to implement the 1-5 star rating feedback to the demo and test app.
- **Prompt:** right now the send feedback button sends a fixed 4 star rating. Please make it so that clicking it opens a popup that allows the user to select between 1-5 stars to send as a rating signal.

- **Name:** Jason Nguyen
- **Date:** 06/05/26
- **Sprint #:** 5
- **Model:** Codex 5.5 medium reasoning
- **LOC:** 609
- **Scale:** src/prototype_3/server/event-store.js, src/prototype_3/server/server.js, src/prototype_3/app.js, src/prototype_3/index.html, src/prototype_3/README.md
- **Description:** Asked codex to add database integration for the analytics charts and most-clicked features so that they can display persistent, historical data. Also asked to set limits to the tab heights.
- **Prompt:** please review the logic for the user count, user activity, issues, and response latency charts, which have suffered from dropping some values in the past. Make sure that they use database information from server/event-store.js, so that they show historical data from all time. Also, please apply the same fix to the most-clicked features tabs on the home page. For analytics, can you configure a peak height for the issues chart and user activity? By default, set the peak for issues to 100 and the peak for user activity to 500. The idea is to have the height for values that go beyond these peaks to be the same so that the difference between heights isn't so dramatic. Also, please make this value easily editable and point me to where it is

- **Name:** Josh Victoria
- **Date:** 6/5/26
- **Sprint #:** 5
- **Model:** Codex 5.5 low reasoning
- **LOC:** 509
- **Scale:** `api-contract-v2.md`
- **Description:** based off of ADRs, explain how the apis work together using ADRs in a way that is helpful for creating an API-contract
