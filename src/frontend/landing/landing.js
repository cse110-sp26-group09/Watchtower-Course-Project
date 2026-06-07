(function () {
  "use strict";

  const snippetOverlay = document.querySelector("[data-modal='snippet']");
  const privacyOverlay = document.querySelector("[data-modal='privacy']");
  const termsOverlay = document.querySelector("[data-modal='terms']");
  const snippetCode = document.getElementById("snippet-code");
  const stickyCta = document.querySelector(".sticky-cta");
  const workflowTabs = Array.from(document.querySelectorAll("[data-workflow-tab]"));
  const workflowPanels = Array.from(document.querySelectorAll("[data-workflow-panel]"));
  const audienceTabs = Array.from(document.querySelectorAll("[data-audience-tab]"));
  const audiencePanels = Array.from(document.querySelectorAll("[data-audience-panel]"));

  /**
   * Switches the workflow walkthrough to the requested step.
   * @param {string} stepName - The workflow step to display.
   */
  function activateWorkflowStep(stepName) {
    workflowTabs.forEach(function (tab) {
      const isActive = tab.getAttribute("data-workflow-tab") === stepName;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    workflowPanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-workflow-panel") !== stepName;
    });
  }

  /**
   * Switches the role-based showcase to the requested audience.
   * @param {string} audienceName - The audience showcase to display.
   */
  function activateAudience(audienceName) {
    audienceTabs.forEach(function (tab) {
      const isActive = tab.getAttribute("data-audience-tab") === audienceName;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    audiencePanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-audience-panel") !== audienceName;
    });
  }

  /**
   * Sets the open state of the overlay.
   * @param {HTMLElement|null} overlay - Overlay element to update.
   * @param {boolean} isOpen - Whether the overlay should be open.
   */
  function setOverlayOpen(overlay, isOpen) {
    if (!overlay) {
      return;
    }
    overlay.hidden = !isOpen;
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  /**
   * Opens the code snippet overlay and focuses the close button.
   */
  function openSnippet() {
    setOverlayOpen(snippetOverlay, true);
    const closeButton = snippetOverlay?.querySelector("[data-action='close-snippet']");
    if (closeButton) {
      closeButton.focus();
    }
  }

  /**
   * Closes the code snippet overlay and restores body scroll.
   */
  function closeSnippet() {
    setOverlayOpen(snippetOverlay, false);
  }

  /**
   * Replaces any stale privacy modal body with the current full policy copy.
   */
  function renderPrivacyPolicy() {
    const body = privacyOverlay?.querySelector(".privacy-policy-body");
    if (!body) {
      return;
    }

    body.innerHTML = [
      '<p class="modal-copy">WatchTower is a lightweight observability platform that helps development teams monitor application behavior, diagnose errors, understand performance issues, and review user feedback through a real-time dashboard.</p>',
      '<section class="privacy-section"><h3>Scope</h3><p>This policy applies to the WatchTower website, dashboard, SDK, APIs, demos, documentation, and related services. WatchTower may process account and service data from dashboard users, plus customer telemetry data submitted through the SDK or API by monitored applications.</p></section>',
      '<section class="privacy-section"><h3>Information You Provide</h3><p>We may collect account details, authentication identifiers, alert recipient email addresses, dashboard preferences, support messages, feedback, project names, environment settings, deployment labels, and alert configuration values.</p></section>',
      '<section class="privacy-section"><h3>Telemetry Collected Through WatchTower</h3><p>Customer applications may send JavaScript errors, stack traces, performance metrics, route timing, clicks, navigation events, custom events, login or logout events, feature usage, session IDs, anonymous identifiers, configured user IDs, browser context, SDK version, environment, deployment version, feedback ratings, feedback messages, ingestion latency, and event validation details.</p></section>',
      '<section class="privacy-section"><h3>What Should Not Be Sent</h3><p>WatchTower is designed for observability and debugging, not for storing highly sensitive information. Customers should avoid sending passwords, payment card numbers, government ID numbers, health records, secret keys, or other sensitive data unless it is necessary, lawful, and protected by appropriate safeguards.</p></section>',
      '<section class="privacy-section"><h3>How We Use Information</h3><p>We use information to create and authenticate accounts, provide dashboard access, receive and display telemetry, show error feeds and performance charts, build session timelines, send operational alerts, support filtering and querying, maintain preferences, debug WatchTower, improve reliability, and protect against unauthorized access or abuse.</p></section>',
      '<section class="privacy-section"><h3>How We Share Information</h3><p>We do not sell personal information in the ordinary sense of the word. We may share information with service providers that help operate WatchTower, including authentication, database, hosting, email delivery, analytics, monitoring, testing, cloud infrastructure, storage, logging, and security providers. Customer telemetry may be visible to authorized users of the customer project or environment.</p></section>',
      '<section class="privacy-section"><h3>Customer Responsibilities</h3><p>Customers control what telemetry their applications send to WatchTower. Customers are responsible for providing privacy notices to their own users, obtaining any required consent or legal basis, reviewing custom event payloads, honoring applicable access or deletion requests, and securing API keys, SDK configuration, and access credentials.</p></section>',
      '<section class="privacy-section"><h3>Cookies and Browser Storage</h3><p>WatchTower may use cookies, local storage, session storage, and similar technologies to keep users signed in, maintain secure sessions, remember dashboard preferences, generate or maintain session identifiers, improve reliability, and support diagnostics. The SDK may use sessionStorage to group events into a browser-tab session timeline.</p></section>',
      '<section class="privacy-section"><h3>Data Retention and Security</h3><p>We retain personal information only as long as reasonably necessary for the purposes described in this policy, unless a longer period is required or permitted by law. We use reasonable safeguards such as authentication, session verification, user-scoped dashboard access, token-based authorization, database access controls, secure transport where deployed over HTTPS, input validation, and event schema checks.</p></section>',
      '<section class="privacy-section"><h3>Your Privacy Choices</h3><p>Depending on where you live, you may have rights to access, correct, delete, restrict, or object to processing of personal information, request portability, withdraw consent where processing is based on consent, or opt out of certain communications. If your information was collected through a customer application, you may need to contact that customer directly.</p></section>',
      '<section class="privacy-section"><h3>Children, Transfers, and Third Parties</h3><p>WatchTower is intended for developers, teams, and organizations, and is not directed to children under 13. Information may be processed in the United States or other countries where WatchTower or its service providers operate. The Services may rely on third-party providers such as Clerk, Supabase, Google services, email delivery providers, and infrastructure vendors, each subject to their own privacy practices.</p></section>',
      '<section class="privacy-section"><h3>Contact</h3><p>Questions or requests about this policy can be sent to the WatchTower Privacy Team at privacy@watchtower.example. This policy is a strong project-ready draft, but it should be reviewed before being treated as production legal coverage.</p></section>',
    ].join("");
  }

  /**
   * Opens the privacy policy overlay and focuses the close button.
   */
  function openPrivacy() {
    renderPrivacyPolicy();
    setOverlayOpen(privacyOverlay, true);
    const closeButton = privacyOverlay?.querySelector("[data-action='close-privacy']");
    if (closeButton) {
      closeButton.focus();
    }
  }

  /**
   * Closes the privacy policy overlay and restores body scroll.
   */
  function closePrivacy() {
    setOverlayOpen(privacyOverlay, false);
  }

  /**
   * Opens the terms and conditions overlay and focuses the close button.
   */
  function openTerms() {
    setOverlayOpen(termsOverlay, true);
    const closeButton = termsOverlay?.querySelector("[data-action='close-terms']");
    if (closeButton) {
      closeButton.focus();
    }
  }

  /**
   * Closes the terms and conditions overlay and restores body scroll.
   */
  function closeTerms() {
    setOverlayOpen(termsOverlay, false);
  }

  /**
   * Shows the mobile sticky CTA after the hero is mostly out of view.
   */
  function updateStickyCta() {
    if (!stickyCta) {
      return;
    }
    const shouldShow = window.scrollY > window.innerHeight * 0.65;
    stickyCta.classList.toggle("visible", shouldShow);
    stickyCta.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  }

  /**
   * Copies the text content of the code snippet to the clipboard.
   * @param {HTMLElement} button - The button element that triggered the copy action.
   */ 
  function copySnippet(button) {
    if (!snippetCode) {
      return; 
    }
    
    const textValue = snippetCode.textContent || "";

    /**
     * Sets the text content of the button temporarily.
     * @param {string} label - The label to set on the button.
     */
    function setButtonState(label) {
      if (!button) {
        return;
      }
      button.textContent = label;
      window.setTimeout(function () {
        button.textContent = "Copy";
      }, 1200);
    }

    // Modern Clipboard API
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(textValue)
        .then(() => {
          setButtonState("Copied");
        })
        .catch(() => {
          setButtonState("Copy failed");
        });
      return;
    }

    // Legacy Fallback
    try {
      const textArea = document.createElement("textarea");
      textArea.value = textValue;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      
      if (!success) {
        throw new Error();
      }
      setButtonState("Copied");
    } catch {
      setButtonState("Copy failed");
    }
  }

  /**
   * Redirects the user to the login page.
   */
  function goLogin() {
    const servedByServer = window.location.protocol !== "file:";
    window.location.href = servedByServer ? "/login" : "../auth/login.html";
  }

  function updateDashboardLinks() {
    const servedByServer = window.location.protocol !== "file:";
    const hrefValue = servedByServer ? "/dashboard-demo/" : "../dashboard-demo/index.html";
    document.querySelectorAll(".dashboard-demo-link").forEach(function (linkElement) {
      linkElement.setAttribute("href", hrefValue);
    });
  }

  // Global Event Delegation
  document.addEventListener("click", function (event) {
    const target = event.target;
    // FIXED: Safely referenced Element via window namespace to bypass no-undef limits
    if (!(target instanceof window.Element)) {
      return;
    }

    const workflowTab = target.closest("[data-workflow-tab]");
    if (workflowTab) {
      activateWorkflowStep(workflowTab.getAttribute("data-workflow-tab") || "");
      return;
    }

    const audienceTab = target.closest("[data-audience-tab]");
    if (audienceTab) {
      activateAudience(audienceTab.getAttribute("data-audience-tab") || "");
      return;
    }

    const actionElement = target.closest("[data-action]");
    if (!actionElement) {
      return;
    }
    
    const actionName = actionElement.getAttribute("data-action");

    switch (actionName) {
      case "open-snippet":
        openSnippet();
        break;
      case "close-snippet":
        closeSnippet();
        break;
      case "copy-snippet":
        copySnippet(actionElement);
        break;
      case "go-login":
        goLogin();
        break;
      case "open-privacy":
        openPrivacy();
        break;
      case "close-privacy":
        closePrivacy();
        break;
      case "open-terms":
        openTerms();
        break;
      case "close-terms":
        closeTerms();
        break;
    }
  });

  // Keyboard Accessibility
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && snippetOverlay && !snippetOverlay.hidden) {
      closeSnippet();
    }
    if (event.key === "Escape" && privacyOverlay && !privacyOverlay.hidden) {
      closePrivacy();
    }
    if (event.key === "Escape" && termsOverlay && !termsOverlay.hidden) {
      closeTerms();
    }
  });

  // Backdrop Click to Close
  if (snippetOverlay) {
    snippetOverlay.addEventListener("click", function (event) {
      if (event.target === snippetOverlay) {
        closeSnippet();
      }
    });
  }

  if (privacyOverlay) {
    privacyOverlay.addEventListener("click", function (event) {
      if (event.target === privacyOverlay) {
        closePrivacy();
      }
    });
  }

  if (termsOverlay) {
    termsOverlay.addEventListener("click", function (event) {
      if (event.target === termsOverlay) {
        closeTerms();
      }
    });
  }

  updateDashboardLinks();
  workflowTabs.forEach(function (tab, index) {
    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + workflowTabs.length) % workflowTabs.length;
      const nextTab = workflowTabs[nextIndex];
      activateWorkflowStep(nextTab.getAttribute("data-workflow-tab") || "");
      nextTab.focus();
    });
  });

  audienceTabs.forEach(function (tab, index) {
    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + audienceTabs.length) % audienceTabs.length;
      const nextTab = audienceTabs[nextIndex];
      activateAudience(nextTab.getAttribute("data-audience-tab") || "");
      nextTab.focus();
    });
  });

  updateStickyCta();
  window.addEventListener("scroll", updateStickyCta, { passive: true });
  window.addEventListener("resize", updateStickyCta);
})();
