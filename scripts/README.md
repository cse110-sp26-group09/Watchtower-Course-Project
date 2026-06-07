# Scripts (`scripts/`)

**Status:** Active. Build/startup helper scripts used by `package.json`.

| File | Purpose |
|---|---|
| `generate-clerk-config.js` | Reads `CLERK_PUBLISHABLE_KEY` from the environment (or a local `.env`) and writes `src/frontend/auth/clerk-config.js`, which exposes the publishable key to the browser. |

## Notes

- Run via `npm run config:clerk`; `npm start` runs it automatically before
  booting the server.
- The generated `src/frontend/auth/clerk-config.js` is **gitignored** and must
  never be committed with a real key. Only the publishable key is written —
  never a secret key.

See the root [`README.md`](../README.md) and
[`.env.example`](../.env.example).
