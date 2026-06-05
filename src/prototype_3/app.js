(function () {
  "use strict";

  // ─── Per-user dashboard scoping ───────────────────────────────────────────
  // Every dashboard API request is scoped to the signed-in Clerk user via the
  // X-Clerk-User-Id header. auth-guard.js loads Clerk and redirects anonymous
  // visitors before this shell is shown, so window.Clerk.user is normally
  // available by the time these fetches run.
  function getClerkUserId() {
    try {
      return (window.Clerk && window.Clerk.user && window.Clerk.user.id) || "";
    } catch (_error) {
      return "";
    }
  }

  // Builds auth headers for scoped API calls. Async because obtaining a fresh
  // Clerk session token (for backend JWT verification) is async. Delegates to
  // auth-guard's window.getClerkUserHeaders when available.
  function getClerkUserHeaders(extraHeaders) {
    let base = Object.assign({}, extraHeaders || {});
    if (typeof window.getClerkUserHeaders === "function") {
      return Promise.resolve(window.getClerkUserHeaders()).then(function (clerkHeaders) {
        return Object.assign(base, clerkHeaders || {});
      });
    }
    let userId = getClerkUserId();
    if (userId) base["X-Clerk-User-Id"] = userId;
    try {
      let session = window.Clerk && window.Clerk.session;
      if (session && typeof session.getToken === "function") {
        return Promise.resolve(session.getToken()).then(function (token) {
          if (token) base["Authorization"] = "Bearer " + token;
          return base;
        }).catch(function () { return base; });
      }
    } catch (_error) {}
    return Promise.resolve(base);
  }

  // auth-guard.js loads Clerk asynchronously in <head>; this script runs at the
  // end of <body>, so window.Clerk.user may not exist yet on first paint.
  // Resolve once the Clerk user id is available so scoped API calls always carry
  // the X-Clerk-User-Id header (avoids initial 401s and "stuck at 0" data).
  function waitForClerkUser(maxWaitMs) {
    return new Promise(function (resolve) {
      let deadline = Date.now() + (typeof maxWaitMs === "number" ? maxWaitMs : 15000);
      (function check() {
        if (getClerkUserId()) { resolve(true); return; }
        if (Date.now() > deadline) { resolve(false); return; }
        setTimeout(check, 150);
      })();
    });
  }

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
  let modeCurrentViewLabel = document.getElementById("mode-current-view");
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
  let issueFilterVersionInput = document.getElementById("issue-filter-version");
  let issueFilterAppInput = document.getElementById("issue-filter-app");
  let issueFilterRouteInput = document.getElementById("issue-filter-route");
  let issueFilterClearButton = document.getElementById("issue-filter-clear");
  let issueExportCsvButton = document.getElementById("issue-export-csv");
  let toastStack = document.getElementById("toast-stack");
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
  let developerHealthSummaryCopy = document.getElementById("developer-health-summary-copy");
  let developerHealthPriorityListContainer = document.getElementById("developer-health-priority-list");
  let issueListContainer = document.getElementById("issue-list");
  let serviceStackContainer = document.getElementById("service-stack");
  let featureHotspotsContainer = document.getElementById("build-metadata");
  let activityFeedContainer = document.getElementById("activity-feed");
  let issuesActivityFeedContainer = document.getElementById("issues-activity-feed");
  let userChartContainer = document.getElementById("user-chart");
  let purchaseChartContainer = document.getElementById("purchase-chart");
  let developerErrorChartContainer = document.getElementById("dev-error-chart");
  let developerLatencyCanvas = document.getElementById("dev-latency-canvas");
  let developerLatencyThresholdInput = document.getElementById("dev-latency-threshold");
  let userDeltaBadge = document.getElementById("user-delta");
  let purchaseDeltaBadge = document.getElementById("purchase-delta");
  let errorDeltaBadge = document.getElementById("error-delta");
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
  let profileInitialsEl = document.getElementById("profile-initials");
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
  let developerEventMix = document.getElementById("developer-event-mix");
  let developerRoutePressure = document.getElementById("developer-route-pressure");
  let developerTopIssues = document.getElementById("developer-top-issues");
  let developerLatencyWindows = document.getElementById("developer-latency-windows");
  let developerTrafficPeaks = document.getElementById("developer-traffic-peaks");
  let developerLatencyPeakValue = document.getElementById("developer-latency-peak");
  let developerInsightIssues = document.getElementById("developer-insight-issues");
  let developerInsightLatency = document.getElementById("developer-insight-latency");
  let developerInsightTraffic = document.getElementById("developer-insight-traffic");
  let developerPatchList = document.getElementById("developer-patch-list");
  let devActiveUsersValue = document.getElementById("dev-active-users");
  let devActiveUsersTrend = document.getElementById("dev-active-users-trend");
  let devMaxUsersValue = document.getElementById("dev-max-users");
  let devMaxUsersTrend = document.getElementById("dev-max-users-trend");
  let devActiveIssuesValue = document.getElementById("dev-active-issues");
  let devActiveIssuesTrend = document.getElementById("dev-active-issues-trend");
  let devAverageLatencyValue = document.getElementById("dev-avg-latency");
  let devAverageLatencyTrend = document.getElementById("dev-avg-latency-trend");
  let devPeakTrafficValue = document.getElementById("dev-peak-traffic");
  let devPeakTrafficTrend = document.getElementById("dev-peak-traffic-trend");
  let devPatchDeployedValue = document.getElementById("dev-patch-deployed");
  let devPatchDeployedTrend = document.getElementById("dev-patch-deployed-trend");
  let devMiniRadarGrid = document.getElementById("dev-mini-radar-grid");
  let devMiniRadarAxis = document.getElementById("dev-mini-radar-axis");
  let devMiniRadarShape = document.getElementById("dev-mini-radar-shape");
  let devHealthToken = document.getElementById("dev-health-token");
  let devOverallScore = document.getElementById("dev-overall-score");
  let devOverallLabel = document.getElementById("dev-overall-label");
  let devScoreBreakdown = document.getElementById("dev-score-breakdown");
  let devHomeSummaryCopy = document.getElementById("dev-home-summary-copy");
  let devHomeSummaryList = document.getElementById("dev-home-summary-list");
  let devHomeSummaryErrors = document.getElementById("dev-home-summary-errors");
  let developerIssueSearchInput = document.getElementById("developer-issue-search");
  let developerMuteToggleButton = document.getElementById("developer-mute-toggle");
  let developerMuteStatusLine = document.getElementById("developer-mute-status");
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
  // Persists the IANA timezone identifier chosen in Settings across reloads.
  // "auto" means defer to the browser's system timezone (the default behavior).
  let TIMEZONE_STORAGE_KEY = "watchtower_timezone";
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
    issueFilterVersion: "",
    issueFilterApp: "",
    issueFilterRoute: "",
    issueSearchText: "",
    developerAlertsMuted: false,
    issueAssignments: {},
    expandedIssueIds: {},
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
    // IANA timezone identifier used by all timestamp formatting functions.
    // Defaults to "auto" so first-time visitors see their system timezone.
    selectedTimezoneIdentifier: "auto"
  };
  let developerShortcutPrimedAt = 0;

  function escapeHtml(value) {
    // Escape all five HTML-significant characters, including quotes. The output
    // is used both as element text and inside double-quoted attributes (e.g.
    // data-* and value="..."), so quotes MUST be escaped to prevent attribute
    // breakout / stored XSS from attacker-controlled event fields. The previous
    // textContent->innerHTML approach left " and ' unescaped.
    return (value == null ? "" : String(value))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getValidTimestamp(value) {
    let t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }

  // Returns the IANA timezone string to pass to Intl formatting options, or
  // undefined when the user chose "auto" so the browser falls back to the
  // system timezone. Centralised here so both formatClockTime and
  // formatTimestamp stay in sync with whatever the user last selected.
  function resolveTimezoneOption() {
    let chosenIdentifier = uiState.selectedTimezoneIdentifier;
    return (chosenIdentifier && chosenIdentifier !== "auto") ? chosenIdentifier : undefined;
  }

  function formatClockTime(isoTimestamp) {
    let timezoneOption = resolveTimezoneOption();
    let clockFormatOptions = { hour: "2-digit", minute: "2-digit" };
    if (timezoneOption) {
      clockFormatOptions.timeZone = timezoneOption;
    }
    try {
      return new Date(isoTimestamp).toLocaleTimeString([], clockFormatOptions);
    } catch (_rangeError) {
      // Invalid IANA string stored in localStorage - fall back to system timezone.
      return new Date(isoTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }

  function formatTimestamp(value) {
    if (!value) return "--";
    let ts = getValidTimestamp(value);
    if (ts === null) return "--";
    let timezoneOption = resolveTimezoneOption();
    let fullFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    };
    if (timezoneOption) {
      fullFormatOptions.timeZone = timezoneOption;
    }
    try {
      return new Date(ts).toLocaleString([], fullFormatOptions);
    } catch (_rangeError) {
      // Invalid IANA string stored in localStorage - fall back to system timezone.
      return new Date(ts).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
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

    if (dashboardModeSelect) dashboardModeSelect.value = resolvedMode;
    if (dashboardModePill) {
      dashboardModePill.querySelectorAll(".mode-toggle-option").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-mode") === resolvedMode);
      });
      dashboardModePill.classList.toggle("mode-developer", resolvedMode === "developer");
    }
    if (modeCurrentViewLabel) {
      modeCurrentViewLabel.textContent = "Currently on: " + (resolvedMode === "developer" ? "Developer view" : "Manager view");
    }

    document.querySelectorAll("[data-dashboard-mode]").forEach(function (modePanel) {
      let panelMode = getDashboardModeValue(modePanel.getAttribute("data-dashboard-mode"));
      modePanel.hidden = panelMode !== resolvedMode;
    });
  }

  function initializeDashboardModeControl() {
    let savedMode = loadUiPreference(DASHBOARD_MODE_STORAGE_KEY);
    applyDashboardMode(savedMode || "manager");

    let syncMode = function (nextMode) {
      applyDashboardMode(nextMode);
      saveUiPreference(DASHBOARD_MODE_STORAGE_KEY, uiState.dashboardMode);
      if (uiState.dashboardMode === "developer") {
        fetchDeveloperStream(false);
      }
      rerenderIfReady();
    };

    if (dashboardModeSelect) {
      dashboardModeSelect.addEventListener("change", function () {
        syncMode(dashboardModeSelect.value);
      });
    }

    if (dashboardModePill) {
      dashboardModePill.addEventListener("click", function (event) {
        let btn = event.target.closest(".mode-toggle-option");
        if (!btn) return;
        let nextMode = btn.getAttribute("data-mode");
        if (nextMode && nextMode !== uiState.dashboardMode) {
          syncMode(nextMode);
        }
      });
    }
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

    if (issueFilterClearButton) {
      issueFilterClearButton.addEventListener("click", function () {
        uiState.issueFilterVersion = "";
        uiState.issueFilterApp = "";
        uiState.issueFilterRoute = "";
        uiState.issueSortField = "timestamp";
        uiState.issueSortDirection = "desc";

        if (issueSortFieldSelect) issueSortFieldSelect.value = uiState.issueSortField;
        if (issueSortDirectionSelect) issueSortDirectionSelect.value = uiState.issueSortDirection;
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

    issueListContainer.addEventListener("click", function (event) {
      if (event.target.closest("select") || event.target.closest("label")) return;
      let row = event.target.closest(".issue-row");
      if (!row) return;
      let rowId = row.getAttribute("data-issue-id");
      if (!rowId) return;
      if (uiState.expandedIssueIds[rowId]) {
        delete uiState.expandedIssueIds[rowId];
        row.classList.remove("expanded");
      } else {
        uiState.expandedIssueIds[rowId] = true;
        row.classList.add("expanded");
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

    return getClerkUserHeaders()
      .then(function (headers) {
        return fetch("/api/developer/stream?" + params.toString(), { headers: headers });
      })
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
    return getClerkUserHeaders({ "Content-Type": "application/json" })
      .then(function (headers) {
        return fetch("/api/developer/query", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ query: queryText })
        });
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

  function initializeTimezoneControl() {
    let timezoneSelectElement = document.getElementById("timezone-select");
    let savedTimezoneIdentifier = loadUiPreference(TIMEZONE_STORAGE_KEY);

    // Apply the persisted preference before the first render so timestamps
    // are correct from the moment data arrives, not just after a user interaction.
    if (savedTimezoneIdentifier) {
      uiState.selectedTimezoneIdentifier = savedTimezoneIdentifier;
      if (timezoneSelectElement) {
        timezoneSelectElement.value = savedTimezoneIdentifier;
      }
    }

    if (!timezoneSelectElement) {
      return;
    }

    timezoneSelectElement.addEventListener("change", function () {
      let chosenTimezoneIdentifier = timezoneSelectElement.value;
      uiState.selectedTimezoneIdentifier = chosenTimezoneIdentifier;
      saveUiPreference(TIMEZONE_STORAGE_KEY, chosenTimezoneIdentifier);

      // Re-render with the cached dataset so every visible timestamp flips
      // to the new timezone immediately instead of waiting for the next poll.
      if (uiState.latestStats) {
        updateDashboardStats(uiState.latestStats, uiState.latestEvents || []);
      }
    });
  }

  function updateNotificationPreview() {
    if (!notificationPreviewCopy || !notificationModeSelect || !notificationStartInput || !notificationEndInput) return;
    let base = notificationModeSelect.value + " alerts run between " + notificationStartInput.value + " and " + notificationEndInput.value + ".";
    notificationPreviewCopy.textContent = base + " " + getActiveMuteMessage() + " Checkout error rate metrics crossed 2%.";
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

    snoozeActionButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        let mins = Number(btn.getAttribute("data-snooze") || 0);
        if (mins <= 0) {
          notificationMutedUntil = 0;
          notificationModeSelect.value = "Critical only";
        } else {
          notificationMutedUntil = Date.now() + mins * 60 * 1000;
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

    function applyUserProfile(displayName, initials) {
      profileDisplayName.textContent = displayName;
      displayNameInput.value = displayName;
      if (profileInitialsEl) profileInitialsEl.textContent = initials;
    }

    function commitDisplayName() {
      const currentUser = window.WatchTowerCurrentUser;
      const nextName = displayNameInput.value.trim() || profileDisplayName.textContent.trim() || "User";
      displayNameInput.value = nextName;
      profileDisplayName.textContent = nextName;
      if (currentUser) {
        try {
          localStorage.setItem(currentUser.profileStorageKey, nextName);
        } catch (_e) {}
      }
      setProfileStatus("Display name updated.");
    }

    const currentUser = window.WatchTowerCurrentUser;
    if (currentUser) {
      applyUserProfile(currentUser.displayName, currentUser.initials);
    } else {
      document.addEventListener("watchtower:user-ready", function (event) {
        applyUserProfile(event.detail.displayName, event.detail.initials);
      }, { once: true });
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
    let stats = uiState.latestStats || {};
    return (stats.recentErrors || []).filter(passesIssueFilters).sort(compareIssues);
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

  function renderIssueList(recentErrors) {
    if (!issueListContainer) return;
    let prepped = getFilteredIssues();

    if (!prepped || prepped.length === 0) {
      issueListContainer.innerHTML = '<div class="empty-state compact">No error definitions matched filters.</div>';
      if (issueExpandToggleButton) issueExpandToggleButton.hidden = true;
      return;
    }

    let visible = uiState.issuesExpanded ? prepped.length : Math.min(3, prepped.length);
    issueListContainer.innerHTML = prepped.slice(0, visible).map(function (eventRecord, idx) {
      let sev = toIssueSeverity(eventRecord);
      let issueId = getIssueIdentifier(eventRecord, idx);
      let assignedName = uiState.issueAssignments[issueId] || "";

      let options = ['<option value="">Unassigned</option>']
        .concat(uiState.issueAssignees.map(function (name) {
          let sel = assignedName === name ? ' selected' : '';
          return '<option value="' + escapeHtml(name) + '"' + sel + '>' + escapeHtml(name) + '</option>';
        })).join("");

      let stack = eventRecord.data.stack || "";
      let source = eventRecord.data.source || "unknown";
      let line = eventRecord.data.line || 0;
      let col = eventRecord.data.col || 0;
      let environment = eventRecord.environment || "production";
      let sessionId = eventRecord.sessionId || "unknown";
      let userId = eventRecord.userId || "anonymous";
      let sdkVersion = eventRecord.sdkVersion || "unknown";
      let fullTimestamp = formatTimestamp(eventRecord.timestamp);

      let isExpanded = uiState.expandedIssueIds[issueId] ? " expanded" : "";

      return (
        '<article class="issue-row ' + (sev === "warning" ? "severity-warning" : "severity-critical") + isExpanded + '" data-issue-id="' + escapeHtml(issueId) + '">' +
        '<div class="issue-main">' +
        '<span class="severity-pill">' + (sev === "warning" ? "Warning" : "Critical") + "</span>" +
        "<h3>" + escapeHtml(eventRecord.data.message || "Runtime core error") + "</h3>" +
        "<p>" + escapeHtml(eventRecord.route || "/") + " thrown unhandled.</p>" +
        '<div class="issue-meta">' +
        "<span>" + escapeHtml(eventRecord.deployVersion || "unknown") + "</span>" +
        "<span>" + escapeHtml(eventRecord.appName || "shopdemo") + "</span>" +
        "<span>" + escapeHtml(formatClockTime(eventRecord.timestamp)) + "</span>" +
        "</div>" +
        "</div>" +
        '<label class="assign-control"><span>Assign</span><select data-issue-id="' + escapeHtml(issueId) + '">' + options + "</select></label>" +
        '<div class="issue-expand">' +
        '<p class="issue-expand-title">Issue details</p>' +
        '<div class="issue-expand-grid">' +
        '<div class="issue-expand-item"><span class="issue-expand-key">Timestamp</span><span class="issue-expand-value">' + escapeHtml(fullTimestamp) + '</span></div>' +
        '<div class="issue-expand-item"><span class="issue-expand-key">Route</span><span class="issue-expand-value">' + escapeHtml(eventRecord.route || "/") + '</span></div>' +
        '<div class="issue-expand-item"><span class="issue-expand-key">Environment</span><span class="issue-expand-value">' + escapeHtml(environment) + '</span></div>' +
        '<div class="issue-expand-item"><span class="issue-expand-key">Session</span><span class="issue-expand-value">' + escapeHtml(sessionId) + '</span></div>' +
        '<div class="issue-expand-item"><span class="issue-expand-key">User</span><span class="issue-expand-value">' + escapeHtml(userId) + '</span></div>' +
        '<div class="issue-expand-item"><span class="issue-expand-key">Version</span><span class="issue-expand-value">' + escapeHtml(eventRecord.deployVersion || "unknown") + '</span></div>' +
        '<div class="issue-expand-item"><span class="issue-expand-key">SDK</span><span class="issue-expand-value">' + escapeHtml(sdkVersion) + '</span></div>' +
        '<div class="issue-expand-item"><span class="issue-expand-key">Source</span><span class="issue-expand-value">' + escapeHtml(source) + (line ? ":" + line : "") + (col ? ":" + col : "") + '</span></div>' +
        (stack ? '<div class="issue-expand-stack"><span class="issue-expand-key">Stack trace</span><pre>' + escapeHtml(stack) + '</pre></div>' : '') +
        '</div>' +
        '</div>' +
        "</article>"
      );
    }).join("");

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
      let fName = e.type === "click" ? (e.data && (e.data.text || e.data.target)) : (e.type === "custom" ? e.data.name : "");
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

  function buildHealthModel(stats, events) {
    let rangeEvents = getRangeEvents(events || []);
    let routeEntries = Object.keys(stats.latencyByRoute || {}).map(function (route) { return stats.latencyByRoute[route]; });
    let peakLatency = routeEntries.reduce(function (max, entry) { return Math.max(max, Number(entry.p95) || 0); }, 0);
    let errorCount = rangeEvents.filter(function (eventRecord) { return eventRecord.type === "error"; }).length;
    let totalSignals = rangeEvents.length;
    let errorRate = totalSignals > 0 ? (errorCount / totalSignals) : 0;
    let feedbackRatings = rangeEvents.map(getEventRating).filter(function (rating) { return rating !== null; });
    let avgRating = feedbackRatings.length ? feedbackRatings.reduce(function (sum, rating) { return sum + rating; }, 0) / feedbackRatings.length : 0;
    let distinctRoutes = new Set(rangeEvents.map(function (eventRecord) { return eventRecord.route || "/"; })).size;
    let distinctTypes = new Set(rangeEvents.map(function (eventRecord) { return eventRecord.type || "custom"; })).size;
    let availabilityScore = totalSignals === 0 ? 75 : Math.max(0, Math.round(100 - (errorRate * 220)));
    let errorScore = totalSignals === 0 ? 75 : Math.max(0, Math.round(100 - (errorRate * 260)));
    let latencyScore = peakLatency === 0 ? 75 : Math.max(0, Math.round(100 - (peakLatency / 22)));
    let signalScore = Math.min(100, Math.round((distinctTypes * 15) + (distinctRoutes * 10) + Math.min(45, totalSignals * 0.8)));
    let feedbackScore = feedbackRatings.length === 0 ? 75 : Math.round((avgRating / 5) * 100);
    let dimensions = [
      { label: "Availability", value: availabilityScore, shortLabel: "Avail" },
      { label: "Errors", value: errorScore, shortLabel: "Err" },
      { label: "Latency", value: latencyScore, shortLabel: "Lat" },
      { label: "Signal", value: signalScore, shortLabel: "Signal" },
      { label: "Feedback", value: feedbackScore, shortLabel: "Fb" }
    ];
    let average = Math.round(dimensions.reduce(function (sum, item) { return sum + item.value; }, 0) / dimensions.length);
    let statusClass = average >= 75 ? "good" : (average >= 55 ? "warning" : "danger");
    let statusText = average >= 75 ? "Healthy" : (average >= 55 ? "Watch" : "Critical");
    return {
      dimensions: dimensions,
      average: average,
      statusClass: statusClass,
      statusText: statusText,
      peakLatency: peakLatency,
      routeCount: routeEntries.length
    };
  }

  function getErrorStatusClass(count) {
    if (count === 0) return "status-green";
    if (count <= 10) return "status-yellow";
    return "status-red";
  }

  function getLatencyStatusClass(ms) {
    if (ms < 200) return "status-green";
    if (ms <= 800) return "status-yellow";
    return "status-red";
  }

  function getHealthStatusClass(score) {
    if (score >= 75) return "status-green";
    if (score >= 55) return "status-yellow";
    return "status-red";
  }

  function applyStatusClass(element, statusClass) {
    if (!element) return;
    element.classList.remove("status-green", "status-yellow", "status-red");
    element.classList.add(statusClass);
  }

  function applyFrameStatus(childElement, statusClass) {
    if (!childElement) return;
    let frame = childElement.closest(".dev-stat-card") || childElement.closest(".metric-tile");
    if (!frame) return;
    frame.classList.remove("frame-green", "frame-yellow", "frame-red");
    frame.classList.add("frame-" + statusClass.replace("status-", ""));
  }

  function applyCardAccent(childElement, statusClass) {
    if (!childElement) return;
    let card = childElement.closest(".dev-stat-card");
    if (!card) return;
    card.classList.remove("accent-errors", "accent-latency", "accent-traffic", "accent-green", "accent-amber", "accent-red");
    if (statusClass === "status-green") card.classList.add("accent-green");
    else if (statusClass === "status-yellow") card.classList.add("accent-amber");
    else card.classList.add("accent-red");
  }

  function renderDeveloperHeroStats(stats, activityEvents) {
    let rangeEvents = getRangeEvents(activityEvents);
    let uniqueUsers = new Set();
    rangeEvents.forEach(function (eventRecord) {
      let userKey = eventRecord.userId || eventRecord.sessionId;
      if (userKey) uniqueUsers.add(String(userKey));
    });
    let maxUsers = Number.isFinite(stats.maxUsers)
      ? stats.maxUsers
      : Math.max(uniqueUsers.size, stats.activeUsers || 0);
    let routeNames = Object.keys(stats.latencyByRoute || {});
    let averageLatency = 0;

    if (routeNames.length > 0) {
      averageLatency = Math.round(routeNames.reduce(function (sum, routeName) {
        let routeStats = stats.latencyByRoute[routeName] || {};
        return sum + (Number(routeStats.p95) || 0);
      }, 0) / routeNames.length);
    }

    let oneMinuteAgo = Date.now() - (60 * 1000);
    let trafficEvents = (activityEvents || []).filter(function (eventRecord) {
      let ts = getValidTimestamp(eventRecord.timestamp);
      if (ts === null || ts < oneMinuteAgo) return false;
      return eventRecord.type === "click" || eventRecord.type === "custom" || eventRecord.type === "pageload" || eventRecord.type === "performance";
    }).length;

    let versionsSeen = Object.keys(stats.errorsByVersion || {}).length;

    if (devActiveUsersValue) devActiveUsersValue.textContent = String(stats.activeUsers || 0);
    if (devActiveUsersTrend) devActiveUsersTrend.textContent = "Current sessions";
    if (devMaxUsersValue) devMaxUsersValue.textContent = String(maxUsers || 0);
    if (devMaxUsersTrend) devMaxUsersTrend.textContent = "Peak in last 24h";
    if (devActiveIssuesValue) {
      let errStatus = getErrorStatusClass(stats.totalErrors || 0);
      devActiveIssuesValue.textContent = String(stats.totalErrors || 0);
      applyStatusClass(devActiveIssuesValue, errStatus);
      applyFrameStatus(devActiveIssuesValue, errStatus);
      applyCardAccent(devActiveIssuesValue, errStatus);
    }
    if (devActiveIssuesTrend) devActiveIssuesTrend.textContent = (stats.totalErrors || 0) > 0 ? "Needs review" : "No blockers";
    if (devAverageLatencyValue) {
      let latStatus = getLatencyStatusClass(averageLatency || 0);
      devAverageLatencyValue.textContent = String(averageLatency || 0) + " ms";
      applyStatusClass(devAverageLatencyValue, latStatus);
      applyFrameStatus(devAverageLatencyValue, latStatus);
      applyCardAccent(devAverageLatencyValue, latStatus);
    }
    if (devAverageLatencyTrend) devAverageLatencyTrend.textContent = routeNames.length > 0 ? "Across " + routeNames.length + " routes" : "Across all routes";
    if (devPeakTrafficValue) devPeakTrafficValue.textContent = String(trafficEvents) + "/min";
    if (devPeakTrafficTrend) devPeakTrafficTrend.textContent = "Requests per minute";
    if (devPatchDeployedValue) devPatchDeployedValue.textContent = String(versionsSeen || 0);
    if (devPatchDeployedTrend) devPatchDeployedTrend.textContent = versionsSeen > 0 ? "Versions seen" : "Waiting for versions";
  }

  function renderDeveloperHomeDiagnostics(stats) {
    let routeNames = Object.keys(stats.latencyByRoute || {}).sort(function (leftRoute, rightRoute) {
      return ((stats.latencyByRoute[rightRoute] || {}).p95 || 0) - ((stats.latencyByRoute[leftRoute] || {}).p95 || 0);
    });

    if (developerLatencyPeakValue) {
      if (routeNames.length === 0) {
        developerLatencyPeakValue.textContent = "0 ms";
      } else {
        let peakRouteStats = stats.latencyByRoute[routeNames[0]] || {};
        developerLatencyPeakValue.textContent = String(peakRouteStats.p95 || 0) + " ms";
      }
    }

    if (developerRouteTable) {
      if (routeNames.length === 0) {
        developerRouteTable.innerHTML = '<li><span>/</span><strong>Waiting for samples</strong></li>';
      } else {
        developerRouteTable.innerHTML = routeNames.slice(0, 6).map(function (routeName) {
          let routeStats = stats.latencyByRoute[routeName] || {};
          return '<li><span>' + escapeHtml(routeName) + '</span><strong>' + String(routeStats.p95 || 0) + ' ms</strong></li>';
        }).join("");
      }
    }
  }

  function renderDeveloperInsightLists(stats, activityEvents) {
    if (developerInsightIssues) {
      let topErrors = (stats.recentErrors || []).slice(0, 3);
      if (topErrors.length === 0) {
        topErrors = (activityEvents || []).filter(function (eventRecord) {
          return eventRecord.type === "error";
        }).slice(0, 3);
      }

      if (topErrors.length === 0) {
        developerInsightIssues.innerHTML = '<li class="severity-medium"><span class="rank">-</span><span>Waiting for issues</span><strong>0</strong></li>';
      } else {
        developerInsightIssues.innerHTML = topErrors.map(function (eventRecord, idx) {
          let rawMessage = eventRecord && eventRecord.data ? eventRecord.data.message : "";
          let errorMessage = String(rawMessage || "").split("\n")[0].trim() || "Runtime error";
          return '<li class="severity-high"><span class="rank">' + (idx + 1) + '</span><span>' + escapeHtml(errorMessage) + '</span><strong>' + escapeHtml(formatClockTime(eventRecord.timestamp)) + '</strong></li>';
        }).join("");
      }
    }

    if (developerInsightLatency) {
      let routes = Object.keys(stats.latencyByRoute || {}).map(function (routeName) {
        return { route: routeName, p95: Number((stats.latencyByRoute[routeName] || {}).p95) || 0 };
      }).sort(function (leftRoute, rightRoute) { return rightRoute.p95 - leftRoute.p95; }).slice(0, 3);
      if (routes.length === 0) {
        developerInsightLatency.innerHTML = '<li class="severity-medium"><span class="rank">-</span><span>Waiting for route telemetry</span><strong>0 ms</strong></li>';
      } else {
        developerInsightLatency.innerHTML = routes.map(function (entry, idx) {
          let latClass = entry.p95 < 200 ? "latency-green" : (entry.p95 <= 800 ? "latency-yellow" : "latency-red");
          return '<li class="' + latClass + '"><span class="rank">' + (idx + 1) + '</span><span>' + escapeHtml(entry.route) + "</span><strong>" + entry.p95 + " ms</strong></li>";
        }).join("");
      }
      let bundlePanel = developerInsightLatency.closest(".bundle-latency");
      if (bundlePanel) {
        let worstP95 = routes.length > 0 ? routes[0].p95 : 0;
        bundlePanel.classList.remove("bundle-lat-green", "bundle-lat-yellow", "bundle-lat-red");
        if (worstP95 < 200) bundlePanel.classList.add("bundle-lat-green");
        else if (worstP95 <= 800) bundlePanel.classList.add("bundle-lat-yellow");
        else bundlePanel.classList.add("bundle-lat-red");
      }
    }

    if (developerInsightTraffic) {
      let topActions = deriveFeatureCounts(activityEvents).slice(0, 3);
      if (topActions.length === 0) {
        developerInsightTraffic.innerHTML = '<li><span class="rank">-</span><span>Waiting for activity samples</span><strong>0/min</strong></li>';
      } else {
        developerInsightTraffic.innerHTML = topActions.map(function (action, idx) {
          return '<li><span class="rank">' + (idx + 1) + '</span><span>' + escapeHtml(action.name) + "</span><strong>" + action.count + "/min</strong></li>";
        }).join("");
      }
    }
  }

  function renderDeveloperPatchNotes(stats) {
    if (!developerPatchList) return;
    let versionRows = Object.keys(stats.errorsByVersion || {}).map(function (versionName) {
      return {
        version: versionName,
        errors: Number(stats.errorsByVersion[versionName]) || 0
      };
    }).sort(function (leftVersion, rightVersion) { return rightVersion.errors - leftVersion.errors; });

    if (versionRows.length === 0) {
      developerPatchList.innerHTML = '<li class="patch-version-item"><span class="patch-version-name">Waiting for deploy data</span><span class="patch-version-count">0 errors</span></li>';
      return;
    }

    developerPatchList.innerHTML = versionRows.slice(0, 4).map(function (entry) {
      let latestError = (uiState.latestStats && Array.isArray(uiState.latestStats.recentErrors))
        ? uiState.latestStats.recentErrors.find(function (eventRecord) { return eventRecord.deployVersion === entry.version; })
        : null;
      let detail = latestError ? ((latestError.route || "/") + " • " + formatClockTime(latestError.timestamp)) : "No recent error sample";
      return '<li class="patch-version-item ' + (entry.errors > 0 ? "has-errors" : "clean") + '"><span class="patch-version-name">' + escapeHtml(entry.version) + '</span><span class="patch-version-count">' + entry.errors + ' errors</span><p class="patch-version-detail">' + escapeHtml(detail) + "</p></li>";
    }).join("");
  }

  function renderDeveloperHealthMini(stats, activityEvents) {
    let healthModel = buildHealthModel(stats, activityEvents);
    let topAction = deriveFeatureCounts(activityEvents || [])[0];
    let errorCount = (stats.totalErrors || 0);
    let alertSummary = errorCount > 0
      ? (errorCount + " open issue" + (errorCount === 1 ? "" : "s") + " need attention.")
      : "No open errors right now.";
    let trafficSummary = topAction
      ? ("Top activity: " + topAction.name + " (" + topAction.count + " events).")
      : "Waiting for click and custom activity samples.";
    let latencySummary = healthModel.peakLatency > 0
      ? ("Highest p95 route latency is " + Math.round(healthModel.peakLatency) + " ms.")
      : "No pageload latency samples yet.";

    if (devOverallScore) {
      devOverallScore.textContent = healthModel.average + "%";
      applyStatusClass(devOverallScore, getHealthStatusClass(healthModel.average));
    }
    if (devOverallLabel) devOverallLabel.textContent = healthModel.statusText;
    if (devHomeSummaryErrors) devHomeSummaryErrors.textContent = String(errorCount);
    if (devHealthToken) {
      devHealthToken.className = "status-token " + healthModel.statusClass;
      devHealthToken.textContent = healthModel.statusText;
    }
    if (devHomeSummaryCopy) {
      devHomeSummaryCopy.textContent = "System state is calculated from live telemetry, error pressure, route latency, and behavioral signals.";
    }
    if (devHomeSummaryList) {
      devHomeSummaryList.innerHTML = [
        alertSummary,
        latencySummary,
        trafficSummary
      ].map(function (item) {
        return '<li><span aria-hidden="true">!</span> ' + escapeHtml(item) + "</li>";
      }).join("");
    }

    if (devScoreBreakdown) {
      devScoreBreakdown.innerHTML = healthModel.dimensions.map(function (item) {
        return '<li><span>' + escapeHtml(item.label) + '</span><strong>' + Math.round(item.value) + "%</strong></li>";
      }).join("");
    }

    if (devMiniRadarGrid && devMiniRadarAxis && devMiniRadarShape) {
      let centerX = 106;
      let centerY = 100;
      let maxRadius = 56;
      let angleStep = (Math.PI * 2) / healthModel.dimensions.length;
      let pointFor = function (idx, radius) {
        let angle = -Math.PI / 2 + idx * angleStep;
        return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius];
      };

      devMiniRadarGrid.innerHTML = [0.33, 0.66, 1].map(function (scale) {
        return '<polygon points="' + healthModel.dimensions.map(function (_item, idx) {
          let point = pointFor(idx, maxRadius * scale);
          return point[0].toFixed(1) + "," + point[1].toFixed(1);
        }).join(" ") + '"></polygon>';
      }).join("");

      devMiniRadarAxis.innerHTML = healthModel.dimensions.map(function (item, idx) {
        let end = pointFor(idx, maxRadius);
        let label = pointFor(idx, maxRadius + 18);
        return '<line x1="' + centerX + '" y1="' + centerY + '" x2="' + end[0].toFixed(1) + '" y2="' + end[1].toFixed(1) + '"></line>' +
          '<text x="' + label[0].toFixed(1) + '" y="' + label[1].toFixed(1) + '">' + escapeHtml(item.shortLabel) + '</text>';
      }).join("");

      devMiniRadarShape.setAttribute("points", healthModel.dimensions.map(function (item, idx) {
        let point = pointFor(idx, maxRadius * (item.value / 100));
        return point[0].toFixed(1) + "," + point[1].toFixed(1);
      }).join(" "));
    }
  }

  function renderDeveloperInsights(stats, activityEvents) {
    renderDeveloperHeroStats(stats, activityEvents);
    renderDeveloperHomeDiagnostics(stats);
    renderDeveloperInsightLists(stats, activityEvents);
    renderDeveloperPatchNotes(stats);
    renderDeveloperHealthMini(stats, activityEvents);
  }

  function renderActivityFeed(activityEvents) {
    if (!activityFeedContainer) return;
    activityFeedContainer.innerHTML = (activityEvents || []).slice(0, 8).map(function (e) {
      let msg = e.type === "error" ? e.data.message : (e.type === "pageload" ? e.route + " rendered" : e.type);
      return "<li><span class=\"timeline-time\">" + formatClockTime(e.timestamp) + "</span><span class=\"timeline-copy\">" + escapeHtml(msg) + "</span></li>";
    }).join("");
  }

  function renderIssuesActivityFeed(stats, activityEvents) {
    if (!issuesActivityFeedContainer) return;
    issuesActivityFeedContainer.innerHTML = (stats.recentErrors || []).slice(0, 6).map(function (e) {
      return "<li><span class=\"timeline-time\">" + formatClockTime(e.timestamp) + "</span><span class=\"timeline-copy\">" + escapeHtml(e.data.message || "Error thrown") + "</span></li>";
    }).join("");
  }

  function renderBarChart(chartContainer, labels, values, highlightedIndex) {
    if (!chartContainer) return;
    let max = Math.max.apply(null, values.concat([1]));
    chartContainer.style.setProperty("--bar-count", String(Math.max(labels.length, 1)));
    chartContainer.classList.toggle("is-empty", values.every(function (value) { return value === 0; }));
    chartContainer.innerHTML = labels.map(function (l, idx) {
      let pct = Math.round((values[idx] / max) * 100);
      let className = "bar" + (idx === highlightedIndex ? " highlight" : "") + (labels.length > 8 ? " dense" : "");
      return '<div class="' + className + '" style="--bar-height: ' + Math.max(pct, 8) + '%" data-value="' + escapeHtml(values[idx]) + '">' +
        '<i class="bar-fill" aria-hidden="true"></i><span>' + escapeHtml(l) + '</span></div>';
    }).join("");
  }

  function renderErrorBarChart(chartContainer, labels, values) {
    if (!chartContainer) return;
    let max = Math.max.apply(null, values.concat([1]));
    chartContainer.style.setProperty("--bar-count", String(Math.max(labels.length, 1)));
    chartContainer.classList.toggle("is-empty", values.every(function (v) { return v === 0; }));
    chartContainer.innerHTML = labels.map(function (l, idx) {
      let v = values[idx];
      let pct = Math.round((v / max) * 100);
      let color = v === 0 ? "var(--green)" : (v <= 10 ? "var(--amber)" : "var(--coral)");
      return '<div class="bar' + (labels.length > 8 ? " dense" : "") + '" style="--bar-height: ' + Math.max(pct, 8) + '%" data-value="' + v + '">' +
        '<i class="bar-fill" style="background:' + color + '" aria-hidden="true"></i><span>' + escapeHtml(l) + '</span></div>';
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
      return ts === null || ts >= cutoff;
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

  function buildUniqueTimeSeries(events, bucketCount, keyPicker) {
    let labels = buildTimeSeries([], bucketCount, function () { return 0; }).labels;
    let bucketSets = Array.from({ length: bucketCount }, function () { return new Set(); });
    let cutoff = getRangeCutoff();
    let span = Math.max(Date.now() - cutoff, 1);

    (events || []).forEach(function (eventRecord) {
      let ts = getValidTimestamp(eventRecord.timestamp);
      if (ts === null || ts < cutoff) return;
      let uniqueKey = keyPicker(eventRecord);
      if (!uniqueKey) return;
      let bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(((ts - cutoff) / span) * bucketCount)));
      bucketSets[bucketIndex].add(String(uniqueKey));
    });

    return {
      labels: labels,
      values: bucketSets.map(function (bucketSet) { return bucketSet.size; })
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
      let eventType = eventRecord && eventRecord.type ? String(eventRecord.type) : "";

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
      if (eventRecord.type !== "pageload") return;
      if (!eventRecord.data || typeof eventRecord.data.duration !== "number") return;

      let routeName = eventRecord.route || "/";
      if (!routeBuckets[routeName]) routeBuckets[routeName] = [];
      routeBuckets[routeName].push({
        duration: Number(eventRecord.data.duration) || 0,
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
      { key: "Performance", className: "teal", count: 0, detail: "Pageload + web vitals" },
      { key: "Errors", className: "coral", count: 0, detail: "Runtime + API failures" },
      { key: "Feedback", className: "amber", count: 0, detail: "Ratings + comments" },
      { key: "Events", className: "blue", count: 0, detail: "Click + custom actions" }
    ];

    (events || []).forEach(function (eventRecord) {
      if (eventRecord.type === "pageload" || eventRecord.type === "performance") groups[0].count += 1;
      else if (eventRecord.type === "error") groups[1].count += 1;
      else if (eventRecord.type === "feedback") groups[2].count += 1;
      else if (eventRecord.type === "click" || eventRecord.type === "custom") groups[3].count += 1;
    });

    let total = groups.reduce(function (sum, group) { return sum + group.count; }, 0) || 1;
    let cursor = 0;
    let stops = groups.map(function (group) {
      let start = cursor;
      cursor += (group.count / total) * 100;
      return "var(--" + group.className + ") " + start.toFixed(1) + "% " + cursor.toFixed(1) + "%";
    });
    breakdownDonut.style.background = "conic-gradient(" + stops.join(", ") + ")";
    breakdownList.innerHTML = groups.map(function (group) {
      let pct = Math.round((group.count / total) * 100);
      return '<li class="breakdown-item ' + group.className + '"><span class="breakdown-main"><i class="legend-dot ' + group.className + '"></i><span class="breakdown-label">' + group.key + '</span></span><strong>' + pct + '%</strong><small class="breakdown-detail">' + group.detail + "</small></li>";
    }).join("");
  }

  function renderLatencyChart(stats) {
    let chartSvg = document.getElementById("latency-chart");
    let container = chartSvg ? chartSvg.parentNode : null;
    if (!container) return;

    let routeEntries = Object.keys(stats.latencyByRoute || {}).map(function (route) {
      return { route: route, p95: Number(stats.latencyByRoute[route].p95) || 0, avg: Number(stats.latencyByRoute[route].avg) || 0 };
    }).sort(function (left, right) { return right.p95 - left.p95; }).slice(0, 8);

    var barContainer = document.getElementById("latency-bar-chart");
    if (!barContainer) {
      chartSvg.style.display = "none";
      barContainer = document.createElement("div");
      barContainer.id = "latency-bar-chart";
      barContainer.className = "bar-chart latency-route-chart";
      container.insertBefore(barContainer, chartSvg);
    }

    if (!latencyLegend) return;

    if (routeEntries.length === 0) {
      barContainer.style.setProperty("--bar-count", "1");
      barContainer.classList.add("is-empty");
      barContainer.innerHTML = '<div class="bar" style="--bar-height:8%" data-value="0"><i class="bar-fill" aria-hidden="true"></i><span>No routes</span></div>';
      latencyLegend.innerHTML = '<span>Waiting for pageload samples</span>';
      return;
    }

    barContainer.classList.remove("is-empty");
    let max = Math.max.apply(null, routeEntries.map(function (e) { return e.p95; }).concat([100]));
    barContainer.style.setProperty("--bar-count", String(routeEntries.length));
    barContainer.innerHTML = routeEntries.map(function (entry) {
      let pct = Math.round((entry.p95 / max) * 100);
      let color = entry.p95 < 200 ? "var(--green)" : (entry.p95 <= 800 ? "var(--amber)" : "var(--coral)");
      let label = entry.route.replace("/demo", "demo") || "/";
      return '<div class="bar" style="--bar-height:' + Math.max(pct, 8) + '%" data-value="' + entry.p95 + 'ms">' +
        '<i class="bar-fill" style="background:' + color + '" aria-hidden="true"></i><span>' + escapeHtml(label) + '</span></div>';
    }).join("");

    latencyLegend.innerHTML = routeEntries.slice(0, 4).map(function (entry) {
      var color = entry.p95 < 200 ? "var(--green)" : (entry.p95 <= 800 ? "var(--amber)" : "var(--coral)");
      return '<span><i class="legend-swatch" style="background:' + color + '"></i>' + escapeHtml(entry.route) + ' p95 ' + entry.p95 + 'ms</span>';
    }).join("");
  }

  function getLatencyMsFromEvent(eventRecord) {
    if (!eventRecord || !eventRecord.data) return null;

    if (eventRecord.type === "pageload") {
      let pageloadDuration = Number(eventRecord.data.duration);
      return Number.isFinite(pageloadDuration) ? pageloadDuration : null;
    }

    if (eventRecord.type === "performance") {
      let metricName = String(eventRecord.data.metricName || eventRecord.data.name || "").toLowerCase();
      let metricValue = Number(eventRecord.data.value);
      if (!Number.isFinite(metricValue)) {
        metricValue = Number(eventRecord.data.duration);
      }
      if (!Number.isFinite(metricValue)) {
        metricValue = Number(eventRecord.data.latency);
      }
      if (!Number.isFinite(metricValue)) return null;
      if (metricName.indexOf("latency") !== -1 || metricName.indexOf("duration") !== -1 || metricName.indexOf("ttfb") !== -1 || metricName.indexOf("load") !== -1) {
        return metricValue;
      }
    }

    return null;
  }

  function renderDeveloperLatencyCanvas(rangeEvents, bucketCount) {
    if (!developerLatencyCanvas) return;
    let context = developerLatencyCanvas.getContext("2d");
    if (!context) return;

    let width = developerLatencyCanvas.clientWidth || 640;
    let height = developerLatencyCanvas.clientHeight || 240;
    let dpr = window.devicePixelRatio || 1;
    developerLatencyCanvas.width = Math.round(width * dpr);
    developerLatencyCanvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    let labels = buildTimeSeries([], bucketCount, function () { return 0; }).labels;
    let cutoff = getRangeCutoff();
    let span = Math.max(Date.now() - cutoff, 1);
    let latencyBuckets = Array.from({ length: bucketCount }, function () { return []; });

    (rangeEvents || []).forEach(function (eventRecord) {
      let ts = getValidTimestamp(eventRecord.timestamp);
      if (ts === null || ts < cutoff) return;
      let latencyMs = getLatencyMsFromEvent(eventRecord);
      if (!Number.isFinite(latencyMs)) return;
      let bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(((ts - cutoff) / span) * bucketCount)));
      latencyBuckets[bucketIndex].push(latencyMs);
    });

    let values = latencyBuckets.map(function (bucket) {
      if (!bucket.length) return 0;
      return Math.round(bucket.reduce(function (sum, latencyMs) { return sum + latencyMs; }, 0) / bucket.length);
    });

    let threshold = 250;
    if (developerLatencyThresholdInput) {
      let parsed = Number(developerLatencyThresholdInput.value);
      if (Number.isFinite(parsed) && parsed > 0) threshold = parsed;
    }

    let maxValue = Math.max(100, threshold, Math.max.apply(null, values.concat([0])));
    let padLeft = 42;
    let padRight = 12;
    let padTop = 16;
    let padBottom = 32;
    let chartWidth = Math.max(1, width - padLeft - padRight);
    let chartHeight = Math.max(1, height - padTop - padBottom);
    let xStep = bucketCount > 1 ? (chartWidth / (bucketCount - 1)) : 0;

    context.strokeStyle = "rgba(140, 161, 182, 0.25)";
    context.lineWidth = 1;
    let ySteps = [0, 0.25, 0.5, 0.75, 1];
    for (let gridIndex = 0; gridIndex <= 4; gridIndex += 1) {
      let y = padTop + (chartHeight * (gridIndex / 4));
      context.beginPath();
      context.moveTo(padLeft, y);
      context.lineTo(width - padRight, y);
      context.stroke();
    }

    context.fillStyle = "rgba(197, 214, 235, 0.9)";
    context.font = "10px Inter, system-ui, sans-serif";
    context.textAlign = "right";
    ySteps.forEach(function (frac, idx) {
      let y = padTop + (chartHeight * (idx / 4));
      let label = Math.round(maxValue * (1 - frac)) + "ms";
      context.fillText(label, padLeft - 4, y + 4);
    });
    context.textAlign = "left";

    let thresholdY = padTop + chartHeight - ((threshold / maxValue) * chartHeight);
    context.setLineDash([6, 4]);
    context.strokeStyle = "rgba(255, 185, 66, 0.8)";
    context.beginPath();
    context.moveTo(padLeft, thresholdY);
    context.lineTo(width - padRight, thresholdY);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(255, 185, 66, 0.95)";
    context.font = "12px Inter, system-ui, sans-serif";
    context.fillText("Threshold " + threshold + "ms", padLeft + 8, thresholdY - 6);

    let points = values.map(function (value, idx) {
      let x = padLeft + (idx * xStep);
      let y = padTop + chartHeight - ((value / maxValue) * chartHeight);
      return { x: x, y: y, value: value };
    });

    context.strokeStyle = "rgba(44, 196, 211, 0.95)";
    context.lineWidth = 2.4;
    context.beginPath();
    points.forEach(function (point, idx) {
      if (idx === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();

    points.forEach(function (point) {
      context.fillStyle = point.value > threshold ? "rgba(255, 117, 103, 0.95)" : "rgba(44, 196, 211, 0.95)";
      context.beginPath();
      context.arc(point.x, point.y, 3, 0, Math.PI * 2);
      context.fill();
    });

    context.fillStyle = "rgba(197, 214, 235, 0.9)";
    context.font = "11px Inter, system-ui, sans-serif";
    labels.forEach(function (label, idx) {
      let x = padLeft + (idx * xStep);
      context.fillText(label, Math.max(0, x - 14), height - 10);
    });

    if (points.every(function (point) { return point.value === 0; })) {
      context.fillStyle = "rgba(160, 178, 199, 0.92)";
      context.font = "13px Inter, system-ui, sans-serif";
      context.fillText("No latency samples yet. Use \"Simulate Slow Load\" in demo.", padLeft, Math.floor(height / 2));
    }
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
          let currentRoute = latencySummary[routeName] || {};
          return Math.max(runningPeak, Number(currentRoute.p95) || 0);
        }, 0);
        analyticsRangeLatency.textContent = peakP95 + " ms";
      }
    }
  }

  function renderHealthSummary(stats, events) {
    let healthModel = buildHealthModel(stats, events);

    if (healthSummaryText) healthSummaryText.textContent = healthModel.average + "% reliability score";
    if (healthStatusToken) {
      healthStatusToken.className = "status-token " + healthModel.statusClass;
      healthStatusToken.textContent = healthModel.statusText;
    }
    if (healthCopy) {
      healthCopy.textContent = "Score combines " + formatNumber(stats.totalEvents || 0) + " ingested signals, " + formatNumber(stats.totalErrors || 0) + " recent errors, and " + healthModel.routeCount + " observed routes.";
    }
    if (healthPriorityListContainer) {
      let priorities = [];
      if ((stats.totalErrors || 0) > 0) priorities.push("Triage " + stats.totalErrors + " recent runtime errors before the next deploy.");
      if (healthModel.peakLatency > 1800) priorities.push("Investigate p95 latency above 1.8s on the slowest route.");
      if (priorities.length === 0) priorities.push("No active production blockers detected in the current telemetry window.");
      healthPriorityListContainer.innerHTML = priorities.map(function (item) {
        return '<li><span aria-hidden="true">!</span> ' + escapeHtml(item) + '</li>';
      }).join("");
    }
    if (healthLegend) {
      healthLegend.innerHTML = healthModel.dimensions.map(function (item) {
        return '<li><span>' + escapeHtml(item.label) + '</span><strong>' + Math.round(item.value) + '%</strong></li>';
      }).join("");
    }
    if (healthRadarGrid && healthRadarAxis && healthRadarShape) {
      let centerX = 260;
      let centerY = 170;
      let maxRadius = 118;
      let angleStep = (Math.PI * 2) / healthModel.dimensions.length;
      let pointFor = function (idx, radius) {
        let angle = -Math.PI / 2 + idx * angleStep;
        return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius];
      };
      healthRadarGrid.innerHTML = [0.33, 0.66, 1].map(function (scale) {
        return '<polygon points="' + healthModel.dimensions.map(function (_item, idx) {
          let point = pointFor(idx, maxRadius * scale);
          return point[0].toFixed(1) + "," + point[1].toFixed(1);
        }).join(" ") + '"></polygon>';
      }).join("");
      healthRadarAxis.innerHTML = healthModel.dimensions.map(function (item, idx) {
        let end = pointFor(idx, maxRadius);
        let label = pointFor(idx, maxRadius + 30);
        return '<line x1="' + centerX + '" y1="' + centerY + '" x2="' + end[0].toFixed(1) + '" y2="' + end[1].toFixed(1) + '"></line>' +
          '<text x="' + label[0].toFixed(1) + '" y="' + label[1].toFixed(1) + '">' + escapeHtml(item.label) + '</text>';
      }).join("");
      healthRadarShape.setAttribute("points", healthModel.dimensions.map(function (item, idx) {
        let point = pointFor(idx, maxRadius * (item.value / 100));
        return point[0].toFixed(1) + "," + point[1].toFixed(1);
      }).join(" "));
    }
  }

  function renderAnalyticsPanels(stats, events) {
    let rangeEvents = getRangeEvents(events);
    let bucketCount = uiState.selectedRange === "24h" ? 8 : (uiState.selectedRange === "7d" ? 7 : 5);
    let userSeries = buildUniqueTimeSeries(rangeEvents, bucketCount, function (eventRecord) {
      return eventRecord.userId || eventRecord.sessionId || null;
    });
    let activitySeries = buildTimeSeries(rangeEvents, bucketCount, function (eventRecord) { return eventRecord.type === "custom" || eventRecord.type === "click" ? 1 : 0; });
    let errorSeries = buildTimeSeries(rangeEvents, bucketCount, function (eventRecord) { return eventRecord.type === "error" ? 1 : 0; });
    let peakLatency = Object.keys(stats.latencyByRoute || {}).reduce(function (max, route) {
      return Math.max(max, Number(stats.latencyByRoute[route].p95) || 0);
    }, 0);

    renderBarChart(userChartContainer, userSeries.labels, userSeries.values, userSeries.values.length - 1);
    renderBarChart(purchaseChartContainer, activitySeries.labels, activitySeries.values, activitySeries.values.length - 1);
    renderLatencyChart(stats);
    renderErrorBarChart(developerErrorChartContainer, errorSeries.labels, errorSeries.values);
    renderDeveloperLatencyCanvas(rangeEvents, bucketCount);
    renderRatingSummary(rangeEvents);
    renderEventBreakdown(rangeEvents);
    renderAnalyticsSummary(rangeEvents, stats.latencyByRoute || {});

    if (analyticsRangeLatency) {
      analyticsRangeLatency.textContent = peakLatency + " ms";
      applyStatusClass(analyticsRangeLatency, getLatencyStatusClass(peakLatency));
    }
    if (userDeltaBadge) userDeltaBadge.textContent = formatNumber(userSeries.values[userSeries.values.length - 1] || 0) + " current bucket";
    if (purchaseDeltaBadge) purchaseDeltaBadge.textContent = formatNumber(activitySeries.values[activitySeries.values.length - 1] || 0) + " actions";
    if (errorDeltaBadge) {
      let totalErr = stats.totalErrors || 0;
      errorDeltaBadge.textContent = formatNumber(totalErr) + " total";
      errorDeltaBadge.className = "delta-badge " + (totalErr === 0 ? "positive" : "negative");
    }
  }

  function updateDashboardStats(stats, events) {
    let resolved = Array.isArray(events) && events.length > 0 ? events : (stats.recentActivity || []);
    uiState.latestStats = stats;
    uiState.latestEvents = resolved;

    if (activeUsersValue) activeUsersValue.textContent = String(stats.activeUsers || 0);
    if (totalEventsValue) totalEventsValue.textContent = String(stats.totalEvents || 0);
    if (totalErrorsValue) {
      totalErrorsValue.textContent = String(stats.totalErrors || 0);
      applyStatusClass(totalErrorsValue, getErrorStatusClass(stats.totalErrors || 0));
      applyFrameStatus(totalErrorsValue, getErrorStatusClass(stats.totalErrors || 0));
    }
    if (versionCountValue) versionCountValue.textContent = String(Object.keys(stats.errorsByVersion || {}).length);
    if (sidebarUsersValue) sidebarUsersValue.textContent = String(stats.activeUsers || 0);
    if (sidebarEventsValue) sidebarEventsValue.textContent = String(stats.totalEvents || 0);
    if (sidebarErrorsValue) sidebarErrorsValue.textContent = String(stats.totalErrors || 0);
    if (activeIssueCountLabel) activeIssueCountLabel.textContent = (stats.totalErrors || 0) + " active " + ((stats.totalErrors || 0) === 1 ? "issue" : "issues");
    if (alertPillButton) alertPillButton.classList.toggle("quiet", (stats.totalErrors || 0) === 0);

    renderIssueList(stats.recentErrors || []);

    renderServiceStatus(stats);
    renderFeatureHotspots(resolved);
    renderManagerSummary(stats, resolved);
    renderDeveloperInsights(stats, resolved);
    renderActivityFeed(resolved);
    renderIssuesActivityFeed(stats, resolved);
    renderAnalyticsPanels(stats, resolved);
    renderHealthSummary(stats, resolved);
    renderHealthIncidentFeed(stats);
    setLastUpdated(new Date().toISOString());
  }

  function fetchDashboardStats() {
    // Skip (rather than 401-spam) until Clerk has loaded a signed-in user.
    if (!getClerkUserId()) {
      return Promise.resolve();
    }
    return getClerkUserHeaders()
      .then(function (userHeaders) {
        return Promise.all([
          fetch("/api/stats", { headers: userHeaders }).then(function (r) { return r.json(); }),
          fetch("/api/events?limit=600", { headers: userHeaders }).then(function (r) { return r.json(); }).then(function (p) { return p.events || []; }),
          fetch("/api/developer/insights", { headers: userHeaders }).then(function (r) { return r.json(); })
        ]);
      })
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

  function initializeDeveloperAnalyticsControls() {
    if (!developerLatencyThresholdInput) return;
    developerLatencyThresholdInput.addEventListener("input", function () {
      if (uiState.latestStats) {
        renderAnalyticsPanels(uiState.latestStats, uiState.latestEvents || []);
      }
    });
  }

  function initializeWatchTowerFrontend() {
    let hash = window.location.hash.replace("#", "");
    initializeViewNavigation();
    initializeTimeRangeButtons();
    initializeSettingsAccordions();
    initializeIssueControls();
    initializeIssueExpansionControls();
    initializeDashboardModeControl();
    initializeDeveloperWorkbench();
    initializeDarkModeToggle();
    initializeContrastToggle();
    initializeTextSizeSlider();
    initializeTimezoneControl();
    initializeNotificationControls();
    initializeProfileControls();
    initializeManualRefresh();
    initializeDeveloperAnalyticsControls();
    initializeLiveEventStream();
    activateView(availableViewNames.indexOf(hash) === -1 ? "home" : hash);
    // Wait for Clerk to confirm the signed-in user before the first scoped
    // fetch, then poll. The interval still self-guards via getClerkUserId().
    waitForClerkUser().then(function () {
      fetchDashboardStats();
    });
    setInterval(fetchDashboardStats, POLL_INTERVAL);
  }

  initializeWatchTowerFrontend();
})();
