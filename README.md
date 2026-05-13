# WatchTower

A lightweight observability platform that captures and visualizes real user events, JavaScript errors, performance metrics, and user interactions through an intuitive real-time dashboard.

## About WatchTower

WatchTower helps development teams understand what's happening in production. By capturing user events, tracking errors, and monitoring performance, teams gain visibility into application health and user experience in real time.

### Key Features

- **JavaScript Error Tracking** – Automatically capture and categorize unhandled errors
- **Performance Monitoring** – Track page load times and latency per route
- **User Interaction Capture** – Record user actions and session events
- **Real-Time Dashboard** – View error feeds, latency charts, and active user counts
- **Version Tracking** – Tie errors to specific deployments for faster debugging
- **Event Storage & Filtering** – Query and analyze historical events

## Quick Start

- Static hosted demo: see the [hosted demo guide](src/prototype_1/hosted_demo/README.md)

### For Developers
1. Clone the repository
2. Navigate to the prototype: `cd src/prototype_1`
3. Follow the [setup instructions](src/prototype_1/README.md)

### For Documentation & Project Info
- **Project Overview** – See [docs/](docs/README.md)
- **Requirements** – See [docs/product/requirements.md](docs/product/requirements.md)
- **Sprint Planning** – See [docs/planning/sprint-1-planning.md](docs/planning/sprint-1-planning.md)

## Project Structure

```
├── docs/              # All project documentation
├── src/               # Source code and prototypes
├── tests/             # Test files and testing documentation
├── CHANGELOG.md       # Project version history
└── README.md          # This file
```

For a detailed breakdown of the documentation structure, see [docs/README.md](docs/README.md).

## Working Guidelines

We follow these standards to keep our work organized and clear:

- **Conventional Commits** – Use clear, structured commit messages
- **Feature Branches** – Create branches for all work
- **Documentation First** – Update docs as you change code
- **Code Review** – All changes require review before merging
- **ADRs for Decisions** – Major decisions documented in [docs/adr/](docs/adr/)

## Team Roles

| Role | Responsibility |
|------|-----------------|
| **Technical Lead** (Aditya) | Architecture and engineering decisions |
| **Product Lead** (Fahad) | Vision, requirements, and user focus |
| **Frontend Lead** (James) | UI implementation and user experience |
| **UI/UX Lead** (Hieu) | Design and interaction patterns |

See [docs/planning/sprint-1-planning.md](docs/planning/sprint-1-planning.md) for the full team structure and task assignments.

## Resources

- **Task Tracking**: [Google Sheets](https://docs.google.com/spreadsheets/d/1YbTkdP8IoodHzIj99lgunic5pRqk6BzqM248CaaaCRw/)
- **Documentation**: [docs/](docs/README.md)
- **Decisions & Logs**: [docs/meetings/](docs/meetings/)
- **Research**: [docs/research/](docs/research/)

## Contributing

Before you start work:

1. Review the [workflow guidelines](docs/process/workflow.md)
2. Check the [git workflow](docs/process/git-workflow.md)
3. Understand your role and sprint goals in [planning docs](docs/planning/)

See [docs/README.md](docs/README.md) for complete documentation guidance.
