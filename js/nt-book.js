<!-- include on /newtestament/book.html -->
<script>
(function(){
  const BASE = '/israelite-research';

  const qs   = new URLSearchParams(location.search);
  const book = qs.get('book') || '';

  const titleEl = document.getElementById('bookTitle');
  const descEl  = document.getElementById('bookDesc');
  const gridEl  = document.getElementById('chaptersGrid');

  // Breadcrumbs (under hero)
  try {
    const bc = document.getElementById('breadcrumbs');
    if (bc) {
      bc.innerHTML = `
        <ol>
          <li><a href="${BASE}/index.html">Home</a></li>
          <li><a href="${BASE}/texts.html">Texts</a></li>
          <li><a href="${BASE}/newtestament.html">New Testament</a></li>
          <li>${book || 'Book'}</li>
        </ol>`;
    }
  } catch{}

  fetch(`${BASE}/data/newtestament/books.json`, { cache: 'no-store' })
    .then(r => r.json())
    .then(({ books }) => {
      const b = books.find(x =>
        x.title.toLowerCase() === book.toLowerCase() ||
        x.slug === book.toLowerCase().replace(/\s+/g,'-')
      );
      if (!b) {
        if (titleEl) titleEl.textContent = book || 'New Testament';
        if (gridEl) gridEl.innerHTML = `<div class="muted">Book not found.</div>`;
        return;
      }
      if (titleEl) titleEl.textContent = b.title;
      if (descEl)  descEl.textContent  = `${b.author || ''} • ${b.date || ''}`.replace(/^ • | • $/g,'');

      // Chapters 1..n
      const frag = document.createDocumentFragment();
      for (let i=1; i<=b.chapters; i++){
        const a = document.createElement('a');
        a.className = 'chapter-card';
        a.href = `${BASE}/newtestament/chapter.html?book=${encodeURIComponent(b.title)}&chapter=${i}`;
        a.textContent = i;
        frag.appendChild(a);
      }
      gridEl.innerHTML = '';
      gridEl.appendChild(frag);
    })
    .catch(err=>{
      console.error(err);
      if (gridEl) gridEl.innerHTML = `<div class="muted">Could not load New Testament books.</div>`;
    });
})();
</script>
