(function () {
  "use strict";

  const overlay = document.querySelector(".modal-overlay");
  const snippetCode = document.getElementById("snippet-code");

  /**
   * Sets the open state of the overlay.
   * @param {boolean} isOpen - Whether the overlay should be open.
   */
  function setOverlayOpen(isOpen) {
    if (!overlay) return;
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
   * Copies the text content of the code snippet to the clipboard.
   * @param {Element} button - The button element that triggered the copy action.
   */ 
  function copySnippet(button) {
    if (!snippetCode) return; 
    
    const textValue = snippetCode.textContent || "";

    /**
     * Sets the text content of the button temporarily.
     * @param {string} label - The label to set on the button.
     */
    function setButtonState(label) {
      if (!button) return;
      button.textContent = label;
      window.setTimeout(function () {
        button.textContent = "Copy";
      }, 1200);
    }

    // Modern Clipboard API
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(textValue)
        .then(() => setButtonState("Copied"))
        .catch(() => setButtonState("Copy failed"));
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
      
      if (!success) throw new Error();
      setButtonState("Copied");
    } catch (_error) {
      setButtonState("Copy failed");
    }
  }

  /**
   * Redirects the user to the login page.
   */
  function goLogin() {
    window.location.href = "../Log-In-Page/login.html";
  }

  // Global Event Delegation
  document.addEventListener("click", function (event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionElement = target.closest("[data-action]");
    if (!actionElement) return;
    
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
})();