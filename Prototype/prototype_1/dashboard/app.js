(function () {
  "use strict";

  var POLL_INTERVAL = 3000;
  var CHART_COLORS = ["#6366f1", "#f43f5e", "#22c55e", "#eab308", "#3b82f6", "#f97316", "#a855f7"];

  var $activeUsers = document.getElementById("active-users");
  var $totalEvents = document.getElementById("total-events");
  var $totalErrors = document.getElementById("total-errors");
  var $versionCount = document.getElementById("version-count");
  var $errorFeed = document.getElementById("error-feed");
  var $activityFeed = document.getElementById("activity-feed");
  var $versionErrors = document.getElementById("version-errors");
  var $latencyChart = document.getElementById("latency-chart");
  var $latencyLegend = document.getElementById("latency-legend");
  var $connDot = document.getElementById("connection-dot");
  var $connText = document.getElementById("connection-text");

  function connectSSE() {
    var source = new EventSource("/api/events/stream");

    source.onopen = function () {
      $connDot.className = "dot online";
      $connText.textContent = "Live";
    };

    source.onmessage = function (e) {
      try {
        var events = JSON.parse(e.data);
        events.forEach(function (ev) {
          addToActivityFeed(ev);
          if (ev.type === "error") addToErrorFeed(ev);
        });
      } catch (_) {}
    };

    source.onerror = function () {
      $connDot.className = "dot offline";
      $connText.textContent = "Reconnecting...";
    };
  }

  function formatTime(iso) {
    var d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function createFeedItem(ev) {
    var div = document.createElement("div");
    div.className = "feed-item " + ev.type;

    var msg = "";
    var typeBadge = '<span class="badge type-' + ev.type + '">' + ev.type + "</span>";
    var verBadge = '<span class="badge version">v' + (ev.deployVersion || "?") + "</span>";

    switch (ev.type) {
      case "error":
        msg = ev.data.message || "Unknown error";
        break;
      case "click":
        msg = "Clicked: " + (ev.data.text || ev.data.target || "element");
        break;
      case "login":
        msg = "User logged in: " + (ev.data.userId || "unknown");
        break;
      case "pageload":
        msg = ev.route + " loaded in " + ev.data.duration + "ms";
        break;
      default:
        msg = ev.type + ": " + JSON.stringify(ev.data).substring(0, 80);
    }

    div.innerHTML =
      '<div class="message">' + escapeHtml(msg) + "</div>" +
      '<div class="meta">' +
      typeBadge + " " + verBadge +
      "<span>" + formatTime(ev.timestamp) + "</span>" +
      "<span>" + (ev.route || "/") + "</span>" +
      "</div>";

    return div;
  }

  function escapeHtml(str) {
    var el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function prependChild(parent, child, maxItems) {
    parent.insertBefore(child, parent.firstChild);
    while (parent.children.length > (maxItems || 50)) {
      parent.removeChild(parent.lastChild);
    }
  }

  function addToErrorFeed(ev) {
    prependChild($errorFeed, createFeedItem(ev));
    removeEmptyState($errorFeed);
  }

  function addToActivityFeed(ev) {
    prependChild($activityFeed, createFeedItem(ev));
    removeEmptyState($activityFeed);
  }

  function removeEmptyState(parent) {
    var empty = parent.querySelector(".empty-state");
    if (empty) empty.remove();
  }

  function updateStats(stats) {
    $activeUsers.textContent = stats.activeUsers;
    $totalEvents.textContent = stats.totalEvents;
    $totalErrors.textContent = stats.totalErrors;
    $versionCount.textContent = Object.keys(stats.errorsByVersion).length;

    renderVersionErrors(stats.errorsByVersion);
    renderLatencyChart(stats.latencyByRoute);
  }

  function renderVersionErrors(byVersion) {
    var versions = Object.keys(byVersion);
    if (versions.length === 0) {
      $versionErrors.innerHTML = '<div class="empty-state">No errors recorded yet</div>';
      return;
    }

    var maxCount = Math.max.apply(null, versions.map(function (v) { return byVersion[v]; }));

    $versionErrors.innerHTML = versions
      .sort(function (a, b) { return byVersion[b] - byVersion[a]; })
      .map(function (ver) {
        var pct = Math.round((byVersion[ver] / maxCount) * 100);
        return (
          '<div class="version-row">' +
          '<span class="ver-name">' + escapeHtml(ver) + "</span>" +
          '<div class="ver-bar-wrap"><div class="ver-bar" style="width:' + pct + '%"></div></div>' +
          '<span class="ver-count">' + byVersion[ver] + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderLatencyChart(byRoute) {
    var canvas = $latencyChart;
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    var W = canvas.clientWidth;
    var H = canvas.clientHeight;
    var PAD = { top: 20, right: 20, bottom: 30, left: 50 };

    ctx.clearRect(0, 0, W, H);

    var routes = Object.keys(byRoute);
    if (routes.length === 0) {
      ctx.fillStyle = "#71717a";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No page load data yet", W / 2, H / 2);
      $latencyLegend.innerHTML = "";
      return;
    }

    var allPoints = [];
    routes.forEach(function (r) {
      byRoute[r].points.forEach(function (p) { allPoints.push(p); });
    });

    var maxDuration = Math.max.apply(null, allPoints.map(function (p) { return p.duration; }));
    maxDuration = Math.ceil(maxDuration / 100) * 100 || 500;

    ctx.strokeStyle = "#2a2d3a";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#71717a";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";

    for (var i = 0; i <= 4; i++) {
      var y = PAD.top + ((H - PAD.top - PAD.bottom) * i) / 4;
      var val = Math.round(maxDuration * (1 - i / 4));
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
      ctx.fillText(val + "ms", PAD.left - 6, y + 4);
    }

    routes.forEach(function (route, ri) {
      var points = byRoute[route].points;
      if (points.length < 2) return;

      var color = CHART_COLORS[ri % CHART_COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      points.forEach(function (p, pi) {
        var x = PAD.left + ((W - PAD.left - PAD.right) * pi) / (points.length - 1);
        var y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - p.duration / maxDuration);
        if (pi === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = color;
      points.forEach(function (p, pi) {
        var x = PAD.left + ((W - PAD.left - PAD.right) * pi) / (points.length - 1);
        var y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - p.duration / maxDuration);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    $latencyLegend.innerHTML = routes
      .map(function (route, ri) {
        var color = CHART_COLORS[ri % CHART_COLORS.length];
        var stats = byRoute[route];
        return (
          '<div class="legend-item">' +
          '<div class="legend-dot" style="background:' + color + '"></div>' +
          "<span>" + escapeHtml(route) + " (p50: " + stats.p50 + "ms, p95: " + stats.p95 + "ms)</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function pollStats() {
    fetch("/api/stats")
      .then(function (r) { return r.json(); })
      .then(updateStats)
      .catch(function () {});
  }

  function loadInitialErrors() {
    fetch("/api/events?type=error&limit=20")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.events.length === 0) {
          $errorFeed.innerHTML = '<div class="empty-state">No errors yet -- that\'s a good thing!</div>';
          return;
        }
        data.events.reverse().forEach(function (ev) { addToErrorFeed(ev); });
      });
  }

  function loadInitialActivity() {
    fetch("/api/events?limit=20")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.events.length === 0) {
          $activityFeed.innerHTML = '<div class="empty-state">Waiting for events from your app...</div>';
          return;
        }
        data.events.reverse().forEach(function (ev) { addToActivityFeed(ev); });
      });
  }

  connectSSE();
  pollStats();
  loadInitialErrors();
  loadInitialActivity();
  setInterval(pollStats, POLL_INTERVAL);
})();
