/* One live catalog for homepage cards and the shared author popup. */
(() => {
  let pending;
  const clean = value => (value || '').replace(/\s+/g, ' ').trim();
  window.loadArticleCatalog = () => pending || (pending = fetch('/articles.html', {cache:'no-store'})
    .then(r => {if(!r.ok) throw Error('Article listing unavailable'); return r.text();})
    .then(html => {
      const doc = new DOMParser().parseFromString(html,'text/html');
      const seen = new Set();
      return [...doc.querySelectorAll('.featured-left, .featured-right, .recent-grid .article-card')].map(card => {
        const a = card.querySelector('a[href*="/articles/"]');
        if(!a) return null;
        const url = new URL(a.getAttribute('href'),location.origin);
        if(url.origin !== location.origin || seen.has(url.pathname)) return null;
        seen.add(url.pathname);
        return {href:url.pathname,title:clean(card.querySelector('h2,h3')?.textContent),excerpt:clean(card.querySelector('p.muted,p')?.textContent),image:card.querySelector('img')?.getAttribute('src'),date:card.querySelector('time')?.getAttribute('datetime') || '',author:clean(card.querySelector('.author-name, .author')?.textContent) || 'Semitic Jew'};
      }).filter(a => a?.title).sort((a,b)=>b.date.localeCompare(a.date));
    }));
  window.articleElement = (tag,text,className) => {const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
})();
