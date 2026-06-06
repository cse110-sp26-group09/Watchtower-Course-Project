"use strict";

async function getClerkAlertRecipients() {
  return [];
}

function resetRecipientCache() {
  // Reserved for the future Clerk-backed recipient cache.
}

const https = require("https");
const CLERK_USERS_URL = "https://api.clerk.com/v1/users";
const DEFAULT_CACHE_MS = 300000;

let cachedRecipients = null;
let cacheExpiresAt = 0;
function positiveInteger(value, fallback) {
  let parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
 }
 
  function isVerifiedEmail(email) {
    if (!email) return false;
    if (email.verified === true) return true;
    let verification = email.verification || {};
    return verification.status === "verified";
 }
 
  function getEmailAddressValue(email) {
    return (email && (email.emailAddress || email.email_address)) || "";
  }
 
  function getPrimaryEmail(user) {
    if (!user) return "";
    let primary = user.primaryEmailAddress || null;
    let emails = user.emailAddresses || user.email_addresses || [];
    let primaryId = user.primaryEmailAddressId || user.primary_email_address_id || "";
    if (!primary && primaryId) {
      primary = emails.find(function (email) { return email && email.id === primaryId; }) || null;
    }
    if (!primary && emails.length === 1) primary = emails[0];
    if (!isVerifiedEmail(primary)) return "";
    return getEmailAddressValue(primary);
  }
 
  function selectAlertRecipients(users) {
    let seen = {};
    return (users || []).reduce(function (recipients, user) {
      let email = getPrimaryEmail(user);
      if (email && !seen[email]) {
        seen[email] = true;
        recipients.push(email);
      }
      return recipients;
    }, []);
  }

  function requestJson(url, secretKey) {
    return new Promise(function (resolve, reject) {
      let request = https.request(url, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + secretKey,
          "Content-Type": "application/json"
        }
      }, function (response) {
        let chunks = [];
        response.on("data", function (chunk) { chunks.push(chunk); });
        response.on("end", function () {
          let raw = Buffer.concat(chunks).toString();
          let body = {};
         try {
            body = raw ? JSON.parse(raw) : {};
         } catch (error) {
            reject(error);
            return;
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error("Clerk users request failed with status " + response.statusCode));
            return;
          }
          resolve(body);
        });
      });
      request.on("error", reject);
      request.end();
    });
  }
 
  async function fetchClerkUsers(secretKey) {
    let users = [];
    let offset = 0;
    let limit = 100;
    let totalCount = null;
    do {
      let url = CLERK_USERS_URL + "?limit=" + limit + "&offset=" + offset;
      let payload = await requestJson(url, secretKey);
      let page = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      totalCount = typeof payload.total_count === "number" ? payload.total_count : payload.totalCount;
      users = users.concat(page);
      offset += page.length;
      if (page.length === 0) break;
    } while (totalCount == null || offset < totalCount);
    return users;
  }

  async function getClerkAlertRecipients(now) {
    let currentTime = typeof now === "number" ? now : Date.now();
    if (cachedRecipients && currentTime < cacheExpiresAt) return cachedRecipients.slice();
    let secretKey = process.env.CLERK_SECRET_KEY;
    let cacheMs = positiveInteger(process.env.CLERK_ALERT_RECIPIENT_CACHE_MS, DEFAULT_CACHE_MS);
    if (!secretKey) return [];
    let users = await fetchClerkUsers(secretKey);
    cachedRecipients = selectAlertRecipients(users);
    cacheExpiresAt = currentTime + cacheMs;
    return cachedRecipients.slice();
  }

module.exports = {
  getClerkAlertRecipients,
  resetRecipientCache
};
