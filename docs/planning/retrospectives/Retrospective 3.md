# Sprint Retrospective 3


### What Went Well ✨
* **Front-end MVP is mostly-completed!!:** Our product's "makeup" is almost complete, just need to finish up mixing both prototype 1 & 2 together into 1 final design while incorporating professor's feedback to create our front-end MVP. Features on top of the MVP can soon be added to create a more fully-fleshed out product
* **Test-Demo website migration:** Test-demo website has been fully migrated from within our repo to a seperate repo so it can accurately reflect our product's purpose

### What Didn't Go Well 🚧
* **UI/UX:** Met with professor and asked for feedback, both prototypes were unintuitive and confusing to look at for average user so UI/UX needs to be more **People focused** 
* **Unfocused Development:** Feedback from professor revealed that ultimately backend doesn't matter the most in the first few chunk of development, "ultimately just plumbing", UI/UX should be focused on more since that is what the consumer will be seeing/using, they dont care about what teckstack or new technology we use 
* **Irregular Documentation Updates:** Generative AI usage hasn't been properly updated by team, so now Sprint 1/2's usage is ambiguous. Also retrospectives and ADR have not been updated properly, strive for more real-time ADR updates and weekly retrospectives 

### Action Items 🎯
| Specific Improvement | Owner  | Success Metric / Connection |
| :--- | :--- | :--- |
| **People-friendly UI/UX:** Join both prototypes front-end together to create a better UI/UX based off of Professor's feedback | Joint Front-end team | Visually Aesthetically pleasing and intuitive UI/UX; usable by people who have never seen it before, before video demo|
| **Documentation updates:** Regularly update repo with retrospectives and ADRs when needed, whole team updates genai-usage as necessary | Josh/Team | weekly updates to documentation via commits |
| **Backend MVP:** Now that front-end team is almost done with the MVP, backend team can now start on working on their side of the product  | Backend Team | MVP implmentation of product completed by end of Sprint 4 |

### Lessons Learned 💡
* **UI/UX is the Product (Not the Infrastructure):** While a strong back-end is important to a product, it is an expectation from every consumer that your product works therefore the front-end is actually one of the biggest pieces to product design and must keep the consumer in mind all the time
* **ALWAYS KEEP CONSUMER IN MIND:** Good code and development could all be for naught if the consumer is not kept in mind, to prevent this time-loss, approach software with a consumer-first approach
* **Real-Time Documentation Saves Technical Debt:** Leaving ADRs, Generative AI usage logs, and retrospectives to the end of a cycle creates ambiguity in our process. To maintain project velocity and transparency, documentation must be treated as a live, weekly habit tied directly to our code commits rather than an afterthough.
* **"Works in local host" != Working product:** Keeping our test-demo within our repo made it look like our front-end/ basic back-end was working, however, this made us forget that the product needs to be applied to other websites by a script so by migrating the test-demo we can account for this and actually make our product usable for people instead of a one-and-done class project

---

# Decision Logs

## Sprint 3
- [x] Current Standup meetings documentation is messy and not updated, change structure to be more readable and easier to update in the future[#45]
- [x] Update ADR to reflect new backend technologies.[#53]
- [x] Add filters for querying database.[#54]
- [x] Write SDK logic to send correct JSON messages to the correct endpoints as defined in `Course-Project\src\prototype_1\server\server-1.1.js.`[#55]
- [x] Look at `Course-Project\docs\design\event-schema-v1.md` and `Course-Project\src\prototype_1\server\server-1.1.js` to make sure that all fields of event schema can be captured and filled out. If required, research any new APIs that will enable this. If any fields cannot be captured, then state so and briefly explain why.[#56]
- [ ] Merge Frontend Candidates [#57]