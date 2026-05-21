(function () {
  "use strict";

  var POLL_INTERVAL = 3000;
  var availableViewNames = ["home", "analytics", "settings"];
  var viewToggleElements = document.querySelectorAll("[data-view]");
  var timeRangeButtons = document.querySelectorAll(".segmented-control button");
  var settingsAccordionButtons = document.querySelectorAll(".settings-trigger");
  var highContrastToggle = document.getElementById("contrast-toggle");
  var textSizeSlider = document.getElementById("text-size");
  var darkModeToggle = document.getElementById("dark-mode-toggle");
  var refreshDashboardButton = document.getElementById("refresh-dashboard");
  var notificationModeSelect = document.getElementById("notification-mode");
  var notificationStartInput = document.getElementById("notification-start");
  var notificationEndInput = document.getElementById("notification-end");
  var notificationPreviewCopy = document.querySelector(".preview-copy");
  var notificationStatusLine = document.getElementById("notification-status-line");
  var snoozeActionButtons = document.querySelectorAll(".snooze-action");
  var issueExpandToggleButton = document.getElementById("issue-expand-toggle");
  var lastUpdatedLabel = document.getElementById("last-updated");
  var liveStatusPill = document.getElementById("live-status-pill");
  var liveStatusText = document.getElementById("live-status-text");
  var activeIssueCountLabel = document.getElementById("active-issues-count");
  var alertPillButton = document.querySelector(".alert-pill");
  var activeUsersValue = document.getElementById("active-users");
  var totalEventsValue = document.getElementById("total-events");
  var totalErrorsValue = document.getElementById("total-errors");
  var versionCountValue = document.getElementById("version-count");
  var sidebarErrorsValue = document.getElementById("sidebar-errors");
  var sidebarUsersValue = document.getElementById("sidebar-users");
  var sidebarEventsValue = document.getElementById("sidebar-events");
  var priorityListContainer = document.getElementById("priority-list");
  var issueListContainer = document.getElementById("issue-list");
  var serviceStackContainer = document.getElementById("service-stack");
  var featureHotspotsContainer = document.getElementById("build-metadata");
  var activityFeedContainer = document.getElementById("activity-feed");
  var userChartContainer = document.getElementById("user-chart");
  var purchaseChartContainer = document.getElementById("purchase-chart");
  var userDeltaBadge = document.getElementById("user-delta");
  var purchaseDeltaBadge = document.getElementById("purchase-delta");
  var latencyLine = document.getElementById("latency-line");
  var latencyLegend = document.getElementById("latency-legend");
  var latencyYAxis = document.getElementById("latency-y-axis");
  var latencyXAxis = document.getElementById("latency-x-axis");
  var ratingAverage = document.getElementById("rating-average");
  var ratingCaption = document.getElementById("rating-caption");
  var ratingBars = document.getElementById("rating-bars");
  var breakdownDonut = document.getElementById("breakdown-donut");
  var breakdownList = document.getElementById("breakdown-list");
  var analyticsRangeUsers = document.getElementById("analytics-range-users");
  var analyticsRangeActions = document.getElementById("analytics-range-actions");
  var analyticsRangeLatency = document.getElementById("analytics-range-latency");
  var displayNameInput = document.getElementById("display-name");
  var profileDisplayName = document.getElementById("profile-display-name");
  var profileStatusLine = document.getElementById("profile-status-line");
  var changePasswordButton = document.getElementById("change-password-button");
  var signOutButton = document.getElementById("sign-out-button");

  var notificationMutedUntil = 0;
  var PROFILE_STORAGE_KEY = "watchtower_profile_name";
  var ANALYTICS_RANGE_STORAGE_KEY = "watchtower_analytics_range";
  var THEME_STORAGE_KEY = "watchtower_theme_mode";
  var LIGHT_LOGO_PATH = "assets/watchtower-logo.png";
  var DARK_LOGO_PATH = "assets/watchtower-dark-logo.png";

  var uiState = {
    selectedRange: "24h",
    issuesExpanded: false,
    latestStats: null,
    latestEvents: [],
  };

  function escapeHtml(value) {
    var escapeElement = document.createElement("span");
    escapeElement.textContent = value == null ? "" : String(value);
    return escapeElement.innerHTML;
  }

  function getValidTimestamp(value) {
    var timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function formatClockTime(isoTimestamp) {
    return new Date(isoTimestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function setProfileStatus(message) {
    if (!profileStatusLine) return;
    profileStatusLine.textContent = message;
  }

  function formatNotificationTime(dateValue) {
    return dateValue.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function saveUiPreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_error) {
      // Ignore restricted browser storage environments.
    }
  }

  function loadUiPreference(key) {
    try {
      return localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function getActiveMuteMessage() {
    if (notificationMutedUntil && notificationMutedUntil > Date.now()) {
      return "Muted until " + formatNotificationTime(new Date(notificationMutedUntil)) + ".";
    }

    if (notificationModeSelect && notificationModeSelect.value === "Muted") {
      return "Muted until you resume notifications.";
    }

    return "Notifications are active.";
  }

  function updateNotificationStatusLine() {
    if (!notificationStatusLine) return;
    notificationStatusLine.textContent = getActiveMuteMessage();
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

  function scrollToTarget(targetId) {
    if (!targetId) return;
    var targetElement = document.getElementById(targetId);
    if (!targetElement) return;
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initializeViewNavigation() {
    viewToggleElements.forEach(function (viewToggleElement) {
      viewToggleElement.addEventListener("click", function (event) {
        var selectedViewName = viewToggleElement.getAttribute("data-view");
        var scrollTargetId = viewToggleElement.getAttribute("data-scroll-target");

        if (viewToggleElement.tagName === "A") event.preventDefault();
        activateView(selectedViewName);

        if (scrollTargetId) {
          setTimeout(function () {
            scrollToTarget(scrollTargetId);
          }, 140);
        }
      });
    });
  }

  function updateRangeButtonState() {
    timeRangeButtons.forEach(function (buttonElement) {
      buttonElement.classList.toggle("active", buttonElement.getAttribute("data-range") === uiState.selectedRange);
    });
  }

  function rerenderIfReady() {
    if (!uiState.latestStats) return;
    updateDashboardStats(uiState.latestStats, uiState.latestEvents);
  }

  function initializeTimeRangeButtons() {
    var savedRange = loadUiPreference(ANALYTICS_RANGE_STORAGE_KEY);
    if (savedRange === "24h" || savedRange === "7d" || savedRange === "30d") {
      uiState.selectedRange = savedRange;
    }

    updateRangeButtonState();

    timeRangeButtons.forEach(function (timeRangeButton) {
      timeRangeButton.addEventListener("click", function () {
        uiState.selectedRange = timeRangeButton.getAttribute("data-range") || "24h";
        saveUiPreference(ANALYTICS_RANGE_STORAGE_KEY, uiState.selectedRange);
        updateRangeButtonState();
        rerenderIfReady();
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

  function initializeIssueExpansionControls() {
    if (!issueExpandToggleButton) return;

    issueExpandToggleButton.addEventListener("click", function () {
      uiState.issuesExpanded = !uiState.issuesExpanded;
      rerenderIfReady();
    });
  }


  function applyThemeLogo(useDarkLogo) {
    var brandLogoElement = document.querySelector(".brand-logo");
    if (!brandLogoElement) return;
    brandLogoElement.setAttribute("src", useDarkLogo ? DARK_LOGO_PATH : LIGHT_LOGO_PATH);
  }

  function initializeDarkModeToggle() {

    var savedTheme = loadUiPreference(THEME_STORAGE_KEY);
    var isDarkMode = savedTheme === "dark";

    document.body.classList.toggle("dark-mode", isDarkMode);
    applyThemeLogo(isDarkMode);

    if (darkModeToggle) darkModeToggle.checked = isDarkMode;

    if (!darkModeToggle) return;

    darkModeToggle.addEventListener("change", function () {
      var shouldUseDarkMode = darkModeToggle.checked;
      document.body.classList.toggle("dark-mode", shouldUseDarkMode);
      applyThemeLogo(shouldUseDarkMode);
      saveUiPreference(THEME_STORAGE_KEY, shouldUseDarkMode ? "dark" : "light");
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

    var baseMessage =
      notificationModeSelect.value +
      " alerts run between " +
      notificationStartInput.value +
      " and " +
      notificationEndInput.value +
      ".";

    notificationPreviewCopy.textContent = baseMessage + " " + getActiveMuteMessage() + " Checkout error rate exceeded 2%.";
  }

  function initializeNotificationControls() {
    if (!notificationModeSelect || !notificationStartInput || !notificationEndInput) return;

    [notificationModeSelect, notificationStartInput, notificationEndInput].forEach(function (control) {
      control.addEventListener("change", function () {
        if (control === notificationModeSelect && notificationModeSelect.value !== "Muted") {
          notificationMutedUntil = 0;
        }
        updateNotificationStatusLine();
        updateNotificationPreview();
      });
      control.addEventListener("input", updateNotificationPreview);
    });

    snoozeActionButtons.forEach(function (buttonElement) {
      buttonElement.addEventListener("click", function () {
        var snoozeMinutes = Number(buttonElement.getAttribute("data-snooze") || 0);

        if (snoozeMinutes <= 0) {
          notificationMutedUntil = 0;
          notificationModeSelect.value = "Critical only";
        } else {
          notificationMutedUntil = Date.now() + snoozeMinutes * 60 * 1000;
          notificationModeSelect.value = "Muted";
        }

        updateNotificationStatusLine();
        updateNotificationPreview();
      });
    });

    updateNotificationStatusLine();
    updateNotificationPreview();
  }

  function initializeProfileControls() {
    if (!displayNameInput || !profileDisplayName) return;

    var savedName = loadUiPreference(PROFILE_STORAGE_KEY) || "";

    if (savedName) {
      displayNameInput.value = savedName;
      profileDisplayName.textContent = savedName;
    }

    function commitDisplayName() {
      var nextName = displayNameInput.value.trim() || "Aditya";
      displayNameInput.value = nextName;
      profileDisplayName.textContent = nextName;
      saveUiPreference(PROFILE_STORAGE_KEY, nextName);
      setProfileStatus("Display name updated.");
    }

    displayNameInput.addEventListener("change", commitDisplayName);
    displayNameInput.addEventListener("blur", commitDisplayName);

    if (changePasswordButton) {
      changePasswordButton.addEventListener("click", function () {
        setProfileStatus("Password flow is mocked in this prototype. Use your auth service in final build.");
      });
    }

    if (signOutButton) {
      signOutButton.addEventListener("click", function () {
        setProfileStatus("Signed out from this demo session.");
      });
    }
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

  function toIssueSeverity(eventRecord) {
    if (!eventRecord || !eventRecord.data || !eventRecord.data.message) return "critical";
    var message = String(eventRecord.data.message).toLowerCase();
    if (message.indexOf("timeout") !== -1 || message.indexOf("latency") !== -1) return "warning";
    return "critical";
  }

  function renderIssueList(recentErrors) {
    if (!issueListContainer) return;

    if (!recentErrors || recentErrors.length === 0) {
      issueListContainer.innerHTML = '<div class="empty-state compact">No issues yet. Open the monitored demo and generate a few test events.</div>';
      if (issueExpandToggleButton) {
        issueExpandToggleButton.hidden = true;
      }
      return;
    }

    var visibleCount = uiState.issuesExpanded ? recentErrors.length : Math.min(3, recentErrors.length);
    var hiddenCount = Math.max(0, recentErrors.length - visibleCount);

    issueListContainer.innerHTML = recentErrors.slice(0, visibleCount).map(function (eventRecord, index) {
      var severity = toIssueSeverity(eventRecord);
      var severityClass = severity === "warning" ? "severity-warning" : "severity-critical";
      var severityLabel = severity === "warning" ? "Warning" : "Critical";

      return (
        '<article class="issue-row ' + severityClass + '">' +
        '<div class="issue-main">' +
        '<span class="severity-pill">' + severityLabel + "</span>" +
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

    if (issueExpandToggleButton) {
      if (recentErrors.length <= 3) {
        issueExpandToggleButton.hidden = true;
      } else {
        issueExpandToggleButton.hidden = false;
        issueExpandToggleButton.textContent = uiState.issuesExpanded
          ? "Show fewer issues"
          : "Show " + hiddenCount + " more issue" + (hiddenCount === 1 ? "" : "s");
      }
    }
  }

  function renderServiceStatus(stats) {
    if (!serviceStackContainer) return;

    var routeNames = Object.keys(stats.latencyByRoute || {});
    var sortedRouteNames = routeNames.slice().sort(function (leftRoute, rightRoute) {
      return (stats.latencyByRoute[rightRoute].p95 || 0) - (stats.latencyByRoute[leftRoute].p95 || 0);
    });

    var hottestRouteName = sortedRouteNames[0] || "/";
    var hottestRoute = stats.latencyByRoute[hottestRouteName] || null;

    serviceStackContainer.innerHTML =
      '<div class="service-row">' +
      '<span class="service-dot good" aria-hidden="true"></span>' +
      "<div><strong>Frontend SDK</strong><span>" + stats.totalEvents + " events accepted</span></div>" +
      '<span class="service-state">Online</span>' +
      "</div>" +
      '<div class="service-row">' +
      '<span class="service-dot ' + (hottestRoute ? "warning" : "good") + '" aria-hidden="true"></span>' +
      "<div><strong>Hottest route</strong><span>" + (hottestRoute ? escapeHtml(hottestRouteName) + " at " + hottestRoute.p95 + " ms p95" : "Waiting for pageload samples") + "</span></div>" +
      '<span class="service-state">' + (hottestRoute ? "Watch" : "Online") + "</span>" +
      "</div>" +
      '<div class="service-row">' +
      '<span class="service-dot good" aria-hidden="true"></span>' +
      "<div><strong>Tracked routes</strong><span>" + routeNames.length + " routes observed</span></div>" +
      '<span class="service-state">Online</span>' +
      "</div>" +
      '<div class="service-row">' +
      '<span class="service-dot ' + (stats.totalErrors > 0 ? "danger" : "good") + '" aria-hidden="true"></span>' +
      "<div><strong>Alerts</strong><span>" + stats.totalErrors + " open errors</span></div>" +
      '<span class="service-state">' + (stats.totalErrors > 0 ? "Action" : "Quiet") + "</span>" +
      "</div>";
  }

  function deriveFeatureCounts(activityEvents) {
    var featureCounts = {};

    (activityEvents || []).forEach(function (eventRecord) {
      var featureName = "";

      if (eventRecord.type === "click") {
        featureName = (eventRecord.data && (eventRecord.data.text || eventRecord.data.target)) || "generic-click";
      } else if (eventRecord.type === "custom") {
        featureName = (eventRecord.data && eventRecord.data.name) || "custom-event";
      }

      featureName = String(featureName || "").trim();
      if (!featureName) return;

      featureCounts[featureName] = (featureCounts[featureName] || 0) + 1;
    });

    return Object.keys(featureCounts).map(function (featureName) {
      return { name: featureName, count: featureCounts[featureName] };
    }).sort(function (leftFeature, rightFeature) {
      return rightFeature.count - leftFeature.count;
    });
  }

  function renderFeatureHotspots(activityEvents) {
    if (!featureHotspotsContainer) return;

    var topFeatures = deriveFeatureCounts(activityEvents).slice(0, 4);

    if (topFeatures.length === 0) {
      featureHotspotsContainer.innerHTML =
        '<div><span>Feature</span><strong>Waiting for click/custom events</strong></div>' +
        '<div><span>How to test</span><strong>Use the demo app navigation and actions</strong></div>';
      return;
    }

    featureHotspotsContainer.innerHTML = topFeatures.map(function (featureRecord, index) {
      return (
        "<div>" +
        "<span>#" + (index + 1) + " clicked</span>" +
        "<strong>" + escapeHtml(featureRecord.name) + "</strong>" +
        "<span>" + featureRecord.count + " events</span>" +
        "</div>"
      );
    }).join("");
  }

  function renderActivityFeed(activityEvents) {
    if (!activityFeedContainer) return;

    if (!activityEvents || activityEvents.length === 0) {
      activityFeedContainer.innerHTML = '<li><span class="timeline-time">--:--</span><span class="timeline-copy">Waiting for events from the monitored app.</span></li>';
      return;
    }

    activityFeedContainer.innerHTML = activityEvents.slice(0, 8).map(function (eventRecord) {
      var activityMessage;

      switch (eventRecord.type) {
        case "error":
          activityMessage = "Error: " + (eventRecord.data.message || "Unknown error");
          break;
        case "feedback":
          activityMessage = "Feedback: " + ((eventRecord.data && eventRecord.data.message) || "User feedback received");
          break;
        case "click":
          activityMessage = "Click: " + ((eventRecord.data && (eventRecord.data.text || eventRecord.data.target)) || "UI interaction");
          break;
        case "pageload":
          activityMessage = (eventRecord.route || "/") + " loaded in " + eventRecord.data.duration + " ms";
          break;
        case "custom":
          activityMessage = "Custom: " + ((eventRecord.data && eventRecord.data.name) || "Custom event");
          break;
        case "login":
          activityMessage = "Login: " + ((eventRecord.data && eventRecord.data.userId) || "unknown user");
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

  function renderPrioritySnapshot(stats, events) {
    if (!priorityListContainer) return;

    var routeNames = Object.keys(stats.latencyByRoute || {});
    var slowestRouteName = routeNames.sort(function (leftRoute, rightRoute) {
      return (stats.latencyByRoute[rightRoute].p95 || 0) - (stats.latencyByRoute[leftRoute].p95 || 0);
    })[0];
    var slowestRoute = slowestRouteName ? stats.latencyByRoute[slowestRouteName] : null;

    var topFeature = deriveFeatureCounts(events || [])[0];
    var firstError = (stats.recentErrors || [])[0];

    var items = [];

    if (firstError) {
      items.push('<li><span aria-hidden="true">!</span> Critical error on ' + escapeHtml(firstError.route || "/") + ': ' + escapeHtml(firstError.data.message || "Unknown error") + "</li>");
    } else {
      items.push('<li><span aria-hidden="true">!</span> No recent critical errors reported.</li>');
    }

    if (slowestRoute) {
      items.push('<li><span aria-hidden="true">!</span> Latency hotspot: ' + escapeHtml(slowestRouteName) + " at " + slowestRoute.p95 + " ms p95</li>");
    } else {
      items.push('<li><span aria-hidden="true">!</span> Waiting for pageload events to compute latency hotspots.</li>');
    }

    if (topFeature) {
      items.push('<li><span aria-hidden="true">!</span> Most-clicked feature right now: ' + escapeHtml(topFeature.name) + " (" + topFeature.count + " events)</li>");
    } else {
      items.push('<li><span aria-hidden="true">!</span> No click/custom activity yet. Use the demo app to generate behavior data.</li>');
    }

    priorityListContainer.innerHTML = items.join("");
  }

  function renderBarChart(chartContainer, labels, values, highlightedIndex) {
    if (!chartContainer) return;

    var maxValue = Math.max.apply(null, values.concat([1]));
    var denseClass = labels.length > 7 ? " dense" : "";
    var hasSignal = values.some(function (value) { return value > 0; });

    chartContainer.classList.toggle("dense", labels.length > 7);
    chartContainer.classList.toggle("is-empty", !hasSignal);
    chartContainer.style.setProperty("--bar-count", String(labels.length || 1));
    chartContainer.innerHTML = labels.map(function (label, index) {
      var value = Number(values[index] || 0);
      var percentage = Math.round((value / maxValue) * 100);
      var displayPercentage = hasSignal
        ? (value > 0 ? Math.max(percentage, 10) : 0)
        : 10;
      var highlightClass = index === highlightedIndex ? " highlight" : "";
      var tooltip = value + " at " + label;
      return (
        '<div class="bar' + highlightClass + denseClass + '" style="--bar-height: ' + displayPercentage + '%" data-value="' + escapeHtml(String(value)) + '" title="' + escapeHtml(tooltip) + '" aria-label="' + escapeHtml(tooltip) + '">' +
        '<i class="bar-fill" aria-hidden="true"></i>' +
        "<span>" + escapeHtml(label) + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function calculatePercentile(values, percentile) {
    if (!values || values.length === 0) return 0;

    var sorted = values.slice().sort(function (left, right) { return left - right; });
    var boundedPercentile = Math.min(Math.max(percentile, 0), 100);
    var position = (boundedPercentile / 100) * (sorted.length - 1);
    var lowerIndex = Math.floor(position);
    var upperIndex = Math.ceil(position);
    var lowerValue = sorted[lowerIndex];
    var upperValue = sorted[upperIndex];

    if (lowerIndex === upperIndex) return lowerValue;
    return lowerValue + (upperValue - lowerValue) * (position - lowerIndex);
  }

  function getRangeConfiguration(rangeName) {
    if (rangeName === "7d") {
      return {
        rangeMs: 7 * 24 * 60 * 60 * 1000,
        bucketMs: 24 * 60 * 60 * 1000,
        bucketCount: 7,
        labelFormat: { month: "numeric", day: "numeric" },
      };
    }

    if (rangeName === "30d") {
      return {
        rangeMs: 30 * 24 * 60 * 60 * 1000,
        bucketMs: 3 * 24 * 60 * 60 * 1000,
        bucketCount: 10,
        labelFormat: { month: "numeric", day: "numeric" },
      };
    }

    return {
      rangeMs: 24 * 60 * 60 * 1000,
      bucketMs: 2 * 60 * 60 * 1000,
      bucketCount: 12,
      labelFormat: { hour: "numeric" },
    };
  }

  function getEventsInSelectedRange(events, rangeName) {
    var configuration = getRangeConfiguration(rangeName);
    var now = Date.now();
    var minTimestamp = now - configuration.rangeMs;

    return (events || []).filter(function (eventRecord) {
      var eventTimestamp = getValidTimestamp(eventRecord.timestamp);
      return eventTimestamp !== null && eventTimestamp >= minTimestamp && eventTimestamp <= now;
    });
  }

  function buildRangeSeries(events, rangeName) {
    var configuration = getRangeConfiguration(rangeName);
    var now = Date.now();
    var rangeStart = now - configuration.bucketMs * configuration.bucketCount;
    var buckets = [];

    for (var bucketIndex = 0; bucketIndex < configuration.bucketCount; bucketIndex += 1) {
      buckets.push({
        sessions: new Set(),
        actions: 0,
      });
    }

    (events || []).forEach(function (eventRecord) {
      var eventTimestamp = getValidTimestamp(eventRecord.timestamp);
      if (eventTimestamp === null || eventTimestamp < rangeStart || eventTimestamp > now) return;

      var targetBucketIndex = Math.floor((eventTimestamp - rangeStart) / configuration.bucketMs);
      if (targetBucketIndex < 0 || targetBucketIndex >= buckets.length) return;

      if (eventRecord.sessionId) buckets[targetBucketIndex].sessions.add(eventRecord.sessionId);

      if (
        eventRecord.type === "click" ||
        eventRecord.type === "custom" ||
        eventRecord.type === "feedback" ||
        eventRecord.type === "login"
      ) {
        buckets[targetBucketIndex].actions += 1;
      }
    });

    var labels = buckets.map(function (_, index) {
      var labelDate = new Date(rangeStart + (index + 1) * configuration.bucketMs);
      return labelDate.toLocaleString([], configuration.labelFormat);
    });

    var users = buckets.map(function (bucket) { return bucket.sessions.size; });
    var actions = buckets.map(function (bucket) { return bucket.actions; });

    return {
      labels: labels,
      users: users,
      actions: actions,
    };
  }

  function buildLatencySummaryFromEvents(events, rangeName) {
    var filteredEvents = getEventsInSelectedRange(events, rangeName);
    var routeBuckets = {};

    filteredEvents.forEach(function (eventRecord) {
      if (eventRecord.type !== "pageload") return;
      if (!eventRecord.data || typeof eventRecord.data.duration !== "number") return;

      var routeName = eventRecord.route || "/";
      if (!routeBuckets[routeName]) routeBuckets[routeName] = [];
      routeBuckets[routeName].push({
        duration: eventRecord.data.duration,
        timestamp: eventRecord.timestamp,
      });
    });

    return Object.keys(routeBuckets).reduce(function (summary, routeName) {
      var points = routeBuckets[routeName].sort(function (leftPoint, rightPoint) {
        return getValidTimestamp(leftPoint.timestamp) - getValidTimestamp(rightPoint.timestamp);
      });

      summary[routeName] = {
        points: points,
        p95: Math.round(calculatePercentile(points.map(function (point) { return point.duration; }), 95)),
      };

      return summary;
    }, {});
  }

  function renderLatencyChart(latencyByRoute) {
    if (!latencyLine || !latencyLegend) return;

    var routeNames = Object.keys(latencyByRoute || {});
    if (routeNames.length === 0) {
      latencyLine.setAttribute("d", "M60 240 L610 240");
      if (latencyYAxis) latencyYAxis.innerHTML = "";
      if (latencyXAxis) latencyXAxis.innerHTML = "";
      latencyLegend.innerHTML = '<span><i class="legend-swatch checkout"></i>Waiting for pageload samples</span>';
      return;
    }

    var primaryRouteName = routeNames.sort(function (leftRoute, rightRoute) {
      return (latencyByRoute[rightRoute].p95 || 0) - (latencyByRoute[leftRoute].p95 || 0);
    })[0];
    var routeStats = latencyByRoute[primaryRouteName];
    var points = (routeStats.points || []).slice(-12);

    if (points.length === 0) {
      latencyLine.setAttribute("d", "M60 240 L610 240");
      if (latencyYAxis) latencyYAxis.innerHTML = "";
      if (latencyXAxis) latencyXAxis.innerHTML = "";
      latencyLegend.innerHTML = '<span><i class="legend-swatch checkout"></i>' + escapeHtml(primaryRouteName) + ' has no data points</span>';
      return;
    }

    var maxDuration = Math.max.apply(null, points.map(function (point) { return point.duration; }).concat([1]));
    var yTop = 40;
    var yBottom = 240;
    var xLeft = 60;
    var xRight = 610;
    var ySpan = yBottom - yTop;
    var xSpan = xRight - xLeft;

    var pathCommand = points.map(function (point, index) {
      var x = xLeft + ((xSpan * index) / Math.max(points.length - 1, 1));
      var y = yBottom - ((ySpan * point.duration) / maxDuration);
      return (index === 0 ? "M" : "L") + x + " " + y;
    }).join(" ");

    latencyLine.setAttribute("d", pathCommand);

    if (latencyYAxis) {
      var yTicks = [0, 0.25, 0.5, 0.75, 1];
      latencyYAxis.innerHTML = yTicks.map(function (ratio) {
        var y = yBottom - ySpan * ratio;
        var value = Math.round(maxDuration * ratio);
        return '<text x="52" y="' + y + '" dominant-baseline="middle">' + value + 'ms</text>';
      }).join("");
    }

    if (latencyXAxis) {
      var labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];
      latencyXAxis.innerHTML = labelIndexes.map(function (pointIndex) {
        var point = points[pointIndex];
        var x = xLeft + ((xSpan * pointIndex) / Math.max(points.length - 1, 1));
        var label = point ? formatClockTime(point.timestamp) : "";
        return '<text x="' + x + '" y="262" dominant-baseline="hanging">' + escapeHtml(label) + '</text>';
      }).join("");
    }

    latencyLegend.innerHTML =
      '<span><i class="legend-swatch checkout"></i>' +
      escapeHtml(primaryRouteName) +
      ' latest ' +
      points[points.length - 1].duration +
      ' ms, p95 ' +
      routeStats.p95 +
      ' ms</span>';
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

  function renderAnalyticsSummary(eventsInRange, latencySummary) {
    if (analyticsRangeUsers) {
      var usersSet = new Set();
      eventsInRange.forEach(function (eventRecord) {
        if (eventRecord.sessionId) usersSet.add(eventRecord.sessionId);
      });
      analyticsRangeUsers.textContent = String(usersSet.size);
    }

    if (analyticsRangeActions) {
      var actions = eventsInRange.filter(function (eventRecord) {
        return eventRecord.type === "click" || eventRecord.type === "custom" || eventRecord.type === "feedback";
      }).length;
      analyticsRangeActions.textContent = String(actions);
    }

    if (analyticsRangeLatency) {
      var routeNames = Object.keys(latencySummary || {});
      if (routeNames.length === 0) {
        analyticsRangeLatency.textContent = "0 ms";
      } else {
        var peakP95 = routeNames.reduce(function (runningPeak, routeName) {
          return Math.max(runningPeak, latencySummary[routeName].p95 || 0);
        }, 0);
        analyticsRangeLatency.textContent = peakP95 + " ms";
      }
    }
  }

  function renderAnalyticsPanels(stats, events) {
    var analytics = stats.analytics || {};
    var rangeSeries = buildRangeSeries(events, uiState.selectedRange);
    var rangeLatencySummary = buildLatencySummaryFromEvents(events, uiState.selectedRange);
    var rangeEvents = getEventsInSelectedRange(events, uiState.selectedRange);

    renderBarChart(userChartContainer, rangeSeries.labels, rangeSeries.users, rangeSeries.users.length - 1);
    renderBarChart(purchaseChartContainer, rangeSeries.labels, rangeSeries.actions, rangeSeries.actions.length - 1);
    renderLatencyChart(Object.keys(rangeLatencySummary).length > 0 ? rangeLatencySummary : (stats.latencyByRoute || {}));
    renderFeedbackPanel({
      feedbackAverage: analytics.feedbackAverage || 0,
      feedbackTotal: analytics.feedbackTotal || 0,
      feedbackBreakdown: analytics.feedbackBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
    renderBreakdownPanel({
      breakdownCounts: analytics.breakdownCounts || { performance: 0, errors: 0, feedback: 0, clicks: 0 },
    });
    renderAnalyticsSummary(rangeEvents, rangeLatencySummary);

    if (userDeltaBadge) {
      userDeltaBadge.textContent = rangeSeries.users.reduce(function (maxValue, value) {
        return Math.max(maxValue, value);
      }, 0) + " peak";
    }
    if (purchaseDeltaBadge) {
      var totalActions = rangeSeries.actions.reduce(function (sum, value) {
        return sum + value;
      }, 0);
      purchaseDeltaBadge.textContent = totalActions + " actions";
    }
  }

  function updateDashboardStats(stats, events) {
    var resolvedEvents = Array.isArray(events) && events.length > 0 ? events : (stats.recentActivity || []);

    uiState.latestStats = stats;
    uiState.latestEvents = resolvedEvents;

    if (activeUsersValue) activeUsersValue.textContent = String(stats.activeUsers || 0);
    if (totalEventsValue) totalEventsValue.textContent = String(stats.totalEvents || 0);
    if (totalErrorsValue) totalErrorsValue.textContent = String(stats.totalErrors || 0);
    if (versionCountValue) versionCountValue.textContent = String(Object.keys(stats.errorsByVersion || {}).length);
    if (sidebarErrorsValue) sidebarErrorsValue.textContent = String(stats.totalErrors || 0);
    if (sidebarUsersValue) sidebarUsersValue.textContent = String(stats.activeUsers || 0);
    if (sidebarEventsValue) sidebarEventsValue.textContent = String(stats.totalEvents || 0);

    if (activeIssueCountLabel) {
      var issueCount = Number(stats.totalErrors || 0);
      activeIssueCountLabel.textContent = issueCount + (issueCount === 1 ? " active issue" : " active issues");
      if (alertPillButton) alertPillButton.classList.toggle("quiet", issueCount === 0);
    }

    renderPrioritySnapshot(stats, resolvedEvents);
    renderIssueList(stats.recentErrors || []);
    renderServiceStatus(stats);
    renderFeatureHotspots(resolvedEvents);
    renderActivityFeed(resolvedEvents);
    renderAnalyticsPanels(stats, resolvedEvents);
    setLastUpdated(new Date().toISOString());
  }

  function fetchDashboardStats() {
    return Promise.all([
      fetch("/api/stats").then(function (response) { return response.json(); }),
      fetch("/api/events?limit=600")
        .then(function (response) { return response.json(); })
        .then(function (payload) { return Array.isArray(payload.events) ? payload.events : []; })
        .catch(function () { return []; }),
    ])
      .then(function (results) {
        var stats = results[0];
        var events = results[1];
        updateDashboardStats(stats, events);
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
    initializeIssueExpansionControls();
    initializeDarkModeToggle();
    initializeContrastToggle();
    initializeTextSizeSlider();
    initializeNotificationControls();
    initializeProfileControls();
    initializeManualRefresh();
    initializeLiveEventStream();
    activateView(availableViewNames.indexOf(initialHashViewName) === -1 ? "home" : initialHashViewName);
    fetchDashboardStats();
    setInterval(fetchDashboardStats, POLL_INTERVAL);
  }

  initializeWatchTowerFrontend();
})();
