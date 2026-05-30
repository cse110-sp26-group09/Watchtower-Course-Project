/**
 * WatchTower Prototype 3 - Client-side Clerk route guard.
 *
 * Responsibilities:
 *   - Read the frontend-safe publishable key from `window.CLERK_PUBLISHABLE_KEY`
 *     (set in ./Log-In-Page/clerk-config.js, loaded before this file).
 *   - Lazily load Clerk's browser SDK and wait for it to finish loading.
 *   - Redirect anonymous visitors to the login page (fail closed).
 *   - For signed-in users: reveal the dashboard, surface basic user info, and
 *     wire the logout controls to Clerk's signOut().
 *
 * IMPORTANT - prototype limitation:
 *   This is *client-side* protection only. It hides the UI from anonymous users
 *   but does NOT secure the backend. The Prototype 3 event API (/api/events,
 *   /api/stats, /api/developer/*, ...) remains open and is intentionally
 *   untouched here. A production build MUST verify Clerk session tokens on the
 *   server for every protected route. SDK event ingestion is a separate concern
 *   and should authenticate with an app/project key, not a dashboard user login.
 *
 * Security notes:
 *   - Only the PUBLISHABLE key is used here. Never reference a Clerk secret key.
 *   - WatchTower stores no passwords; Clerk owns the credential lifecycle.
 */
(() => {
  "use strict";

  const LOGIN_URL = new URL("./Log-In-Page/login.html", window.location.href).href;
  const LANDING_URL = new URL("./Landing-Page/index.html", window.location.href).href;

  // Hide the protected shell immediately so signed-out users never see content
  // flash before the redirect resolves. Removed once the session is verified.
  const guardStyle = document.createElement("style");
  guardStyle.id = "wt-auth-guard-style";
  guardStyle.textContent = ".app-shell{visibility:hidden!important}";
  (document.head || document.documentElement).appendChild(guardStyle);

  /**
   * Reveal the dashboard shell by removing the guard's hide-style.
   * @returns {void}
   */
  function revealApp() {
    const style = document.getElementById("wt-auth-guard-style");
    if (style) {
      style.remove();
    }
  }

  /**
   * Run a callback once the DOM is ready (or immediately if it already is).
   * @param {Function} callback - Function to invoke when the DOM is ready.
   * @returns {void}
   */
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  /**
   * Send anonymous visitors to the login page.
   * @returns {void}
   */
  function redirectToLogin() {
    window.location.replace(LOGIN_URL);
  }

  /**
   * Derive the Clerk Frontend API host from a publishable key.
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

  /**
   * Best-effort, human-friendly label for the signed-in user.
   * @param {object} user - Clerk user resource.
   * @returns {string} Display label (email, username, name, or a fallback).
   */
  function userLabel(user) {
    if (!user) {
      return "Signed in";
    }
    const email = user.primaryEmailAddress && user.primaryEmailAddress.emailAddress;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return email || user.username || name || "Signed in";
  }

  /**
   * Populate the optional user label and wire all logout controls.
   * @param {object} clerk - Initialized Clerk instance.
   * @returns {void}
   */
  function wireUi(clerk) {
    onReady(() => {
      const label = document.getElementById("auth-user-label");
      if (label) {
        label.textContent = userLabel(clerk.user);
      }

      const signOut = (event) => {
        if (event) {
          event.preventDefault();
        }
        clerk
          .signOut()
          .then(() => window.location.replace(LANDING_URL))
          .catch((error) => console.error("[auth-guard] Sign out failed:", error));
      };

      // Topbar logout control plus the existing Settings "Sign out" button.
      const logoutButton = document.getElementById("logout-button");
      if (logoutButton) {
        logoutButton.addEventListener("click", signOut);
      }
      const settingsSignOut = document.getElementById("sign-out-button");
      if (settingsSignOut) {
        settingsSignOut.addEventListener("click", signOut);
      }
    });
  }

  // Validate config.
  const publishableKey = window.CLERK_PUBLISHABLE_KEY;
  if (
    !publishableKey ||
    !/^pk_(test|live)_/.test(publishableKey) ||
    publishableKey.includes("REPLACE_ME")
  ) {
    console.warn(
      "[auth-guard] Missing Clerk publishable key. Redirecting to login. " +
        "Ensure ./Log-In-Page/clerk-config.js is served before auth-guard.js."
    );
    redirectToLogin();
    return;
  }

  // Enforce the session.
  loadClerk(publishableKey)
    .then((clerk) => {
      if (!clerk.user) {
        redirectToLogin();
        return;
      }
      revealApp();
      wireUi(clerk);

      // If the session ends in another tab, bounce back to login.
      clerk.addListener((payload) => {
        if (!payload.user) {
          redirectToLogin();
        }
      });
    })
    .catch((error) => {
      console.error("[auth-guard] Clerk failed to load; redirecting to login:", error);
      redirectToLogin();
    });
})();
