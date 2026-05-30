"use strict";

/**
 * Generate src/Log-In-Page/clerk-config.js from CLERK_PUBLISHABLE_KEY.
 *
 * Reads the key from process.env (Render, CI, shell) or from a local .env file.
 * The generated file is gitignored — only this script and .env.example are committed.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "src", "Log-In-Page", "clerk-config.js");

/**
 * Load KEY=VALUE pairs from a .env file without overwriting existing env vars.
 * @param {string} envPath - Absolute path to the .env file.
 * @returns {void}
 */
function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(REPO_ROOT, ".env"));

const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || "";
const content =
  "/**\n" +
  " * Clerk frontend configuration for WatchTower.\n" +
  " *\n" +
  " * AUTO-GENERATED — do not edit by hand.\n" +
  " * Run `npm run config:clerk` (or any start script) to regenerate from\n" +
  " * CLERK_PUBLISHABLE_KEY in your environment or .env file.\n" +
  " *\n" +
  " * Only the Clerk publishable key belongs in frontend code.\n" +
  " * Do NOT place the Clerk secret key in this file or anywhere in the frontend.\n" +
  " */\n\n" +
  "window.CLERK_PUBLISHABLE_KEY = " +
  JSON.stringify(publishableKey) +
  ";\n";

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, content, "utf8");

if (!/^pk_(test|live)_/.test(publishableKey)) {
  console.warn(
    "[config:clerk] CLERK_PUBLISHABLE_KEY is missing or invalid. " +
      "Copy .env.example to .env and set your Clerk publishable key, " +
      "or add CLERK_PUBLISHABLE_KEY in Render environment settings."
  );
} else {
  console.log("[config:clerk] Wrote src/Log-In-Page/clerk-config.js");
}
