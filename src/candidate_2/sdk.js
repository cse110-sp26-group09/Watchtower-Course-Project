// WatchTower SDK — client-side event capture with batched sending
(function () {
  'use strict';

  const API_ENDPOINT = 'http://localhost:8000/api/events';
  const FLUSH_INTERVAL = 2000; // batch flush every 2 seconds

  const sessionId = generateSessionId();
  const deployMeta = document.querySelector('meta[name="deploy-version"]');
  const deployVersion = (deployMeta && deployMeta.content) || '1.0.0';

  const eventQueue = [];  // events waiting to be sent
  let flushTimer = null;

  /**
   * Generate a unique session identifier for this page load.
   *
   * @returns {string} A prefixed session ID (e.g. "sess_abc123_def456").
   */
  function generateSessionId() {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Build a structured event object with session and deploy metadata.
   *
   * @param {string} type - Event category (e.g. "error", "performance").
   * @param {string[]} tags - Labels for filtering (e.g. ["js-error", "auto-captured"]).
   * @param {Object} data - Arbitrary payload specific to this event.
   * @returns {Object} The assembled event ready for the queue.
   */
  function createEvent(type, tags, data) {
    return {
      type: type,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      deployVersion: deployVersion,
      tags: Array.isArray(tags) ? tags : [],
      data: data || {}
    };
  }

  /**
   * Add an event to the queue and start the flush timer if not already running.
   *
   * @param {Object} event - A structured event from createEvent().
   * @returns {void}
   */
  function enqueue(event) {
    eventQueue.push(event);
    if (!flushTimer) {
      flushTimer = setInterval(flush, FLUSH_INTERVAL);
    }
  }

  /**
   * Send all queued events to the backend in a single batch POST.
   * On network failure the batch is re-queued for the next flush cycle.
   *
   * @returns {void}
   */
  function flush() {
    if (eventQueue.length === 0) { return; }

    const batch = eventQueue.splice(0);

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify(batch)
    }).catch(function () {
      eventQueue.unshift.apply(eventQueue, batch);
    });
  }

  // Auto-capture unhandled JS errors
  window.onerror = function (message, source, lineno, colno, error) {
    enqueue(createEvent('error', ['js-error', 'auto-captured'], {
      message: message,
      source: source,
      line: lineno,
      column: colno,
      stack: error ? error.stack : null
    }));
  };

  // Auto-capture page load performance (DNS, TTFB, DOM load, etc.)
  window.addEventListener('load', function () {
    const perf = performance.getEntriesByType('navigation')[0];
    if (!perf) { return; }

    enqueue(createEvent('performance', ['page-load', 'auto-captured'], {
      dnsLookup: Math.round(perf.domainLookupEnd - perf.domainLookupStart),
      tcpConnect: Math.round(perf.connectEnd - perf.connectStart),
      ttfb: Math.round(perf.responseStart - perf.requestStart),
      domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.startTime),
      fullLoad: Math.round(perf.loadEventEnd - perf.startTime),
      transferSize: perf.transferSize
    }));
  });

  // Flush remaining events before the page closes
  window.addEventListener('beforeunload', function () {
    flush();
  });

  /**
   * Public SDK API exposed on window.WatchTowerSDK.
   *
   * @namespace WatchTowerSDK
   */
  window.WatchTowerSDK = {
    /**
     * Track a custom event manually.
     *
     * @param {string} type - Event category.
     * @param {string[]} tags - Filterable labels.
     * @param {Object} data - Event payload.
     * @returns {void}
     */
    track: function (type, tags, data) {
      enqueue(createEvent(type, tags, data));
    },
    /** @returns {void} Immediately flush the event queue. */
    flush: flush,
    /** @returns {string} The current session ID. */
    getSessionId: function () {
      return sessionId;
    }
  };
})();
