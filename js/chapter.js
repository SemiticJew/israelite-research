// Get book name from URL
const urlParams = new URLSearchParams(window.location.search);
const bookNameParam = urlParams.get('book');

// Normalize function to strip spaces and lowercase
function normalizeName(name) {
  return name.replace(/\s+/g, '').toLowerCase();
}

// Fetch book list and find matching book ignoring spaces/case
fetch('../data/tanakh/books.json')
  .then(response => response.json())
  .then(books => {
    const book = books.find(b => normalizeName(b.name) === normalizeName(bookNameParam));

    if (!book) {
      console.error(`Book "${bookNameParam}" not found in books.json`);
      return;
    }

    const grid = document.getElementById('chapter-grid');
    if (!grid) {
      console.error('Chapter grid container not found');
      return;
    }

    for (let i = 1; i <= book.chapters; i++) {
      const link = document.createElement('a');
      link.href = `chapter.html?book=${encodeURIComponent(book.name)}&chapter=${i}`;
      link.textContent = i;
      grid.appendChild(link);
    }
  })
  .catch(err => console.error('Error loading books:', err));
