(function () {
  "use strict";

  let POLL_INTERVAL = 3000;
  let availableViewNames = ["home", "issues", "health", "analytics", "settings"];
  let viewToggleElements = document.querySelectorAll("[data-view]");
  let timeRangeButtons = document.querySelectorAll(".segmented-control button");
  let settingsAccordionButtons = document.querySelectorAll(".settings-trigger");
  let darkModeToggle = document.getElementById("dark-mode-toggle");
  let dashboardModePill = document.getElementById("dashboard-mode-pill");
  let timezoneSelect = document.getElementById("timezone-select");
  let refreshRateSelect = document.getElementById("refresh-rate-select");
  let notificationEnabledToggle = document.getElementById("notification-enabled-toggle");
  let notificationVolumeSlider = document.getElementById("notification-volume");
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
  let issueExportCsvButton = document.getElementById("issue-export-csv");
  let toastStack = document.getElementById("toast-stack");
  let lastUpdatedLabel = document.getElementById("last-updated");
  let liveStatusPill = null;
  let liveStatusText = null;
  let activeIssueCountLabel = document.getElementById("active-issues-count");
  let alertPillButton = document.querySelector(".alert-pill");
  let activeUsersValue = document.getElementById("active-users");
  let totalEventsValue = document.getElementById("total-events");
  let totalErrorsValue = document.getElementById("total-errors");
  let versionCountValue = document.getElementById("version-count");
  let sidebarErrorsValue = document.getElementById("sidebar-errors");
  let sidebarUsersValue = document.getElementById("sidebar-users");
  let sidebarEventsValue = document.getElementById("sidebar-events");
  let developerHealthSummaryCopy = document.getElementById("developer-health-summary-copy");
  let developerHealthPriorityListContainer = document.getElementById("developer-health-priority-list");
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
  let healthPriorityListContainer = document.getElementById("health-priority-list");
  let healthRadarGrid = document.getElementById("health-radar-grid");
  let healthRadarAxis = document.getElementById("health-radar-axis");
  let healthRadarShape = document.getElementById("health-radar-shape");
  let healthLegend = document.getElementById("health-legend");
  let healthIncidentFeed = document.getElementById("health-incident-feed");
  let managerSummaryList = document.getElementById("manager-summary-list");
  let developerRouteTable = document.getElementById("developer-route-table");
  let developerVersionTable = document.getElementById("developer-version-table");
  let devErrorChartContainer = document.getElementById("dev-error-chart");
  let devLatencyCanvas = document.getElementById("dev-latency-canvas");
  let devLatencyThresholdInput = document.getElementById("dev-latency-threshold");
  let developerTopIssues = document.getElementById("developer-top-issues");
  let developerLatencyWindows = document.getElementById("developer-latency-windows");
  let developerTrafficPeaks = document.getElementById("developer-traffic-peaks");
  let developerLatencyPeakValue = document.getElementById("developer-latency-peak");
  let devActiveUsers = document.getElementById("dev-active-users");
  let devMaxUsers = document.getElementById("dev-max-users");
  let devActiveIssues = document.getElementById("dev-active-issues");
  let devAvgLatency = document.getElementById("dev-avg-latency");
  let devPeakTraffic = document.getElementById("dev-peak-traffic");
  let devPatchDeployed = document.getElementById("dev-patch-deployed");
  let devActiveUsersTrend = document.getElementById("dev-active-users-trend");
  let devMaxUsersTrend = document.getElementById("dev-max-users-trend");
  let devActiveIssuesTrend = document.getElementById("dev-active-issues-trend");
  let devAvgLatencyTrend = document.getElementById("dev-avg-latency-trend");
  let devPeakTrafficTrend = document.getElementById("dev-peak-traffic-trend");
  let devPatchDeployedTrend = document.getElementById("dev-patch-deployed-trend");
  let developerPatchList = document.getElementById("developer-patch-list");
  let devMiniRadarGrid = document.getElementById("dev-mini-radar-grid");
  let devMiniRadarAxis = document.getElementById("dev-mini-radar-axis");
  let devMiniRadarShape = document.getElementById("dev-mini-radar-shape");
  let devHealthToken = document.getElementById("dev-health-token");
  let devOverallScore = document.getElementById("dev-overall-score");
  let devOverallLabel = document.getElementById("dev-overall-label");
  let devScoreBreakdown = document.getElementById("dev-score-breakdown");
  let developerInsightIssues = document.getElementById("developer-insight-issues");
  let developerInsightLatency = document.getElementById("developer-insight-latency");
  let developerInsightTraffic = document.getElementById("developer-insight-traffic");
  let developerIssueSearchInput = document.getElementById("developer-issue-search");
  let developerMuteToggleButton = document.getElementById("developer-mute-toggle");
  let developerMuteStatusLine = document.getElementById("developer-mute-status");
  let developerCriticalCount = document.getElementById("dev-critical-count");
  let developerWarningCount = document.getElementById("dev-warning-count");
  let developerInfoCount = document.getElementById("dev-info-count");
  let developerTotalCount = document.getElementById("dev-total-count");
  let developerTabButtons = document.querySelectorAll(".devtab-button");
  let developerTabPanels = document.querySelectorAll("[data-devtab-panel]");
  let devFilterEvent = document.getElementById("dev-filter-event");
  let devFilterUser = document.getElementById("dev-filter-user");
  let devFilterSession = document.getElementById("dev-filter-session");
  let devFilterEnvironment = document.getElementById("dev-filter-environment");
  let devFilterSdk = document.getElementById("dev-filter-sdk");
  let devFilterDateFrom = document.getElementById("dev-filter-date-from");
  let devFilterDateTo = document.getElementById("dev-filter-date-to");
  let devFilterSearch = document.getElementById("dev-filter-search");
  let devStreamApplyButton = document.getElementById("dev-stream-apply");
  let devStreamResetButton = document.getElementById("dev-stream-reset");
  let devStreamLoadMoreButton = document.getElementById("dev-stream-load-more");
  let devStreamList = document.getElementById("dev-stream-list");
  let devStreamMeta = document.getElementById("dev-stream-meta");
  let devCopyJsonButton = document.getElementById("dev-copy-json");
  let devEventMeta = document.getElementById("dev-event-meta");
  let devEventJson = document.getElementById("dev-event-json");
  let devSchemaTableBody = document.querySelector("#dev-schema-table tbody");
  let devSchemaPropertiesBody = document.querySelector("#dev-schema-properties tbody");
  let devSessionMeta = document.getElementById("dev-session-meta");
  let devSessionList = document.getElementById("dev-session-list");
  let devSessionSelected = document.getElementById("dev-session-selected");
  let devSessionFailures = document.getElementById("dev-session-failures");
  let devSessionFlags = document.getElementById("dev-session-flags");
  let devSessionTimeline = document.getElementById("dev-session-timeline");
  let devSdkDropped = document.getElementById("dev-sdk-dropped");
  let devSdkRetryHealth = document.getElementById("dev-sdk-retry-health");
  let devSdkSuccessRate = document.getElementById("dev-sdk-success-rate");
  let devSdkOfflineBuffered = document.getElementById("dev-sdk-offline-buffered");
  let devSdkAdblock = document.getElementById("dev-sdk-adblock");
  let devSdkThroughput = document.getElementById("dev-sdk-throughput");
  let devSdkVersionTableBody = document.querySelector("#dev-sdk-version-table tbody");
  let devQueryEditor = document.getElementById("dev-query-editor");
  let devQueryRunButton = document.getElementById("dev-query-run");
  let devQuerySaveButton = document.getElementById("dev-query-save");
  let devQuerySaved = document.getElementById("dev-query-saved");
  let devQueryMeta = document.getElementById("dev-query-meta");
  let devQueryResults = document.getElementById("dev-query-results");
  let devQueryResultsHead = document.querySelector("#dev-query-results thead");
  let devQueryResultsBody = document.querySelector("#dev-query-results tbody");
  let devQueryFields = document.getElementById("dev-query-fields");
  let devQueryHistory = document.getElementById("dev-query-history");
  let devFlagUserSelect = document.getElementById("dev-flag-user-select");
  let devFlagEnvSelect = document.getElementById("dev-flag-env-select");
  let devFlagCountry = document.getElementById("dev-flag-country");
  let devFlagEvaluateButton = document.getElementById("dev-flag-evaluate");
  let devFlagEvaluationsBody = document.querySelector("#dev-flag-evaluations tbody");
  let devFlagHistory = document.getElementById("dev-flag-history");
  let devIdentityGraph = document.getElementById("dev-identity-graph");
  let devIdentityDuplicates = document.getElementById("dev-identity-duplicates");
  let devIdentityMerges = document.getElementById("dev-identity-merges");
  let devPerfPageload = document.getElementById("dev-perf-pageload");
  let devPerfLcp = document.getElementById("dev-perf-lcp");
  let devPerfCls = document.getElementById("dev-perf-cls");
  let devPerfInp = document.getElementById("dev-perf-inp");
  let devPerfApi = document.getElementById("dev-perf-api");
  let devPerfBundle = document.getElementById("dev-perf-bundle");
  let devPerfRoutes = document.getElementById("dev-perf-routes");
  let devErrorsTableBody = document.querySelector("#dev-errors-table tbody");
  let devErrorTrend = document.getElementById("dev-error-trend");
  let devErrorLatest = document.getElementById("dev-error-latest");
  let devPipelineQueue = document.getElementById("dev-pipeline-queue");
  let devPipelineLatency = document.getElementById("dev-pipeline-latency");
  let devPipelineWebhooks = document.getElementById("dev-pipeline-webhooks");
  let devPipelineRetries = document.getElementById("dev-pipeline-retries");
  let devPipelineWarehouse = document.getElementById("dev-pipeline-warehouse");
  let devPipelineThroughput = document.getElementById("dev-pipeline-throughput");
  let devPipelineLogsBody = document.querySelector("#dev-pipeline-logs tbody");
  let devRetentionDays = document.getElementById("dev-retention-days");
  let devGovernancePiiCount = document.getElementById("dev-governance-pii-count");
  let devGovernanceAuditCount = document.getElementById("dev-governance-audit-count");
  let devGovernanceEnvCount = document.getElementById("dev-governance-env-count");
  let devPiiDetections = document.getElementById("dev-pii-detections");
  let devMaskRules = document.getElementById("dev-mask-rules");
  let devAuditLog = document.getElementById("dev-audit-log");
  let devAccessControls = document.getElementById("dev-access-controls");

  let notificationMutedUntil = 0;
  let PROFILE_STORAGE_KEY = "watchtower_profile_name";
  let ANALYTICS_RANGE_STORAGE_KEY = "watchtower_analytics_range";
  let THEME_STORAGE_KEY = "watchtower_theme_mode";
  let DASHBOARD_MODE_STORAGE_KEY = "watchtower_dashboard_mode";
  let ISSUE_ASSIGNEES_STORAGE_KEY = "watchtower_issue_assignees";
  let DEV_QUERY_SAVED_STORAGE_KEY = "watchtower_dev_saved_queries";
  let TIMEZONE_STORAGE_KEY = "watchtower_timezone";
  let REFRESH_RATE_STORAGE_KEY = "watchtower_refresh_rate";
  let NOTIFICATION_ENABLED_STORAGE_KEY = "watchtower_notification_enabled";
  let NOTIFICATION_VOLUME_STORAGE_KEY = "watchtower_notification_volume";
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
    developerTab: "stream",
    developerInsights: null,
    developerStreamCursor: 0,
    developerStreamHasMore: false,
    developerStreamRows: [],
    selectedDeveloperEvent: null,
    selectedSessionId: "",
    selectedFlagUserId: "",
    savedQueries: [],
    queryHistory: [],
    maxUsers24h: 0
  };
  let developerShortcutPrimedAt = 0;

  function escapeHtml(value) {
    let el = document.createElement("span");
    el.textContent = value == null ? "" : String(value);
    return el.innerHTML;
  }

  function getValidTimestamp(value) {
    let t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }

  function formatClockTime(isoTimestamp) {
    return new Date(isoTimestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatTimestamp(value) {
    if (!value) return "--";
    let ts = getValidTimestamp(value);
    if (ts === null) return "--";
    return new Date(ts).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function formatRelativeAge(value) {
    let ts = getValidTimestamp(value);
    if (ts === null) return "--";
    let seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (seconds < 60) return seconds + "s ago";
    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    let hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    let days = Math.floor(hours / 24);
    return days + "d ago";
  }

  function setProfileStatus(message) {
    if (!profileStatusLine) return;
    profileStatusLine.textContent = message;
  }

  function showToast(message) {
    if (!toastStack) return;
    let toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastStack.appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add("toast-exit");
      window.setTimeout(function () {
        toast.remove();
      }, 180);
    }, 2600);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
  }

  function getEventType(eventRecord) {
    return String((eventRecord && eventRecord.type) || "").toLowerCase();
  }

  function getEventMessage(eventRecord, fallbackMessage) {
    if (eventRecord && eventRecord.data && eventRecord.data.message) {
      return String(eventRecord.data.message);
    }
    return fallbackMessage || "Unknown event";
  }

  function getEventDurationMs(eventRecord) {
    if (!eventRecord || !eventRecord.data) return null;
    let candidates = [
      eventRecord.data.duration,
      eventRecord.data.latency,
      eventRecord.data.p95,
      eventRecord.data.value
    ];
    for (let idx = 0; idx < candidates.length; idx += 1) {
      let parsed = Number(candidates[idx]);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return null;
  }

  function isErrorLikeEvent(eventRecord) {
    if (!eventRecord) return false;

    let eventType = getEventType(eventRecord);
    if (
      eventType === "error" ||
      eventType === "exception" ||
      eventType === "fatal" ||
      eventType.indexOf("error") !== -1
    ) {
      return true;
    }

    let severityText = String(
      (eventRecord.data && (eventRecord.data.severity || eventRecord.data.level || eventRecord.data.status)) || ""
    ).toLowerCase();
    if (
      severityText === "error" ||
      severityText === "critical" ||
      severityText === "fatal" ||
      severityText === "warning"
    ) {
      return true;
    }

    let messageText = String((eventRecord.data && eventRecord.data.message) || "").toLowerCase();
    return /(error|exception|failed|failure|timeout|reject|cannot|unhandled)/.test(messageText);
  }

  function deriveIssueEvents(stats, activityEvents) {
    let recentErrors = Array.isArray(stats && stats.recentErrors) ? stats.recentErrors.slice() : [];
    if (recentErrors.length > 0) {
      return recentErrors.sort(function (leftEvent, rightEvent) {
        return (getValidTimestamp(rightEvent && rightEvent.timestamp) || 0) - (getValidTimestamp(leftEvent && leftEvent.timestamp) || 0);
      });
    }
    return (activityEvents || []).filter(isErrorLikeEvent).sort(function (leftEvent, rightEvent) {
      return (getValidTimestamp(rightEvent && rightEvent.timestamp) || 0) - (getValidTimestamp(leftEvent && leftEvent.timestamp) || 0);
    });
  }

  function calculatePercentile(values, percentile) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    let sortedValues = values.slice().sort(function (leftValue, rightValue) { return leftValue - rightValue; });
    let index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    let boundedIndex = Math.max(0, Math.min(index, sortedValues.length - 1));
    return sortedValues[boundedIndex];
  }

  function formatNotificationTime(dateValue) {
    return dateValue.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function populateTimeSelect(selectElement, defaultValue) {
    if (!selectElement) return;
    for (var h = 0; h < 24; h++) {
      var option = document.createElement("option");
      var hh = String(h).padStart(2, "0");
      option.value = hh + ":00";
      var hour12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
      var suffix = h < 12 ? "AM" : "PM";
      option.textContent = hour12 + ":00 " + suffix;
      if (option.value === defaultValue) option.selected = true;
      selectElement.appendChild(option);
    }
  }

  function saveUiPreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_error) {}
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
    if (notificationEnabledToggle && !notificationEnabledToggle.checked) {
      return "Notifications are disabled.";
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

    viewToggleElements.forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-view") === selectedViewName);
    });

    document.title = "WatchTower - " + selectedViewName.charAt(0).toUpperCase() + selectedViewName.slice(1);
    window.location.hash = selectedViewName;
  }

  function scrollToTarget(targetId) {
    if (!targetId) return;
    let el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initializeViewNavigation() {
    viewToggleElements.forEach(function (el) {
      el.addEventListener("click", function (event) {
        let selectedViewName = el.getAttribute("data-view");
        let scrollTargetId = el.getAttribute("data-scroll-target");

        if (el.tagName === "A") event.preventDefault();
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
    timeRangeButtons.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-range") === uiState.selectedRange);
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

    if (dashboardModePill) dashboardModePill.textContent = resolvedMode === "developer" ? "Developer view" : "Manager view";

    document.querySelectorAll("[data-dashboard-mode]").forEach(function (modePanel) {
      let panelMode = getDashboardModeValue(modePanel.getAttribute("data-dashboard-mode"));
      modePanel.hidden = panelMode !== resolvedMode;
    });
  }

  function initializeDashboardModeControl() {
    let savedMode = loadUiPreference(DASHBOARD_MODE_STORAGE_KEY);
    applyDashboardMode(savedMode || "manager");

    if (!dashboardModePill) return;

    dashboardModePill.addEventListener("click", function (event) {
      event.stopPropagation();
      let nextMode = uiState.dashboardMode === "manager" ? "developer" : "manager";
      applyDashboardMode(nextMode);
      saveUiPreference(DASHBOARD_MODE_STORAGE_KEY, uiState.dashboardMode);
      if (uiState.dashboardMode === "developer") {
        fetchDeveloperStream(false);
      }
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

    timeRangeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        uiState.selectedRange = btn.getAttribute("data-range") || "24h";
        saveUiPreference(ANALYTICS_RANGE_STORAGE_KEY, uiState.selectedRange);
        updateRangeButtonState();
        rerenderIfReady();
      });
    });
  }

  function initializeSettingsAccordions() {
    settingsAccordionButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        let parentSection = btn.closest(".settings-section");
        let shouldOpen = !parentSection.classList.contains("open");

        document.querySelectorAll(".settings-section").forEach(function (sec) {
          let secBtn = sec.querySelector(".settings-trigger");
          sec.classList.remove("open");
          if (secBtn) secBtn.setAttribute("aria-expanded", "false");
        });

        parentSection.classList.toggle("open", shouldOpen);
        btn.setAttribute("aria-expanded", String(shouldOpen));
      });
    });
  }

  function initializeIssueControls() {
    if (!issueListContainer) return;

    let storedAssignees = loadUiPreference(ISSUE_ASSIGNEES_STORAGE_KEY);
    if (storedAssignees) {
      try {
        let parsed = JSON.parse(storedAssignees);
        if (Array.isArray(parsed) && parsed.length > 0) {
          uiState.issueAssignees = parsed.filter(function (name) {
            return typeof name === "string" && name.trim() !== "";
          });
        }
      } catch (_error) {}
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
      { element: issueFilterRouteInput, key: "issueFilterRoute" }
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

    if (devLatencyThresholdInput) {
      devLatencyThresholdInput.addEventListener("input", function () {
        drawDevLatencyChart();
      });
    }

    window.addEventListener("resize", function () {
      drawDevLatencyChart();
    });

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

    if (issueExportCsvButton) {
      issueExportCsvButton.addEventListener("click", exportFilteredIssuesCsv);
    }

    issueListContainer.addEventListener("change", function (event) {
      let selectControl = event.target.closest("select");
      if (!selectControl) return;

      let issueId = selectControl.getAttribute("data-issue-id") || "";
      let selectedValue = selectControl.value;

      if (selectedValue === "__add_new__") {
        selectControl.value = uiState.issueAssignments[issueId] || "";
        setProfileStatus("Add teammate requires write access rules. Modify configuration arrays directly.");
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

  function getDeveloperStreamFilters() {
    return {
      eventName: devFilterEvent ? devFilterEvent.value.trim() : "",
      user: devFilterUser ? devFilterUser.value.trim() : "",
      session: devFilterSession ? devFilterSession.value.trim() : "",
      environment: devFilterEnvironment ? devFilterEnvironment.value.trim() : "",
      sdkVersion: devFilterSdk ? devFilterSdk.value.trim() : "",
      dateFrom: devFilterDateFrom && devFilterDateFrom.value ? new Date(devFilterDateFrom.value).toISOString() : "",
      dateTo: devFilterDateTo && devFilterDateTo.value ? new Date(devFilterDateTo.value).toISOString() : "",
      search: devFilterSearch ? devFilterSearch.value.trim() : ""
    };
  }

  function getDeveloperTabValue(value) {
    let tabs = ["stream", "schema", "replay", "sdk", "query", "flags", "identity", "performance", "errors", "pipeline", "governance"];
    return tabs.indexOf(value) === -1 ? "stream" : value;
  }

  function activateDeveloperTab(tabName) {
    let resolved = getDeveloperTabValue(tabName);
    uiState.developerTab = resolved;

    developerTabButtons.forEach(function (btn) {
      let isAct = btn.getAttribute("data-devtab") === resolved;
      btn.classList.toggle("active", isAct);
      btn.setAttribute("aria-selected", isAct ? "true" : "false");
    });

    developerTabPanels.forEach(function (panel) {
      let isAct = panel.getAttribute("data-devtab-panel") === resolved;
      panel.hidden = !isAct;
      panel.classList.toggle("active", isAct);
    });
  }

  function highlightJsonPayload(jsonValue) {
    let jsonText = escapeHtml(JSON.stringify(jsonValue || {}, null, 2));
    return jsonText
      .replace(/(&quot;.*?&quot;)(?=\s*:)/g, '<span class="json-key">$1</span>')
      .replace(/(:\s*)(&quot;.*?&quot;)/g, '$1<span class="json-string">$2</span>')
      .replace(/(:\s*)(-?\d+(?:\.\d+)?)/g, '$1<span class="json-number">$2</span>')
      .replace(/(:\s*)(true|false)/g, '$1<span class="json-boolean">$2</span>')
      .replace(/(:\s*)(null)/g, '$1<span class="json-null">$2</span>');
  }

  function updateDeveloperEventInspector(eventRecord) {
    uiState.selectedDeveloperEvent = eventRecord || null;
    if (!devEventMeta || !devEventJson) return;

    if (!eventRecord) {
      devEventMeta.innerHTML =
        "<div><dt>Event</dt><dd>None selected</dd></div>" +
        "<div><dt>Session</dt><dd>-</dd></div>" +
        "<div><dt>User</dt><dd>-</dd></div>" +
        "<div><dt>Latency</dt><dd>-</dd></div>" +
        "<div><dt>Ingested</dt><dd>-</dd></div>";
      devEventJson.textContent = "{}";
      return;
    }

    devEventMeta.innerHTML =
      "<div><dt>Event</dt><dd>" + escapeHtml(eventRecord.eventName || eventRecord.type || "unknown") + "</dd></div>" +
      "<div><dt>Session</dt><dd>" + escapeHtml(eventRecord.sessionId || "-") + "</dd></div>" +
      "<div><dt>User</dt><dd>" + escapeHtml(eventRecord.userId || "anonymous") + "</dd></div>" +
      "<div><dt>Latency</dt><dd>" + escapeHtml(String(eventRecord.ingestionLatencyMs == null ? "--" : eventRecord.ingestionLatencyMs + " ms")) + "</dd></div>" +
      "<div><dt>Ingested</dt><dd>" + escapeHtml(formatTimestamp(eventRecord.receivedAt || eventRecord.timestamp)) + "</dd></div>";

    devEventJson.innerHTML = highlightJsonPayload(eventRecord.raw || eventRecord);
  }

  function renderDeveloperStreamRows() {
    if (!devStreamList) return;

    if (!uiState.developerStreamRows || uiState.developerStreamRows.length === 0) {
      devStreamList.innerHTML = '<div class="empty-state compact">No events matched these stream filters.</div>';
      updateDeveloperEventInspector(null);
      return;
    }

    let selectedId = uiState.selectedDeveloperEvent ? uiState.selectedDeveloperEvent.id : "";
    if (selectedId && !uiState.developerStreamRows.some(function (row) { return row.id === selectedId; })) {
      selectedId = "";
      uiState.selectedDeveloperEvent = null;
    }

    devStreamList.innerHTML = uiState.developerStreamRows.map(function (eventRecord, index) {
      let isActive = selectedId && selectedId === eventRecord.id;
      return (
        '<article class="dev-stream-row' + (isActive ? " active" : "") + '" tabindex="0" data-event-index="' + index + '">' +
        '<span class="dev-stream-index">' + (index + 1) + "</span>" +
        '<div class="dev-stream-main">' +
        "<strong>" + escapeHtml(eventRecord.eventName || eventRecord.type || "unknown") + "</strong>" +
        "<p>" + escapeHtml(eventRecord.route || "/") + " • " + escapeHtml(formatRelativeAge(eventRecord.timestamp)) + "</p>" +
        '<div class="dev-stream-badges">' +
        "<span>" + escapeHtml(eventRecord.environment || "production") + "</span>" +
        "<span>" + escapeHtml(eventRecord.sdkVersion || "unknown") + "</span>" +
        "<span>" + escapeHtml(eventRecord.deployVersion || "unknown") + "</span>" +
        "</div>" +
        "</div>" +
        '<span class="dev-stream-latency">' + escapeHtml(String(eventRecord.ingestionLatencyMs == null ? "--" : eventRecord.ingestionLatencyMs + "ms")) + "</span>" +
        "</article>"
      );
    }).join("");

    if (!selectedId && uiState.developerStreamRows.length > 0) {
      updateDeveloperEventInspector(uiState.developerStreamRows[0]);
      renderDeveloperStreamRows();
    }
  }

  function updateDeveloperStreamMeta(payload) {
    if (!devStreamMeta) return;
    let total = payload && typeof payload.total === "number" ? payload.total : uiState.developerStreamRows.length;
    devStreamMeta.textContent = "Showing " + uiState.developerStreamRows.length + " of " + total + " matching events.";
  }

  function fetchDeveloperStream(appendOlder) {
    if (!devStreamList) return Promise.resolve();

    let filters = getDeveloperStreamFilters();
    let params = new URLSearchParams();

    Object.keys(filters).forEach(function (k) {
      if (!filters[k]) return;
      params.set(k, filters[k]);
    });

    params.set("limit", "80");
    params.set("cursor", String(appendOlder ? uiState.developerStreamCursor : 0));

    return fetch("/api/developer/stream?" + params.toString())
      .then(function (res) { return res.json(); })
      .then(function (payload) {
        let rows = Array.isArray(payload.events) ? payload.events : [];
        if (appendOlder) {
          uiState.developerStreamRows = uiState.developerStreamRows.concat(rows);
        } else {
          uiState.developerStreamRows = rows;
        }

        uiState.developerStreamCursor = payload.nextCursor == null ? uiState.developerStreamRows.length : Number(payload.nextCursor);
        if (devStreamLoadMoreButton) {
          devStreamLoadMoreButton.hidden = payload.nextCursor == null;
        }

        updateDeveloperStreamMeta(payload);
        renderDeveloperStreamRows();
      })
      .catch(function () {
        if (devStreamMeta) devStreamMeta.textContent = "Developer real-time stream unavailable.";
      });
  }

  function renderSchemaRegistry(insights) {
    if (!devSchemaTableBody || !devSchemaPropertiesBody) return;

    let schemas = insights && Array.isArray(insights.schemaRegistry) ? insights.schemaRegistry : [];
    if (schemas.length === 0) {
      devSchemaTableBody.innerHTML = '<tr><td colspan="6">No inferred schemas yet.</td></tr>';
      devSchemaPropertiesBody.innerHTML = '<tr><td colspan="5">Waiting for property samples.</td></tr>';
      return;
    }

    devSchemaTableBody.innerHTML = schemas.slice(0, 30).map(function (schema) {
      return (
        "<tr>" +
        "<td><code>" + escapeHtml(schema.eventName) + "</code></td>" +
        "<td>" + escapeHtml(String(schema.volume || 0)) + "</td>" +
        "<td>" + escapeHtml(String((schema.schemaDriftProperties || []).length)) + "</td>" +
        "<td>" + escapeHtml(String(schema.malformedEvents || 0)) + "</td>" +
        "<td>" + escapeHtml(formatTimestamp(schema.firstSeen)) + "</td>" +
        "<td>" + escapeHtml(formatTimestamp(schema.lastSeen)) + "</td>" +
        "</tr>"
      );
    }).join("");

    let propertyRows = [];
    schemas.slice(0, 15).forEach(function (schema) {
      (schema.properties || []).slice(0, 12).forEach(function (prop) {
        propertyRows.push({
          eventName: schema.eventName,
          path: prop.path,
          types: prop.types || [],
          coveragePct: prop.coveragePct || 0,
          drift: Boolean(prop.drift)
        });
      });
    });

    devSchemaPropertiesBody.innerHTML = propertyRows.map(function (row) {
      return (
        "<tr>" +
        "<td><code>" + escapeHtml(row.eventName) + "</code></td>" +
        "<td><code>" + escapeHtml(row.path) + "</code></td>" +
        "<td>" + escapeHtml(row.types.join(", ")) + "</td>" +
        "<td>" + escapeHtml(row.coveragePct + "%") + "</td>" +
        "<td>" + escapeHtml(row.drift ? "Drift detected" : "Stable") + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderSessionReplay(insights) {
    if (!devSessionList || !devSessionTimeline || !devSessionFailures || !devSessionFlags) return;

    let replay = insights && insights.sessionReplay ? insights.sessionReplay : { sessions: [] };
    let sessions = Array.isArray(replay.sessions) ? replay.sessions : [];
    if (devSessionMeta) devSessionMeta.textContent = sessions.length + " sessions in replay buffer.";

    if (sessions.length === 0) {
      devSessionList.innerHTML = '<li><span>No sessions yet</span><strong>0</strong></li>';
      devSessionTimeline.innerHTML = '<li><span class="timeline-time">--:--</span><span class="timeline-copy">No timeline available.</span></li>';
      devSessionFailures.innerHTML = '<li><span>No failures</span><strong>0</strong></li>';
      devSessionFlags.innerHTML = '<li><span>No flags</span><strong>0</strong></li>';
      return;
    }

    if (!uiState.selectedSessionId || !sessions.some(function (s) { return s.sessionId === uiState.selectedSessionId; })) {
      uiState.selectedSessionId = sessions[0].sessionId;
    }

    devSessionList.innerHTML = sessions.slice(0, 40).map(function (s) {
      let isSelected = s.sessionId === uiState.selectedSessionId;
      return (
        '<li data-session-id="' + escapeHtml(s.sessionId) + '"' + (isSelected ? ' class="active-session"' : "") + ">" +
        "<span>" + escapeHtml(s.userId || s.sessionId.slice(0, 12)) + "</span>" +
        "<strong>" + escapeHtml(String(s.eventCount || 0)) + "</strong>" +
        "</li>"
      );
    }).join("");

    let activeSession = sessions.find(function (s) { return s.sessionId === uiState.selectedSessionId; }) || sessions[0];
    if (devSessionSelected) {
      devSessionSelected.textContent = "Session " + activeSession.sessionId + " • " + (activeSession.userId || "anonymous");
    }

    devSessionFailures.innerHTML =
      '<li><span>Console errors</span><strong>' + escapeHtml(String(activeSession.consoleErrorCount || 0)) + "</strong></li>" +
      '<li><span>Network failures</span><strong>' + escapeHtml(String(activeSession.networkFailureCount || 0)) + "</strong></li>";

    let flags = activeSession.featureFlags || [];
    if (flags.length === 0) {
      devSessionFlags.innerHTML = '<li><span>No active flags</span><strong>0</strong></li>';
    } else {
      devSessionFlags.innerHTML = flags.map(function (f) {
        return '<li><span>' + escapeHtml(f) + '</span><strong>ON</strong></li>';
      }).join("");
    }

    let timeline = activeSession.timeline || [];
    if (timeline.length === 0) {
      devSessionTimeline.innerHTML = '<li><span class="timeline-time">--:--</span><span class="timeline-copy">No sequential timeline tracks.</span></li>';
    } else {
      devSessionTimeline.innerHTML = timeline.slice(-40).map(function (item) {
        return (
          "<li>" +
          '<span class="timeline-time">' + escapeHtml(formatClockTime(item.timestamp)) + "</span>" +
          '<span class="timeline-copy">' + escapeHtml(item.eventName + " on " + (item.route || "/")) + "</span>" +
          "</li>"
        );
      }).join("");
    }
  }

  function renderSdkDiagnostics(insights) {
    let sdk = insights && insights.sdkDiagnostics ? insights.sdkDiagnostics : {};
    if (devSdkDropped) devSdkDropped.textContent = String(sdk.droppedEvents || 0);
    if (devSdkRetryHealth) devSdkRetryHealth.textContent = String(sdk.retryQueueHealth || "stable");
    if (devSdkSuccessRate) devSdkSuccessRate.textContent = String(sdk.deliverySuccessRate == null ? 100 : sdk.deliverySuccessRate) + "%";
    if (devSdkOfflineBuffered) devSdkOfflineBuffered.textContent = String(sdk.offlineBufferedEvents || 0);
    if (devSdkAdblock) devSdkAdblock.textContent = sdk.adblockDetected ? "Yes" : "No";
    if (devSdkThroughput) devSdkThroughput.textContent = String(sdk.throughputPerMinute || 0);

    if (!devSdkVersionTableBody) return;
    let adoption = Array.isArray(sdk.sdkVersionAdoption) ? sdk.sdkVersionAdoption : [];
    if (adoption.length === 0) {
      devSdkVersionTableBody.innerHTML = '<tr><td colspan="2">No tracking vectors logged.</td></tr>';
      return;
    }
    devSdkVersionTableBody.innerHTML = adoption.map(function (r) {
      return "<tr><td><code>" + escapeHtml(r.sdkVersion || "unknown") + "</code></td><td>" + escapeHtml(String(r.eventVolume || 0)) + "</td></tr>";
    }).join("");
  }

  function syncSavedDeveloperQueries() {
    if (!devQuerySaved) return;
    let saved = uiState.savedQueries || [];
    devQuerySaved.innerHTML = ['<option value="">Saved queries</option>']
      .concat(saved.map(function (qText, idx) {
        return '<option value="' + idx + '">' + escapeHtml(qText.slice(0, 58)) + "</option>";
      })).join("");
  }

  function renderQueryTable(result) {
    if (!devQueryResultsHead || !devQueryResultsBody) return;
    let columns = result && Array.isArray(result.columns) ? result.columns : [];
    let rows = result && Array.isArray(result.rows) ? result.rows : [];

    if (columns.length === 0) {
      devQueryResultsHead.innerHTML = "";
      devQueryResultsBody.innerHTML = '<tr><td>Dataset empty.</td></tr>';
      return;
    }

    devQueryResultsHead.innerHTML = "<tr>" + columns.map(function (c) {
      return "<th>" + escapeHtml(c) + "</th>";
    }).join("") + "</tr>";

    devQueryResultsBody.innerHTML = rows.map(function (r) {
      return "<tr>" + columns.map(function (c) {
        return "<td>" + escapeHtml(r[c] == null ? "" : String(r[c])) + "</td>";
      }).join("") + "</tr>";
    }).join("");
  }

  function renderQueryExplorer(insights) {
    let explorer = insights && insights.queryExplorer ? insights.queryExplorer : {};
    let fields = Array.isArray(explorer.fields) ? explorer.fields : [];

    if (devQueryFields) {
      if (fields.length === 0) {
        devQueryFields.innerHTML = '<li><span>Schema unmapped</span><strong>0</strong></li>';
      } else {
        devQueryFields.innerHTML = fields.slice(0, 48).map(function (f) {
          return '<li><span><code>' + escapeHtml(f) + '</code></span><strong>field</strong></li>';
        }).join("");
      }
    }

    if (!devQueryHistory) return;
    if (uiState.queryHistory.length === 0) {
      devQueryHistory.innerHTML = '<li><span>No metrics loaded</span><strong>--</strong></li>';
      return;
    }
    devQueryHistory.innerHTML = uiState.queryHistory.slice(0, 16).map(function (h) {
      return '<li><span>' + escapeHtml(h.query.slice(0, 40)) + '</span><strong>' + escapeHtml(h.status) + "</strong></li>";
    }).join("");
  }

  function runDeveloperQuery(queryText) {
    if (!queryText) return Promise.resolve();

    if (devQueryMeta) devQueryMeta.textContent = "Running query...";
    return fetch("/api/developer/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryText })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || result.data.error) {
          if (devQueryMeta) devQueryMeta.textContent = result.data.error || "Execution fault.";
          uiState.queryHistory.unshift({ query: queryText, status: "error" });
          renderQueryExplorer(uiState.developerInsights || {});
          return;
        }

        renderQueryTable(result.data);
        if (devQueryMeta) {
          devQueryMeta.textContent = "Returned " + result.data.rowCount + " rows in " + result.data.durationMs + " ms.";
        }
        uiState.queryHistory.unshift({ query: queryText, status: "ok " + result.data.durationMs + "ms" });
        renderQueryExplorer(uiState.developerInsights || {});
      })
      .catch(function () {
        if (devQueryMeta) devQueryMeta.textContent = "Asynchronous transport error.";
      });
  }

  function renderFeatureFlagDebugger(insights) {
    let flags = insights && insights.featureFlags ? insights.featureFlags : {};
    let evaluations = Array.isArray(flags.evaluations) ? flags.evaluations : [];
    let exposure = Array.isArray(flags.exposureHistory) ? flags.exposureHistory : [];

    if (devFlagUserSelect) {
      if (!uiState.selectedFlagUserId || !evaluations.some(function (e) { return e.userId === uiState.selectedFlagUserId; })) {
        uiState.selectedFlagUserId = evaluations[0] ? evaluations[0].userId : "";
      }
      devFlagUserSelect.innerHTML = evaluations.map(function (e) {
        let sel = e.userId === uiState.selectedFlagUserId ? ' selected' : "";
        return '<option value="' + escapeHtml(e.userId) + '"' + sel + ">" + escapeHtml(e.userId) + "</option>";
      }).join("");
    }

    let activeEval = evaluations.find(function (e) { return e.userId === uiState.selectedFlagUserId; }) || evaluations[0];
    let rows = activeEval ? activeEval.flags || [] : [];

    if (devFlagEvaluationsBody) {
      if (rows.length === 0) {
        devFlagEvaluationsBody.innerHTML = '<tr><td colspan="4">No matrix evaluations logged.</td></tr>';
      } else {
        devFlagEvaluationsBody.innerHTML = rows.map(function (r) {
          return (
            "<tr>" +
            "<td><code>" + escapeHtml(r.key) + "</code></td>" +
            "<td>" + escapeHtml(String(r.rolloutPercent || 0)) + "%</td>" +
            "<td>" + escapeHtml(r.matched ? "Enabled" : "Disabled") + "</td>" +
            "<td>" + escapeHtml((r.reasons || []).join(" • ")) + "</td>" +
            "</tr>"
          );
        }).join("");
      }
    }

    if (devFlagHistory) {
      if (exposure.length === 0) {
        devFlagHistory.innerHTML = '<li><span>No exposures tracked</span><strong>0</strong></li>';
      } else {
        devFlagHistory.innerHTML = exposure.slice(0, 24).map(function (e) {
          return '<li><span>' + escapeHtml(e.userId + " • " + e.eventName) + '</span><strong>' + escapeHtml(formatRelativeAge(e.timestamp)) + "</strong></li>";
        }).join("");
      }
    }
  }

  function renderIdentityGraph(insights) {
    let identity = insights && insights.identityResolution ? insights.identityResolution : {};
    let nodes = Array.isArray(identity.nodes) ? identity.nodes.slice(0, 18) : [];
    let edges = Array.isArray(identity.edges) ? identity.edges.slice(0, 36) : [];

    if (devIdentityGraph) {
      if (nodes.length === 0) {
        devIdentityGraph.innerHTML = '<text x="20" y="30" fill="var(--text-muted)">No entities bound.</text>';
      } else {
        let nodeIndexMap = {};
        let userNodes = nodes.filter(function (n) { return n.type === "user"; });
        let anonNodes = nodes.filter(function (n) { return n.type !== "user"; });
        let yTop = 72;
        let yBottom = 178;

        anonNodes.forEach(function (node, idx) {
          nodeIndexMap[node.id] = {
            x: 70 + idx * Math.max(40, Math.floor(820 / Math.max(1, anonNodes.length))),
            y: yBottom,
            node: node
          };
        });
        userNodes.forEach(function (node, idx) {
          nodeIndexMap[node.id] = {
            x: 70 + idx * Math.max(40, Math.floor(820 / Math.max(1, userNodes.length))),
            y: yTop,
            node: node
          };
        });

        let edgeSvg = edges.map(function (e) {
          let from = nodeIndexMap[e.from];
          let to = nodeIndexMap[e.to];
          if (!from || !to) return "";
          return '<line class="edge" x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '"></line>';
        }).join("");

        let nodeSvg = Object.keys(nodeIndexMap).map(function (nId) {
          let entry = nodeIndexMap[nId];
          let cName = entry.node.type === "user" ? "node-user" : "node-anon";
          return (
            '<circle class="' + cName + '" cx="' + entry.x + '" cy="' + entry.y + '" r="12"></circle>' +
            '<text x="' + entry.x + '" y="' + (entry.y + 22) + '" text-anchor="middle" font-size="11">' + escapeHtml(entry.node.label || nId) + "</text>"
          );
        }).join("");

        devIdentityGraph.innerHTML = edgeSvg + nodeSvg;
      }
    }

    if (devIdentityDuplicates) {
      let dups = Array.isArray(identity.duplicateIdentities) ? identity.duplicateIdentities : [];
      devIdentityDuplicates.innerHTML = dups.length === 0
        ? '<li><span>No tracking collisions</span><strong>clear</strong></li>'
        : dups.slice(0, 20).map(function (e) {
            return '<li><span>' + escapeHtml(e.sessionId + " maps onto multiple profiles") + '</span><strong>' + escapeHtml(String(e.users.length)) + "</strong></li>";
          }).join("");
    }
  }

  function renderPerformanceMonitoring(insights) {
    let performance = insights && insights.performance ? insights.performance : {};
    if (devPerfPageload) devPerfPageload.textContent = String((performance.pageLoad && performance.pageLoad.p95) || 0) + " ms";
    if (devPerfLcp) devPerfLcp.textContent = String((performance.lcp && performance.lcp.p95) || 0) + " ms";
    if (devPerfCls) devPerfCls.textContent = String((performance.cls && performance.cls.p95) || 0);
    if (devPerfInp) devPerfInp.textContent = String((performance.inp && performance.inp.p95) || 0) + " ms";
    if (devPerfApi) devPerfApi.textContent = String((performance.apiLatencyMs && performance.apiLatencyMs.p95) || 0) + " ms";
    if (devPerfBundle) devPerfBundle.textContent = String((performance.jsBundleCostKb && performance.jsBundleCostKb.p95) || 0) + " KB";

    if (!devPerfRoutes) return;
    let stats = [
      { label: "Page load tracking loops", value: (performance.pageLoad && performance.pageLoad.sampleCount) || 0 },
      { label: "LCP visual snapshots", value: (performance.lcp && performance.lcp.sampleCount) || 0 },
      { label: "CLS tracking dimensions", value: (performance.cls && performance.cls.sampleCount) || 0 },
      { label: "INP user execution latency", value: (performance.inp && performance.inp.sampleCount) || 0 },
      { label: "API system network samples", value: (performance.apiLatencyMs && performance.apiLatencyMs.sampleCount) || 0 }
    ];
    devPerfRoutes.innerHTML = stats.map(function (s) {
      return '<li><span>' + escapeHtml(s.label) + '</span><strong>' + escapeHtml(String(s.value)) + "</strong></li>";
    }).join("");
  }

  function renderErrorMonitoring(insights) {
    let monitoring = insights && insights.errorMonitoring ? insights.errorMonitoring : {};
    let groupedErrors = Array.isArray(monitoring.groupedErrors) ? monitoring.groupedErrors : [];
    let trend = Array.isArray(monitoring.trend) ? monitoring.trend : [];
    let latest = Array.isArray(monitoring.latest) ? monitoring.latest : [];

    if (devErrorsTableBody) {
      if (groupedErrors.length === 0) {
        devErrorsTableBody.innerHTML = '<tr><td colspan="5">No runtime error groups detected.</td></tr>';
      } else {
        devErrorsTableBody.innerHTML = groupedErrors.slice(0, 40).map(function (errorGroup) {
          return (
            "<tr>" +
            "<td><code>" + escapeHtml(errorGroup.signature || "Runtime error") + "</code></td>" +
            "<td>" + escapeHtml(String(errorGroup.count || 0)) + "</td>" +
            "<td>" + escapeHtml(String(errorGroup.affectedUsers || errorGroup.affectedSessions || 0)) + "</td>" +
            "<td>" + escapeHtml(errorGroup.release || "unknown") + "</td>" +
            "<td>" + escapeHtml(formatRelativeAge(errorGroup.lastSeen)) + "</td>" +
            "</tr>"
          );
        }).join("");
      }
    }

    if (devErrorTrend) {
      devErrorTrend.innerHTML = trend.length === 0
        ? '<li><span>No error trend buckets</span><strong>0</strong></li>'
        : trend.slice(-12).map(function (bucket) {
            return '<li><span>' + escapeHtml(bucket.bucket || "unknown") + '</span><strong>' + escapeHtml(String(bucket.count || 0)) + "</strong></li>";
          }).join("");
    }

    if (devErrorLatest) {
      devErrorLatest.innerHTML = latest.length === 0
        ? '<li><span>No stack traces captured</span><strong>clear</strong></li>'
        : latest.slice(0, 8).map(function (eventRecord) {
            let message = eventRecord.data && eventRecord.data.message ? eventRecord.data.message : eventRecord.eventName;
            return '<li><span>' + escapeHtml(message || "Runtime error") + '</span><strong>' + escapeHtml(eventRecord.deployVersion || "unknown") + "</strong></li>";
          }).join("");
    }
  }

  function renderPipelineObservability(insights) {
    let pipe = insights && insights.pipeline ? insights.pipeline : {};
    if (devPipelineQueue) devPipelineQueue.textContent = String(pipe.queueDepth || 0);
    if (devPipelineLatency) devPipelineLatency.textContent = String((pipe.processingLatencyMs && pipe.processingLatencyMs.p95) || 0) + " ms";
    if (devPipelineWebhooks) devPipelineWebhooks.textContent = String(pipe.webhookFailures || 0);
    if (devPipelineRetries) devPipelineRetries.textContent = String(pipe.retryAttempts || 0);
    if (devPipelineWarehouse) devPipelineWarehouse.textContent = pipe.warehouseSync && pipe.warehouseSync.status ? pipe.warehouseSync.status : "unknown";
    if (devPipelineThroughput) devPipelineThroughput.textContent = String(pipe.throughputPerMinute || 0) + "/min";

    if (!devPipelineLogsBody) return;
    let logs = Array.isArray(pipe.destinationLogs) ? pipe.destinationLogs : [];
    if (logs.length === 0) {
      devPipelineLogsBody.innerHTML = '<tr><td colspan="4">No downstream tracking anomalies.</td></tr>';
      return;
    }
    devPipelineLogsBody.innerHTML = logs.slice(0, 40).map(function (e) {
      return (
        "<tr>" +
        "<td>" + escapeHtml(formatTimestamp(e.timestamp)) + "</td>" +
        "<td>" + escapeHtml(e.channel || "unknown") + "</td>" +
        "<td>" + escapeHtml(e.status || "ok") + "</td>" +
        "<td>" + escapeHtml(e.message || "") + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderGovernance(insights) {
    let gov = insights && insights.governance ? insights.governance : {};
    let pii = Array.isArray(gov.piiDetections) ? gov.piiDetections : [];
    let rules = Array.isArray(gov.maskingRules) ? gov.maskingRules : [];

    if (devRetentionDays) devRetentionDays.textContent = String(gov.retentionDays || 30) + " days";
    if (devGovernancePiiCount) devGovernancePiiCount.textContent = String(pii.length);
    if (devGovernanceAuditCount) devGovernanceAuditCount.textContent = String((gov.auditLogs || []).length);
    if (devGovernanceEnvCount) devGovernanceEnvCount.textContent = String((gov.environments || []).length);

    if (devPiiDetections) {
      devPiiDetections.innerHTML = pii.length === 0
        ? '<li><span>PII filters scanning...</span><strong>clear</strong></li>'
        : pii.slice(0, 24).map(function (e) {
            return '<li><span>Unmasked payload token: <code>' + escapeHtml(e.field) + '</code></span><strong>' + escapeHtml(e.signal) + "</strong></li>";
          }).join("");
    }

    if (devMaskRules && rules.length > 0) {
      devMaskRules.innerHTML = rules.map(function (r) {
        return '<li><span>' + escapeHtml(r.field) + '</span><strong>' + escapeHtml(r.action) + "</strong></li>";
      }).join("");
    }

    if (devAuditLog) {
      let auditLogs = Array.isArray(gov.auditLogs) ? gov.auditLogs : [];
      devAuditLog.innerHTML = auditLogs.length === 0
        ? '<li><span>No audit activity</span><strong>0</strong></li>'
        : auditLogs.slice(0, 16).map(function (entry) {
            return '<li><span>' + escapeHtml(entry.action || "audit") + '</span><strong>' + escapeHtml(formatRelativeAge(entry.timestamp)) + "</strong></li>";
          }).join("");
    }

    if (devAccessControls) {
      let accessControls = Array.isArray(gov.accessControls) ? gov.accessControls : [];
      devAccessControls.innerHTML = accessControls.length === 0
        ? '<li><span>No roles configured</span><strong>0</strong></li>'
        : accessControls.map(function (role) {
            return '<li><span>' + escapeHtml(role.role) + '</span><strong>' + escapeHtml(role.scope) + "</strong></li>";
          }).join("");
    }
  }

  function renderDeveloperWorkbench(insights) {
    uiState.developerInsights = insights || null;
    if (!insights) return;

    renderSchemaRegistry(insights);
    renderSessionReplay(insights);
    renderSdkDiagnostics(insights);
    renderQueryExplorer(insights);
    renderFeatureFlagDebugger(insights);
    renderIdentityGraph(insights);
    renderPerformanceMonitoring(insights);
    renderErrorMonitoring(insights);
    renderPipelineObservability(insights);
    renderGovernance(insights);
  }


  function initializeDeveloperWorkbench() {
    if (developerTabButtons.length === 0) return;

    let saved = loadUiPreference(DEV_QUERY_SAVED_STORAGE_KEY);
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) uiState.savedQueries = parsed;
      } catch (_e) {}
    }

    syncSavedDeveloperQueries();
    activateDeveloperTab(uiState.developerTab);

    developerTabButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateDeveloperTab(btn.getAttribute("data-devtab"));
      });
    });

    if (devStreamApplyButton) {
      devStreamApplyButton.addEventListener("click", function () { fetchDeveloperStream(false); });
    }
    if (devStreamResetButton) {
      devStreamResetButton.addEventListener("click", function () {
        [devFilterEvent, devFilterUser, devFilterSession, devFilterEnvironment, devFilterSdk, devFilterDateFrom, devFilterDateTo, devFilterSearch]
          .forEach(function (el) { if (el) el.value = ""; });
        fetchDeveloperStream(false);
      });
    }
    if (devStreamLoadMoreButton) {
      devStreamLoadMoreButton.addEventListener("click", function () { fetchDeveloperStream(true); });
    }

    if (devStreamList) {
      devStreamList.addEventListener("click", function (event) {
        let row = event.target.closest(".dev-stream-row");
        if (!row) return;
        let idx = Number(row.getAttribute("data-event-index") || -1);
        if (idx >= 0 && uiState.developerStreamRows[idx]) {
          updateDeveloperEventInspector(uiState.developerStreamRows[idx]);
          renderDeveloperStreamRows();
        }
      });
    }

    if (devSessionList) {
      devSessionList.addEventListener("click", function (event) {
        let row = event.target.closest("li[data-session-id]");
        if (!row) return;
        uiState.selectedSessionId = row.getAttribute("data-session-id") || "";
        renderSessionReplay(uiState.developerInsights || {});
      });
    }

    if (devCopyJsonButton) {
      devCopyJsonButton.addEventListener("click", function () {
        if (!uiState.selectedDeveloperEvent) return;
        let raw = uiState.selectedDeveloperEvent.raw || uiState.selectedDeveloperEvent;
        navigator.clipboard.writeText(JSON.stringify(raw, null, 2)).then(function () {
          devCopyJsonButton.textContent = "Copied";
          setTimeout(function () { devCopyJsonButton.textContent = "Copy JSON"; }, 1000);
        });
      });
    }

    if (devQueryRunButton && devQueryEditor) {
      devQueryRunButton.addEventListener("click", function () { runDeveloperQuery(devQueryEditor.value.trim()); });
    }

    if (devQuerySaveButton && devQueryEditor) {
      devQuerySaveButton.addEventListener("click", function () {
        let qText = devQueryEditor.value.trim();
        if (qText && uiState.savedQueries.indexOf(qText) === -1) {
          uiState.savedQueries.unshift(qText);
          saveUiPreference(DEV_QUERY_SAVED_STORAGE_KEY, JSON.stringify(uiState.savedQueries));
          syncSavedDeveloperQueries();
        }
      });
    }

    if (devQuerySaved && devQueryEditor) {
      devQuerySaved.addEventListener("change", function () {
        let idx = Number(devQuerySaved.value);
        if (Number.isFinite(idx) && idx >= 0 && uiState.savedQueries[idx]) {
          devQueryEditor.value = uiState.savedQueries[idx];
        }
      });
    }

    if (devFlagUserSelect) {
      devFlagUserSelect.addEventListener("change", function () {
        uiState.selectedFlagUserId = devFlagUserSelect.value;
        renderFeatureFlagDebugger(uiState.developerInsights || {});
      });
    }

    if (devFlagEvaluateButton) {
      devFlagEvaluateButton.addEventListener("click", function () {
        let payload = {
          userId: devFlagUserSelect ? devFlagUserSelect.value : "",
          environment: devFlagEnvSelect ? devFlagEnvSelect.value : "production",
          country: devFlagCountry ? devFlagCountry.value.trim() : "US"
        };
        fetch("/api/developer/feature-flags/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (!devFlagEvaluationsBody) return;
            let rows = Array.isArray(data.flags) ? data.flags : [];
            devFlagEvaluationsBody.innerHTML = rows.map(function (r) {
              return (
                "<tr>" +
                "<td><code>" + escapeHtml(r.key) + "</code></td>" +
                "<td>" + escapeHtml(String(r.rolloutPercent || 0)) + "%</td>" +
                "<td>" + escapeHtml(r.matched ? "Enabled" : "Disabled") + "</td>" +
                "<td>" + escapeHtml((r.reasons || []).join(" • ")) + "</td>" +
                "</tr>"
              );
            }).join("");
          });
      });
    }

    document.addEventListener("keydown", function (event) {
      let tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
      let isForm = tag === "input" || tag === "textarea" || tag === "select";

      if (event.key === "/" && !isForm && devFilterSearch) {
        event.preventDefault();
        devFilterSearch.focus();
        return;
      }
      if (event.key.toLowerCase() === "g" && !isForm) {
        developerShortcutPrimedAt = Date.now();
        return;
      }
      if (developerShortcutPrimedAt && Date.now() - developerShortcutPrimedAt < 900) {
        if (event.key.toLowerCase() === "s") activateDeveloperTab("stream");
        else if (event.key.toLowerCase() === "q") activateDeveloperTab("query");
        developerShortcutPrimedAt = 0;
      }
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
      let currentMode = darkModeToggle.checked;
      document.body.classList.toggle("dark-mode", currentMode);
      applyThemeLogo(currentMode);
      saveUiPreference(THEME_STORAGE_KEY, currentMode ? "dark" : "light");
    });
  }

  function initializeTimezoneControl() {
    if (!timezoneSelect) return;
    let savedTz = loadUiPreference(TIMEZONE_STORAGE_KEY);
    if (savedTz) timezoneSelect.value = savedTz;

    timezoneSelect.addEventListener("change", function () {
      saveUiPreference(TIMEZONE_STORAGE_KEY, timezoneSelect.value);
      showToast("Time zone set to " + timezoneSelect.options[timezoneSelect.selectedIndex].text + ".");
    });
  }

  function initializeRefreshRateControl() {
    if (!refreshRateSelect) return;
    let savedRate = loadUiPreference(REFRESH_RATE_STORAGE_KEY);
    if (savedRate) refreshRateSelect.value = savedRate;

    refreshRateSelect.addEventListener("change", function () {
      let newRate = Number(refreshRateSelect.value) || 3000;
      POLL_INTERVAL = newRate;
      saveUiPreference(REFRESH_RATE_STORAGE_KEY, String(newRate));
      clearInterval(pollIntervalId);
      pollIntervalId = setInterval(fetchDashboardStats, POLL_INTERVAL);
      showToast("Refresh rate set to " + refreshRateSelect.options[refreshRateSelect.selectedIndex].text + ".");
    });
  }

  function initializeNotificationToggle() {
    if (!notificationEnabledToggle) return;
    let savedEnabled = loadUiPreference(NOTIFICATION_ENABLED_STORAGE_KEY);
    if (savedEnabled === "false") notificationEnabledToggle.checked = false;

    function applyNotificationEnabled() {
      let enabled = notificationEnabledToggle.checked;
      saveUiPreference(NOTIFICATION_ENABLED_STORAGE_KEY, String(enabled));
      var controls = notificationEnabledToggle.closest(".settings-content");
      if (controls) {
        var children = controls.querySelectorAll(".field-row, .range-row, .time-grid, .snooze-actions, .inline-status");
        children.forEach(function (el) { el.style.opacity = enabled ? "" : "0.4"; el.style.pointerEvents = enabled ? "" : "none"; });
      }
      if (notificationStatusLine) {
        notificationStatusLine.textContent = enabled ? getActiveMuteMessage() : "Notifications are disabled.";
      }
    }

    notificationEnabledToggle.addEventListener("change", applyNotificationEnabled);
    applyNotificationEnabled();
  }

  function initializeNotificationVolume() {
    if (!notificationVolumeSlider) return;
    let savedVol = loadUiPreference(NOTIFICATION_VOLUME_STORAGE_KEY);
    if (savedVol) notificationVolumeSlider.value = savedVol;

    notificationVolumeSlider.addEventListener("input", function () {
      saveUiPreference(NOTIFICATION_VOLUME_STORAGE_KEY, notificationVolumeSlider.value);
    });
  }

  function updateNotificationPreview() {
    if (!notificationPreviewCopy || !notificationModeSelect || !notificationStartInput || !notificationEndInput) return;
    let base = notificationModeSelect.value + " alerts run between " + notificationStartInput.value + " and " + notificationEndInput.value + ".";
    notificationPreviewCopy.textContent = base + " " + getActiveMuteMessage() + " Checkout error rate metrics crossed 2%.";
  }

  function initializeNotificationControls() {
    let scheduleSelect = document.getElementById("notification-schedule");
    let customHoursGrid = document.getElementById("custom-hours-grid");

    populateTimeSelect(notificationStartInput, "08:00");
    populateTimeSelect(notificationEndInput, "18:00");
    if (!notificationModeSelect || !notificationStartInput || !notificationEndInput) return;

    function applyScheduleVisibility() {
      if (!scheduleSelect || !customHoursGrid) return;
      customHoursGrid.hidden = scheduleSelect.value !== "custom";
    }

    if (scheduleSelect) {
      scheduleSelect.addEventListener("change", function () {
        applyScheduleVisibility();
        updateNotificationStatusLine();
        updateNotificationPreview();
      });
      applyScheduleVisibility();
    }

    [notificationModeSelect, notificationStartInput, notificationEndInput].forEach(function (control) {
      control.addEventListener("change", function () {
        if (control === notificationModeSelect) {
          notificationMutedUntil = 0;
        }
        updateNotificationStatusLine();
        updateNotificationPreview();
      });
      control.addEventListener("input", updateNotificationPreview);
    });

    snoozeActionButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        let mins = Number(btn.getAttribute("data-snooze") || 0);
        if (mins <= 0) {
          notificationMutedUntil = 0;
          notificationModeSelect.value = "Critical only";
        } else {
          notificationMutedUntil = Date.now() + mins * 60 * 1000;
          if (notificationEnabledToggle) notificationEnabledToggle.checked = false;
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
        setProfileStatus("Password updates mocked for local session continuity.");
      });
    }
    if (signOutButton) {
      signOutButton.addEventListener("click", function () {
        setProfileStatus("Signed out tracking workspace.");
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
    let msg = String(eventRecord.data.message).toLowerCase();
    if (msg.indexOf("timeout") !== -1 || msg.indexOf("latency") !== -1) return "warning";
    return "critical";
  }

  function getIssueIdentifier(eventRecord, fallbackIndex) {
    return [
      eventRecord && eventRecord.timestamp ? String(eventRecord.timestamp) : "",
      eventRecord && eventRecord.route ? String(eventRecord.route) : "",
      eventRecord && eventRecord.deployVersion ? String(eventRecord.deployVersion) : "",
      eventRecord && eventRecord.data && eventRecord.data.message ? String(eventRecord.data.message) : "",
      String(fallbackIndex || 0)
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
      let searchBlob = [
        eventRecord && eventRecord.data && eventRecord.data.message ? eventRecord.data.message : "",
        eventRecord && eventRecord.route ? eventRecord.route : "",
        eventRecord && eventRecord.deployVersion ? eventRecord.deployVersion : "",
        eventRecord && eventRecord.appName ? eventRecord.appName : "",
        severity
      ].join(" ").toLowerCase();
      if (searchBlob.indexOf(uiState.issueSearchText) === -1) return false;
    }

    return true;
  }

  function compareIssues(leftIssue, rightIssue) {
    let sortDirection = uiState.issueSortDirection === "asc" ? 1 : -1;
    let leftSeverity = toIssueSeverity(leftIssue) === "critical" ? 2 : 1;
    let rightSeverity = toIssueSeverity(rightIssue) === "critical" ? 2 : 1;

    if (uiState.issueSortField === "severity") {
      if (leftSeverity !== rightSeverity) return (leftSeverity - rightSeverity) * sortDirection;
      return ((getValidTimestamp(leftIssue.timestamp) || 0) - (getValidTimestamp(rightIssue.timestamp) || 0)) * -1;
    }
    if (uiState.issueSortField === "version") {
      let lV = String(leftIssue.deployVersion || "");
      let rV = String(rightIssue.deployVersion || "");
      if (lV !== rV) return lV.localeCompare(rV) * sortDirection;
    }
    if (uiState.issueSortField === "route") {
      let lR = String(leftIssue.route || "");
      let rR = String(rightIssue.route || "");
      if (lR !== rR) return lR.localeCompare(rR) * sortDirection;
    }
    return ((getValidTimestamp(leftIssue.timestamp) || 0) - (getValidTimestamp(rightIssue.timestamp) || 0)) * sortDirection;
  }

  function getFilteredIssues() {
    let sourceIssues = Array.isArray(uiState.latestDerivedIssues) && uiState.latestDerivedIssues.length > 0
      ? uiState.latestDerivedIssues
      : ((uiState.latestStats && uiState.latestStats.recentErrors) || []);
    return sourceIssues.filter(passesIssueFilters).sort(compareIssues);
  }

  function quoteCsvCell(value) {
    let text = value == null ? "" : String(value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportFilteredIssuesCsv() {
    let rows = getFilteredIssues();
    if (rows.length === 0) {
      showToast("No filtered issues to export.");
      return;
    }

    let header = ["severity", "message", "route", "version", "app", "timestamp", "assignee"];
    let csvRows = [header.map(quoteCsvCell).join(",")].concat(rows.map(function (eventRecord, idx) {
      let issueId = getIssueIdentifier(eventRecord, idx);
      return [
        toIssueSeverity(eventRecord),
        eventRecord.data && eventRecord.data.message ? eventRecord.data.message : "Runtime core error",
        eventRecord.route || "/",
        eventRecord.deployVersion || "unknown",
        eventRecord.appName || "shopdemo",
        formatTimestamp(eventRecord.timestamp),
        uiState.issueAssignments[issueId] || ""
      ].map(quoteCsvCell).join(",");
    }));

    let blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.href = url;
    link.download = "watchtower-triage-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Exported " + rows.length + " issues.");
  }

  // 24h latency chart data — generated once, redrawn on each stats update and threshold change
  let devLatencyData = [];

  // Generate 24 hourly latency points with simulated spikes, scaled by actual route p95
  function generateDevLatencyData(stats) {
    var latencyByRoute = stats.latencyByRoute || {};
    var routes = Object.keys(latencyByRoute);
    devLatencyData = [];
    for (var i = 0; i < 24; i++) {
      var base = 100 + Math.sin(i * 0.4) * 30;
      var spike = (i >= 9 && i <= 11) || (i >= 14 && i <= 16);
      var val = spike ? base + Math.random() * 150 + 80 : base + Math.random() * 60;
      if (routes.length > 0) {
        var avgP95 = routes.reduce(function (s, r) { return s + (latencyByRoute[r].p95 || 0); }, 0) / routes.length;
        val = val * (avgP95 / 200);
      }
      devLatencyData.push(Math.min(Math.round(val), 450));
    }
  }

  // Canvas line chart: grid, axes, area fill, line, data points, threshold line. Adapts to light/dark.
  function drawDevLatencyChart() {
    if (!devLatencyCanvas) return;
    var container = devLatencyCanvas.parentElement;
    var rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    var dpr = window.devicePixelRatio || 1;

    devLatencyCanvas.width = rect.width * dpr;
    devLatencyCanvas.height = rect.height * dpr;
    devLatencyCanvas.style.width = rect.width + "px";
    devLatencyCanvas.style.height = rect.height + "px";

    var ctx = devLatencyCanvas.getContext("2d");
    ctx.scale(dpr, dpr);

    var w = rect.width;
    var h = rect.height;
    var padLeft = 44;
    var padRight = 16;
    var padTop = 12;
    var padBottom = 28;
    var chartW = w - padLeft - padRight;
    var chartH = h - padTop - padBottom;

    var maxVal = 450;
    var ySteps = [0, 150, 300, 450];
    var isDark = document.body.classList.contains("dark-mode");
    var palette = isDark
      ? { grid: "rgba(95,126,169,0.2)", label: "#8EA4C5",
          areaStart: "rgba(15,139,141,0.3)", areaEnd: "rgba(15,139,141,0.02)",
          line: "var(--teal)", lineRaw: "#0f8b8d",
          pointHot: "#d45d4c", pointCool: "#5C7495",
          threshold: "rgba(212,93,76,0.56)", thresholdText: "rgba(212,93,76,0.85)" }
      : { grid: "rgba(76,110,156,0.2)", label: "#5A7193",
          areaStart: "rgba(15,139,141,0.24)", areaEnd: "rgba(15,139,141,0.03)",
          line: "#0f8b8d", lineRaw: "#0f8b8d",
          pointHot: "#d45d4c", pointCool: "#7A94B7",
          threshold: "rgba(212,93,76,0.6)", thresholdText: "rgba(173,65,65,0.85)" };

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ySteps.forEach(function (val) {
      var y = padTop + chartH - (val / maxVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();
    });

    ctx.fillStyle = palette.label;
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ySteps.forEach(function (val) {
      var y = padTop + chartH - (val / maxVal) * chartH;
      ctx.fillText(val + "ms", padLeft - 8, y + 4);
    });

    ctx.textAlign = "center";
    for (var xi = 0; xi < 24; xi += 4) {
      var xPos = padLeft + (xi / 23) * chartW;
      ctx.fillText(String(xi).padStart(2, "0") + ":00", xPos, h - 6);
    }

    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);
    devLatencyData.forEach(function (val, i) {
      var x = padLeft + (i / (devLatencyData.length - 1)) * chartW;
      var y = padTop + chartH - (val / maxVal) * chartH;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, palette.areaStart);
    grad.addColorStop(1, palette.areaEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = palette.lineRaw;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    devLatencyData.forEach(function (val, i) {
      var x = padLeft + (i / (devLatencyData.length - 1)) * chartW;
      var y = padTop + chartH - (val / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    var thresholdVal = parseInt(devLatencyThresholdInput ? devLatencyThresholdInput.value : "250", 10) || 250;

    devLatencyData.forEach(function (val, i) {
      var x = padLeft + (i / (devLatencyData.length - 1)) * chartW;
      var y = padTop + chartH - (val / maxVal) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = val > thresholdVal ? palette.pointHot : palette.pointCool;
      ctx.fill();
    });

    var threshY = padTop + chartH - (thresholdVal / maxVal) * chartH;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = palette.threshold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, threshY);
    ctx.lineTo(padLeft + chartW, threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = palette.thresholdText;
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("threshold: " + thresholdVal + "ms", padLeft + 4, threshY - 6);
  }

  // Build the expandable detail panel HTML for an issue row (severity, metadata, stack trace)
  function buildIssueExpandPanel(eventRecord) {
    let sevLabel = toIssueSeverity(eventRecord) === "warning" ? "Warning" : "Critical";
    let items = [
      { key: "Severity", value: sevLabel },
      { key: "Timestamp", value: eventRecord.timestamp ? new Date(eventRecord.timestamp).toLocaleString() : "—" },
      { key: "Route", value: eventRecord.route || "/" },
      { key: "Version", value: eventRecord.deployVersion || "unknown" },
      { key: "App", value: eventRecord.appName || "shopdemo" },
      { key: "Session ID", value: eventRecord.sessionId || "—" }
    ];

    if (eventRecord.data) {
      Object.keys(eventRecord.data).forEach(function (k) {
        if (k === "message" || k === "stack") return;
        items.push({ key: k, value: String(eventRecord.data[k]) });
      });
    }

    let gridHtml = items.map(function (item) {
      return '<div class="issue-expand-item"><span class="issue-expand-key">' +
        escapeHtml(item.key) + '</span><span class="issue-expand-value">' +
        escapeHtml(item.value) + '</span></div>';
    }).join("");

    let stackHtml = "";
    if (eventRecord.data && eventRecord.data.stack) {
      stackHtml = '<div class="issue-expand-stack"><span class="issue-expand-key">Stack trace</span>' +
        '<pre>' + escapeHtml(eventRecord.data.stack) + '</pre></div>';
    }

    return '<div class="issue-expand">' +
      '<div class="issue-expand-title">Error details</div>' +
      '<div class="issue-expand-grid">' + gridHtml + stackHtml + '</div></div>';
  }

  // Render issue rows with color-coded severity, expand panels, and click-to-expand handlers
  function renderIssueList(recentErrors) {
    if (!issueListContainer) return;
    let prepped = getFilteredIssues();

    if (!prepped || prepped.length === 0) {
      issueListContainer.innerHTML = '<div class="empty-state compact">No error definitions matched filters.</div>';
      if (issueExpandToggleButton) issueExpandToggleButton.hidden = true;
      return;
    }

    let visible = uiState.issuesExpanded ? prepped.length : Math.min(3, prepped.length);
    let slice = prepped.slice(0, visible);

    issueListContainer.innerHTML = slice.map(function (eventRecord, idx) {
      let sev = toIssueSeverity(eventRecord);
      let sevClass = sev === "warning" ? "severity-warning" : sev === "info" ? "severity-info" : "severity-critical";
      let sevLabel = sev === "warning" ? "Warning" : sev === "info" ? "Info" : "Critical";
      let issueId = getIssueIdentifier(eventRecord, idx);
      let assignedName = uiState.issueAssignments[issueId] || "";

      let options = ['<option value="">Unassigned</option>']
        .concat(uiState.issueAssignees.map(function (name) {
          let sel = assignedName === name ? ' selected' : '';
          return '<option value="' + escapeHtml(name) + '"' + sel + '>' + escapeHtml(name) + '</option>';
        })).join("");

      return (
        '<article class="issue-row ' + sevClass + '">' +
        '<div class="issue-main">' +
        '<span class="severity-pill">' + sevLabel + "</span>" +
        "<h3>" + escapeHtml(eventRecord.data.message || "Runtime core error") + "</h3>" +
        "<p>" + escapeHtml(eventRecord.route || "/") + " thrown unhandled.</p>" +
        '<div class="issue-meta">' +
        "<span>" + escapeHtml(eventRecord.deployVersion || "unknown") + "</span>" +
        "<span>" + escapeHtml(eventRecord.appName || "shopdemo") + "</span>" +
        "<span>" + escapeHtml(formatClockTime(eventRecord.timestamp)) + "</span>" +
        "</div>" +
        "</div>" +
        '<label class="assign-control"><span>Assign</span><select data-issue-id="' + escapeHtml(issueId) + '">' + options + "</select></label>" +
        buildIssueExpandPanel(eventRecord) +
        "</article>"
      );
    }).join("");

    issueListContainer.querySelectorAll(".issue-row").forEach(function (row) {
      row.addEventListener("click", function (e) {
        if (e.target.closest("select") || e.target.closest("label")) return;
        row.classList.toggle("expanded");
      });
    });

    if (issueExpandToggleButton) {
      issueExpandToggleButton.hidden = prepped.length <= 3;
      if (prepped.length > 3) {
        issueExpandToggleButton.textContent = uiState.issuesExpanded ? "Show fewer metrics" : "Show older issues (" + (prepped.length - 3) + ")";
      }
    }
  }

  function renderServiceStatus(stats) {
    if (!serviceStackContainer) return;
    let routes = Object.keys(stats.latencyByRoute || {}).sort(function (left, right) {
      return (stats.latencyByRoute[right].p95 || 0) - (stats.latencyByRoute[left].p95 || 0);
    });
    let slowestRoute = routes[0];
    serviceStackContainer.innerHTML =
      '<div class="service-row"><span class="service-dot good"></span><div><strong>Ingest API</strong><span>' + formatNumber(stats.totalEvents) + ' signals accepted</span></div><span class="service-state">Online</span></div>' +
      '<div class="service-row"><span class="service-dot ' + ((stats.totalErrors || 0) > 0 ? "warning" : "good") + '"></span><div><strong>Error monitor</strong><span>' + formatNumber(stats.totalErrors || 0) + ' recent exceptions</span></div><span class="service-state">' + ((stats.totalErrors || 0) > 0 ? "Watch" : "Clear") + '</span></div>' +
      '<div class="service-row"><span class="service-dot ' + (slowestRoute && stats.latencyByRoute[slowestRoute].p95 > 1800 ? "warning" : "good") + '"></span><div><strong>Route latency</strong><span>' + (slowestRoute ? escapeHtml(slowestRoute) + " p95 " + stats.latencyByRoute[slowestRoute].p95 + "ms" : "No samples yet") + '</span></div><span class="service-state">' + routes.length + ' routes</span></div>';
  }

  function deriveFeatureCounts(activityEvents) {
    let counts = {};
    (activityEvents || []).forEach(function (e) {
      let eventType = getEventType(e);
      let fName = eventType === "click"
        ? (e.data && (e.data.text || e.data.target))
        : (eventType === "custom" ? (e.data && e.data.name) : "");
      if (fName) counts[fName] = (counts[fName] || 0) + 1;
    });
    return Object.keys(counts).map(function (k) { return { name: k, count: counts[k] }; }).sort((a, b) => b.count - a.count);
  }

  function renderFeatureHotspots(activityEvents) {
    if (!featureHotspotsContainer) return;
    let top = deriveFeatureCounts(activityEvents).slice(0, 4);
    if (top.length === 0) {
      featureHotspotsContainer.innerHTML = '<div><strong>Waiting for instrumentation signals from client tags...</strong></div>';
      return;
    }
    featureHotspotsContainer.innerHTML = top.map(function (f, idx) {
      return "<div><span>#" + (idx + 1) + " Active</span><strong>" + escapeHtml(f.name) + "</strong><span>" + f.count + " triggers</span></div>";
    }).join("");
  }

  function renderManagerSummary(stats, activityEvents) {
    if (!managerSummaryList) return;
    let actions = deriveFeatureCounts(activityEvents);
    let topAction = actions[0];
    let slowRoutes = Object.keys(stats.latencyByRoute || {}).filter(function (route) {
      return (stats.latencyByRoute[route].p95 || 0) > 1800;
    });
    let highlights = [
      "Ingesting " + formatNumber(stats.totalEvents) + " telemetry events across " + formatNumber(stats.activeUsers) + " active sessions.",
      (stats.totalErrors || 0) > 0 ? formatNumber(stats.totalErrors) + " errors need triage in the current queue." : "No active runtime errors in the current triage queue.",
      topAction ? '"' + topAction.name + '" is the busiest user action with ' + topAction.count + " triggers." : "Waiting for user interaction signals from the demo app.",
      slowRoutes.length ? slowRoutes.length + " routes are above the latency watch threshold." : "Route latency is inside the watch threshold."
    ];
    managerSummaryList.innerHTML = highlights.map(function (item) {
      return '<li><span aria-hidden="true">!</span> ' + escapeHtml(item) + '</li>';
    }).join("");
  }

  // Populate developer home diagnostics: latency peak, route table, and top-3 insight lists
  function renderDeveloperHomeDiagnostics(stats) {
    if (developerLatencyPeakValue) {
      let peakRoutes = Object.keys(stats.latencyByRoute || {}).sort(function (a, b) {
        return ((stats.latencyByRoute[b] || {}).p95 || 0) - ((stats.latencyByRoute[a] || {}).p95 || 0);
      });
      if (peakRoutes.length === 0) {
        developerLatencyPeakValue.textContent = "0 ms";
      } else {
        developerLatencyPeakValue.textContent = String((stats.latencyByRoute[peakRoutes[0]] || {}).p95 || 0) + " ms";
      }
    }

    if (developerRouteTable) {
      let rNames = Object.keys(stats.latencyByRoute || {}).sort((a, b) => (stats.latencyByRoute[b].p95 || 0) - (stats.latencyByRoute[a].p95 || 0));
      developerRouteTable.innerHTML = rNames.length === 0 ? '<li><span>/</span><strong>Telemetry quiet</strong></li>' : rNames.slice(0, 4).map(function (n) {
        return '<li><span>' + escapeHtml(n) + '</span><strong>' + stats.latencyByRoute[n].p95 + ' ms</strong></li>';
      }).join('');
    }

    if (developerInsightIssues) {
      let errors = (stats.recentErrors || []).slice(0, 3);
      if (errors.length === 0) {
        developerInsightIssues.innerHTML = '<li class="severity-high"><span class="rank">#1</span><span>No errors detected</span><strong>0</strong></li>';
      } else {
        developerInsightIssues.innerHTML = errors.map(function (err, idx) {
          let sev = (err.severity === "critical") ? "severity-high" : "severity-medium";
          return '<li class="' + sev + '"><span class="rank">#' + (idx + 1) + '</span><span>' + escapeHtml(err.data.message || "Runtime error") + '</span><strong>' + escapeHtml(err.route || "unknown") + '</strong></li>';
        }).join('');
      }
    }

    if (developerInsightLatency) {
      let routeNames = Object.keys(stats.latencyByRoute || {}).sort(function (a, b) {
        return ((stats.latencyByRoute[b] || {}).p95 || 0) - ((stats.latencyByRoute[a] || {}).p95 || 0);
      });
      let topLatency = routeNames.slice(0, 3);
      if (topLatency.length === 0) {
        developerInsightLatency.innerHTML = '<li class="severity-medium"><span class="rank">#1</span><span>No route telemetry</span><strong>0 ms</strong></li>';
      } else {
        developerInsightLatency.innerHTML = topLatency.map(function (route, idx) {
          let p95 = (stats.latencyByRoute[route] || {}).p95 || 0;
          let sev = p95 > 1800 ? "severity-high" : "severity-medium";
          return '<li class="' + sev + '"><span class="rank">#' + (idx + 1) + '</span><span>' + escapeHtml(route) + '</span><strong>' + p95 + ' ms</strong></li>';
        }).join('');
      }
    }

    if (developerInsightTraffic) {
      let byMinute = {};
      (stats.recentActivity || []).forEach(function (evt) {
        let key = formatClockTime(evt.timestamp).replace(/:\d{2}$/, "");
        byMinute[key] = (byMinute[key] || 0) + 1;
      });
      let minuteKeys = Object.keys(byMinute).sort(function (a, b) {
        return byMinute[b] - byMinute[a];
      });
      let topTraffic = minuteKeys.slice(0, 3);
      if (topTraffic.length === 0) {
        developerInsightTraffic.innerHTML = '<li><span class="rank">#1</span><span>No traffic samples</span><strong>0/min</strong></li>';
      } else {
        developerInsightTraffic.innerHTML = topTraffic.map(function (minute, idx) {
          return '<li><span class="rank">#' + (idx + 1) + '</span><span>' + escapeHtml(minute) + '</span><strong>' + byMinute[minute] + '/min</strong></li>';
        }).join('');
      }
    }
  }

  // Orchestrator: calls diagnostics, stat cards, patch notes, and mini radar
  function renderDeveloperInsights(stats, activityEvents) {
    let errors = deriveIssueEvents(stats, activityEvents).slice(0, 12);
    let latencySummary = buildLatencySummaryFromEvents(activityEvents || [], uiState.selectedRange);
    let routeNames = Object.keys(latencySummary).sort(function (leftRoute, rightRoute) {
      return ((latencySummary[rightRoute] || {}).p95 || 0) - ((latencySummary[leftRoute] || {}).p95 || 0);
    });

    if (developerInsightIssues) {
      let signatureCounts = {};
      errors.forEach(function (eventRecord) {
        let msg = getEventMessage(eventRecord, "Unknown error");
        signatureCounts[msg] = (signatureCounts[msg] || 0) + 1;
      });
      let rankedSignatures = Object.keys(signatureCounts).sort(function (leftMsg, rightMsg) {
        return signatureCounts[rightMsg] - signatureCounts[leftMsg];
      }).slice(0, 3);

      if (rankedSignatures.length === 0) {
        let aggregateCount = Number(stats.__computedTotalErrors || stats.totalErrors || 0);
        developerInsightIssues.innerHTML = aggregateCount > 0
          ? '<li class="severity-high"><span class="rank">#1</span><span>Error signatures pending sync</span><strong>' + String(aggregateCount) + "</strong></li>"
          : '<li class="severity-medium"><span class="rank">#1</span><span>Waiting for issues</span><strong>0</strong></li>';
      } else {
        developerInsightIssues.innerHTML = rankedSignatures.map(function (message, index) {
          let severityClass = index === 0 ? "severity-high" : "severity-medium";
          return '<li class="' + severityClass + '"><span class="rank">#' + (index + 1) + '</span><span>' + escapeHtml(message) + "</span><strong>" + String(signatureCounts[message]) + "</strong></li>";
        }).join("");
      }
    }

    if (developerInsightLatency) {
      if (routeNames.length === 0) {
        developerInsightLatency.innerHTML = '<li><span class="rank">#1</span><span>Waiting for route telemetry</span><strong>0 ms</strong></li>';
      } else {
        developerInsightLatency.innerHTML = routeNames.slice(0, 3).map(function (routeName, index) {
          let routeStats = latencySummary[routeName] || {};
          let routeP95 = Number(routeStats.p95 || 0);
          let severityClass = routeP95 >= 1000 ? "severity-high" : (routeP95 >= 450 ? "severity-medium" : "");
          return '<li class="' + severityClass + '"><span class="rank">#' + (index + 1) + '</span><span>' + escapeHtml(routeName) + "</span><strong>" + String(routeP95) + " ms</strong></li>";
        }).join("");
      }
    }

    if (developerInsightTraffic) {
      let hourCounts = {};
      (activityEvents || []).forEach(function (eventRecord) {
        let ts = getValidTimestamp(eventRecord && eventRecord.timestamp);
        if (!ts) return;
        let hourKey = new Date(ts).toISOString().slice(0, 13);
        hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
      });
      let topHours = Object.keys(hourCounts).sort(function (leftHour, rightHour) {
        return hourCounts[rightHour] - hourCounts[leftHour];
      }).slice(0, 3);

      if (topHours.length === 0) {
        let aggregateEvents = Number(stats.totalEvents || 0);
        developerInsightTraffic.innerHTML = aggregateEvents > 0
          ? '<li><span class="rank">#1</span><span>Event windows pending sync</span><strong>' + String(aggregateEvents) + " events</strong></li>"
          : '<li><span class="rank">#1</span><span>Waiting for activity samples</span><strong>0/min</strong></li>';
      } else {
        developerInsightTraffic.innerHTML = topHours.map(function (hourKey, index) {
          let localHour = new Date(hourKey + ":00:00Z").toLocaleTimeString([], { hour: "numeric" });
          return '<li><span class="rank">#' + (index + 1) + '</span><span>' + escapeHtml(localHour) + "</span><strong>" + String(hourCounts[hourKey]) + "/min</strong></li>";
        }).join("");
      }
    }

    renderDeveloperHomeDiagnostics(stats);
  }

  // Populate the 6 developer stat cards: users, max users, issues, latency, traffic, deploys
  function renderDeveloperStatCards(stats, activityEvents) {
    let currentUsers = stats.activeUsers || 0;
    if (currentUsers > uiState.maxUsers24h) uiState.maxUsers24h = currentUsers;

    let errorCount = stats.totalErrors || 0;
    let versionCount = Object.keys(stats.errorsByVersion || {}).length;

    let routes = Object.keys(stats.latencyByRoute || {});
    let avgLatency = 0;
    if (routes.length > 0) {
      let sum = routes.reduce(function (total, r) { return total + ((stats.latencyByRoute[r] || {}).avg || 0); }, 0);
      avgLatency = Math.round(sum / routes.length);
    }

    var byMinute = {};
    (activityEvents || []).forEach(function (evt) {
      var key = formatClockTime(evt.timestamp).replace(/:\d{2}$/, "");
      byMinute[key] = (byMinute[key] || 0) + 1;
    });
    var peakTraffic = 0;
    Object.keys(byMinute).forEach(function (k) {
      if (byMinute[k] > peakTraffic) peakTraffic = byMinute[k];
    });

    if (devActiveUsers) devActiveUsers.textContent = String(currentUsers);
    if (devMaxUsers) devMaxUsers.textContent = String(uiState.maxUsers24h);
    if (devActiveIssues) devActiveIssues.textContent = String(errorCount);
    if (devAvgLatency) devAvgLatency.textContent = avgLatency + " ms";
    if (devPeakTraffic) devPeakTraffic.textContent = peakTraffic + "/min";
    if (devPatchDeployed) devPatchDeployed.textContent = String(versionCount);

    if (devActiveUsersTrend) devActiveUsersTrend.textContent = "Current sessions";
    if (devMaxUsersTrend) devMaxUsersTrend.textContent = "Peak in last 24h";
    if (devActiveIssuesTrend) {
      devActiveIssuesTrend.textContent = errorCount > 0 ? errorCount + " need review" : "No open issues";
      devActiveIssuesTrend.className = "dev-stat-trend " + (errorCount > 0 ? "down" : "up");
    }
    if (devAvgLatencyTrend) {
      devAvgLatencyTrend.textContent = routes.length + " routes monitored";
      devAvgLatencyTrend.className = "dev-stat-trend " + (avgLatency > 1500 ? "down" : "");
    }
    if (devPeakTrafficTrend) devPeakTrafficTrend.textContent = peakTraffic > 0 ? "Peak requests/min" : "Waiting for samples";
    if (devPatchDeployedTrend) devPatchDeployedTrend.textContent = versionCount + " versions seen";
  }

  // Build patch version list with error counts and color-coded borders (coral/green)
  function renderDeveloperPatchNotes(stats, activityEvents) {
    if (!developerPatchList) return;

    var versionMap = {};
    var errorsByVersion = stats.errorsByVersion || {};
    var errorMessages = {};

    Object.keys(errorsByVersion).forEach(function (ver) {
      versionMap[ver] = { errors: errorsByVersion[ver], events: 0 };
    });

    (stats.recentErrors || []).forEach(function (err) {
      var ver = err.deployVersion || "unknown";
      if (!errorMessages[ver]) errorMessages[ver] = [];
      if (errorMessages[ver].length < 2) {
        errorMessages[ver].push(err.data.message || "Runtime error on " + (err.route || "/"));
      }
    });

    (activityEvents || []).forEach(function (evt) {
      var ver = evt.deployVersion || "unknown";
      if (!versionMap[ver]) versionMap[ver] = { errors: 0, events: 0 };
      versionMap[ver].events += 1;
    });

    var versions = Object.keys(versionMap).sort(function (a, b) {
      return (versionMap[b].events + versionMap[b].errors) - (versionMap[a].events + versionMap[a].errors);
    });

    if (versions.length === 0) {
      developerPatchList.innerHTML = '<li class="patch-version-item"><div><span class="patch-version-name">No deploy versions detected</span></div><span class="patch-version-count">0 errors</span></li>';
      return;
    }

    developerPatchList.innerHTML = versions.map(function (ver) {
      var info = versionMap[ver];
      var statusClass = info.errors > 0 ? "has-errors" : "clean";
      var countLabel = info.errors > 0 ? info.errors + " error" + (info.errors !== 1 ? "s" : "") : "Clean";
      var detail = "";
      if (info.errors > 0 && errorMessages[ver] && errorMessages[ver].length > 0) {
        detail = '<p class="patch-version-detail">' + errorMessages[ver].map(function (m) { return escapeHtml(m); }).join("; ") + '</p>';
      } else if (info.errors === 0) {
        detail = '<p class="patch-version-detail">No regressions — ' + info.events + ' events tracked</p>';
      }
      return '<li class="patch-version-item ' + statusClass + '">' +
        '<div><span class="patch-version-name">' + escapeHtml(ver) + '</span>' + detail + '</div>' +
        '<span class="patch-version-count">' + countLabel + '</span>' +
        '</li>';
    }).join('');
  }

  // Render the mini health pentagon + overall score + 5-dimension breakdown on the home page
  function renderDevMiniRadar(stats, events) {
    var errorPressure = Math.min(100, (stats.totalErrors || 0) * 12);
    var routeEntries = Object.keys(stats.latencyByRoute || {}).map(function (route) { return stats.latencyByRoute[route]; });
    var peakLatency = routeEntries.reduce(function (max, entry) { return Math.max(max, Number(entry.p95) || 0); }, 0);
    var feedbackRatings = (events || []).map(getEventRating).filter(function (r) { return r !== null; });
    var avgRating = feedbackRatings.length ? feedbackRatings.reduce(function (s, r) { return s + r; }, 0) / feedbackRatings.length : 4;
    var dimensions = [
      { label: "Avail", value: Math.max(55, 100 - errorPressure) },
      { label: "Errors", value: Math.max(20, 100 - errorPressure) },
      { label: "Latency", value: Math.max(20, 100 - Math.min(80, peakLatency / 45)) },
      { label: "Signal", value: Math.min(100, 45 + Math.min(55, (stats.totalEvents || 0) * 3)) },
      { label: "Rating", value: Math.round((avgRating / 5) * 100) }
    ];
    var average = Math.round(dimensions.reduce(function (s, d) { return s + d.value; }, 0) / dimensions.length);
    var statusClass = average >= 82 ? "good" : (average >= 62 ? "warning" : "danger");
    var statusText = average >= 82 ? "Healthy" : (average >= 62 ? "Watch" : "Action needed");

    if (devHealthToken) {
      devHealthToken.className = "status-token " + statusClass;
      devHealthToken.textContent = statusText;
    }
    if (devOverallScore) devOverallScore.textContent = average + "%";
    if (devOverallLabel) devOverallLabel.textContent = statusText + " — Reliability";
    if (devScoreBreakdown) {
      devScoreBreakdown.innerHTML = dimensions.map(function (d) {
        return '<li><span>' + escapeHtml(d.label) + '</span><strong>' + Math.round(d.value) + '%</strong></li>';
      }).join("");
    }
    if (devMiniRadarGrid && devMiniRadarAxis && devMiniRadarShape) {
      var cx = 100, cy = 100, maxR = 60;
      var step = (Math.PI * 2) / dimensions.length;
      var pt = function (i, r) {
        var a = -Math.PI / 2 + i * step;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      };
      devMiniRadarGrid.innerHTML = [0.33, 0.66, 1].map(function (s) {
        return '<polygon points="' + dimensions.map(function (_, i) {
          var p = pt(i, maxR * s);
          return p[0].toFixed(1) + "," + p[1].toFixed(1);
        }).join(" ") + '"></polygon>';
      }).join("");
      devMiniRadarAxis.innerHTML = dimensions.map(function (d, i) {
        var end = pt(i, maxR);
        var lbl = pt(i, maxR + 18);
        return '<line x1="' + cx + '" y1="' + cy + '" x2="' + end[0].toFixed(1) + '" y2="' + end[1].toFixed(1) + '"></line>' +
          '<text x="' + lbl[0].toFixed(1) + '" y="' + lbl[1].toFixed(1) + '">' + escapeHtml(d.label) + '</text>';
      }).join("");
      devMiniRadarShape.setAttribute("points", dimensions.map(function (d, i) {
        var p = pt(i, maxR * (d.value / 100));
        return p[0].toFixed(1) + "," + p[1].toFixed(1);
      }).join(" "));
    }
  }

  function renderActivityFeed(activityEvents) {
    if (!activityFeedContainer) return;
    activityFeedContainer.innerHTML = (activityEvents || []).slice(0, 8).map(function (e) {
      let eventType = getEventType(e);
      let msg = eventType === "error"
        ? getEventMessage(e, "Unknown error")
        : (eventType === "pageload" ? (e.route || "/") + " rendered" : eventType);
      return "<li><span class=\"timeline-time\">" + formatClockTime(e.timestamp) + "</span><span class=\"timeline-copy\">" + escapeHtml(msg) + "</span></li>";
    }).join("");
  }

  function renderIssuesActivityFeed(stats, activityEvents) {
    if (!issuesActivityFeedContainer) return;
    let issueEvents = deriveIssueEvents(stats, activityEvents).slice(0, 6);
    issuesActivityFeedContainer.innerHTML = issueEvents.map(function (e) {
      return "<li><span class=\"timeline-time\">" + formatClockTime(e.timestamp) + "</span><span class=\"timeline-copy\">" + escapeHtml(getEventMessage(e, "Error thrown")) + "</span></li>";
    }).join("");
  }

  function renderBarChart(chartContainer, labels, values, highlightedIndex) {
    if (!chartContainer) return;
    let baselineHeight = 10;
    let perUnitGrowth = 10;
    let maxBarHeight = 92;
    chartContainer.style.setProperty("--bar-count", String(Math.max(labels.length, 1)));
    chartContainer.classList.toggle("is-empty", values.every(function (value) { return Number(value || 0) === 0; }));
    chartContainer.innerHTML = labels.map(function (l, idx) {
      let value = Number(values[idx] || 0);
      let pct = Math.min(maxBarHeight, baselineHeight + (Math.max(value, 0) * perUnitGrowth));
      let className = "bar" + (idx === highlightedIndex ? " highlight" : "") + (labels.length > 8 ? " dense" : "");
      return '<div class="' + className + '" style="--bar-height: ' + pct + '%" data-value="' + escapeHtml(String(value)) + '">' +
        '<i class="bar-fill" aria-hidden="true"></i><span>' + escapeHtml(l) + '</span></div>';
    }).join("");
  }

  function renderHealthIncidentFeed(stats) {
    if (!healthIncidentFeed) return;
    let recentErrors = stats.recentErrors || [];
    if (recentErrors.length === 0) {
      healthIncidentFeed.innerHTML = '<li><span class="timeline-time">Now</span><span class="timeline-copy">No reliability incidents detected.</span></li>';
      return;
    }
    healthIncidentFeed.innerHTML = recentErrors.slice(0, 6).map(function (eventRecord) {
      return '<li><span class="timeline-time">' + formatClockTime(eventRecord.timestamp) + '</span><span class="timeline-copy">' + escapeHtml(eventRecord.data.message || "Runtime error") + '</span></li>';
    }).join("");
  }

  function getRangeCutoff() {
    let hours = uiState.selectedRange === "30d" ? 24 * 30 : (uiState.selectedRange === "7d" ? 24 * 7 : 24);
    return Date.now() - (hours * 60 * 60 * 1000);
  }

  function getRangeEvents(events) {
    let cutoff = getRangeCutoff();
    return (events || []).filter(function (eventRecord) {
      let ts = getValidTimestamp(eventRecord.timestamp);
      return ts !== null && ts >= cutoff;
    });
  }

  function buildTimeSeries(events, bucketCount, valuePicker) {
    let buckets = Array.from({ length: bucketCount }, function () { return 0; });
    let labels = Array.from({ length: bucketCount }, function (_value, idx) {
      if (uiState.selectedRange === "24h") return idx === bucketCount - 1 ? "Now" : "-" + (bucketCount - idx - 1) * 3 + "h";
      if (uiState.selectedRange === "7d") return idx === bucketCount - 1 ? "Today" : "-" + (bucketCount - idx - 1) + "d";
      return idx === bucketCount - 1 ? "This wk" : "-" + (bucketCount - idx - 1) + "w";
    });
    let cutoff = getRangeCutoff();
    let span = Math.max(Date.now() - cutoff, 1);

    (events || []).forEach(function (eventRecord) {
      let ts = getValidTimestamp(eventRecord.timestamp);
      if (ts === null || ts < cutoff) return;
      let bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(((ts - cutoff) / span) * bucketCount)));
      buckets[bucketIndex] += valuePicker(eventRecord);
    });

    return { labels: labels, values: buckets };
  }

  function buildUniqueIdentitySeries(events, bucketCount, identityPicker) {
    let bucketSets = Array.from({ length: bucketCount }, function () { return new Set(); });
    let labels = Array.from({ length: bucketCount }, function (_value, idx) {
      if (uiState.selectedRange === "24h") return idx === bucketCount - 1 ? "Now" : "-" + (bucketCount - idx - 1) * 3 + "h";
      if (uiState.selectedRange === "7d") return idx === bucketCount - 1 ? "Today" : "-" + (bucketCount - idx - 1) + "d";
      return idx === bucketCount - 1 ? "This wk" : "-" + (bucketCount - idx - 1) + "w";
    });
    let cutoff = getRangeCutoff();
    let span = Math.max(Date.now() - cutoff, 1);

    (events || []).forEach(function (eventRecord) {
      let ts = getValidTimestamp(eventRecord.timestamp);
      if (ts === null || ts < cutoff) return;
      let bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(((ts - cutoff) / span) * bucketCount)));
      let identity = identityPicker(eventRecord);
      if (identity) bucketSets[bucketIndex].add(String(identity));
    });

    return {
      labels: labels,
      values: bucketSets.map(function (set) { return set.size; })
    };
  }

  function getEventRating(eventRecord) {
    let value = eventRecord && eventRecord.data ? Number(eventRecord.data.rating) : NaN;
    return Number.isFinite(value) ? Math.min(5, Math.max(1, Math.round(value))) : null;
  }

  function renderRatingSummary(events) {
    if (!ratingAverage || !ratingCaption || !ratingBars) return;
    let ratingCounts = [0, 0, 0, 0, 0];
    let total = 0;
    let sum = 0;

    (events || []).forEach(function (eventRecord) {
      let rating = getEventRating(eventRecord);
      if (rating === null) return;
      ratingCounts[rating - 1] += 1;
      total += 1;
      sum += rating;
    });

    ratingAverage.textContent = total === 0 ? "0.0" : (sum / total).toFixed(1);
    ratingCaption.textContent = total === 0 ? "waiting for feedback" : total + " feedback responses";
    let max = Math.max.apply(null, ratingCounts.concat([1]));
    ratingBars.innerHTML = [5, 4, 3, 2, 1].map(function (rating) {
      let count = ratingCounts[rating - 1];
      let width = Math.round((count / max) * 100);
      return '<span style="--rating-width: ' + width + '%"><em>' + rating + ' stars</em><strong>' + count + '</strong></span>';
    }).join("");
  }

  function buildBreakdownCounts(eventsInRange) {
    let counts = {
      performance: 0,
      errors: 0,
      feedback: 0,
      clicks: 0,
    };

    (eventsInRange || []).forEach(function (eventRecord) {
      let eventType = getEventType(eventRecord);

      if (eventType === "pageload" || eventType === "performance") {
        counts.performance += 1;
      } else if (eventType === "error") {
        counts.errors += 1;
      } else if (eventType === "feedback") {
        counts.feedback += 1;
      } else if (eventType === "click" || eventType === "custom" || eventType === "login") {
        counts.clicks += 1;
      }
    });

    return counts;
  }

  function buildLatencySummaryFromEvents(events, _rangeName) {
    let filteredEvents = getRangeEvents(events);
    let routeBuckets = {};

    filteredEvents.forEach(function (eventRecord) {
      let eventType = getEventType(eventRecord);
      if (eventType !== "pageload" && eventType !== "performance" && eventType !== "custom") return;
      let duration = getEventDurationMs(eventRecord);
      if (duration === null) return;

      let routeName = eventRecord.route || "/";
      if (!routeBuckets[routeName]) routeBuckets[routeName] = [];
      routeBuckets[routeName].push({
        duration: duration,
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

  function renderEventBreakdown(events) {
    if (!breakdownDonut || !breakdownList) return;
    let groups = [
      { key: "Performance", className: "teal", detail: "Pageload + web vitals", count: 0 },
      { key: "Errors", className: "coral", detail: "Runtime + API failures", count: 0 },
      { key: "Feedback", className: "amber", detail: "Ratings + comments", count: 0 },
      { key: "Clicks", className: "blue", detail: "Click + custom actions", count: 0 }
    ];

    (events || []).forEach(function (eventRecord) {
      let eventType = getEventType(eventRecord);
      if (eventType === "pageload" || eventType === "performance") groups[0].count += 1;
      else if (isErrorLikeEvent(eventRecord)) groups[1].count += 1;
      else if (eventType === "feedback") groups[2].count += 1;
      else if (eventType === "click" || eventType === "custom") groups[3].count += 1;
    });

    let total = groups.reduce(function (sum, group) { return sum + group.count; }, 0) || 1;
    let cursor = 0;
    let stops = groups.map(function (group) {
      let start = cursor;
      cursor += (group.count / total) * 100;
      return "var(--" + (group.className === "coral" ? "coral" : group.className === "amber" ? "amber" : group.className === "blue" ? "blue" : "teal") + ") " + start.toFixed(1) + "% " + cursor.toFixed(1) + "%";
    });
    breakdownDonut.style.background = "conic-gradient(" + stops.join(", ") + ")";
    breakdownList.innerHTML = groups.map(function (group) {
      let pct = Math.round((group.count / total) * 100);
      return '<li class="breakdown-item ' + group.className + '">' +
        '<span class="breakdown-main"><i class="legend-dot ' + group.className + '"></i><span class="breakdown-label">' + group.key + '</span></span>' +
        '<strong>' + pct + '%</strong>' +
        '<small class="breakdown-detail">' + group.detail + '</small>' +
        '</li>';
    }).join("");
  }

  function renderLatencyChart(stats) {
    if (!latencyLine || !latencyLegend || !latencyYAxis || !latencyXAxis) return;
    let routeEntries = Object.keys(stats.latencyByRoute || {}).map(function (route) {
      return { route: route, p95: Number(stats.latencyByRoute[route].p95) || 0, avg: Number(stats.latencyByRoute[route].avg) || 0 };
    }).sort(function (left, right) { return right.p95 - left.p95; }).slice(0, 6);

    if (routeEntries.length === 0) {
      latencyLine.setAttribute("d", "M60 240 L610 240");
      latencyYAxis.innerHTML = "";
      latencyXAxis.innerHTML = "";
      latencyLegend.innerHTML = '<span><i class="legend-swatch checkout"></i>Waiting for pageload samples</span>';
      return;
    }

    let max = Math.max.apply(null, routeEntries.map(function (entry) { return entry.p95; }).concat([100]));
    let points = routeEntries.map(function (entry, idx) {
      let x = routeEntries.length === 1 ? 335 : 60 + (idx * (550 / (routeEntries.length - 1)));
      let y = 240 - ((entry.p95 / max) * 200);
      return { x: Math.round(x), y: Math.round(y), entry: entry };
    });

    latencyLine.setAttribute("d", points.map(function (point, idx) {
      return (idx === 0 ? "M" : "L") + point.x + " " + point.y;
    }).join(" "));
    latencyYAxis.innerHTML = [max, Math.round(max / 2), 0].map(function (value, idx) {
      return '<text x="52" y="' + (44 + idx * 100) + '">' + Math.round(value) + 'ms</text>';
    }).join("");
    latencyXAxis.innerHTML = points.map(function (point) {
      return '<text x="' + point.x + '" y="264">' + escapeHtml(point.entry.route.replace("/demo", "demo") || "/") + '</text>';
    }).join("");
    latencyLegend.innerHTML = routeEntries.slice(0, 3).map(function (entry, idx) {
      let legendClass = idx === 0 ? "checkout" : (idx === 1 ? "search" : "products");
      return '<span><i class="legend-swatch ' + legendClass + '"></i>' + escapeHtml(entry.route) + ' p95 ' + entry.p95 + 'ms</span>';
    }).join("");
  }

  function renderAnalyticsSummary(eventsInRange, latencySummary) {
    if (analyticsRangeUsers) {
      let usersSet = new Set();
      eventsInRange.forEach(function (eventRecord) {
        let identity = eventRecord.userId || eventRecord.sessionId || (eventRecord.data && eventRecord.data.userId) || (eventRecord.data && eventRecord.data.sessionId);
        if (identity) usersSet.add(identity);
      });
      analyticsRangeUsers.textContent = String(usersSet.size);
    }

    if (analyticsRangeActions) {
      let actions = eventsInRange.filter(function (eventRecord) {
        let eventType = getEventType(eventRecord);
        return eventType === "click" || eventType === "custom" || eventType === "feedback";
      }).length;
      analyticsRangeActions.textContent = String(actions);
    }
  // Render all analytics charts: user count, activity, errors over time, latency, ratings, breakdown
  function renderAnalyticsPanels(stats, events) {
    let rangeEvents = getRangeEvents(events);
    let bucketCount = uiState.selectedRange === "24h" ? 8 : (uiState.selectedRange === "7d" ? 7 : 5);
    let userSeries = buildTimeSeries(rangeEvents, bucketCount, function (eventRecord) { return eventRecord.userId ? 1 : 0; });
    let activitySeries = buildTimeSeries(rangeEvents, bucketCount, function (eventRecord) { return eventRecord.type === "custom" || eventRecord.type === "click" ? 1 : 0; });
    let peakLatency = Object.keys(stats.latencyByRoute || {}).reduce(function (max, route) {
      return Math.max(max, Number(stats.latencyByRoute[route].p95) || 0);
    }, 0);

    let errorSeries = buildTimeSeries(rangeEvents, bucketCount, function (eventRecord) { return eventRecord.type === "error" ? 1 : 0; });
    var errorPeakIdx = errorSeries.values.reduce(function (best, val, idx, arr) { return val > arr[best] ? idx : best; }, 0);

    renderBarChart(userChartContainer, userSeries.labels, userSeries.values, userSeries.values.length - 1);
    renderBarChart(purchaseChartContainer, activitySeries.labels, activitySeries.values, activitySeries.values.length - 1);
    renderBarChart(devErrorChartContainer, errorSeries.labels, errorSeries.values, errorPeakIdx);
    renderLatencyChart(stats);
    renderRatingSummary(rangeEvents);
    renderEventBreakdown(rangeEvents);

    if (analyticsRangeLatency) {
      let routeNames = Object.keys(stats.latencyByRoute || {});
      if (routeNames.length === 0) {
        analyticsRangeLatency.textContent = "0 ms";
      } else {
        let peakP95 = routeNames.reduce(function (runningPeak, routeName) {
          let currentRoute = stats.latencyByRoute[routeName] || {};
          return Math.max(runningPeak, Number(currentRoute.p95) || 0);
        }, 0);
        analyticsRangeLatency.textContent = peakP95 + " ms";
      }
    }
  }

  function renderHealthSummary(stats, events) {
    let errorPressure = Math.min(100, (stats.totalErrors || 0) * 12);
    let routeEntries = Object.keys(stats.latencyByRoute || {}).map(function (route) { return stats.latencyByRoute[route]; });
    let peakLatency = routeEntries.reduce(function (max, entry) { return Math.max(max, Number(entry.p95) || 0); }, 0);
    let feedbackRatings = (events || []).map(getEventRating).filter(function (rating) { return rating !== null; });
    let avgRating = feedbackRatings.length ? feedbackRatings.reduce(function (sum, rating) { return sum + rating; }, 0) / feedbackRatings.length : 4;
    let dimensions = [
      { label: "Availability", value: Math.max(55, 100 - errorPressure) },
      { label: "Errors", value: Math.max(20, 100 - errorPressure) },
      { label: "Latency", value: Math.max(20, 100 - Math.min(80, peakLatency / 45)) },
      { label: "Signal", value: Math.min(100, 45 + Math.min(55, (stats.totalEvents || 0) * 3)) },
      { label: "Feedback", value: Math.round((avgRating / 5) * 100) }
    ];
    let average = Math.round(dimensions.reduce(function (sum, item) { return sum + item.value; }, 0) / dimensions.length);
    let statusClass = average >= 82 ? "good" : (average >= 62 ? "warning" : "danger");
    let statusText = average >= 82 ? "Healthy" : (average >= 62 ? "Watch" : "Action needed");

    if (healthSummaryText) healthSummaryText.textContent = average + "% reliability score";
    if (healthStatusToken) {
      healthStatusToken.className = "status-token " + statusClass;
      healthStatusToken.textContent = statusText;
    }
    if (healthCopy) {
      healthCopy.textContent = "Score combines " + formatNumber(stats.totalEvents || 0) + " ingested signals, " + formatNumber(stats.totalErrors || 0) + " recent errors, and " + routeEntries.length + " observed routes.";
    }
    if (healthPriorityListContainer) {
      let priorities = [];
      if ((stats.totalErrors || 0) > 0) priorities.push("Triage " + stats.totalErrors + " recent runtime errors before the next deploy.");
      if (peakLatency > 1800) priorities.push("Investigate p95 latency above 1.8s on the slowest route.");
      if (priorities.length === 0) priorities.push("No active production blockers detected in the current telemetry window.");
      healthPriorityListContainer.innerHTML = priorities.map(function (item) {
        return '<li><span aria-hidden="true">!</span> ' + escapeHtml(item) + '</li>';
      }).join("");
    }
    if (healthLegend) {
      healthLegend.innerHTML = dimensions.map(function (item) {
        return '<li><span>' + escapeHtml(item.label) + '</span><strong>' + Math.round(item.value) + '%</strong></li>';
      }).join("");
    }
    if (healthRadarGrid && healthRadarAxis && healthRadarShape) {
      let centerX = 260;
      let centerY = 170;
      let maxRadius = 118;
      let angleStep = (Math.PI * 2) / dimensions.length;
      let pointFor = function (idx, radius) {
        let angle = -Math.PI / 2 + idx * angleStep;
        return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius];
      };
      healthRadarGrid.innerHTML = [0.33, 0.66, 1].map(function (scale) {
        return '<polygon points="' + dimensions.map(function (_item, idx) {
          let point = pointFor(idx, maxRadius * scale);
          return point[0].toFixed(1) + "," + point[1].toFixed(1);
        }).join(" ") + '"></polygon>';
      }).join("");
      healthRadarAxis.innerHTML = dimensions.map(function (item, idx) {
        let end = pointFor(idx, maxRadius);
        let label = pointFor(idx, maxRadius + 30);
        return '<line x1="' + centerX + '" y1="' + centerY + '" x2="' + end[0].toFixed(1) + '" y2="' + end[1].toFixed(1) + '"></line>' +
          '<text x="' + label[0].toFixed(1) + '" y="' + label[1].toFixed(1) + '">' + escapeHtml(item.label) + '</text>';
      }).join("");
      healthRadarShape.setAttribute("points", dimensions.map(function (item, idx) {
        let point = pointFor(idx, maxRadius * (item.value / 100));
        return point[0].toFixed(1) + "," + point[1].toFixed(1);
      }).join(" "));
    }
  }

  function renderAnalyticsPanels(stats, events) {
    let rangeEvents = getRangeEvents(events);
    let bucketCount = uiState.selectedRange === "24h" ? 8 : (uiState.selectedRange === "7d" ? 7 : 5);
    let userSeries = buildUniqueIdentitySeries(rangeEvents, bucketCount, function (eventRecord) {
      return eventRecord.userId || eventRecord.sessionId || null;
    });
    let activitySeries = buildTimeSeries(rangeEvents, bucketCount, function (eventRecord) { return eventRecord.type === "custom" || eventRecord.type === "click" ? 1 : 0; });
    let peakLatency = Object.keys(stats.latencyByRoute || {}).reduce(function (max, route) {
      return Math.max(max, Number(stats.latencyByRoute[route].p95) || 0);
    }, 0);

    renderBarChart(userChartContainer, userSeries.labels, userSeries.values, userSeries.values.length - 1);
    renderBarChart(purchaseChartContainer, activitySeries.labels, activitySeries.values, activitySeries.values.length - 1);
    renderLatencyChart(stats);
    renderRatingSummary(rangeEvents);
    renderEventBreakdown(rangeEvents);
    renderAnalyticsSummary(rangeEvents, stats.latencyByRoute || {});

    if (analyticsRangeLatency) analyticsRangeLatency.textContent = peakLatency + " ms";
    if (userDeltaBadge) userDeltaBadge.textContent = formatNumber(userSeries.values[userSeries.values.length - 1] || 0) + " current bucket";
    if (purchaseDeltaBadge) purchaseDeltaBadge.textContent = formatNumber(activitySeries.values[activitySeries.values.length - 1] || 0) + " actions";
  }

  // Main render entry point — called on each poll. Dispatches to all view renderers.
  function updateDashboardStats(stats, events) {
    let resolved = Array.isArray(events) && events.length > 0 ? events : (stats.recentActivity || []);
    let derivedIssues = deriveIssueEvents(stats, resolved);
    uiState.latestStats = stats;
    uiState.latestEvents = resolved;
    uiState.latestDerivedIssues = derivedIssues;

    let recentWindowStart = Date.now() - (5 * 60 * 1000);
    let recentEvents = resolved.filter(function (eventRecord) {
      let ts = getValidTimestamp(eventRecord && eventRecord.timestamp);
      return ts !== null && ts >= recentWindowStart;
    });
    let recentSessions = new Set();
    recentEvents.forEach(function (eventRecord) {
      let sessionKey = eventRecord.sessionId || (eventRecord.data && eventRecord.data.sessionId) || (eventRecord.context && eventRecord.context.sessionId);
      if (sessionKey) recentSessions.add(String(sessionKey));
    });

    let computedActiveUsers = recentSessions.size > 0 ? recentSessions.size : Number(stats.activeUsers || 0);
    let computedTotalEvents = recentEvents.length > 0 ? recentEvents.length : Number(stats.totalEvents || 0);
    let computedTotalErrors = recentEvents.filter(function (eventRecord) {
      return isErrorLikeEvent(eventRecord);
    }).length;
    if (computedTotalErrors === 0) computedTotalErrors = Number(stats.totalErrors || 0);
    stats.__computedTotalErrors = computedTotalErrors;

    if (activeUsersValue) activeUsersValue.textContent = String(computedActiveUsers);
    if (totalEventsValue) totalEventsValue.textContent = String(computedTotalEvents);
    if (totalErrorsValue) totalErrorsValue.textContent = String(computedTotalErrors);
    if (versionCountValue) versionCountValue.textContent = String(Object.keys(stats.errorsByVersion || {}).length);
    if (activeIssueCountLabel) activeIssueCountLabel.textContent = computedTotalErrors + " active " + (computedTotalErrors === 1 ? "issue" : "issues");
    if (alertPillButton) alertPillButton.classList.toggle("quiet", computedTotalErrors === 0);

    renderIssueList(derivedIssues);
    renderServiceStatus(stats);
    renderFeatureHotspots(resolved);
    renderManagerSummary(stats, resolved);
    renderDeveloperInsights(stats, resolved);
    renderDeveloperStatCards(stats, resolved);
    renderDeveloperPatchNotes(stats, resolved);
    renderDevMiniRadar(stats, resolved);
    renderActivityFeed(resolved);
    renderIssuesActivityFeed(stats, resolved);
    renderAnalyticsPanels(stats, resolved);
    renderHealthSummary(stats, resolved);
    renderHealthIncidentFeed(stats);
    if (devLatencyData.length === 0) generateDevLatencyData(stats);
    drawDevLatencyChart();
    setLastUpdated(new Date().toISOString());
  }

  function fetchDashboardStats() {
    return Promise.all([
      fetch("/api/stats").then(function (r) { return r.json(); }),
      fetch("/api/events?limit=600").then(function (r) { return r.json(); }).then(function (p) { return p.events || []; }),
      fetch("/api/developer/insights").then(function (r) { return r.json(); })
    ])
      .then(function (res) {
        updateDashboardStats(res[0], res[1]);
        renderDeveloperWorkbench(res[2]);
        if (uiState.dashboardMode === "developer") fetchDeveloperStream(false);
        setLiveConnectionState(true);
      })
      .catch(function () {
        if (!uiState.latestStats) setLiveConnectionState(false);
      });
  }

  function initializeLiveEventStream() {
    if (typeof EventSource === "undefined") return;
    let sse = new EventSource("/api/events/stream");
    sse.onopen = function () { setLiveConnectionState(true); };
    sse.onmessage = function () { fetchDashboardStats(); };
    sse.onerror = function () {
      if (!uiState.latestStats) setLiveConnectionState(false);
    };
  }

  function initializeManualRefresh() {
    if (refreshDashboardButton) refreshDashboardButton.addEventListener("click", fetchDashboardStats);
  }

  let pollIntervalId;

  function initializeWatchTowerFrontend() {
    let hash = window.location.hash.replace("#", "");
    let savedRate = loadUiPreference(REFRESH_RATE_STORAGE_KEY);
    if (savedRate) POLL_INTERVAL = Number(savedRate) || 3000;

    initializeViewNavigation();
    initializeTimeRangeButtons();
    initializeSettingsAccordions();
    initializeIssueControls();
    initializeIssueExpansionControls();
    initializeDashboardModeControl();
    initializeDeveloperWorkbench();
    initializeDarkModeToggle();
    initializeTimezoneControl();
    initializeRefreshRateControl();
    initializeNotificationToggle();
    initializeNotificationVolume();
    initializeNotificationControls();
    initializeProfileControls();
    initializeManualRefresh();
    initializeLiveEventStream();
    activateView(availableViewNames.indexOf(hash) === -1 ? "home" : hash);
    fetchDashboardStats();
    pollIntervalId = setInterval(fetchDashboardStats, POLL_INTERVAL);
  }

  initializeWatchTowerFrontend();
})();
