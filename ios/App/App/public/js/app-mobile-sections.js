/* Semitic Jew App: Mobile collapsible dashboard sections */
(function(){
  const MOBILE_QUERY = window.matchMedia("(max-width: 760px)");

  const SECTION_MAP = [
    ["app-reading-history", "Continue Reading"],
    ["app-bookmarks", "Saved Scripture"],
    ["app-highlights", "Highlighted Verses"],
    ["app-expositions", "No Private Interpretation"],
    ["app-study-trails", "Study Trails"],
    ["app-data-tools", "Local App Data"]
  ];

  function enhanceSection(section, label, index){
    if(!section || section.dataset.mobileEnhanced === "true") return;

    const wrapper = document.createElement("section");
    wrapper.className = "app-mobile-collapse";
    wrapper.dataset.defaultOpen = index < 2 ? "true" : "false";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "app-mobile-collapse-toggle";
    button.setAttribute("aria-expanded", wrapper.dataset.defaultOpen);
    button.innerHTML = `
      <span>${label}</span>
      <strong aria-hidden="true">${wrapper.dataset.defaultOpen === "true" ? "−" : "+"}</strong>
    `;

    const body = document.createElement("div");
    body.className = "app-mobile-collapse-body";

    section.parentNode.insertBefore(wrapper, section);
    wrapper.appendChild(button);
    wrapper.appendChild(body);
    body.appendChild(section);

    section.dataset.mobileEnhanced = "true";

    button.addEventListener("click", function(){
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      button.querySelector("strong").textContent = open ? "+" : "−";
    });
  }

  function setup(){
    SECTION_MAP.forEach(([id, label], index) => {
      const section = document.getElementById(id);
      enhanceSection(section, label, index);
    });
  }

  document.addEventListener("DOMContentLoaded", setup);
  window.addEventListener("load", setup);

  // Dynamic app sections render after DOMContentLoaded, so observe the app page briefly.
  document.addEventListener("DOMContentLoaded", function(){
    const main = document.querySelector("main");
    if(!main) return;

    let runs = 0;
    const observer = new MutationObserver(function(){
      runs += 1;
      setup();

      if(runs > 80){
        observer.disconnect();
      }
    });

    observer.observe(main, {childList:true, subtree:true});

    setTimeout(function(){
      setup();
      observer.disconnect();
    }, 8000);
  });
})();
