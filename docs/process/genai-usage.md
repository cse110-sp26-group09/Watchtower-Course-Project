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