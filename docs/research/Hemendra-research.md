# User Personas

### 1. Maya — Security & Compliance Officer
[Source](https://www.datadoghq.com/product/cloud-security-management/)

#### Main Need
Identify if system anomalies are operational failures or potential security incidents.

Maya needs to ensure that the company is secure, compliant, and audit-ready.  
She needs to know when there are unusual spikes in errors, failed requests, or API traffic,  
and if any of it is cause for concern. 

She needs monitoring systems that give clear audit trails, authentication logs,  
deployment history, and traceable incident timelines.

#### Hiccups
- Distinguishing between bugs and bad actors
- Actually investigating incidents takes a lot of time and resources.
- Compliance reporting requires detailed historical records

#### User Story
As a security officer, I want to correlate application errors with authentication  
and API activity so that I can quickly determine whether an issue is a system failure or a security threat.

---

### 2. Jordan — Customer Support Lead
[Source](https://www.datadoghq.com/product/real-user-monitoring/)

#### Main Need
Quickly verify customer-reported issues without waiting on engineering.

Jordan is usually the first person customers contact when something breaks.  
Most reports are vague, repetitive, or missing technical details, which makes it hard to know 
whether the issue is isolated or affecting everyone.

He wants a dashboard that clearly shows outages, frontend error spikes, degraded services, 
and ongoing incidents, so the support team can confidently respond to users in real time.

#### Hiccups
- Customers report problems before engineers even see them
- Hard to tell if an issue affects one user or the whole platform
- Support depends too heavily on engineering for updates
- Delayed responses frustrate customers even more

#### User Story
As a customer support lead, I want visibility into live application issues so that I can 
quickly confirm customer reports and provide accurate updates without waiting for engineering.

---

### 3. Elena — Growth Marketer
(Same source as for Jordan)

#### Main Need
Understand how frontend performance impacts user behavior and conversions.

Elena focuses on improving conversion rates, campaign performance, and user engagement.  
When a new redesign, animation, or experiment launches, she wants to know whether it actually 
improved the user experience or silently slowed the site down.

She needs analytics that connect technical performance metrics with real business outcomes like 
signups, purchases, and bounce rates.

#### Hiccups
- Marketing data and performance data are disconnected
- Slow pages hurt conversions
- Difficult to prove whether UX changes caused engagement drops
- Performance issues often go unnoticed until campaigns underperform

#### User Story
As a growth marketer, I want to connect site performance with conversion analytics so that I can 
understand how frontend changes affect campaign performance and revenue.

---

### 4. Marcus — QA / Automation Engineer
[Source](https://support.pagerduty.com/main/docs/user-roles)

#### Main Need
Understand why bugs pass testing but still appear in production.

Marcus is responsible for automated testing and release reliability.  
He spends a lot of time dealing with flaky tests, inconsistent environments, and bugs that only 
appear once real users interact with the application.

He wants to compare staging and production behavior side-by-side to understand what testing missed 
and why deployments sometimes fail unexpectedly.

#### Hiccups
- Flaky tests reduce confidence in releases
- Production behavior differs from staging
- Real-world failures are difficult to reproduce
- Limited visibility into deployment-specific regressions

#### User Story
As a QA engineer, I want to compare staging and production error trends so that I can identify 
gaps in testing coverage before users are affected.

---

### 5. Sam — Freelance Consultant
[Source](https://www.ssa.group/competencies/devops/)

#### Main Need
Monitor multiple client applications from one simple dashboard.

Sam manages websites and applications for several clients simultaneously.  
He does not want to maintain separate monitoring platforms or pay enterprise-level pricing 
for every small client project.

He wants a lightweight dashboard where he can quickly monitor uptime, deployments, frontend errors, 
and overall system health across all projects in one place.

#### Hiccups
- Too many separate tools across client projects
- Enterprise monitoring software is too expensive for smaller clients
- Constant context switching wastes time
- Clients expect proactive support and fast issue resolution

#### User Story
As a freelance consultant, I want a centralized monitoring dashboard for all client projects so that I can 
proactively manage issues without increasing operational overhead.

# Research Index

## Key Takeaways

- **Logs are security signals.**
  Maya’s use case shows that spikes in errors, failed logins, and weird API traffic = an early warning system for security stuff.

- **“Works in staging” is still a real problem.**
  Marcus needs a clean way to compare staging vs prod so we can actually see what broke, not guess.

- **Simple but powerful**
  Sam doesn’t need Datadog-level complexity, but also outgrows basic uptime tools. Freelancers are stuck in between.

---

## Open Questions

- **Security vs simplicity**  
  How much user data do we actually store to support security use cases (IPs, auth logs, request traces)? And how do we keep that safe without overengineering it?

- **Multi-tenant setup (Sam problem)**  
  Do we need real project isolation + switching in the UI?  
  And how strict do we make data separation between clients?

- **Support-friendly mode (Jordan)**  
  Can we build a clean read-only view so support can see what’s happening without touching config or drowning in technical noise?
