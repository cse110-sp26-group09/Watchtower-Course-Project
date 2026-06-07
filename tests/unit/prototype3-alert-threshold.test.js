"use strict";

const { evaluateErrorThreshold } = require("../../src/backend/alert-threshold");

const NOW = Date.parse("2026-06-03T12:00:00.000Z");
const WINDOW_MS = 300000;
const COOLDOWN_MS = 900000;

function errorEvent(seq, offsetMs) {
  return {
    type: "error",
    route: "/checkout",
    deployVersion: "v1",
    timestamp: new Date(NOW - offsetMs).toISOString(),
    data: { message: "boom " + seq },
  };
}

describe("Prototype 3 error alert threshold", () => {
  test("does not send below threshold", () => {
    const result = evaluateErrorThreshold([
      errorEvent(1, 1000),
      errorEvent(2, 2000),
      errorEvent(3, 3000),
      errorEvent(4, 4000),
    ], {
      now: NOW,
      threshold: 5,
      windowMs: WINDOW_MS,
      cooldownMs: COOLDOWN_MS,
      lastSentAt: 0,
    });

    expect(result.shouldSend).toBe(false);
    expect(result.reason).toBe("below-threshold");
  });

  test("sends when five stored errors are inside the rolling window", () => {
    const result = evaluateErrorThreshold([
      errorEvent(1, 1000),
      errorEvent(2, 2000),
      errorEvent(3, 3000),
      errorEvent(4, 4000),
      errorEvent(5, 5000),
      errorEvent(6, WINDOW_MS + 1000),
    ], {
      now: NOW,
      threshold: 5,
      windowMs: WINDOW_MS,
      cooldownMs: COOLDOWN_MS,
      lastSentAt: 0,
    });

    expect(result.shouldSend).toBe(true);
    expect(result.alert).toEqual(expect.objectContaining({
      count: 5,
      threshold: 5,
      windowMs: WINDOW_MS,
      route: "/checkout",
      deployVersion: "v1",
      message: "boom 1",
    }));
  });

  test("suppresses repeats during cooldown", () => {
    const result = evaluateErrorThreshold([
      errorEvent(1, 1000),
      errorEvent(2, 2000),
      errorEvent(3, 3000),
      errorEvent(4, 4000),
      errorEvent(5, 5000),
    ], {
      now: NOW,
      threshold: 5,
      windowMs: WINDOW_MS,
      cooldownMs: COOLDOWN_MS,
      lastSentAt: NOW - 60000,
    });

    expect(result.shouldSend).toBe(false);
    expect(result.reason).toBe("cooldown");
  });

  test("allows a new alert after cooldown", () => {
    const result = evaluateErrorThreshold([
      errorEvent(1, 1000),
      errorEvent(2, 2000),
      errorEvent(3, 3000),
      errorEvent(4, 4000),
      errorEvent(5, 5000),
    ], {
      now: NOW,
      threshold: 5,
      windowMs: WINDOW_MS,
      cooldownMs: COOLDOWN_MS,
      lastSentAt: NOW - COOLDOWN_MS - 1,
    });

    expect(result.shouldSend).toBe(true);
  });
});
