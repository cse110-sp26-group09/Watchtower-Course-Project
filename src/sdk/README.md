# SDK (`src/sdk`)

**Status:** Active. The dependency-free browser SDK that monitored apps embed.

| File | Purpose |
|---|---|
| `watchtower.js` | Captures JavaScript errors, user interactions, and performance metrics and sends them to `POST /api/events` in small batches (using the Beacon API where available). Served by the backend at `/sdk/watchtower.js`. |

## Usage

A monitored page embeds the SDK with a script tag, for example:

```html
<script src="https://<watchtower-host>/sdk/watchtower.js" data-project="YOUR_PROJECT"></script>
```

## Notes

- The SDK is intentionally build-step-free so it runs in any modern browser.
- Event ingestion does **not** require a dashboard login; ingestion auth via
  per-app/project keys is documented as future work.

See [`../README.md`](../README.md) for the source layout and
[`docs/architecture/event-schema-v2.md`](../../docs/architecture/event-schema-v2.md)
for the event shape.
