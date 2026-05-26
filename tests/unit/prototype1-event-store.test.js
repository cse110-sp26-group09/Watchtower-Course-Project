"use strict";

/**
 * Unit tests for the Prototype 1 SQLite event store.
 *
 * These tests cover the pure helpers (`normalizeForStorage`, `rowToApiEvent`,
 * `validateEvent`, `isValidTimestamp`) and the live store wrapper backed by
 * an in-memory SQLite database (`openDatabase(":memory:")`). They do not
 * spin up the HTTP server, so they stay fast and deterministic and
 * complement the Playwright e2e tests in
 * `tests/e2e/prototype1-sqlite.spec.js`.
 */

const path = require("path");

const {
  KNOWN_EVENT_TYPES,
  generateEventId,
  isValidTimestamp,
  validateEvent,
  normalizeForStorage,
  rowToApiEvent,
  openDatabase,
  createEventStore,
} = require("../../src/prototype_1/server/event-store");

// ---------------------------------------------------------------------------
// generateEventId
// ---------------------------------------------------------------------------

describe("generateEventId", () => {
  test("returns a non-empty string", () => {
    const id = generateEventId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  test("returns unique values across calls", () => {
    const ids = new Set();
    for (let i = 0; i < 50; i += 1) {
      ids.add(generateEventId());
    }
    expect(ids.size).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// isValidTimestamp
// ---------------------------------------------------------------------------

describe("isValidTimestamp", () => {
  test("accepts a well-formed ISO-8601 string", () => {
    expect(isValidTimestamp("2026-05-25T18:00:00.000Z")).toBe(true);
  });

  test("rejects empty strings, non-strings, and unparseable values", () => {
    expect(isValidTimestamp("")).toBe(false);
    expect(isValidTimestamp(null)).toBe(false);
    expect(isValidTimestamp(undefined)).toBe(false);
    expect(isValidTimestamp(123)).toBe(false);
    expect(isValidTimestamp("not-a-date")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateEvent
// ---------------------------------------------------------------------------

describe("validateEvent", () => {
  const baseEvent = () => ({
    type: "page_view",
    timestamp: new Date().toISOString(),
    data: { title: "Home" },
  });

  test("accepts a complete event", () => {
    expect(validateEvent(baseEvent()).ok).toBe(true);
  });

  test("accepts events that omit the optional timestamp", () => {
    const event = baseEvent();
    delete event.timestamp;
    expect(validateEvent(event).ok).toBe(true);
  });

  test("accepts events that omit the optional data field", () => {
    const event = baseEvent();
    delete event.data;
    expect(validateEvent(event).ok).toBe(true);
  });

  test("rejects events without a string type", () => {
    expect(validateEvent({ ...baseEvent(), type: "" }).ok).toBe(false);
    expect(validateEvent({ ...baseEvent(), type: 42 }).ok).toBe(false);
  });

  test("rejects events with an invalid timestamp", () => {
    expect(validateEvent({ ...baseEvent(), timestamp: "nope" }).ok).toBe(false);
  });

  test("rejects events with a non-object data field", () => {
    expect(validateEvent({ ...baseEvent(), data: "nope" }).ok).toBe(false);
    expect(validateEvent({ ...baseEvent(), data: null }).ok).toBe(false);
    expect(validateEvent({ ...baseEvent(), data: [] }).ok).toBe(false);
  });

  test("rejects null, undefined, and primitives", () => {
    expect(validateEvent(null).ok).toBe(false);
    expect(validateEvent(undefined).ok).toBe(false);
    expect(validateEvent("event").ok).toBe(false);
    expect(validateEvent(42).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeForStorage
// ---------------------------------------------------------------------------

describe("normalizeForStorage", () => {
  test("maps SDK camelCase fields onto the snake_case row schema", () => {
    const row = normalizeForStorage({
      type: "click",
      timestamp: "2026-05-25T18:00:00.000Z",
      sessionId: "session-1",
      userId: "user-1",
      deployVersion: "v1.2.3",
      appName: "ShopDemo",
      url: "http://localhost:3000/demo",
      route: "/demo",
      data: { target: "BUTTON.btn", text: "Submit" },
    });

    expect(row.id).toEqual(expect.any(String));
    expect(row.type).toBe("click");
    expect(row.timestamp).toBe("2026-05-25T18:00:00.000Z");
    expect(row.session_id).toBe("session-1");
    expect(row.page_url).toBe("http://localhost:3000/demo");
    expect(row.app_version).toBe("v1.2.3");
    expect(row.received_at).toEqual(expect.any(String));
    expect(isValidTimestamp(row.received_at)).toBe(true);

    const metadata = JSON.parse(row.metadata);
    expect(metadata.userId).toBe("user-1");
    expect(metadata.appName).toBe("ShopDemo");
    expect(metadata.route).toBe("/demo");
    expect(metadata.data).toEqual({ target: "BUTTON.btn", text: "Submit" });
  });

  test("accepts external snake_case fields directly", () => {
    const row = normalizeForStorage({
      type: "error",
      timestamp: "2026-05-25T18:00:00.000Z",
      session_id: "ext-session",
      page_url: "https://example.com/x",
      message: "External boom",
      severity: "high",
      app_version: "ext-v9",
      metadata: { trace: "abc" },
    });

    expect(row.session_id).toBe("ext-session");
    expect(row.page_url).toBe("https://example.com/x");
    expect(row.message).toBe("External boom");
    expect(row.severity).toBe("high");
    expect(row.app_version).toBe("ext-v9");

    const metadata = JSON.parse(row.metadata);
    expect(metadata.trace).toBe("abc");
  });

  test("derives severity 'critical' for error events when not provided", () => {
    const row = normalizeForStorage({
      type: "error",
      timestamp: new Date().toISOString(),
      data: { message: "boom" },
    });
    expect(row.severity).toBe("critical");
    expect(row.message).toBe("boom");
  });

  test("does not invent a severity for non-error events", () => {
    const row = normalizeForStorage({
      type: "click",
      timestamp: new Date().toISOString(),
      data: {},
    });
    expect(row.severity).toBe(null);
  });

  test("falls back to a server-generated id and timestamp when missing", () => {
    const row = normalizeForStorage({ type: "page_view" });
    expect(row.id).toEqual(expect.any(String));
    expect(row.id.length).toBeGreaterThan(0);
    expect(isValidTimestamp(row.timestamp)).toBe(true);
  });

  test("produces a JSON-parseable metadata column", () => {
    const row = normalizeForStorage({
      type: "feedback",
      timestamp: new Date().toISOString(),
      data: { rating: 5, message: "great" },
    });
    expect(() => JSON.parse(row.metadata)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// rowToApiEvent
// ---------------------------------------------------------------------------

describe("rowToApiEvent", () => {
  test("round-trips an SDK-shaped event through normalize -> rowToApiEvent", () => {
    const incoming = {
      type: "error",
      timestamp: "2026-05-25T18:00:00.000Z",
      sessionId: "session-1",
      userId: "user-1",
      deployVersion: "v1.0.0",
      appName: "ShopDemo",
      url: "http://localhost:3000/demo",
      route: "/demo",
      data: { message: "boom", source: "demo/app.js", line: 42, col: 8, stack: "Error\n  at ..." },
    };

    const row = normalizeForStorage(incoming);
    const api = rowToApiEvent(row);

    expect(api.type).toBe("error");
    expect(api.sessionId).toBe("session-1");
    expect(api.session_id).toBe("session-1");
    expect(api.deployVersion).toBe("v1.0.0");
    expect(api.app_version).toBe("v1.0.0");
    expect(api.appName).toBe("ShopDemo");
    expect(api.route).toBe("/demo");
    expect(api.url).toBe("http://localhost:3000/demo");
    expect(api.data.message).toBe("boom");
    expect(api.data.line).toBe(42);
    expect(api.message).toBe("boom");
    expect(api.severity).toBe("critical");
    expect(api.userId).toBe("user-1");
    expect(api.receivedAt).toEqual(expect.any(String));
  });

  test("returns null for a falsy row", () => {
    expect(rowToApiEvent(null)).toBeNull();
    expect(rowToApiEvent(undefined)).toBeNull();
  });

  test("tolerates malformed metadata without throwing", () => {
    const api = rowToApiEvent({
      id: "1",
      type: "custom",
      timestamp: "2026-05-25T18:00:00.000Z",
      source: null,
      session_id: null,
      page_url: null,
      message: null,
      severity: null,
      app_version: null,
      metadata: "{not-json",
      received_at: "2026-05-25T18:00:00.001Z",
    });
    expect(api.type).toBe("custom");
    expect(api.data).toEqual({});
    expect(api.metadata).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// createEventStore (in-memory SQLite)
// ---------------------------------------------------------------------------

describe("createEventStore (in-memory)", () => {
  /** @type {ReturnType<typeof createEventStore>} */
  let store;
  let database;

  beforeEach(() => {
    database = openDatabase(":memory:");
    store = createEventStore(database);
  });

  afterEach(() => {
    store.close();
  });

  test("inserts and reads an event end-to-end", () => {
    const stored = store.insertEvent({
      type: "page_view",
      timestamp: "2026-05-25T18:00:00.000Z",
      sessionId: "s1",
      route: "/demo",
      url: "http://localhost:3000/demo",
      data: { title: "Demo home" },
      deployVersion: "v1.0.0",
      appName: "ShopDemo",
    });

    expect(store.countEvents()).toBe(1);
    expect(stored.type).toBe("page_view");
    expect(stored.sessionId).toBe("s1");

    const events = store.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("page_view");
    expect(events[0].route).toBe("/demo");
    expect(events[0].deployVersion).toBe("v1.0.0");
    expect(events[0].data.title).toBe("Demo home");
  });

  test("filters events by type and version", () => {
    store.insertEvent({ type: "error", timestamp: "2026-05-25T18:00:01.000Z", deployVersion: "v1", data: { message: "a" } });
    store.insertEvent({ type: "error", timestamp: "2026-05-25T18:00:02.000Z", deployVersion: "v2", data: { message: "b" } });
    store.insertEvent({ type: "click", timestamp: "2026-05-25T18:00:03.000Z", deployVersion: "v1", data: { target: "btn" } });

    expect(store.getEvents({ type: "error" })).toHaveLength(2);
    expect(store.getEvents({ version: "v1" })).toHaveLength(2);
    expect(store.getEvents({ type: "error", version: "v2" })).toHaveLength(1);
    expect(store.getEvents({ type: "click", version: "v1" })[0].data.target).toBe("btn");
  });

  test("limit caps results to the most recent matches", () => {
    for (let index = 0; index < 5; index += 1) {
      store.insertEvent({
        type: "custom",
        timestamp: new Date(Date.UTC(2026, 4, 25, 18, 0, index)).toISOString(),
        sessionId: "session-" + index,
        data: { seq: index },
      });
    }

    const limited = store.getEvents({ limit: 2 });
    expect(limited).toHaveLength(2);
    expect(limited.map((event) => event.data.seq).sort()).toEqual([3, 4]);
  });

  test("getStats returns counts, eventsByType, and errorsByVersion", () => {
    store.insertEvent({ type: "page_view", timestamp: new Date().toISOString(), sessionId: "s1", data: {} });
    store.insertEvent({ type: "error", timestamp: new Date().toISOString(), sessionId: "s1", deployVersion: "v1.0.0", data: { message: "boom" } });
    store.insertEvent({ type: "error", timestamp: new Date().toISOString(), sessionId: "s2", deployVersion: "v1.1.0", data: { message: "again" } });
    store.insertEvent({
      type: "performance",
      timestamp: new Date().toISOString(),
      sessionId: "s2",
      route: "/demo",
      data: { duration: 320, ttfb: 80 },
    });

    const stats = store.getStats();
    expect(stats.totalEvents).toBe(4);
    expect(stats.totalErrors).toBe(2);
    expect(stats.activeUsers).toBeGreaterThanOrEqual(1);
    expect(stats.eventsByType.error).toBe(2);
    expect(stats.eventsByType.page_view).toBe(1);
    expect(stats.errorsByVersion["v1.0.0"]).toBe(1);
    expect(stats.errorsByVersion["v1.1.0"]).toBe(1);
    expect(stats.latencyByRoute["/demo"].count).toBe(1);
    expect(stats.latencyByRoute["/demo"].avg).toBe(320);
    expect(stats.averageLatency).toBe(320);
  });

  test("pruneOldest enforces a row cap", () => {
    for (let index = 0; index < 6; index += 1) {
      store.insertEvent({
        type: "custom",
        timestamp: new Date(Date.UTC(2026, 4, 25, 18, 0, index)).toISOString(),
        data: { seq: index },
      });
    }
    expect(store.countEvents()).toBe(6);

    const removed = store.pruneOldest(3);
    expect(removed).toBe(3);
    expect(store.countEvents()).toBe(3);

    const remaining = store.getEvents().map((event) => event.data.seq).sort();
    expect(remaining).toEqual([3, 4, 5]);
  });

  test("KNOWN_EVENT_TYPES includes both spec types and SDK-historic types", () => {
    expect(KNOWN_EVENT_TYPES).toEqual(
      expect.arrayContaining([
        "page_view",
        "error",
        "performance",
        "interaction",
        "feedback",
        "custom",
        "pageload",
        "click",
        "login",
      ])
    );
  });

  test("openDatabase ignores ':memory:' and does not require a directory on disk", () => {
    // Smoke-check: this test wouldn't run if openDatabase had broken with the
    // in-memory path; assert the well-known sentinel value still works.
    expect(typeof database.prepare).toBe("function");
    expect(path.isAbsolute(":memory:")).toBe(false);
  });
});
