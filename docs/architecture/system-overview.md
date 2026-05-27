# System Overview
This file gives an overview of any underlying software/technology used to create WatchTower

## Coding Languages
WatchTower is built using:
- **JavaScript**
- **HTML**
- **CSS**

## Dependancies 
This system relies on minimal dependancies, all dependancies are used for process documentation/testing
- **Jest** for unit testing
- **Playwright** for end-to-end testing
- **JSDoc** for code documentation

## CI/CD Pipeline/ Security
WatchTower uses a variety of technologies in order to build out a full CI/CD pipeline in order to keep good coding practices 
- **Github actions** for automated testing/ keeping up good coding practice 
- **HTML/CSS/JS validation** for basic test that all code is syntatically correct
- **Dependabot** used for keeping up with any dependancy updates/ conflicts with dependancy source of truth
- **npm security audit in CI** used to make sure any dependancies can't create any security issues
- **CodeQL** used to scan codebase to find any security vulnerabilities