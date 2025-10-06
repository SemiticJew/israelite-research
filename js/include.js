(function(){
  if (typeof window.isArticlePage === "undefined"){
    window.isArticlePage = function(){ return false; };
  }
})();

// js/include.js
(function(){
  const BASE = '/israelite-research';

  function inject(id, path){
    const host = document.getElementById(id);
    if (!host) return;
    fetch(`${BASE}${path}`, {cache:'no-store'})
      .then(r => r.ok ? r.text() : Promise.reject(new Error(r.status)))
      .then(html => { host.innerHTML = html; })
      .catch(()=>{});
  }

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
  rt.src = 'https://api.reftagger.com/v2/RefTagger.js';
  document.head.appendChild(rt);
})();

/* Load Bible HoverCard (articles only) */
(function(){
  if (!isArticlePage()) return;
  var s = document.createElement('script');
  s.defer = true;
  s.src = '/israelite-research/js/xref-hover.js';
  document.head.appendChild(s);
})();

/* Inject Author Modal (articles only) */
(function(){
  if (!isArticlePage()) return;
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
