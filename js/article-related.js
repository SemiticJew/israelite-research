/* article-related.js — "Keep reading" at the end of an article.
   Loaded by include.js on article pages after article-catalog.js (the same live catalog the homepage
   and the author modal use). Builds plain DOM nodes; titles and images come from /articles.html. */
(() => {
  'use strict';
  if (document.querySelector('.art-related') || typeof window.loadArticleCatalog !== 'function') return;
  const shell = document.querySelector('.article-shell');
  if (!shell) return;
  const here = location.pathname.replace(/\/+$/, '');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const fmt = d => { const m = /^(\d{4}-\d{2}-\d{2})/.exec(d || ''); if (!m) return ''; const t = new Date(m[1] + 'T12:00:00Z'); return isNaN(t) ? '' : t.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }); };
  window.loadArticleCatalog().then(items => {
    const picks = items.filter(a => a.href && a.href !== here && /^\/articles\/[a-z0-9-]+\.html$/.test(a.href)).slice(0, 3);
    if (!picks.length) return;
    const section = el('section', 'art-related');
    section.setAttribute('aria-labelledby', 'art-related-title');
    const h = el('h2', null, 'Keep reading'); h.id = 'art-related-title';
    const list = el('ul');
    picks.forEach(a => {
      const li = el('li'); const link = el('a'); link.href = a.href;
      if (a.image && /^\/images\//.test(a.image)) { const img = el('img'); img.src = a.image; img.alt = ''; img.loading = 'lazy'; img.width = 700; img.height = 394; link.append(img); }
      const text = el('div'); text.append(el('strong', null, a.title));
      const date = fmt(a.date); if (date) text.append(el('span', null, date));
      link.append(text); li.append(link); list.append(li);
    });
    const more = el('a', 'art-related-more', 'All articles'); more.href = '/articles-all.html';
    section.append(h, list, more);
    shell.after(section);
  }).catch(() => {});
})();
