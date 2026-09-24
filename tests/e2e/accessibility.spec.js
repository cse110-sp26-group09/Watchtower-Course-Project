"use strict";

const { test, expect } = require("@playwright/test");

test("landing privacy dialog traps focus and restores its trigger", async ({ page }) => {
  await page.goto("/landing/");
  const trigger = page.locator("[data-action='open-privacy']");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Privacy Policy" });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close privacy policy" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("login privacy dialog returns focus to its trigger", async ({ page }) => {
  await page.goto("/login/");
  const trigger = page.locator("[data-action='open-privacy']");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Privacy Policy" });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close privacy policy" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
