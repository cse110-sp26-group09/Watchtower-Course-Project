# Research: Interactive Email Alerts

**Author:** @dwu0501  
**Sprint:** 2

---

## Summary

| Option | Recommendation | Reason |
|---|---|---|
| Postmark | Recommended | Best fit for interactive alert emails because inbound webhooks send parsed email JSON directly to your app, including reply-oriented fields |
| Resend | Alternative only | Good for simple outbound email, but less ideal when replies matter because inbound webhooks do not include the full email body, headers, or attachments |
| Twilio SendGrid | Not recommended for this prototype | Capable, but heavier platform than needed |
| Mailgun | Not recommended for this prototype | Powerful inbound routing, but more complexity than needed |
| Twilio SMS | Escalation only | Useful for urgent alerts, but adds opt-in, compliance, and phone-number management |

---

## Decision

Use **Postmark** for interactive email alerts.

Replies matter for this feature, so the provider should make inbound email processing simple. Postmark is the best fit because it accepts inbound email, parses it, and sends the parsed message as JSON to a webhook.

Resend is still a good option for outbound-only alerts, but it is not the best fit for reply-driven workflows.

---

## Goal

WatchTower needs an alert notification system where:

- The system sends a developer an alert
- The developer can reply directly to the email
- WatchTower can receive and process that reply later
- The implementation stays simple
- The project avoids unnecessary dependencies
- SMS is not added unless escalation is needed later

This makes the problem an **interactive email** problem, not just an outbound email problem.

---

## Postmark

### What it is

Postmark is a transactional email provider focused on application email.

It supports both:

- Outbound transactional email
- Inbound email parsing through webhooks

### Why Postmark fits WatchTower

Postmark is the best fit because inbound replies are part of the requirement.

Postmark's inbound webhook accepts incoming email, parses it, and sends the parsed email as JSON to a webhook URL.

That means WatchTower can receive replies like this:

```txt
Developer receives alert email
Developer replies "ack" or adds a note
Postmark receives the reply
Postmark sends parsed JSON to WatchTower webhook
WatchTower stores the reply on the alert