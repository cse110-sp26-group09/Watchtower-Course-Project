# Security Policy

## Project Status

WatchTower is a CSE 110 course project. The current `main` branch is the supported version; historical code in `archive/` is retained for reference and is not maintained.

## Reporting a Vulnerability

If you find a security issue, use GitHub's **Report a vulnerability** option on this repository's Security tab when private vulnerability reporting is enabled. If that option is unavailable, contact the maintainers privately through the team's course communication channel. Do not open a public issue containing exploit details.

Please avoid publicly disclosing security issues until the team has reviewed the report and decided on the appropriate fix.

## What to Include

When reporting a vulnerability, please include:

- A short description of the issue
- Steps to reproduce the issue, if possible
- The affected file, feature, or workflow
- Any screenshots, logs, or examples that help explain the problem

## Supported Versions

| Version | Supported |
|---|---|
| Current `main` branch | Yes |
| Archived prototypes and older releases | No |

## Security Practices

The team uses the following practices to support project quality and security:

- GitHub Issues and Pull Requests for tracked changes
- Code review before merging major changes
- HTML, CSS, and JavaScript validation through CI
- Unit and end-to-end testing through CI
- JSDoc documentation generation
- Dependabot alerts and dependency update PRs
- Dependency security audit through CI
- CodeQL/code scanning where enabled

## Notes

This project is a learning-focused prototype. Security reports will be reviewed during active development and addressed based on project scope, severity, and course timeline.
