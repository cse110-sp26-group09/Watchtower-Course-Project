# `.github/`

GitHub-specific configuration for the WatchTower repository. These paths are
**required by GitHub** at exactly these locations — do not move them.

| Path | Purpose |
|---|---|
| [`workflows/`](workflows/) | GitHub Actions CI workflows (`ci.yml`). |
| [`ISSUE_TEMPLATE/`](ISSUE_TEMPLATE/) | Issue and pull-request templates. |
| `dependabot.yml` | Dependabot config for dependency and GitHub Actions updates. Must live directly under `.github/`. |

See [`workflows/README.md`](workflows/README.md) for the CI pipeline and the root
[`README.md`](../README.md) for project context.
