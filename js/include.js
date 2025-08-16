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
