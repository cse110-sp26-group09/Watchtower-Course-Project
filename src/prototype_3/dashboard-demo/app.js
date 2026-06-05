(function () {
  "use strict";

  const state = {
    mode: "manager",
    view: "home",
    range: "24h",
    issueLimit: 4,
    issuesMuted: false,
  };

  const viewLabels = { home: "Home", issues: "Issues", health: "Health", analytics: "Analytics", settings: "Settings" };
  const severityLabels = { critical: "Critical", warning: "Warning", info: "Info" };
  const severityRank = { critical: 3, warning: 2, info: 1 };

  const data = {
    issues: [
      { id: "ISS-1042", severity: "critical", title: "Checkout TypeError after payment handoff", route: "/checkout", app: "watchtower-demo", version: "v1.8.5", time: "8m", users: 36, owner: "Hieu", message: "Cannot read properties of undefined: reading 'total'", stack: "CheckoutSummary.render -> PaymentComplete.mount -> Router.commit" },
      { id: "ISS-1037", severity: "warning", title: "POST /checkout returned 502 for card retry", route: "/checkout", app: "watchtower-demo", version: "v1.8.5", time: "18m", users: 19, owner: "James", message: "Gateway timeout during retry window", stack: "api.checkout.retry -> gateway.authorize -> retryQueue.flush" },
      { id: "ISS-1029", severity: "warning", title: "Feedback drawer froze on mobile Safari", route: "/feedback", app: "watchtower-demo", version: "v1.8.4", time: "31m", users: 11, owner: "Josh", message: "Touch listener blocked the drawer close action", stack: "FeedbackDrawer.open -> gestureTrap.attach -> input.blur" },
      { id: "ISS-1022", severity: "info", title: "Product grid image took longer than expected", route: "/products", app: "watchtower-demo", version: "v1.8.5", time: "44m", users: 7, owner: "Hemendra", message: "Largest image loaded after the p95 threshold", stack: "ProductGrid.observe -> ImageCard.load -> PerformanceObserver" },
      { id: "ISS-1018", severity: "info", title: "Deploy note attached to latency regression", route: "/demo", app: "watchtower-demo", version: "v1.8.5", time: "1h", users: 5, owner: "Fahad", message: "Release changed client bundle split around checkout", stack: "DeployMarker.compare -> release.diff -> impactSummary" },
    ],
    labels: ["-21h", "-18h", "-15h", "-12h", "-9h", "-6h", "-3h", "Now"],
    users: [3, 4, 4, 5, 6, 7, 7, 8],
    actions: [24, 28, 31, 35, 39, 44, 51, 58],
    errors: [0, 1, 1, 2, 1, 3, 2, 4],
    latency: [180, 194, 221, 248, 280, 312, 289, 326],
    health: [
      { key: "Availability", score: 98, tone: "good" },
      { key: "Errors", score: 72, tone: "warning" },
      { key: "Latency", score: 81, tone: "good" },
      { key: "Signal", score: 88, tone: "good" },
      { key: "Feedback", score: 76, tone: "good" },
    ],
    breakdown: [
      { key: "Performance", className: "teal", detail: "Pageload + web vitals", value: 44, color: "var(--teal)" },
      { key: "Errors", className: "coral", detail: "Runtime + API failures", value: 24, color: "var(--coral)" },
      { key: "Feedback", className: "amber", detail: "Ratings + comments", value: 12, color: "var(--amber)" },
      { key: "Clicks", className: "blue", detail: "Click + custom actions", value: 20, color: "var(--blue)" },
    ],
  };

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character];
    });
  }

  function average(values) {
    return Math.round(values.reduce(function (sum, value) { return sum + value; }, 0) / values.length);
  }

  function activeIssues() {
    return data.issues.filter(function (issue) { return issue.severity !== "info"; });
  }

  function healthScore() {
    return average(data.health.map(function (item) { return item.score; }));
  }

  function healthStatus(score) {
    if (score >= 75) return { label: "Healthy", className: "good" };
    if (score >= 55) return { label: "Watch", className: "warning" };
    return { label: "Critical", className: "critical" };
  }

  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderMode() {
    document.body.dataset.dashboardMode = state.mode;
    qsa(".mode-toggle-option").forEach(function (button) {
      const isActive = button.getAttribute("data-mode") === state.mode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    qsa("[data-dashboard-mode]").forEach(function (element) {
      element.hidden = element.getAttribute("data-dashboard-mode") !== state.mode;
    });
  }

  function activateView(viewName, scrollTarget) {
    state.view = viewName;
    qsa(".view").forEach(function (section) {
      const active = section.id === viewName + "-view";
      section.hidden = !active;
      section.classList.toggle("active", active);
    });
    qsa("[data-view]").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-view") === viewName);
    });
    window.location.hash = viewName;
    if (scrollTarget) {
      window.setTimeout(function () {
        const target = document.getElementById(scrollTarget);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  }

  function renderTimeline(id, rows) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = rows.map(function (row) {
      return "<li><span class=\"timeline-time\">" + escapeHtml(row[0]) + "</span><span class=\"timeline-copy\">" + escapeHtml(row[1]) + "</span></li>";
    }).join("");
  }

  function renderList(id, rows) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = rows.map(function (row) { return "<li>" + escapeHtml(row) + "</li>"; }).join("");
  }

  function renderTopline() {
    const openIssues = activeIssues().length;
    setText("active-issues-count", openIssues + (openIssues === 1 ? " active issue" : " active issues"));
    setText("last-updated", "Updated " + formatTime());
  }

  function renderHome() {
    const openIssues = activeIssues().length;
    const totalEvents = data.actions.reduce(function (sum, value) { return sum + value; }, 0);
    const peakUsers = Math.max.apply(null, data.users);
    const avgLatency = average(data.latency);
    const peakTraffic = Math.max.apply(null, data.actions);

    setText("active-users", "8");
    setText("total-events", String(totalEvents));
    setText("total-errors", String(openIssues));
    setText("version-count", "2");
    setText("dev-active-users", "8");
    setText("dev-max-users", String(peakUsers));
    setText("dev-active-issues", String(openIssues));
    setText("dev-avg-latency", avgLatency + " ms");
    setText("dev-peak-traffic", peakTraffic + "/min");
    setText("dev-patch-deployed", "2");
    setText("dev-active-issues-trend", openIssues > 0 ? "Needs review" : "No blockers");
    setText("dev-avg-latency-trend", "Across 4 routes");
    setText("dev-peak-traffic-trend", "Requests per minute");
    setText("dev-patch-deployed-trend", "Versions seen");

    const buildMetadata = document.getElementById("build-metadata");
    if (buildMetadata) {
      buildMetadata.innerHTML = [["Current version", "v1.8.5"], ["Previous version", "v1.8.4"], ["Release owner", "Frontend team"], ["Signal coverage", "92%"]].map(function (item) {
        return "<div><span>" + item[0] + "</span><strong>" + item[1] + "</strong></div>";
      }).join("");
    }

    renderTimeline("activity-feed", [["Now", "Checkout route produced a fresh latency sample at " + avgLatency + " ms."], ["8m", "Critical checkout TypeError affected 36 demo sessions."], ["18m", "Deploy v1.8.5 correlated with a warning-level 502 spike."], ["31m", "Feedback drawer freeze reported on mobile Safari."]]);
    renderList("manager-summary-list", ["Open issues are concentrated around checkout and feedback.", "Latency is watch-level but still under the critical threshold.", "Deploy v1.8.5 has the strongest correlation with recent spikes."]);
    renderInsightCards();
    renderDeveloperSummary();
    renderPatchNotes();
  }

  function renderInsightCards() {
    renderInlineIssues("developer-insight-issues", data.issues.slice(0, 3));
    renderInlinePairs("developer-insight-latency", [["/checkout", "326 ms"], ["/feedback", "281 ms"], ["/products", "244 ms"]]);
    renderInlinePairs("developer-insight-traffic", [["10:00-11:00", "58/min"], ["14:00-15:00", "51/min"], ["Now", "42/min"]]);
  }

  function renderInlineIssues(id, rows) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = rows.map(function (issue, index) {
      return "<li><span>" + (index + 1) + "</span><strong>" + escapeHtml(issue.title) + "</strong><small>" + escapeHtml(issue.route) + " | " + escapeHtml(issue.version) + "</small></li>";
    }).join("");
  }

  function renderInlinePairs(id, rows) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = rows.map(function (row, index) {
      return "<li><span>" + (index + 1) + "</span><strong>" + escapeHtml(row[0]) + "</strong><small>" + escapeHtml(row[1]) + "</small></li>";
    }).join("");
  }

  function renderDeveloperSummary() {
    const score = healthScore();
    const status = healthStatus(score);
    setText("dev-home-summary-copy", "System reliability is " + status.label.toLowerCase() + " with checkout carrying most of the demo risk.");
    setText("dev-overall-score", score + "%");
    setText("dev-overall-label", status.label + " reliability");
    setText("dev-home-summary-errors", activeIssues().length + " open issues");
    renderList("dev-home-summary-list", ["Availability remains strong at 98%.", "Error score is watch-level because checkout has fresh failures.", "Latency is stable enough for the demo, but checkout is still the slowest route."]);
    const metrics = document.getElementById("dev-home-summary-metrics");
    if (metrics) {
      metrics.innerHTML = data.health.map(function (item) {
        return "<div><span>" + escapeHtml(item.key) + "</span><strong>" + item.score + "%</strong></div>";
      }).join("");
    }
  }

  function renderPatchNotes() {
    const container = document.getElementById("developer-patch-list");
    if (!container) return;
    container.innerHTML = [["v1.8.5", "Checkout retry handling changed; watch for payment and latency regressions.", "2 issues"], ["v1.8.4", "Feedback drawer gesture fix shipped for mobile browsers.", "1 issue"]].map(function (row) {
      return "<article class=\"patch-card\"><strong>" + row[0] + "</strong><p>" + row[1] + "</p><span>" + row[2] + "</span></article>";
    }).join("");
  }

  function filteredIssues() {
    const severity = (document.getElementById("issue-filter-severity") || {}).value || "all";
    const version = ((document.getElementById("issue-filter-version") || {}).value || "").toLowerCase();
    const app = ((document.getElementById("issue-filter-app") || {}).value || "").toLowerCase();
    const route = ((document.getElementById("issue-filter-route") || {}).value || "").toLowerCase();
    const search = ((document.getElementById("developer-issue-search") || {}).value || "").toLowerCase();
    const sortField = (document.getElementById("issue-sort-field") || {}).value || "timestamp";
    const sortDirection = (document.getElementById("issue-sort-direction") || {}).value || "desc";
    const filtered = data.issues.filter(function (issue) {
      const haystack = [issue.title, issue.route, issue.app, issue.version, issue.message].join(" ").toLowerCase();
      return (severity === "all" || issue.severity === severity) && (!version || issue.version.toLowerCase().includes(version)) && (!app || issue.app.toLowerCase().includes(app)) && (!route || issue.route.toLowerCase().includes(route)) && (!search || haystack.includes(search));
    });
    filtered.sort(function (left, right) {
      let value = 0;
      if (sortField === "severity") value = severityRank[left.severity] - severityRank[right.severity];
      else if (sortField === "version") value = left.version.localeCompare(right.version);
      else if (sortField === "route") value = left.route.localeCompare(right.route);
      else value = data.issues.indexOf(right) - data.issues.indexOf(left);
      return sortDirection === "asc" ? value : -value;
    });
    return filtered;
  }

  function renderIssues() {
    const container = document.getElementById("issue-list");
    if (!container) return;
    const rows = filteredIssues();
    container.innerHTML = rows.slice(0, state.issueLimit).map(function (issue) {
      return "<article class=\"issue-row severity-" + issue.severity + "\" tabindex=\"0\"><div class=\"issue-main\"><span class=\"severity-pill severity-" + issue.severity + "\">" + severityLabels[issue.severity] + "</span><h3>" + escapeHtml(issue.title) + "</h3><p>" + escapeHtml(issue.message) + "</p><div class=\"issue-meta\"><span>" + escapeHtml(issue.id) + "</span><span>" + escapeHtml(issue.route) + "</span><span>" + escapeHtml(issue.version) + "</span><span>" + issue.users + " users</span></div></div><label class=\"assign-control\"><span>Owner</span><select><option>" + escapeHtml(issue.owner) + "</option><option>Unassigned</option><option>Frontend team</option></select></label><div class=\"issue-expand\"><p class=\"issue-expand-title\">Demo trace detail</p><div class=\"issue-expand-grid\"><span class=\"issue-expand-item\"><span class=\"issue-expand-key\">App</span><span class=\"issue-expand-value\">" + escapeHtml(issue.app) + "</span></span><span class=\"issue-expand-item\"><span class=\"issue-expand-key\">First seen</span><span class=\"issue-expand-value\">" + escapeHtml(issue.time) + " ago</span></span><span class=\"issue-expand-stack\"><span class=\"issue-expand-key\">Stack</span><pre>" + escapeHtml(issue.stack) + "</pre></span></div></div></article>";
    }).join("");
    const toggle = document.getElementById("issue-expand-toggle");
    if (toggle) {
      toggle.hidden = rows.length <= 4;
      toggle.textContent = state.issueLimit >= rows.length ? "Show fewer" : "Show all issues";
    }
    setText("dev-critical-count", String(data.issues.filter(function (issue) { return issue.severity === "critical"; }).length));
    setText("dev-warning-count", String(data.issues.filter(function (issue) { return issue.severity === "warning"; }).length));
    setText("dev-info-count", String(data.issues.filter(function (issue) { return issue.severity === "info"; }).length));
    setText("dev-total-count", String(data.issues.length));
    renderTimeline("issues-activity-feed", data.issues.slice(0, 5).map(function (issue) { return [issue.time, issue.title + " on " + issue.route]; }));
  }

  function renderHealth() {
    const score = healthScore();
    const status = healthStatus(score);
    const token = document.getElementById("health-status-token");
    if (token) {
      token.textContent = status.label;
      token.className = "status-token " + status.className;
    }
    setText("health-summary-text", score + "% reliability score");
    const legend = document.getElementById("health-legend");
    if (legend) {
      legend.innerHTML = data.health.map(function (item) {
        return "<li><span><i class=\"service-dot " + (item.tone === "warning" ? "warning" : "good") + "\"></i>" + escapeHtml(item.key) + "</span><strong>" + item.score + "%</strong></li>";
      }).join("");
    }
    renderHealthRadar("health-radar-grid", "health-radar-axis", "health-radar-shape", data.health);
    renderServiceStack();
    renderTimeline("health-incident-feed", [["8m", "Checkout TypeError lowered the error dimension to watch level."], ["18m", "Gateway retry warning is linked to deploy v1.8.5."], ["31m", "Feedback drawer issue reduced the feedback dimension slightly."]]);
  }

  function renderServiceStack() {
    const container = document.getElementById("service-stack");
    if (!container) return;
    container.innerHTML = [["good", "Frontend shell", "Healthy", "98% availability"], ["warning", "Checkout API", "Watch", "p95 at 326 ms with 2 warnings"], ["good", "Feedback intake", "Healthy", "12 reports captured"], ["good", "Release markers", "Healthy", "2 versions tracked"]].map(function (row) {
      return "<article class=\"service-row\"><i class=\"service-dot " + row[0] + "\"></i><div><strong>" + row[1] + "</strong><span>" + row[3] + "</span></div><span class=\"service-state\">" + row[2] + "</span></article>";
    }).join("");
  }

  function renderHealthRadar(gridId, axisId, shapeId, items) {
    const grid = document.getElementById(gridId);
    const axis = document.getElementById(axisId);
    const shape = document.getElementById(shapeId);
    if (!grid || !axis || !shape) return;
    const centerX = 260;
    const centerY = 170;
    const radius = 118;
    const count = items.length;
    function point(index, scale) {
      const angle = -Math.PI / 2 + index * 2 * Math.PI / count;
      return [centerX + Math.cos(angle) * radius * scale, centerY + Math.sin(angle) * radius * scale];
    }
    grid.innerHTML = [0.25, 0.5, 0.75, 1].map(function (scale) {
      return "<polygon points=\"" + items.map(function (_, index) { const p = point(index, scale); return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + "\"></polygon>";
    }).join("");
    axis.innerHTML = items.map(function (item, index) {
      const end = point(index, 1);
      const label = point(index, 1.18);
      return "<line x1=\"" + centerX + "\" y1=\"" + centerY + "\" x2=\"" + end[0].toFixed(1) + "\" y2=\"" + end[1].toFixed(1) + "\"></line><text x=\"" + label[0].toFixed(1) + "\" y=\"" + label[1].toFixed(1) + "\">" + escapeHtml(item.key) + "</text>";
    }).join("");
    shape.setAttribute("points", items.map(function (item, index) { const p = point(index, item.score / 100); return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "));
  }

  function renderAnalytics() {
    const multiplier = state.range === "30d" ? 7 : state.range === "7d" ? 3 : 1;
    const users = data.users.map(function (value) { return Math.round(value * multiplier); });
    const actions = data.actions.map(function (value) { return Math.round(value * multiplier); });
    const errors = data.errors.map(function (value) { return Math.round(value * Math.max(1, Math.round(multiplier / 2))); });
    const latency = data.latency.map(function (value, index) { return value + (multiplier - 1) * 8 + index * 3; });
    setText("analytics-range-users", String(Math.max.apply(null, users)));
    setText("analytics-range-actions", String(actions.reduce(function (sum, value) { return sum + value; }, 0)));
    setText("analytics-range-latency", Math.max.apply(null, latency) + " ms");
    setText("user-delta", Math.max.apply(null, users) + " active");
    setText("purchase-delta", Math.max.apply(null, actions) + " actions");
    renderBarChart("user-chart", data.labels, users, users.length - 1, "users");
    renderBarChart("purchase-chart", data.labels, actions, actions.length - 1, "actions");
    renderBarChart("dev-error-chart", data.labels, errors, errors.length - 1, "errors");
    renderLatencyLine(latency, data.labels);
    renderDeveloperLatencyCanvas(latency, data.labels);
    renderRatings();
    renderBreakdown();
  }

  function renderBarChart(id, labels, values, highlightedIndex, suffix) {
    const container = document.getElementById(id);
    if (!container) return;
    const max = Math.max.apply(null, values.concat([1]));
    container.style.setProperty("--bar-count", String(values.length));
    container.innerHTML = values.map(function (value, index) {
      const height = Math.max(10, Math.round((value / max) * 100));
      return "<div class=\"bar" + (index === highlightedIndex ? " highlight" : "") + "\" data-value=\"" + value + " " + suffix + "\" style=\"--bar-height:" + height + "%\"><i class=\"bar-fill\" aria-hidden=\"true\"></i><span>" + escapeHtml(labels[index]) + "</span></div>";
    }).join("");
  }

  function renderLatencyLine(values, labels) {
    const line = document.getElementById("latency-line");
    const yAxis = document.getElementById("latency-y-axis");
    const xAxis = document.getElementById("latency-x-axis");
    if (!line || !yAxis || !xAxis) return;
    const min = 120;
    const max = Math.max.apply(null, values.concat([360]));
    line.setAttribute("d", "M" + values.map(function (value, index) {
      const x = 60 + index * (550 / (values.length - 1));
      const y = 240 - ((value - min) / (max - min)) * 190;
      return x.toFixed(1) + " " + y.toFixed(1);
    }).join(" L"));
    yAxis.innerHTML = [400, 300, 200, 100].map(function (tick, index) { return "<text x=\"52\" y=\"" + (54 + index * 50) + "\">" + tick + "ms</text>"; }).join("");
    xAxis.innerHTML = labels.map(function (label, index) { const x = 60 + index * (550 / (labels.length - 1)); return "<text x=\"" + x.toFixed(1) + "\" y=\"265\">" + escapeHtml(label) + "</text>"; }).join("");
    const legend = document.getElementById("latency-legend");
    if (legend) legend.innerHTML = "<span><i class=\"legend-swatch checkout\"></i>Checkout p95 latency</span><span><i class=\"legend-swatch search\"></i>Watch threshold 250ms</span>";
  }

  function renderDeveloperLatencyCanvas(values, labels) {
    const canvas = document.getElementById("dev-latency-canvas");
    if (!canvas || !canvas.getContext) return;
    const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: 640 };
    const width = Math.max(520, Math.round(rect.width || 640));
    const height = 260;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0f1b27";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    for (let i = 0; i < 5; i += 1) {
      const y = 30 + i * 45;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(width - 24, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#31c4cd";
    ctx.lineWidth = 4;
    ctx.beginPath();
    values.forEach(function (value, index) {
      const x = 50 + index * ((width - 90) / (values.length - 1));
      const y = height - 38 - ((value - 120) / 260) * 170;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = "#dbe7f3";
    ctx.font = "700 12px sans-serif";
    labels.forEach(function (label, index) {
      const x = 42 + index * ((width - 90) / (labels.length - 1));
      ctx.fillText(label, x, height - 12);
    });
  }

  function renderRatings() {
    setText("rating-average", "4.2");
    setText("rating-caption", "average rating from 12 feedback events");
    const bars = document.getElementById("rating-bars");
    if (!bars) return;
    bars.innerHTML = [["5 stars", 42], ["4 stars", 33], ["3 stars", 17], ["2 stars", 8], ["1 star", 0]].map(function (rating) {
      return "<span style=\"--rating-width:" + rating[1] + "%\"><em>" + rating[0] + "</em><strong>" + rating[1] + "%</strong></span>";
    }).join("");
  }

  function renderBreakdown() {
    const donut = document.getElementById("breakdown-donut");
    const list = document.getElementById("breakdown-list");
    if (!donut || !list) return;
    let cursor = 0;
    donut.style.background = "conic-gradient(" + data.breakdown.map(function (item) {
      const start = cursor;
      cursor += item.value;
      return item.color + " " + start + "% " + cursor + "%";
    }).join(", ") + ")";
    list.innerHTML = data.breakdown.map(function (item) {
      return "<li class=\"breakdown-item " + item.className + "\"><span class=\"breakdown-main\"><span class=\"legend-dot " + item.className + "\"></span><span class=\"breakdown-label\">" + item.key + "</span></span><strong>" + item.value + "%</strong><small class=\"breakdown-detail\">" + item.detail + "</small></li>";
    }).join("");
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof window.Element)) return;
      const modeButton = target.closest(".mode-toggle-option");
      if (modeButton) {
        state.mode = modeButton.getAttribute("data-mode") || "manager";
        renderMode();
        renderHome();
        renderAnalytics();
        return;
      }
      const viewButton = target.closest("[data-view]");
      if (viewButton) {
        event.preventDefault();
        activateView(viewButton.getAttribute("data-view") || "home", viewButton.getAttribute("data-scroll-target"));
        return;
      }
      const issueRow = target.closest(".issue-row");
      if (issueRow) {
        issueRow.classList.toggle("expanded");
        return;
      }
      const trigger = target.closest(".settings-trigger");
      if (trigger) {
        const section = trigger.closest(".settings-section");
        if (section) {
          section.classList.toggle("open");
          trigger.setAttribute("aria-expanded", section.classList.contains("open") ? "true" : "false");
        }
        return;
      }
      const rangeButton = target.closest("[data-range]");
      if (rangeButton) {
        state.range = rangeButton.getAttribute("data-range") || "24h";
        qsa("[data-range]").forEach(function (button) { button.classList.toggle("active", button === rangeButton); });
        renderAnalytics();
        return;
      }
      if (target.closest("#refresh-dashboard")) renderTopline();
      if (target.closest("#issue-expand-toggle")) {
        state.issueLimit = state.issueLimit > 4 ? 4 : data.issues.length;
        renderIssues();
      }
      if (target.closest("#developer-mute-toggle")) {
        state.issuesMuted = !state.issuesMuted;
        setText("developer-mute-status", state.issuesMuted ? "Live alerts are muted in this demo." : "Live alerts are active.");
        setText("developer-mute-toggle", state.issuesMuted ? "Resume alerts" : "Mute alerts");
      }
    });

    ["issue-sort-field", "issue-sort-direction", "issue-filter-severity", "issue-filter-version", "issue-filter-app", "issue-filter-route", "developer-issue-search"].forEach(function (id) {
      const field = document.getElementById(id);
      if (field) {
        field.addEventListener("input", renderIssues);
        field.addEventListener("change", renderIssues);
      }
    });

    const darkModeToggle = document.getElementById("dark-mode-toggle");
    if (darkModeToggle) {
      darkModeToggle.checked = true;
      document.body.classList.add("dark-mode");
      darkModeToggle.addEventListener("change", function () { document.body.classList.toggle("dark-mode", darkModeToggle.checked); });
    }
  }

  function init() {
    bindEvents();
    renderTopline();
    renderMode();
    renderHome();
    renderIssues();
    renderHealth();
    renderAnalytics();
    const initialView = (window.location.hash || "#home").replace("#", "");
    activateView(viewLabels[initialView] ? initialView : "home");
  }

  document.addEventListener("DOMContentLoaded", init);
}());
