/**
 * WatchTower browser SDK.
 *
 * Capture errors, performance metrics, and user interactions from a
 * client page and forward them to the WatchTower server in small
 * batches. Designed to run in any modern browser without a build step.
 *
 * @module sdk/watchtower
 */
(function (global) {
  "use strict";

  var DEFAULT_ENDPOINT = "/api/events";
  var FLUSH_INTERVAL = 2000;
  var SESSION_KEY = "__wt_sid";

  /**
   * Generate a short pseudo-random identifier used for session IDs.
   *
   * Not cryptographically secure - sufficient for distinguishing
   * concurrent browser sessions in a prototype.
   *
   * @returns {string} A new ID such as `"a1b2c3d4-e5f6-4789"`.
   */
  function generateId() {
    return "xxxxxxxx-xxxx-4xxx".replace(/x/g, function () {
      return ((Math.random() * 16) | 0).toString(16);
    });
  }

  /**
   * Return a stable session ID for the current tab, creating one in
   * `sessionStorage` if needed so it survives reloads.
   *
   * @returns {string} The current session ID.
   */
  function getSessionId() {
    var sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = generateId();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  /**
   * Create a new WatchTower SDK instance.
   *
   * @class
   * @param {Object} [config] - Optional configuration.
   * @param {string} [config.endpoint] - Events API URL (defaults to `/api/events`).
   * @param {string} [config.deployVersion] - Application/deploy version label.
   * @param {string} [config.appName] - Logical application name.
   * @param {string} [config.userId] - Optional initial user identifier.
   */
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

  /**
   * Enqueue a new event for the next flush cycle.
   *
   * @private
   * @param {string} type - Event type (e.g. `"error"`, `"click"`).
   * @param {Object} data - Event-specific payload.
   * @returns {void}
   */
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

  /**
   * Send up to 50 queued events to the API endpoint.
   *
   * Failed batches are re-prepended to the queue so they can be retried
   * on the next flush. Concurrent flushes are prevented with a flag.
   *
   * @private
   * @returns {void}
   */
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

  /**
   * Associate subsequent events with the given user ID.
   *
   * @param {string} userId - Application-specific user identifier.
   * @returns {void}
   */
  WatchTower.prototype.setUser = function (userId) {
    this.userId = userId;
  };

  /**
   * Track a click event.
   *
   * @param {string} target - Description of the clicked element (e.g. CSS-ish selector).
   * @param {string} [text] - Visible text on the element, truncated to 100 chars.
   * @returns {void}
   */
  WatchTower.prototype.trackClick = function (target, text) {
    this._enqueue("click", {
      target: target || "",
      text: (text || "").substring(0, 100),
    });
  };

  /**
   * Track a login event and remember the user ID for future events.
   *
   * @param {string} userId - The user's identifier.
   * @param {string} [method] - Authentication method label.
   * @returns {void}
   */
  WatchTower.prototype.trackLogin = function (userId, method) {
    this.userId = userId;
    this._enqueue("login", {
      userId: userId,
      method: method || "unknown",
    });
  };

  /**
   * Track an application-defined custom event.
   *
   * @param {string} name - A short event name (e.g. `"add-to-cart"`).
   * @param {Object} [payload] - Arbitrary JSON-serializable details.
   * @returns {void}
   */
  WatchTower.prototype.trackEvent = function (name, payload) {
    this._enqueue("custom", {
      name: name,
      payload: payload || {},
    });
  };

  /**
   * Track a manually caught error.
   *
   * @param {Error|Object} error - Error instance or error-like object.
   * @returns {void}
   */
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
