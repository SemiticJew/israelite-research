// js/book-nt.js
// NT Book page loader (uses data/newtestament/books.json)
// Renders chapter grid: /newtestament/chapter.html?book=Revelation&chapter=1

(function(){
  const BASE = '/israelite-research';

  const qs = new URLSearchParams(location.search);
  const bookParam = qs.get('book') || 'Revelation';

  const norm = s => (s||'').trim().toLowerCase();
  const titleEl = document.getElementById('bookTitle');
  const subEl   = document.getElementById('bookSubtitle');
  const gridEl  = document.getElementById('chapters');

  // Breadcrumbs
  try {
    const bc = document.getElementById('breadcrumbs');
    if (bc) {
      bc.innerHTML = `
        <ol>
          <li><a href="${BASE}/index.html">Home</a></li>
          <li><a href="${BASE}/texts.html">Texts</a></li>
          <li><a href="${BASE}/newtestament.html">New Testament</a></li>
          <li>${bookParam}</li>
        </ol>`;
    }
  } catch {}

  const url = `${BASE}/data/newtestament/books.json`;

  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(json => {
      const list = Array.isArray(json.books) ? json.books : [];
      let book = list.find(b => norm(b.name) === norm(bookParam));
      if (!book) {
        // Try alternative keys if you added a slug field later
        book = list.find(b => norm(b.slug) === norm(bookParam));
      }
      if (!book) {
        titleEl && (titleEl.textContent = bookParam);
        gridEl.innerHTML = `<div class="muted">Book not found in <code>data/newtestament/books.json</code>.</div>`;
        return;
      }

      titleEl && (titleEl.textContent = book.name);
      subEl && (subEl.textContent = `${book.chapters} chapters`);

      // Build chapter grid
      const frag = document.createDocumentFragment();
      const wrap = document.createElement('div');
      wrap.className = 'grid grid-chapters';
      // same look as Tanakh grid
      wrap.style.display = 'grid';
      wrap.style.gridTemplateColumns = 'repeat(auto-fill,minmax(56px,1fr))';
      wrap.style.gap = '8px';

      for (let i=1; i<=Number(book.chapters||0); i++){
        const a = document.createElement('a');
        a.className = 'chapter-card';
        a.href = `${BASE}/newtestament/chapter.html?book=${encodeURIComponent(book.name)}&chapter=${i}`;
        a.textContent = i;
        a.style.display = 'inline-flex';
        a.style.alignItems = 'center';
        a.style.justifyContent = 'center';
        a.style.height = '48px';
        a.style.border = '1px solid #e6ebf2';
        a.style.borderRadius = '10px';
        a.style.background = '#fff';
        a.style.textDecoration = 'none';
        a.style.color = '#054A91';
        a.style.fontWeight = '600';
        a.onmouseenter = () => a.style.boxShadow = '0 4px 14px rgba(0,0,0,.08)';
        a.onmouseleave = () => a.style.boxShadow = 'none';
        wrap.appendChild(a);
      }

      gridEl.innerHTML = '';
      frag.appendChild(wrap);
      gridEl.appendChild(frag);
    })
    .catch(err => {
      gridEl.innerHTML = `<div class="muted">Could not load New Testament books at <code>${url}</code>.</div>`;
      console.error('NT book load error:', err);
    });
})();
