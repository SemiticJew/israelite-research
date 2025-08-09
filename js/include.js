// include.js — inject partials and set active nav (no link rewriting)
(function () {
  function setActiveNav(root) {
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    let key = file.replace('.html', '') || 'index';
    const allowed = new Set(['index','texts','apologetics','events','podcast','donate']);
    if (!allowed.has(key)) key = 'index';
    const link = root.querySelector(`a[data-nav="${key}"]`);
    if (link) link.classList.add('active');
  }

  async function inject(el) {
    const src = el.getAttribute('data-include');
    try {
      const res = await fetch(src);
      el.outerHTML = await res.text();
    } catch {
      el.outerHTML = `<!-- include failed: ${src} -->`;
    }
  }

  async function run() {
    const includes = Array.from(document.querySelectorAll('[data-include]'));
    await Promise.all(includes.map(inject));
    const header = document.querySelector('.site-header');
    if (header) setActiveNav(header);
  }

  document.addEventListener('DOMContentLoaded', run);
})();
