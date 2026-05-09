# WatchTower MVP

## Overview

WatchTower is a simple observability tool that helps developers understand what is happening in their web application by tracking errors, performance issues, and user feedback in one dashboard.

The goal of the MVP is to demonstrate the core idea, not build a full production system.

---

## Must Have (MVP)

These features are required for the Sprint 1 demo:

1. Add a small JavaScript tracking script to a demo website  
2. Capture frontend JavaScript errors  
3. Capture basic performance metrics (e.g. load time)  
4. Capture simple user feedback or rating signals  
5. Store captured events in a simple structured format (mock/local)  
6. Display events in a dashboard  
7. Filter or separate events by type (error, performance, feedback)  
8. Connect events to a mock deployment/build version  
9. Deploy a simple website that explains and demonstrates the project  

---

## Nice to Have (If Time Allows)

These are useful but not required:

- View interaction count for UI elements  
- Basic visualization of event flow  
- Simple notifications that can be disabled  

---

## Not in Sprint 1

These are explicitly out of scope:

- Feature flagging  
- A/B testing  
- Advanced analytics  
- Real backend/database  
- Authentication system  

---

## Feature Success Criteria

Each MVP feature must work in a simple, testable way:

- Error tracking → errors appear in dashboard  
- Performance tracking → load time is recorded and shown  
- Feedback → submitted feedback appears in dashboard  
- Dashboard → user can view and distinguish event types  
- Deployment linking → events show a version label  

---

## MVP Definition

The MVP is successful if a user can:

Open the demo site, trigger an error, performance event, or feedback, and then see that event displayed correctly in the WatchTower dashboard.

---

## Sprint 1 Prototype Direction

For Sprint 1, we will build a simple prototype, not a full system.

We will:

- Use a demo website with intentional errors  
- Log events using simple JavaScript (console or mock functions)  
- Store data locally (JSON or in-memory)  
- Build a basic static dashboard UI  
- Simulate event flow instead of full automation  

The goal is to show how data flows from the website to the dashboard.

---

## Sprint 1 Focus

- Define MVP clearly  
- Complete research and documentation  
- Create initial prototype direction  
- Align the team before full development  
