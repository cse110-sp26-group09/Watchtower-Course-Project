# WatchTower Requirements

# Functional Requirements

**Current State**
### F1: Error Event Capture
The system shall accept application error events containing:
- Error message
- Stack trace
- Timestamp
- Severity level
- Service name

**Verification:** Submit a test error event and confirm it is stored.

---
**Aspirational(Out of Prototype Scope)**
### 2: Performance Metric Capture
The system shall accept performance metrics including:
- Request latency
- CPU utilization
- Memory usage
- Custom timing measurements

**Verification:** Submit performance metrics and confirm they are stored.

---
**Semi Current State-(free-text feedback form not impemented)**
### 3: User Feedback Capture
The system shall collect user sentiment through:
- 1–5 star rating widgets
- Free-text feedback forms

**Verification:** Submit ratings and comments and confirm they appear in the system.

---
**Current State**
### 4: Event Dashboard
The system shall display dashboards showing:
- Recent errors
- Performance trends
- Average user ratings
- Feedback counts

**Verification:** Generate sample data and confirm dashboards update correctly.

---
**Current State**
### 5: Real-Time Visibility
New events shall appear on dashboards within **5 seconds** of being received.

**Verification:** Measure time from event submission to dashboard display.

---
**Current State**
### 6: Build and Deployment Correlation
The system shall associate each event with:
- Build ID
- Commit SHA
- Branch name
- Deployment environment
- Deployment timestamp

**Verification:** Submit events with build metadata and verify grouping by build.

---
**Current State**
### 7: Alerting on Critical Conditions
The system shall generate alerts when:
- Error rates exceed configured thresholds
- Performance metrics exceed configured limits
- Average user ratings drop below configured thresholds

**Verification:** Trigger threshold violations and confirm alerts are generated.

---
**Current State**
### 8: Data Filtering and Export
Authorized users shall be able to filter by:
- Time range
- Service
- Environment
- Build ID

and export the filtered data as CSV or JSON.

**Verification:** Apply filters and confirm exported data matches results.

---

# Non-Functional Requirements
**Aspirational(Out of Prototype Scope)**
### 1: Availability
The production system shall maintain **99.9% monthly uptime**, excluding scheduled maintenance.

**Verification:** Review uptime monitoring reports.

---
**Current State**
### 2: Event Durability
At least **99.99% of valid events** shall be persisted successfully.

**Verification:** Compare submitted and stored event counts during testing.

---
**Current State**
### 3: API Responsiveness
The ingestion API shall return a response within **200 ms (95th percentile)** under normal load.

**Verification:** Perform performance testing.

---
**Aspirational(Out of Prototype Scope)**
### 4: Dashboard Responsiveness
Dashboards shall load within **2 seconds (95th percentile)** for datasets containing up to **10 million events**.

**Verification:** Benchmark dashboard queries.

---
**Aspirational(Out of Prototype Scope)**
### 5: Scalability
The system shall support processing at least **10,000 events per second** through horizontal scaling without code modifications.

**Verification:** Conduct load testing with multiple ingestion nodes.

---
**Aspirational(Out of Prototype Scope)**
### 6: Fault Tolerance
During component failures, no more than **0.01% of valid events** may be lost, and queued events shall be retried automatically.

**Verification:** Simulate infrastructure failures.

---
**Current State**
### 7: Maintainability
The codebase shall maintain:
- Minimum **80% automated test coverage**
- Continuous integration on every pull request
- Automated linting and static analysis

**Verification:** Review CI and coverage reports.

---
**Current State**
### 8: Security
All communications shall use HTTPS, and dashboard access and exports shall require authenticated users with role-based authorization.

**Verification:** Conduct security and access control testing.
