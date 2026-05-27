(function () {
  "use strict";

  let overlay = document.querySelector(".modal-overlay");
  let snippetCode = document.getElementById("snippet-code");
  /**
   * Sets the open state of the overlay.
   * @param {boolean} isOpen - Whether the overlay should be open.
   * @returns {void}
   */
  function setOverlayOpen(isOpen) {
    if (!overlay) return;
    overlay.hidden = !isOpen;
    document.body.style.overflow = isOpen ? "hidden" : "";
  }
  /**
   * Opens the code snippet overlay and focuses the close button.
   * @returns {void}
   */
  function openSnippet() {
    setOverlayOpen(true);
    let closeButton = overlay && overlay.querySelector("[data-action='close-snippet']");
    if (closeButton) closeButton.focus();
  }
  /**
   * Closes the code snippet overlay and restores body scroll.
   * @returns {void}
   */
  function closeSnippet() {
    setOverlayOpen(false);
  }

  /**
   * Copies the text content of the code snippet to the clipboard.
   * @param {HTMLElement} button - The button element that triggered the copy action.
   * @returns {void}
   */ 
  function copySnippet(button) {
    if (!snippetCode) return;
    let textValue = snippetCode.textContent || "";
    /**
     * Sets the text content of the button.
     * @param {string} label - The label to set on the button.
     * @returns {void}
     */
    function setButtonState(label) {
      if (!button) return;
      button.textContent = label;
      window.setTimeout(function () {
        button.textContent = "Copy";
      }, 1200);
    }

    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(textValue)
        .then(function () {
          setButtonState("Copied");
        })
        .catch(function () {
          setButtonState("Copy failed");
        });
      return;
    }

    try {
      let textArea = document.createElement("textarea");
      textArea.value = textValue;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setButtonState("Copied");
    } catch (_error) {
      setButtonState("Copy failed");
    }
  }
  /**
   * Redirects the user to the login page.
   * @returns {void}
   */
  function goLogin() {
    window.location.href = "../Log-In-Page/login.html";
  }

  document.addEventListener("click", function (event) {
    let target = event.target;
    if (!(target instanceof Element)) return;

    let actionElement = target.closest("[data-action]");
    if (!actionElement) return;
    let actionName = actionElement.getAttribute("data-action");

    if (actionName === "open-snippet") {
      openSnippet();
      return;
    }

    if (actionName === "close-snippet") {
      closeSnippet();
      return;
    }

    if (actionName === "copy-snippet") {
      copySnippet(actionElement);
      return;
    }

    if (actionName === "go-login") {
      goLogin();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!overlay || overlay.hidden) return;
    closeSnippet();
  });

  if (overlay) {
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeSnippet();
    });
  }
})();
