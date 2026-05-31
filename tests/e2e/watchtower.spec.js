"use strict";

/**
 * WatchTower end-to-end smoke tests for Prototype 3.
 *
 * Targets the server started by `npm start` (src/prototype_3/server/server.js):
 *   - Public landing page at /landing/
 *   - Clerk-guarded dashboard at /dashboard
 *   - Monitored ShopDemo at /demo/
 *   - JSON API at /api/*
 */

const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Stub a signed-in Clerk session so the dashboard auth guard reveals the shell.
 *
 * The guard reads `window.CLERK_PUBLISHABLE_KEY` from the page-served
 * `clerk-config.js`, which CI regenerates with an empty key (no secret on CI).
 * We intercept that request to inject a valid publishable key, and stub
 * `window.Clerk` so the guard's `loadClerk` short-circuits to a signed-in user
 * without ever hitting Clerk's CDN.
 */
async function stubSignedInClerk(page) {
  await page.route("**/clerk-config.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'window.CLERK_PUBLISHABLE_KEY = "pk_test_ZW5kLXRvLWVuZC10ZXN0JA";',
    })
  );

  await page.addInitScript(() => {
    window.Clerk = {
      user: {
        primaryEmailAddress: { emailAddress: "e2e@watchtower.test" },
        firstName: "E2E",
        lastName: "Tester",
      },
      load: () => Promise.resolve(),
      addListener: () => {},
      signOut: () => Promise.resolve(),
    };
  });
}

test.describe("WatchTower landing page", () => {
  test("landing page loads with WatchTower branding and primary CTA", async ({ page }) => {
    await page.goto("/landing/");

    await expect(page).toHaveTitle(/WatchTower/i);
    await expect(page.locator(".brand-label")).toContainText(/WatchTower/i);
    await expect(page.getByRole("heading", { name: /WatchTower/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Get Started/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /View dashboard demo/i }).first()).toBeVisible();
  });
});

test.describe("WatchTower dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await stubSignedInClerk(page);
  });

  test("dashboard home view loads with KPI tiles and sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveTitle(/WatchTower/i);
    await expect(page.locator(".brand-label")).toContainText(/WatchTower/i);

    await expect(page.locator("#active-users")).toBeVisible();
    await expect(page.locator("#total-events")).toBeVisible();
    await expect(page.locator("#total-errors")).toBeVisible();
    await expect(page.locator("#home-view")).toBeVisible();

    await expect(page.locator('.sidebar button[data-view="home"]')).toBeVisible();
    await expect(page.locator('.sidebar button[data-view="analytics"]')).toBeVisible();
    await expect(page.locator('.sidebar button[data-view="issues"]')).toBeVisible();
  });

  test("clicking Analytics in the sidebar reveals the analytics view", async ({ page }) => {
    await page.goto("/dashboard");

    await page.locator('.sidebar button[data-view="analytics"]').click();

    await expect(page.locator("#analytics-view")).toBeVisible();
    await expect(page.locator("#analytics-title")).toContainText(/Analytics/i);
  });

  test("clicking Issues in the sidebar reveals the triage queue", async ({ page }) => {
    await page.goto("/dashboard");

    await page.locator('.sidebar button[data-view="issues"]').click();

    await expect(page.locator("#issues-view")).toBeVisible();
    await expect(page.locator("#issues-page-title")).toContainText(/Triage/i);
  });
});

test.describe("WatchTower ShopDemo (/demo/)", () => {
  test("demo page loads with ShopDemo brand and version picker", async ({ page }) => {
    await page.goto("/demo/");

    await expect(page).toHaveTitle(/ShopDemo/i);
    await expect(page.locator("nav .brand")).toContainText(/ShopDemo/i);
    await expect(page.locator("#app")).toBeAttached();
    await expect(page.locator("#version-select")).toBeVisible();
    await expect(page.locator("nav .nav-links a", { hasText: /Home/i })).toBeVisible();
  });

  test("demo SPA renders the home view when opened directly", async ({ page }) => {
    await page.goto("/demo/index.html");

    await expect(page).toHaveTitle(/ShopDemo/i);
    await expect(page.locator("nav .brand")).toContainText(/ShopDemo/i);
    await expect(page.locator("#app h2")).toContainText(/Monitored test surface/i);
  });
});

test.describe("WatchTower JSON API", () => {
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

  test("POST /api/events accepts a batch and GET /api/events returns it", async ({ playwright }) => {
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

      const getRes = await api.get("/api/events");
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

  test("POST /api/events surfaces an error event through GET /api/stats", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const payload = {
        events: [
          {
            type: "error",
            timestamp: new Date().toISOString(),
            sessionId: "playwright-error-session",
            deployVersion: "playwright-v0",
            route: "/playwright",
            data: { message: "boom from playwright", source: "spec", line: 1, col: 1 },
          },
        ],
      };

      const postRes = await api.post("/api/events", { data: payload });
      expect(postRes.ok()).toBeTruthy();

      const statsRes = await api.get("/api/stats");
      expect(statsRes.ok()).toBeTruthy();
      const stats = await statsRes.json();

      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByVersion).toHaveProperty("playwright-v0");
    } finally {
      await api.dispose();
    }
  });
});
