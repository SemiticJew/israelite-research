// /israelite-research/js/book.js
(function () {
  const params = new URLSearchParams(location.search);
  const rawBook = params.get('book') || 'Genesis';

  // Slug to match your folder names (lowercase, hyphens for spaces/punctuation)
  const slug = rawBook
    .toLowerCase()
    .replace(/[\u2019'’]/g, '')     // drop apostrophes
    .replace(/&/g, 'and')           // normalize ampersand
    .replace(/[^a-z0-9]+/g, '-')    // non-alnum -> hyphen
    .replace(/^-+|-+$/g, '');       // trim hyphens

  // Elements
  const titleEl = document.getElementById('book-title');
  const descEl  = document.getElementById('book-desc');
  const gridEl  = document.getElementById('chapters');

  // Set title immediately
  if (titleEl) titleEl.textContent = rawBook;

  // Build absolute paths (GitHub Pages safe)
  const base = '/israelite-research';
  const bookMetaURLS = [
    `${base}/data/tanakh/${slug}/${slug}.json`,
    `${base}/data/tanakh/${slug}.json`,
    `${base}/data/tanakh/${slug}/book.json`
  ];
  const bookDescURL = `${base}/data/tanakh/descriptions.json`;

  // Helper to render chapters 1..N
  function renderChapters(n) {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    for (let i = 1; i <= n; i++) {
      const a = document.createElement('a');
      a.href = `${base}/tanakh/chapter.html?book=${encodeURIComponent(rawBook)}&chapter=${i}`;
      a.textContent = i;
      a.setAttribute('aria-label', `Chapter ${i}`);
      gridEl.appendChild(a);
    }
  }

  // Load chapter count from manifest; fall back if missing
  (async () => {
    for (const url of bookMetaURLS) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok) {
          const meta = await r.json();
          const chapters = Number(meta?.chapters) || Number(meta?.chapterCount);
          if (chapters && chapters > 0) {
            renderChapters(chapters);
            return;
          }
        }
      } catch (_) {}
    }
    // Fallbacks for common books; default to 50 if unknown
    const defaults = { genesis: 50, exodus: 40, leviticus: 27, numbers: 36, deuteronomy: 34 };
    renderChapters(defaults[slug] || 50);
  })();

  // Load description (optional)
  fetch(bookDescURL)
    .then(r => r.ok ? r.json() : {})
    .then(allDescs => {
      const d = allDescs && (allDescs[rawBook] || allDescs[slug]);
      if (d && descEl) descEl.textContent = d;
    })
    .catch(() => {});
})();
