# External Monitored Test App Separation Plan

**Status:** Planning only  
**Sprint:** 2  
**Related docs:** [API Contract v1](api-contract-v1.md), [Event Schema v1](event-schema-v1.md)

---

## Overview

WatchTower is meant to monitor external websites through its SDK, not only demo pages that live inside the same repository.

For now, the repository keeps local and hosted demo pages inside `src/prototype_1/` so the team can develop, test, and show the prototype quickly. Later, we should separate the monitored test app from the WatchTower repo to better reflect real usage.

---

## Current In-Repo Demo Usage

The current prototype includes:

- `demo/` for local testing with the WatchTower server
- `hosted_demo/` for a public static demo page
- `sdk/` for client-side instrumentation
- `server/` for event ingestion and dashboard data

This setup is useful right now because it:

- Keeps development simple
- Makes debugging faster
- Supports testing and CI
- Lets the team work on SDK, event flow, and dashboard behavior in one place

---

## Why Separate the Test App Later

A separate monitored test app would better demonstrate the real WatchTower product flow:

1. An external site loads the WatchTower SDK
2. The SDK captures errors, performance data, and feedback events
3. Events are sent to the WatchTower API
4. The dashboard displays the monitored activity

This would make the demo more realistic and show that WatchTower can observe another application, not just pages inside its own repository.

---

## Separation Options

### Option 1: Separate Test App Repository

Create a second repository for a small external demo website that imports or links the WatchTower SDK.

**Pros**
- Most realistic product demonstration
- Clear separation between WatchTower and the monitored site
- Easier to explain during final presentation

**Cons**
- Adds deployment and coordination work
- Requires stable SDK/API integration first

### Option 2: Separately Hosted Test Site

Keep the app simple, but host it independently from the WatchTower dashboard.

**Pros**
- Lower setup cost than a full second repo
- Still demonstrates external monitoring

**Cons**
- Less clean separation than a dedicated repo
- Could become confusing if files still live in the main project repo

---

## Prerequisites Before Separation

Before moving the test app out of the main repository, we should have:

- A stable SDK integration path
- A shared event schema in use
- A working API contract for event ingestion
- Basic documentation for connecting an external site
- A dashboard that can display events from the monitored app

These prerequisites reduce the chance of separating too early and creating extra rework.

---

## Risks

- External deployment may introduce CORS or configuration issues
- SDK/API changes may require repeated updates to the separate app
- Debugging becomes slower across two repositories
- Separation too early could distract from core MVP work

---

## Recommendation

Do **not** separate the monitored test app during the current sprint.

For now, continue using the in-repo demo setup for development, testing, and prototype iteration. Once the SDK, API flow, and dashboard behavior are stable, move to a separate monitored test app in a later sprint.

**Recommended execution timing:** Sprint 3 or later, depending on prototype stability.

---

## Conclusion

Keeping the demo app inside the repository is the right short-term choice for speed and simplicity. Separating it later will make the WatchTower demo more realistic and better aligned with the product goal of monitoring external websites.
