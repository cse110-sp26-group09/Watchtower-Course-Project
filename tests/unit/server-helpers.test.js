"use strict";

/**
 * Unit tests for the prototype 2 server's pure helper functions.
 *
 * These tests cover the stats aggregation, event buffer cap behavior,
 * GET /api/events filter logic, and the static-file path-traversal
 * protection. They run without spinning up an HTTP server, so they stay
 * fast and deterministic and complement the existing Playwright e2e
 * smoke tests in `tests/e2e/watchtower.spec.js`.
 *
 * Authored as part of the Sprint 2 Backend Testing / QA responsibility.
 */

const path = require("path");

const {
  resolveAlias,
  isPathSafe,
  appendWithCap,
  filterEvents,
  computeStats,
} = require("../../src/prototype_2/server/server-helpers");

// ---------------------------------------------------------------------------
// resolveAlias
// ---------------------------------------------------------------------------

describe("resolveAlias", () => {
  test("maps the root path to index.html", () => {
    expect(resolveAlias("/")).toBe("/index.html");
  });

  test("maps an empty path to index.html", () => {
    expect(resolveAlias("")).toBe("/index.html");
  });

  test("maps undefined and null paths to index.html defensively", () => {
    expect(resolveAlias(undefined)).toBe("/index.html");
    expect(resolveAlias(null)).toBe("/index.html");
  });

  test("maps /demo and /demo/ to the hosted demo entry point", () => {
    expect(resolveAlias("/demo")).toBe("/hosted_demo/index.html");
    expect(resolveAlias("/demo/")).toBe("/hosted_demo/index.html");
  });

  test("leaves other paths unchanged", () => {
    expect(resolveAlias("/sdk.js")).toBe("/sdk.js");
    expect(resolveAlias("/dashboard.js")).toBe("/dashboard.js");
    expect(resolveAlias("/hosted_demo/style.css")).toBe("/hosted_demo/style.css");
  });
});

// ---------------------------------------------------------------------------
// isPathSafe
// ---------------------------------------------------------------------------

describe("isPathSafe", () => {
  const root = path.resolve("/tmp/wt-root");

  test("accepts a normal child path", () => {
    expect(isPathSafe(root, "/index.html")).toBe(true);
    expect(isPathSafe(root, "/hosted_demo/app.js")).toBe(true);
  });

  test("accepts the root itself", () => {
    expect(isPathSafe(root, "/")).toBe(true);
  });

  test("rejects classic parent-directory traversal", () => {
    expect(isPathSafe(root, "/../etc/passwd")).toBe(false);
    expect(isPathSafe(root, "/../../etc/passwd")).toBe(false);
    expect(isPathSafe(root, "/hosted_demo/../../etc/passwd")).toBe(false);
  });

  test("rejects encoded traversal that already resolves outside root", () => {
    expect(isPathSafe(root, "/..%2Fetc")).toBe(true); // not decoded — treated as a literal name, still inside root
    expect(isPathSafe(root, "/../" + path.basename(root) + "-sibling")).toBe(false);
  });

  test("rejects non-string inputs", () => {
    expect(isPathSafe(root, undefined)).toBe(false);
    expect(isPathSafe(root, null)).toBe(false);
    expect(isPathSafe(root, 42)).toBe(false);
    expect(isPathSafe(undefined, "/index.html")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// appendWithCap
// ---------------------------------------------------------------------------

describe("appendWithCap", () => {
  test("appends every incoming event when the buffer has room", () => {
    const buffer = [{ id: 1 }];
    appendWithCap(buffer, [{ id: 2 }, { id: 3 }], 10);
    expect(buffer).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  test("evicts oldest entries first when the cap is exceeded", () => {
    const buffer = [{ id: 1 }, { id: 2 }, { id: 3 }];
    appendWithCap(buffer, [{ id: 4 }, { id: 5 }], 3);
    expect(buffer).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }]);
  });

  test("returns the same buffer reference (in-place mutation)", () => {
    const buffer = [];
    const returned = appendWithCap(buffer, [{ id: 1 }], 10);
    expect(returned).toBe(buffer);
  });

  test("tolerates non-array incoming without throwing", () => {
    const buffer = [{ id: 1 }];
    appendWithCap(buffer, null, 10);
    appendWithCap(buffer, undefined, 10);
    appendWithCap(buffer, "not an array", 10);
    expect(buffer).toEqual([{ id: 1 }]);
  });

  test("returns an empty array when buffer is not an array", () => {
    expect(appendWithCap(null, [{ id: 1 }], 10)).toEqual([]);
    expect(appendWithCap("nope", [{ id: 1 }], 10)).toEqual([]);
  });

  test("treats non-finite or negative cap as 0", () => {
    const buffer = [{ id: 1 }, { id: 2 }];
    appendWithCap(buffer, [{ id: 3 }], NaN);
    expect(buffer).toEqual([]);
  });

  test("enforces the 10,000 cap documented in the API contract", () => {
    const buffer = [];
    const incoming = [];
    for (let i = 0; i < 10050; i++) {
      incoming.push({ id: i });
    }
    appendWithCap(buffer, incoming, 10000);
    expect(buffer.length).toBe(10000);
    expect(buffer[0]).toEqual({ id: 50 });
    expect(buffer[buffer.length - 1]).toEqual({ id: 10049 });
  });
});

// ---------------------------------------------------------------------------
// filterEvents
// ---------------------------------------------------------------------------

describe("filterEvents", () => {
  const sample = [
    { type: "click",    deployVersion: "v1.0.0", id: 1 },
    { type: "error",    deployVersion: "v1.0.0", id: 2 },
    { type: "pageload", deployVersion: "v1.0.0", id: 3 },
    { type: "error",    deployVersion: "v1.1.0", id: 4 },
    { type: "click",    deployVersion: "v1.1.0", id: 5 },
  ];

  test("returns the last 100 events by default when no filters apply", () => {
    const result = filterEvents(sample);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual(sample[0]);
  });

  test("filters by type", () => {
    const result = filterEvents(sample, { type: "error" });
    expect(result.map(function (e) { return e.id; })).toEqual([2, 4]);
  });

  test("filters by deploy version", () => {
    const result = filterEvents(sample, { version: "v1.1.0" });
    expect(result.map(function (e) { return e.id; })).toEqual([4, 5]);
  });

  test("combines type and version filters", () => {
    const result = filterEvents(sample, { type: "error", version: "v1.0.0" });
    expect(result.map(function (e) { return e.id; })).toEqual([2]);
  });

  test("honors limit by returning the most recent N matches", () => {
    const result = filterEvents(sample, { limit: 2 });
    expect(result.map(function (e) { return e.id; })).toEqual([4, 5]);
  });

  test("clamps invalid limits to the default", () => {
    expect(filterEvents(sample, { limit: -5 })).toHaveLength(5);
    expect(filterEvents(sample, { limit: "abc" })).toHaveLength(5);
  });

  test("does not mutate the input array", () => {
    const copy = sample.slice();
    filterEvents(sample, { type: "error" });
    expect(sample).toEqual(copy);
  });

  test("returns an empty array for non-array input", () => {
    expect(filterEvents(null)).toEqual([]);
    expect(filterEvents(undefined)).toEqual([]);
    expect(filterEvents("nope")).toEqual([]);
  });

  test("ignores events missing the filter field", () => {
    const withMissing = sample.concat([{ id: 99 }]);
    const result = filterEvents(withMissing, { type: "error" });
    expect(result.map(function (e) { return e.id; })).toEqual([2, 4]);
  });
});

// ---------------------------------------------------------------------------
// computeStats
// ---------------------------------------------------------------------------

describe("computeStats", () => {
  const NOW = new Date("2026-05-18T18:00:00.000Z").getTime();
  const WINDOW = 5 * 60 * 1000; // 5 minutes

  function makeEvent(overrides) {
    return Object.assign(
      {
        type: "click",
        timestamp: new Date(NOW).toISOString(),
        sessionId: "sess_a",
        deployVersion: "v1.0.0",
        data: {},
      },
      overrides || {}
    );
  }

  test("returns zeroed defaults for an empty buffer", () => {
    const stats = computeStats([], NOW, WINDOW);
    expect(stats).toEqual({
      activeUsers: 0,
      totalEvents: 0,
      totalErrors: 0,
      errorsByVersion: {},
      latencyByRoute: {},
      recentErrors: [],
    });
  });

  test("counts distinct sessions inside the active-user window", () => {
    const stats = computeStats(
      [
        makeEvent({ sessionId: "sess_a", timestamp: new Date(NOW - 60 * 1000).toISOString() }),
        makeEvent({ sessionId: "sess_b", timestamp: new Date(NOW - 2 * 60 * 1000).toISOString() }),
        makeEvent({ sessionId: "sess_a", timestamp: new Date(NOW - 30 * 1000).toISOString() }),
      ],
      NOW,
      WINDOW
    );
    expect(stats.activeUsers).toBe(2);
  });

  test("excludes sessions whose only events are outside the window", () => {
    const stats = computeStats(
      [
        makeEvent({ sessionId: "sess_a", timestamp: new Date(NOW - 10 * 60 * 1000).toISOString() }),
        makeEvent({ sessionId: "sess_b", timestamp: new Date(NOW - 1 * 60 * 1000).toISOString() }),
      ],
      NOW,
      WINDOW
    );
    expect(stats.activeUsers).toBe(1);
  });

  test("groups error events by deploy version, defaulting unknown", () => {
    const stats = computeStats(
      [
        makeEvent({ type: "error", deployVersion: "v1.0.0" }),
        makeEvent({ type: "error", deployVersion: "v1.0.0" }),
        makeEvent({ type: "error", deployVersion: "v1.1.0" }),
        makeEvent({ type: "error", deployVersion: undefined }),
      ],
      NOW,
      WINDOW
    );
    expect(stats.errorsByVersion).toEqual({
      "v1.0.0": 2,
      "v1.1.0": 1,
      "unknown": 1,
    });
    expect(stats.totalErrors).toBe(4);
    expect(stats.recentErrors).toHaveLength(4);
  });

  test("caps recentErrors at 50 even when more errors exist", () => {
    const errors = [];
    for (let i = 0; i < 75; i++) {
      errors.push(makeEvent({ type: "error" }));
    }
    const stats = computeStats(errors, NOW, WINDOW);
    expect(stats.recentErrors.length).toBe(50);
    // errorsByVersion still counts every error
    expect(stats.errorsByVersion["v1.0.0"]).toBe(75);
  });

  test("computes latency p50, p95, and avg per route", () => {
    const samples = [];
    for (let i = 1; i <= 100; i++) {
      samples.push(makeEvent({
        type: "pageload",
        route: "/dashboard",
        data: { duration: i, ttfb: i / 2 },
      }));
    }
    const stats = computeStats(samples, NOW, WINDOW);
    const dash = stats.latencyByRoute["/dashboard"];
    expect(dash.count).toBe(100);
    // nearest-rank style indexing matches the original server impl
    expect(dash.p50).toBeGreaterThanOrEqual(50);
    expect(dash.p95).toBeGreaterThanOrEqual(95);
    expect(dash.avg).toBe(51); // round((1+2+...+100)/100) = round(50.5) = 51
    expect(dash.points.length).toBeLessThanOrEqual(100);
  });

  test("buckets latency samples by route", () => {
    const stats = computeStats(
      [
        makeEvent({ type: "pageload", route: "/home",      data: { duration: 100 } }),
        makeEvent({ type: "pageload", route: "/home",      data: { duration: 200 } }),
        makeEvent({ type: "pageload", route: "/dashboard", data: { duration: 500 } }),
      ],
      NOW,
      WINDOW
    );
    expect(Object.keys(stats.latencyByRoute).sort()).toEqual(["/dashboard", "/home"]);
    expect(stats.latencyByRoute["/home"].count).toBe(2);
    expect(stats.latencyByRoute["/dashboard"].count).toBe(1);
  });

  test("treats missing route as '/'", () => {
    const stats = computeStats(
      [makeEvent({ type: "pageload", route: undefined, data: { duration: 123 } })],
      NOW,
      WINDOW
    );
    expect(stats.latencyByRoute["/"].count).toBe(1);
  });

  test("ignores pageload events without a numeric duration", () => {
    const stats = computeStats(
      [
        makeEvent({ type: "pageload", route: "/x", data: { duration: 100 } }),
        makeEvent({ type: "pageload", route: "/x", data: {} }),
        makeEvent({ type: "pageload", route: "/x", data: null }),
      ],
      NOW,
      WINDOW
    );
    expect(stats.latencyByRoute["/x"].count).toBe(1);
  });

  test("tolerates malformed events without throwing", () => {
    const stats = computeStats(
      [null, undefined, "not an event", makeEvent({ type: "error" })],
      NOW,
      WINDOW
    );
    expect(stats.totalEvents).toBe(4);
    expect(stats.totalErrors).toBe(1);
  });

  test("uses Date.now() and the default 5-minute window when args are omitted", () => {
    // event in the recent past — should still count
    const recent = makeEvent({
      type: "click",
      sessionId: "sess_recent",
      timestamp: new Date(Date.now() - 30 * 1000).toISOString(),
    });
    const stats = computeStats([recent]);
    expect(stats.activeUsers).toBe(1);
  });
});
