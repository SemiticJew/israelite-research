document.addEventListener("DOMContentLoaded", function(){
  const html = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const logo = document.getElementById("site-logo");

  if(!toggle) return;

  const saved = localStorage.getItem("theme") || "light";
  html.setAttribute("data-theme", saved);

  if(logo){
    logo.src = saved === "dark"
      ? "/israelite-research/images/white-logo-letters.png"
      : "/israelite-research/images/black-logo-letters.png";
  }

  toggle.addEventListener("click", function(){
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";

    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);

    if(logo){
      logo.src = next === "dark"
        ? "/israelite-research/images/white-logo-letters.png"
        : "/israelite-research/images/black-logo-letters.png";
    }
  });
});
