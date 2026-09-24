"use strict";

const { test, expect } = require("@playwright/test");

test("unauthenticated requests cannot use account or private event routes", async ({ request }) => {
  const sync = await request.post("/api/users/sync", {
    data: { clerkUserId: "someone-else", email: "spoof@example.test" },
  });
  expect(sync.status()).toBe(401);

  const flags = await request.post("/api/developer/feature-flags/evaluate", {
    data: { userId: "someone-else" },
  });
  expect(flags.status()).toBe(401);

  const stream = await request.get("/api/events/stream");
  expect(stream.status()).toBe(404);
});

test("ingestion rejects malformed and oversized requests", async ({ request }) => {
  const malformed = await request.post("/api/events", {
    data: Buffer.from("{broken"),
    headers: { "Content-Type": "application/json" },
  });
  expect(malformed.status()).toBe(400);
  expect(await malformed.json()).toEqual({ error: "Invalid JSON body" });

  const oversized = await request.post("/api/events", {
    data: JSON.stringify({ events: [], padding: "x".repeat(1024 * 1024) }),
    headers: { "Content-Type": "application/json" },
  });
  expect(oversized.status()).toBe(413);

  const template = { type: "custom", timestamp: new Date().toISOString(), data: {} };
  const batch = await request.post("/api/events", { data: { events: Array(101).fill(template) } });
  expect(batch.status()).toBe(413);
});

test("responses set security headers and do not allow arbitrary origins", async ({ request }) => {
  const result = await request.get("/api/events", {
    headers: { Origin: "https://untrusted.example" },
  });
  expect(result.status()).toBe(401);
  expect(result.headers()["access-control-allow-origin"]).toBeUndefined();
  expect(result.headers()["x-content-type-options"]).toBe("nosniff");
  expect(result.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("the signed-in owner overrides IDs supplied in request bodies", async ({ request }) => {
  const owner = `owner-${Date.now()}`;
  const headers = { "X-Clerk-User-Id": owner };
  const sync = await request.post("/api/users/sync", {
    headers,
    data: { clerkUserId: "victim", email: "owner@example.test" },
  });
  expect(sync.status()).toBe(200);
  expect((await sync.json()).user.clerkUserId).toBe(owner);

  const marker = `owner-test-${Date.now()}`;
  const ingested = await request.post("/api/events", {
    headers,
    data: { type: "custom", timestamp: new Date().toISOString(), data: { marker }, userId: "victim" },
  });
  expect(ingested.status()).toBe(200);

  const events = await request.get("/api/events", { headers });
  const matching = (await events.json()).events.filter((event) => event.data.marker === marker);
  expect(matching).toHaveLength(1);
  expect(matching[0].userId).toBe(owner);
});

test("developer query has a bounded per-user rate", async ({ request }) => {
  const headers = { "X-Clerk-User-Id": `query-limit-${Date.now()}` };
  for (let i = 0; i < 60; i++) {
    const result = await request.post("/api/developer/query", {
      headers,
      data: { query: "select type from events limit 1" },
    });
    expect(result.status()).toBe(200);
  }
  const limited = await request.post("/api/developer/query", {
    headers,
    data: { query: "select type from events limit 1" },
  });
  expect(limited.status()).toBe(429);
  expect(limited.headers()["retry-after"]).toBe("60");
});
