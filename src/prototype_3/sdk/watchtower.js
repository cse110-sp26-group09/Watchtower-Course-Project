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

  let DEFAULT_ENDPOINT = "/api/events";
  let FLUSH_INTERVAL = 2000;
  let SESSION_KEY = "__wt_sid";
  let SDK_VERSION = "wt-js-0.3.0";
  let MAX_QUEUE_SIZE = 800;
  let inMemorySessionId = null;
  let fallbackSessionCounter = 0;

  /**
   * Generate a short pseudo-random identifier for browser sessions.
   *
   * Uses the browser crypto API when available and falls back to a
   * deterministic timestamp-based identifier in restricted environments.
   *
   * @returns {string} Session identifier such as `"a1b2c3d4-e5f6-4789"`.
   */
  function generateId() {
    let cryptoObj = global.crypto || global.msCrypto;
    let bytes = new Uint8Array(12);
    let index = 0;

    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      cryptoObj.getRandomValues(bytes);
      return "xxxxxxxx-xxxx-4xxx".replace(/x/g, function () {
        let value = bytes[index++] & 0x0f;
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

  function safeNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  function resolveEnvironment() {
    let host = (global.location && global.location.hostname ? global.location.hostname : "").toLowerCase();
    if (host.indexOf("localhost") !== -1 || host.indexOf("127.0.0.1") !== -1 || host.indexOf("dev") !== -1) {
      return "development";
    }
    if (host.indexOf("preview") !== -1 || host.indexOf("vercel.app") !== -1 || host.indexOf("netlify.app") !== -1) {
      return "preview";
    }
    if (host.indexOf("staging") !== -1 || host.indexOf("stage") !== -1) {
      return "staging";
    }
    return "production";
  }

  function getClerkPrimaryEmail() {
    let clerk = global.Clerk;
    let user = clerk && clerk.user;
    console.log("Clerk user object:", user);
    console.log("Clerk primary email:", user && user.primaryEmailAddress && user.primaryEmailAddress.emailAddress);

    if (!user) return "";

    if (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) {
      return user.primaryEmailAddress.emailAddress;
    }

    if (Array.isArray(user.emailAddresses) && user.emailAddresses.length > 0) {
      return user.emailAddresses[0].emailAddress || "";
    }

    return "";
  }

  /**
   * Return a stable session identifier for the current tab.
   *
   * @returns {string} Current tab session id.
   */
  function getSessionId() {
    let sessionId = readSessionValue(SESSION_KEY) || inMemorySessionId;
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
   * @param {string} [config.alertRecipient] - Email address for alert notifications.
   */
  function WatchTower(config) {
    config = config || {};
    this.endpoint = config.endpoint || DEFAULT_ENDPOINT;
    this.beaconEndpoint = config.beaconEndpoint || this.endpoint.replace(/[^/]+$/, "beacon");
    this.deployVersion = config.deployVersion || "unknown";
    this.appName = config.appName || location.hostname;
    this.environment = config.environment || resolveEnvironment();
    this.sdkVersion = config.sdkVersion || SDK_VERSION;
    this.maxQueueSize = typeof config.maxQueueSize === "number" ? config.maxQueueSize : MAX_QUEUE_SIZE;
    this.sessionId = getSessionId();
    this.userId = config.userId || null;
    this.alertRecipient = config.alertRecipient || null;
    this._queue = [];
    this._flushing = false;
    this._beaconSent = false;
    this._lastRoute = location.pathname + location.search + location.hash;
    this._pendingDropCount = 0;
    this._retryCount = 0;
    this._offlineBufferedCount = 0;

    this._bindDiagnostics();
    this._bindRouteTransitions();
    this._bindNetworkDiagnostics();
    this._bindWebVitals();
    this._bindErrors();
    this._bindPerformance();
    this._startFlush();
  }

  /**
   * Queue a new event for the next flush cycle.
   *
   * @private
   * @param {string} type - Event type name.
   * @param {Object} data - Event payload.
   * @returns {void}
   */
  WatchTower.prototype._enqueue = function (type, data, eventName) {
    if (this._queue.length >= this.maxQueueSize) {
      let overflowCount = this._queue.length - this.maxQueueSize + 1;
      this._queue.splice(0, overflowCount);
      this._pendingDropCount += overflowCount;
    }

    this._queue.push({
      type: type,
      eventName: eventName || type,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      deployVersion: this.deployVersion,
      appName: this.appName,
      environment: this.environment,
      sdkVersion: this.sdkVersion,
      url: location.href,
      route: location.pathname,
      data: data,
    });

    if (!navigator.onLine) {
      this._offlineBufferedCount += 1;
    }
  };

  WatchTower.prototype._enqueueDiagnostic = function (action, data) {
    this._enqueue("sdk_diagnostic", Object.assign({ action: action }, data || {}), "sdk:" + action);
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

    if (this._pendingDropCount > 0) {
      this._enqueueDiagnostic("drop", {
        count: this._pendingDropCount,
        queueDepth: this._queue.length,
      });
      this._pendingDropCount = 0;
    }

    if (this._offlineBufferedCount > 0 && navigator.onLine) {
      this._enqueueDiagnostic("offline-buffer", {
        count: this._offlineBufferedCount,
        queueDepth: this._queue.length,
      });
      this._offlineBufferedCount = 0;
    }

    this._flushing = true;
    let batch = this._queue.splice(0, 50);
    let sdkInstance = this;
    let startedAt = Date.now();

    fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alertRecipient: this.getAlertRecipient(),
        events: batch,
      }),
      keepalive: true,
    })
      .then(function () {
        sdkInstance._enqueueDiagnostic("delivery-success", {
          count: batch.length,
          queueDepth: sdkInstance._queue.length,
          durationMs: Date.now() - startedAt,
        });
      })
      .catch(function () {
        sdkInstance._retryCount += 1;
        sdkInstance._queue = batch.concat(sdkInstance._queue);
        sdkInstance._enqueueDiagnostic("retry", {
          count: sdkInstance._retryCount,
          queueDepth: sdkInstance._queue.length,
          durationMs: Date.now() - startedAt,
        });
        sdkInstance._enqueueDiagnostic("delivery-failure", {
          count: batch.length,
          queueDepth: sdkInstance._queue.length,
        });
      })
      .finally(function () {
        sdkInstance._flushing = false;
      });
  };

  /**
   * Flush queued events through the Beacon API during page unload.
   *
   * @private
   * @returns {void}
   */
  WatchTower.prototype._flushBeacon = function () {
    if (this._beaconSent || this._queue.length === 0) return;
    this._beaconSent = true;

    if (navigator.sendBeacon) {
      let batch = this._queue.splice(0);
      let blob = new Blob([JSON.stringify({
        alertRecipient: this.getAlertRecipient(),
        events: batch,
      })], { type: "application/json" });
      let sent = navigator.sendBeacon(this.beaconEndpoint, blob);
      if (!sent) {
        this._queue = batch.concat(this._queue);
        this._flush();
      }
    } else {
      this._flush();
    }
  };

  /**
   * Start the periodic background flush cycle.
   *
   * @private
   * @returns {void}
   */
  WatchTower.prototype._startFlush = function () {
    let sdkInstance = this;

    setInterval(function () {
      sdkInstance._flush();
    }, FLUSH_INTERVAL);

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        sdkInstance._flushBeacon();
      } else {
        sdkInstance._beaconSent = false;
      }
    });

    window.addEventListener("pagehide", function () {
      sdkInstance._flushBeacon();
    });
  };

  WatchTower.prototype._bindDiagnostics = function () {
    let sdkInstance = this;

    function checkAdBlock() {
      let bait = document.createElement("div");
      bait.className = "adsbox banner-ad ad-unit ad-zone";
      bait.style.cssText = "position:absolute;left:-999px;top:-999px;height:1px;width:1px;";
      document.body.appendChild(bait);
      let blocked = bait.offsetHeight === 0 || bait.clientHeight === 0;
      document.body.removeChild(bait);

      if (blocked) {
        sdkInstance._enqueueDiagnostic("adblock-detected", { blocked: true });
      }
    }

    if (document.readyState === "complete") {
      checkAdBlock();
    } else {
      window.addEventListener("load", checkAdBlock, { once: true });
    }

    window.addEventListener("online", function () {
      sdkInstance._enqueueDiagnostic("online", { queueDepth: sdkInstance._queue.length });
      sdkInstance._flush();
    });

    window.addEventListener("offline", function () {
      sdkInstance._enqueueDiagnostic("offline", { queueDepth: sdkInstance._queue.length });
    });
  };

  WatchTower.prototype._bindRouteTransitions = function () {
    let sdkInstance = this;

    function emitRouteTransition(fromRoute, toRoute, startedAt) {
      sdkInstance._enqueue("route_transition", {
        from: fromRoute,
        to: toRoute,
        durationMs: Date.now() - startedAt,
      }, "route_transition");
    }

    function wrapHistory(methodName) {
      if (!window.history || typeof window.history[methodName] !== "function") return;
      let original = window.history[methodName];

      window.history[methodName] = function () {
        let fromRoute = sdkInstance._lastRoute;
        let start = Date.now();
        let result = original.apply(window.history, arguments);
        sdkInstance._lastRoute = location.pathname + location.search + location.hash;
        emitRouteTransition(fromRoute, sdkInstance._lastRoute, start);
        return result;
      };
    }

    wrapHistory("pushState");
    wrapHistory("replaceState");

    window.addEventListener("popstate", function () {
      let fromRoute = sdkInstance._lastRoute;
      let start = Date.now();
      sdkInstance._lastRoute = location.pathname + location.search + location.hash;
      emitRouteTransition(fromRoute, sdkInstance._lastRoute, start);
    });
  };

  WatchTower.prototype._bindNetworkDiagnostics = function () {
    let sdkInstance = this;
    if (!window.fetch) return;

    let originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      let startedAt = Date.now();
      let targetUrl = typeof input === "string" ? input : (input && input.url ? input.url : "");

      return originalFetch(input, init)
        .then(function (response) {
          if (targetUrl.indexOf(sdkInstance.endpoint) === -1) {
            sdkInstance._enqueue("network", {
              endpoint: targetUrl,
              method: init && init.method ? init.method : "GET",
              status: response.status,
              failed: !response.ok,
              durationMs: Date.now() - startedAt,
            }, "network");
          }
          return response;
        })
        .catch(function (error) {
          if (targetUrl.indexOf(sdkInstance.endpoint) === -1) {
            sdkInstance._enqueue("network", {
              endpoint: targetUrl,
              method: init && init.method ? init.method : "GET",
              status: 0,
              failed: true,
              durationMs: Date.now() - startedAt,
              message: error && error.message ? error.message : "network_error",
            }, "network");
          }
          throw error;
        });
    };
  };

  WatchTower.prototype._bindWebVitals = function () {
    let sdkInstance = this;
    let PerformanceObserverCtor = global.PerformanceObserver;
    if (typeof PerformanceObserverCtor === "undefined") return;

    function observeMetric(entryType, metricName, transform) {
      try {
        let observer = new PerformanceObserverCtor(function (entryList) {
          let entries = entryList.getEntries();
          if (!entries || entries.length === 0) return;
          let latest = entries[entries.length - 1];
          let value = transform ? transform(latest) : latest.startTime;
          if (!Number.isFinite(value)) return;

          sdkInstance._enqueue("performance", {
            metricName: metricName,
            value: Number(value.toFixed(metricName === "CLS" ? 4 : 2)),
            unit: metricName === "CLS" ? "score" : "ms",
          }, "performance:" + metricName.toLowerCase());
        });

        observer.observe({ type: entryType, buffered: true });
      } catch (_error) {
        // Ignore browsers that do not support this observer type.
      }
    }

    observeMetric("largest-contentful-paint", "LCP", function (entry) { return entry.startTime; });
    observeMetric("layout-shift", "CLS", function (entry) {
      return entry.hadRecentInput ? 0 : safeNumber(entry.value);
    });
    observeMetric("event", "INP", function (entry) {
      return safeNumber(entry.duration || entry.processingEnd - entry.startTime);
    });
  };

  /**
   * Bind browser error listeners so uncaught failures are reported.
   *
   * @private
   * @returns {void}
   */
  WatchTower.prototype._bindErrors = function () {
    let sdkInstance = this;

    window.addEventListener("error", function (event) {
      sdkInstance._enqueue("error", {
        message: event.message || "Unknown error",
        source: event.filename || "",
        line: event.lineno || 0,
        col: event.colno || 0,
        stack: event.error ? event.error.stack || "" : "",
      }, "error:window");
    });

    window.addEventListener("unhandledrejection", function (event) {
      let rejectionReason = event.reason || {};
      sdkInstance._enqueue("error", {
        message: rejectionReason.message || String(rejectionReason),
        source: "unhandledrejection",
        line: 0,
        col: 0,
        stack: rejectionReason.stack || "",
      }, "error:promise");
    });
  };

  /**
   * Bind performance capture for page-load timing metrics.
   *
   * @private
   * @returns {void}
   */
  WatchTower.prototype._bindPerformance = function () {
    let sdkInstance = this;

    window.addEventListener("load", function () {
      setTimeout(function () {
        let navigationEntry = performance.getEntriesByType("navigation")[0];
        if (!navigationEntry) return;
        let tls = navigationEntry.secureConnectionStart > 0
          ? Math.round(navigationEntry.connectEnd - navigationEntry.secureConnectionStart)
          : 0;
        let resourceCount = performance.getEntriesByType("resource").length;

        sdkInstance._enqueue("pageload", {
          duration: Math.round(navigationEntry.duration),
          ttfb: Math.round(navigationEntry.responseStart - navigationEntry.requestStart),
          navigationFetchStartToResponse: Math.round(navigationEntry.responseStart - navigationEntry.fetchStart),
          dns: Math.round(navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart),
          tcp: Math.round(navigationEntry.connectEnd - navigationEntry.connectStart),
          tls: tls,
          redirect: Math.round(navigationEntry.redirectEnd - navigationEntry.redirectStart),
          domInteractive: Math.round(navigationEntry.domInteractive - navigationEntry.startTime),
          domContentLoaded: Math.round(navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime),
          domComplete: Math.round(navigationEntry.domComplete - navigationEntry.startTime),
          loadComplete: Math.round(navigationEntry.loadEventEnd - navigationEntry.startTime),
          transferSize: navigationEntry.transferSize || 0,
          resourceCount: resourceCount,
        }, "pageload");
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

  WatchTower.prototype.getAlertRecipient = function () {
    return this.alertRecipient || getClerkPrimaryEmail();
  };

  WatchTower.prototype.setAlertRecipient = function (email) {
    this.alertRecipient = email || null;
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
    }, "click");
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
    }, "login");
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
    }, name || "custom");
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
    }, "error:manual");
  };

  global.WatchTower = WatchTower;
})(window);
