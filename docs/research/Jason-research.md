# Watchtower research

### 1. Mark — Startup Founder

[Source](https://posthog.com/docs/feature-flags)

#### Main Need

Rapid deployment of A/B testing throughout development to try different features and see which ones work based on analytics/feedback.

Quick start and deployment to get systems running fast.

#### User Story

As a founder of a startup, I want to be able to quickly deploy testing and analytics to kickstart development with minimal learning overhead. I also want to be able to work with fast feature-flagging to be able to test and roll out features as soon as possible.

---

### 2. Ivy — UI/UX Designer

[Source](https://www.eleken.co/blog-posts/ux-analytics)

#### Main Need
A clear dashboard where you can view UI/UX use flows based on deployments of the website.

Getting direct user feedback on the layout/navigation of software.

#### User Story

As a UI/UX designer, I want clear usage analytics with the UI elements, with a clear layout of different usage analytics for different version of the site with A/B testing. I want to be able to continually modify and deploy different version of the site based on this feedback.

---

### 3. Nat — Sales Manager

[Source](https://posthog.com/docs/product-analytics)

#### Main Need

Simple breakdowns of how many and how far users get in the process for subscription sign ups.

#### User Story

As a sales manager, I want simple explanations and dashboards for navigation flows for subscriptions and purchases. I want to be able to easily understand how many users choose to sign up, how far they get in the process, and retention methods.

---

### 4. Sal — Developer

### Main Need

Understand the relationships and patterns in usage statistics that offer insights into how to improve user retention/sign ups.

#### User Story

As a developer, I want different usage statistics to connect to each other so that I can clearly understand how different pathways can lead to more subscriptions and purchases.

---

### 5. Vector — Development Lead

[Source](https://posthog.com/docs/error-tracking)

### Main Need

Easy error tracking linked to specific issues/branches.

### User Story

As a development lead at a large tech firm, I want a feature-rich application with a clear dashboard and error tracking to easily assign issues to and align my team.

---

# Research Index

---

## Key Takeaways

- **Not just errors, context matters more**  
  UX and Sales are inextricably tied together. A “bug” might lose a sale. 

- **People care about paths, not isolated stats**  
  Devs don’t want 50 metrics. They want to see *how users actually move through the product* -> landing page -> click -> signup -> purchase.

- **Control is so very important**  
  Feature flags and A/B tests control risk. If something breaks, they want to shut it off immediately, not investigate for hours.

---

## Open Questions

- **Feature flags vs performance**  
  How do we add feature flags without slowing down page load or making the system heavier than it needs to be?

- **Keep it simple while scaling up**  
  Can we really keep onboarding simple while also supporting enterprise-level debugging + error tracking?

- **A/B testing UX**  
  What’s the cleanest way to show results so it actually leads to decisions, not just charts no one reads?
