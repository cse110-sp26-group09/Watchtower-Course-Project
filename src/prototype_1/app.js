(function () {
  "use strict";

  var STORAGE_KEY = "watchtower-prototype1-state-v2";
  var MAX_TIMELINE_EVENTS = 50;
  var LIVE_UPDATE_INTERVAL_MS = 25000;
  var availableViewNames = ["home", "analytics", "settings"];

  var viewToggleElements = document.querySelectorAll("[data-view]");
  var timeRangeButtons = document.querySelectorAll(".segmented-control button");
  var settingsAccordionButtons = document.querySelectorAll(".settings-trigger");

  var elements = {
    activeIssuesCount: document.getElementById("active-issues-count"),
    lastUpdated: document.getElementById("dashboard-last-updated"),
    healthToken: document.getElementById("health-token"),
    healthSummaryTitle: document.getElementById("health-summary-title"),
    healthSummaryCopy: document.getElementById("health-summary-copy"),
    metricUptimeValue: document.getElementById("metric-uptime-value"),
    metricUptimeTrend: document.getElementById("metric-uptime-trend"),
    metricP95Value: document.getElementById("metric-p95-value"),
    metricP95Trend: document.getElementById("metric-p95-trend"),
    metricErrorValue: document.getElementById("metric-error-value"),
    metricErrorTrend: document.getElementById("metric-error-trend"),
    metricRatingValue: document.getElementById("metric-rating-value"),
    metricRatingTrend: document.getElementById("metric-rating-trend"),
    issueList: document.getElementById("issue-list"),
    serviceStack: document.getElementById("service-stack"),
    eventTimeline: document.getElementById("event-timeline"),
    userCountChart: document.getElementById("user-count-chart"),
    interactionChart: document.getElementById("interaction-chart"),
    latencyChart: document.getElementById("latency-chart"),
    latencyAxisLabels: document.getElementById("latency-axis-labels"),
    userCountDelta: document.getElementById("user-count-delta"),
    interactionDelta: document.getElementById("interaction-delta"),
    displayNameInput: document.getElementById("display-name"),
    profileDisplayName: document.getElementById("profile-display-name"),
    profileInitials: document.getElementById("profile-initials"),
    saveDisplayNameButton: document.getElementById("save-display-name-btn"),
    changePasswordButton: document.getElementById("change-password-btn"),
    signOutButton: document.getElementById("sign-out-btn"),
    twoFactorToggle: document.getElementById("two-factor-toggle"),
    highContrastToggle: document.getElementById("contrast-toggle"),
    textSizeSlider: document.getElementById("text-size"),
    languageSelect: document.getElementById("language"),
    criticalAlertToggle: document.getElementById("critical-alert-toggle"),
    browserNotificationToggle: document.getElementById("browser-notification-toggle"),
    pauseNotificationToggle: document.getElementById("pause-notification-toggle"),
    errorThresholdSelect: document.getElementById("error-threshold"),
    previewCopy: document.getElementById("notification-preview-copy"),
    previewAcknowledgeButton: document.getElementById("preview-acknowledge-btn"),
    previewPauseButton: document.getElementById("preview-pause-btn"),
    refreshButton: document.getElementById("refresh-dashboard-btn"),
    notificationStack: document.getElementById("notification-stack"),
    openNotificationCenterButton: document.getElementById("open-notification-center"),
    buildId: document.getElementById("build-id"),
    buildCommit: document.getElementById("build-commit"),
    buildBranch: document.getElementById("build-branch"),
    buildDeployedAt: document.getElementById("build-deployed-at")
  };

  var dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  var timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  var hourFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric" });

  function normalizeSelectedRange(value) {
    var allowedRanges = ["24h", "7d", "30d"];
    return allowedRanges.indexOf(value) !== -1 ? value : "24h";
  }

  var state = loadState();
  state.selectedRange = normalizeSelectedRange(state.selectedRange);
  var liveUpdateTimer = null;

  /**
   * Generate deterministic noise for stable mock data.
   *
   * @param {number} seed - Numeric seed.
   * @returns {number}
   */
  function seededNoise(seed) {
    var x = Math.sin(seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * Clamp a numeric value.
   *
   * @param {number} value - Incoming value.
   * @param {number} min - Minimum bound.
   * @param {number} max - Maximum bound.
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Create a default persisted app state.
   *
   * @returns {object}
   */
  function getDefaultState() {
    var seed = createSeedAnalytics();

    return {
      selectedRange: "24h",
      lastUpdated: Date.now(),
      build: {
        id: "build-4821",
        commit: "9f31c2a",
        branch: "release/watchtower",
        deployedAt: new Date(Date.now() - 52 * 60 * 1000).toISOString()
      },
      settings: {
        displayName: "Aditya",
        signedOut: false,
        twoFactorEnabled: true,
        highContrastEnabled: false,
        textSizeLevel: "1",
        language: "English",
        criticalAlertsEnabled: true,
        browserNotificationsEnabled: false,
        notificationsPaused: false,
        errorThresholdPercent: "2%"
      },
      analytics: seed,
      issues: [
        {
          id: "issue-1",
          severity: "critical",
          title: "Checkout promise rejection",
          description: "Payment gateway returned undefined response during cart submit.",
          version: "v1.2.0-beta",
          zone: "prod-us-west",
          assignee: "Priya",
          timestamp: Date.now() - 18 * 60 * 1000
        },
        {
          id: "issue-2",
          severity: "warning",
          title: "Search latency spike",
          description: "P95 response time exceeded 300 ms for authenticated sessions.",
          version: "v1.2.0-beta",
          zone: "prod-us-west",
          assignee: "Waleed",
          timestamp: Date.now() - 26 * 60 * 1000
        },
        {
          id: "issue-3",
          severity: "info",
          title: "Feedback rating dip",
          description: "Average rating moved from 4.7 to 4.3 after the latest deploy.",
          version: "v1.2.0-beta",
          zone: "prod-us-west",
          assignee: "Hieu",
          timestamp: Date.now() - 41 * 60 * 1000
        }
      ],
      events: [
        makeEvent("error", "Unhandled promise rejection on /checkout", "critical", "/checkout"),
        makeEvent("pageload", "Page load /products completed in 142 ms", "info", "/products"),
        makeEvent("performance", "Latency threshold alert on Search API", "warning", "/search"),
        makeEvent("feedback", "New feedback: \"Checkout froze after submit\"", "warning", "/checkout")
      ]
    };
  }

  /**
   * Build seeded analytics for daily and hourly charts.
   *
   * @returns {object}
   */
  function createSeedAnalytics() {
    var daily = [];
    var hourly = [];
    var today = new Date();
    var baseUsers = 820;

    for (var dayOffset = 29; dayOffset >= 0; dayOffset--) {
      var dayDate = new Date(today);
      dayDate.setHours(12, 0, 0, 0);
      dayDate.setDate(today.getDate() - dayOffset);

      var dailyGrowth = Math.round((seededNoise(dayOffset + 1) - 0.42) * 90 + 28);
      baseUsers = Math.max(380, baseUsers + dailyGrowth);

      var interactions = Math.max(100, Math.round(baseUsers * (0.37 + seededNoise(dayOffset + 40) * 0.22)));
      var rating = clamp(4.5 - seededNoise(dayOffset + 80) * 0.4, 3.9, 4.9);
      var errorRate = clamp(1 + seededNoise(dayOffset + 120) * 2.2, 0.6, 4.8);
      var checkoutLatency = Math.round(170 + seededNoise(dayOffset + 160) * 110);
      var searchLatency = Math.round(125 + seededNoise(dayOffset + 190) * 70);
      var productsLatency = Math.round(95 + seededNoise(dayOffset + 230) * 50);

      daily.push({
        date: dayDate.toISOString(),
        users: baseUsers,
        interactions: interactions,
        rating: Number(rating.toFixed(2)),
        errorRate: Number(errorRate.toFixed(2)),
        latency: {
          checkout: checkoutLatency,
          search: searchLatency,
          products: productsLatency
        }
      });
    }

    var latestDaily = daily[daily.length - 1];

    for (var hourOffset = 23; hourOffset >= 0; hourOffset--) {
      var hourDate = new Date();
      hourDate.setMinutes(0, 0, 0);
      hourDate.setHours(hourDate.getHours() - hourOffset);

      var hourWeight = 0.65 + seededNoise(hourOffset + 300) * 0.6;
      var hourlyUsers = Math.max(40, Math.round((latestDaily.users / 24) * hourWeight));
      var hourlyInteractions = Math.max(18, Math.round((latestDaily.interactions / 24) * (0.8 + seededNoise(hourOffset + 360) * 0.5)));

      hourly.push({
        date: hourDate.toISOString(),
        users: hourlyUsers,
        interactions: hourlyInteractions,
        latency: {
          checkout: Math.round(latestDaily.latency.checkout * (0.86 + seededNoise(hourOffset + 410) * 0.28)),
          search: Math.round(latestDaily.latency.search * (0.84 + seededNoise(hourOffset + 440) * 0.3)),
          products: Math.round(latestDaily.latency.products * (0.84 + seededNoise(hourOffset + 470) * 0.32))
        }
      });
    }

    return { daily: daily, hourly: hourly };
  }

  /**
   * Restore state from localStorage or create new state.
   *
   * @returns {object}
   */
  function loadState() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return getDefaultState();
      var parsed = JSON.parse(stored);
      if (!parsed || !parsed.settings || !parsed.analytics) return getDefaultState();
      return parsed;
    } catch (_error) {
      return getDefaultState();
    }
  }

  /**
   * Persist state to localStorage.
   *
   * @returns {void}
   */
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Create an event timeline entry.
   *
   * @param {string} type - Event type.
   * @param {string} message - Human readable message.
   * @param {string} severity - Severity level.
   * @param {string} route - Affected route.
   * @returns {object}
   */
  function makeEvent(type, message, severity, route) {
    return {
      id: "ev-" + Math.random().toString(16).slice(2),
      type: type,
      message: message,
      severity: severity || "info",
      route: route || "/",
      timestamp: Date.now()
    };
  }

  /**
   * Add an event, trim history, and persist state.
   *
   * @param {object} event - Event payload.
   * @returns {void}
   */
  function pushEvent(event) {
    state.events.unshift(event);
    if (state.events.length > MAX_TIMELINE_EVENTS) state.events = state.events.slice(0, MAX_TIMELINE_EVENTS);
    state.lastUpdated = Date.now();
    saveState();
  }

  /**
   * Return a short initials string from display name.
   *
   * @param {string} name - Full display name.
   * @returns {string}
   */
  function toInitials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join("") || "WT";
  }

  /**
   * Format numeric values with commas.
   *
   * @param {number} value - Value to format.
   * @returns {string}
   */
  function formatNumber(value) {
    return Number(value).toLocaleString("en-US");
  }

  /**
   * Compute percentage delta between first and last points.
   *
   * @param {number} first - First value.
   * @param {number} last - Last value.
   * @returns {string}
   */
  function formatDelta(first, last) {
    if (!first) return "0.0%";
    var delta = ((last - first) / first) * 100;
    var sign = delta >= 0 ? "+" : "";
    return sign + delta.toFixed(1) + "%";
  }

  /**
   * Convert timestamp into mm:ss style UI string.
   *
   * @param {number} timestamp - Epoch timestamp.
   * @returns {string}
   */
  function formatTimelineTime(timestamp) {
    var date = new Date(timestamp);
    return timeFormatter.format(date);
  }

  /**
   * Build a label for chart points based on selected range.
   *
   * @param {object} point - Point object with ISO date.
   * @param {string} range - Current range selection.
   * @returns {string}
   */
  function getPointLabel(point, range) {
    var date = new Date(point.date);
    if (range === "24h") return hourFormatter.format(date);
    return dateFormatter.format(date);
  }

  /**
   * Resolve chart points for selected range.
   *
   * @returns {object}
   */
  function getRangeData() {
    if (state.selectedRange === "24h") {
      return {
        points: state.analytics.hourly,
        first: state.analytics.hourly[0],
        last: state.analytics.hourly[state.analytics.hourly.length - 1]
      };
    }

    var days = state.selectedRange === "7d" ? 7 : 30;
    var daily = state.analytics.daily.slice(-days);
    return {
      points: daily,
      first: daily[0],
      last: daily[daily.length - 1]
    };
  }

  /**
   * Draw simple bar chart into a container element.
   *
   * @param {HTMLElement|null} container - Chart container.
   * @param {Array<object>} points - Chart points.
   * @param {string} fieldName - Field name on each point.
   * @param {string} range - Current selected range.
   * @returns {void}
   */
  function renderBarChart(container, points, fieldName, range) {
    if (!container) return;
    container.innerHTML = "";

    var values = points.map(function (point) { return point[fieldName]; });
    var maxValue = Math.max.apply(null, values);

    points.forEach(function (point, index) {
      var value = point[fieldName];
      var height = maxValue ? Math.round((value / maxValue) * 100) : 0;

      var bar = document.createElement("div");
      bar.className = "bar" + (index === points.length - 1 ? " highlight" : "");
      bar.style.setProperty("--bar-height", String(height) + "%");
      bar.title = getPointLabel(point, range) + ": " + formatNumber(value);

      var valueNode = document.createElement("small");
      valueNode.className = "bar-value";
      valueNode.textContent = formatNumber(value);

      var label = document.createElement("span");
      label.textContent = getPointLabel(point, range);

      bar.appendChild(valueNode);
      bar.appendChild(label);
      container.appendChild(bar);
    });
  }

  /**
   * Render route latency line chart with date labels.
   *
   * @param {Array<object>} points - Range points.
   * @param {string} range - Current selected range.
   * @returns {void}
   */
  function renderLatencyChart(points, range) {
    if (!elements.latencyChart || !elements.latencyAxisLabels) return;

    var svg = elements.latencyChart;
    var width = 640;
    var height = 260;
    var padding = { top: 24, right: 24, bottom: 24, left: 50 };
    var routes = ["checkout", "search", "products"];
    var values = [];

    points.forEach(function (point) {
      routes.forEach(function (routeName) {
        values.push(point.latency[routeName]);
      });
    });

    var maxY = Math.max.apply(null, values.concat([250]));
    var minY = Math.min.apply(null, values.concat([60]));
    var ySpan = Math.max(1, maxY - minY);

    function xPosition(index) {
      if (points.length <= 1) return padding.left;
      return padding.left + ((width - padding.left - padding.right) * index) / (points.length - 1);
    }

    function yPosition(value) {
      return padding.top + ((maxY - value) / ySpan) * (height - padding.top - padding.bottom);
    }

    var grid = "";
    for (var lineIndex = 0; lineIndex < 5; lineIndex++) {
      var y = padding.top + ((height - padding.top - padding.bottom) * lineIndex) / 4;
      grid += '<path d="M' + padding.left + " " + y + " H" + (width - padding.right) + '"></path>';
    }

    var routePaths = routes
      .map(function (routeName) {
        var path = "";
        points.forEach(function (point, index) {
          var segment = (index === 0 ? "M" : "L") + xPosition(index) + " " + yPosition(point.latency[routeName]);
          path += segment + " ";
        });
        return '<path class="line ' + routeName + '" d="' + path.trim() + '"></path>';
      })
      .join("");

    svg.innerHTML =
      '<title id="latency-svg-title">Latency by route over ' + state.selectedRange + '</title>' +
      '<g class="grid-lines">' + grid + "</g>" +
      routePaths;

    var labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];
    var uniqueIndexes = labelIndexes.filter(function (value, index, array) {
      return array.indexOf(value) === index;
    });

    elements.latencyAxisLabels.innerHTML = uniqueIndexes
      .map(function (pointIndex) {
        return '<span>' + getPointLabel(points[pointIndex], range) + '</span>';
      })
      .join("");
  }

  /**
   * Render issue rows from state.
   *
   * @returns {void}
   */
  function renderIssues() {
    if (!elements.issueList) return;

    elements.issueList.innerHTML = state.issues
      .slice(0, 5)
      .map(function (issue) {
        return (
          '<article class="issue-row severity-' + issue.severity + '">' +
          '<div class="issue-main">' +
          '<span class="severity-pill">' + issue.severity + '</span>' +
          '<h3 data-issue-id="' + issue.id + '">' + issue.title + '</h3>' +
          '<p>' + issue.description + '</p>' +
          '<div class="issue-meta">' +
          '<span>' + issue.version + '</span>' +
          '<span>' + issue.zone + '</span>' +
          '<span>' + formatTimelineTime(issue.timestamp) + '</span>' +
          '</div>' +
          '</div>' +
          '<label class="assign-control">' +
          '<span>Assign</span>' +
          '<select data-issue-id="' + issue.id + '">' +
          ['Aditya', 'James', 'Daniel', 'Waleed', 'Hieu', 'Fahad', 'Alex', 'Woosik']
            .map(function (name) {
              return '<option ' + (name === issue.assignee ? 'selected' : '') + '>' + name + '</option>';
            })
            .join('') +
          '</select>' +
          '</label>' +
          '</article>'
        );
      })
      .join('');

    if (elements.activeIssuesCount) {
      elements.activeIssuesCount.textContent = String(state.issues.length) + " active issues";
    }
  }

  /**
   * Render simple service state cards from current metrics.
   *
   * @returns {void}
   */
  function renderServices() {
    if (!elements.serviceStack) return;

    var latestDaily = state.analytics.daily[state.analytics.daily.length - 1];
    var latestHourly = state.analytics.hourly[state.analytics.hourly.length - 1];

    var serviceRows = [
      {
        status: "good",
        name: "Frontend SDK",
        metric: formatNumber(latestHourly.interactions) + " interactions/hr",
        stateLabel: "Online"
      },
      {
        status: latestDaily.latency.checkout > 250 ? "warning" : "good",
        name: "Ingestion API",
        metric: latestDaily.latency.checkout + " ms p95",
        stateLabel: latestDaily.latency.checkout > 250 ? "Watch" : "Online"
      },
      {
        status: "good",
        name: "Event store",
        metric: "99.99% durable",
        stateLabel: "Online"
      },
      {
        status: state.settings.notificationsPaused ? "warning" : "danger",
        name: "Alerts",
        metric: state.settings.notificationsPaused ? "Paused" : String(state.issues.length) + " unresolved",
        stateLabel: state.settings.notificationsPaused ? "Paused" : "Action"
      }
    ];

    elements.serviceStack.innerHTML = serviceRows
      .map(function (service) {
        return (
          '<div class="service-row">' +
          '<span class="service-dot ' + service.status + '" aria-hidden="true"></span>' +
          '<div><strong>' + service.name + '</strong><span>' + service.metric + '</span></div>' +
          '<span class="service-state">' + service.stateLabel + '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  /**
   * Render event timeline from recent events.
   *
   * @returns {void}
   */
  function renderTimeline() {
    if (!elements.eventTimeline) return;

    elements.eventTimeline.innerHTML = state.events
      .slice(0, 8)
      .map(function (event) {
        return (
          "<li>" +
          '<span class="timeline-time">' + formatTimelineTime(event.timestamp) + "</span>" +
          '<span class="timeline-copy">' + event.message + "</span>" +
          "</li>"
        );
      })
      .join("");
  }

  /**
   * Render analytics charts and deltas.
   *
   * @returns {void}
   */
  function renderAnalytics() {
    var rangeData = getRangeData();
    var points = rangeData.points;

    renderBarChart(elements.userCountChart, points, "users", state.selectedRange);
    renderBarChart(elements.interactionChart, points, "interactions", state.selectedRange);
    renderLatencyChart(points, state.selectedRange);

    if (elements.userCountDelta) {
      elements.userCountDelta.textContent = formatDelta(rangeData.first.users, rangeData.last.users);
    }

    if (elements.interactionDelta) {
      elements.interactionDelta.textContent = formatDelta(rangeData.first.interactions, rangeData.last.interactions);
    }
  }

  /**
   * Render summary metrics and health text.
   *
   * @returns {void}
   */
  function renderHomeSummary() {
    var latestDaily = state.analytics.daily[state.analytics.daily.length - 1];
    var previousDaily = state.analytics.daily[state.analytics.daily.length - 2] || latestDaily;

    var uptime = clamp(100 - latestDaily.errorRate * 0.14, 97.5, 99.99);
    var p95 = latestDaily.latency.checkout;
    var errorTrend = latestDaily.errorRate - previousDaily.errorRate;
    var p95Trend = p95 - previousDaily.latency.checkout;
    var userTrend = latestDaily.users - previousDaily.users;
    var uptimeTrend = (previousDaily.errorRate - latestDaily.errorRate) * 0.14;

    if (elements.metricUptimeValue) elements.metricUptimeValue.textContent = uptime.toFixed(2) + "%";
    if (elements.metricUptimeTrend) {
      elements.metricUptimeTrend.textContent = (uptimeTrend >= 0 ? "+" : "") + uptimeTrend.toFixed(2) + "%";
    }
    if (elements.metricP95Value) elements.metricP95Value.textContent = p95 + " ms";
    if (elements.metricP95Trend) elements.metricP95Trend.textContent = p95Trend === 0 ? "stable" : (p95Trend > 0 ? "+" : "") + p95Trend + " ms";
    if (elements.metricErrorValue) elements.metricErrorValue.textContent = latestDaily.errorRate.toFixed(2) + "%";
    if (elements.metricErrorTrend) elements.metricErrorTrend.textContent = (errorTrend >= 0 ? "+" : "") + errorTrend.toFixed(2) + "%";
    if (elements.metricRatingValue) elements.metricRatingValue.textContent = latestDaily.rating.toFixed(1);
    if (elements.metricRatingTrend) elements.metricRatingTrend.textContent = (userTrend >= 0 ? "+" : "") + formatNumber(userTrend) + " users";

    if (elements.healthToken) {
      elements.healthToken.textContent = latestDaily.errorRate >= 3 ? "Watch" : "Healthy";
      elements.healthToken.classList.toggle("good", latestDaily.errorRate < 3);
      elements.healthToken.classList.toggle("watch", latestDaily.errorRate >= 3);
    }

    if (elements.healthSummaryTitle) {
      elements.healthSummaryTitle.textContent =
        latestDaily.errorRate >= 3
          ? "Observed app is reachable but error rate is above target."
          : "Observed app is stable and traffic is trending upward.";
    }

    if (elements.healthSummaryCopy) {
      elements.healthSummaryCopy.innerHTML =
        "Version <code>" + state.issues[0].version + "</code> has " +
        formatNumber(latestDaily.users) + " users today with checkout p95 at " +
        p95 + " ms.";
    }

    if (elements.lastUpdated) {
      elements.lastUpdated.textContent = "Updated " + timeFormatter.format(new Date(state.lastUpdated));
    }
  }

  /**
   * Render build metadata values.
   *
   * @returns {void}
   */
  function renderBuildMetadata() {
    if (elements.buildId) elements.buildId.textContent = state.build.id;
    if (elements.buildCommit) elements.buildCommit.textContent = state.build.commit;
    if (elements.buildBranch) elements.buildBranch.textContent = state.build.branch;
    if (elements.buildDeployedAt) elements.buildDeployedAt.textContent = timeFormatter.format(new Date(state.build.deployedAt));
  }

  /**
   * Render profile and user settings state.
   *
   * @returns {void}
   */
  function renderSettingsState() {
    var settings = state.settings;

    if (elements.displayNameInput) elements.displayNameInput.value = settings.displayName;
    if (elements.profileDisplayName) elements.profileDisplayName.textContent = settings.displayName;
    if (elements.profileInitials) elements.profileInitials.textContent = toInitials(settings.displayName);
    if (elements.twoFactorToggle) elements.twoFactorToggle.checked = settings.twoFactorEnabled;
    if (elements.highContrastToggle) elements.highContrastToggle.checked = settings.highContrastEnabled;
    if (elements.textSizeSlider) elements.textSizeSlider.value = settings.textSizeLevel;
    if (elements.languageSelect) elements.languageSelect.value = settings.language;
    if (elements.criticalAlertToggle) elements.criticalAlertToggle.checked = settings.criticalAlertsEnabled;
    if (elements.browserNotificationToggle) elements.browserNotificationToggle.checked = settings.browserNotificationsEnabled;
    if (elements.pauseNotificationToggle) elements.pauseNotificationToggle.checked = settings.notificationsPaused;
    if (elements.errorThresholdSelect) elements.errorThresholdSelect.value = settings.errorThresholdPercent;

    if (elements.signOutButton) {
      elements.signOutButton.textContent = settings.signedOut ? "Sign in" : "Sign out";
    }

    document.body.classList.toggle("high-contrast", settings.highContrastEnabled);
    document.body.classList.remove("text-compact", "text-large", "signed-out");
    if (settings.textSizeLevel === "0") document.body.classList.add("text-compact");
    if (settings.textSizeLevel === "2") document.body.classList.add("text-large");
    if (settings.signedOut) document.body.classList.add("signed-out");

    var disableSettingsInputs = settings.signedOut;
    [
      elements.displayNameInput,
      elements.saveDisplayNameButton,
      elements.changePasswordButton,
      elements.twoFactorToggle,
      elements.highContrastToggle,
      elements.textSizeSlider,
      elements.languageSelect,
      elements.criticalAlertToggle,
      elements.browserNotificationToggle,
      elements.pauseNotificationToggle,
      elements.errorThresholdSelect,
      elements.previewAcknowledgeButton,
      elements.previewPauseButton
    ].forEach(function (node) {
      if (!node) return;
      node.disabled = disableSettingsInputs;
    });
  }

  /**
   * Render all data-driven UI sections.
   *
   * @returns {void}
   */
  function renderAll() {
    renderHomeSummary();
    renderIssues();
    renderServices();
    renderTimeline();
    renderAnalytics();
    renderBuildMetadata();
    renderSettingsState();
  }

  /**
   * Create an in-app notification toast.
   *
   * @param {string} title - Notification title.
   * @param {string} message - Notification body.
   * @param {string} severity - Notification severity.
   * @returns {void}
   */
  function showNotificationToast(title, message, severity) {
    if (!elements.notificationStack) return;

    var toast = document.createElement("article");
    toast.className = "notification-toast severity-" + (severity || "info");

    var heading = document.createElement("h3");
    heading.textContent = title;

    var body = document.createElement("p");
    body.textContent = message;

    var footer = document.createElement("div");
    footer.className = "notification-toast-meta";

    var timestamp = document.createElement("span");
    timestamp.textContent = "now";

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "toast-close";
    closeButton.textContent = "Dismiss";
    closeButton.addEventListener("click", function () {
      toast.remove();
    });

    footer.appendChild(timestamp);
    footer.appendChild(closeButton);
    toast.appendChild(heading);
    toast.appendChild(body);
    toast.appendChild(footer);
    elements.notificationStack.prepend(toast);

    while (elements.notificationStack.children.length > 4) {
      elements.notificationStack.removeChild(elements.notificationStack.lastElementChild);
    }

    window.setTimeout(function () {
      if (toast && toast.parentNode) toast.remove();
    }, 9000);
  }

  /**
   * Trigger browser-level notification when permission is granted.
   *
   * @param {string} title - Title.
   * @param {string} message - Message body.
   * @returns {void}
   */
  function tryBrowserNotification(title, message) {
    if (!state.settings.browserNotificationsEnabled || state.settings.notificationsPaused) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    new Notification(title, {
      body: message,
      tag: "watchtower-alert",
      renotify: true
    });
  }

  /**
   * Dispatch a notification to toast + browser API when enabled.
   *
   * @param {string} title - Notification title.
   * @param {string} message - Notification text.
   * @param {string} severity - Severity level.
   * @returns {void}
   */
  function notify(title, message, severity) {
    if (state.settings.notificationsPaused) return;

    if (severity === "critical" && !state.settings.criticalAlertsEnabled) return;

    showNotificationToast(title, message, severity);
    tryBrowserNotification(title, message);
  }

  /**
   * Apply a new random event and mutate analytics values.
   *
   * @returns {void}
   */
  function simulateLiveUpdate() {
    var roll = Math.random();
    var latestDaily = state.analytics.daily[state.analytics.daily.length - 1];
    var latestHourly = state.analytics.hourly[state.analytics.hourly.length - 1];
    var event;

    if (roll < 0.33) {
      latestDaily.errorRate = clamp(latestDaily.errorRate + 0.08, 0.6, 5.8);
      latestDaily.latency.checkout = clamp(latestDaily.latency.checkout + 6, 120, 390);
      event = makeEvent("error", "Checkout timeout exceeded threshold on /checkout", "critical", "/checkout");
      notify("Critical Alert", "Checkout timeout exceeded threshold.", "critical");
    } else if (roll < 0.66) {
      latestDaily.users = Math.max(300, latestDaily.users + Math.round(Math.random() * 14));
      latestDaily.interactions = Math.max(90, latestDaily.interactions + Math.round(Math.random() * 9));
      latestDaily.latency.search = clamp(latestDaily.latency.search + Math.round((Math.random() - 0.5) * 10), 80, 260);
      event = makeEvent("interaction", "New traffic burst detected from campaign route", "info", "/products");
    } else {
      latestDaily.latency.products = clamp(latestDaily.latency.products + Math.round((Math.random() - 0.5) * 12), 65, 240);
      latestDaily.errorRate = clamp(latestDaily.errorRate - 0.05, 0.5, 5.6);
      event = makeEvent("performance", "Products route latency recalculated after cache warmup", "warning", "/products");
      notify("Performance Watch", "Products route latency shifted noticeably.", "warning");
    }

    latestHourly.users = Math.max(10, Math.round(latestDaily.users / 24 + (Math.random() - 0.5) * 16));
    latestHourly.interactions = Math.max(6, Math.round(latestDaily.interactions / 24 + (Math.random() - 0.5) * 10));
    latestHourly.latency.checkout = latestDaily.latency.checkout;
    latestHourly.latency.search = latestDaily.latency.search;
    latestHourly.latency.products = latestDaily.latency.products;

    pushEvent(event);
    state.lastUpdated = Date.now();
    saveState();
    renderAll();
  }

  /**
   * Show the selected WatchTower view and update navigation controls.
   *
   * @param {string} selectedViewName - The target view id prefix.
   * @returns {void}
   */
  function activateView(selectedViewName) {
    if (availableViewNames.indexOf(selectedViewName) === -1) return;

    availableViewNames.forEach(function (viewName) {
      var targetViewPanel = document.getElementById(viewName + "-view");
      var isActiveView = viewName === selectedViewName;
      if (!targetViewPanel) return;
      targetViewPanel.hidden = !isActiveView;
      targetViewPanel.classList.toggle("active", isActiveView);
    });

    viewToggleElements.forEach(function (viewToggleElement) {
      viewToggleElement.classList.toggle("active", viewToggleElement.getAttribute("data-view") === selectedViewName);
    });

    document.title = "WatchTower - " + selectedViewName.charAt(0).toUpperCase() + selectedViewName.slice(1);
    window.location.hash = selectedViewName;
  }

  /**
   * Attach handlers for navigation controls.
   *
   * @returns {void}
   */
  function initializeViewNavigation() {
    viewToggleElements.forEach(function (viewToggleElement) {
      viewToggleElement.addEventListener("click", function (event) {
        var selectedViewName = viewToggleElement.getAttribute("data-view");
        if (viewToggleElement.tagName === "A") event.preventDefault();
        activateView(selectedViewName);
      });
    });
  }

  /**
   * Setup analytics range controls.
   *
   * @returns {void}
   */
  function initializeTimeRangeButtons() {
    timeRangeButtons.forEach(function (timeRangeButton) {
      timeRangeButton.addEventListener("click", function () {
        state.selectedRange = normalizeSelectedRange(timeRangeButton.getAttribute("data-range"));

        timeRangeButtons.forEach(function (buttonElement) {
          buttonElement.classList.toggle("active", buttonElement === timeRangeButton);
        });

        saveState();
        renderAnalytics();
      });
    });

    timeRangeButtons.forEach(function (buttonElement) {
      buttonElement.classList.toggle("active", buttonElement.getAttribute("data-range") === state.selectedRange);
    });
  }

  /**
   * Initialize settings accordions.
   *
   * @returns {void}
   */
  function initializeSettingsAccordions() {
    settingsAccordionButtons.forEach(function (accordionButton) {
      accordionButton.addEventListener("click", function () {
        var parentSettingsSection = accordionButton.closest(".settings-section");
        if (!parentSettingsSection) return;
        var shouldOpenSection = !parentSettingsSection.classList.contains("open");

        document.querySelectorAll(".settings-section").forEach(function (settingsSection) {
          var sectionButton = settingsSection.querySelector(".settings-trigger");
          settingsSection.classList.remove("open");
          if (sectionButton) sectionButton.setAttribute("aria-expanded", "false");
        });

        parentSettingsSection.classList.toggle("open", shouldOpenSection);
        accordionButton.setAttribute("aria-expanded", String(shouldOpenSection));
      });
    });
  }

  /**
   * Initialize assignment dropdown behavior using event delegation.
   *
   * @returns {void}
   */
  function initializeAssignmentDropdowns() {
    document.addEventListener("change", function (event) {
      if (!(event.target instanceof HTMLSelectElement)) return;
      if (!event.target.matches(".assign-control select")) return;

      var issueId = event.target.getAttribute("data-issue-id");
      var issue = state.issues.find(function (entry) { return entry.id === issueId; });
      if (!issue) return;

      issue.assignee = event.target.value;
      pushEvent(makeEvent("assignment", issue.title + " assigned to " + issue.assignee, "info", "/"));
      notify("Issue Updated", issue.title + " assigned to " + issue.assignee + ".", "info");
      renderIssues();
      renderTimeline();
      saveState();
    });
  }

  /**
   * Save display-name changes.
   *
   * @returns {void}
   */
  function initializeProfileActions() {
    if (elements.saveDisplayNameButton) {
      elements.saveDisplayNameButton.addEventListener("click", function () {
        if (!elements.displayNameInput) return;
        var nextName = elements.displayNameInput.value.trim();
        if (!nextName) {
          notify("Display Name", "Display name cannot be empty.", "warning");
          return;
        }

        state.settings.displayName = nextName;
        pushEvent(makeEvent("profile", "Display name changed to " + nextName, "info", "/settings"));
        renderSettingsState();
        renderTimeline();
        notify("Profile Updated", "Display name saved successfully.", "info");
      });
    }

    if (elements.changePasswordButton) {
      elements.changePasswordButton.addEventListener("click", function () {
        var newPassword = window.prompt("Enter a new password (min 8 characters):", "");
        if (newPassword === null) return;
        if (newPassword.trim().length < 8) {
          notify("Password Not Changed", "Password must be at least 8 characters.", "warning");
          return;
        }

        pushEvent(makeEvent("security", "Password changed for " + state.settings.displayName, "info", "/settings"));
        renderTimeline();
        notify("Password Updated", "Your password was changed successfully.", "info");
      });
    }

    if (elements.signOutButton) {
      elements.signOutButton.addEventListener("click", function () {
        state.settings.signedOut = !state.settings.signedOut;
        pushEvent(
          makeEvent(
            "auth",
            state.settings.signedOut
              ? state.settings.displayName + " signed out"
              : state.settings.displayName + " signed in",
            "info",
            "/settings"
          )
        );
        renderAll();
        notify("Session Updated", state.settings.signedOut ? "Signed out." : "Signed back in.", "info");
        saveState();
      });
    }
  }

  /**
   * Initialize settings controls and persistence.
   *
   * @returns {void}
   */
  function initializeSettingsControls() {
    if (elements.twoFactorToggle) {
      elements.twoFactorToggle.addEventListener("change", function () {
        state.settings.twoFactorEnabled = elements.twoFactorToggle.checked;
        saveState();
      });
    }

    if (elements.highContrastToggle) {
      elements.highContrastToggle.addEventListener("change", function () {
        state.settings.highContrastEnabled = elements.highContrastToggle.checked;
        renderSettingsState();
        saveState();
      });
    }

    if (elements.textSizeSlider) {
      elements.textSizeSlider.addEventListener("input", function () {
        state.settings.textSizeLevel = elements.textSizeSlider.value;
        renderSettingsState();
        saveState();
      });
    }

    if (elements.languageSelect) {
      elements.languageSelect.addEventListener("change", function () {
        state.settings.language = elements.languageSelect.value;
        saveState();
      });
    }

    if (elements.criticalAlertToggle) {
      elements.criticalAlertToggle.addEventListener("change", function () {
        state.settings.criticalAlertsEnabled = elements.criticalAlertToggle.checked;
        saveState();
        notify("Notification Settings", "Critical alerts " + (state.settings.criticalAlertsEnabled ? "enabled." : "disabled."), "info");
      });
    }

    if (elements.pauseNotificationToggle) {
      elements.pauseNotificationToggle.addEventListener("change", function () {
        state.settings.notificationsPaused = elements.pauseNotificationToggle.checked;
        if (elements.previewCopy) {
          elements.previewCopy.innerHTML =
            state.settings.notificationsPaused
              ? "Notifications are paused for now. You can still review incidents in the timeline."
              : 'Checkout error rate exceeded 2% on <code>v1.2.0-beta</code>. Priya has been assigned.';
        }
        renderServices();
        saveState();
      });
    }

    if (elements.browserNotificationToggle) {
      elements.browserNotificationToggle.addEventListener("change", function () {
        if (!("Notification" in window)) {
          elements.browserNotificationToggle.checked = false;
          state.settings.browserNotificationsEnabled = false;
          notify("Browser Notifications", "This browser does not support Notification API.", "warning");
          saveState();
          return;
        }

        if (!elements.browserNotificationToggle.checked) {
          state.settings.browserNotificationsEnabled = false;
          saveState();
          return;
        }

        Notification.requestPermission().then(function (permission) {
          if (permission === "granted") {
            state.settings.browserNotificationsEnabled = true;
            notify("Browser Notifications", "Popup notifications are now enabled.", "info");
          } else {
            state.settings.browserNotificationsEnabled = false;
            elements.browserNotificationToggle.checked = false;
            notify("Browser Notifications", "Permission denied. Enable it in browser settings.", "warning");
          }
          saveState();
        });
      });
    }

    if (elements.errorThresholdSelect) {
      elements.errorThresholdSelect.addEventListener("change", function () {
        state.settings.errorThresholdPercent = elements.errorThresholdSelect.value;
        saveState();
      });
    }

    if (elements.previewAcknowledgeButton) {
      elements.previewAcknowledgeButton.addEventListener("click", function () {
        notify("Alert Acknowledged", "You acknowledged the current critical condition.", "info");
        pushEvent(makeEvent("ack", "Critical condition acknowledged by " + state.settings.displayName, "info", "/settings"));
        renderTimeline();
      });
    }

    if (elements.previewPauseButton) {
      elements.previewPauseButton.addEventListener("click", function () {
        state.settings.notificationsPaused = true;
        if (elements.pauseNotificationToggle) elements.pauseNotificationToggle.checked = true;
        renderServices();
        saveState();
        notify("Notifications Paused", "Non-critical notifications are paused.", "warning");
      });
    }
  }

  /**
   * Wire utility actions such as refresh and open alert tray.
   *
   * @returns {void}
   */
  function initializeUtilityActions() {
    if (elements.refreshButton) {
      elements.refreshButton.addEventListener("click", function () {
        simulateLiveUpdate();
        notify("Dashboard Refreshed", "Pulled latest event snapshot.", "info");
      });
    }

    if (elements.openNotificationCenterButton) {
      elements.openNotificationCenterButton.addEventListener("click", function () {
        showNotificationToast("WatchTower Alerts", "Notifications are active for this environment.", "info");
      });
    }
  }

  /**
   * Ensure live simulation timer is running.
   *
   * @returns {void}
   */
  function startLiveSimulation() {
    if (liveUpdateTimer) window.clearInterval(liveUpdateTimer);
    liveUpdateTimer = window.setInterval(simulateLiveUpdate, LIVE_UPDATE_INTERVAL_MS);
  }

  /**
   * Boot the frontend by wiring controls and restoring view state.
   *
   * @returns {void}
   */
  function initializeWatchTowerFrontend() {
    var initialHashViewName = window.location.hash.replace("#", "");

    initializeViewNavigation();
    initializeTimeRangeButtons();
    initializeSettingsAccordions();
    initializeAssignmentDropdowns();
    initializeProfileActions();
    initializeSettingsControls();
    initializeUtilityActions();

    activateView(availableViewNames.indexOf(initialHashViewName) === -1 ? "home" : initialHashViewName);
    renderAll();
    startLiveSimulation();
  }

  initializeWatchTowerFrontend();
})();
