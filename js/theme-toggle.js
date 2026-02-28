document.addEventListener("DOMContentLoaded", function(){

  function initializeThemeToggle(){
    const html = document.documentElement;
    const headerLogo = document.getElementById('site-logo');
const footerLogo = document.getElementById('footer-logo');
    const buttons = document.querySelectorAll(".theme-btn");

    if(buttons.length === 0) return;

    function applyTheme(theme){
      html.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);

      if(logo){
        const logoSrc = theme === 'dark'
  ? '/israelite-research/images/white-logo-letters.png'
  : '/israelite-research/images/black-logo-letters.png';

if (headerLogo) headerLogo.src = logoSrc;
if (footerLogo) footerLogo.src = logoSrc;
      }
    }

    const saved = localStorage.getItem("theme") || "light";
    applyTheme(saved);

    buttons.forEach(btn=>{
      btn.addEventListener("click", function(){
        applyTheme(btn.dataset.theme);
      });
    });
  }

  // Delay slightly to allow header include to finish
  setTimeout(initializeThemeToggle, 200);

});
