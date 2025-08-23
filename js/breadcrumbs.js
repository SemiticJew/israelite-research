// /js/breadcrumbs.js
document.addEventListener('DOMContentLoaded', () => {
  const BASE = '/israelite-research/';

  const hero = document.querySelector('.page-hero');
  let nav = document.getElementById('breadcrumbs');

  // Ensure a breadcrumb nav exists
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'breadcrumbs';
    nav.className = 'breadcrumb';
    (hero ? hero : (document.querySelector('main') || document.body))
      .insertAdjacentElement(hero ? 'afterend' : 'afterbegin', nav);
  } else {
    // Move it under the hero globally (if hero exists)
    if (hero && nav.previousElementSibling !== hero) {
      hero.insertAdjacentElement('afterend', nav);
    }
  }

  // Build list
  nav.innerHTML = '';
  const ol = document.createElement('ol');
  nav.appendChild(ol);

  const addCrumb = (href, label, isLast = false) => {
    const li = document.createElement('li');
    if (isLast || !href) {
      li.textContent = label;
    } else {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      li.appendChild(a);
    }
    ol.appendChild(li);
  };

  const titleCase = s =>
    s.replace(/[-_]/g, ' ')
     .replace(/\b\w/g, c => c.toUpperCase());

  // Always start with Home
  addCrumb(BASE, 'Home');

  // Path + params
  const pathRaw = location.pathname.replace(BASE, '').replace(/^\/+/, '');
  const segs = pathRaw.split('/').filter(Boolean);
  const params = new URLSearchParams(location.search);
  const h1 = (document.querySelector('h1')?.textContent || '').trim();

  // If root or index, done
  if (segs.length === 0 || segs[0] === 'index.html') return;

  // Simple file label map
  const FILE_LABELS = {
    'texts.html': 'Texts',
    'tanakh.html': 'The Tanakh',
    'newtestament.html': 'The New Testament',
    'apocrypha.html': 'Apocrypha',
    'apologetics.html': 'Apologetics',
    'events.html': 'Events',
    'podcast.html': 'Podcast',
    'donate.html': 'Donations',
    'biblical_references.html': 'Bible References',
    'historical-textual-variants.html': 'Historical & Textual Variants',
    'articles.html': 'Articles'
  };

  // Articles
  if (segs[0] === 'articles') {
    addCrumb(BASE + 'articles.html', 'Articles', segs.length === 1);
    if (segs.length > 1) {
      const file = segs[1].replace(/\.html?$/i, '');
      addCrumb(null, h1 || titleCase(file), true);
    }
    return;
  }

  // Tanakh
  if (segs[0] === 'tanakh') {
    addCrumb(BASE + 'texts.html', 'Texts');
    addCrumb(BASE + 'tanakh.html', 'The Tanakh');

    if (segs[1] === 'book.html') {
      const book = params.get('book');
      addCrumb(null, book || 'Book', true);
      return;
    }
    if (segs[1] === 'chapter.html') {
      const book = params.get('book');
      const ch = params.get('chapter');
      if (book) addCrumb(BASE + 'tanakh/book.html?book=' + encodeURIComponent(book), book);
      if (ch) addCrumb(null, 'Chapter ' + ch, true);
      return;
    }

    // Fallback to file label
    const label = FILE_LABELS[segs[1]] || titleCase((segs[1] || '').replace(/\.html?$/i, ''));
    if (label) addCrumb(BASE + segs.slice(0,2).join('/'), label, true);
    return;
  }

  // New Testament
  if (segs[0] === 'newtestament') {
    addCrumb(BASE + 'texts.html', 'Texts');
    addCrumb(BASE + 'newtestament.html', 'The New Testament');

    if (segs[1] === 'book.html') {
      const book = params.get('book');
      addCrumb(null, book || 'Book', true);
      return;
    }
    if (segs[1] === 'chapter.html') {
      const book = params.get('book');
      const ch = params.get('chapter');
      if (book) addCrumb(BASE + 'newtestament/book.html?book=' + encodeURIComponent(book), book);
      if (ch) addCrumb(null, 'Chapter ' + ch, true);
      return;
    }

    const label = FILE_LABELS[segs[1]] || titleCase((segs[1] || '').replace(/\.html?$/i, ''));
    if (label) addCrumb(BASE + segs.slice(0,2).join('/'), label, true);
    return;
  }

  // Apocrypha / Apologetics / Events / Podcast / Donations / etc.
  const file = segs[0];
  const label = FILE_LABELS[file] || titleCase(file.replace(/\.html?$/i, ''));
  addCrumb(BASE + file, label, true);
});
