// WatchTower Dashboard — view switching, chart rendering, and alert feed
(function () {
  'use strict';

  const API_BASE_URL = window.location.origin;
  const STREAM_URL = API_BASE_URL + '/api/events/stream'; // SSE endpoint for live alerts
  const STATS_URL = API_BASE_URL + '/api/stats';          // REST endpoint for hero stats

  /* =========================================
     VIEW SWITCHING (3-way)
     ========================================= */
  const navHome = document.getElementById('nav-home');
  const navAnalytics = document.getElementById('nav-analytics');
  const navAlerts = document.getElementById('nav-alerts');
  const navSettings = document.getElementById('nav-settings');
  const appLayout = document.querySelector('.app-layout');
  const navSidebar = document.getElementById('nav-sidebar');
  const navCollapseTrigger = document.getElementById('nav-collapse-trigger');
  const viewHome = document.getElementById('view-home');
  const viewAnalytics = document.getElementById('view-analytics');
  const viewAlerts = document.getElementById('view-alerts');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');

  const navItems = [navHome, navAnalytics, navAlerts];
  const views = [viewHome, viewAnalytics, viewAlerts];
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themeToggleText = document.getElementById('theme-toggle-text');
  const themeSelect = document.getElementById('settings-theme-select');
  const systemThemeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  const desktopMedia = window.matchMedia ? window.matchMedia('(max-width: 1080px)') : null;
  const THEME_STORAGE_KEY = 'watchtower-theme-preference';
  const SIDEBAR_COLLAPSE_STORAGE_KEY = 'watchtower-sidebar-collapsed';
  const statValueElements = [
    document.getElementById('stat-active-users'),
    document.getElementById('stat-max-users'),
    document.getElementById('stat-errors'),
    document.getElementById('stat-latency'),
    document.getElementById('stat-uptime')
  ].filter(Boolean);
  let themePreference = 'dark';

  navHome.addEventListener('click', function () { switchView(0); });
  navAnalytics.addEventListener('click', function () { switchView(1); });
  navAlerts.addEventListener('click', function () { switchView(2); });

  navSettings.addEventListener('click', function () {
    settingsPanel.classList.toggle('hidden');
    navSettings.classList.toggle('active');
  });

  settingsClose.addEventListener('click', function () {
    settingsPanel.classList.add('hidden');
    navSettings.classList.remove('active');
  });

  /**
   * Apply collapsed/expanded sidebar state on desktop widths.
   *
   * @param {boolean} collapsed - Whether sidebar should collapse.
   * @param {boolean} shouldPersist - Whether to persist this preference.
   * @returns {void}
   */
  function setSidebarCollapsed(collapsed, shouldPersist) {
    if (!navSidebar) { return; }
    if (desktopMedia && desktopMedia.matches) {
      navSidebar.classList.remove('collapsed');
      if (appLayout) { appLayout.classList.remove('sidebar-collapsed'); }
      return;
    }

    navSidebar.classList.toggle('collapsed', collapsed);
    if (appLayout) { appLayout.classList.toggle('sidebar-collapsed', collapsed); }
    if (navCollapseTrigger) {
      navCollapseTrigger.innerHTML = collapsed ? '&raquo;' : '&laquo;';
      navCollapseTrigger.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      navCollapseTrigger.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    }

    if (shouldPersist) {
      try { localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0'); } catch (_err) {}
    }
  }

  if (navCollapseTrigger) {
    navCollapseTrigger.addEventListener('click', function () {
      const isCollapsed = navSidebar.classList.contains('collapsed');
      setSidebarCollapsed(!isCollapsed, true);
    });
  }

  if (desktopMedia) {
    const handleViewportCollapse = function () {
      if (desktopMedia.matches) {
        setSidebarCollapsed(false, false);
      } else {
        let shouldCollapse = false;
        try { shouldCollapse = localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1'; } catch (_err) {}
        setSidebarCollapsed(shouldCollapse, false);
      }
    };

    if (typeof desktopMedia.addEventListener === 'function') {
      desktopMedia.addEventListener('change', handleViewportCollapse);
    } else if (typeof desktopMedia.addListener === 'function') {
      desktopMedia.addListener(handleViewportCollapse);
    }

    handleViewportCollapse();
  }

  /**
   * Show the selected WatchTower view and update sidebar nav highlights.
   * Closes the settings panel and redraws the latency chart when switching to Analytics.
   *
   * @param {number} idx - View index (0=Home, 1=Analytics, 2=Alerts).
   * @returns {void}
   */
  function switchView(idx) {
    navItems.forEach(function (n, i) {
      n.classList.toggle('active', i === idx);
    });
    views.forEach(function (v, i) {
      v.classList.toggle('active', i === idx);
    });
    settingsPanel.classList.add('hidden');
    navSettings.classList.remove('active');
    if (idx === 1) { setTimeout(drawLatencyChart, 250); }
  }

  /* =========================================
     SETTINGS: Volume slider
     ========================================= */
  const rangeInput = settingsPanel.querySelector('.settings-range');
  const rangeValue = settingsPanel.querySelector('.settings-range-value');
  rangeInput.addEventListener('input', function () {
    rangeValue.textContent = rangeInput.value + '%';
  });

  /**
   * Resolve a theme preference into an explicit rendered theme.
   *
   * @param {string} pref - "dark", "light", or "system".
   * @returns {string} The concrete theme ("dark" or "light").
   */
  function resolveTheme(pref) {
    if (pref === 'system' && systemThemeMedia) {
      return systemThemeMedia.matches ? 'light' : 'dark';
    }
    return pref === 'light' ? 'light' : 'dark';
  }

  /**
   * Update theme controls so the toggle button and settings select
   * always reflect the active theme state.
   *
   * @param {string} pref - Persisted theme preference.
   * @param {string} resolved - Rendered theme after resolving preference.
   * @returns {void}
   */
  function syncThemeControls(pref, resolved) {
    if (themeSelect) { themeSelect.value = pref; }

    if (themeToggleText) { themeToggleText.textContent = resolved === 'dark' ? 'Dark' : 'Light'; }

    if (themeToggleIcon) {
      themeToggleIcon.innerHTML = resolved === 'dark' ? '&#9681;' : '&#9728;';
    }

    if (themeToggle) {
      const label = resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      themeToggle.setAttribute('aria-label', label);
      themeToggle.setAttribute('title', label);
    }
  }

  /**
   * Apply and optionally persist a theme preference.
   *
   * @param {string} pref - "dark", "light", or "system".
   * @param {boolean} shouldPersist - Whether to save in localStorage.
   * @returns {void}
   */
  function applyTheme(pref, shouldPersist) {
    themePreference = pref;
    const resolved = resolveTheme(pref);

    document.body.setAttribute('data-theme', resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    syncThemeControls(pref, resolved);
    if (viewAnalytics.classList.contains('active')) { setTimeout(drawLatencyChart, 0); }

    if (shouldPersist) {
      try { localStorage.setItem(THEME_STORAGE_KEY, pref); } catch (_err) {}
    }
  }

  /**
   * Load saved theme preference (if present) and initialize the page theme.
   *
   * @returns {void}
   */
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch (_err) {}

    const initialPref = saved || 'dark';
    applyTheme(initialPref, false);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const resolved = resolveTheme(themePreference);
      const nextTheme = resolved === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', function () {
      applyTheme(themeSelect.value, true);
    });
  }

  if (systemThemeMedia) {
    const handleSystemThemeChange = function () {
      if (themePreference === 'system') {
        applyTheme('system', false);
      }
    };

    if (typeof systemThemeMedia.addEventListener === 'function') {
      systemThemeMedia.addEventListener('change', handleSystemThemeChange);
    } else if (typeof systemThemeMedia.addListener === 'function') {
      systemThemeMedia.addListener(handleSystemThemeChange);
    }
  }

  /* =========================================
     FILTER SIDEBAR (Alerts view)
     ========================================= */
  const filterSidebar = document.getElementById('filter-sidebar');
  const filterCollapseBtn = document.getElementById('filter-collapse-btn');
  const filterClearBtn = document.getElementById('filter-clear-btn');
  const alertsSearchInput = document.getElementById('alerts-search-input');

  filterCollapseBtn.addEventListener('click', function () {
    filterSidebar.classList.toggle('collapsed');
  });

  /**
   * Remove all active filter selections and clear the search input,
   * then re-apply filters to show all alerts.
   *
   * @returns {void}
   */
  filterClearBtn.addEventListener('click', function () {
    document.querySelectorAll('.status-item.active, .select-item.active').forEach(function (item) {
      item.classList.remove('active');
    });
    alertsSearchInput.value = '';
    applyFilters();
  });

  document.querySelectorAll('.facet-header').forEach(function (header) {
    header.addEventListener('click', function () {
      header.parentElement.classList.toggle('collapsed');
    });
  });

  document.querySelectorAll('.status-item').forEach(function (item) {
    item.addEventListener('click', function () {
      item.classList.toggle('active');
      applyFilters();
    });
  });

  document.querySelectorAll('.select-item').forEach(function (item) {
    item.addEventListener('click', function () {
      item.classList.toggle('active');
      applyFilters();
    });
  });

  alertsSearchInput.addEventListener('input', function () {
    applyFilters();
  });

  document.addEventListener('keydown', function (event) {
    const activeTag = document.activeElement && document.activeElement.tagName
      ? document.activeElement.tagName.toLowerCase()
      : '';
    const isEditable = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable);

    if (!isEditable && event.key === '/') {
      event.preventDefault();
      switchView(2);
      alertsSearchInput.focus();
    }
  });

  /**
   * Read all active filters from the sidebar and search bar, then
   * show/hide alert rows accordingly. Updates the visible alert count.
   *
   * Status filters use OR logic (show if row matches any active status).
   * Tag-based filters (security, service, patch) use AND logic across
   * groups — the row must match at least one active item in each group
   * that has any active selections.
   *
   * @returns {void}
   */
  function applyFilters() {
    const activeStatuses = [];
    document.querySelectorAll('#facet-status .status-item.active').forEach(function (item) {
      activeStatuses.push(item.getAttribute('data-status'));
    });

    const activePatchVersions = [];
    document.querySelectorAll('#facet-patch .select-item.active').forEach(function (item) {
      activePatchVersions.push(item.getAttribute('data-value').toLowerCase());
    });

    const activeSecurityTags = [];
    document.querySelectorAll('#facet-security .select-item.active').forEach(function (item) {
      activeSecurityTags.push(item.getAttribute('data-value').toLowerCase());
    });

    const activeServiceTags = [];
    document.querySelectorAll('#facet-service .select-item.active').forEach(function (item) {
      activeServiceTags.push(item.getAttribute('data-value').toLowerCase());
    });

    const searchText = alertsSearchInput.value.toLowerCase().trim();

    const rows = alertsFeed.querySelectorAll('.alert-row');
    let visibleCount = 0;

    rows.forEach(function (row) {
      let show = true;

      if (activeStatuses.length > 0) {
        if (activeStatuses.indexOf(row._eventType) === -1) { show = false; }
      }

      if (show && activePatchVersions.length > 0) {
        if (activePatchVersions.indexOf(row._eventVersion) === -1) { show = false; }
      }

      if (show && activeSecurityTags.length > 0) {
        const hasSecurityMatch = activeSecurityTags.some(function (tag) {
          return row._eventTags.indexOf(tag) !== -1;
        });
        if (!hasSecurityMatch) { show = false; }
      }

      if (show && activeServiceTags.length > 0) {
        const hasServiceMatch = activeServiceTags.some(function (tag) {
          return row._eventTags.indexOf(tag) !== -1;
        });
        if (!hasServiceMatch) { show = false; }
      }

      if (show && searchText) {
        const rowText = (row._eventTitle || '').toLowerCase() +
          ' ' + (row._eventTags || []).join(' ');
        if (rowText.indexOf(searchText) === -1) { show = false; }
      }

      row.style.display = show ? '' : 'none';
      if (show) { visibleCount++; }
    });

    alertsCount.textContent = visibleCount + ' of ' + rows.length + ' alerts';
    if (alertsEmpty) {
      const shouldShowEmpty = rows.length > 0 && visibleCount === 0;
      alertsEmpty.classList.toggle('hidden', !shouldShowEmpty);
    }
  }

  /* =========================================
     MUTE ALERTS
     ========================================= */
  const muteBtn = document.getElementById('mute-btn');
  muteBtn.addEventListener('click', function () {
    muteBtn.classList.toggle('muted');
    muteBtn.textContent = muteBtn.classList.contains('muted') ? 'Unmute Alerts' : 'Mute Alerts';
  });

  /* =========================================
     HOME: HERO STATS & INSIGHTS
     ========================================= */
  /**
   * Toggle skeleton loading treatment on KPI values while stats hydrate.
   *
   * @param {boolean} isLoading - Whether KPI values should render as loading.
   * @returns {void}
   */
  function setStatsLoading(isLoading) {
    statValueElements.forEach(function (el) {
      el.classList.toggle('loading-skeleton', isLoading);
    });
  }

  /**
   * Fetch live stats from the backend and update the 5 hero stat cards.
   * Falls back silently if the backend is unreachable.
   *
   * @returns {void}
   */
  function fetchStats() {
    setStatsLoading(true);

    fetch(STATS_URL, { mode: 'cors' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.activeUsers !== undefined) { document.getElementById('stat-active-users').textContent = Number(d.activeUsers).toLocaleString(); }
        if (d.maxUsers !== undefined) { document.getElementById('stat-max-users').textContent = Number(d.maxUsers).toLocaleString(); }
        if (d.totalErrors !== undefined) { document.getElementById('stat-errors').textContent = d.totalErrors; }
        if (d.avgLatency !== undefined) { document.getElementById('stat-latency').textContent = d.avgLatency; }
        if (d.uptime !== undefined) { document.getElementById('stat-uptime').textContent = d.uptime; }
        updateSystemStatus(d.totalErrors || 0);
      })
      .catch(function () {})
      .finally(function () {
        setStatsLoading(false);
      });
  }

  /**
   * Toggle the system status indicator between "operational" and "degraded"
   * based on the current error count threshold (>50 = degraded).
   *
   * @param {number} errors - Current total error count.
   * @returns {void}
   */
  function updateSystemStatus(errors) {
    const statusChip = document.getElementById('system-status');
    const dot = document.querySelector('.system-status-dot');
    const label = document.querySelector('.system-status-label');
    if (errors > 50) {
      if (statusChip) { statusChip.classList.add('degraded'); }
      dot.className = 'system-status-dot degraded';
      label.textContent = 'Degraded Performance';
    } else {
      if (statusChip) { statusChip.classList.remove('degraded'); }
      dot.className = 'system-status-dot operational';
      label.textContent = 'All Systems Operational';
    }
  }

  /**
   * Populate the Home view's 3 insight panels (Top Issues, Latency Windows,
   * Peak Traffic) with hardcoded demo data.
   *
   * @returns {void}
   */
  function populateInsights() {
    const issuesEl = document.getElementById('insight-issues');
    const latencyEl = document.getElementById('insight-latency');
    const trafficEl = document.getElementById('insight-traffic');

    const issues = [
      {
        title: 'Brute-force login attempts',
        meta: '847 failed attempts in the last hour targeting admin accounts',
        detail: 'src.ip: 192.168.1.42 | geo: Russia | service: auth-service',
        severity: 'high'
      },
      {
        title: 'PostgreSQL connection pool exhausted',
        meta: 'All 50 connections in use, 23 queries waiting in queue',
        detail: 'host: prod-web-01 | avg.wait: 4200ms | affected: checkout, user-service',
        severity: 'high'
      },
      {
        title: 'TLS certificate expiring soon',
        meta: 'Certificate for api.watchtower.io expires in 3 days',
        detail: 'issuer: Let\'s Encrypt | domain: api.watchtower.io | auto-renew: failed',
        severity: 'medium'
      }
    ];

    const latencyWindows = [
      {
        title: '09:00 – 11:00  |  Peak Morning',
        meta: 'Average 342ms — 2.4x above the 142ms baseline',
        detail: 'p95: 520ms | p99: 890ms | affected endpoints: /api/users, /api/checkout',
        severity: 'high'
      },
      {
        title: '14:00 – 16:00  |  Afternoon Spike',
        meta: 'Average 298ms — 2.1x above baseline',
        detail: 'p95: 445ms | p99: 720ms | correlated with deployment auth-service v2.14.3',
        severity: 'medium'
      },
      {
        title: '20:00 – 21:00  |  Evening Load',
        meta: 'Average 267ms — 1.9x above baseline',
        detail: 'p95: 390ms | p99: 610ms | region: US-East showing highest impact',
        severity: 'low'
      }
    ];

    const trafficPeaks = [
      {
        title: '10:00 – 11:00  |  Highest Volume',
        meta: '3,420 events/min — 48% above daily average',
        detail: 'top sources: auth-service (42%), payment-api (28%), user-service (18%)',
        severity: 'high'
      },
      {
        title: '14:00 – 15:00  |  Post-deploy Surge',
        meta: '2,890 events/min — correlated with v2.14.3 rollout',
        detail: 'error rate: 3.2% | new errors: TypeError in checkout.js (line 142)',
        severity: 'medium'
      },
      {
        title: '09:00 – 10:00  |  Morning Ramp-up',
        meta: '2,650 events/min — normal workday onset pattern',
        detail: 'user logins: +340% from 08:00 | regions: US-East (62%), EU-West (24%)',
        severity: 'low'
      }
    ];

    renderInsightList(issuesEl, issues);
    renderInsightList(latencyEl, latencyWindows);
    renderInsightList(trafficEl, trafficPeaks);
  }

  /**
   * Render a ranked list of insight items into a container element.
   * If the container is the issues panel, clicking an item navigates
   * to the Alerts view and expands the matching alert row.
   *
   * @param {HTMLElement} container - The DOM element to render into.
   * @param {Object[]} items - Array of insight objects with title, meta, detail, and severity.
   * @returns {void}
   */
  function renderInsightList(container, items) {
    const isIssuesPanel = container.id === 'insight-issues';
    const kindGlyph = container.id === 'insight-issues'
      ? '&#9888;'
      : (container.id === 'insight-latency' ? '&#9201;' : '&#9652;');

    container.innerHTML = '';
    items.forEach(function (item, i) {
      const el = document.createElement('div');
      el.className = 'insight-item severity-' + (item.severity || 'low');
      el.innerHTML =
        '<span class="insight-rank">' + (i + 1) + '</span>' +
        '<div class="insight-body">' +
          '<div class="insight-text"><span class="insight-kind">' + kindGlyph + '</span>' + item.title + '</div>' +
          '<div class="insight-meta">' + item.meta + '</div>' +
          (item.detail ? '<div class="insight-detail">' + item.detail + '</div>' : '') +
        '</div>';

      if (isIssuesPanel) {
        el.addEventListener('click', function () {
          navigateToAlert(item.title);
        });
      }

      container.appendChild(el);
    });
  }

  /**
   * Switch to the Alerts view and find the alert row whose title
   * best matches the given insight title. Scrolls to it and expands it.
   * Uses keyword matching — splits the title into words and finds the
   * alert row with the most keyword overlap.
   *
   * @param {string} title - The insight title to search for.
   * @returns {void}
   */
  function navigateToAlert(title) {
    switchView(2);

    setTimeout(function () {
      const keywords = title.toLowerCase().split(/\s+/).filter(function (w) {
        return w.length > 3;
      });
      const rows = alertsFeed.querySelectorAll('.alert-row');
      let bestRow = null;
      let bestScore = 0;

      rows.forEach(function (row) {
        if (!row._eventTitle) { return; }
        const alertTitle = row._eventTitle.toLowerCase();
        const score = keywords.filter(function (kw) {
          return alertTitle.indexOf(kw) !== -1;
        }).length;
        if (score > bestScore) {
          bestScore = score;
          bestRow = row;
        }
      });

      if (bestRow && bestScore > 0) {
        bestRow.classList.add('expanded');
        bestRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  /* =========================================
     HOME: VERSION HISTORY BRANCH
     ========================================= */
  /**
   * Build the version history timeline in the Home view sidebar.
   * Renders version nodes with tag, date, and description. Marks
   * the current release and major versions with distinct styles.
   *
   * @returns {void}
   */
  function initVersionBranch() {
    const container = document.getElementById('version-branch');
    const versions = [
      { tag: 'v2.14.3', date: '2026-05-16', desc: 'Hotfix: auth rate-limit bypass patch', current: true },
      { tag: 'v2.14.2', date: '2026-05-14', desc: 'Fix checkout TypeError on null user session' },
      { tag: 'v2.14.1', date: '2026-05-12', desc: 'Patch connection pool leak under high load' },
      { tag: 'v2.14.0', date: '2026-05-08', desc: 'Add real-time SSE streaming for alerts', major: true },
      { tag: 'v2.13.8', date: '2026-05-03', desc: 'TLS auto-renewal retry logic' },
      { tag: 'v2.13.7', date: '2026-04-28', desc: 'Memory threshold alerting improvements' },
      { tag: 'v2.13.0', date: '2026-04-15', desc: 'Observability SDK v1 + event batching', major: true },
      { tag: 'v2.12.0', date: '2026-03-30', desc: 'Dashboard redesign — 3-view architecture', major: true }
    ];

    container.innerHTML = '';
    versions.forEach(function (v) {
      const node = document.createElement('div');
      node.className = 'version-node';
      if (v.current) { node.classList.add('current'); }
      if (v.major) { node.classList.add('major'); }
      node.innerHTML =
        '<div class="version-tag">' + v.tag + '</div>' +
        '<div class="version-date">' + v.date + '</div>' +
        '<div class="version-desc">' + v.desc + '</div>';
      container.appendChild(node);
    });
  }

  /**
   * Scroll to a Home bundle panel and briefly highlight it.
   *
   * @param {string} selector - CSS selector for the target bundle.
   * @returns {void}
   */
  function focusBundle(selector) {
    switchView(0);
    const target = document.querySelector(selector);
    if (!target) { return; }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('focus-flash');
    setTimeout(function () { target.classList.add('focus-flash'); }, 40);
    setTimeout(function () { target.classList.remove('focus-flash'); }, 900);
  }

  /**
   * Attach click and keyboard activation behavior to a clickable card.
   *
   * @param {HTMLElement | null} el - Card element.
   * @param {Function} handler - Action to trigger.
   * @returns {void}
   */
  function bindActivatableCard(el, handler) {
    if (!el) { return; }

    el.addEventListener('click', handler);
    el.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler();
      }
    });
  }

  const issuesCard = document.querySelector('.stat-card.linked-issues');
  const latencyCard = document.querySelector('.stat-card.linked-latency');
  const trafficCard = document.querySelector('.stat-card.linked-traffic');

  bindActivatableCard(issuesCard, function () { focusBundle('.bundle-panel.issues'); });
  bindActivatableCard(latencyCard, function () { focusBundle('.bundle-panel.latency'); });
  bindActivatableCard(trafficCard, function () { focusBundle('.bundle-panel.traffic'); });

  /* =========================================
     ANALYTICS: VOLUME BAR CHART
     ========================================= */
  /**
   * Create the 48-bar event volume chart with randomized heights.
   * Bars above 85% height are marked as spikes.
   *
   * @returns {void}
   */
  function initVolumeChart() {
    const container = document.getElementById('volume-chart');
    const xAxis = document.getElementById('volume-x-axis');

    for (let i = 0; i < 48; i++) {
      const bar = document.createElement('div');
      bar.className = 'volume-bar';
      let h = Math.random() * 75 + 10;
      if (i >= 18 && i <= 22) { h = Math.random() * 30 + 70; }
      if (i >= 28 && i <= 32) { h = Math.random() * 30 + 65; }
      bar.style.height = h + '%';
      if (h > 85) { bar.classList.add('spike'); }
      container.appendChild(bar);
    }

    ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'].forEach(function (t) {
      const s = document.createElement('span');
      s.textContent = t;
      xAxis.appendChild(s);
    });
  }

  /* =========================================
     ANALYTICS: USER VOLUME BAR CHART
     ========================================= */
  /**
   * Create the 48-bar user activity chart with a realistic daily curve
   * (low morning, peak afternoon, taper evening).
   *
   * @returns {void}
   */
  function initUserVolumeChart() {
    const container = document.getElementById('user-volume-chart');
    const xAxis = document.getElementById('user-volume-x-axis');

    for (let i = 0; i < 48; i++) {
      const bar = document.createElement('div');
      bar.className = 'user-volume-bar';
      let h;
      if (i < 12) { h = 10 + i * 5 + Math.random() * 10; }
      else if (i < 24) { h = 55 + Math.random() * 35; }
      else if (i < 36) { h = 70 + Math.random() * 25; }
      else { h = 80 - (i - 36) * 5 + Math.random() * 10; }
      h = Math.min(h, 100);
      bar.style.height = h + '%';
      if (h > 85) { bar.classList.add('peak'); }
      container.appendChild(bar);
    }

    ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'].forEach(function (t) {
      const s = document.createElement('span');
      s.textContent = t;
      xAxis.appendChild(s);
    });
  }

  /* =========================================
     ANALYTICS: LATENCY LINE CHART (Canvas)
     ========================================= */
  let latencyData = [];

  /**
   * Generate 24 hourly latency data points with simulated morning
   * and afternoon spikes for the canvas chart.
   *
   * @returns {void}
   */
  function generateLatencyData() {
    latencyData = [];
    for (let i = 0; i < 24; i++) {
      const base = 100 + Math.sin(i * 0.4) * 30;
      const spike = (i >= 9 && i <= 11) || (i >= 14 && i <= 16);
      const val = spike ? base + Math.random() * 150 + 80 : base + Math.random() * 60;
      latencyData.push(Math.min(Math.round(val), 420));
    }
  }

  /**
   * Render the latency line chart on the canvas element. Draws grid lines,
   * axis labels, an area fill under the curve, data points (gray below
   * threshold, yellow above), and a dashed 250ms threshold line.
   * Handles high-DPI scaling automatically.
   *
   * @returns {void}
   */
  function drawLatencyChart() {
    const canvas = document.getElementById('latency-canvas');
    if (!canvas) { return; }

    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padLeft = 44;
    const padRight = 16;
    const padTop = 12;
    const padBottom = 28;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const maxVal = 450;
    const ySteps = [0, 150, 300, 450];
    const isLightTheme = document.body.getAttribute('data-theme') === 'light';
    const palette = isLightTheme
      ? {
          grid: 'rgba(76, 110, 156, 0.2)',
          label: '#5A7193',
          areaStart: 'rgba(15, 122, 240, 0.24)',
          areaEnd: 'rgba(15, 122, 240, 0.03)',
          line: '#0F7AF0',
          pointHot: '#0F7AF0',
          pointCool: '#7A94B7',
          threshold: 'rgba(207, 79, 79, 0.6)',
          thresholdText: 'rgba(173, 65, 65, 0.85)'
        }
      : {
          grid: 'rgba(95, 126, 169, 0.2)',
          label: '#8EA4C5',
          areaStart: 'rgba(78, 167, 255, 0.3)',
          areaEnd: 'rgba(78, 167, 255, 0.02)',
          line: '#4EA7FF',
          pointHot: '#4EA7FF',
          pointCool: '#5C7495',
          threshold: 'rgba(255, 116, 116, 0.56)',
          thresholdText: 'rgba(255, 154, 154, 0.85)'
        };

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ySteps.forEach(function (val) {
      const y = padTop + chartH - (val / maxVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();
    });

    // Y-axis labels
    ctx.fillStyle = palette.label;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ySteps.forEach(function (val) {
      const y = padTop + chartH - (val / maxVal) * chartH;
      ctx.fillText(val + 'ms', padLeft - 8, y + 4);
    });

    // X-axis labels
    ctx.textAlign = 'center';
    for (let xi = 0; xi < 24; xi += 4) {
      const xPos = padLeft + (xi / 23) * chartW;
      ctx.fillText(String(xi).padStart(2, '0') + ':00', xPos, h - 6);
    }

    // Area fill
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);
    latencyData.forEach(function (val, i) {
      const x = padLeft + (i / (latencyData.length - 1)) * chartW;
      const y = padTop + chartH - (val / maxVal) * chartH;
      if (i === 0) { ctx.lineTo(x, y); }
      else { ctx.lineTo(x, y); }
    });
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, palette.areaStart);
    grad.addColorStop(1, palette.areaEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    latencyData.forEach(function (val, i) {
      const x = padLeft + (i / (latencyData.length - 1)) * chartW;
      const y = padTop + chartH - (val / maxVal) * chartH;
      if (i === 0) { ctx.moveTo(x, y); }
      else { ctx.lineTo(x, y); }
    });
    ctx.stroke();

    // Data points
    latencyData.forEach(function (val, i) {
      const x = padLeft + (i / (latencyData.length - 1)) * chartW;
      const y = padTop + chartH - (val / maxVal) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = val > 280 ? palette.pointHot : palette.pointCool;
      ctx.fill();
    });

    // Threshold line
    const threshY = padTop + chartH - (250 / maxVal) * chartH;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = palette.threshold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, threshY);
    ctx.lineTo(padLeft + chartW, threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = palette.thresholdText;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('threshold: 250ms', padLeft + 4, threshY - 6);
  }

  /* =========================================
     ALERTS: EVENT STREAM & FEED
     ========================================= */
  const alertsFeed = document.getElementById('alerts-feed');
  const alertsCount = document.getElementById('alerts-count');
  const alertsEmpty = document.getElementById('alerts-empty');

  /**
   * Open a Server-Sent Events connection to the backend for live alert
   * ingestion. Automatically reconnects after 5 seconds on failure.
   *
   * @returns {void}
   */
  function connectStream() {
    let evtSource;
    try { evtSource = new EventSource(STREAM_URL); } catch (_e) { return; }

    evtSource.onmessage = function (e) {
      try { processEvent(JSON.parse(e.data)); } catch (_err) { /* malformed event */ }
    };

    evtSource.onerror = function () {
      evtSource.close();
      setTimeout(connectStream, 5000);
    };
  }

  /**
   * Route an incoming event to the alert feed if its type is
   * error, critical, or warning.
   *
   * @param {Object} event - A parsed event object from the SSE stream.
   * @returns {void}
   */
  function processEvent(event) {
    const type = (event.type || '').toLowerCase();
    if (type === 'error' || type === 'critical' || type === 'warning') {
      appendAlert(event);
    }
  }

  /**
   * Build an alert row from the event and prepend it to the feed.
   * Caps the feed at 150 rows to prevent DOM bloat. Updates filter
   * counts and re-applies active filters.
   *
   * @param {Object} event - A parsed alert event.
   * @returns {void}
   */
  function appendAlert(event) {
    const row = buildAlertRow(event);
    alertsFeed.prepend(row);

    while (alertsFeed.children.length > 150) {
      alertsFeed.removeChild(alertsFeed.lastChild);
    }

    updateFilterCounts();
    applyFilters();
  }

  /**
   * Count alert rows by severity type and update the sidebar count badges.
   *
   * @returns {void}
   */
  function updateFilterCounts() {
    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    alertsFeed.querySelectorAll('.alert-row').forEach(function (row) {
      if (row._eventType && counts.hasOwnProperty(row._eventType)) {
        counts[row._eventType]++;
      }
    });

    const critEl = document.getElementById('count-critical');
    const errEl = document.getElementById('count-error');
    const warnEl = document.getElementById('count-warning');
    const infoEl = document.getElementById('count-info');
    if (critEl) { critEl.textContent = counts.critical; }
    if (errEl) { errEl.textContent = counts.error; }
    if (warnEl) { warnEl.textContent = counts.warning; }
    if (infoEl) { infoEl.textContent = counts.info; }
  }

  /**
   * Construct a DOM element for a single alert row with timestamp,
   * severity badge, title, tags, key-value metadata, and an expandable
   * detail panel that opens on click.
   *
   * @param {Object} event - A parsed alert event with type, timestamp, tags, and data.
   * @returns {HTMLElement} The assembled alert row div.
   */
  function buildAlertRow(event) {
    const row = document.createElement('div');
    row.className = 'alert-row';

    const type = (event.type || '').toLowerCase();
    if (type === 'critical') { row.classList.add('sev-critical'); }
    else if (type === 'error') { row.classList.add('sev-error'); }
    else { row.classList.add('sev-warning'); }

    const title = (event.data && (event.data.title || event.data.message)) || event.type || 'Unknown';
    const tags = event.tags || [];
    const kvPairs = extractKVPairs(event.data);

    const version = event.deployVersion || '';
    let tagsHtml = '';
    if (version) {
      tagsHtml += '<span class="alert-tag version-tag">' + escapeHtml(version) + '</span>';
    }
    tagsHtml += tags.map(function (t) {
      return '<span class="alert-tag">' + escapeHtml(t) + '</span>';
    }).join('');

    const kvHtml = kvPairs.map(function (kv) {
      return '<span class="alert-kv"><span class="key">' + escapeHtml(kv.key) + ':</span> <span class="value">' + escapeHtml(kv.value) + '</span></span>';
    }).join('');

    const expandHtml = buildExpandPanel(event, type);

    row.innerHTML =
      '<div class="alert-time">' +
        '<span class="alert-timestamp">' + formatTimestamp(event.timestamp) + '</span>' +
        '<span class="alert-ago">' + getLastSeen(event.timestamp) + '</span>' +
      '</div>' +
      '<div class="alert-severity">' +
        '<span class="sev-badge ' + type + '">' + type + '</span>' +
      '</div>' +
      '<div class="alert-details">' +
        '<div class="alert-title">' + escapeHtml(title) + '</div>' +
        '<div class="alert-tags">' + tagsHtml + '</div>' +
        '<div class="alert-kvs">' + kvHtml + '</div>' +
      '</div>' +
      expandHtml;

    row.addEventListener('click', function () {
      row.classList.toggle('expanded');
    });

    row._eventTitle = title;
    row._eventType = type;
    row._eventTags = tags.map(function (t) { return t.toLowerCase(); });
    row._eventVersion = (event.deployVersion || '').toLowerCase();

    return row;
  }

  /**
   * Build the HTML for the expandable detail panel shown when an
   * alert row is clicked. Shows all data fields in a grid layout.
   *
   * @param {Object} event - The full event object.
   * @param {string} type - The severity type string.
   * @returns {string} HTML string for the expand panel.
   */
  function buildExpandPanel(event, type) {
    const data = event.data || {};
    const allKeys = Object.keys(data);
    let items = '';

    items += '<div class="alert-expand-item">' +
      '<span class="alert-expand-key">Severity</span>' +
      '<span class="alert-expand-value">' + escapeHtml(type.toUpperCase()) + '</span></div>';

    items += '<div class="alert-expand-item">' +
      '<span class="alert-expand-key">Timestamp</span>' +
      '<span class="alert-expand-value">' + escapeHtml(event.timestamp || 'N/A') + '</span></div>';

    if (event.sessionId) {
      items += '<div class="alert-expand-item">' +
        '<span class="alert-expand-key">Session ID</span>' +
        '<span class="alert-expand-value">' + escapeHtml(event.sessionId) + '</span></div>';
    }

    if (event.tags && event.tags.length) {
      items += '<div class="alert-expand-item">' +
        '<span class="alert-expand-key">Tags</span>' +
        '<span class="alert-expand-value">' + escapeHtml(event.tags.join(', ')) + '</span></div>';
    }

    let stackHtml = '';
    allKeys.forEach(function (key) {
      if (key === 'stack' && data[key]) {
        stackHtml = '<div class="alert-expand-stack">' +
          '<span class="alert-expand-key">Stack Trace</span>' +
          '<pre>' + escapeHtml(String(data[key])) + '</pre></div>';
        return;
      }
      const val = data[key];
      const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      items += '<div class="alert-expand-item">' +
        '<span class="alert-expand-key">' + escapeHtml(key) + '</span>' +
        '<span class="alert-expand-value">' + escapeHtml(displayVal) + '</span></div>';
    });

    return '<div class="alert-expand">' +
      '<div class="alert-expand-title">Full Event Log</div>' +
      '<div class="alert-expand-grid">' + items + stackHtml + '</div></div>';
  }

  /* =========================================
     HELPERS
     ========================================= */
  /**
   * Format an ISO timestamp into "HH:MM:SS.mmm" for display.
   *
   * @param {string} iso - ISO 8601 timestamp string.
   * @returns {string} Formatted time with milliseconds.
   */
  function formatTimestamp(iso) {
    if (!iso) { return '--:--:--'; }
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  /**
   * Return a human-readable "X mins ago" string from an ISO timestamp.
   *
   * @param {string} iso - ISO 8601 timestamp string.
   * @returns {string} Relative time label (e.g. "just now", "3 mins ago").
   */
  function getLastSeen(iso) {
    if (!iso) { return 'just now'; }
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) { return 'just now'; }
    if (diff === 1) { return '1 min ago'; }
    return diff + ' mins ago';
  }

  /**
   * Extract up to 6 key-value pairs from an event's data object,
   * skipping "title" and "message" fields and nested objects.
   *
   * @param {Object} data - The event data payload.
   * @returns {Object[]} Array of { key, value } pairs.
   */
  function extractKVPairs(data) {
    if (!data || typeof data !== 'object') { return []; }
    const skip = ['title', 'message'];
    const pairs = [];
    Object.keys(data).forEach(function (key) {
      if (skip.indexOf(key) !== -1) { return; }
      if (typeof data[key] === 'object') { return; }
      pairs.push({ key: key, value: String(data[key]) });
    });
    return pairs.slice(0, 6);
  }

  /**
   * Escape a string for safe insertion into innerHTML using DOM text encoding.
   *
   * @param {string} str - Raw string to escape.
   * @returns {string} HTML-safe string.
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* =========================================
     SEED DATA
     ========================================= */
  /**
   * Load hardcoded seed alerts into the feed so the dashboard has
   * content on initial load without a running backend.
   *
   * @returns {void}
   */
  function loadSeedData() {
    const seeds = [
      {
        type: 'critical', timestamp: new Date(Date.now() - 120000).toISOString(),
        deployVersion: 'v2.14.3',
        tags: ['brute-force', 'auth-service', 'security'],
        data: { title: 'Account Take Over - Potential successful brute-force', 'usr.name': 'admin', 'src.ip': '192.168.1.42', attempts: '847', 'geo.country': 'RU' }
      },
      {
        type: 'error', timestamp: new Date(Date.now() - 240000).toISOString(),
        deployVersion: 'v2.14.3',
        tags: ['js-error', 'frontend', 'checkout'],
        data: { title: 'Uncaught TypeError: Cannot read property "id" of undefined', source: '/app/checkout.js', line: '142', browser: 'Chrome 124' }
      },
      {
        type: 'warning', timestamp: new Date(Date.now() - 360000).toISOString(),
        deployVersion: 'v2.14.3',
        tags: ['rate-limit', 'api-gateway', 'throttle'],
        data: { title: 'Rate limit threshold exceeded for /api/v2/users', 'client.id': 'app_3fa8b2', requests: '1520', limit: '1000', window: '60s' }
      },
      {
        type: 'error', timestamp: new Date(Date.now() - 500000).toISOString(),
        deployVersion: 'v2.14.2',
        tags: ['database', 'timeout', 'prod-web-01'],
        data: { title: 'PostgreSQL connection pool exhausted', active: '50', max: '50', waiting: '23', 'avg.wait': '4200ms' }
      },
      {
        type: 'critical', timestamp: new Date(Date.now() - 700000).toISOString(),
        deployVersion: 'v2.14.2',
        tags: ['ssl', 'certificate', 'security'],
        data: { title: 'TLS certificate expires in 3 days', domain: 'api.watchtower.io', 'expires.at': '2026-05-19', issuer: "Let's Encrypt" }
      },
      {
        type: 'warning', timestamp: new Date(Date.now() - 900000).toISOString(),
        deployVersion: 'v2.14.2',
        tags: ['memory', 'infrastructure', 'prod-api-01'],
        data: { title: 'Memory usage exceeded 85% threshold', 'mem.used': '13.6GB', 'mem.total': '16GB', 'process.top': 'node (3.2GB)' }
      },
      {
        type: 'critical', timestamp: new Date(Date.now() - 1100000).toISOString(),
        deployVersion: 'v2.13.8',
        tags: ['auth', 'session', 'compliance'],
        data: { title: 'Session token storage non-compliant with new policy', service: 'auth-middleware', 'policy.id': 'SEC-2026-04', action: 'block' }
      },
      {
        type: 'error', timestamp: new Date(Date.now() - 1300000).toISOString(),
        deployVersion: 'v2.13.8',
        tags: ['payment', 'timeout', 'stripe'],
        data: { title: 'Payment gateway timeout — transaction rolled back', 'txn.id': 'txn_9f3a2b', amount: '$142.00', retry: '3/3' }
      }
    ];

    seeds.forEach(function (evt) { processEvent(evt); });
  }

  /* =========================================
     INIT
     ========================================= */
  generateLatencyData();
  initTheme();
  initVolumeChart();
  initUserVolumeChart();
  populateInsights();
  initVersionBranch();
  fetchStats();
  connectStream();
  loadSeedData();

  window.addEventListener('resize', function () {
    if (viewAnalytics.classList.contains('active')) { drawLatencyChart(); }
  });

  viewAnalytics.addEventListener('transitionend', function () {
    if (viewAnalytics.classList.contains('active')) { drawLatencyChart(); }
  });

  setTimeout(drawLatencyChart, 100);
})();
