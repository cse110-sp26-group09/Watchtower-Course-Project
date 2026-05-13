# Source Code

This directory contains all implementation code for WatchTower, including prototypes and production-ready components.

## Structure

### `prototype_1/` – Current Development Prototype

The primary prototype demonstrating core WatchTower functionality using vanilla web technologies.

**What's inside:**
- `dashboard/` – Real-time monitoring dashboard
- `demo/` – Interactive demo page with example events
- `sdk/` – JavaScript SDK (`watchtower.js`) for error and event capture
- `server/` – Backend API for receiving and storing events
- `package.json` – Dependencies and scripts

**Technologies:** HTML, CSS, JavaScript, Node.js

**Get started:** See [prototype_1/README.md](prototype_1/README.md)

## Development Guidelines

### Code Organization
- Keep code modular and single-responsibility
- Use clear, descriptive variable and function names
- Comment complex logic and non-obvious design decisions

### Testing
- Write tests for new features (see [../../tests/](../../tests/))
- Run all tests before committing
- Aim for meaningful coverage, not just high percentages

### Documentation
- Update code comments when logic changes
- Document APIs and their parameters
- Add examples for complex features

### Building & Deployment
- Follow the build process outlined in each prototype's README
- Test locally before pushing
- Follow conventional commit messages

## Next Steps

As the project grows, this directory may include:

- `sdk/` – Extracted into a standalone package
- `dashboard/` – Extracted into a separate application
- `server/` – Backend API as a separate service
- `components/` – Reusable, shared components

## Related Documentation

- [Project Overview](../README.md)
- [Architecture Decisions](../docs/adr/)
- [Development Workflow](../docs/process/workflow.md)
