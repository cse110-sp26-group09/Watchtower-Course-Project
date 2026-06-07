# Monitored Demo (`src/frontend/demo`)

**Status:** Active (development/demo aid). A small "ShopDemo" app served at
`/demo/` that embeds the WatchTower SDK and emits real telemetry to `/api/events`.

| File | Purpose |
|---|---|
| `index.html` | ShopDemo SPA shell; loads the SDK from `/sdk/watchtower.js`. |
| `app.js` | Simulated shopping interactions (clicks, navigation, errors, latency). |
| `style.css` | Demo styling. |

## Notes

- This is a same-origin stand-in for an external monitored app. The separate
  GitHub Pages test app is the real cross-origin example.
- When opened after signing in to the dashboard, the SDK tags events with the
  signed-in Clerk user id so they appear on that user's dashboard.

See [`../README.md`](../README.md) for the frontend overview and
[`../../sdk/README.md`](../../sdk/README.md) for the SDK.
