(function () {
  "use strict";

  var viewNames = ["home", "analytics", "settings"];
  var viewButtons = document.querySelectorAll("[data-view]");
  var segmentedButtons = document.querySelectorAll(".segmented-control button");
  var settingsTriggers = document.querySelectorAll(".settings-trigger");
  var contrastToggle = document.getElementById("contrast-toggle");
  var textSize = document.getElementById("text-size");

  function setActiveView(viewName) {
    if (viewNames.indexOf(viewName) === -1) return;

    viewNames.forEach(function (name) {
      var view = document.getElementById(name + "-view");
      var isActive = name === viewName;
      if (!view) return;
      view.hidden = !isActive;
      view.classList.toggle("active", isActive);
    });

    viewButtons.forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-view") === viewName);
    });

    document.title = "WatchTower - " + viewName.charAt(0).toUpperCase() + viewName.slice(1);
    window.location.hash = viewName;
  }

  viewButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      var viewName = button.getAttribute("data-view");
      if (button.tagName === "A") event.preventDefault();
      setActiveView(viewName);
    });
  });

  segmentedButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      segmentedButtons.forEach(function (item) {
        item.classList.toggle("active", item === button);
      });
    });
  });

  settingsTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var section = trigger.closest(".settings-section");
      var shouldOpen = !section.classList.contains("open");

      document.querySelectorAll(".settings-section").forEach(function (item) {
        var itemTrigger = item.querySelector(".settings-trigger");
        item.classList.remove("open");
        if (itemTrigger) itemTrigger.setAttribute("aria-expanded", "false");
      });

      section.classList.toggle("open", shouldOpen);
      trigger.setAttribute("aria-expanded", String(shouldOpen));
    });
  });

  document.querySelectorAll(".assign-control select").forEach(function (select) {
    select.addEventListener("change", function () {
      var issue = select.closest(".issue-row");
      var title = issue ? issue.querySelector("h3") : null;
      if (!title) return;
      title.textContent = title.textContent.replace(/\s+\(assigned\)$/i, "") + " (assigned)";
    });
  });

  if (contrastToggle) {
    contrastToggle.addEventListener("change", function () {
      document.body.classList.toggle("high-contrast", contrastToggle.checked);
    });
  }

  if (textSize) {
    textSize.addEventListener("input", function () {
      document.body.classList.remove("text-compact", "text-large");
      if (textSize.value === "0") document.body.classList.add("text-compact");
      if (textSize.value === "2") document.body.classList.add("text-large");
    });
  }

  var initialView = window.location.hash.replace("#", "");
  setActiveView(viewNames.indexOf(initialView) === -1 ? "home" : initialView);
})();
