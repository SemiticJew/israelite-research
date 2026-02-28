// Stable Theme Toggle (Works Across Injected Header/Footer)

document.addEventListener("DOMContentLoaded", function(){

  function applyTheme(theme){
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    const logoSrc = theme === "dark"
      ? "/israelite-research/images/white-logo-letters.png"
      : "/israelite-research/images/black-logo-letters.png";

    const headerLogo = document.getElementById("site-logo");
    const footerLogo = document.getElementById("footer-logo");

    if (headerLogo) headerLogo.src = logoSrc;
    if (footerLogo) footerLogo.src = logoSrc;
  }

  // Load saved theme
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  // Toggle handler
  document.addEventListener("click", function(e){
    const btn = e.target.closest(".theme-btn");
    if (!btn) return;
    applyTheme(btn.dataset.theme);
  });

});