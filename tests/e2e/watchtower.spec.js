"use strict";

const { test, expect } = require("@playwright/test");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CANDIDATE_1_URL = "file:///" + path
  .resolve(__dirname, "../../src/candidate_1/index.html")
  .replace(/\\/g, "/");

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

  test("candidate dashboard keeps sidebar route state in sync with Back and Home", async ({ page }) => {
    await page.goto(CANDIDATE_1_URL);

    await page.locator(".sidebar [data-view='analytics']").click();
    await expect(page).toHaveURL(/#analytics$/);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.locator(".sidebar [data-view='analytics']")).toHaveAttribute("aria-current", "page");

    await page.locator(".sidebar [data-view='settings']").click();
    await expect(page).toHaveURL(/#settings$/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/#analytics$/);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

    await page.locator("#analytics-view").getByRole("button", { name: "Home" }).click();
    await expect(page).toHaveURL(/#home$/);
    await expect(page.getByRole("heading", { name: "Production health" })).toBeVisible();
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
