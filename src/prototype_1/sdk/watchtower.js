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

  var DEFAULT_ENDPOINT =
  global.WATCHTOWER_API_URL ||
  "/api/events";
  var FLUSH_INTERVAL = 2000;
  var SESSION_KEY = "__wt_sid";
  var inMemorySessionId = null;
  var fallbackSessionCounter = 0;

  /**
   * Generate a short pseudo-random identifier for browser sessions.
   *
   * Uses the browser crypto API when available and falls back to a
   * deterministic timestamp-based identifier in restricted environments.
   *
   * @returns {string} Session identifier such as `"a1b2c3d4-e5f6-4789"`.
   */
  function generateId() {
    var cryptoObj = global.crypto || global.msCrypto;
    var bytes = new Uint8Array(12);
    var index = 0;

    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      cryptoObj.getRandomValues(bytes);
      return "xxxxxxxx-xxxx-4xxx".replace(/x/g, function () {
        var value = bytes[index++] & 0x0f;
        return value.toString(16);
      });
    }

    fallbackSessionCounter += 1;
    return [
      "fallback",
      Date.now().toString(16),
      fallbackSessionCounter.toString(16),
    ].join("-");
  }

  /**
   * Safely read a session value from browser storage.
   *
   * Some browser contexts disable storage access and throw when reading
   * `sessionStorage`, so this helper falls back to `null`.
   *
   * @param {string} key - Storage key to read.
   * @returns {?string} Stored value when available.
   */
  function readSessionValue(key) {
    try {
      if (!global.sessionStorage) {
        return null;
      }
      return global.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Safely persist a session value in browser storage.
   *
   * @param {string} key - Storage key to write.
   * @param {string} value - Value to store.
   * @returns {void}
   */
  function writeSessionValue(key, value) {
    try {
      if (global.sessionStorage) {
        global.sessionStorage.setItem(key, value);
      }
    } catch (error) {
      // Ignore storage failures and keep the in-memory fallback instead.
    }
  }

  /**
   * Return a stable session identifier for the current tab.
   *
   * @returns {string} Current tab session id.
   */
  function getSessionId() {
    var sessionId = readSessionValue(SESSION_KEY) || inMemorySessionId;
    if (!sessionId) {
      sessionId = generateId();
      inMemorySessionId = sessionId;
      writeSessionValue(SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  /**
   * Create a new WatchTower SDK instance.
   *
   * @class
   * @param {Object} [config] - Optional SDK configuration.
   * @param {string} [config.endpoint] - Events API endpoint.
   * @param {string} [config.deployVersion] - Deploy version label.
   * @param {string} [config.appName] - Application name label.
   * @param {string} [config.userId] - Initial user identifier.
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
    this._emitInitialPageView();
  }

  /**
   * Emit a `page_view` event the first time the SDK initializes for the
   * current document. The event is enqueued so it joins the next flush
   * cycle along with any other captured signals.
   *
   * @private
   * @returns {void}
   */
  WatchTower.prototype._emitInitialPageView = function () {
    this._enqueue("page_view", {
      title: typeof document !== "undefined" ? document.title : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
    });
  };

  /**
   * Queue a new event for the next flush cycle.
   *
   * @private
   * @param {string} type - Event type name.
   * @param {Object} data - Event payload.
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
   * Send a batch of queued events to the backend.
   *
   * Failed batches are re-queued for a later retry.
   *
   * @private
   * @returns {void}
   */
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

  /**
   * Start the periodic background flush cycle.
   *
   * @private
   * @returns {void}
   */
  WatchTower.prototype._startFlush = function () {
    var sdkInstance = this;

    setInterval(function () {
      sdkInstance._flush();
    }, FLUSH_INTERVAL);

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") sdkInstance._flush();
    });
  };

  /**
   * Bind browser error listeners so uncaught failures are reported.
   *
   * @private
   * @returns {void}
   */
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

  /**
   * Bind performance capture for page-load timing metrics.
   *
   * @private
   * @returns {void}
   */
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

  /**
   * Associate future events with a user identifier.
   *
   * @param {string} userId - Application user id.
   * @returns {void}
   */
  WatchTower.prototype.setUser = function (userId) {
    this.userId = userId;
  };

  /**
   * Track a click interaction.
   *
   * @param {string} target - Short element/selector description.
   * @param {string} text - Visible element text.
   * @returns {void}
   */
  WatchTower.prototype.trackClick = function (target, text) {
    this._enqueue("click", {
      target: target || "",
      text: (text || "").substring(0, 100),
    });
  };

  /**
   * Track a login event and remember the current user id.
   *
   * @param {string} userId - User identifier.
   * @param {string} method - Authentication method label.
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
   * @param {string} name - Event name.
   * @param {Object} payload - Event payload.
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
   * @param {Error|Object|string} error - Error-like value.
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

  /**
   * Lightweight reusable helper that POSTs a single event to `/api/events`.
   *
   * Useful for ad-hoc verification (for example from the browser DevTools
   * console) and for the local test buttons in the demo app. The helper
   * sets `Content-Type: application/json`, sends the event with
   * `keepalive: true` so it can complete during page unload, and silently
   * swallows network failures so the host page never breaks.
   *
   * The function returns a Promise that resolves with the parsed JSON
   * response on success and `null` on failure.
   *
   * @param {Object} event - Event payload (camelCase or snake_case fields).
   * @param {string} [endpoint] - Override the default `/api/events` endpoint.
   * @returns {Promise<Object|null>} Server response on success, `null` on failure.
   */
  function sendWatchTowerEvent(event, endpoint) {
    const url = endpoint || DEFAULT_ENDPOINT;
    const payload = event && typeof event === "object" ? event : {};

    if (!payload.timestamp) {
      payload.timestamp = new Date().toISOString();
    }
    if (!payload.sessionId && !payload.session_id) {
      payload.sessionId = getSessionId();
    }

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(function (response) {
        if (!response.ok) {
          return null;
        }
        return response.json().catch(function () {
          return null;
        });
      })
      .catch(function (error) {
        if (typeof console !== "undefined" && console && typeof console.warn === "function") {
          console.warn("[WatchTower] sendWatchTowerEvent failed:", error && error.message ? error.message : error);
        }
        return null;
      });
  }

  global.WatchTower = WatchTower;
  global.sendWatchTowerEvent = sendWatchTowerEvent;
})(window);
