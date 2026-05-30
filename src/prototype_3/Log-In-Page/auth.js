/**
 * WatchTower Auth — Clerk integration for the login / signup shell.
 *
 * Responsibilities:
 *   - Read the frontend-safe publishable key from `window.CLERK_PUBLISHABLE_KEY`
 *     (set in clerk-config.js, loaded before this file).
 *   - Lazily load Clerk's browser SDK from the CDN that matches the key.
 *   - Mount Clerk's hosted Sign In component into  #clerk-sign-in (login.html).
 *   - Mount Clerk's hosted Sign Up component into  #clerk-sign-up (signup.html).
 *   - Redirect signed-in users to the protected Prototype 1 dashboard.
 *
 * Security notes:
 *   - Only the PUBLISHABLE key is used here. Never reference a Clerk secret key.
 *   - WatchTower does not collect, transmit, or store passwords. Clerk owns the
 *     full credential lifecycle (sign-in, sign-up, sessions, password reset).
 *
 * No build step, framework, or extra dependency is required.
 */
(() => {
  "use strict";

  // Resolve absolute URLs so redirects work under file:// and http(s):// alike.
  const DASHBOARD_URL = new URL("../prototype_1/index.html", window.location.href).href;
  const SIGN_IN_URL = new URL("./login.html", window.location.href).href;
  const SIGN_UP_URL = new URL("./signup.html", window.location.href).href;

  const signInContainer = document.getElementById("clerk-sign-in");
  const signUpContainer = document.getElementById("clerk-sign-up");
  const forgotForm = document.getElementById("forgot-form");

  /**
   * Show a message in the page's status banner, falling back to the console.
   * @param {string} type - Banner style: "info" | "success" | "error".
   * @param {string} message - Human-readable message.
   * @returns {void}
   */
  function showBanner(type, message) {
    const banner = document.getElementById("status-banner");
    if (banner) {
      banner.className = "status-banner " + type;
      banner.textContent = message;
    } else if (type === "error") {
      console.error("[watchtower-auth] " + message);
    } else {
      console.warn("[watchtower-auth] " + message);
    }
  }

  // ─── Pages without a Clerk container ──────────────────────────────────────
  // The legacy forgot-password page still ships a (passwordless) email form.
  // Clerk handles password resets inside its own Sign In flow, so we simply
  // point users there instead of pretending to send a reset email.
  if (!signInContainer && !signUpContainer) {
    if (forgotForm) {
      forgotForm.addEventListener("submit", (event) => {
        event.preventDefault();
        showBanner(
          "info",
          "Password resets are handled on the sign-in page. Use \"Forgot password?\" inside the sign-in box."
        );
      });
    }
    return;
  }

  /**
   * Derive the Clerk Frontend API host from a publishable key.
   * The host is base64-encoded into the key after the pk_test_/pk_live_ prefix
   * and ends with a "$" sentinel (e.g. "your-app.clerk.accounts.dev$").
   * @param {string} key - Clerk publishable key.
   * @returns {string|null} Frontend API host, or null if it cannot be decoded.
   */
  function frontendApiFromKey(key) {
    const encoded = key.replace(/^pk_(test|live)_/, "");
    try {
      return atob(encoded).replace(/\$+$/, "") || null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Load and initialize Clerk's browser SDK using the publishable key.
   * @param {string} key - Clerk publishable key.
   * @returns {Promise<object>} Resolves with the initialized global Clerk instance.
   */
  function loadClerk(key) {
    return new Promise((resolve, reject) => {
      if (window.Clerk) {
        window.Clerk.load().then(() => resolve(window.Clerk)).catch(reject);
        return;
      }
      const frontendApi = frontendApiFromKey(key);
      if (!frontendApi) {
        reject(new Error("Could not derive Clerk Frontend API from publishable key."));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://" + frontendApi + "/npm/@clerk/clerk-js@5/dist/clerk.browser.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.setAttribute("data-clerk-publishable-key", key);
      script.addEventListener("load", () => {
        if (!window.Clerk) {
          reject(new Error("Clerk SDK loaded but window.Clerk is undefined."));
          return;
        }
        window.Clerk.load().then(() => resolve(window.Clerk)).catch(reject);
      });
      script.addEventListener("error", () =>
        reject(new Error("Failed to load the Clerk SDK from the CDN."))
      );
      document.head.appendChild(script);
    });
  }

  // ─── Validate config ──────────────────────────────────────────────────────
  const publishableKey = window.CLERK_PUBLISHABLE_KEY;
  if (
    !publishableKey ||
    !/^pk_(test|live)_/.test(publishableKey) ||
    publishableKey.includes("REPLACE_ME")
  ) {
    showBanner(
      "error",
      "Authentication is not configured yet. Set CLERK_PUBLISHABLE_KEY in .env and run npm run config:clerk."
    );
    return;
  }

  // ─── Bootstrap Clerk and mount the right component ────────────────────────
  loadClerk(publishableKey)
    .then((clerk) => {
      // Already signed in? Skip the form and go straight to the dashboard.
      if (clerk.user) {
        window.location.replace(DASHBOARD_URL);
        return;
      }

      if (signInContainer) {
        clerk.mountSignIn(signInContainer, {
          signUpUrl: SIGN_UP_URL,
          forceRedirectUrl: DASHBOARD_URL,
          fallbackRedirectUrl: DASHBOARD_URL,
        });
      }

      if (signUpContainer) {
        clerk.mountSignUp(signUpContainer, {
          signInUrl: SIGN_IN_URL,
          forceRedirectUrl: DASHBOARD_URL,
          fallbackRedirectUrl: DASHBOARD_URL,
        });
      }

      // Safety net: if a session becomes active without a full-page redirect,
      // send the user to the protected dashboard.
      clerk.addListener((payload) => {
        if (payload && payload.user) {
          window.location.replace(DASHBOARD_URL);
        }
      });
    })
    .catch((error) => {
      console.error("[watchtower-auth] Clerk initialization failed:", error);
      showBanner("error", "Could not load the sign-in experience. Please try again later.");
    });
})();
