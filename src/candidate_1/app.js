(function () {
  "use strict";

  var availableViewNames = ["home", "analytics", "settings"];
  var viewToggleElements = document.querySelectorAll("[data-view]");
  var timeRangeButtons = document.querySelectorAll(".segmented-control button");
  var settingsAccordionButtons = document.querySelectorAll(".settings-trigger");
  var assignmentDropdowns = document.querySelectorAll(".assign-control select");
  var highContrastToggle = document.getElementById("contrast-toggle");
  var textSizeSlider = document.getElementById("text-size");

  /**
   * Show the selected WatchTower view and update every matching
   * navigation control to reflect the current selection.
   *
   * @param {string} selectedViewName - The target view id prefix.
   * @returns {void}
   */
  function activateView(selectedViewName) {
    if (availableViewNames.indexOf(selectedViewName) === -1) return;

    availableViewNames.forEach(function (viewName) {
      var targetViewPanel = document.getElementById(viewName + "-view");
      var isActiveView = viewName === selectedViewName;
      if (!targetViewPanel) return;
      targetViewPanel.hidden = !isActiveView;
      targetViewPanel.classList.toggle("active", isActiveView);
    });

    viewToggleElements.forEach(function (viewToggleElement) {
      viewToggleElement.classList.toggle("active", viewToggleElement.getAttribute("data-view") === selectedViewName);
    });

    document.title = "WatchTower - " + selectedViewName.charAt(0).toUpperCase() + selectedViewName.slice(1);
    window.location.hash = selectedViewName;
  }

  /**
   * Attach click handlers for desktop and mobile navigation controls.
   *
   * @returns {void}
   */
  function initializeViewNavigation() {
    viewToggleElements.forEach(function (viewToggleElement) {
      viewToggleElement.addEventListener("click", function (event) {
        var selectedViewName = viewToggleElement.getAttribute("data-view");
        if (viewToggleElement.tagName === "A") event.preventDefault();
        activateView(selectedViewName);
      });
    });
  }

  /**
   * Keep the analytics time-range control visually in sync with the
   * button the user most recently selected.
   *
   * @returns {void}
   */
  function initializeTimeRangeButtons() {
    timeRangeButtons.forEach(function (timeRangeButton) {
      timeRangeButton.addEventListener("click", function () {
        timeRangeButtons.forEach(function (buttonElement) {
          buttonElement.classList.toggle("active", buttonElement === timeRangeButton);
        });
      });
    });
  }

  /**
   * Collapse every settings section so only the clicked accordion panel
   * remains open.
   *
   * @returns {void}
   */
  function initializeSettingsAccordions() {
    settingsAccordionButtons.forEach(function (accordionButton) {
      accordionButton.addEventListener("click", function () {
        var parentSettingsSection = accordionButton.closest(".settings-section");
        var shouldOpenSection = !parentSettingsSection.classList.contains("open");

        document.querySelectorAll(".settings-section").forEach(function (settingsSection) {
          var sectionButton = settingsSection.querySelector(".settings-trigger");
          settingsSection.classList.remove("open");
          if (sectionButton) sectionButton.setAttribute("aria-expanded", "false");
        });

        parentSettingsSection.classList.toggle("open", shouldOpenSection);
        accordionButton.setAttribute("aria-expanded", String(shouldOpenSection));
      });
    });
  }

  /**
   * Mark an issue heading after the user assigns ownership from the
   * triage dropdown.
   *
   * @returns {void}
   */
  function initializeAssignmentDropdowns() {
    assignmentDropdowns.forEach(function (assignmentDropdown) {
      assignmentDropdown.addEventListener("change", function () {
        var parentIssueRow = assignmentDropdown.closest(".issue-row");
        var issueHeading = parentIssueRow ? parentIssueRow.querySelector("h3") : null;
        if (!issueHeading) return;
        issueHeading.textContent = issueHeading.textContent.replace(/\s+\(assigned\)$/i, "") + " (assigned)";
      });
    });
  }

  /**
   * Enable the accessibility high-contrast body class when the related
   * settings toggle changes.
   *
   * @returns {void}
   */
  function initializeContrastToggle() {
    if (!highContrastToggle) return;

    highContrastToggle.addEventListener("change", function () {
      document.body.classList.toggle("high-contrast", highContrastToggle.checked);
    });
  }

  /**
   * Apply the text-size preference classes driven by the accessibility
   * range input.
   *
   * @returns {void}
   */
  function initializeTextSizeSlider() {
    if (!textSizeSlider) return;

    textSizeSlider.addEventListener("input", function () {
      document.body.classList.remove("text-compact", "text-large");
      if (textSizeSlider.value === "0") document.body.classList.add("text-compact");
      if (textSizeSlider.value === "2") document.body.classList.add("text-large");
    });
  }

  /**
   * Boot the static frontend by wiring all interactive controls and
   * restoring the initial hash-based view when available.
   *
   * @returns {void}
   */
  function initializeWatchTowerFrontend() {
    var initialHashViewName = window.location.hash.replace("#", "");

    initializeViewNavigation();
    initializeTimeRangeButtons();
    initializeSettingsAccordions();
    initializeAssignmentDropdowns();
    initializeContrastToggle();
    initializeTextSizeSlider();
    activateView(availableViewNames.indexOf(initialHashViewName) === -1 ? "home" : initialHashViewName);
  }

  initializeWatchTowerFrontend();
})();
