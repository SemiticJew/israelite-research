document.addEventListener("DOMContentLoaded", function(){

  function initializeThemeToggle(){
    const html = document.documentElement;
    const logo = document.getElementById("site-logo");
    const buttons = document.querySelectorAll(".theme-btn");

    if(buttons.length === 0) return;

    function applyTheme(theme){
      html.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);

      if(logo){
        logo.src = theme === "dark"
          ? "/israelite-research/images/white-logo-letters.png"
          : "/israelite-research/images/black-logo-letters.png";
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
