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


// Load Breadcrumb Schema Globally
(function(){
  if (document.getElementById("breadcrumb-schema-loader")) return;

  const s = document.createElement("script");
  s.src = "/js/breadcrumb-schema.js";
  s.defer = true;
  s.id = "breadcrumb-schema-loader";
  document.head.appendChild(s);
})();


// Mobile Ellipsis Navigation
(function(){
  function wireMobileNav(){
    const header = document.getElementById("site-header");
    if (!header) return;

    const btn = header.querySelector(".mobile-menu-toggle");
    if (!btn || btn.dataset.wired === "1") return;

    btn.dataset.wired = "1";

    btn.addEventListener("click", function(){
      const open = header.classList.toggle("mobile-nav-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("click", function(e){
      if (!header.classList.contains("mobile-nav-open")) return;
      if (header.contains(e.target)) return;
      header.classList.remove("mobile-nav-open");
      btn.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", function(e){
      if (e.key !== "Escape") return;
      header.classList.remove("mobile-nav-open");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("DOMContentLoaded", wireMobileNav);
  setTimeout(wireMobileNav, 250);
})();


// Google Analytics / Google tag
(function(){
  if (document.getElementById("google-gtag-loader")) return;

  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-32TJCG51NH";
  gtagScript.id = "google-gtag-loader";
  document.head.appendChild(gtagScript);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag("js", new Date());
  gtag("config", "G-32TJCG51NH");
})();


// Sync header/footer logos with saved theme on page load
(function(){
  const DARK_LOGO = "/images/white-logo-letters.png";
  const LIGHT_LOGO = "/images/black-logo-letters.png";

  function currentTheme(){
    return document.documentElement.getAttribute("data-theme")
      || localStorage.getItem("theme")
      || localStorage.getItem("site-theme")
      || "light";
  }

  function syncLogos(){
    const theme = currentTheme();
    const logoSrc = theme === "dark" ? DARK_LOGO : LIGHT_LOGO;

    document.querySelectorAll(
      'img[src*="black-logo-letters"], img[src*="white-logo-letters"], img[data-logo], .site-logo img, .footer-logo img, .brand img'
    ).forEach(function(img){
      img.setAttribute("src", logoSrc);
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    syncLogos();
    setTimeout(syncLogos, 100);
    setTimeout(syncLogos, 300);
    setTimeout(syncLogos, 700);
  });

  window.addEventListener("load", syncLogos);

  const observer = new MutationObserver(syncLogos);
  observer.observe(document.documentElement, {
    attributes:true,
    attributeFilter:["data-theme", "class"]
  });

  window.addEventListener("storage", function(e){
    if(e.key === "theme" || e.key === "site-theme"){
      syncLogos();
    }
  });

  window.syncThemeLogos = syncLogos;
})();

