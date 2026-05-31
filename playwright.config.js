"use strict";

/**
 * Minimal Playwright configuration for the WatchTower end-to-end tests.
 *
 * The CI workflow starts the Prototype 3 WatchTower server separately (so
 * the same config works locally and on CI), which is why we do not declare
 * a `webServer` block here. Tests rely on `BASE_URL` if set, otherwise
 * default to `http://localhost:3000`.
 */
module.exports = {
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    headless: true,
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
  },
};
