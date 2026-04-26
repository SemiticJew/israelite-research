// Ensure isArticlePage exists
(function(){
  if (typeof window.isArticlePage === "undefined"){
    window.isArticlePage = function(){ return false; };
  }
})();

// Inject Header & Footer (relative paths — no BASE)
(function(){
  function inject(id, path){
    const host = document.getElementById(id);
    if (!host) return;

    fetch(path, { cache: "no-store" })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => { host.innerHTML = html; })
      .catch(err => console.error("Include failed:", path, err));
  }

  inject("site-header", "partials/header.html");
  inject("site-footer", "partials/footer.html");
})();

// Load Reftagger (articles only)
(function(){
  if (!isArticlePage()) return;
  window.refTagger = { settings: { bibleVersion: "KJV", autodetect: true } };

  const rt = document.createElement("script");
  rt.defer = true;
  rt.src = "https://api.reftagger.com/v2/RefTagger.js";
  document.head.appendChild(rt);
})();

// Load Bible HoverCard (articles only)
(function(){
  if (!isArticlePage()) return;

  const s = document.createElement("script");
  s.defer = true;
  s.src = "js/xref-hover.js";   // removed leading slash
  document.head.appendChild(s);
})();

// Inject Author Modal (articles only)
(function(){
  if (!isArticlePage()) return;
  if (document.getElementById("author-modal")) return;

  fetch("partials/author-modal.html", { cache: "no-store" })
    .then(r => r.ok ? r.text() : null)
    .then(html => {
      if (!html) return;
      if (document.getElementById("author-modal")) return;

      const temp = document.createElement("div");
      temp.innerHTML = html.trim();
      const modal = temp.firstElementChild;
      if (modal) document.body.appendChild(modal);
    })
    .catch(() => {});
})();

// Load Theme Toggle Globally
(function(){
  if (document.getElementById("theme-toggle-loader")) return;

  const s = document.createElement("script");
  s.src = "js/theme-toggle.js";  // removed leading slash
  s.defer = true;
  s.id = "theme-toggle-loader";
  document.head.appendChild(s);
})();