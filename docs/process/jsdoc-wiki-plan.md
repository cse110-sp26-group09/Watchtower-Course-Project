# JSDoc and GitHub Wiki Plan

| Field | Value |
|---|---|
| Project | WatchTower |
| Document | `docs/process/jsdoc-wiki-plan.md` |
| Author | Aditya (Technical Lead) |
| Purpose | Define how JSDoc generation, GitHub Wiki, and API documentation should work for the final product. |
| Related docs | [`jsdoc-standards.md`](jsdoc-standards.md), [`docs-redundancy-review.md`](docs-redundancy-review.md), [`future-repo-structure-proposal.md`](future-repo-structure-proposal.md) |

---

## Current State

### JSDoc generation

The `package.json` defines:

```json
"docs:js": "jsdoc src -r -d docs/api"
```

This command:
- Recursively scans all `.js` files under `src/` (including `prototype_3/`, `shared/`, and any archived prototype code still under `src/`).
- Outputs generated HTML documentation to `docs/api/`.
- Is run as a CI check in `.github/workflows/ci.yml` (the `jsdoc-check` job verifies that `docs/api/` is generated without errors).

### Generated output is gitignored

The `.gitignore` contains:

```
# Generated API documentation (run `npm run docs:js`)
docs/api/
```

This means generated JSDoc output is **not committed** to the repo. It is regenerated on demand locally and verified in CI.

### JSDoc standards

The team has an existing standards document at `docs/process/jsdoc-standards.md` that defines comment format requirements (`@param`, `@returns`, `@deprecated`, `@typedef`, `@property`).

---

## Should Generated JSDoc Stay Gitignored?

**Recommendation: Yes, keep generated JSDoc output gitignored in the main repo.**

Reasons:
- **Generated files create noisy diffs** — every code change that touches a comment regenerates multiple HTML files, cluttering PRs with irrelevant changes.
- **Source comments are the source of truth** — the JSDoc comments in `.js` files are what developers read and maintain. The generated HTML is a derived artifact.
- **Docs can be regenerated** — any developer or CI run can produce the output with `npm run docs:js`.
- **Avoids cluttering PRs** — reviewers should focus on source changes, not generated HTML.
- **CI already validates** — the `jsdoc-check` job ensures generation succeeds, so broken comments are caught without committing the output.

---

## How to Put JSDoc in GitHub Wiki

The GitHub Wiki is a separate Git repository attached to the main project repo. It is independent of the source code and can contain curated API documentation without polluting the main repo.

### Option A: Manual Wiki Update (Recommended for This Project)

1. Run `npm run docs:js` locally.
2. Open the generated `docs/api/` output in a browser.
3. Review the generated pages for the modules you want to document.
4. Write curated Wiki pages that summarize the important APIs in human-readable form.
5. Push the Wiki pages to the GitHub Wiki repo.
6. Link Wiki pages from the main `README.md`.

**Pros:** Wiki pages are readable, focused, and maintained by humans. No noisy auto-generated content.  
**Cons:** Requires manual effort to keep Wiki in sync with code changes.

### Option B: Separate Wiki Deployment

1. Clone the GitHub Wiki repo separately:
   ```bash
   git clone https://github.com/cse110-sp26-group09/Course-Project.wiki.git
   ```
2. Generate JSDoc locally:
   ```bash
   npm run docs:js
   ```
3. Copy generated markdown/HTML summaries or curated content into the Wiki repo.
4. Commit and push to the Wiki repo:
   ```bash
   cd Course-Project.wiki
   git add .
   git commit -m "docs: update API documentation from JSDoc"
   git push
   ```

**Pros:** Keeps Wiki as a deployable artifact separate from source.  
**Cons:** Two repos to maintain; still needs curation to avoid raw HTML dumps.

### Option C: CI-Generated Docs Artifact

1. CI runs `npm run docs:js` (already happens in the `jsdoc-check` job).
2. Add a step to upload the generated `docs/api/` as a build artifact:
   ```yaml
   - name: Upload JSDoc artifact
     uses: actions/upload-artifact@v7
     with:
       name: jsdoc-api-docs
       path: docs/api/
       retention-days: 30
   ```
3. Team members download the artifact from the GitHub Actions run when they need to review generated docs.
4. Generated output is never committed.

**Pros:** Zero manual effort; always available from CI.  
**Cons:** Requires downloading from GitHub Actions UI; not directly browsable.

### Recommendation for This Course Project

**Use Option A: curated Wiki pages, not raw generated JSDoc output.**

Reasons:
- Wiki should explain important modules in human-readable form with context, examples, and usage notes.
- Raw generated JSDoc can be too noisy — it produces pages for every function in every file, including archived code and internal helpers.
- Better to document only the final Prototype 3 modules that matter for the project presentation and future maintainers.
- A small number of well-written Wiki pages is more valuable than hundreds of auto-generated HTML files.

---

## What Should Receive JSDoc?

### JSDoc Required

These are the files and functions that **must** have complete JSDoc comments:

| Module | Files | Why |
|---|---|---|
| Backend API/service functions | `server/server.js` | Documents all HTTP endpoints, request/response shapes, and routing logic. |
| Event ingestion logic | `server/event-store.js` | Documents how events are stored, queried, and scoped per user in Supabase. |
| Stats and filtering helpers | `server/server-helpers.js` | Documents aggregation logic (`getStats`, `filterEvents`, percentile calculations). |
| Auth/user scoping helpers | `server/server.js` (`resolveCurrentUserId`, `requireCurrentUser`, `getIngestOwnerUserId`) | Documents the trust model, JWT verification, and per-user data scoping. |
| Alerting/email helpers | `server/mailer.js`, `server/alert-threshold.js`, `server/clerk-alert-recipients.js` | Documents threshold evaluation, email template, and recipient lookup. |
| SDK public methods | `sdk/watchtower.js` | Documents the public API that external apps use (`trackError`, `trackEvent`, `trackClick`, `trackLogin`, `init`). |
| Shared schema/utility functions | `shared/utils/event-utils.js` | Documents validation, normalization, and statistical helpers used across the stack. |

### JSDoc Optional

These files benefit from comments but are lower priority:

| Module | Files | Why |
|---|---|---|
| Simple DOM/UI helpers | `app.js` (dashboard) | UI rendering functions are often self-explanatory from their HTML bindings. |
| Landing page logic | `Landing-Page/landing.js` | Minimal logic (scroll handlers, navigation). |
| Auth page logic | `Log-In-Page/auth.js` | Clerk mounting and redirect logic — straightforward. |
| Auth guard | `auth-guard.js` | Small file with clear behavior. |
| Demo app logic | `demo/app.js`, `dashboard-demo/app.js` | Test/demo code that is not part of the public product. |

### JSDoc Not Needed

| Category | Why |
|---|---|
| Prototype 1 and Prototype 2 files (in `archive/`) | These are historical references, not active code. Adding JSDoc to archived code provides no value. |
| Generated files | `clerk-config.js` is auto-generated by `scripts/generate-clerk-config.js`. |
| Obvious private UI event handlers | `onclick`, `onchange` callbacks in HTML that do trivial DOM manipulation. |
| CSS and HTML files | JSDoc does not apply to these file types. |

---

## Do Prototype 1 and 2 Need JSDoc?

**No, not as a priority.**

Reasons:
- Prototype 3 is the final direction. All JSDoc effort should focus on the active codebase.
- Prototype 1 and Prototype 2 are historical references archived under `archive/`. They document the exploration phase, not the final product.
- The `npm run docs:js` command currently scans `src/` recursively. Since Prototype 1 and 2 have been moved to `archive/` (outside `src/`), they are already excluded from JSDoc generation.
- If any Prototype 1 or 2 code is copied into the final `src/frontend/` or `src/backend/` directories during the future restructuring, JSDoc should be added at that point — not retroactively on the archived versions.

---

## Recommended Wiki Pages

If the team creates a GitHub Wiki, these pages would provide the most value:

| Wiki Page | Content |
|---|---|
| **WatchTower Architecture** | System overview, technology stack, how frontend/backend/SDK/database fit together. Pull from `docs/architecture/system-overview.md` and `auth-workflow.md`. |
| **Event Ingestion API** | HTTP endpoints (`POST /api/events`, `GET /api/events`, `GET /api/stats`, SSE stream), request/response examples, error handling. Pull from `docs/architecture/api-contract-v1.md` and Prototype 3 server code. |
| **SDK Integration Guide** | How to add the WatchTower SDK to an external website. Initialization, configuration options, public methods, batching behavior. Pull from `sdk/watchtower.js` JSDoc and `docs/architecture/event-schema-v1.md`. |
| **Backend Services** | Event store, stats aggregation, filtering, Supabase integration. Pull from server module JSDoc. |
| **Auth and User Scoping** | Clerk authentication flow, per-user data isolation, JWT verification, trust model. Pull from `docs/architecture/auth-workflow.md`. |
| **Alerting and Email Notifications** | Threshold evaluation, Gmail OAuth setup, alert recipient lookup. Pull from `server/mailer.js` and `server/alert-threshold.js` JSDoc. |
| **Deployment Guide** | How to deploy WatchTower on Render, configure environment variables (Supabase, Clerk, Gmail), set up the external test app. Pull from `src/prototype_3/README.md` and `.env` structure. |

### Wiki page format recommendation

Each Wiki page should follow this structure:

```markdown
# Page Title

## Overview
Brief description of what this module/feature does.

## Key Functions / Endpoints
Curated list of the most important functions or API endpoints with descriptions and examples.

## Configuration
Environment variables or settings required.

## Examples
Code snippets showing typical usage.

## Related
Links to source files, ADRs, or other Wiki pages.
```

---

## Summary

| Decision | Recommendation |
|---|---|
| Keep generated JSDoc gitignored? | Yes |
| Commit generated docs to source repo? | No |
| How to publish API docs? | Curated Wiki pages (Option A) |
| What needs JSDoc? | Prototype 3 backend, SDK, shared utilities |
| What does not need JSDoc? | Archived Prototype 1/2 code, generated files, trivial UI handlers |
| Do Prototype 1/2 need JSDoc? | No — focus on Prototype 3 |
| When to write Wiki pages? | After feature freeze, before final presentation |
