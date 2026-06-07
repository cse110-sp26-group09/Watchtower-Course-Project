# Sprint Retrospective 5


> _The reflection sections below were filled in from the Sprint 5 decision log
> and completed issues (see below), plus the carry-over action items from
> Retrospectives 3 and 4. Sprint 5 was the final build sprint that turned the
> MVP into a hosted, authenticated, persistent product._

### What Went Well ✨
- **Production stack came together:** The prototype became a real hosted product
  this sprint — Clerk authentication (#95), a SQLite→PostgreSQL migration on
  Supabase (#96, #119), Render hosting, and Beacon + Navigation Timing capture
  (#97). The new-technology ADRs were updated to match (#108).
- **Email alerting shipped:** After researching a custom sending domain and DNS
  setup (#109), we implemented Gmail + Nodemailer OAuth2 threshold alerts so
  WatchTower emails the team when error counts cross a threshold (#114, #118).
- **Real per-user data:** The dashboard now shows the signed-in user's actual
  profile instead of a hardcoded name (#117), and user records are created/synced
  into Supabase on sign-in (#119).
- **Dashboard credibility pass:** Health-status logic with a reliability
  explanation (#122), threshold-based status colors for errors/latency/health
  (#126), a Critical/Warning/Info severity legend and correct active-issue counts
  (#125), fixed graphs and Y-axis labels (#124), and the "Top 3" → "Latest
  Issues" rename to match real behavior (#123).
- **Landing page leveled up:** Centered hero/layout (#130, #131), a product
  preview section with a dashboard mockup (#132), and a real Privacy Policy page
  describing tracked data (#133).
- **Polish + responsiveness:** Removed AI-looking emojis and tightened copy
  across the dashboard (#127), and validated responsive behavior across desktop,
  tablet, and phone viewports (#128).

### What Didn't Go Well 🚧
- **Shared display-name bug (privacy/correctness):** The profile name was stored
  under one generic `localStorage` key shared by every user on a browser, so
  user A's name leaked to user B, and custom names were overwritten on each login
  (#149, #129). A real multi-user bug caught late.
- **Misleading dev widgets:** Several developer-dashboard widgets (most-clicked
  features, severity/diagnostic controls, custom activity-over-time) were static,
  broken, or showing placeholder data and needed backend/data fixes (#120).
- **Documentation drift:** A lot of the docs no longer reflected the current
  product/architecture and required a dedicated catch-up pass (#143) — the same
  cadence problem flagged in Retrospective 3.
- **Dependency-heavy finish:** Landing Clerk, Supabase, Render, and Gmail
  alerting all in one sprint meant juggling several external services, API keys,
  and `.env`/secret handling under code-freeze pressure.

### Action Items 🎯
| Specific Improvement | Owner | Success Metric / Connection |
| :--- | :--- | :--- |
| Key per-user UI state by user identity, not a shared browser key | Frontend + Backend | Display name no longer leaks/overwrites across users on the same browser (#149, #129) |
| Make dev-dashboard widgets show real tracked data (or remove if not backed by data) | Backend | Most-clicked / severity / activity widgets are accurate, not static or misleading (#120) |
| Treat docs as part of Definition of Done | Whole team | Docs/ADRs reflect the shipped product; no end-of-project doc catch-up needed (#143) |
| Document secrets/`.env` and deployment steps for handoff | Aditya / Backend | A new maintainer can configure Clerk/Supabase/Render/Gmail from docs alone |

> Owners are attributed where the standups/decision log make them clear (auth +
> database: Aditya and Jason; Beacon/Navigation: Daniel and Woosik); team-level
> owners are used where specific assignment is not explicitly documented.

### Lessons Learned 💡
- **Managed services let a small team ship a production stack fast:** Clerk,
  Supabase, Render, and Gmail/Nodemailer let us deliver auth, persistence,
  hosting, and alerting in a single sprint — reinforcing Retrospective 4's point
  that dependencies accelerate delivery but add secret-management and
  service-dependency risk.
- **Multi-user assumptions matter even on the client:** Browser-local state must
  be scoped to the authenticated user; a single shared key is a correctness *and*
  privacy bug.
- **Dashboards need meaning, not just numbers:** Threshold-based colors, severity
  legends, and labeled axes are what make telemetry readable and trustworthy.
- **Beacon + Navigation Timing beat ad-hoc event listeners:** Moving capture onto
  browser-native APIs improved telemetry reliability and reduced latency overhead.
- **Documentation is a live habit, not a final task:** Letting docs drift created
  a large end-of-project cleanup; keeping them current per-PR avoids the debt.

---

# Decision Logs

## Sprint 5
- [x] Use Clerk API to implement authorization for sign in page and update ADR.[#95]
- [x] Setup PostgreSQL for the app and migrate existing SQLite code to work with PostgreSQL. Make sure to link to Clerk IDs down the line. Update ADR to include PostgreSQL. [#96]
- [x] Work on the implementation of BEACON API and Navigation Timing API[#97]
- [x] Add three new technologies to ADRs:[#108]
  * Render
  * PostgreSQL (update ADR 3)
  * Supabase
- [x] Research how to set up a custom sending domain so WatchTower can send alert emails from a branded address (e.g. alerts@watchtower.dev) instead of a default provider address. This is a prerequisite for the Resend email alert integration (issue #78). Covers domain registration, DNS record setup (SPF, DKIM, DMARC), and verifying the domain with Resend.[#109]
- [x] Implement Gmail API with Nodemailer OAuth2 to send alert emails from WatchTower when an error threshold is crossed. Based on the research in docs/research/email-domain-research.md (#109).[#114]
- [x] Update the backend/user profile flow so the dashboard displays the currently signed-in user’s real name/profile information instead of a hardcoded name. When a user signs in, the app should pull the correct user information and expose it to the frontend.[#117]
- [x] Implement backend support for email notifications/Google email alerts. The system should be able to send an email notification when alerts or errors pass a defined threshold, such as more than 5 alerts.[#118]
- [x] Migrate user data into Supabase so authenticated users can be stored, retrieved, and viewed correctly from the database. The backend should make sure user records are created or synced properly when users sign in.[#119]
- [x] Create a little Health status logic + reliability explanation for consumer to understand 'health metric'[#122]
- [x] If this section displays most recent issues (not highest severity), rename “Top 3 Issues” to “Latest Issues” and update subtitle/description copy to match behavior.[#123]
- [x] Add missing Y-axis labels, fix or remove empty/broken graphs (including latency graphs), and replace unclear placeholders (like em dashes) with meaningful fallback text.[#124]
- [x] Ensure active issues count renders correctly and add a clear severity legend for Critical/Warning/Info with consistent visual definitions.[#125]
- [x] Apply threshold-based status colors:[#126]
  * Errors: 0 = green, 1–10 = yellow, 10+ = red
  * Latency: <200ms = green, 200–800ms = yellow, 800ms+ = red
  * Apply similar status color rules to health, active issues, and response latency. 
- [x] Remove AI-looking emojis and polish headings/descriptions so copy is professional, readable, and consistent across dashboard pages.[#127]
- [x] Test and fix responsive behavior across desktop, tablet, iPhone, and smaller phones:[#128]
  * Sidebar icon alignment
  * Overlapping text/cards
  * Wrapping/spacing issues during resize
  * Use Polypane for cross-viewport validation. 
- [x] Remove hardcoded display name and role values from UI and replace with neutral placeholder or config-driven values.[#129]
- [x] Fix off-centered layout on landing page and properly center hero and main content blocks across common viewport sizes.[#130] 
- [x] Improve hero section quality:[#131]
  * headline clarity
  * subheading hierarchy
  * CTA emphasis
  * overall visual balance inspired by modern SaaS/product websites
- [x] Add a product preview section showing what WatchTower does, including a dashboard screenshot/mockup and concise feature explanation.[#132]
- [x] Add a visible Privacy Policy link/page that explains tracked data types (activity, errors, performance) and basic user-data handling expectations.[#133]
- [x] A lot of the documentation has not been updated to reflect our current product and architecture, make the changes to the docs to reflect these changes[#143]
- [x] The profile display name is stored under a single generic localStorage key (watchtower_profile_name), shared across all users on the same browser. This causes two bugs:[#149]
  * If user A sets a custom display name, then signs out and user B signs in, user B sees user A's name.
  * If user B signs out and user A signs back in, user A's custom name is gone (overwritten by Clerk name on every login). 
- [x] Fix the backend/data logic for the dev dashboard widgets .[#120]
  * most-clicked features
  * severity/diagnostic controls,
  * custom activity over time.
These sections should either show real tracked data or be adjusted so they are not static, broken, or misleading.
