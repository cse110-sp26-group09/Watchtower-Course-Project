"use strict";

require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const {
  GMAIL_ADDRESS,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
} = process.env;

const oAuth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({
  refresh_token: GMAIL_REFRESH_TOKEN,
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeRecipients(recipients) {
  if (Array.isArray(recipients)) return recipients.map(String).map(r => r.trim()).filter(Boolean);
  return recipients ? [String(recipients).trim()].filter(Boolean) : [];
}

function buildAlertEmail(alert) {
  const count = alert && alert.count ? alert.count : 0;
  const threshold = alert && alert.threshold ? alert.threshold : 0;
  const windowMinutes = alert && alert.windowMs ? Math.round(alert.windowMs / 60000) : 0;
  const route = alert && alert.route ? alert.route : "unknown";
  const version = alert && alert.deployVersion ? alert.deployVersion : "unknown";
  const message = alert && alert.message ? alert.message : "Unknown error";
  const timestamp = alert && alert.timestamp ? alert.timestamp : new Date().toISOString();

  return {
    subject: "WatchTower Alert: Error threshold reached",
    html:
      "<h2>WatchTower error threshold reached</h2>" +
      "<p>WatchTower detected an error volume above the configured alert threshold.</p>" +
      "<table cellpadding=\"6\" cellspacing=\"0\" border=\"0\">" +
      "<tr><td><strong>Error count</strong></td><td>" + escapeHtml(count) + "</td></tr>" +
      "<tr><td><strong>Threshold</strong></td><td>" + escapeHtml(threshold) + "</td></tr>" +
      "<tr><td><strong>Window</strong></td><td>" + escapeHtml(windowMinutes) + " minutes</td></tr>" +
      "<tr><td><strong>Route</strong></td><td>" + escapeHtml(route) + "</td></tr>" +
      "<tr><td><strong>Deploy version</strong></td><td>" + escapeHtml(version) + "</td></tr>" +
      "<tr><td><strong>Latest error</strong></td><td>" + escapeHtml(message) + "</td></tr>" +
      "<tr><td><strong>Timestamp</strong></td><td>" + escapeHtml(timestamp) + "</td></tr>" +
      "</table>" +
      "<p>Please review the WatchTower dashboard for the full event stream and affected sessions.</p>"
  };
}

async function sendAlert(alert, recipients) {
  const to = normalizeRecipients(recipients);

  if (!to.length) {
    console.warn("[mailer] No alert recipient configured");
    return;
  }

  if (!GMAIL_ADDRESS || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    console.warn("[mailer] Gmail OAuth environment variables are incomplete");
    return;
  }

  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: GMAIL_ADDRESS,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const email = buildAlertEmail(alert);

    await transporter.sendMail({
      from: `WatchTower Alerts <${GMAIL_ADDRESS}>`,
      to: to.join(","),
      subject: email.subject,
      html: email.html,
    });

    console.log("[mailer] Alert email sent successfully to " + to.join(", "));
  } catch (error) {
    console.error("[mailer] Error sending alert email:", error);
  }
}

module.exports = { buildAlertEmail, normalizeRecipients, sendAlert };
