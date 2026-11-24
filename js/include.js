// Apply the saved theme as early as possible to avoid a light/dark flash.
// Same storage key and attribute as /js/theme-toggle.js (the single source of truth).
(function(){
  try {
    var saved = localStorage.getItem('theme');
    if(saved === 'dark' || saved === 'light') document.documentElement.setAttribute('data-theme', saved);
  } catch(e) {}
})();

// Load the brand typefaces used by the shared header/footer (same URL as index.html, so it is cached once).
(function(){
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=League+Spartan:wght@400;700;900&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap';
  if(document.querySelector('link[href*="fonts.googleapis.com"][href*="League+Spartan"][href*="Newsreader"]')) return;
  [['preconnect','https://fonts.googleapis.com'],['preconnect','https://fonts.gstatic.com']].forEach(function(pair){
    var l = document.createElement('link'); l.rel = pair[0]; l.href = pair[1];
    if(pair[1].indexOf('gstatic') > -1) l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  });
  var css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = FONT_URL; css.id = 'sj-brand-fonts';
  document.head.appendChild(css);
})();

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
        // A page with its own signup must not receive a second footer form.
        if (id === "site-footer" && document.getElementById("newsletter")) {
          const template = document.createElement("template");
          template.innerHTML = html;
          template.content.querySelectorAll(".footer-newsletter-compact").forEach(el => el.remove());
          host.replaceChildren(template.content);
        } else {
          host.innerHTML = html;
        }
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
      if (modal) {
        document.body.appendChild(modal);
        if (!document.querySelector('script[src="/js/modal.js"]')) {
          const script = document.createElement('script');
          script.src = '/js/modal.js';
          document.head.appendChild(script);
        }
      }
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




// Google Analytics / Google tag
(function(){
  if (document.body?.classList.contains("app-page")) return;
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
  gtag("config", "AW-18308821309");
})();


// Google Ads Donate conversion
(function(){
  const CONVERSION_TARGET = "AW-18308821309/ncTeCOnh4eIcEL3iqZpE";
  const FALLBACK_DELAY = 1000;

  window.gtag_report_conversion = function(url) {
    var hasUrl = typeof(url) != "undefined";
    var didNavigate = false;
    var callback = function () {
      if (hasUrl && !didNavigate) {
        didNavigate = true;
        window.location = url;
      }
    };

    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
          "send_to": CONVERSION_TARGET,
          "event_callback": callback
      });

      if (hasUrl) {
        window.setTimeout(callback, FALLBACK_DELAY);
      }
    } else {
      callback();
    }

    return false;
  };

  document.addEventListener("click", function(event){
    const link = event.target.closest('[data-google-ads-conversion="donate"]');
    if (!link) return;

    const opensNewContext = link.target && link.target.toLowerCase() !== "_self";
    if (opensNewContext || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      window.gtag_report_conversion();
      return;
    }

    event.preventDefault();
    window.gtag_report_conversion(link.href);
  });
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



/* Site navigation controller (partials/header.html, "sjh-" markup)
   Desktop: disclosure dropdowns (click/tap, hover with intent, Escape, outside click).
   <=1000px: drawer with accordion sections, focus management, Escape, outside tap.
   Replaces the former mobile-ellipsis, mobile-bootstrap, dropdown-state and submenu modules. */
(function(){
  var MOBILE_QUERY = '(max-width: 1000px)';

  function setupSiteNav(){
    var host = document.getElementById('site-header');
    var root = host && host.querySelector('[data-sjh]');
    if(!root || root.dataset.navReady === 'true') return;
    root.dataset.navReady = 'true';

    var mq = window.matchMedia(MOBILE_QUERY);
    var menuBtn = root.querySelector('.sjh-menu-btn');
    var nav = root.querySelector('.sjh-nav');
    var items = Array.prototype.slice.call(root.querySelectorAll('.sjh-has-menu'));
    var hoverTimer = null;
    var lastPointer = '';

    function toggleOf(item){ return item.querySelector('.sjh-toggle'); }
    function setItem(item, open){
      item.classList.toggle('is-open', open);
      toggleOf(item).setAttribute('aria-expanded', String(open));
    }
    function closeItems(except){
      items.forEach(function(item){ if(item !== except) setItem(item, false); });
    }
    function drawerOpen(){ return root.classList.contains('is-drawer-open'); }
    function setDrawer(open, focusFirst){
      root.classList.toggle('is-drawer-open', open);
      if(menuBtn){
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      }
      if(!open) closeItems();
      if(open && focusFirst){
        var first = nav.querySelector('a, button');
        if(first) first.focus();
      }
    }

    root.addEventListener('pointerdown', function(e){ lastPointer = e.pointerType || ''; }, true);

    if(menuBtn){
      menuBtn.addEventListener('click', function(e){
        // detail === 0 means keyboard activation: move focus into the drawer.
        setDrawer(!drawerOpen(), e.detail === 0);
      });
    }

    items.forEach(function(item){
      var toggle = toggleOf(item);
      toggle.addEventListener('click', function(){
        var isOpen = item.classList.contains('is-open');
        // A desktop mouse user already opened it by hovering; a click should not snap it shut.
        var open = (!mq.matches && lastPointer === 'mouse') ? true : !isOpen;
        closeItems(item);
        setItem(item, open);
      });
      item.addEventListener('mouseenter', function(e){
        if(mq.matches || (e.pointerType && e.pointerType !== 'mouse')) return;
        clearTimeout(hoverTimer);
        closeItems(item);
        setItem(item, true);
      });
      item.addEventListener('mouseleave', function(){
        if(mq.matches) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function(){
          if(!item.contains(document.activeElement)) setItem(item, false);
        }, 200);
      });
      item.addEventListener('focusout', function(e){
        if(mq.matches) return;
        if(!item.contains(e.relatedTarget)) setItem(item, false);
      });
    });

    // Leaving the header with the keyboard closes the drawer on small screens.
    root.addEventListener('focusout', function(e){
      if(!mq.matches || !drawerOpen()) return;
      if(e.relatedTarget && !root.contains(e.relatedTarget)) setDrawer(false);
    });

    document.addEventListener('keydown', function(e){
      if(e.key !== 'Escape' && e.key !== 'Esc') return;
      var openItem = items.filter(function(item){ return item.classList.contains('is-open'); })[0];
      if(openItem){
        var wasInside = openItem.contains(document.activeElement);
        setItem(openItem, false);
        if(wasInside || !mq.matches) toggleOf(openItem).focus();
        return;
      }
      if(drawerOpen()){
        var focusWasInMenu = nav.contains(document.activeElement);
        setDrawer(false);
        if(focusWasInMenu && menuBtn) menuBtn.focus();
      }
    });

    document.addEventListener('click', function(e){
      if(root.contains(e.target)) return;
      closeItems();
      if(drawerOpen()) setDrawer(false);
    });

    nav.addEventListener('click', function(e){
      var link = e.target.closest('a[href]');
      if(link && mq.matches) setDrawer(false);
    });

    function onBreakpointChange(){ clearTimeout(hoverTimer); closeItems(); setDrawer(false); }
    if(mq.addEventListener) mq.addEventListener('change', onBreakpointChange);
    else if(mq.addListener) mq.addListener(onBreakpointChange);

    // Mark the current page and its section.
    var here = location.pathname.replace(/\/index\.html$/, '/');
    Array.prototype.forEach.call(nav.querySelectorAll('a[href]'), function(a){
      var path = new URL(a.getAttribute('href'), location.origin).pathname.replace(/\/index\.html$/, '/');
      if(path !== here) return;
      a.setAttribute('aria-current', 'page');
      var item = a.closest('.sjh-item');
      if(item) item.classList.add('is-current');
    });

    // Reflect the active theme on the switcher buttons (theme-toggle.js sets html[data-theme]).
    function syncThemeButtons(){
      var theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      Array.prototype.forEach.call(root.querySelectorAll('.theme-btn[data-theme]'), function(btn){
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-theme') === theme));
      });
    }
    syncThemeButtons();
    new MutationObserver(syncThemeButtons).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
  }

  document.addEventListener('DOMContentLoaded', setupSiteNav);
  window.addEventListener('load', setupSiteNav);
  var mo = new MutationObserver(setupSiteNav);
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();


/* PWA service worker registration */
(function(){
  if(!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js').catch(function(err){
      console.warn('Semitic Jew service worker registration failed:', err);
    });
  });
})();


/* PWA update prompt loader */
(function(){
  if(document.querySelector('script[src="/js/app-update-prompt.js"]')) return;

  var script = document.createElement("script");
  script.src = "/js/app-update-prompt.js";
  script.defer = true;
  document.head.appendChild(script);
})();

// Load the live author article catalog after the shared includes.
if(window.isArticlePage()) {
 const catalog=document.createElement('script');catalog.src='/js/article-catalog.js';
 catalog.onload=()=>{const recent=document.createElement('script');recent.src='/js/author-recent.js';document.head.append(recent);};
 document.head.append(catalog);
}
