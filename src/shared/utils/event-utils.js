"use strict";

/**
 * Event utility helpers shared by the WatchTower prototypes, server, and tests.
 *
 * These functions are intentionally small, pure, and free of any I/O so
 * they are easy to unit test and reuse from server-side code, the SDK,
 * the dashboard, or future tooling. They mirror the event shape produced
 * by the WatchTower SDK (see `src/prototype_2/sdk.js`) and consumed by
 * the dashboard. The module lives under `src/shared/` so neither
 * prototype "owns" it; both prototypes (and any Sprint 3 hybrid) can
 * import the same canonical implementation.
 *
 * @module event-utils
 */

/**
 * Known event types accepted by the WatchTower API.
 *
 * The server is intentionally permissive about event types so new SDK
 * features can be added without coordinated deploys, but these are the
 * built-in types the dashboard knows how to render.
 *
 * @type {ReadonlyArray<string>}
 */
const KNOWN_EVENT_TYPES = Object.freeze([
  "error",
  "pageload",
  "click",
  "login",
  "logout",
  "feedback",
  "custom",
]);

/**
 * Build a base WatchTower event with the required envelope fields.
 *
 * The returned object always contains `type`, `timestamp`, and `data`.
 * Callers can layer additional fields (such as `sessionId`, `route`, or
 * `deployVersion`) on top of the returned object.
 *
 * @param {string} type - Event type (for example `"error"` or `"click"`).
 * @param {Object} [data] - Event-specific payload.
 * @returns {{type: string, timestamp: string, data: Object}}
 *   A new event object with the required envelope fields.
 */
function createBaseEvent(type, data) {
  return {
    type: String(type || "custom"),
    timestamp: new Date().toISOString(),
    data: data && typeof data === "object" ? data : {},
  };
}

/**
 * Return true if the value is a non-empty ISO-8601 timestamp string.
 *
 * @param {unknown} value - Value to inspect.
 * @returns {boolean} `true` when `value` parses as a valid date.
 */
function isValidTimestamp(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

/**
 * Validate the minimum envelope of a WatchTower event.
 *
 * An event is considered valid when it is an object that has a non-empty
 * string `type`, a parseable string `timestamp`, and an object `data`
 * payload. This intentionally does not enforce type-specific fields so
 * that the validation can stay useful as new event types are added.
 *
 * @param {unknown} event - Candidate event object.
 * @returns {boolean} `true` if the event passes the minimum checks.
 */
function isValidEvent(event) {
  if (!event || typeof event !== "object") {
    return false;
  }
  if (typeof event.type !== "string" || event.type.length === 0) {
    return false;
  }
  if (!isValidTimestamp(event.timestamp)) {
    return false;
  }
  if (event.data === undefined || event.data === null || typeof event.data !== "object") {
    return false;
  }
  return true;
}

/**
 * Normalize a raw error payload into the shape the dashboard expects.
 *
 * Missing fields are filled in with safe defaults so consumers never
 * need to null-check them. The result is wrapped in a standard event
 * envelope via {@link createBaseEvent}.
 *
 * @param {Object} [errorData] - Raw error data (typically from the SDK).
 * @param {string} [errorData.message] - Human-readable error message.
 * @param {string} [errorData.source] - Originating script or label.
 * @param {number} [errorData.line] - Line number where the error occurred.
 * @param {number} [errorData.col] - Column number where the error occurred.
 * @param {string} [errorData.stack] - Stack trace, if available.
 * @returns {{type: string, timestamp: string, data: Object}}
 *   A normalized `"error"` event.
 */
function normalizeErrorEvent(errorData) {
  const src = errorData && typeof errorData === "object" ? errorData : {};
  return createBaseEvent("error", {
    message: typeof src.message === "string" && src.message.length > 0
      ? src.message
      : "Unknown error",
    source: typeof src.source === "string" ? src.source : "",
    line: Number.isFinite(src.line) ? src.line : 0,
    col: Number.isFinite(src.col) ? src.col : 0,
    stack: typeof src.stack === "string" ? src.stack : "",
  });
}

/**
 * Normalize a raw feedback payload into a feedback event.
 *
 * Ratings are clamped to the inclusive range 1-5 when provided as a
 * finite number, otherwise the field is set to `null`. The message is
 * trimmed and truncated so unbounded user input cannot bloat storage.
 *
 * @param {Object} [feedbackData] - Raw feedback payload.
 * @param {number} [feedbackData.rating] - Optional 1-5 rating.
 * @param {string} [feedbackData.message] - Free-form feedback text.
 * @param {string} [feedbackData.category] - Optional grouping category.
 * @returns {{type: string, timestamp: string, data: Object}}
 *   A normalized `"feedback"` event.
 */
function normalizeFeedbackEvent(feedbackData) {
  const src = feedbackData && typeof feedbackData === "object" ? feedbackData : {};
  let rating = null;
  if (Number.isFinite(src.rating)) {
    rating = Math.max(1, Math.min(5, Math.round(src.rating)));
  }
  const rawMessage = typeof src.message === "string" ? src.message.trim() : "";
  return createBaseEvent("feedback", {
    rating: rating,
    message: rawMessage.length > 500 ? rawMessage.slice(0, 500) : rawMessage,
    category: typeof src.category === "string" ? src.category : "general",
  });
}

/**
 * Calculate the arithmetic mean of a list of numbers.
 *
 * Non-finite values are ignored. The function returns `0` for empty
 * input (or input containing no finite numbers) so callers can render
 * the result directly without guarding against `NaN`.
 *
 * @param {Array<number>} values - Numeric samples.
 * @returns {number} The average of the finite values in `values`.
 */
function calculateAverage(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  let sum = 0;
  let count = 0;
  for (const v of values) {
    if (Number.isFinite(v)) {
      sum += v;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

/**
 * Calculate an inclusive percentile (using the nearest-rank method).
 *
 * The percentile is given as a number between 0 and 100. Non-finite
 * values are ignored. Returns `0` when the input contains no finite
 * numbers so callers can safely render the result.
 *
 * @param {Array<number>} values - Numeric samples (unsorted is fine).
 * @param {number} percentile - Percentile to compute, 0-100 inclusive.
 * @returns {number} The value at the requested percentile.
 */
function calculatePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  if (!Number.isFinite(percentile)) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(100, percentile));
  const finite = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (finite.length === 0) {
    return 0;
  }
  const rank = Math.ceil((clamped / 100) * finite.length);
  const index = Math.max(0, Math.min(finite.length - 1, rank - 1));
  return finite[index];
}

module.exports = {
  KNOWN_EVENT_TYPES,
  createBaseEvent,
  isValidEvent,
  isValidTimestamp,
  normalizeErrorEvent,
  normalizeFeedbackEvent,
  calculateAverage,
  calculatePercentile,
};
