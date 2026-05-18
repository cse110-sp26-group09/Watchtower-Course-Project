(function () {
  "use strict";

  var POLL_INTERVAL = 3000;
  var availableViewNames = ["home", "analytics", "settings"];
  var viewToggleElements = document.querySelectorAll("[data-view]");
  var timeRangeButtons = document.querySelectorAll(".segmented-control button");
  var settingsAccordionButtons = document.querySelectorAll(".settings-trigger");
  var highContrastToggle = document.getElementById("contrast-toggle");
  var textSizeSlider = document.getElementById("text-size");
  var refreshDashboardButton = document.getElementById("refresh-dashboard");
  var notificationModeSelect = document.getElementById("notification-mode");
  var notificationStartInput = document.getElementById("notification-start");
  var notificationEndInput = document.getElementById("notification-end");
  var notificationPreviewCopy = document.querySelector(".preview-copy");
  var lastUpdatedLabel = document.getElementById("last-updated");
  var liveStatusPill = document.getElementById("live-status-pill");
  var liveStatusText = document.getElementById("live-status-text");
  var activeUsersValue = document.getElementById("active-users");
  var totalEventsValue = document.getElementById("total-events");
  var totalErrorsValue = document.getElementById("total-errors");
  var versionCountValue = document.getElementById("version-count");
  var issueListContainer = document.getElementById("issue-list");
  var serviceStackContainer = document.getElementById("service-stack");
  var buildMetadataContainer = document.getElementById("build-metadata");
  var activityFeedContainer = document.getElementById("activity-feed");
  var userChartContainer = document.getElementById("user-chart");
  var purchaseChartContainer = document.getElementById("purchase-chart");
  var userDeltaBadge = document.getElementById("user-delta");
  var purchaseDeltaBadge = document.getElementById("purchase-delta");
  var latencyLine = document.getElementById("latency-line");
  var latencyLegend = document.getElementById("latency-legend");
  var ratingAverage = document.getElementById("rating-average");
  var ratingCaption = document.getElementById("rating-caption");
  var ratingBars = document.getElementById("rating-bars");
  var breakdownDonut = document.getElementById("breakdown-donut");
  var breakdownList = document.getElementById("breakdown-list");

  function escapeHtml(value) {
    var escapeElement = document.createElement("span");
    escapeElement.textContent = value == null ? "" : String(value);
    return escapeElement.innerHTML;
  }

  function formatClockTime(isoTimestamp) {
    return new Date(isoTimestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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

  function initializeViewNavigation() {
    viewToggleElements.forEach(function (viewToggleElement) {
      viewToggleElement.addEventListener("click", function (event) {
        var selectedViewName = viewToggleElement.getAttribute("data-view");
        if (viewToggleElement.tagName === "A") event.preventDefault();
        activateView(selectedViewName);
      });
    });
  }

  function initializeTimeRangeButtons() {
    timeRangeButtons.forEach(function (timeRangeButton) {
      timeRangeButton.addEventListener("click", function () {
        timeRangeButtons.forEach(function (buttonElement) {
          buttonElement.classList.toggle("active", buttonElement === timeRangeButton);
        });
      });
    });
  }

  function initializeSettingsAccordions() {
    settingsAccordionButtons.forEach(function (accordionButton) {
      accordionButton.addEventListener("click", function () {
        var parentSettingsSection = accordionButton.closest(".settings-section");
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

  function initializeIssueAssignmentDelegation() {
    if (!issueListContainer) return;

    issueListContainer.addEventListener("change", function (event) {
      var assignmentSelect = event.target.closest("select");
      var issueHeading = assignmentSelect ? assignmentSelect.closest(".issue-row").querySelector("h3") : null;
      if (!issueHeading) return;
      issueHeading.textContent = issueHeading.textContent.replace(/\s+\(assigned\)$/i, "") + " (assigned)";
    });
  }

  function initializeContrastToggle() {
    if (!highContrastToggle) return;

    highContrastToggle.addEventListener("change", function () {
      document.body.classList.toggle("high-contrast", highContrastToggle.checked);
    });
  }

  function initializeTextSizeSlider() {
    if (!textSizeSlider) return;

    textSizeSlider.addEventListener("input", function () {
      document.body.classList.remove("text-compact", "text-large");
      if (textSizeSlider.value === "0") document.body.classList.add("text-compact");
      if (textSizeSlider.value === "2") document.body.classList.add("text-large");
    });
  }

  function updateNotificationPreview() {
    if (!notificationPreviewCopy || !notificationModeSelect || !notificationStartInput || !notificationEndInput) return;

    notificationPreviewCopy.textContent =
      notificationModeSelect.value +
      " alerts will be sent between " +
      notificationStartInput.value +
      " and " +
      notificationEndInput.value +
      ". Checkout error rate exceeded 2% on v1.2.0-beta.";
  }

  function initializeNotificationControls() {
    if (!notificationModeSelect || !notificationStartInput || !notificationEndInput) return;

    [notificationModeSelect, notificationStartInput, notificationEndInput].forEach(function (control) {
      control.addEventListener("change", updateNotificationPreview);
      control.addEventListener("input", updateNotificationPreview);
    });

    updateNotificationPreview();
  }

  function setLiveConnectionState(isConnected) {
    if (!liveStatusPill || !liveStatusText) return;
    liveStatusPill.classList.toggle("offline", !isConnected);
    liveStatusText.textContent = isConnected ? "Live" : "Reconnecting";
  }

  function setLastUpdated(timestamp) {
    if (!lastUpdatedLabel) return;
    lastUpdatedLabel.textContent = "Updated " + formatClockTime(timestamp);
  }

  function renderIssueList(recentErrors) {
    if (!issueListContainer) return;

    if (!recentErrors || recentErrors.length === 0) {
      issueListContainer.innerHTML = '<div class="empty-state compact">No issues yet. Open the monitored demo and generate a few test events.</div>';
      return;
    }

    issueListContainer.innerHTML = recentErrors.slice(0, 3).map(function (eventRecord, index) {
      return (
        '<article class="issue-row severity-critical">' +
        '<div class="issue-main">' +
        '<span class="severity-pill">Critical</span>' +
        "<h3>" + escapeHtml(eventRecord.data.message || "Unknown error") + "</h3>" +
        "<p>" + escapeHtml(eventRecord.route || "/") + " emitted an error event.</p>" +
        '<div class="issue-meta">' +
        "<span>" + escapeHtml(eventRecord.deployVersion || "unknown") + "</span>" +
        "<span>" + escapeHtml(eventRecord.appName || "candidate_1_demo") + "</span>" +
        "<span>" + escapeHtml(formatClockTime(eventRecord.timestamp)) + "</span>" +
        "</div>" +
        "</div>" +
        '<label class="assign-control">' +
        "<span>Assign</span>" +
        '<select aria-label="Assign issue ' + (index + 1) + '">' +
        "<option>Priya</option>" +
        "<option>James</option>" +
        "<option>Aditya</option>" +
        "<option>Hieu</option>" +
        "</select>" +
        "</label>" +
        "</article>"
      );
    }).join("");
  }

  function renderServiceStatus(stats) {
    if (!serviceStackContainer) return;

    var routeNames = Object.keys(stats.latencyByRoute || {});
    var primaryRouteName = routeNames[0] || "/";
    var primaryLatency = stats.latencyByRoute[primaryRouteName] || null;

    serviceStackContainer.innerHTML =
      '<div class="service-row">' +
      '<span class="service-dot good" aria-hidden="true"></span>' +
      "<div><strong>Frontend SDK</strong><span>" + stats.totalEvents + " events accepted</span></div>" +
      '<span class="service-state">Online</span>' +
      "</div>" +
      '<div class="service-row">' +
      '<span class="service-dot ' + (primaryLatency ? "warning" : "good") + '" aria-hidden="true"></span>' +
      "<div><strong>Ingestion API</strong><span>" + (primaryLatency ? primaryLatency.p95 + " ms p95" : "Waiting for pageload samples") + "</span></div>" +
      '<span class="service-state">' + (primaryLatency ? "Watch" : "Online") + "</span>" +
      "</div>" +
      '<div class="service-row">' +
      '<span class="service-dot good" aria-hidden="true"></span>' +
      "<div><strong>Tracked routes</strong><span>" + routeNames.length + " routes observed</span></div>" +
      '<span class="service-state">Online</span>' +
      "</div>" +
      '<div class="service-row">' +
      '<span class="service-dot ' + (stats.totalErrors > 0 ? "danger" : "good") + '" aria-hidden="true"></span>' +
      "<div><strong>Alerts</strong><span>" + stats.totalErrors + " recent errors</span></div>" +
      '<span class="service-state">' + (stats.totalErrors > 0 ? "Action" : "Quiet") + "</span>" +
      "</div>";
  }

  function renderBuildMetadata(activityEvents) {
    if (!buildMetadataContainer) return;

    var latestEvent = activityEvents && activityEvents.length > 0 ? activityEvents[0] : null;

    buildMetadataContainer.innerHTML =
      "<div><span>Build ID</span><strong>" + escapeHtml("candidate-1-" + (latestEvent ? latestEvent.deployVersion || "unknown" : "unknown")) + "</strong></div>" +
      "<div><span>App</span><strong>" + escapeHtml(latestEvent ? latestEvent.appName || "candidate_1_demo" : "candidate_1_demo") + "</strong></div>" +
      "<div><span>Latest route</span><strong>" + escapeHtml(latestEvent ? latestEvent.route || "/" : "/") + "</strong></div>" +
      "<div><span>Latest event</span><strong>" + escapeHtml(latestEvent ? formatClockTime(latestEvent.timestamp) : "Waiting") + "</strong></div>";
  }

  function renderActivityFeed(activityEvents) {
    if (!activityFeedContainer) return;

    if (!activityEvents || activityEvents.length === 0) {
      activityFeedContainer.innerHTML = '<li><span class="timeline-time">--:--</span><span class="timeline-copy">Waiting for events from the Candidate 1 demo app.</span></li>';
      return;
    }

    activityFeedContainer.innerHTML = activityEvents.slice(0, 6).map(function (eventRecord) {
      var activityMessage;

      switch (eventRecord.type) {
        case "error":
          activityMessage = eventRecord.data.message || "Unknown error";
          break;
        case "login":
          activityMessage = "User logged in: " + (eventRecord.data.userId || "unknown");
          break;
        case "pageload":
          activityMessage = (eventRecord.route || "/") + " loaded in " + eventRecord.data.duration + " ms";
          break;
        case "custom":
          activityMessage = eventRecord.data.name || "Custom event";
          break;
        case "feedback":
          activityMessage = eventRecord.data.message || "Feedback received";
          break;
        default:
          activityMessage = eventRecord.type;
      }

      return (
        "<li>" +
        '<span class="timeline-time">' + escapeHtml(formatClockTime(eventRecord.timestamp)) + "</span>" +
        '<span class="timeline-copy">' + escapeHtml(activityMessage) + "</span>" +
        "</li>"
      );
    }).join("");
  }

  function renderBarChart(chartContainer, labels, values, highlightedIndex) {
    if (!chartContainer) return;

    var maxValue = Math.max.apply(null, values.concat([1]));
    chartContainer.innerHTML = labels.map(function (label, index) {
      var percentage = Math.round((values[index] / maxValue) * 100);
      var highlightClass = index === highlightedIndex ? " highlight" : "";
      return (
        '<div class="bar' + highlightClass + '" style="--bar-height: ' + percentage + '%">' +
        "<span>" + escapeHtml(label) + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function renderLatencyChart(latencyByRoute) {
    if (!latencyLine || !latencyLegend) return;

    var routeNames = Object.keys(latencyByRoute || {});
    if (routeNames.length === 0) {
      latencyLine.setAttribute("d", "M60 240 L610 240");
      latencyLegend.innerHTML = '<span><i class="legend-swatch checkout"></i>Waiting for pageload samples</span>';
      return;
    }

    var primaryRouteName = routeNames[0];
    var routeStats = latencyByRoute[primaryRouteName];
    var points = routeStats.points || [];

    if (points.length === 0) {
      latencyLine.setAttribute("d", "M60 240 L610 240");
      latencyLegend.innerHTML = '<span><i class="legend-swatch checkout"></i>' + escapeHtml(primaryRouteName) + " has no data points</span>";
      return;
    }

    var maxDuration = Math.max.apply(null, points.map(function (point) { return point.duration; }).concat([1]));
    var pathCommand = points.map(function (point, index) {
      var x = 60 + ((550 * index) / Math.max(points.length - 1, 1));
      var y = 240 - ((180 * point.duration) / maxDuration);
      return (index === 0 ? "M" : "L") + x + " " + y;
    }).join(" ");

    latencyLine.setAttribute("d", pathCommand);
    latencyLegend.innerHTML =
      '<span><i class="legend-swatch checkout"></i>' +
      escapeHtml(primaryRouteName) +
      " latest " +
      points[points.length - 1].duration +
      " ms, p95 " +
      routeStats.p95 +
      " ms</span>";
  }

  function renderFeedbackPanel(analytics) {
    if (!ratingAverage || !ratingCaption || !ratingBars) return;

    ratingAverage.textContent = analytics.feedbackAverage.toFixed(1);
    ratingCaption.textContent = analytics.feedbackTotal + " feedback events";
    ratingBars.innerHTML = [5, 4, 3, 2, 1].map(function (rating) {
      var count = analytics.feedbackBreakdown[rating] || 0;
      var width = analytics.feedbackTotal === 0 ? 0 : Math.round((count / analytics.feedbackTotal) * 100);
      return '<span style="--rating-width: ' + width + '%">' + rating + " stars</span>";
    }).join("");
  }

  function renderBreakdownPanel(analytics) {
    if (!breakdownDonut || !breakdownList) return;

    var counts = analytics.breakdownCounts || {
      performance: 0,
      errors: 0,
      feedback: 0,
      clicks: 0,
    };
    var totalCount = counts.performance + counts.errors + counts.feedback + counts.clicks;
    var performancePct = totalCount === 0 ? 0 : Math.round((counts.performance / totalCount) * 100);
    var errorsPct = totalCount === 0 ? 0 : Math.round((counts.errors / totalCount) * 100);
    var feedbackPct = totalCount === 0 ? 0 : Math.round((counts.feedback / totalCount) * 100);
    var clicksPct = totalCount === 0 ? 0 : Math.max(0, 100 - performancePct - errorsPct - feedbackPct);

    breakdownDonut.style.background =
      "conic-gradient(" +
      "var(--teal) 0 " + performancePct + "%, " +
      "var(--coral) " + performancePct + "% " + (performancePct + errorsPct) + "%, " +
      "var(--amber) " + (performancePct + errorsPct) + "% " + (performancePct + errorsPct + feedbackPct) + "%, " +
      "var(--blue) " + (performancePct + errorsPct + feedbackPct) + "% 100%)";

    breakdownList.innerHTML =
      '<li><span class="legend-dot teal"></span>Performance <strong>' + performancePct + "%</strong></li>" +
      '<li><span class="legend-dot coral"></span>Errors <strong>' + errorsPct + "%</strong></li>" +
      '<li><span class="legend-dot amber"></span>Feedback <strong>' + feedbackPct + "%</strong></li>" +
      '<li><span class="legend-dot blue"></span>Clicks <strong>' + clicksPct + "%</strong></li>";
  }

  function renderAnalyticsPanels(stats) {
    var analytics = stats.analytics || {};
    var userSeries = analytics.userSeries || { labels: ["1", "2", "3", "4", "5", "6", "7"], values: [0, 0, 0, 0, 0, 0, 0] };
    var activitySeries = analytics.activitySeries || { labels: ["1", "2", "3", "4", "5", "6", "7"], values: [0, 0, 0, 0, 0, 0, 0] };

    renderBarChart(userChartContainer, userSeries.labels, userSeries.values, userSeries.values.length - 1);
    renderBarChart(purchaseChartContainer, activitySeries.labels, activitySeries.values, activitySeries.values.length - 1);
    renderLatencyChart(stats.latencyByRoute || {});
    renderFeedbackPanel({
      feedbackAverage: analytics.feedbackAverage || 0,
      feedbackTotal: analytics.feedbackTotal || 0,
      feedbackBreakdown: analytics.feedbackBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
    renderBreakdownPanel({
      breakdownCounts: analytics.breakdownCounts || { performance: 0, errors: 0, feedback: 0, clicks: 0 },
    });

    if (userDeltaBadge) {
      userDeltaBadge.textContent = (stats.activeUsers || 0) + " active";
    }
    if (purchaseDeltaBadge) {
      purchaseDeltaBadge.textContent = (analytics.customActivityTotal || 0) + " actions";
    }
  }

  function updateDashboardStats(stats) {
    if (activeUsersValue) activeUsersValue.textContent = String(stats.activeUsers || 0);
    if (totalEventsValue) totalEventsValue.textContent = String(stats.totalEvents || 0);
    if (totalErrorsValue) totalErrorsValue.textContent = String(stats.totalErrors || 0);
    if (versionCountValue) versionCountValue.textContent = String(Object.keys(stats.errorsByVersion || {}).length);

    renderIssueList(stats.recentErrors || []);
    renderServiceStatus(stats);
    renderBuildMetadata(stats.recentActivity || []);
    renderActivityFeed(stats.recentActivity || []);
    renderAnalyticsPanels(stats);
    setLastUpdated(new Date().toISOString());
  }

  function fetchDashboardStats() {
    return fetch("/api/stats")
      .then(function (response) { return response.json(); })
      .then(function (stats) {
        updateDashboardStats(stats);
        setLiveConnectionState(true);
      })
      .catch(function () {
        setLiveConnectionState(false);
      });
  }

  function initializeLiveEventStream() {
    if (typeof EventSource === "undefined") return;

    var eventSource = new EventSource("/api/events/stream");

    eventSource.onopen = function () {
      setLiveConnectionState(true);
    };

    eventSource.onmessage = function () {
      setLiveConnectionState(true);
      fetchDashboardStats();
    };

    eventSource.onerror = function () {
      setLiveConnectionState(false);
    };
  }

  function initializeManualRefresh() {
    if (!refreshDashboardButton) return;

    refreshDashboardButton.addEventListener("click", function () {
      fetchDashboardStats();
    });
  }

  function initializeWatchTowerFrontend() {
    var initialHashViewName = window.location.hash.replace("#", "");

    initializeViewNavigation();
    initializeTimeRangeButtons();
    initializeSettingsAccordions();
    initializeIssueAssignmentDelegation();
    initializeContrastToggle();
    initializeTextSizeSlider();
    initializeNotificationControls();
    initializeManualRefresh();
    initializeLiveEventStream();
    activateView(availableViewNames.indexOf(initialHashViewName) === -1 ? "home" : initialHashViewName);
    fetchDashboardStats();
    setInterval(fetchDashboardStats, POLL_INTERVAL);
  }

  initializeWatchTowerFrontend();
})();
