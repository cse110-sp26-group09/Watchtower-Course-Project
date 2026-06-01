"use strict";

/**
 * Unit tests for Prototype 3 server pure helpers.
 */

const {
  DEFAULT_STREAM_LIMIT,
  MAX_STREAM_LIMIT,
  isValidEvent,
  calculateAverage,
  calculatePercentile,
  parseTimestamp,
  clampNumber,
  normalizeEnvironment,
  deriveEventName,
  normalizeIncomingEvent,
  normalizeStreamFilters,
  queryEventsWithFilters,
  getRecentEvents,
  severityForError,
  buildActiveIssues,
} = require("../../src/prototype_3/server/server-helpers");

describe("isValidEvent (Prototype 3)", () => {
  test("accepts objects with a string type", () => {
    expect(isValidEvent({ type: "click" })).toBe(true);
  });

  test("rejects missing or non-object envelopes", () => {
    expect(isValidEvent(null)).toBe(false);
    expect(isValidEvent({})).toBe(false);
    expect(isValidEvent({ type: 1 })).toBe(false);
  });
});

describe("calculateAverage / calculatePercentile", () => {
  test("calculateAverage ignores non-finite values", () => {
    expect(calculateAverage([10, 20, NaN, "x"])).toBe(15);
    expect(calculateAverage([])).toBe(0);
  });

  test("calculatePercentile uses linear interpolation", () => {
    expect(calculatePercentile([10, 20, 30], 50)).toBe(20);
    expect(calculatePercentile([], 95)).toBe(0);
  });
});

describe("normalizeEnvironment", () => {
  test("returns known environment labels verbatim", () => {
    expect(normalizeEnvironment("staging", "")).toBe("staging");
  });

  test("infers development from localhost hosts", () => {
    expect(normalizeEnvironment("", "http://localhost:3000")).toBe("development");
  });

  test("defaults to production", () => {
    expect(normalizeEnvironment("", "https://app.example.com")).toBe("production");
  });
});

describe("deriveEventName", () => {
  test("uses custom data.name when present", () => {
    expect(deriveEventName({ type: "custom", data: { name: "checkout_started" } })).toBe(
      "checkout_started"
    );
  });

  test("falls back to the event type", () => {
    expect(deriveEventName({ type: "error", data: {} })).toBe("error");
  });
});

describe("normalizeIncomingEvent", () => {
  test("fills defaults and derives eventName", () => {
    const normalized = normalizeIncomingEvent({
      type: "pageload",
      sessionId: "s-1",
      route: "/home",
      data: { duration: 120 },
    });
    expect(normalized.type).toBe("pageload");
    expect(normalized.eventName).toBe("pageload");
    expect(normalized.sessionId).toBe("s-1");
    expect(normalized.environment).toBe("production");
    expect(normalized.receivedAt).toEqual(expect.any(String));
  });
});

describe("normalizeStreamFilters", () => {
  test("clamps limit between 1 and MAX_STREAM_LIMIT", () => {
    const params = new URLSearchParams("limit=9999");
    expect(normalizeStreamFilters(params).limit).toBe(MAX_STREAM_LIMIT);

    const zero = new URLSearchParams("limit=0");
    expect(normalizeStreamFilters(zero).limit).toBe(1);
  });

  test("falls back to DEFAULT_STREAM_LIMIT for invalid limit", () => {
    const params = new URLSearchParams("limit=abc");
    expect(normalizeStreamFilters(params).limit).toBe(DEFAULT_STREAM_LIMIT);
  });
});

describe("queryEventsWithFilters", () => {
  const events = [
    normalizeIncomingEvent({
      type: "error",
      sessionId: "run-a-1",
      timestamp: "2026-05-30T10:00:00.000Z",
      data: { seq: 1, source: "unit-spec" },
    }),
    normalizeIncomingEvent({
      type: "pageload",
      sessionId: "run-a-2",
      timestamp: "2026-05-30T10:00:01.000Z",
      data: { seq: 2, source: "unit-spec" },
    }),
    normalizeIncomingEvent({
      type: "error",
      sessionId: "run-b-1",
      timestamp: "2026-05-30T10:00:02.000Z",
      data: { seq: 3, source: "unit-spec" },
    }),
  ];

  test("filters by session substring and applies limit", () => {
    const params = new URLSearchParams("session=run-a&limit=1");
    const result = queryEventsWithFilters(events, normalizeStreamFilters(params));
    expect(result.total).toBe(2);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].sessionId).toBe("run-a-2");
    expect(result.nextCursor).toBe(1);
  });

  test("search filter matches serialized payload text", () => {
    const params = new URLSearchParams("search=unit-spec&limit=10");
    const result = queryEventsWithFilters(events, normalizeStreamFilters(params));
    expect(result.total).toBe(3);
  });
});

describe("getRecentEvents", () => {
  test("returns newest events first", () => {
    const events = [
      { timestamp: "2026-05-30T10:00:00.000Z", receivedAt: "2026-05-30T10:00:00.100Z" },
      { timestamp: "2026-05-30T10:00:02.000Z", receivedAt: "2026-05-30T10:00:02.100Z" },
    ];
    const recent = getRecentEvents(events, 1);
    expect(recent).toHaveLength(1);
    expect(recent[0].timestamp).toBe("2026-05-30T10:00:02.000Z");
  });
});

describe("parseTimestamp / clampNumber", () => {
  test("parseTimestamp returns null for invalid input", () => {
    expect(parseTimestamp("not-a-date")).toBeNull();
    expect(parseTimestamp("2026-05-30T12:00:00.000Z")).toEqual(expect.any(Number));
  });

  test("clampNumber bounds values", () => {
    expect(clampNumber(5, 1, 10)).toBe(5);
    expect(clampNumber(99, 1, 10)).toBe(10);
    expect(clampNumber(-3, 0, 10)).toBe(0);
  });
});

describe("severityForError", () => {
  test("matches the dashboard rule and adds an info tier", () => {
    expect(severityForError({ data: {} })).toBe("critical"); // no message
    expect(severityForError({ data: { message: "Unhandled TypeError" } })).toBe("critical");
    expect(severityForError({ data: { message: "Request timeout after 5s" } })).toBe("warning");
    expect(severityForError({ data: { message: "High latency on /api" } })).toBe("warning");
    expect(severityForError({ data: { message: "Deprecated API used" } })).toBe("info");
  });
});

describe("buildActiveIssues", () => {
  function err(message, opts) {
    return Object.assign(
      { type: "error", timestamp: "2026-06-01T10:00:00.000Z", sessionId: "s1", data: { message } },
      opts || {}
    );
  }

  test("groups errors by signature with counts, severity, status, and a legend", () => {
    const events = [
      err("Boom on checkout", { sessionId: "s1", timestamp: "2026-06-01T10:00:00.000Z" }),
      err("Boom on checkout", { sessionId: "s2", timestamp: "2026-06-01T10:05:00.000Z" }),
      err("Request timeout", { sessionId: "s3" }),
      { type: "pageload", timestamp: "2026-06-01T10:00:00.000Z", data: {} }, // ignored
    ];
    const result = buildActiveIssues(events);

    expect(result.total).toBe(2); // two distinct signatures
    expect(result.counts).toEqual({ critical: 1, warning: 1, info: 0 });

    const boom = result.issues.find((i) => i.signature === "Boom on checkout");
    expect(boom.count).toBe(2);
    expect(boom.affectedSessions).toBe(2);
    expect(boom.severity).toBe("critical");
    expect(boom.status).toBe("open");
    expect(boom.lastSeen).toBe("2026-06-01T10:05:00.000Z");

    // Critical sorts above warning.
    expect(result.issues[0].severity).toBe("critical");
  });

  test("returns empty structure when there are no errors", () => {
    const result = buildActiveIssues([{ type: "click", data: {} }]);
    expect(result.total).toBe(0);
    expect(result.issues).toEqual([]);
    expect(result.counts).toEqual({ critical: 0, warning: 0, info: 0 });
  });
});
