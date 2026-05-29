(function () {
  "use strict";

  const overlay = document.querySelector(".modal-overlay");
  const snippetCode = document.getElementById("snippet-code");
  const stickyCta = document.querySelector(".sticky-cta");

  /**
   * Sets the open state of the overlay.
   * @param {boolean} isOpen - Whether the overlay should be open.
   */
  function setOverlayOpen(isOpen) {
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
    setOverlayOpen(true);
    const closeButton = overlay?.querySelector("[data-action='close-snippet']");
    if (closeButton) {
      closeButton.focus();
    }
  }

  /**
   * Closes the code snippet overlay and restores body scroll.
   */
  function closeSnippet() {
    setOverlayOpen(false);
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
    const inPrototypeServer = window.location.port === "3000" && !window.location.pathname.includes("/src/");
    window.location.href = inPrototypeServer ? "/login" : "../Log-In-Page/login.html";
  }

  function updateDashboardLinks() {
    const inPrototypeServer = window.location.port === "3000" && !window.location.pathname.includes("/src/");
    const hrefValue = inPrototypeServer ? "/dashboard" : "../prototype_3/index.html";
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
    }
  });

  // Keyboard Accessibility
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && overlay && !overlay.hidden) {
      closeSnippet();
    }
  });

  // Backdrop Click to Close
  if (overlay) {
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        closeSnippet();
      }
    });
  }

  updateDashboardLinks();
  updateStickyCta();
  window.addEventListener("scroll", updateStickyCta, { passive: true });
  window.addEventListener("resize", updateStickyCta);
})();
