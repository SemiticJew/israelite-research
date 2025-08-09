// include.js – inject partials and keep nav consistent/active across pages
(function () {
  function pathPrefix() {
    const parts = location.pathname.split('/').filter(Boolean);
    const depth = Math.max(0, parts.length - 1);
    return depth ? '../'.repeat(depth) : '';
  }
  function setActiveNav(root) {
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    let key = file.replace('.html', '') || 'index';
    const allowed = new Set(['index','texts','apologetics','events','podcast','donate']);
    if (!allowed.has(key)) key = 'index';
    const link = root.querySelector(`a[data-nav="${key}"]`);
    if (link) link.classList.add('active');
  }
  function rewriteNavHrefs(root, prefix) {
    root.querySelectorAll('.main-nav a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
      a.setAttribute('href', prefix + href);
    });
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
    const prefix = pathPrefix();
    const header = document.querySelector('.site-header');
    if (header) {
      rewriteNavHrefs(header, prefix);
      setActiveNav(header);
    }
  }
  document.addEventListener('DOMContentLoaded', run);
})();
