// js/include.js
(function(){
  const BASE = '/israelite-research'; // absolute base for GitHub Pages

  function inject(id, path){
    const host = document.getElementById(id);
    if (!host) return;
    fetch(`${BASE}${path}`, {cache:'no-store'})
      .then(r => r.ok ? r.text() : Promise.reject(new Error(r.status)))
      .then(html => { host.innerHTML = html; })
      .catch(err => {
        console.warn('Include failed:', path, err);
        // fail open: no header/footer is better than breaking the page
      });
  }

  // Always absolute so subpages like /articles/... work
  inject('site-header', '/partials/header.html');
  inject('site-footer', '/partials/footer.html');
})();

/* Utility: check if current page is an article */
/* Load Reftagger (articles only) */
(function(){
  if (!isArticlePage()) return;
  window.refTagger = { settings: { bibleVersion: 'KJV', autodetect: true } };
  var rt = document.createElement('script');
  rt.defer = true;
  document.head.appendChild(rt);
})();

/* Load Bible HoverCard (articles only) */
(function(){
  if (!isArticlePage()) return;
  var s = document.createElement('script');
  s.defer = true;
  document.head.appendChild(s);
})();

(function(){
  if (document.getElementById("author-modal")) return;
  fetch("/israelite-research/partials/author-modal.html", {cache:"no-store"})
    .then(function(r){ return r.ok ? r.text() : null; })
    .then(function(html){
      if (!html) return;
      if (document.getElementById("author-modal")) return;
      var temp = document.createElement("div");
      temp.innerHTML = html.trim();
      var modal = temp.firstElementChild;
      if (modal) document.body.appendChild(modal);
    })
    .catch(function(){});
})();
