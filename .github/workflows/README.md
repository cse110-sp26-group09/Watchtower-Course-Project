# CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and continuous deployment of WatchTower.

## Purpose

GitHub Actions automate testing, building, and deployment tasks to:

- **Validate code** – Run tests on every PR and push
- **Catch errors early** – Prevent breaking changes
- **Ensure quality** – Maintain code standards
- **Speed up deployment** – Automate repetitive tasks
- **Document processes** – Make workflows explicit and repeatable

## Current Workflows

### `ci.yml` — CI

The primary CI workflow for WatchTower.

**Triggers:** push and pull requests targeting `main` (path-filtered to `src/**`,
`tests/**`, selected `docs/**`, and root config files), plus manual
`workflow_dispatch`. Runs on Node.js 24.

**Jobs:**

| Job | What it checks |
|---|---|
| Repository Structure Checks | Prints/validates expected repo layout. |
| HTML Validation | Validates frontend HTML. |
| CSS Validation | Validates stylesheets. |
| JavaScript Lint | Lints JS sources. |
| Unit Tests | `npm run test:unit` (Jest). |
| End-to-End Tests | `npm run test:e2e` (Playwright); uploads the `playwright-report` artifact. |
| JSDoc Check | `npm run docs:js` generates API docs without errors. |
| Dependency Security Audit | Audits dependencies for known vulnerabilities. |

> Update this table if you add, remove, or rename a job in `ci.yml`.

## Workflow Structure

GitHub Actions workflows use YAML configuration files in this directory. Each workflow defines:

- **Trigger events** – When to run (on push, PR, schedule, etc.)
- **Jobs** – What tasks to execute
- **Steps** – Individual commands or actions

Example structure:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test
```

## Adding New Workflows

When adding a new workflow:

1. Create a new `.yml` file in this directory
2. Follow GitHub Actions best practices
3. Use descriptive names and comments
4. Test the workflow on a branch before merging
5. Document the workflow's purpose in this README

## Best Practices

- **Keep workflows fast** – Slow CI discourages developers from iterating
- **Cache dependencies** – Speed up repeated runs
- **Use matrix builds** – Test across multiple environments
- **Fail fast** – Run quick checks first
- **Clear names** – Use descriptive job and step names
- **Document secrets** – List required GitHub secrets in team docs

## Secrets & Credentials

List any required secrets here (values stored in GitHub):

- *(None currently configured)*

## Related Documentation

- [Git Workflow](../../docs/process/git-workflow.md)
- [Development Process](../../docs/process/workflow.md)
- [Contributing Guide](../../docs/README.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
