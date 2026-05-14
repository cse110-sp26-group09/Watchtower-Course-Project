"use strict";

const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("WatchTower smoke tests", () => {
  test("dashboard page loads with the WatchTower title and key panels", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/WatchTower/i);

    await expect(page.locator("#active-users")).toBeVisible();
    await expect(page.locator("#total-events")).toBeVisible();
    await expect(page.locator("#total-errors")).toBeVisible();
    await expect(page.locator("#error-feed")).toBeAttached();
    await expect(page.locator("#activity-feed")).toBeAttached();
  });

  test("demo page loads with navigation and the app container", async ({ page }) => {
    await page.goto("/demo");

    await expect(page).toHaveTitle(/ShopDemo|WatchTower/i);
    await expect(page.locator("nav .brand")).toContainText(/ShopDemo/i);
    await expect(page.locator("#app")).toBeVisible();
  });

  test("GET /api/stats returns JSON with the documented shape", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const res = await api.get("/api/stats");
      expect(res.ok()).toBeTruthy();

      const contentType = res.headers()["content-type"] || "";
      expect(contentType).toContain("application/json");

      const body = await res.json();
      expect(body).toEqual(
        expect.objectContaining({
          activeUsers: expect.any(Number),
          totalEvents: expect.any(Number),
          totalErrors: expect.any(Number),
          errorsByVersion: expect.any(Object),
          latencyByRoute: expect.any(Object),
          recentErrors: expect.any(Array),
        })
      );
    } finally {
      await api.dispose();
    }
  });

  test("POST /api/events accepts a test event and GET /api/events returns it", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const payload = {
        events: [
          {
            type: "custom",
            timestamp: new Date().toISOString(),
            sessionId: "playwright-smoke-session",
            deployVersion: "test",
            route: "/playwright",
            data: { source: "playwright-smoke" },
          },
        ],
      };

      const postRes = await api.post("/api/events", { data: payload });
      expect(postRes.ok()).toBeTruthy();
      const postBody = await postRes.json();
      expect(postBody.accepted).toBe(1);

      const getRes = await api.get("/api/events?type=custom&limit=20");
      expect(getRes.ok()).toBeTruthy();
      const getBody = await getRes.json();
      expect(Array.isArray(getBody.events)).toBe(true);

      const found = getBody.events.some(
        (ev) => ev && ev.data && ev.data.source === "playwright-smoke"
      );
      expect(found).toBe(true);
    } finally {
      await api.dispose();
    }
  });
});
