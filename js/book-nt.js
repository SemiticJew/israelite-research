<script>
// Robust NT book loader (tolerates case and plural "Revelations")
(function(){
  const BASE = '/israelite-research';

  const qs = new URLSearchParams(location.search);
  const rawBook = qs.get('book') || 'Revelation';

  // Normalizer used for matching
  function norm(s){
    return String(s || '')
      .toLowerCase()
      .replace(/revelations/,'revelation') // common variant
      .replace(/[^a-z0-9]/g,'');           // strip spaces/punct
  }

  const want = norm(rawBook);

  const booksUrl = `${BASE}/data/newtestament/books.json`;

  fetch(booksUrl, { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      const list = Array.isArray(data) ? data : (data.books || []);
      if (!Array.isArray(list) || !list.length) throw new Error('No books array');

      // Find by normalized name; also accept abbr match
      let book = list.find(b => norm(b.name) === want)
              || list.find(b => norm(b.abbr) === want);

      if (!book) {
        throw new Error(`Book "${rawBook}" not found in data/newtestament/books.json`);
      }

      const chapters = (book.Chapters != null ? book.Chapters : book.chapters) || 0;

      // Page chrome
      const h1 = document.getElementById('bookTitle');
      const sub = document.getElementById('bookSubtitle');
      if (h1) h1.textContent = book.name;
      if (sub && book.date) sub.textContent = `Approx. date: ${book.date}`;

      // Breadcrumbs (under hero)
      const bc = document.getElementById('breadcrumbs');
      if (bc){
        bc.innerHTML = `
          <ol>
            <li><a href="${BASE}/index.html">Home</a></li>
            <li><a href="${BASE}/texts.html">Texts</a></li>
            <li><a href="${BASE}/newtestament.html">New Testament</a></li>
            <li>${book.name}</li>
          </ol>`;
      }

      // Build chapter grid
      const grid = document.getElementById('chaptersGrid');
      if (grid){
        const frag = document.createDocumentFragment();
        for (let i=1;i<=chapters;i++){
          const a = document.createElement('a');
          a.className = 'chapter-pill';
          a.href = `${BASE}/newtestament/chapter.html?book=${encodeURIComponent(book.name)}&chapter=${i}`;
          a.textContent = i;
          frag.appendChild(a);
        }
        grid.innerHTML = '';
        grid.appendChild(frag);
      }
    })
    .catch(err => {
      const grid = document.getElementById('chaptersGrid');
      if (grid){
        grid.innerHTML = `<div class="muted">Book not found. Check your URL “book=” value and that it matches the “name” field in <code>data/newtestament/books.json</code>.</div>`;
      }
      console.error(err);
    });
})();
</script>
