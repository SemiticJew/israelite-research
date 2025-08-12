// js/book.js — Tanakh book page (match NT book layout/behavior)
function getParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

document.addEventListener('DOMContentLoaded', async () => {
  const book = getParam('book');
  if (!book) return;

  // Breadcrumbs
  const bc = document.getElementById('crumbs');
  if (bc) {
    bc.setAttribute('data-bc', JSON.stringify([
      { label: 'Articles', href: '../articles.html' },
      { label: 'Texts', href: '../texts.html' },
      { label: 'The Tanakh', href: '../tanakh.html' },
      { label: book }
    ]));
    bc.classList.add('crumbs');
    bc.setAttribute('aria-label','Breadcrumb');
  }

  // Load metadata
  const [counts, descs] = await Promise.all([
    loadJSON('../data/tanakh/books.json'),
    loadJSON('../data/tanakh/descriptions.json')
  ]);

  const chapters = counts[book];
  const desc = (descs && descs[book]) || '';

  // Title + description
  document.getElementById('book-label').textContent = book;
  document.getElementById('book-title').textContent = book;
  document.getElementById('book-desc').textContent = desc;

  // Build chapter grid
  const holder = document.getElementById('chapters');
  holder.innerHTML = '';
  for (let n = 1; n <= chapters; n++) {
    const a = document.createElement('a');
    a.href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${n}`;
    a.textContent = n;
    holder.appendChild(a);
  }
});
