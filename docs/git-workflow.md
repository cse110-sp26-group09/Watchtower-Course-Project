# Git Workflow

## Branch Naming

Use this format:

feature/short-description
docs/short-description
fix/short-description
chore/short-description

Examples:
- feature/error-logger
- feature/dashboard-layout
- docs/mvp-definition
- chore/github-actions-setup

## Commit Message Format

Use Conventional Commits:

- feat: add error logger prototype
- fix: resolve dashboard layout issue
- docs: add sprint 1 planning notes
- chore: create issue template
- test: add logger unit tests

## Pull Request Rule

Every major change should go through a pull request.

Each PR should include:
- What changed
- Why it changed
- Screenshot if UI-related
- Testing notes
- Linked issue