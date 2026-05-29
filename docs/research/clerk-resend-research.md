# Research: Clerk and Resend

**Issue:** #78  
**Author:** @waleedA13  
**Sprint:** 2

---

## Summary

| Integration | Recommendation | Reason |
|---|---|---|
| Clerk (auth) | Not recommended | SDK does not support plain Node.js http module, requires Express or Next.js |
| Resend (email alerts) | Recommended | Works with plain Node.js, easy setup, free tier is enough for the prototype |

---

## Clerk

### What it is

Clerk handles login and user management. It gives you prebuilt login UI, session management, and JWT-based auth out of the box.

### Does it work with WatchTower?

WatchTower's server uses Node.js's built-in `http` module with no framework. Here is the state of Clerk's SDK support:

| SDK | Status |
|---|---|
| `@clerk/clerk-sdk-node` | Deprecated since January 10, 2025 |
| `@clerk/express` | Active, requires Express |
| `@clerk/nextjs` | Active, requires Next.js |
| Clerk Backend API (raw HTTP) | Possible but you have to manually verify JWTs, handle sessions, and build middleware yourself |

There is no supported Clerk SDK for a plain Node.js `http` server. To use Clerk you would either have to refactor the server to use Express, which goes against how the project is built, or call the Clerk Backend API manually over HTTP. At that point you are writing all the hard stuff yourself anyway and Clerk stops being useful.

### Pricing

- Free: up to 10,000 monthly active users
- Pro: $25/month (10,000 MAUs included, $0.02 per additional MAU)
- SAML/OIDC connections: $75/month per connection

### Verdict

Not recommended. The server architecture does not match what Clerk supports. If auth is needed before the server gets a framework, a lighter option like `jsonwebtoken` + `bcrypt` with a session cookie would work without any refactor.

---

## Resend

### What it is

Resend is a transactional email API. It has an official Node.js SDK and works without any framework.

### Does it work with WatchTower?

Yes. The integration is straightforward. You install the SDK, drop a function into the event ingestion handler, and call it when a threshold is crossed:

```js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendHighRiskAlert(errorEvent) {
  await resend.emails.send({
    from: 'alerts@yourdomain.com',
    to: 'team@yourdomain.com',
    subject: `WatchTower Alert: ${errorEvent.data.message}`,
    html: `<p>High error rate detected on <strong>${errorEvent.deployVersion}</strong>.<br>
           Route: ${errorEvent.route}<br>
           Error: ${errorEvent.data.message}</p>`
  });
}
```

This plugs directly into `POST /api/events` and fires when a condition is met, for example more than N errors in the last 5 minutes for a given deploy version.

### Alert triggers that make sense for WatchTower

These can all be computed from the existing stats logic:

- Error count for a deploy version goes over a threshold
- Error rate on a specific route gets too high
- A new unique error message shows up for the first time

### Pricing

- Free: 3,000 emails/month, 100/day cap
- Pro: $20/month for 50,000 emails
- Scale: $90/month for 100,000 emails

The free tier is enough for the prototype. The 100/day cap is the main thing to watch. Alert throttling (for example, deduplicate alerts per error type per hour) would keep it within limits under heavy error load.

### Requirements

- A verified sending domain is required in production. For development, Resend provides `onboarding@resend.dev` which works without domain verification.
- API key goes in an environment variable (`RESEND_API_KEY`), not hardcoded.

### Verdict

Recommended. No structural changes needed. Free tier covers the prototype. The main work is writing the threshold logic and wiring it into the event pipeline.

---

## Decision

Use Resend for email alerts. Hold off on Clerk until the server is on a supported framework. If auth is needed before that, use `jsonwebtoken` + `bcrypt` as a self-contained option.

---

## References

- [Clerk Pricing](https://clerk.com/pricing)
- [Clerk Express SDK Docs](https://clerk.com/docs/reference/express/overview)
- [Resend Node.js Docs](https://resend.com/docs/send-with-nodejs)
- [Resend Pricing](https://resend.com/pricing)
- [Resend Node.js SDK - GitHub](https://github.com/resend/resend-node)
