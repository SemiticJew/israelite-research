(function () {
  const ROOT = '/israelite-research';

  // Get book name from ?book=Genesis OR from /tanakh/genesis.html
  function getBookFromLocation() {
    const qs = new URLSearchParams(location.search);
    let book = qs.get('book');
    if (book) return normalizeBook(book);

    // Path-based: /israelite-research/tanakh/genesis.html
    const m = location.pathname.match(/tanakh\/([^\/.]+)\.html$/i);
    if (m && m[1]) return normalizeBook(m[1]);

    return null;
  }

  function normalizeBook(s) {
    // accept kebab/slug/case-insensitive -> Title Case words
    const cleaned = s.replace(/-/g, ' ').trim();
    return cleaned
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  async function loadMeta() {
    const [booksRes, descRes] = await Promise.all([
      fetch(`${ROOT}/data/tanakh/books.json`),
      fetch(`${ROOT}/data/tanakh/descriptions.json`)
    ]);
    if (!booksRes.ok) throw new Error('books.json load failed');
    const books = await booksRes.json();
    let desc = {};
    if (descRes.ok) desc = await descRes.json();
    return { books, desc };
  }

  function render(bookName, chapters) {
    const titleEl = document.getElementById('bookTitle');
    const descEl = document.getElementById('bookDesc');
    const gridEl = document.getElementById('chaptersGrid');

    if (titleEl) titleEl.textContent = bookName;
    if (descEl) {
      // Description will be set by caller using descriptions.json (if present)
    }

    // Build chapter tiles 1..N
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= chapters; i++) {
      const a = document.createElement('a');
      a.className = 'chapter-tile';
      a.role = 'listitem';
      a.href = `${ROOT}/tanakh/chapter.html?book=${encodeURIComponent(bookName)}&chapter=${i}`;
      a.textContent = i;
      frag.appendChild(a);
    }
    gridEl.innerHTML = '';
    gridEl.appendChild(frag);
  }

  (async function init() {
    const targetBook = getBookFromLocation();
    const titleEl = document.getElementById('bookTitle');
    const descEl = document.getElementById('bookDesc');

    if (!targetBook) {
      if (titleEl) titleEl.textContent = 'Book not found';
      return;
    }

    try {
      const { books, desc } = await loadMeta();

      // Find matching book by name, case-insensitive
      const match = books.find(
        b => (b.name || '').toLowerCase() === targetBook.toLowerCase()
      );

      if (!match) {
        if (titleEl) titleEl.textContent = targetBook;
        if (descEl) descEl.textContent = '';
        render(targetBook, 50); // fallback to 50 if unknown
        return;
      }

      if (titleEl) titleEl.textContent = match.name;
      if (descEl) {
        const d = desc[match.name] || '';
        descEl.textContent = d;
      }
      render(match.name, Number(match.chapters) || 50);
    } catch (e) {
      if (titleEl) titleEl.textContent = targetBook;
      if (descEl) descEl.textContent = '';
      render(targetBook, 50);
      // console.error(e);
    }
  })();
})();
