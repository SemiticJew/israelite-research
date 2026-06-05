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



/* Mobile navigation bootstrap */
(function(){
  function setupMobileNav(){
    const header = document.getElementById('site-header');
    if(!header || header.dataset.mobileNavReady === 'true') return;

    const btn = header.querySelector('.mobile-menu-toggle');
    const nav = header.querySelector('nav.primary');
    if(!btn || !nav) return;

    header.dataset.mobileNavReady = 'true';

    btn.addEventListener('click', function(){
      const open = header.classList.toggle('mobile-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });

    nav.addEventListener('click', function(e){
      const link = e.target.closest('a');
      if(!link) return;
      if(window.matchMedia('(max-width: 920px)').matches){
        header.classList.remove('mobile-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Open navigation menu');
      }
    });

    document.addEventListener('click', function(e){
      if(!window.matchMedia('(max-width: 920px)').matches) return;
      if(!header.classList.contains('mobile-open')) return;
      if(header.contains(e.target)) return;
      header.classList.remove('mobile-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open navigation menu');
    });
  }

  document.addEventListener('DOMContentLoaded', setupMobileNav);
  window.addEventListener('load', setupMobileNav);

  const mo = new MutationObserver(setupMobileNav);
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();
