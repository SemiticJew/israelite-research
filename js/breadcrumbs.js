<script>
(() => {
  const el = document.getElementById('breadcrumbs');
  if (!el) return;

  const BASE = '/israelite-research';                // GitHub Pages base
  const toTitle = s => decodeURIComponent(s)
    .replace(/[-_]/g,' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // Build list
  const loc   = window.location;
  const path0 = loc.pathname.replace(/index\.html$/,'');
  const path  = path0.startsWith(BASE) ? path0.slice(BASE.length) : path0;
  const segs  = path.split('/').filter(Boolean);
  const q     = new URLSearchParams(loc.search);
  const book  = q.get('book');
  const chap  = q.get('chapter');
  const verse = q.get('verse');

  const crumbs = [];
  const push = (label, href) => crumbs.push({label, href});

  // Always start at Home
  push('Home', `${BASE}/index.html`);

  // Special cases for content sections
  const s0 = segs[0] || '';
  if (s0 === 'articles') {
    push('Articles', `${BASE}/articles.html`);
    // Article page
    if (segs[1]) {
      const h1 = document.querySelector('.article-title');
      const label = h1?.textContent?.trim() || toTitle(segs[1].replace(/\.html$/,''));
      push(label, null);
    }
  } else if (segs[0] === 'tanakh') {
    push('Texts', `${BASE}/texts.html`);
    push('The Tanakh', `${BASE}/tanakh.html`);
    if (segs[1] === 'book.html' && book) push(book, null);
    if (segs[1] === 'chapter.html' && book) {
      push(book, `${BASE}/tanakh/book.html?book=${encodeURIComponent(book)}`);
      if (chap) push(`Chapter ${chap}`, null);
      if (verse) push(`Verse ${verse}`, null);
    }
  } else if (segs[0] === 'newtestament') {
    push('Texts', `${BASE}/texts.html`);
    push('The New Testament', `${BASE}/newtestament.html`);
    if (segs[1] === 'book.html' && book) push(book, null);
    if (segs[1] === 'chapter.html' && book) {
      push(book, `${BASE}/newtestament/book.html?book=${encodeURIComponent(book)}`);
      if (chap) push(`Chapter ${chap}`, null);
      if (verse) push(`Verse ${verse}`, null);
    }
  } else if (path === '/texts.html') {
    push('Texts', null);
  } else if (path === '/tanakh.html') {
    push('Texts', `${BASE}/texts.html`);
    push('The Tanakh', null);
  } else if (path === '/newtestament.html') {
    push('Texts', `${BASE}/texts.html`);
    push('The New Testament', null);
  } else if (path === '/apocrypha.html') {
    push('Texts', `${BASE}/texts.html`);
    push('The Apocrypha', null);
  } else if (path === '/apologetics.html') {
    push('Apologetics', null);
  } else if (path === '/events.html') {
    push('Events', null);
  } else if (path === '/podcast.html') {
    push('Podcast', null);
  } else if (path === '/donate.html') {
    push('Donations', null);
  } else if (path === '/articles.html') {
    push('Articles', null);
  } else {
    // Fallback: derive from segments
    segs.forEach((s, i) => {
      const href = `${BASE}/${segs.slice(0, i+1).join('/')}`;
      const isLast = i === segs.length - 1;
      push(toTitle(s.replace(/\.html$/,'')), isLast ? null : href);
    });
  }

  // Render
  const ol = document.createElement('ol');
  ol.className = 'crumbs';
  crumbs.forEach((c, i) => {
    const li = document.createElement('li');
    if (c.href && i < crumbs.length - 1) {
      const a = document.createElement('a');
      a.href = c.href;
      a.textContent = c.label;
      li.appendChild(a);
    } else {
      li.textContent = c.label;
      li.setAttribute('aria-current','page');
    }
    ol.appendChild(li);
  });
  el.innerHTML = '';
  el.appendChild(ol);
})();
</script>
