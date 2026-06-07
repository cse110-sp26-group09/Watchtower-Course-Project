"use strict";

const {
  buildAlertEmail,
  normalizeRecipients,
} = require("../../src/backend/mailer");

describe("Prototype 3 alert mailer helpers", () => {
  test("normalizes recipient arrays and strings", () => {
    expect(normalizeRecipients([" a@example.com ", "", "b@example.com"])).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
    expect(normalizeRecipients("ops@example.com")).toEqual(["ops@example.com"]);
  });

  test("builds a professional alert email with key fields", () => {
    const email = buildAlertEmail({
      count: 5,
      threshold: 5,
      windowMs: 300000,
      route: "/checkout",
      deployVersion: "v1",
      message: "payment failed",
      timestamp: "2026-06-03T12:00:00.000Z",
    });

    expect(email.subject).toBe("WatchTower Alert: Error threshold reached");
    expect(email.html).toContain("WatchTower error threshold reached");
    expect(email.html).toContain("Error count");
    expect(email.html).toContain("/checkout");
    expect(email.html).toContain("payment failed");
  });
});
