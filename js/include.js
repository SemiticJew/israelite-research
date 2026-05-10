// Detect article pages
(function(){
  window.isArticlePage = function(){
    return document.body?.dataset?.page === "article" ||
           document.body?.classList?.contains("article-doc") ||
           location.pathname.includes("/articles/");
  };
})();

// Inject Header & Footer
(function(){
  function inject(id, path){
    const host = document.getElementById(id);
    if (!host) return;

    fetch(path, { cache: "no-store" })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => {
        host.innerHTML = html;
      })
      .catch(err => console.error("Include failed:", path, err));
  }

  function run(){
    inject("site-header", "/partials/header.html");
    inject("site-footer", "/partials/footer.html");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();

// Load Reftagger on articles only
(function(){
  if (!window.isArticlePage()) return;
  if (document.getElementById("reftagger-loader")) return;

  window.refTagger = {
    settings: {
      bibleVersion: "KJV",
      autodetect: true
    }
  };

  const rt = document.createElement("script");
  rt.defer = true;
  rt.id = "reftagger-loader";
  rt.src = "https://api.reftagger.com/v2/RefTagger.js";
  document.head.appendChild(rt);
})();

// Load Bible HoverCard on articles only
(function(){
  if (!window.isArticlePage()) return;
  if (document.getElementById("xref-hover-loader")) return;

  const s = document.createElement("script");
  s.defer = true;
  s.id = "xref-hover-loader";
  s.src = "/js/xref-hover.js";
  document.head.appendChild(s);
})();

// Inject Author Modal on articles only
(function(){
  if (!window.isArticlePage()) return;
  if (document.getElementById("author-modal")) return;

  fetch("/partials/author-modal.html", { cache: "no-store" })
    .then(r => r.ok ? r.text() : null)
    .then(html => {
      if (!html) return;
      if (document.getElementById("author-modal")) return;

      const temp = document.createElement("div");
      temp.innerHTML = html.trim();

      const modal = temp.firstElementChild;
      if (modal) document.body.appendChild(modal);
    })
    .catch(err => console.error("Author modal include failed:", err));
})();

// Load Theme Toggle Globally
(function(){
  if (document.getElementById("theme-toggle-loader")) return;

  const s = document.createElement("script");
  s.src = "/js/theme-toggle.js";
  s.defer = true;
  s.id = "theme-toggle-loader";
  document.head.appendChild(s);
})();