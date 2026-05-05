(function (global) {
  "use strict";

  var DEFAULT_ENDPOINT = "/api/events";
  var FLUSH_INTERVAL = 2000;
  var SESSION_KEY = "__wt_sid";

  function generateId() {
    return "xxxxxxxx-xxxx-4xxx".replace(/x/g, function () {
      return ((Math.random() * 16) | 0).toString(16);
    });
  }

  function getSessionId() {
    var sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = generateId();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  function WatchTower(config) {
    config = config || {};
    this.endpoint = config.endpoint || DEFAULT_ENDPOINT;
    this.deployVersion = config.deployVersion || "unknown";
    this.appName = config.appName || location.hostname;
    this.sessionId = getSessionId();
    this.userId = config.userId || null;
    this._queue = [];
    this._flushing = false;

    this._bindErrors();
    this._bindPerformance();
    this._startFlush();
  }

  WatchTower.prototype._enqueue = function (type, data) {
    this._queue.push({
      type: type,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      deployVersion: this.deployVersion,
      appName: this.appName,
      url: location.href,
      route: location.pathname,
      data: data,
    });
  };

  WatchTower.prototype._flush = function () {
    if (this._flushing || this._queue.length === 0) return;
    this._flushing = true;
    var batch = this._queue.splice(0, 50);
    var self = this;

    fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
      .catch(function () {
        self._queue = batch.concat(self._queue);
      })
      .finally(function () {
        self._flushing = false;
      });
  };

  WatchTower.prototype._startFlush = function () {
    var self = this;
    setInterval(function () {
      self._flush();
    }, FLUSH_INTERVAL);

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") self._flush();
    });
  };

  WatchTower.prototype._bindErrors = function () {
    var self = this;

    window.addEventListener("error", function (e) {
      self._enqueue("error", {
        message: e.message || "Unknown error",
        source: e.filename || "",
        line: e.lineno || 0,
        col: e.colno || 0,
        stack: e.error ? e.error.stack || "" : "",
      });
    });

    window.addEventListener("unhandledrejection", function (e) {
      var reason = e.reason || {};
      self._enqueue("error", {
        message: reason.message || String(reason),
        source: "unhandledrejection",
        line: 0,
        col: 0,
        stack: reason.stack || "",
      });
    });
  };

  WatchTower.prototype._bindPerformance = function () {
    var self = this;

    window.addEventListener("load", function () {
      setTimeout(function () {
        var perf = performance.getEntriesByType("navigation")[0];
        if (!perf) return;

        self._enqueue("pageload", {
          duration: Math.round(perf.duration),
          ttfb: Math.round(perf.responseStart - perf.requestStart),
          domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.startTime),
          loadComplete: Math.round(perf.loadEventEnd - perf.startTime),
          transferSize: perf.transferSize || 0,
        });
      }, 100);
    });
  };

  WatchTower.prototype.setUser = function (userId) {
    this.userId = userId;
  };

  WatchTower.prototype.trackClick = function (target, text) {
    this._enqueue("click", {
      target: target || "",
      text: (text || "").substring(0, 100),
    });
  };

  WatchTower.prototype.trackLogin = function (userId, method) {
    this.userId = userId;
    this._enqueue("login", {
      userId: userId,
      method: method || "unknown",
    });
  };

  WatchTower.prototype.trackEvent = function (name, payload) {
    this._enqueue("custom", {
      name: name,
      payload: payload || {},
    });
  };

  WatchTower.prototype.trackError = function (error) {
    this._enqueue("error", {
      message: error.message || String(error),
      source: "manual",
      line: 0,
      col: 0,
      stack: error.stack || "",
    });
  };

  global.WatchTower = WatchTower;
})(window);
