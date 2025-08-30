// js/book-nt.js
// New Testament book page loader (matches Tanakh behavior)
// - Robust book match (case-insensitive, supports .name or .abbrev)
// - Accepts both "Chapters" and "chapters" keys
// - Builds chapter grid linking to /newtestament/chapter.html

(function () {
  const BASE = '/israelite-research';
  const DATA_URL = `${BASE}/data/newtestament/books.json`;

  const qs = new URLSearchParams(location.search);
  const bookParam = qs.get('book') || '';

  const titleEl  = document.getElementById('bookTitle');
  const descEl   = document.getElementById('bookDesc');
  const gridEl   = document.getElementById('chaptersGrid');
  const bcEl     = document.getElementById('breadcrumbs');

  const norm = (s) => (s || '').toString().trim().toLowerCase();

  function renderError(msg) {
    if (gridEl) gridEl.innerHTML = `<div class="muted">${msg}</div>`;
  }

  fetch(DATA_URL, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(list => {
      const items = Array.isArray(list) ? list : [];
      const found = items.find(it =>
        norm(it.name) === norm(bookParam) ||
        norm(it.abbrev) === norm(bookParam)
      );
      if (!found) {
        renderError(`Book not found in data/newtestament/books.json: "${bookParam}"`);
        return;
      }

      const name = found.name || bookParam;
      const chapters = (found.Chapters ?? found.chapters ?? 0) | 0;

      if (titleEl) titleEl.textContent = name;
      if (descEl)  descEl.textContent  = found.description || '';

      if (!chapters) {
        renderError('No chapters defined for this book.');
        return;
      }

      // Build chapter grid
      if (gridEl) {
        const frag = document.createDocumentFragment();
        for (let i = 1; i <= chapters; i++) {
          const a = document.createElement('a');
          a.className = 'chapter-card';
          a.href = `${BASE}/newtestament/chapter.html?book=${encodeURIComponent(name)}&chapter=${i}`;
          a.textContent = i;
          frag.appendChild(a);
        }
        gridEl.innerHTML = '';
        gridEl.appendChild(frag);
      }

      // Breadcrumbs (under hero per your convention)
      if (bcEl) {
        bcEl.innerHTML = `
          <ol>
            <li><a href="${BASE}/index.html">Home</a></li>
            <li><a href="${BASE}/texts.html">Texts</a></li>
            <li><a href="${BASE}/newtestament.html">New Testament</a></li>
            <li>${name}</li>
          </ol>`;
      }
    })
    .catch(err => {
      console.error('NT book loader error:', err);
      renderError('Could not load book data.');
    });
})();
