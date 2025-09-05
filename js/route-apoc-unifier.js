// Rewrites old /apocrypha/<slug>/chapter-N.html links to /apocrypha/chapter.html?book=<slug>&ch=N
(function () {
  function rewrite(href) {
    try {
      const a = document.createElement("a");
      a.href = href;
      const m = a.pathname.match(/\/apocrypha\/([a-z0-9\-]+)\/chapter-(\d+)\.html$/i);
      if (!m) return href;
      const slug = m[1], ch = m[2];
      // keep site base if present
      const base = a.pathname.includes("/israelite-research/") ? "/israelite-research" : "";
      return `${base}/apocrypha/chapter.html?book=${slug}&ch=${ch}`;
    } catch { return href; }
  }

  function run() {
    document.querySelectorAll('a[href*="/apocrypha/"]').forEach(a => {
      const newHref = rewrite(a.getAttribute("href") || "");
      if (newHref !== a.getAttribute("href")) a.setAttribute("href", newHref);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
