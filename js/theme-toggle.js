document.addEventListener("DOMContentLoaded", function () {

  function initializeThemeToggle() {
    const html = document.documentElement;
    const headerLogo = document.getElementById("site-logo");
    const footerLogo = document.getElementById("footer-logo");
    const buttons = document.querySelectorAll(".theme-btn");

    if (!buttons.length) return;

    function applyTheme(theme) {
      html.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);

      const logoSrc = theme === "dark"
        ? "/israelite-research/images/white-logo-letters.png"
        : "/israelite-research/images/black-logo-letters.png";

      if (headerLogo) headerLogo.src = logoSrc;
      if (footerLogo) footerLogo.src = logoSrc;
    }

    // Load saved theme (default = light)
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);

    // Button click listeners
    buttons.forEach(btn => {
      btn.addEventListener("click", function () {
        const selectedTheme = btn.dataset.theme;
        applyTheme(selectedTheme);
      });
    });
  }

  // Slight delay to ensure header/footer includes finish loading
  setTimeout(initializeThemeToggle, 200);

});