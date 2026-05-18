"use strict";

const {
  KNOWN_EVENT_TYPES,
  createBaseEvent,
  isValidEvent,
  isValidTimestamp,
  normalizeErrorEvent,
  normalizeFeedbackEvent,
  calculateAverage,
  calculatePercentile,
} = require("../../src/prototype_2/utils/event-utils");

describe("createBaseEvent", () => {
  test("includes type, timestamp, and data fields", () => {
    const event = createBaseEvent("click", { target: "BUTTON.btn" });
    expect(event.type).toBe("click");
    expect(typeof event.timestamp).toBe("string");
    expect(isValidTimestamp(event.timestamp)).toBe(true);
    expect(event.data).toEqual({ target: "BUTTON.btn" });
  });

  test("defaults type to 'custom' and data to an object", () => {
    const event = createBaseEvent();
    expect(event.type).toBe("custom");
    expect(event.data).toEqual({});
  });

  test("coerces non-object data into an empty object", () => {
    const event = createBaseEvent("error", "not an object");
    expect(event.data).toEqual({});
  });
});

describe("isValidEvent", () => {
  test("accepts a well-formed event", () => {
    const event = createBaseEvent("error", { message: "boom" });
    expect(isValidEvent(event)).toBe(true);
  });

  test("rejects events missing a type", () => {
    const event = { timestamp: new Date().toISOString(), data: {} };
    expect(isValidEvent(event)).toBe(false);
  });

  test("rejects events with an invalid timestamp", () => {
    const event = { type: "click", timestamp: "not-a-date", data: {} };
    expect(isValidEvent(event)).toBe(false);
  });

  test("rejects events with non-object data", () => {
    const event = { type: "click", timestamp: new Date().toISOString(), data: "nope" };
    expect(isValidEvent(event)).toBe(false);
  });

  test("rejects null, undefined, and primitives", () => {
    expect(isValidEvent(null)).toBe(false);
    expect(isValidEvent(undefined)).toBe(false);
    expect(isValidEvent(42)).toBe(false);
    expect(isValidEvent("event")).toBe(false);
  });
});

describe("normalizeErrorEvent", () => {
  test("fills in safe defaults when fields are missing", () => {
    const event = normalizeErrorEvent({});
    expect(event.type).toBe("error");
    expect(event.data.message).toBe("Unknown error");
    expect(event.data.source).toBe("");
    expect(event.data.line).toBe(0);
    expect(event.data.col).toBe(0);
    expect(event.data.stack).toBe("");
  });

  test("preserves provided error fields", () => {
    const event = normalizeErrorEvent({
      message: "Cannot read properties of null",
      source: "demo/app.js",
      line: 42,
      col: 7,
      stack: "TypeError: ...",
    });
    expect(event.data.message).toBe("Cannot read properties of null");
    expect(event.data.source).toBe("demo/app.js");
    expect(event.data.line).toBe(42);
    expect(event.data.col).toBe(7);
    expect(event.data.stack).toContain("TypeError");
  });

  test("produces a valid event envelope", () => {
    const event = normalizeErrorEvent({ message: "boom" });
    expect(isValidEvent(event)).toBe(true);
  });
});

describe("normalizeFeedbackEvent", () => {
  test("clamps the rating to the 1-5 range", () => {
    expect(normalizeFeedbackEvent({ rating: 0 }).data.rating).toBe(1);
    expect(normalizeFeedbackEvent({ rating: 9 }).data.rating).toBe(5);
    expect(normalizeFeedbackEvent({ rating: 3.4 }).data.rating).toBe(3);
  });

  test("sets rating to null when not a finite number", () => {
    expect(normalizeFeedbackEvent({}).data.rating).toBeNull();
    expect(normalizeFeedbackEvent({ rating: "five" }).data.rating).toBeNull();
  });

  test("trims and caps the message length", () => {
    const long = "x".repeat(600);
    const event = normalizeFeedbackEvent({ message: "   hello   " });
    const capped = normalizeFeedbackEvent({ message: long });
    expect(event.data.message).toBe("hello");
    expect(capped.data.message.length).toBe(500);
  });

  test("defaults category to 'general'", () => {
    const event = normalizeFeedbackEvent({ message: "looks great" });
    expect(event.data.category).toBe("general");
  });
});

describe("calculateAverage", () => {
  test("returns the arithmetic mean of finite numbers", () => {
    expect(calculateAverage([2, 4, 6])).toBe(4);
    expect(calculateAverage([100, 200])).toBe(150);
  });

  test("ignores non-finite values", () => {
    expect(calculateAverage([1, 2, NaN, 3, Infinity])).toBe(2);
  });

  test("returns 0 for empty or invalid input", () => {
    expect(calculateAverage([])).toBe(0);
    expect(calculateAverage(null)).toBe(0);
    expect(calculateAverage("nope")).toBe(0);
  });
});

describe("calculatePercentile", () => {
  test("returns the requested percentile (nearest-rank)", () => {
    const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(calculatePercentile(samples, 50)).toBe(50);
    expect(calculatePercentile(samples, 95)).toBe(100);
    expect(calculatePercentile(samples, 0)).toBe(10);
    expect(calculatePercentile(samples, 100)).toBe(100);
  });

  test("clamps percentile to the 0-100 range", () => {
    const samples = [1, 2, 3, 4, 5];
    expect(calculatePercentile(samples, -10)).toBe(1);
    expect(calculatePercentile(samples, 200)).toBe(5);
  });

  test("returns 0 for empty input or non-numeric percentile", () => {
    expect(calculatePercentile([], 50)).toBe(0);
    expect(calculatePercentile([1, 2, 3], "fifty")).toBe(0);
  });
});

describe("KNOWN_EVENT_TYPES", () => {
  test("includes the core WatchTower types", () => {
    expect(KNOWN_EVENT_TYPES).toEqual(
      expect.arrayContaining(["error", "pageload", "click", "login", "feedback"])
    );
  });

  test("is frozen so consumers cannot mutate it", () => {
    expect(Object.isFrozen(KNOWN_EVENT_TYPES)).toBe(true);
  });
});
