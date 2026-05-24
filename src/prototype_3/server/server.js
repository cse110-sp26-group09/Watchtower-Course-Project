/**
 * WatchTower Prototype 3 server.
 *
 * Serves the candidate dashboard, monitored demo app, and browser SDK.
 * It also accepts event ingestion, computes basic stats, and streams
 * new events to connected dashboards with Server-Sent Events.
 *
 * @module prototype_3/server
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MAX_EVENTS = 10000;
const ACTIVE_USER_WINDOW = 5 * 60 * 1000;

const storedEvents = [];
const sseClients = new Set();

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidEvent(eventRecord) {
  return Boolean(
    eventRecord &&
      typeof eventRecord === "object" &&
      typeof eventRecord.type === "string" &&
      eventRecord.type.trim() !== ""
  );
}

function calculateAverage(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  var validValues = values.filter(isFiniteNumber);
  if (validValues.length === 0) {
    return 0;
  }

  var total = validValues.reduce(function (sum, value) {
    return sum + value;
  }, 0);

  return total / validValues.length;
}

function calculatePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  var validValues = values.filter(isFiniteNumber).sort(function (left, right) {
    return left - right;
  });

  if (validValues.length === 0) {
    return 0;
  }

  var boundedPercentile = Math.min(Math.max(percentile, 0), 100);
  var position = (boundedPercentile / 100) * (validValues.length - 1);
  var lowerIndex = Math.floor(position);
  var upperIndex = Math.ceil(position);
  var lowerValue = validValues[lowerIndex];
  var upperValue = validValues[upperIndex];

  if (lowerIndex === upperIndex) {
    return lowerValue;
  }

  return lowerValue + (upperValue - lowerValue) * (position - lowerIndex);
}

function applyCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, statusCode, payload) {
  applyCors(response);
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise(function (resolve, reject) {
    var chunks = [];

    request.on("data", function (chunk) {
      chunks.push(chunk);
    });

    request.on("end", function () {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function broadcastEvents(eventBatch) {
  var eventPayload = JSON.stringify(eventBatch);
  sseClients.forEach(function (response) {
    response.write("data: " + eventPayload + "\n\n");
  });
}

function normalizeIncomingEvent(rawEvent) {
  return {
    type: rawEvent.type || "custom",
    timestamp: rawEvent.timestamp || new Date().toISOString(),
    sessionId: rawEvent.sessionId || "unknown-session",
    userId: rawEvent.userId || null,
    deployVersion: rawEvent.deployVersion || "unknown",
    appName: rawEvent.appName || "shopdemo",
    url: rawEvent.url || "",
    route: rawEvent.route || "/",
    data: rawEvent.data && typeof rawEvent.data === "object" ? rawEvent.data : {},
    receivedAt: new Date().toISOString(),
  };
}

function resolveStaticPath(pathname) {
  if (pathname === "/" || pathname === "") return "/index.html";
  if (pathname === "/demo" || pathname === "/demo/") return "/demo/index.html";
  if (pathname === "/sdk/watchtower.js") return "/sdk/watchtower.js";
  return pathname;
}

function serveStaticFile(response, pathname) {
  var candidateRoot = path.join(__dirname, "..");
  var requestedPath = resolveStaticPath(pathname);
  var filePath = path.join(candidateRoot, requestedPath);
  var resolvedFilePath = path.resolve(filePath);

  if (!resolvedFilePath.startsWith(path.resolve(candidateRoot))) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(resolvedFilePath, function (error, fileStat) {
    if (error || !fileStat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    var extension = path.extname(resolvedFilePath);
    response.writeHead(200, {
      "Content-Type": MIME[extension] || "application/octet-stream",
    });
    fs.createReadStream(resolvedFilePath).pipe(response);
  });
}

function buildLatencySummary() {
  var latencyByRoute = {};

  storedEvents.forEach(function (eventRecord) {
    if (eventRecord.type !== "pageload" || !eventRecord.data || eventRecord.data.duration == null) {
      return;
    }

    var routeName = eventRecord.route || "/";
    if (!latencyByRoute[routeName]) latencyByRoute[routeName] = [];

    latencyByRoute[routeName].push({
      duration: eventRecord.data.duration,
      timestamp: eventRecord.timestamp,
    });
  });

  return Object.keys(latencyByRoute).reduce(function (summary, routeName) {
    var durations = latencyByRoute[routeName].map(function (point) {
      return point.duration;
    });
    summary[routeName] = {
      count: durations.length,
      p50: Math.round(calculatePercentile(durations, 50)),
      p95: Math.round(calculatePercentile(durations, 95)),
      avg: Math.round(calculateAverage(durations)),
      points: latencyByRoute[routeName].slice(-24),
    };
    return summary;
  }, {});
}

function buildSeries(events, valueGetter) {
  var labels = ["1", "2", "3", "4", "5", "6", "7"];
  var series = [0, 0, 0, 0, 0, 0, 0];
  var relevantEvents = events.slice(-7);

  relevantEvents.forEach(function (eventRecord, index) {
    series[labels.length - relevantEvents.length + index] = valueGetter(eventRecord, index, relevantEvents);
  });

  return {
    labels: labels,
    values: series,
  };
}

function getNotificationAnalytics() {
  var breakdownCounts = {
    performance: 0,
    errors: 0,
    feedback: 0,
    clicks: 0,
  };
  var feedbackRatings = [];
  var feedbackBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  storedEvents.forEach(function (eventRecord) {
    if (eventRecord.type === "pageload") breakdownCounts.performance += 1;
    if (eventRecord.type === "error") breakdownCounts.errors += 1;
    if (eventRecord.type === "click") breakdownCounts.clicks += 1;
    if (eventRecord.type === "feedback") {
      breakdownCounts.feedback += 1;
      if (Number.isFinite(eventRecord.data.rating)) {
        feedbackRatings.push(eventRecord.data.rating);
        feedbackBreakdown[eventRecord.data.rating] = (feedbackBreakdown[eventRecord.data.rating] || 0) + 1;
      }
    }
  });

  return {
    breakdownCounts: breakdownCounts,
    feedbackAverage: feedbackRatings.length ? calculateAverage(feedbackRatings) : 0,
    feedbackTotal: feedbackRatings.length,
    feedbackBreakdown: feedbackBreakdown,
  };
}

function getDashboardStats() {
  var activeSessionIds = new Set();
  var recentWindow = Date.now() - ACTIVE_USER_WINDOW;
  var errorsByVersion = {};
  var recentErrors = [];
  var recentActivity = [];
  var analytics = getNotificationAnalytics();
  var customActivityTotal = 0;

  for (var index = storedEvents.length - 1; index >= 0; index -= 1) {
    var eventRecord = storedEvents[index];
    var eventTimestamp = new Date(eventRecord.timestamp).getTime();

    if (eventTimestamp >= recentWindow) {
      activeSessionIds.add(eventRecord.sessionId);
    }

    if (eventRecord.type === "error") {
      var versionName = eventRecord.deployVersion || "unknown";
      errorsByVersion[versionName] = (errorsByVersion[versionName] || 0) + 1;
      if (recentErrors.length < 20) recentErrors.push(eventRecord);
    }

    if (
      eventRecord.type === "custom" ||
      eventRecord.type === "login" ||
      eventRecord.type === "feedback"
    ) {
      customActivityTotal += 1;
    }

    if (recentActivity.length < 20) {
      recentActivity.push(eventRecord);
    }
  }

  var userSeries = buildSeries(storedEvents, function (_, index, relevantEvents) {
    var uniqueSessionIds = new Set();
    relevantEvents.slice(0, index + 1).forEach(function (seriesEvent) {
      uniqueSessionIds.add(seriesEvent.sessionId);
    });
    return uniqueSessionIds.size;
  });

  var activitySeries = buildSeries(storedEvents, function (eventRecord) {
    if (eventRecord.type === "custom" || eventRecord.type === "feedback" || eventRecord.type === "login") {
      return 1;
    }
    return 0;
  });

  return {
    activeUsers: activeSessionIds.size,
    totalEvents: storedEvents.length,
    totalErrors: recentErrors.length,
    errorsByVersion: errorsByVersion,
    latencyByRoute: buildLatencySummary(),
    recentErrors: recentErrors,
    recentActivity: recentActivity,
    analytics: {
      userSeries: userSeries,
      activitySeries: activitySeries,
      breakdownCounts: analytics.breakdownCounts,
      feedbackAverage: analytics.feedbackAverage,
      feedbackTotal: analytics.feedbackTotal,
      feedbackBreakdown: analytics.feedbackBreakdown,
      customActivityTotal: customActivityTotal,
    },
  };
}

const server = http.createServer(function (request, response) {
  var parsedUrl = new URL(request.url, "http://localhost");
  var pathname = parsedUrl.pathname;

  if (request.method === "OPTIONS") {
    applyCors(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "POST" && pathname === "/api/events") {
    readJsonBody(request)
      .then(function (requestBody) {
        var rawEvents = Array.isArray(requestBody.events) ? requestBody.events : [requestBody];
        var normalizedEvents = rawEvents.filter(isValidEvent).map(normalizeIncomingEvent);

        normalizedEvents.forEach(function (eventRecord) {
          storedEvents.push(eventRecord);
        });

        while (storedEvents.length > MAX_EVENTS) storedEvents.shift();

        if (normalizedEvents.length > 0) {
          broadcastEvents(normalizedEvents);
        }

        sendJson(response, 200, { accepted: normalizedEvents.length });
      })
      .catch(function () {
        sendJson(response, 400, { error: "Invalid JSON" });
      });
    return;
  }

  if (request.method === "GET" && pathname === "/api/events") {
    var typeFilter = parsedUrl.searchParams.get("type");
    var versionFilter = parsedUrl.searchParams.get("version");
    var limit = parseInt(parsedUrl.searchParams.get("limit") || "100", 10);
    var filteredEvents = storedEvents;

    if (typeFilter) {
      filteredEvents = filteredEvents.filter(function (eventRecord) {
        return eventRecord.type === typeFilter;
      });
    }

    if (versionFilter) {
      filteredEvents = filteredEvents.filter(function (eventRecord) {
        return eventRecord.deployVersion === versionFilter;
      });
    }

    sendJson(response, 200, { events: filteredEvents.slice(-limit) });
    return;
  }

  if (request.method === "GET" && pathname === "/api/stats") {
    sendJson(response, 200, getDashboardStats());
    return;
  }

  if (request.method === "GET" && pathname === "/api/events/stream") {
    applyCors(response);
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    response.write(":\n\n");
    sseClients.add(response);
    request.on("close", function () {
      sseClients.delete(response);
    });
    return;
  }

  serveStaticFile(response, pathname);
});

server.listen(PORT, function () {
  console.log("Prototype 3 dashboard running at http://localhost:" + PORT);
  console.log("  Dashboard : http://localhost:" + PORT + "/");
  console.log("  Demo app  : http://localhost:" + PORT + "/demo");
  console.log("  SDK       : http://localhost:" + PORT + "/sdk/watchtower.js");
});
