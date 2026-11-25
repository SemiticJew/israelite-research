/* author-counts.js — keep the Authors pages' article numbers and lists in step with the live catalog.
   The catalog is /articles.html as read by js/article-catalog.js (the same source as the homepage
   previews and the author modal). Static numbers in the HTML are the fallback.
   - [data-article-count]            → text becomes the count; data-article-count="{n} Articles" sets a format.
   - [data-author-articles="Semitic Jew"] → the profile's article list is rebuilt from the catalog. */
(() => {
  'use strict';
  if (typeof window.loadArticleCatalog !== 'function') return;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const fmtDate = d => { const m = /^(\d{4}-\d{2}-\d{2})/.exec(d || ''); if (!m) return ''; const t = new Date(m[1] + 'T12:00:00Z'); return isNaN(t) ? '' : t.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }); };
  window.loadArticleCatalog().then(items => {
    const valid = items.filter(a => /^\/articles\/[a-z0-9-]+\.html$/.test(a.href));
    document.querySelectorAll('[data-article-count]').forEach(node => {
      const author = node.getAttribute('data-article-author');
      const n = author ? valid.filter(a => a.author.toLowerCase() === author.toLowerCase()).length : valid.length;
      if (!n) return;
      const format = node.getAttribute('data-article-count') || '{n}';
      node.textContent = format.replace('{n}', String(n)).replace('{s}', n === 1 ? '' : 's');
    });
    const list = document.querySelector('[data-author-articles]');
    if (list) {
      const author = list.getAttribute('data-author-articles').toLowerCase();
      const mine = valid.filter(a => a.author.toLowerCase() === author);
      // Only replace the static list when the catalog has at least as many articles (never show fewer).
      if (mine.length >= list.querySelectorAll('.author-article-card').length) {
        list.replaceChildren(...mine.map(a => {
          const card = el('article', 'author-article-card');
          const imgLink = el('a', 'author-article-image'); imgLink.href = a.href;
          // The title link below is the accessible link; the picture is a duplicate, so keep it out of the tab order.
          imgLink.tabIndex = -1; imgLink.setAttribute('aria-hidden', 'true');
          if (a.image && /^\/images\//.test(a.image) && !/ARTICLE_IMAGE/.test(a.image)) { const img = el('img'); img.src = a.image; img.alt = ''; img.loading = 'lazy'; imgLink.append(img); }
          const body = el('div', 'author-article-body');
          const date = fmtDate(a.date);
          if (date) { const p = el('p', 'article-date'); const t = el('time', null, date); t.dateTime = a.date.slice(0, 10); p.append(t); body.append(p); }
          const h = el('h2'); const link = el('a', null, a.title); link.href = a.href; h.append(link); body.append(h);
          if (a.excerpt) body.append(el('p', null, a.excerpt));
          card.append(imgLink, body);
          return card;
        }));
      }
    }
  }).catch(() => {});
})();
