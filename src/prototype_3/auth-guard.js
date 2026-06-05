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
      return window.atob(encoded).replace(/\$+$/, "") || null;
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

  function userPrimaryEmail(user) {
    if (!user) return "";
    if (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) {
      return user.primaryEmailAddress.emailAddress;
    }
    if (Array.isArray(user.emailAddresses) && user.emailAddresses.length > 0) {
      return user.emailAddresses[0].emailAddress || "";
    }
    return "";
  }

  function registerAlertRecipient(user) {
    const email = userPrimaryEmail(user);
    if (!email) return;

    fetch("/api/alert-recipient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      keepalive: true,
    }).catch((error) => {
      console.error("[auth-guard] Failed to register alert recipient:", error);
    });
  }

  const PROFILE_NAME_KEY_PREFIX = "watchtower_profile_";
  /**
   * Build the headers used to authenticate dashboard API calls.
   *
   * Sends a verifiable Clerk session token as `Authorization: Bearer <jwt>` so
   * the backend can verify it and derive the user id from the signed `sub`
   * claim. The `X-Clerk-User-Id` header is included only as a fallback for
   * environments where backend verification is not configured (the backend
   * ignores it when verification is enforced).
   *
   * @returns {Promise<Object<string,string>>} Header map (empty when signed out).
   */
  async function getClerkUserHeaders() {
    const headers = {};
    const user = window.Clerk && window.Clerk.user;
    if (!user || !user.id) return headers;
    headers["X-Clerk-User-Id"] = user.id;
    try {
      const session = window.Clerk.session;
      const token = session && typeof session.getToken === "function" ? await session.getToken() : null;
      if (token) headers["Authorization"] = "Bearer " + token;
    } catch (_error) {
      // No session token available (e.g. stubbed Clerk in tests); fall back to
      // the id header only.
    }
    return headers;
  }

  /**
   * Persist the Clerk user id (same-origin) so the monitored ShopDemo SDK can
   * stamp the events it generates with the signed-in user, letting them appear
   * on this user's scoped dashboard. Cleared on sign-out.
   * @param {object} user - Clerk user resource.
   * @returns {void}
   */
  function persistClerkUserId(user) {
    try {
      if (user && user.id) {
        localStorage.setItem("watchtower_clerk_user_id", user.id);
      }
    } catch (_error) {}
  }

  /**
   * Upsert the signed-in Clerk user into the WatchTower app_users table so the
   * backend can scope events/stats to this Clerk user id. Fire-and-forget.
   * @param {object} user - Clerk user resource.
   * @returns {void}
   */
  function syncCurrentUser(user) {
    if (!user || !user.id) return;

    getClerkUserHeaders()
      .then((authHeaders) => {
        // Include the stored timezone so the server-side user record stays in
        // sync with the browser preference without requiring a separate API call.
        let storedTimezoneIdentifier = "";
        try {
          storedTimezoneIdentifier = localStorage.getItem("watchtower_timezone") || "";
        } catch (_storageError) {}

        return fetch("/api/users/sync", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, authHeaders),
          body: JSON.stringify({
            clerkUserId: user.id,
            email: (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) || "",
            displayName: user.fullName || user.username || "",
            timezone: storedTimezoneIdentifier,
          }),
          keepalive: true,
        });
      })
      .catch((error) => {
        console.error("[auth-guard] Failed to sync user:", error);
      });
  }

  // Expose the header helper so dashboard scripts can reuse it if needed.
  window.getClerkUserHeaders = getClerkUserHeaders;

  function userDisplayName(user) {
    if (!user) return "";
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return fullName || user.username || (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) || "";
  }

  function userInitials(user) {
    if (!user) return "";
    const firstName = (user.firstName || "").trim();
    const lastName = (user.lastName || "").trim();
    if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
    if (firstName) return firstName.slice(0, 2).toUpperCase();
    const primaryEmail = userPrimaryEmail(user);
    return primaryEmail ? primaryEmail[0].toUpperCase() : "";
  }

  function resolveProfileDisplayName(user) {
    const userScopedKey = PROFILE_NAME_KEY_PREFIX + user.id;
    try {
      const storedCustomName = localStorage.getItem(userScopedKey);
      if (storedCustomName) return storedCustomName;
    } catch (_e) {}
    return userDisplayName(user);
  }

  /**
   * Publish user identity for the dashboard UI and wire logout controls.
   * Dispatches "watchtower:user-ready" so app.js can populate profile fields
   * without auth-guard needing to know the DOM structure.
   * @param {object} clerk - Initialized Clerk instance.
   * @returns {void}
   */
  function wireUi(clerk) {
    const resolvedDisplayName = resolveProfileDisplayName(clerk.user);
    const resolvedInitials = userInitials(clerk.user);
    const profileStorageKey = PROFILE_NAME_KEY_PREFIX + clerk.user.id;

    window.WatchTowerCurrentUser = {
      userId: clerk.user.id,
      displayName: resolvedDisplayName,
      initials: resolvedInitials,
      profileStorageKey: profileStorageKey
    };

    onReady(() => {
      const authUserLabel = document.getElementById("auth-user-label");
      if (authUserLabel) {
        authUserLabel.textContent = userLabel(clerk.user);
      }

      document.dispatchEvent(new window.CustomEvent("watchtower:user-ready", {
        detail: window.WatchTowerCurrentUser
      }));

      const signOut = (event) => {
        if (event) {
          event.preventDefault();
        }
        try {
          localStorage.removeItem("watchtower_clerk_user_id");
        } catch (_error) {}
        clerk
          .signOut()
          .then(() => window.location.replace(LOGIN_URL))
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
      registerAlertRecipient(clerk.user);
      persistClerkUserId(clerk.user);
      // Ensure an app_users row exists before the dashboard issues scoped
      // API calls so a first-time user is recognized immediately.
      syncCurrentUser(clerk.user);

      // If the session ends in another tab, bounce back to login.
      clerk.addListener((payload) => {
        if (!payload.user) {
          redirectToLogin();
          return;
        }
        registerAlertRecipient(payload.user);
        persistClerkUserId(payload.user);
        syncCurrentUser(payload.user);
      });
    })
    .catch((error) => {
      console.error("[auth-guard] Clerk failed to load; redirecting to login:", error);
      redirectToLogin();
    });
})();
