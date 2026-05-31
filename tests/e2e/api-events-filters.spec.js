"use strict";

/**
 * Prototype 3 API tests for event listing and developer stream filters.
 *
 * `GET /api/events` returns the most recent stored events (up to 100).
 * `GET /api/developer/stream` supports session, search, limit, and cursor
 * parameters for the developer event inspector.
 */

const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/** Unique session prefix so this file's events stay isolated in the shared buffer. */
const RUN_TAG = `p3-stream-${Date.now()}`;

function seedEvent(type, route, seq) {
  const base = {
    type,
    route,
    sessionId: `${RUN_TAG}-session-${seq}`,
    timestamp: new Date(Date.now() + seq * 1000).toISOString(),
    data: { seq, source: "p3-stream-spec" },
  };
  if (type === "pageload") {
    base.data.duration = 100 + seq;
  }
  return base;
}

const SEEDED = [
  seedEvent("error", "/checkout", 1),
  seedEvent("error", "/checkout", 2),
  seedEvent("pageload", "/home", 3),
  seedEvent("error", "/cart", 4),
  seedEvent("pageload", "/home", 5),
];

const TOTAL_SEEDED = SEEDED.length;
const ERROR_COUNT = SEEDED.filter((e) => e.type === "error").length;
const PAGELOAD_COUNT = SEEDED.filter((e) => e.type === "pageload").length;

function seqs(events) {
  return events.map((e) => e && e.data && e.data.seq);
}

function streamUrl(query) {
  return `/api/developer/stream?session=${encodeURIComponent(RUN_TAG)}&${query}`;
}

test.describe.configure({ mode: "serial" });

test.describe("Prototype 3 event APIs", () => {
  let api;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: BASE_URL });
    const res = await api.post("/api/events", { data: { events: SEEDED } });
    expect(res.ok(), "seed POST /api/events should succeed").toBeTruthy();
    const body = await res.json();
    expect(body.accepted).toBe(TOTAL_SEEDED);
  });

  test.afterAll(async () => {
    if (api) await api.dispose();
  });

  test("GET /api/events response is shaped { events: [...] } and is JSON", async () => {
    const res = await api.get("/api/events");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"] || "").toContain("application/json");
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
  });

  test("GET /api/events includes seeded events after POST", async () => {
    const res = await api.get("/api/events");
    const { events } = await res.json();
    const tagged = events.filter((e) => e.sessionId && e.sessionId.indexOf(RUN_TAG) === 0);
    expect(tagged.length).toBeGreaterThanOrEqual(TOTAL_SEEDED);
  });

  test("GET /api/developer/stream response includes pagination fields", async () => {
    const res = await api.get(streamUrl("limit=100"));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        cursor: expect.any(Number),
        events: expect.any(Array),
      })
    );
  });

  test("session filter returns only this spec's seeded events", async () => {
    const res = await api.get(streamUrl("limit=100"));
    const { events, total } = await res.json();
    expect(total).toBe(TOTAL_SEEDED);
    expect(events).toHaveLength(TOTAL_SEEDED);
    expect(events.every((e) => e.sessionId.indexOf(RUN_TAG) === 0)).toBe(true);
  });

  test("search filter narrows results by event type text", async () => {
    const markerRes = await api.get(streamUrl("limit=100"));
    const { events: marked } = await markerRes.json();
    const errors = marked.filter((e) => e.type === "error");
    const pageloads = marked.filter((e) => e.type === "pageload");
    expect(errors.length).toBe(ERROR_COUNT);
    expect(pageloads.length).toBe(PAGELOAD_COUNT);
  });

  test("session filter with a non-matching prefix returns an empty page", async () => {
    const res = await api.get(
      `/api/developer/stream?session=${encodeURIComponent(RUN_TAG)}-missing&limit=100`
    );
    const { events, total } = await res.json();
    expect(total).toBe(0);
    expect(events).toEqual([]);
  });

  test("limit caps results and returns the most recent matches first", async () => {
    const res = await api.get(streamUrl("limit=2"));
    const { events } = await res.json();
    expect(events).toHaveLength(2);
    expect(seqs(events)).toEqual([5, 4]);
  });

  test("limit larger than the match count returns all matches", async () => {
    const res = await api.get(streamUrl("limit=999"));
    const { events, total } = await res.json();
    expect(total).toBe(TOTAL_SEEDED);
    expect(events).toHaveLength(TOTAL_SEEDED);
  });

  test("cursor paginates through the result set", async () => {
    const first = await api.get(streamUrl("limit=2&cursor=0"));
    const firstBody = await first.json();
    expect(firstBody.events).toHaveLength(2);
    expect(firstBody.nextCursor).toBe(2);

    const second = await api.get(streamUrl(`limit=2&cursor=${firstBody.nextCursor}`));
    const secondBody = await second.json();
    expect(secondBody.events).toHaveLength(2);
    expect(seqs(secondBody.events)).toEqual([3, 2]);
  });

  test("invalid limit falls back to the default stream page size", async () => {
    const res = await api.get(streamUrl("limit=not-a-number"));
    expect(res.ok()).toBeTruthy();
    const { events, total } = await res.json();
    expect(total).toBe(TOTAL_SEEDED);
    expect(events.length).toBeGreaterThan(0);
  });
});
