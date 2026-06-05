# Sprint Retrospective 2

### What Went Well ✨
* **Once again 100% Backlog Sweep:** Driven by team focus, every single planned task from decision logs were completed.
* **Prototyping:** We saw success with splitting our team into 2 prototypes with AI-Warmup 2 and we have success with it again. We were able to pick and choose pieces between both prototype to create a stronger prototype 3.
* **Strong CI/CD Pipeline:** Successfully established a strong CI/CD pipeline to keep our code base clean and make sure no sweeping updates are made to our codebase that could affect everyone. Checking everything from JS linting to E2E tests
* **Established Roles:** The whole team now has roles that are assigned to them, so everyone has a "domain of expertise." So now work can be split parrallely via subteams(front-end and back-end) to speed up workflow. There is possibility of switching roles every sprint.
### What Didn't Go Well 🚧
* **Repo structure is confusing and mess:** During project startup, we were keeping ADRs and stand-up meeting notes in 1 document, while this worked for a while, it is becoming increasing obvious that keeping this structure to our repo is creating some technical/knowledge debt.



### Action Items 🎯
| Specific Improvement | Owner  | Success Metric / Connection |
| :--- | :--- | :--- |
| **Documentation Restructuring:** Restructure Document to be more intutive to navigate | Josh | Repo is restructured before Sprint 3|

### Lessons Learned 💡
* **Parallel Prototyping Drives Stronger Architecture:** Spliting into 2 teams allowed us to create 2 distinct products where now we have options to choose from when we are building our final product and take the best of both worlds
* **Clear Roles Accelerate Workflow:** Splitting workforce into front-end and back-end has allowed for our work speed to increase by parrallelizing our process twice the work is done within the same amount of time allowing for more to be done within limited time
* **Ambigous Documentation is the same as no documentation:** An unclear documentation structure can be frustrating for users when they are trying to understand a product/repo, keeping the repo structure clean can help other/future developers understand the product easier to contribute or use better without rage-quitting. 

---

# Decision Logs

## Sprint 2
- [x]  Split into two teams for prototype and have a shared evaluation criteria so both prototypes stay aligned to one WatchTower product [#20]
- [x] Define one shared event schema and API contract for both prototype teams.[#21]
- [x] Create a working Prototype 1 front-end from event ingestion to dashboard rendering with test coverage on what works.[#22]
- [x] Create a working Prototype 2 front-end from SDK integration to dashboard rendering with test coverage on what works.[#23]
- [x] Apply professor guidance to both prototypes:
    - Minimal mobile usability
    - Clear access to full desktop experience
    - Priority-based sizing/color emphasis using progressive disclosure 
- [x] Make document structure more intutive and make it easier to find stuff and create JSDoc standards for code base[#26]
- [x] Create a plan for separating the monitored test app from the WatchTower repo, without migrating.[#27]
- [x] Create a sprint-end comparison readout for both prototypes using the agreed rubric then use that to guide what prototype to use (1,2, or hybrid)[#28]