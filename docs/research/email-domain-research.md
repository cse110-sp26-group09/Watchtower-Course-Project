# Research: Email Domain for WatchTower Alert Emails

**Issue:** #109  
**Author:** @waleedA13  
**Branch:** research/email-domain-issue-109

---

## Summary

Two approaches were evaluated for sending alert emails from WatchTower:

| Approach | Domain Needed | Cost | Setup Complexity | Recommended |
|---|---|---|---|---|
| Gmail API + Nodemailer | No, uses Gmail address | Free | Medium (OAuth2) | For prototype |
| Custom Domain + Resend | Yes (purchase required) | $10-15/yr for domain | Low once domain is set up | For production |

---

## Approach 1 - Gmail API

### How it works

You create a dedicated Gmail account (e.g. `watchtower.alerts@gmail.com`), authenticate it with OAuth2 once, and use Nodemailer to send emails through it. No domain purchase needed.

### Setup steps

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a new project
2. Enable the Gmail API under APIs and Services
3. Set up an OAuth consent screen, choose External, add the `https://mail.google.com/` scope
4. Create OAuth2 credentials and get your Client ID and Client Secret
5. Generate a refresh token using OAuth2 Playground
6. Store everything in a `.env` file

### Code example

```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_ADDRESS,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN
  }
});

async function sendAlert(errorMessage, route, version) {
  await transporter.sendMail({
    from: 'WatchTower Alerts <watchtower.alerts@gmail.com>',
    to: process.env.ALERT_RECIPIENT,
    subject: `WatchTower Alert: Error spike detected`,
    html: `<p>High error rate on <strong>${version}</strong>.<br>
           Route: ${route}<br>
           Error: ${errorMessage}</p>`
  });
}
```

### Sending limits

- Free Gmail: 500 emails per day
- Google Workspace (paid): 2,000 per day

### Pros
- No domain purchase needed
- Free
- Nodemailer handles token refresh automatically

### Cons
- OAuth2 setup is more involved than an API key
- Emails come from a Gmail address, not a branded one
- Refresh token can expire and needs to be regenerated. Google revokes it if the app goes unused for 6 months, if the account password changes, or every 7 days while the app is in testing mode on Google Cloud. When it gets revoked the app silently stops sending emails with no obvious error. For a class project this is fine since you are only running it for a few weeks and demoing it once or twice. For a long-running production server it would be a real problem.

---

## Approach 2 - Custom Domain + Resend

### How it works

You buy a domain (e.g. `watchtower-alerts.dev`), add DNS records to verify it with Resend, then send emails from `alerts@watchtower-alerts.dev` using the Resend SDK.

### Domain options

| Registrar | Example Cost |
|---|---|
| Namecheap | ~$10/yr for .dev or .app |
| Google Domains | ~$12/yr |
| Cloudflare | ~$10/yr (at cost, no markup) |

A `.dev` or `.app` domain works well and looks professional for a dev tool.

### DNS records required

Once you add the domain to Resend, it generates these records for you to paste into your DNS settings:

| Record | Purpose |
|---|---|
| TXT (SPF) | Tells email providers Resend is allowed to send on your behalf |
| CNAME (DKIM) | Signs your emails so they are not flagged as spam |
| TXT (DMARC) | Policy for what to do with emails that fail SPF/DKIM |

Propagation takes up to 24 hours after you add the records.

### Code example

```js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendAlert(errorMessage, route, version) {
  await resend.emails.send({
    from: 'WatchTower Alerts <alerts@watchtower-alerts.dev>',
    to: process.env.ALERT_RECIPIENT,
    subject: `WatchTower Alert: Error spike detected`,
    html: `<p>High error rate on <strong>${version}</strong>.<br>
           Route: ${route}<br>
           Error: ${errorMessage}</p>`
  });
}
```

### Pros
- Branded sending address
- Simple API key setup
- 3,000 free emails/month with Resend

### Cons
- Costs money for the domain (~$10/yr)
- DNS propagation takes up to 24 hours
- 100 emails/day cap on Resend free tier

---

## Recommendation

**For the prototype: use Gmail API.** No cost, no domain purchase, and it works immediately. The OAuth2 setup takes about 30 minutes following the steps above. The refresh token expiration is not a concern for a class project since the app only needs to run for a few weeks and be demoed once or twice.

**For production or if a branded address matters: use a custom domain + Resend.** Buy a `.dev` domain from Cloudflare (~$10/yr), add the 3 DNS records Resend provides, and it is ready within 24 hours. The API key does not expire and does not need to be regenerated.

Both approaches plug into the same place in the server - the `POST /api/events` handler in `server-1.1.js` - and the only difference is which send function gets called.

---

## References

- [Gmail API - Sending Guide](https://developers.google.com/workspace/gmail/api/guides/sending)
- [Gmail API REST Reference](https://developers.google.com/workspace/gmail/api/reference/rest)
- [Node.js Gmail API Quickstart](https://developers.google.com/gmail/api/quickstart/nodejs)
- [Nodemailer OAuth2 Docs](https://nodemailer.com/smtp/oauth2)
- [Resend Domain Setup](https://resend.com/docs/dashboard/domains/introduction)
- [Resend SPF/DKIM/DMARC Setup Guide](https://dmarc.wiki/resend)
