// Global Theme Toggle (Site-Wide Stable Version)
// Guarded so a second copy of this script on the same page is a harmless no-op
// (no redeclaration error, no duplicate click handler).
(function () {
  if (window.__sjThemeToggleLoaded) return;
  window.__sjThemeToggleLoaded = true;

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    const logoSrc = theme === "dark"
      ? "/images/white-logo-letters.png"
      : "/images/black-logo-letters.png";

    const headerLogo = document.getElementById("site-logo");
    const footerLogo = document.getElementById("footer-logo");

    if (headerLogo) headerLogo.src = logoSrc;
    if (footerLogo) footerLogo.src = logoSrc;
  }
  window.applyTheme = applyTheme;

  // Apply saved theme immediately
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  // Handle toggle clicks
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".theme-btn");
    if (!btn) return;
    applyTheme(btn.dataset.theme);
  });
})();
