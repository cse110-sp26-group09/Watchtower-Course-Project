(() => {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const heading = document.getElementById("auth-heading");
  const cta = document.getElementById("primary-cta");
  const fullName = document.getElementById("fullName");
  const fullNameLabel = document.querySelector("label[for='fullName']");
  const themeToggle = document.getElementById("theme-toggle");
  const body = document.body;
  const savedTheme = window.localStorage.getItem("wt-auth-theme");

  const applyTheme = (theme) => {
    body.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    window.localStorage.setItem("wt-auth-theme", theme);
  };

  const syncMode = (mode) => {
    const signup = mode === "signup";
    tabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
    });
    heading.textContent = signup ? "Create your account" : "Welcome back";
    cta.textContent = signup ? "Create account (static)" : "Log in (static)";
    fullNameLabel.style.opacity = signup ? "1" : "0.5";
    fullName.disabled = !signup;
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => syncMode(tab.dataset.mode));
  });

  themeToggle.addEventListener("click", () => {
    const nextTheme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });

  applyTheme(savedTheme === "light" ? "light" : "dark");
  syncMode("login");
})();

