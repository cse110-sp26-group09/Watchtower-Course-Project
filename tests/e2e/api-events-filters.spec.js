"use strict";

/**
 * WatchTower end-to-end tests for the `GET /api/events` query filters (F8).
 *
 * These tests exercise the JSON API that prototype 2 (`npm start`) exposes,
 * focusing on the three documented query parameters:
 *   - `type`    -> matches the event `type` field exactly
 *   - `version` -> matches the event `deployVersion` field exactly
 *   - `limit`   -> caps results, returning the most-recent N (default 100)
 *
 * The server keeps events in a single in-memory buffer that is shared across
 * requests (and across these tests). To stay deterministic regardless of any
 * other events already in the buffer, every test queries against a unique
 * `deployVersion` tag (`RUN_TAG`) that this spec seeds in `beforeAll`. That
 * way the assertions only ever see this spec's own events.
 *
 * Like the smoke suite in `watchtower.spec.js`, these tests talk to the API
 * directly through Playwright's `request` context (no browser needed) and
 * rely on `BASE_URL` (default `http://localhost:3000`), matching
 * `playwright.config.js`.
 */

const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/** Unique deploy-version tag so this run's events never collide with others. */
const RUN_TAG = `f8-${Date.now()}`;

/**
 * Build a seed event. `seq` is embedded in `data.seq` so tests can assert on
 * ordering (the server returns the most-recent `limit` events).
 *
 * @param {string} type - Event type (e.g. "error", "pageload").
 * @param {string} route - Route the event is attributed to.
 * @param {number} seq - Insertion order marker (1-based).
 * @returns {Object} A WatchTower event tagged with `RUN_TAG`.
 */
function seedEvent(type, route, seq) {
  const base = {
    type,
    route,
    deployVersion: RUN_TAG,
    sessionId: `f8-session-${seq}`,
    timestamp: new Date(Date.now() + seq).toISOString(),
    data: { seq, source: "f8-filter-spec" },
  };
  if (type === "pageload") {
    base.data.duration = 100 + seq;
  }
  return base;
}

// 5 events, inserted in this order: 3 errors (seq 1,2,4) and 2 pageloads (seq 3,5).
const SEEDED = [
  seedEvent("error", "/checkout", 1),
  seedEvent("error", "/checkout", 2),
  seedEvent("pageload", "/home", 3),
  seedEvent("error", "/cart", 4),
  seedEvent("pageload", "/home", 5),
];

const TOTAL_SEEDED = SEEDED.length; // 5
const ERROR_COUNT = SEEDED.filter((e) => e.type === "error").length; // 3
const PAGELOAD_COUNT = SEEDED.filter((e) => e.type === "pageload").length; // 2

/** Pull the `data.seq` markers out of a list of returned events, in order. */
function seqs(events) {
  return events.map((e) => e && e.data && e.data.seq);
}

test.describe("GET /api/events query filters (F8)", () => {
  /** @type {import('@playwright/test').APIRequestContext} */
  let api;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: BASE_URL });
    const res = await api.post("/api/events", { data: { events: SEEDED } });
    expect(res.ok(), "seed POST /api/events should succeed").toBeTruthy();
    const body = await res.json();
    expect(body.accepted, "server should accept every seeded event").toBe(TOTAL_SEEDED);
  });

  test.afterAll(async () => {
    if (api) {
      await api.dispose();
    }
  });

  test("response is shaped { events: [...] } and is JSON", async () => {
    const res = await api.get("/api/events");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"] || "").toContain("application/json");

    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
  });

  test("version filter returns only events for that deployVersion", async () => {
    const res = await api.get(`/api/events?version=${RUN_TAG}&limit=100`);
    expect(res.ok()).toBeTruthy();

    const { events } = await res.json();
    expect(events).toHaveLength(TOTAL_SEEDED);
    expect(events.every((e) => e.deployVersion === RUN_TAG)).toBe(true);
  });

  test("type filter (scoped by version) returns only that type", async () => {
    const errRes = await api.get(`/api/events?type=error&version=${RUN_TAG}&limit=100`);
    const { events: errors } = await errRes.json();
    expect(errors).toHaveLength(ERROR_COUNT);
    expect(errors.every((e) => e.type === "error")).toBe(true);

    const plRes = await api.get(`/api/events?type=pageload&version=${RUN_TAG}&limit=100`);
    const { events: pageloads } = await plRes.json();
    expect(pageloads).toHaveLength(PAGELOAD_COUNT);
    expect(pageloads.every((e) => e.type === "pageload")).toBe(true);
  });

  test("type filter alone only ever returns events of that type", async () => {
    const res = await api.get("/api/events?type=pageload&limit=100");
    expect(res.ok()).toBeTruthy();

    const { events } = await res.json();
    expect(events.every((e) => e.type === "pageload")).toBe(true);
  });

  test("a type with no matches returns an empty list (scoped by version)", async () => {
    const res = await api.get(`/api/events?type=does-not-exist&version=${RUN_TAG}`);
    expect(res.ok()).toBeTruthy();

    const { events } = await res.json();
    expect(events).toEqual([]);
  });

  test("limit caps results and returns the MOST RECENT matches", async () => {
    const res = await api.get(`/api/events?version=${RUN_TAG}&limit=2`);
    expect(res.ok()).toBeTruthy();

    const { events } = await res.json();
    expect(events).toHaveLength(2);
    // slice(-2) of insertion order [1,2,3,4,5] -> the last two appended: 4 then 5.
    expect(seqs(events)).toEqual([4, 5]);
  });

  test("limit larger than the match count returns all matches", async () => {
    const res = await api.get(`/api/events?version=${RUN_TAG}&limit=999`);
    const { events } = await res.json();
    expect(events).toHaveLength(TOTAL_SEEDED);
  });

  test("a non-matching version returns an empty list", async () => {
    const res = await api.get(`/api/events?version=${RUN_TAG}-no-such-version`);
    expect(res.ok()).toBeTruthy();

    const { events } = await res.json();
    expect(events).toEqual([]);
  });

  test("invalid or zero limit falls back to the default (does not return empty)", async () => {
    const nan = await api.get(`/api/events?version=${RUN_TAG}&limit=not-a-number`);
    expect((await nan.json()).events).toHaveLength(TOTAL_SEEDED);

    const zero = await api.get(`/api/events?version=${RUN_TAG}&limit=0`);
    expect((await zero.json()).events).toHaveLength(TOTAL_SEEDED);
  });
});