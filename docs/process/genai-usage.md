# Generative AI Usage Documentation

[Format](#genai-usage-format)
[Example](#example)
[Sprint 1](#sprint-1)
---
## GenAI Usage format:
- **Name:**
- **Date:**
- **Sprint #:**
- **Model:** What model and version of GenAI did you use (e.g. Codex 5.2 medium reasoning)
- **LOC:** How many lines of code did it write
- **Scale:** What files/folders did GenAI change/create in codebase (e.g. in 'x' file, 'y' folder)
- **Description:** Give a small description of what you asked GenAI to do and why it was it was needed.

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

---

# Sprint 1:

# Sprint 2:

# Sprint 3:

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