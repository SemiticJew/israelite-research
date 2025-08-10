// js/book.js
(function () {
  function getParam(name) {
    const p = new URLSearchParams(location.search);
    return p.get(name) ? decodeURIComponent(p.get(name)) : null;
  }

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  }

  function renderChapters(container, bookName, count) {
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const a = document.createElement('a');
      a.className = 'chapter-tile';
      a.textContent = i;
      // Destination: chapter view (we can build chapter.html next)
      a.href = `chapter.html?book=${encodeURIComponent(bookName)}&chapter=${i}`;
      container.appendChild(a);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const book = getParam('book');
    const titleEl = document.getElementById('bookTitle');
    const crumbEl = document.getElementById('crumbBook');
    const grid = document.getElementById('chapters');
    const descEl = document.getElementById('bookDesc');

    if (!book) {
      titleEl.textContent = 'Select a Book';
      grid.innerHTML = '<p>Please open this page with ?book=BookName (e.g., book.html?book=Genesis).</p>';
      return;
    }

    try {
      const [books, descriptions] = await Promise.all([
        loadJSON('../data/tanakh/books.json'),
        loadJSON('../data/tanakh/descriptions.json')
      ]);

      const count = books[book];
      titleEl.textContent = book;
      crumbEl.textContent = book;

      // Description (if present)
      const desc = descriptions[book];
      if (desc) {
        descEl.textContent = desc;
        descEl.hidden = false;
      } else {
        descEl.hidden = true;
      }

      if (!count) {
        grid.innerHTML = '<p>Chapters not found for this book. Check the exact name in books.json.</p>';
        return;
      }
      renderChapters(grid, book, count);
    } catch (e) {
      titleEl.textContent = book || 'Book';
      grid.innerHTML = '<p>Could not load book data.</p>';
    }
  });
})();

