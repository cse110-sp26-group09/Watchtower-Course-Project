# Sprint Retrospective 5


### What Went Well ✨
- Positive aspects of the sprint
- Successes and achievements
- Effective processes or decisions
- Great team moments or collaboration

### What Didn't Go Well 🚧
- Challenges encountered
- Blockers or frustrations
- Process breakdowns
- Incomplete work or scope issues

### Action Items 🎯
| Specific Improvement | Owner  | Success Metric / Connection |
| :--- | :--- | :--- |

### Lessons Learned 💡
- Key takeaways for the team
- Technical insights or discoveries
- Process improvements to try
- Dependencies or constraints to remember

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
