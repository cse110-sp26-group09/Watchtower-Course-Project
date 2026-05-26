"use strict";

/**
 * Prototype 1 SQLite end-to-end verification.
 *
 * This spec is the runnable counterpart of the manual verification flow
 * documented in `docs/architecture/event-storage.md`. It boots its own
 * Prototype 1 server in-process, against a temporary SQLite database
 * file, then exercises:
 *
 *   1. `GET /api/health` reports `storage: "sqlite"`.
 *   2. `POST /api/events` accepts SDK-shaped (camelCase) and
 *      external-shaped (snake_case) events and persists them.
 *   3. `GET /api/events` returns the stored events in dashboard-friendly
 *      shape and supports `type` / `version` / `limit` filters.
 *   4. `GET /api/stats` reflects the events that were stored.
 *   5. The Prototype 1 demo page (`/demo`) is served by the same server
 *      and exposes the local-test panel buttons.
 *
 * The spec sets `BASE_URL` for itself so it does not collide with the
 * default prototype 2 server on port 3000 used by the other suites.
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const { test, expect } = require("@playwright/test");

const PROTOTYPE_1_PORT = process.env.PROTOTYPE_1_PORT
  ? Number(process.env.PROTOTYPE_1_PORT)
  : 3110;
const BASE_URL = "http://localhost:" + PROTOTYPE_1_PORT;

let serverModule;
let tempDatabasePath;

test.describe("Prototype 1 SQLite event flow (local validation)", () => {
  test.beforeAll(async () => {
    tempDatabasePath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "wt-p1-")),
      "watchtower.sqlite"
    );

    process.env.PORT = String(PROTOTYPE_1_PORT);
    process.env.WATCHTOWER_P1_DB = tempDatabasePath;

    delete require.cache[require.resolve("../../src/prototype_1/server/event-store")];
    delete require.cache[require.resolve("../../src/prototype_1/server/server")];
    serverModule = require("../../src/prototype_1/server/server");

    await new Promise((resolve, reject) => {
      serverModule.server.once("listening", resolve);
      serverModule.server.once("error", reject);
      serverModule.server.listen(PROTOTYPE_1_PORT);
    });
  });

  test.afterAll(async () => {
    if (serverModule && serverModule.server.listening) {
      await new Promise((resolve) => serverModule.server.close(resolve));
    }
    if (serverModule && serverModule.database) {
      try {
        serverModule.database.close();
      } catch (_error) {
        // already closed
      }
    }
    if (tempDatabasePath && fs.existsSync(tempDatabasePath)) {
      try {
        fs.rmSync(path.dirname(tempDatabasePath), { recursive: true, force: true });
      } catch (_error) {
        // best-effort cleanup
      }
    }
  });

  test("GET /api/health reports sqlite storage", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const response = await api.get("/api/health");
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.status).toBe("ok");
      expect(body.storage).toBe("sqlite");
      expect(body.databasePath).toContain("watchtower.sqlite");
      expect(Array.isArray(body.knownEventTypes)).toBe(true);
      expect(body.knownEventTypes).toEqual(
        expect.arrayContaining(["page_view", "error", "performance", "interaction", "feedback", "custom"])
      );
    } finally {
      await api.dispose();
    }
  });

  test("POST /api/events accepts SDK camelCase batches and persists them", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const tag = "p1-sqlite-" + Date.now();
      const payload = {
        events: [
          {
            type: "page_view",
            timestamp: new Date().toISOString(),
            sessionId: tag + "-session",
            deployVersion: tag,
            appName: "p1-spec",
            url: "http://localhost/demo",
            route: "/demo",
            data: { title: "Demo home", referrer: "" },
          },
          {
            type: "performance",
            timestamp: new Date().toISOString(),
            sessionId: tag + "-session",
            deployVersion: tag,
            route: "/demo",
            data: { duration: 412, ttfb: 80 },
          },
          {
            type: "error",
            timestamp: new Date().toISOString(),
            sessionId: tag + "-session",
            deployVersion: tag,
            data: { message: tag + " sdk boom", source: "spec", line: 1, col: 1 },
          },
        ],
      };

      const postResponse = await api.post("/api/events", { data: payload });
      expect(postResponse.ok()).toBeTruthy();
      const postBody = await postResponse.json();
      expect(postBody.accepted).toBe(3);
      expect(postBody.rejected).toBe(0);

      const filteredResponse = await api.get("/api/events?version=" + tag + "&limit=10");
      expect(filteredResponse.ok()).toBeTruthy();
      const filtered = await filteredResponse.json();
      expect(filtered.events).toHaveLength(3);
      expect(filtered.events.every((event) => event.deployVersion === tag)).toBe(true);
      expect(filtered.events.every((event) => event.app_version === tag)).toBe(true);

      const errorsOnly = await api
        .get("/api/events?type=error&version=" + tag)
        .then((response) => response.json());
      expect(errorsOnly.events).toHaveLength(1);
      expect(errorsOnly.events[0].data.message).toBe(tag + " sdk boom");
      expect(errorsOnly.events[0].severity).toBe("critical");
    } finally {
      await api.dispose();
    }
  });

  test("POST /api/events accepts external snake_case fields", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const tag = "p1-ext-" + Date.now();
      const externalEvent = {
        id: tag + "-id",
        type: "interaction",
        timestamp: new Date().toISOString(),
        source: "ext-script",
        session_id: tag + "-session",
        page_url: "https://example.com/demo",
        message: "external click",
        severity: "info",
        app_version: tag,
        metadata: { trace_id: "abc-123" },
      };

      const postResponse = await api.post("/api/events", { data: externalEvent });
      expect(postResponse.ok()).toBeTruthy();
      const postBody = await postResponse.json();
      expect(postBody.accepted).toBe(1);

      const events = await api
        .get("/api/events?version=" + tag)
        .then((response) => response.json());
      expect(events.events).toHaveLength(1);
      expect(events.events[0].sessionId).toBe(tag + "-session");
      expect(events.events[0].pageUrl).toBe("https://example.com/demo");
      expect(events.events[0].message).toBe("external click");
      expect(events.events[0].severity).toBe("info");
      expect(events.events[0].metadata.trace_id).toBe("abc-123");
    } finally {
      await api.dispose();
    }
  });

  test("POST /api/events rejects invalid envelopes without crashing", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const response = await api.post("/api/events", {
        data: { events: [{ type: "" }, { type: "valid", timestamp: new Date().toISOString() }] },
      });
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.accepted).toBe(1);
      expect(body.rejected).toBe(1);
    } finally {
      await api.dispose();
    }
  });

  test("GET /api/stats reflects stored events", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const tag = "p1-stats-" + Date.now();
      await api.post("/api/events", {
        data: {
          events: [
            { type: "error", timestamp: new Date().toISOString(), deployVersion: tag, sessionId: tag + "-1", data: { message: "stats boom" } },
            { type: "performance", timestamp: new Date().toISOString(), deployVersion: tag, sessionId: tag + "-1", route: "/demo", data: { duration: 250, ttfb: 60 } },
          ],
        },
      });

      const statsResponse = await api.get("/api/stats");
      expect(statsResponse.ok()).toBeTruthy();
      const stats = await statsResponse.json();

      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByVersion).toHaveProperty(tag);
      expect(stats.eventsByType).toHaveProperty("error");
      expect(stats.latencyByRoute).toHaveProperty("/demo");
      expect(stats.latencyByRoute["/demo"].count).toBeGreaterThan(0);
      expect(typeof stats.averageLatency).toBe("number");
    } finally {
      await api.dispose();
    }
  });

  test("the Prototype 1 demo page is served at /demo with the local test panel", async ({ page }) => {
    await page.goto(BASE_URL + "/demo");
    await expect(page).toHaveTitle(/ShopDemo/i);
    await expect(page.locator("nav .brand")).toContainText(/ShopDemo/i);
    await expect(page.locator("#app")).toBeVisible();
    await expect(page.locator("#local-test-buttons")).toBeVisible();
    await expect(page.locator('[data-test-action="send-test-event"]')).toBeVisible();
    await expect(page.locator('[data-test-action="trigger-test-error"]')).toBeVisible();
    await expect(page.locator('[data-test-action="send-performance-event"]')).toBeVisible();
    await expect(page.locator('[data-test-action="send-feedback-event"]')).toBeVisible();
  });
});
