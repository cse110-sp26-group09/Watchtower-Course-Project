(() => {
  const body = document.body;
  const themeToggle = document.getElementById("theme-toggle");
  const modal = document.getElementById("zoom-modal");
  const modalImage = document.getElementById("zoom-image");
  const modalCaption = document.getElementById("zoom-caption");
  const closeModalButton = document.getElementById("close-modal");
  const galleryImages = Array.from(document.querySelectorAll(".shot img"));
  const savedTheme = window.localStorage.getItem("wt-landing-theme");

  const applyTheme = (theme) => {
    body.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    window.localStorage.setItem("wt-landing-theme", theme);
  };

  applyTheme(savedTheme === "dark" ? "dark" : "light");

  themeToggle.addEventListener("click", () => {
    const nextTheme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });

  galleryImages.forEach((imageElement) => {
    imageElement.addEventListener("click", () => {
      modalImage.src = imageElement.src;
      modalImage.alt = imageElement.alt;
      modalCaption.textContent = imageElement.dataset.caption || imageElement.alt;
      modal.showModal();
    });

    imageElement.addEventListener("error", () => {
      imageElement.style.objectFit = "contain";
      imageElement.style.padding = "16px";
      imageElement.style.background = "rgba(127, 148, 160, 0.16)";
      imageElement.alt = "Canva image placeholder. Add exported image to prototype_3/assets/canva.";
    });
  });

  closeModalButton.addEventListener("click", () => {
    modal.close();
  });

  modal.addEventListener("click", (event) => {
    const rect = modal.getBoundingClientRect();
    const inDialog = rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!inDialog) {
      modal.close();
    }
  });
})();

