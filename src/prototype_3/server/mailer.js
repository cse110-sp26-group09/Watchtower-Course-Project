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
oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendAlert(errorMessage, route, version) {
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

    await transporter.sendMail({
      from: `WatchTower Alerts <${GMAIL_ADDRESS}>`,
      to: process.env.ALERT_RECIPIENT,
      subject: "WatchTower Alert: Error spike detected",
      html: `<p>High error rate on <strong>${escapeHtml(version)}</strong>.<br>
             Route: ${escapeHtml(route)}<br>
             Error: ${escapeHtml(errorMessage)}</p>`,
    });

    console.log("[mailer] Alert email sent successfully");
  } catch (error) {
    console.error("[mailer] Error sending alert email:", error);
  }
}

module.exports = { sendAlert };