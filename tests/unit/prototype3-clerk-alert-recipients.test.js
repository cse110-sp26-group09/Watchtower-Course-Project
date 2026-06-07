"use strict";

const {
  getClerkAlertRecipients,
} = require("../../src/backend/clerk-alert-recipients");

describe("Prototype 3 alert recipients", () => {
  test("returns no active recipients while Clerk delivery is deferred", async () => {
    await expect(getClerkAlertRecipients()).resolves.toEqual([]);
  });
});
