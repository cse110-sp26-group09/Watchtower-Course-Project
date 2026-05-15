# Watchtower Research

### 1. Ray - Backend Contractor

[Source](https://docs.sentry.io/product/issues/)

#### Main Need

A fast way to see which API routes are failing and how often, without digging through server logs manually.

#### User Story

As a backend contractor, I want to see error rates grouped by API endpoint so that I can find and fix the worst ones first without reading raw logs.

---

### 2. Priya - Mobile App Developer

[Source](https://opentelemetry.io/docs/concepts/signals/traces/)

#### Main Need

Trace a single user request from the app to the backend and back so she can figure out where things slow down.

#### User Story

As a mobile developer, I want end-to-end request tracing so that I can tell whether a slow response is caused by the network, the API, or the database.

---

### 3. Tom - SRE at a Mid-Size Company

[Source](https://docs.datadoghq.com/monitors/)

#### Main Need

Set up monitors with custom thresholds so he gets paged only when something actually matters, not on every blip.

#### User Story

As an SRE, I want configurable alert thresholds based on error rate and latency so that I only get woken up for real incidents.

---

### 4. Kim - Data Analyst

[Source](https://grafana.com/docs/grafana/latest/dashboards/)

#### Main Need

Export error and performance data into formats she can pull into her own reports and charts.

#### User Story

As a data analyst, I want to export event data as CSV or JSON so that I can build custom reports outside of WatchTower.

---

### 5. Leo - Junior Developer

[Source](https://docs.sentry.io/product/issues/issue-details/)

#### Main Need

Understand what went wrong in production without needing senior help every time. Needs clear error messages, stack traces, and the deploy version that broke things.

#### User Story

As a junior developer, I want error details with readable stack traces and deploy version tags so that I can debug production issues on my own.

---

# Research Index

---

## Key Takeaways

- **Filtering matters more than volume.**
  Nobody wants 10,000 raw events. They want the 5 that are actually breaking things, grouped and sorted.

- **Deploy version is the first question everyone asks.**
  When something breaks, the first thing people say is "what changed?" Tying errors to versions answers that instantly.

- **Export keeps WatchTower useful beyond its own UI.**
  Analysts and PMs will never log into the dashboard daily. If they can pull CSVs, the data still gets used.

---

## Open Questions

- **How granular should tracing be?**
  Full OpenTelemetry-style spans or just simple request-in/request-out timing? More detail means more storage and complexity.

- **Alert fatigue vs coverage**
  Too few alerts and you miss things. Too many and people mute them. Where is the default line?

- **Data retention**
  How long do we keep events? 7 days? 30 days? Do we let users configure it or just pick a default?
