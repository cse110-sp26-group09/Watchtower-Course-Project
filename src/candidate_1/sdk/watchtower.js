/**
 * WatchTower browser SDK.
 *
 * Capture errors, performance metrics, and user interactions from a
 * client page and forward them to the WatchTower server in small
 * batches. Designed to run in any modern browser without a build step.
 *
 * @module candidate_1/sdk/watchtower
 */
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
    var sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = generateId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
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
    var sdkInstance = this;

    fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
      .catch(function () {
        sdkInstance._queue = batch.concat(sdkInstance._queue);
      })
      .finally(function () {
        sdkInstance._flushing = false;
      });
  };

  WatchTower.prototype._startFlush = function () {
    var sdkInstance = this;

    setInterval(function () {
      sdkInstance._flush();
    }, FLUSH_INTERVAL);

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") sdkInstance._flush();
    });
  };

  WatchTower.prototype._bindErrors = function () {
    var sdkInstance = this;

    window.addEventListener("error", function (event) {
      sdkInstance._enqueue("error", {
        message: event.message || "Unknown error",
        source: event.filename || "",
        line: event.lineno || 0,
        col: event.colno || 0,
        stack: event.error ? event.error.stack || "" : "",
      });
    });

    window.addEventListener("unhandledrejection", function (event) {
      var rejectionReason = event.reason || {};
      sdkInstance._enqueue("error", {
        message: rejectionReason.message || String(rejectionReason),
        source: "unhandledrejection",
        line: 0,
        col: 0,
        stack: rejectionReason.stack || "",
      });
    });
  };

  WatchTower.prototype._bindPerformance = function () {
    var sdkInstance = this;

    window.addEventListener("load", function () {
      setTimeout(function () {
        var navigationEntry = performance.getEntriesByType("navigation")[0];
        if (!navigationEntry) return;

        sdkInstance._enqueue("pageload", {
          duration: Math.round(navigationEntry.duration),
          ttfb: Math.round(navigationEntry.responseStart - navigationEntry.requestStart),
          domContentLoaded: Math.round(navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime),
          loadComplete: Math.round(navigationEntry.loadEventEnd - navigationEntry.startTime),
          transferSize: navigationEntry.transferSize || 0,
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
