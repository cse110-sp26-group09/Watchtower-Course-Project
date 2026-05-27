(function () {
  "use strict";

  let POLL_INTERVAL = 3000;
  let availableViewNames = ["home", "issues", "health", "analytics", "settings"];
  let viewToggleElements = document.querySelectorAll("[data-view]");
  let timeRangeButtons = document.querySelectorAll(".segmented-control button");
  let settingsAccordionButtons = document.querySelectorAll(".settings-trigger");
  let highContrastToggle = document.getElementById("contrast-toggle");
  let textSizeSlider = document.getElementById("text-size");
  let darkModeToggle = document.getElementById("dark-mode-toggle");
  let dashboardModeSelect = document.getElementById("dashboard-mode-select");
  let dashboardModePill = document.getElementById("dashboard-mode-pill");
  let refreshDashboardButton = document.getElementById("refresh-dashboard");
  let notificationModeSelect = document.getElementById("notification-mode");
  let notificationStartInput = document.getElementById("notification-start");
  let notificationEndInput = document.getElementById("notification-end");
  let notificationPreviewCopy = document.querySelector(".preview-copy");
  let notificationStatusLine = document.getElementById("notification-status-line");
  let snoozeActionButtons = document.querySelectorAll(".snooze-action");
  let issueExpandToggleButton = document.getElementById("issue-expand-toggle");
  let issueSortFieldSelect = document.getElementById("issue-sort-field");
  let issueSortDirectionSelect = document.getElementById("issue-sort-direction");
  let issueFilterSeveritySelect = document.getElementById("issue-filter-severity");
  let issueFilterVersionInput = document.getElementById("issue-filter-version");
  let issueFilterAppInput = document.getElementById("issue-filter-app");
  let issueFilterRouteInput = document.getElementById("issue-filter-route");
  let issueFilterClearButton = document.getElementById("issue-filter-clear");
  let lastUpdatedLabel = document.getElementById("last-updated");
  let liveStatusPill = document.getElementById("live-status-pill");
  let liveStatusText = document.getElementById("live-status-text");
  let activeIssueCountLabel = document.getElementById("active-issues-count");
  let alertPillButton = document.querySelector(".alert-pill");
  let activeUsersValue = document.getElementById("active-users");
  let totalEventsValue = document.getElementById("total-events");
  let totalErrorsValue = document.getElementById("total-errors");
  let versionCountValue = document.getElementById("version-count");
  let sidebarErrorsValue = document.getElementById("sidebar-errors");
  let sidebarUsersValue = document.getElementById("sidebar-users");
  let sidebarEventsValue = document.getElementById("sidebar-events");
  let healthPriorityListContainer = document.getElementById("health-priority-list");
  let issueListContainer = document.getElementById("issue-list");
  let serviceStackContainer = document.getElementById("service-stack");
  let featureHotspotsContainer = document.getElementById("build-metadata");
  let activityFeedContainer = document.getElementById("activity-feed");
  let issuesActivityFeedContainer = document.getElementById("issues-activity-feed");
  let userChartContainer = document.getElementById("user-chart");
  let purchaseChartContainer = document.getElementById("purchase-chart");
  let userDeltaBadge = document.getElementById("user-delta");
  let purchaseDeltaBadge = document.getElementById("purchase-delta");
  let latencyLine = document.getElementById("latency-line");
  let latencyLegend = document.getElementById("latency-legend");
  let latencyYAxis = document.getElementById("latency-y-axis");
  let latencyXAxis = document.getElementById("latency-x-axis");
  let ratingAverage = document.getElementById("rating-average");
  let ratingCaption = document.getElementById("rating-caption");
  let ratingBars = document.getElementById("rating-bars");
  let breakdownDonut = document.getElementById("breakdown-donut");
  let breakdownList = document.getElementById("breakdown-list");
  let analyticsRangeUsers = document.getElementById("analytics-range-users");
  let analyticsRangeActions = document.getElementById("analytics-range-actions");
  let analyticsRangeLatency = document.getElementById("analytics-range-latency");
  let displayNameInput = document.getElementById("display-name");
  let profileDisplayName = document.getElementById("profile-display-name");
  let profileStatusLine = document.getElementById("profile-status-line");
  let changePasswordButton = document.getElementById("change-password-button");
  let signOutButton = document.getElementById("sign-out-button");
  let healthSummaryText = document.getElementById("health-summary-text");
  let healthStatusToken = document.getElementById("health-status-token");
  let healthCopy = document.getElementById("health-copy");
  let healthRadarGrid = document.getElementById("health-radar-grid");
  let healthRadarAxis = document.getElementById("health-radar-axis");
  let healthRadarShape = document.getElementById("health-radar-shape");
  let healthLegend = document.getElementById("health-legend");
  let healthIncidentFeed = document.getElementById("health-incident-feed");
  let managerSummaryList = document.getElementById("manager-summary-list");
  let developerRouteTable = document.getElementById("developer-route-table");
  let developerVersionTable = document.getElementById("developer-version-table");
  let developerEventMix = document.getElementById("developer-event-mix");
  let developerRoutePressure = document.getElementById("developer-route-pressure");
  let developerTopIssues = document.getElementById("developer-top-issues");
  let developerLatencyWindows = document.getElementById("developer-latency-windows");
  let developerTrafficPeaks = document.getElementById("developer-traffic-peaks");
  let developerIssueSearchInput = document.getElementById("developer-issue-search");
  let developerMuteToggleButton = document.getElementById("developer-mute-toggle");
  let developerMuteStatusLine = document.getElementById("developer-mute-status");
  let developerCriticalCount = document.getElementById("dev-critical-count");
  let developerWarningCount = document.getElementById("dev-warning-count");
  let developerInfoCount = document.getElementById("dev-info-count");
  let developerTotalCount = document.getElementById("dev-total-count");

  let notificationMutedUntil = 0;
  let PROFILE_STORAGE_KEY = "watchtower_profile_name";
  let ANALYTICS_RANGE_STORAGE_KEY = "watchtower_analytics_range";
  let THEME_STORAGE_KEY = "watchtower_theme_mode";
  let DASHBOARD_MODE_STORAGE_KEY = "watchtower_dashboard_mode";
  let ISSUE_ASSIGNEES_STORAGE_KEY = "watchtower_issue_assignees";
  let LIGHT_LOGO_PATH = "assets/watchtower-transparent.png";
  let DARK_LOGO_PATH = "assets/watchtower-transparent.png";

  let uiState = {
    selectedRange: "24h",
    dashboardMode: "manager",
    issuesExpanded: false,
    latestStats: null,
    latestEvents: [],
    issueSortField: "timestamp",
    issueSortDirection: "desc",
    issueFilterSeverity: "all",
    issueFilterVersion: "",
    issueFilterApp: "",
    issueFilterRoute: "",
    issueSearchText: "",
    developerAlertsMuted: false,
    issueAssignments: {},
    issueAssignees: ["Aditya", "Fahad", "James", "Hieu", "Daniel", "Jason", "Waleed", "Josh", "Woosik", "Alex", "Hemendra"],
  };

  function escapeHtml(value) {
    let escapeElement = document.createElement("span");
    escapeElement.textContent = value == null ? "" : String(value);
    return escapeElement.innerHTML;
  }

  function getValidTimestamp(value) {
    let timestamp = new Date(value).getTime();
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
      let targetViewPanel = document.getElementById(viewName + "-view");
      let isActiveView = viewName === selectedViewName;
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
    let targetElement = document.getElementById(targetId);
    if (!targetElement) return;
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initializeViewNavigation() {
    viewToggleElements.forEach(function (viewToggleElement) {
      viewToggleElement.addEventListener("click", function (event) {
        let selectedViewName = viewToggleElement.getAttribute("data-view");
        let scrollTargetId = viewToggleElement.getAttribute("data-scroll-target");

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

  function getDashboardModeValue(modeValue) {
    return modeValue === "developer" ? "developer" : "manager";
  }

  function applyDashboardMode(modeValue) {
    let resolvedMode = getDashboardModeValue(modeValue);
    uiState.dashboardMode = resolvedMode;

    document.body.classList.toggle("dashboard-mode-developer", resolvedMode === "developer");
    document.body.classList.toggle("dashboard-mode-manager", resolvedMode === "manager");

    if (dashboardModeSelect) dashboardModeSelect.value = resolvedMode;
    if (dashboardModePill) dashboardModePill.textContent = resolvedMode === "developer" ? "Developer view" : "Manager view";

    document.querySelectorAll("[data-dashboard-mode]").forEach(function (modePanel) {
      let panelMode = getDashboardModeValue(modePanel.getAttribute("data-dashboard-mode"));
      modePanel.hidden = panelMode !== resolvedMode;
    });
  }

  function initializeDashboardModeControl() {
    let savedMode = loadUiPreference(DASHBOARD_MODE_STORAGE_KEY);
    applyDashboardMode(savedMode || "manager");

    if (!dashboardModeSelect) return;

    dashboardModeSelect.addEventListener("change", function () {
      applyDashboardMode(dashboardModeSelect.value);
      saveUiPreference(DASHBOARD_MODE_STORAGE_KEY, uiState.dashboardMode);
      rerenderIfReady();
    });
  }

  function rerenderIfReady() {
    if (!uiState.latestStats) return;
    updateDashboardStats(uiState.latestStats, uiState.latestEvents);
  }

  function initializeTimeRangeButtons() {
    let savedRange = loadUiPreference(ANALYTICS_RANGE_STORAGE_KEY);
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
        let parentSettingsSection = accordionButton.closest(".settings-section");
        let shouldOpenSection = !parentSettingsSection.classList.contains("open");

        document.querySelectorAll(".settings-section").forEach(function (settingsSection) {
          let sectionButton = settingsSection.querySelector(".settings-trigger");
          settingsSection.classList.remove("open");
          if (sectionButton) sectionButton.setAttribute("aria-expanded", "false");
        });

        parentSettingsSection.classList.toggle("open", shouldOpenSection);
        accordionButton.setAttribute("aria-expanded", String(shouldOpenSection));
      });
    });
  }

  function initializeIssueControls() {
    if (!issueListContainer) return;

    let storedAssignees = loadUiPreference(ISSUE_ASSIGNEES_STORAGE_KEY);
    if (storedAssignees) {
      try {
        let parsedAssignees = JSON.parse(storedAssignees);
        if (Array.isArray(parsedAssignees) && parsedAssignees.length > 0) {
          uiState.issueAssignees = parsedAssignees.filter(function (name) {
            return typeof name === "string" && name.trim() !== "";
          });
        }
      } catch (_error) {
        // Ignore malformed local storage payload.
      }
    }

    if (issueSortFieldSelect) {
      issueSortFieldSelect.value = uiState.issueSortField;
      issueSortFieldSelect.addEventListener("change", function () {
        uiState.issueSortField = issueSortFieldSelect.value;
        rerenderIfReady();
      });
    }

    if (issueSortDirectionSelect) {
      issueSortDirectionSelect.value = uiState.issueSortDirection;
      issueSortDirectionSelect.addEventListener("change", function () {
        uiState.issueSortDirection = issueSortDirectionSelect.value;
        rerenderIfReady();
      });
    }

    if (issueFilterSeveritySelect) {
      issueFilterSeveritySelect.value = uiState.issueFilterSeverity;
      issueFilterSeveritySelect.addEventListener("change", function () {
        uiState.issueFilterSeverity = issueFilterSeveritySelect.value;
        rerenderIfReady();
      });
    }

    [
      { element: issueFilterVersionInput, key: "issueFilterVersion" },
      { element: issueFilterAppInput, key: "issueFilterApp" },
      { element: issueFilterRouteInput, key: "issueFilterRoute" },
    ].forEach(function (entry) {
      if (!entry.element) return;
      entry.element.addEventListener("input", function () {
        uiState[entry.key] = entry.element.value.trim().toLowerCase();
        rerenderIfReady();
      });
    });

    if (developerIssueSearchInput) {
      developerIssueSearchInput.addEventListener("input", function () {
        uiState.issueSearchText = developerIssueSearchInput.value.trim().toLowerCase();
        rerenderIfReady();
      });
    }

    if (developerMuteToggleButton && developerMuteStatusLine) {
      developerMuteToggleButton.addEventListener("click", function () {
        uiState.developerAlertsMuted = !uiState.developerAlertsMuted;
        developerMuteToggleButton.textContent = uiState.developerAlertsMuted ? "Unmute alerts" : "Mute alerts";
        developerMuteStatusLine.textContent = uiState.developerAlertsMuted ? "Alerts are muted in this developer session." : "Live alerts are active.";
      });
    }

    if (issueFilterClearButton) {
      issueFilterClearButton.addEventListener("click", function () {
        uiState.issueFilterSeverity = "all";
        uiState.issueFilterVersion = "";
        uiState.issueFilterApp = "";
        uiState.issueFilterRoute = "";
        uiState.issueSortField = "timestamp";
        uiState.issueSortDirection = "desc";

        if (issueSortFieldSelect) issueSortFieldSelect.value = uiState.issueSortField;
        if (issueSortDirectionSelect) issueSortDirectionSelect.value = uiState.issueSortDirection;
        if (issueFilterSeveritySelect) issueFilterSeveritySelect.value = uiState.issueFilterSeverity;
        if (issueFilterVersionInput) issueFilterVersionInput.value = "";
        if (issueFilterAppInput) issueFilterAppInput.value = "";
        if (issueFilterRouteInput) issueFilterRouteInput.value = "";
        uiState.issueSearchText = "";
        if (developerIssueSearchInput) developerIssueSearchInput.value = "";

        rerenderIfReady();
      });
    }

    issueListContainer.addEventListener("change", function (event) {
      let assignmentSelect = event.target.closest("select");
      if (!assignmentSelect) return;

      let issueId = assignmentSelect.getAttribute("data-issue-id") || "";
      let selectedValue = assignmentSelect.value;

      if (selectedValue === "__add_new__") {
        assignmentSelect.value = uiState.issueAssignments[issueId] || "";
        setProfileStatus("Add teammate is disabled in CI-safe mode. Update assignees in source for now.");
        return;
      }

      if (!selectedValue) {
        delete uiState.issueAssignments[issueId];
      } else {
        uiState.issueAssignments[issueId] = selectedValue;
      }
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
    let brandLogoElement = document.querySelector(".brand-logo");
    if (!brandLogoElement) return;
    brandLogoElement.setAttribute("src", useDarkLogo ? DARK_LOGO_PATH : LIGHT_LOGO_PATH);
  }

  function initializeDarkModeToggle() {

    let savedTheme = loadUiPreference(THEME_STORAGE_KEY);
    let isDarkMode = savedTheme === "dark";

    document.body.classList.toggle("dark-mode", isDarkMode);
    applyThemeLogo(isDarkMode);

    if (darkModeToggle) darkModeToggle.checked = isDarkMode;

    if (!darkModeToggle) return;

    darkModeToggle.addEventListener("change", function () {
      let shouldUseDarkMode = darkModeToggle.checked;
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

    let baseMessage =
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
        let snoozeMinutes = Number(buttonElement.getAttribute("data-snooze") || 0);

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

    let savedName = loadUiPreference(PROFILE_STORAGE_KEY) || "";

    if (savedName) {
      displayNameInput.value = savedName;
      profileDisplayName.textContent = savedName;
    }

    function commitDisplayName() {
      let nextName = displayNameInput.value.trim() || "Aditya";
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
    let message = String(eventRecord.data.message).toLowerCase();
    if (message.indexOf("timeout") !== -1 || message.indexOf("latency") !== -1) return "warning";
    return "critical";
  }

  function getIssueIdentifier(eventRecord, fallbackIndex) {
    return [
      eventRecord && eventRecord.timestamp ? String(eventRecord.timestamp) : "",
      eventRecord && eventRecord.route ? String(eventRecord.route) : "",
      eventRecord && eventRecord.deployVersion ? String(eventRecord.deployVersion) : "",
      eventRecord && eventRecord.data && eventRecord.data.message ? String(eventRecord.data.message) : "",
      String(fallbackIndex || 0),
    ].join("|");
  }

  function passesIssueFilters(eventRecord) {
    let severity = toIssueSeverity(eventRecord);
    let version = String((eventRecord && eventRecord.deployVersion) || "").toLowerCase();
    let appName = String((eventRecord && eventRecord.appName) || "").toLowerCase();
    let route = String((eventRecord && eventRecord.route) || "").toLowerCase();

    if (uiState.issueFilterSeverity !== "all" && severity !== uiState.issueFilterSeverity) return false;
    if (uiState.issueFilterVersion && version.indexOf(uiState.issueFilterVersion) === -1) return false;
    if (uiState.issueFilterApp && appName.indexOf(uiState.issueFilterApp) === -1) return false;
    if (uiState.issueFilterRoute && route.indexOf(uiState.issueFilterRoute) === -1) return false;

    if (uiState.issueSearchText) {
      let issueSearchBlob = [
        eventRecord && eventRecord.data && eventRecord.data.message ? eventRecord.data.message : "",
        eventRecord && eventRecord.route ? eventRecord.route : "",
        eventRecord && eventRecord.deployVersion ? eventRecord.deployVersion : "",
        eventRecord && eventRecord.appName ? eventRecord.appName : "",
        severity,
      ].join(" ").toLowerCase();

      if (issueSearchBlob.indexOf(uiState.issueSearchText) === -1) return false;
    }

    return true;
  }

  function compareIssues(leftIssue, rightIssue) {
    let sortDirection = uiState.issueSortDirection === "asc" ? 1 : -1;
    let leftSeverity = toIssueSeverity(leftIssue) === "critical" ? 2 : 1;
    let rightSeverity = toIssueSeverity(rightIssue) === "critical" ? 2 : 1;

    if (uiState.issueSortField === "severity") {
      if (leftSeverity !== rightSeverity) return (leftSeverity - rightSeverity) * sortDirection;
      let leftTs = getValidTimestamp(leftIssue.timestamp) || 0;
      let rightTs = getValidTimestamp(rightIssue.timestamp) || 0;
      return (leftTs - rightTs) * -1;
    }

    if (uiState.issueSortField === "version") {
      let leftVersion = String(leftIssue.deployVersion || "");
      let rightVersion = String(rightIssue.deployVersion || "");
      if (leftVersion !== rightVersion) return leftVersion.localeCompare(rightVersion) * sortDirection;
      let leftTsVersion = getValidTimestamp(leftIssue.timestamp) || 0;
      let rightTsVersion = getValidTimestamp(rightIssue.timestamp) || 0;
      return (leftTsVersion - rightTsVersion) * -1;
    }

    if (uiState.issueSortField === "route") {
      let leftRoute = String(leftIssue.route || "");
      let rightRoute = String(rightIssue.route || "");
      if (leftRoute !== rightRoute) return leftRoute.localeCompare(rightRoute) * sortDirection;
      let leftTsRoute = getValidTimestamp(leftIssue.timestamp) || 0;
      let rightTsRoute = getValidTimestamp(rightIssue.timestamp) || 0;
      return (leftTsRoute - rightTsRoute) * -1;
    }

    let leftTimestamp = getValidTimestamp(leftIssue.timestamp) || 0;
    let rightTimestamp = getValidTimestamp(rightIssue.timestamp) || 0;
    return (leftTimestamp - rightTimestamp) * sortDirection;
  }

  function getPreparedIssues(recentErrors) {
    return (recentErrors || [])
      .filter(passesIssueFilters)
      .sort(compareIssues);
  }

  function renderIssueList(recentErrors) {
    if (!issueListContainer) return;

    let preparedIssues = getPreparedIssues(recentErrors);

    if (!preparedIssues || preparedIssues.length === 0) {
      issueListContainer.innerHTML = '<div class="empty-state compact">No issues matched your filters. Try clearing filters or generate new demo errors.</div>';
      if (issueExpandToggleButton) {
        issueExpandToggleButton.hidden = true;
      }
      return;
    }

    let visibleCount = uiState.issuesExpanded ? preparedIssues.length : Math.min(3, preparedIssues.length);
    let hiddenCount = Math.max(0, preparedIssues.length - visibleCount);

    issueListContainer.innerHTML = preparedIssues.slice(0, visibleCount).map(function (eventRecord, index) {
      let severity = toIssueSeverity(eventRecord);
      let severityClass = severity === "warning" ? "severity-warning" : "severity-critical";
      let severityLabel = severity === "warning" ? "Warning" : "Critical";
      let issueId = getIssueIdentifier(eventRecord, index);
      let assignedName = uiState.issueAssignments[issueId] || "";

      let assignmentOptions = ['<option value="">Unassigned</option>']
        .concat(uiState.issueAssignees.map(function (assigneeName) {
          let isSelected = assignedName === assigneeName ? ' selected' : '';
          return '<option value="' + escapeHtml(assigneeName) + '"' + isSelected + '>' + escapeHtml(assigneeName) + '</option>';
        }))
        .concat(['<option value="__add_new__">+ Add teammate...</option>'])
        .join("");

      return (
        '<article class="issue-row ' + severityClass + '">' +
        '<div class="issue-main">' +
        '<span class="severity-pill">' + severityLabel + "</span>" +
        "<h3>" + escapeHtml(eventRecord.data.message || "Unknown error") + "</h3>" +
        "<p>" + escapeHtml(eventRecord.route || "/") + " emitted an error event.</p>" +
        '<div class="issue-meta">' +
        "<span>" + escapeHtml(eventRecord.deployVersion || "unknown") + "</span>" +
        "<span>" + escapeHtml(eventRecord.appName || "shopdemo") + "</span>" +
        "<span>" + escapeHtml(formatClockTime(eventRecord.timestamp)) + "</span>" +
        "</div>" +
        "</div>" +
        '<label class="assign-control">' +
        "<span>Assign</span>" +
        '<select data-issue-id="' + escapeHtml(issueId) + '" aria-label="Assign issue ' + (index + 1) + '">' +
        assignmentOptions +
        "</select>" +
        "</label>" +
        "</article>"
      );
    }).join("");

    if (issueExpandToggleButton) {
      if (preparedIssues.length <= 3) {
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

    let routeNames = Object.keys(stats.latencyByRoute || {});
    let sortedRouteNames = routeNames.slice().sort(function (leftRoute, rightRoute) {
      return (stats.latencyByRoute[rightRoute].p95 || 0) - (stats.latencyByRoute[leftRoute].p95 || 0);
    });

    let hottestRouteName = sortedRouteNames[0] || "/";
    let hottestRoute = stats.latencyByRoute[hottestRouteName] || null;

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
    let featureCounts = {};

    (activityEvents || []).forEach(function (eventRecord) {
      let featureName = "";

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

    let topFeatures = deriveFeatureCounts(activityEvents).slice(0, 4);

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

  function renderManagerSummary(stats, activityEvents) {
    if (!managerSummaryList) return;

    let topFeature = deriveFeatureCounts(activityEvents || [])[0];
    let routeNames = Object.keys((stats && stats.latencyByRoute) || {});
    let slowestRouteName = routeNames.sort(function (leftRoute, rightRoute) {
      return ((stats.latencyByRoute[rightRoute] || {}).p95 || 0) - ((stats.latencyByRoute[leftRoute] || {}).p95 || 0);
    })[0];
    let slowestRoute = slowestRouteName ? stats.latencyByRoute[slowestRouteName] : null;

    let notes = [];
    notes.push('<li><span aria-hidden="true">!</span> Open errors: ' + String(stats.totalErrors || 0) + '. Prioritize triage when errors spike.</li>');

    if (slowestRoute) {
      notes.push('<li><span aria-hidden="true">!</span> Slowest route is ' + escapeHtml(slowestRouteName) + ' at p95 ' + String(slowestRoute.p95 || 0) + ' ms.</li>');
    } else {
      notes.push('<li><span aria-hidden="true">!</span> Waiting for route latency samples from pageload telemetry.</li>');
    }

    if (topFeature) {
      notes.push('<li><span aria-hidden="true">!</span> Most-used feature right now: ' + escapeHtml(topFeature.name) + ' (' + String(topFeature.count) + ' events).</li>');
    }

    managerSummaryList.innerHTML = notes.join('');
  }

  function renderDeveloperHomeDiagnostics(stats) {
    if (developerRouteTable) {
      let routeNames = Object.keys(stats.latencyByRoute || {}).sort(function (leftRoute, rightRoute) {
        return ((stats.latencyByRoute[rightRoute] || {}).p95 || 0) - ((stats.latencyByRoute[leftRoute] || {}).p95 || 0);
      });

      if (routeNames.length === 0) {
        developerRouteTable.innerHTML = '<li><span>/</span><strong>Waiting for samples</strong></li>';
      } else {
        developerRouteTable.innerHTML = routeNames.slice(0, 6).map(function (routeName) {
          let routeStats = stats.latencyByRoute[routeName] || {};
          return '<li><span>' + escapeHtml(routeName) + '</span><strong>' + String(routeStats.p95 || 0) + ' ms</strong></li>';
        }).join('');
      }
    }

    if (developerVersionTable) {
      let versionKeys = Object.keys(stats.errorsByVersion || {}).sort(function (leftVersion, rightVersion) {
        return (stats.errorsByVersion[rightVersion] || 0) - (stats.errorsByVersion[leftVersion] || 0);
      });

      if (versionKeys.length === 0) {
        developerVersionTable.innerHTML = '<li><span>No errors yet</span><strong>0</strong></li>';
      } else {
        developerVersionTable.innerHTML = versionKeys.slice(0, 6).map(function (versionName) {
          return '<li><span>' + escapeHtml(versionName) + '</span><strong>' + String(stats.errorsByVersion[versionName] || 0) + '</strong></li>';
        }).join('');
      }
    }
  }

  function renderDeveloperIssueDiagnostics(recentErrors) {
    let errors = recentErrors || [];

    let counts = { critical: 0, warning: 0, info: 0 };
    errors.forEach(function (eventRecord) {
      let severity = toIssueSeverity(eventRecord);
      if (severity === "critical") counts.critical += 1;
      else if (severity === "warning") counts.warning += 1;
      else counts.info += 1;
    });

    if (developerCriticalCount) developerCriticalCount.textContent = String(counts.critical);
    if (developerWarningCount) developerWarningCount.textContent = String(counts.warning);
    if (developerInfoCount) developerInfoCount.textContent = String(counts.info);
    if (developerTotalCount) developerTotalCount.textContent = String(errors.length);
  }

  function renderDeveloperInsights(stats, activityEvents) {
    let errors = (stats.recentErrors || []).slice(0, 5);

    if (developerTopIssues) {
      if (errors.length === 0) {
        developerTopIssues.innerHTML = '<li><span>No active signatures</span><strong>0</strong></li>';
      } else {
        developerTopIssues.innerHTML = errors.map(function (eventRecord) {
          let message = eventRecord && eventRecord.data && eventRecord.data.message ? eventRecord.data.message : 'Unknown error';
          return '<li><span>' + escapeHtml(message) + '</span><strong>' + escapeHtml(formatClockTime(eventRecord.timestamp || new Date().toISOString())) + '</strong></li>';
        }).join('');
      }
    }

    let routeNames = Object.keys(stats.latencyByRoute || {}).sort(function (leftRoute, rightRoute) {
      return ((stats.latencyByRoute[rightRoute] || {}).p95 || 0) - ((stats.latencyByRoute[leftRoute] || {}).p95 || 0);
    });

    if (developerLatencyWindows) {
      if (routeNames.length === 0) {
        developerLatencyWindows.innerHTML = '<li><span>No route telemetry yet</span><strong>0 ms</strong></li>';
      } else {
        developerLatencyWindows.innerHTML = routeNames.slice(0, 5).map(function (routeName) {
          let routeStats = stats.latencyByRoute[routeName] || {};
          return '<li><span>' + escapeHtml(routeName) + '</span><strong>' + String(routeStats.p95 || 0) + ' ms</strong></li>';
        }).join('');
      }
    }

    if (developerTrafficPeaks) {
      let hourCounts = {};
      (activityEvents || []).forEach(function (eventRecord) {
        let timestamp = getValidTimestamp(eventRecord && eventRecord.timestamp);
        if (!timestamp) return;
        let hourKey = new Date(timestamp).toISOString().slice(0, 13);
        hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
      });

      let topHours = Object.keys(hourCounts).sort(function (leftHour, rightHour) {
        return hourCounts[rightHour] - hourCounts[leftHour];
      }).slice(0, 5);

      if (topHours.length === 0) {
        developerTrafficPeaks.innerHTML = '<li><span>Waiting for load samples</span><strong>0/min</strong></li>';
      } else {
        developerTrafficPeaks.innerHTML = topHours.map(function (hourKey) {
          let label = new Date(hourKey + ':00:00Z').toLocaleTimeString([], { hour: 'numeric' });
          return '<li><span>' + escapeHtml(label) + '</span><strong>' + String(hourCounts[hourKey]) + '/min</strong></li>';
        }).join('');
      }
    }
  }

  function renderDeveloperAnalyticsDiagnostics(rangeEvents, rangeLatencySummary) {
    if (developerEventMix) {
      let typeCounts = {};

      (rangeEvents || []).forEach(function (eventRecord) {
        let eventType = eventRecord && eventRecord.type ? String(eventRecord.type) : 'unknown';
        typeCounts[eventType] = (typeCounts[eventType] || 0) + 1;
      });

      let eventTypes = Object.keys(typeCounts).sort(function (leftType, rightType) {
        return typeCounts[rightType] - typeCounts[leftType];
      });

      if (eventTypes.length === 0) {
        developerEventMix.innerHTML = '<li><span>No events</span><strong>0</strong></li>';
      } else {
        developerEventMix.innerHTML = eventTypes.slice(0, 6).map(function (eventType) {
          return '<li><span>' + escapeHtml(eventType) + '</span><strong>' + String(typeCounts[eventType]) + '</strong></li>';
        }).join('');
      }
    }

    if (developerRoutePressure) {
      let routeNames = Object.keys(rangeLatencySummary || {}).sort(function (leftRoute, rightRoute) {
        return ((rangeLatencySummary[rightRoute] || {}).p95 || 0) - ((rangeLatencySummary[leftRoute] || {}).p95 || 0);
      });

      if (routeNames.length === 0) {
        developerRoutePressure.innerHTML = '<li><span>No route data</span><strong>0 ms</strong></li>';
      } else {
        developerRoutePressure.innerHTML = routeNames.slice(0, 6).map(function (routeName) {
          let routeStats = rangeLatencySummary[routeName] || {};
          return '<li><span>' + escapeHtml(routeName) + '</span><strong>' + String(routeStats.p95 || 0) + ' ms</strong></li>';
        }).join('');
      }
    }
  }

  function renderActivityFeed(activityEvents) {
    if (!activityFeedContainer) return;

    if (!activityEvents || activityEvents.length === 0) {
      activityFeedContainer.innerHTML = '<li><span class="timeline-time">--:--</span><span class="timeline-copy">Waiting for events from the monitored app.</span></li>';
      return;
    }

    activityFeedContainer.innerHTML = activityEvents.slice(0, 8).map(function (eventRecord) {
      let activityMessage;

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

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function calculateHealthScores(stats, events) {
    let totalEvents = Number(stats.totalEvents || 0);
    let totalErrors = Number(stats.totalErrors || 0);
    let routeNames = Object.keys(stats.latencyByRoute || {});
    let slowestRouteName = routeNames.sort(function (leftRoute, rightRoute) {
      return (stats.latencyByRoute[rightRoute].p95 || 0) - (stats.latencyByRoute[leftRoute].p95 || 0);
    })[0];
    let slowestRoute = slowestRouteName ? stats.latencyByRoute[slowestRouteName] : null;
    let p95Latency = Number(slowestRoute && slowestRoute.p95 ? slowestRoute.p95 : 0);

    let analytics = stats.analytics || {};
    let feedbackAverage = Number(analytics.feedbackAverage || 0);
    let feedbackTotal = Number(analytics.feedbackTotal || 0);

    let errorRatio = totalEvents > 0 ? totalErrors / totalEvents : 0;

    let availabilityScore = clampScore(100 - Math.min(totalErrors * 12, 80));
    let errorRateScore = clampScore(100 - errorRatio * 280);
    let latencyScore = p95Latency <= 0 ? 58 : clampScore(100 - ((Math.max(0, p95Latency - 120) / 1800) * 100));
    let ingestionScore = clampScore(Math.min(totalEvents, 120) / 1.2 + Math.min(Number(stats.activeUsers || 0), 20));
    let feedbackScore = feedbackTotal === 0 ? 62 : clampScore((feedbackAverage / 5) * 100);
    let coverageScore = clampScore(Math.min(routeNames.length, 6) * (100 / 6));

    return {
      availability: availabilityScore,
      errors: errorRateScore,
      latency: latencyScore,
      ingestion: ingestionScore,
      feedback: feedbackScore,
      coverage: coverageScore,
      slowestRouteName: slowestRouteName || "/",
      slowestRoute: slowestRoute,
      feedbackTotal: feedbackTotal,
      score: clampScore((availabilityScore + errorRateScore + latencyScore + ingestionScore + feedbackScore + coverageScore) / 6),
    };
  }

  function renderHealthRadar(scores) {
    if (!healthRadarGrid || !healthRadarAxis || !healthRadarShape || !healthLegend) return;

    let axes = [
      { key: "availability", label: "Availability" },
      { key: "errors", label: "Error rate" },
      { key: "latency", label: "Latency" },
      { key: "ingestion", label: "Ingestion" },
      { key: "feedback", label: "Feedback" },
      { key: "coverage", label: "Coverage" },
    ];

    let centerX = 260;
    let centerY = 170;
    let radius = 120;
    let levels = 5;

    function pointFor(index, ratio) {
      let angle = (-Math.PI / 2) + (index * ((Math.PI * 2) / axes.length));
      return {
        x: centerX + Math.cos(angle) * radius * ratio,
        y: centerY + Math.sin(angle) * radius * ratio,
      };
    }

    healthRadarGrid.innerHTML = Array.from({ length: levels }, function (_, levelIndex) {
      let ratio = (levelIndex + 1) / levels;
      let points = axes.map(function (_, axisIndex) {
        let point = pointFor(axisIndex, ratio);
        return point.x.toFixed(1) + "," + point.y.toFixed(1);
      }).join(" ");
      return '<polygon points="' + points + '"></polygon>';
    }).join("") + '<line x1="' + centerX + '" y1="' + (centerY - radius) + '" x2="' + centerX + '" y2="' + (centerY + radius) + '"></line>';

    healthRadarAxis.innerHTML = axes.map(function (axis, axisIndex) {
      let outer = pointFor(axisIndex, 1);
      let label = pointFor(axisIndex, 1.18);
      return (
        '<line x1="' + centerX + '" y1="' + centerY + '" x2="' + outer.x.toFixed(1) + '" y2="' + outer.y.toFixed(1) + '"></line>' +
        '<text x="' + label.x.toFixed(1) + '" y="' + label.y.toFixed(1) + '">' + escapeHtml(axis.label) + '</text>'
      );
    }).join("");

    let polygonPoints = axes.map(function (axis, axisIndex) {
      let ratio = (Number(scores[axis.key] || 0) / 100);
      let point = pointFor(axisIndex, ratio);
      return point.x.toFixed(1) + "," + point.y.toFixed(1);
    }).join(" ");

    healthRadarShape.setAttribute("points", polygonPoints);

    healthLegend.innerHTML = axes.map(function (axis) {
      return '<li><span>' + escapeHtml(axis.label) + '</span><strong>' + Number(scores[axis.key] || 0) + '/100</strong></li>';
    }).join("");
  }

  function renderHealthIncidentFeed(stats, events) {
    if (!healthIncidentFeed) return;

    let incidents = [];
    let recentErrors = (stats.recentErrors || []).slice(0, 4);

    recentErrors.forEach(function (errorEvent) {
      incidents.push({
        time: formatClockTime(errorEvent.timestamp),
        message: 'Error on ' + (errorEvent.route || '/') + ': ' + (errorEvent.data && errorEvent.data.message ? errorEvent.data.message : 'Unknown error'),
      });
    });

    let routeNames = Object.keys(stats.latencyByRoute || {});
    if (routeNames.length > 0) {
      let slowRouteName = routeNames.sort(function (leftRoute, rightRoute) {
        return (stats.latencyByRoute[rightRoute].p95 || 0) - (stats.latencyByRoute[leftRoute].p95 || 0);
      })[0];
      let slowRouteStats = stats.latencyByRoute[slowRouteName];
      incidents.push({
        time: formatClockTime(new Date().toISOString()),
        message: 'Latency alert on ' + slowRouteName + ' at p95 ' + (slowRouteStats.p95 || 0) + ' ms.',
      });
    }

    if (incidents.length === 0) {
      healthIncidentFeed.innerHTML = '<li><span class="timeline-time">--:--</span><span class="timeline-copy">No incidents detected yet. Generate demo traffic to populate this stream.</span></li>';
      return;
    }

    healthIncidentFeed.innerHTML = incidents.slice(0, 6).map(function (incident) {
      return '<li><span class="timeline-time">' + escapeHtml(incident.time) + '</span><span class="timeline-copy">' + escapeHtml(incident.message) + '</span></li>';
    }).join('');
  }

  function renderHealthSummary(stats, events) {
    let healthScores = calculateHealthScores(stats, events);
    renderHealthRadar(healthScores);
    renderHealthIncidentFeed(stats, events);

    if (healthSummaryText) {
      healthSummaryText.textContent = 'Overall score ' + healthScores.score + '/100';
    }

    if (healthStatusToken) {
      let statusLabel = 'Healthy';
      let statusClass = 'good';

      if (healthScores.score < 55) {
        statusLabel = 'At risk';
        statusClass = 'warning';
      } else if (healthScores.score < 75) {
        statusLabel = 'Watch';
        statusClass = 'warning';
      }

      healthStatusToken.textContent = statusLabel;
      healthStatusToken.classList.remove('good', 'warning');
      healthStatusToken.classList.add(statusClass);
    }

    if (healthCopy) {
      let slowRouteLine = healthScores.slowestRoute
        ? 'Slowest route is ' + healthScores.slowestRouteName + ' at p95 ' + healthScores.slowestRoute.p95 + ' ms.'
        : 'Waiting for pageload telemetry to measure route latency.';
      healthCopy.textContent =
        'Health score balances uptime pressure, error rate, latency, ingestion, and user feedback. ' + slowRouteLine;
    }

    if (healthPriorityListContainer) {
      let alerts = [];
      let topFeature = deriveFeatureCounts(events || [])[0];

      if ((stats.totalErrors || 0) > 0) {
        alerts.push('<li><span aria-hidden="true">!</span> ' + escapeHtml(String(stats.totalErrors)) + ' open errors are currently pending triage.</li>');
      } else {
        alerts.push('<li><span aria-hidden="true">!</span> No open errors right now. Keep monitoring as new deploys roll out.</li>');
      }

      if (healthScores.slowestRoute) {
        alerts.push('<li><span aria-hidden="true">!</span> Latency hotspot: ' + escapeHtml(healthScores.slowestRouteName) + ' at p95 ' + healthScores.slowestRoute.p95 + ' ms.</li>');
      }

      if (topFeature) {
        alerts.push('<li><span aria-hidden="true">!</span> Most-clicked feature is ' + escapeHtml(topFeature.name) + ' (' + topFeature.count + ' events).</li>');
      }

      if (healthScores.feedbackTotal === 0) {
        alerts.push('<li><span aria-hidden="true">!</span> No feedback submissions yet. Prompt users to submit quick ratings.</li>');
      }

      healthPriorityListContainer.innerHTML = alerts.join('');
    }
  }

  function renderIssuesActivityFeed(stats, activityEvents) {
    if (!issuesActivityFeedContainer) return;

    let rows = [];

    (stats.recentErrors || []).slice(0, 6).forEach(function (eventRecord) {
      rows.push({
        timestamp: getValidTimestamp(eventRecord.timestamp) || 0,
        time: formatClockTime(eventRecord.timestamp),
        message: "Error: " + (eventRecord.data && eventRecord.data.message ? eventRecord.data.message : "Unknown error"),
      });
    });

    (activityEvents || []).filter(function (eventRecord) {
      return eventRecord.type === "feedback";
    }).slice(0, 4).forEach(function (feedbackEvent) {
      rows.push({
        timestamp: getValidTimestamp(feedbackEvent.timestamp) || 0,
        time: formatClockTime(feedbackEvent.timestamp),
        message: "Feedback: " + ((feedbackEvent.data && feedbackEvent.data.message) || "User feedback received"),
      });
    });

    rows.sort(function (leftRow, rightRow) {
      return rightRow.timestamp - leftRow.timestamp;
    });

    if (rows.length === 0) {
      issuesActivityFeedContainer.innerHTML = '<li><span class="timeline-time">--:--</span><span class="timeline-copy">No issue activity yet. Generate demo errors to populate this feed.</span></li>';
      return;
    }

    issuesActivityFeedContainer.innerHTML = rows.slice(0, 8).map(function (row) {
      return '<li><span class="timeline-time">' + escapeHtml(row.time) + '</span><span class="timeline-copy">' + escapeHtml(row.message) + '</span></li>';
    }).join("");
  }

  function renderBarChart(chartContainer, labels, values, highlightedIndex) {
    if (!chartContainer) return;

    let maxValue = Math.max.apply(null, values.concat([1]));
    let denseClass = labels.length > 7 ? " dense" : "";
    let hasSignal = values.some(function (value) { return value > 0; });

    chartContainer.classList.toggle("dense", labels.length > 7);
    chartContainer.classList.toggle("is-empty", !hasSignal);
    chartContainer.style.setProperty("--bar-count", String(labels.length || 1));
    chartContainer.innerHTML = labels.map(function (label, index) {
      let value = Number(values[index] || 0);
      let percentage = Math.round((value / maxValue) * 100);
      let displayPercentage = hasSignal
        ? (value > 0 ? Math.max(percentage, 10) : 0)
        : 10;
      let highlightClass = index === highlightedIndex ? " highlight" : "";
      let tooltip = value + " at " + label;
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

    let sorted = values.slice().sort(function (left, right) { return left - right; });
    let boundedPercentile = Math.min(Math.max(percentile, 0), 100);
    let position = (boundedPercentile / 100) * (sorted.length - 1);
    let lowerIndex = Math.floor(position);
    let upperIndex = Math.ceil(position);
    let lowerValue = sorted[lowerIndex];
    let upperValue = sorted[upperIndex];

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
    let configuration = getRangeConfiguration(rangeName);
    let now = Date.now();
    let minTimestamp = now - configuration.rangeMs;

    return (events || []).filter(function (eventRecord) {
      let eventTimestamp = getValidTimestamp(eventRecord.timestamp);
      return eventTimestamp !== null && eventTimestamp >= minTimestamp && eventTimestamp <= now;
    });
  }

  function buildRangeSeries(events, rangeName) {
    let configuration = getRangeConfiguration(rangeName);
    let now = Date.now();
    let rangeStart = now - configuration.bucketMs * configuration.bucketCount;
    let buckets = [];

    for (let bucketIndex = 0; bucketIndex < configuration.bucketCount; bucketIndex += 1) {
      buckets.push({
        sessions: new Set(),
        actions: 0,
      });
    }

    (events || []).forEach(function (eventRecord) {
      let eventTimestamp = getValidTimestamp(eventRecord.timestamp);
      if (eventTimestamp === null || eventTimestamp < rangeStart || eventTimestamp > now) return;

      let targetBucketIndex = Math.floor((eventTimestamp - rangeStart) / configuration.bucketMs);
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

    let labels = buckets.map(function (_, index) {
      let labelDate = new Date(rangeStart + (index + 1) * configuration.bucketMs);
      return labelDate.toLocaleString([], configuration.labelFormat);
    });

    let users = buckets.map(function (bucket) { return bucket.sessions.size; });
    let actions = buckets.map(function (bucket) { return bucket.actions; });

    return {
      labels: labels,
      users: users,
      actions: actions,
    };
  }

  function buildLatencySummaryFromEvents(events, rangeName) {
    let filteredEvents = getEventsInSelectedRange(events, rangeName);
    let routeBuckets = {};

    filteredEvents.forEach(function (eventRecord) {
      if (eventRecord.type !== "pageload") return;
      if (!eventRecord.data || typeof eventRecord.data.duration !== "number") return;

      let routeName = eventRecord.route || "/";
      if (!routeBuckets[routeName]) routeBuckets[routeName] = [];
      routeBuckets[routeName].push({
        duration: eventRecord.data.duration,
        timestamp: eventRecord.timestamp,
      });
    });

    return Object.keys(routeBuckets).reduce(function (summary, routeName) {
      let points = routeBuckets[routeName].sort(function (leftPoint, rightPoint) {
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

    let routeNames = Object.keys(latencyByRoute || {});
    if (routeNames.length === 0) {
      latencyLine.setAttribute("d", "M60 240 L610 240");
      if (latencyYAxis) latencyYAxis.innerHTML = "";
      if (latencyXAxis) latencyXAxis.innerHTML = "";
      latencyLegend.innerHTML = '<span><i class="legend-swatch checkout"></i>Waiting for pageload samples</span>';
      return;
    }

    let primaryRouteName = routeNames.sort(function (leftRoute, rightRoute) {
      return (latencyByRoute[rightRoute].p95 || 0) - (latencyByRoute[leftRoute].p95 || 0);
    })[0];
    let routeStats = latencyByRoute[primaryRouteName];
    let points = (routeStats.points || []).slice(-12);

    if (points.length === 0) {
      latencyLine.setAttribute("d", "M60 240 L610 240");
      if (latencyYAxis) latencyYAxis.innerHTML = "";
      if (latencyXAxis) latencyXAxis.innerHTML = "";
      latencyLegend.innerHTML = '<span><i class="legend-swatch checkout"></i>' + escapeHtml(primaryRouteName) + ' has no data points</span>';
      return;
    }

    let maxDuration = Math.max.apply(null, points.map(function (point) { return point.duration; }).concat([1]));
    let yTop = 40;
    let yBottom = 240;
    let xLeft = 60;
    let xRight = 610;
    let ySpan = yBottom - yTop;
    let xSpan = xRight - xLeft;

    let pathCommand = points.map(function (point, index) {
      let x = xLeft + ((xSpan * index) / Math.max(points.length - 1, 1));
      let y = yBottom - ((ySpan * point.duration) / maxDuration);
      return (index === 0 ? "M" : "L") + x + " " + y;
    }).join(" ");

    latencyLine.setAttribute("d", pathCommand);

    if (latencyYAxis) {
      let yTicks = [0, 0.25, 0.5, 0.75, 1];
      latencyYAxis.innerHTML = yTicks.map(function (ratio) {
        let y = yBottom - ySpan * ratio;
        let value = Math.round(maxDuration * ratio);
        return '<text x="52" y="' + y + '" dominant-baseline="middle">' + value + 'ms</text>';
      }).join("");
    }

    if (latencyXAxis) {
      let labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];
      latencyXAxis.innerHTML = labelIndexes.map(function (pointIndex) {
        let point = points[pointIndex];
        let x = xLeft + ((xSpan * pointIndex) / Math.max(points.length - 1, 1));
        let label = point ? formatClockTime(point.timestamp) : "";
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
      let count = analytics.feedbackBreakdown[rating] || 0;
      let width = analytics.feedbackTotal === 0 ? 0 : Math.round((count / analytics.feedbackTotal) * 100);
      return '<span style="--rating-width: ' + width + '%">' + rating + " stars</span>";
    }).join("");
  }

  function renderBreakdownPanel(analytics) {
    if (!breakdownDonut || !breakdownList) return;

    let counts = analytics.breakdownCounts || {
      performance: 0,
      errors: 0,
      feedback: 0,
      clicks: 0,
    };
    let totalCount = counts.performance + counts.errors + counts.feedback + counts.clicks;
    let performancePct = totalCount === 0 ? 0 : Math.round((counts.performance / totalCount) * 100);
    let errorsPct = totalCount === 0 ? 0 : Math.round((counts.errors / totalCount) * 100);
    let feedbackPct = totalCount === 0 ? 0 : Math.round((counts.feedback / totalCount) * 100);
    let clicksPct = totalCount === 0 ? 0 : Math.max(0, 100 - performancePct - errorsPct - feedbackPct);

    breakdownDonut.style.background =
      "conic-gradient(" +
      "let(--teal) 0 " + performancePct + "%, " +
      "let(--coral) " + performancePct + "% " + (performancePct + errorsPct) + "%, " +
      "let(--amber) " + (performancePct + errorsPct) + "% " + (performancePct + errorsPct + feedbackPct) + "%, " +
      "let(--blue) " + (performancePct + errorsPct + feedbackPct) + "% 100%)";

    breakdownList.innerHTML =
      '<li><span class="legend-dot teal"></span>Performance <strong>' + performancePct + "%</strong></li>" +
      '<li><span class="legend-dot coral"></span>Errors <strong>' + errorsPct + "%</strong></li>" +
      '<li><span class="legend-dot amber"></span>Feedback <strong>' + feedbackPct + "%</strong></li>" +
      '<li><span class="legend-dot blue"></span>Clicks <strong>' + clicksPct + "%</strong></li>";
  }

  function renderAnalyticsSummary(eventsInRange, latencySummary) {
    if (analyticsRangeUsers) {
      let usersSet = new Set();
      eventsInRange.forEach(function (eventRecord) {
        if (eventRecord.sessionId) usersSet.add(eventRecord.sessionId);
      });
      analyticsRangeUsers.textContent = String(usersSet.size);
    }

    if (analyticsRangeActions) {
      let actions = eventsInRange.filter(function (eventRecord) {
        return eventRecord.type === "click" || eventRecord.type === "custom" || eventRecord.type === "feedback";
      }).length;
      analyticsRangeActions.textContent = String(actions);
    }

    if (analyticsRangeLatency) {
      let routeNames = Object.keys(latencySummary || {});
      if (routeNames.length === 0) {
        analyticsRangeLatency.textContent = "0 ms";
      } else {
        let peakP95 = routeNames.reduce(function (runningPeak, routeName) {
          return Math.max(runningPeak, latencySummary[routeName].p95 || 0);
        }, 0);
        analyticsRangeLatency.textContent = peakP95 + " ms";
      }
    }
  }

  function renderAnalyticsPanels(stats, events) {
    let analytics = stats.analytics || {};
    let rangeSeries = buildRangeSeries(events, uiState.selectedRange);
    let rangeLatencySummary = buildLatencySummaryFromEvents(events, uiState.selectedRange);
    let rangeEvents = getEventsInSelectedRange(events, uiState.selectedRange);

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
    renderDeveloperAnalyticsDiagnostics(rangeEvents, rangeLatencySummary);

    if (userDeltaBadge) {
      userDeltaBadge.textContent = rangeSeries.users.reduce(function (maxValue, value) {
        return Math.max(maxValue, value);
      }, 0) + " peak";
    }
    if (purchaseDeltaBadge) {
      let totalActions = rangeSeries.actions.reduce(function (sum, value) {
        return sum + value;
      }, 0);
      purchaseDeltaBadge.textContent = totalActions + " actions";
    }
  }

  function updateDashboardStats(stats, events) {
    let resolvedEvents = Array.isArray(events) && events.length > 0 ? events : (stats.recentActivity || []);

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
      let issueCount = Number(stats.totalErrors || 0);
      activeIssueCountLabel.textContent = issueCount + (issueCount === 1 ? " active issue" : " active issues");
      if (alertPillButton) alertPillButton.classList.toggle("quiet", issueCount === 0);
    }

    renderHealthSummary(stats, resolvedEvents);
    renderIssueList(stats.recentErrors || []);
    renderIssuesActivityFeed(stats, resolvedEvents);
    renderServiceStatus(stats);
    renderFeatureHotspots(resolvedEvents);
    renderManagerSummary(stats, resolvedEvents);
    renderDeveloperHomeDiagnostics(stats);
    renderDeveloperInsights(stats, resolvedEvents);
    renderDeveloperIssueDiagnostics(stats.recentErrors || []);
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
        let stats = results[0];
        let events = results[1];
        updateDashboardStats(stats, events);
        setLiveConnectionState(true);
      })
      .catch(function () {
        setLiveConnectionState(false);
      });
  }

  function initializeLiveEventStream() {
    if (typeof EventSource === "undefined") return;

    let eventSource = new EventSource("/api/events/stream");

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
    let initialHashViewName = window.location.hash.replace("#", "");

    initializeViewNavigation();
    initializeTimeRangeButtons();
    initializeSettingsAccordions();
    initializeIssueControls();
    initializeIssueExpansionControls();
    initializeDashboardModeControl();
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
