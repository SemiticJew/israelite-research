// js/breadcrumbs.js — hyperlinks for all crumbs; no numbers in labels
(() => {
  const BASE = '/israelite-research/'; // repo root for GitHub Pages

  const wrap = document.getElementById('breadcrumbs');
  if (!wrap) return;

  const params = new URLSearchParams(location.search);
  const rawBook = params.get('book') || '';
  const chapter = params.get('chapter') || '';
  const verse =
    (location.hash.match(/^#v(\d+)$/i) || [])[1] ||
    params.get('verse') ||
    '';

  const norm = s => s.toString().trim().toLowerCase().replace(/\s+/g, '');

  // Detect section from path
  const path = location.pathname.toLowerCase();
  let section = null, sectionHref = null, dataRoot = null;
  if (path.endsWith('/tanakh.html') || path.includes('/tanakh/')) {
    section = 'The Tanakh'; sectionHref = `${BASE}tanakh.html`; dataRoot = 'tanakh';
  } else if (path.endsWith('/newtestament.html') || path.includes('/newtestament/')) {
    section = 'The New Testament'; sectionHref = `${BASE}newtestament.html`; dataRoot = 'newtestament';
  } else if (path.endsWith('/apocrypha.html') || path.includes('/apocrypha/')) {
    section = 'The Apocrypha'; sectionHref = `${BASE}apocrypha.html`; dataRoot = 'apocrypha';
  }

  const bookFolder = norm(rawBook);

  async function getBookDisplayName(root, folder) {
    if (!root || !folder) return null;
    const urls = [
      `${BASE}data/${root}/${folder}/${folder}.json`, // new convention
      `${BASE}data/${root}/${folder}/book.json`       // fallback
    ];
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: 'no-cache' });
        if (r.ok) {
          const j = await r.json();
          if (j && (j.name || j.title)) return j.name || j.title;
        }
      } catch (_) {}
    }
    // Fallback humanization
    return folder
      .replace(/^(\d)([a-z])/, (_, d, ch) => `${d} ${ch.toUpperCase()}`)
      .replace(/^[a-z]/, m => m.toUpperCase());
  }

  async function build() {
    const crumbs = [];
    crumbs.push({ label: 'Texts', href: `${BASE}texts.html` });

    if (section && sectionHref) {
      crumbs.push({ label: section, href: sectionHref });
    }

    let bookLabel = null;
    if (bookFolder && dataRoot) {
      bookLabel = await getBookDisplayName(dataRoot, bookFolder);
      crumbs.push({
        label: bookLabel || (rawBook || 'Book'),
        href: `${BASE}${dataRoot}/book.html?book=${encodeURIComponent(bookFolder)}`
      });
    }

    if (chapter && dataRoot && bookFolder) {
      crumbs.push({
        label: 'Chapter',
        href: `${BASE}${dataRoot}/chapter.html?book=${encodeURIComponent(bookFolder)}&chapter=${encodeURIComponent(chapter)}`
      });
    }

    if (verse && dataRoot && bookFolder && chapter) {
      crumbs.push({
        label: 'Verse',
        href: `${BASE}${dataRoot}/chapter.html?book=${encodeURIComponent(bookFolder)}&chapter=${encodeURIComponent(chapter)}#v${verse}`
      });
    }

    // Render (all crumbs clickable)
    const ol = document.createElement('ol');
    ol.className = 'breadcrumb-list';
    crumbs.forEach(c => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = c.href || '#';
      a.textContent = c.label;
      li.appendChild(a);
      ol.appendChild(li);
    });
    wrap.innerHTML = '';
    wrap.appendChild(ol);
  }

  build();
})();
