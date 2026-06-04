"use strict";

const { parseTimestamp } = require("./server-helpers");

function getRecentErrorEvents(events, now, windowMs) {
  let cutoff = now - windowMs;
  return (events || []).filter(function (eventRecord) {
    let timestamp = parseTimestamp(eventRecord.receivedAt || eventRecord.timestamp);
    return eventRecord.type === "error" && timestamp !== null && timestamp >= cutoff;
  });
}

function getLatestEvent(events) {
  return (events || []).reduce(function (latest, eventRecord) {
    if (!latest) return eventRecord;
    let currentTime = parseTimestamp(eventRecord.receivedAt || eventRecord.timestamp) || 0;
    let latestTime = parseTimestamp(latest.receivedAt || latest.timestamp) || 0;
    return currentTime >= latestTime ? eventRecord : latest;
  }, null);
}

function buildErrorThresholdAlert(recentErrors, windowMs, threshold, now) {
  let latest = getLatestEvent(recentErrors) || {};
  return {
    count: recentErrors.length,
    threshold: threshold,
    windowMs: windowMs,
    route: latest.route || "unknown",
    deployVersion: latest.deployVersion || "unknown",
    message: latest.data && latest.data.message ? latest.data.message : "Unknown error",
    timestamp: latest.receivedAt || latest.timestamp || new Date(now).toISOString()
  };
}

function evaluateErrorThreshold(events, options) {
  let now = options.now;
  let threshold = options.threshold;
  let windowMs = options.windowMs;
  let cooldownMs = options.cooldownMs;
  let lastSentAt = options.lastSentAt || 0;

  if (now - lastSentAt < cooldownMs) {
    return { shouldSend: false, reason: "cooldown", recentErrors: [] };
  }

  let recentErrors = getRecentErrorEvents(events, now, windowMs);
  if (recentErrors.length < threshold) {
    return { shouldSend: false, reason: "below-threshold", recentErrors: recentErrors };
  }

  return {
    shouldSend: true,
    reason: "threshold",
    recentErrors: recentErrors,
    alert: buildErrorThresholdAlert(recentErrors, windowMs, threshold, now)
  };
}

module.exports = {
  getRecentErrorEvents,
  getLatestEvent,
  buildErrorThresholdAlert,
  evaluateErrorThreshold
};
