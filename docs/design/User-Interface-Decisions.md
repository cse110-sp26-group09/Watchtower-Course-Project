# DR 0001: Making mobile buttons on the bottom

## Status
Accepted by James

## Context
This makes it easier for a user to navigate with just their thumb. 

## Decision
The buttons on the mobile version of the website will be displayed on the bottom rather than the side or a dropdown. 

## Consequences
This will make it easier to navigate but may result in misinputs.

## Alternatives Considered
Dropdown

# DR 0002: Settings

## Status
Accepted by Hieu

## Context
Simplifying the settings

## Decision
We want users to be able to access the settings with as few button presses as possible. As a consequence, since we do not have many settings, we can simplify the settings and just make it all in one page in 3 dropdowns so the user will not get lost. 

## Consequences 
This may make the settings somewhat cluttered but it will result in less button taps for the user which creates less friction. 

## Alternatives Considered
Navigative through tabs 

# DR 0003: Consistent Navigation State

## Status
Accepted for Sprint 2 cleanup

## Context
The prototypes use lightweight single-page navigation. Some screens could change content without a durable route, which made browser Back/Forward behavior and active navigation states harder to predict.

## Decision
Prototype navigation should use simple hash-based routes, keep active navigation states in sync with the visible screen, and provide Back and Home controls on secondary screens.

## Consequences
Users can return to the home screen from key flows, share or reload routed prototype screens, and avoid dead-end states during demos.

## Alternatives Considered
Full client-side routing library

