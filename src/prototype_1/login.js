(function () {
  "use strict";

  const form = document.getElementById("login-form");
  const status = document.getElementById("form-status");
  const passwordInput = document.getElementById("password");
  const passwordToggle = document.getElementById("toggle-password");
  const googleLoginButton = document.getElementById("google-login");
  const dialogButtons = document.querySelectorAll("[data-dialog-target]");
  const dialogCloseButtons = document.querySelectorAll("[data-dialog-close]");

  function closeDialog(dialog) {
    if (!dialog) {
      return;
    }

    dialog.close();
  }

  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener("click", function () {
      const shouldShowPassword = passwordInput.type === "password";
      passwordInput.type = shouldShowPassword ? "text" : "password";
      passwordToggle.setAttribute("aria-label", shouldShowPassword ? "Hide password" : "Show password");
      passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
      passwordToggle.setAttribute("title", shouldShowPassword ? "Hide password" : "Show password");
      passwordToggle.classList.toggle("is-visible", shouldShowPassword);
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      try {
        localStorage.setItem("watchtower_login_demo", "signed-in");
      } catch (error) {
        void error;
        // Some browser modes disable local storage; the demo can still continue.
      }

      if (status) {
        status.textContent = "Signed in. Opening the dashboard...";
      }

      window.setTimeout(function () {
        window.location.href = "/dashboard";
      }, 450);
    });
  }

  if (googleLoginButton) {
    googleLoginButton.addEventListener("click", function () {
      if (status) {
        status.textContent = "Google sign-in is a prototype action for now.";
      }
    });
  }

  dialogButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const dialog = document.getElementById(button.dataset.dialogTarget);

      if (dialog) {
        dialog.showModal();
      }
    });
  });

  dialogCloseButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      closeDialog(button.closest("dialog"));
    });
  });

  document.querySelectorAll(".info-dialog").forEach(function (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        closeDialog(dialog);
      }
    });
  });
})();
