// js/breadcrumbs.js — universal breadcrumb builder for Texts flow
(() => {
  const BASE = '/israelite-research/'; // GitHub Pages repo root

  const el = document.getElementById('breadcrumbs');
  if (!el) return;

  const params = new URLSearchParams(location.search);
  const bookParam = params.get('book');         // e.g., "genesis", "1john", etc. (no-space, lowercase recommended)
  const chapterParam = params.get('chapter');   // e.g., "1"
  const verseFromHash = (location.hash.match(/^#v(\d+)$/i) || [])[1] || params.get('verse');

  const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const bookFolder = norm(bookParam);

  // Detect section context from path
  const path = location.pathname.toLowerCase();

  // Section resolver
  let sectionLabel = null;
  let sectionHref = null;
  let dataRoot = null; // 'tanakh' | 'newtestament' | 'apocrypha' (future)

  if (path.endsWith('/tanakh.html') || path.includes('/tanakh/')) {
    sectionLabel = 'The Tanakh';
    sectionHref = `${BASE}tanakh.html`;
    dataRoot = 'tanakh';
  } else if (path.endsWith('/newtestament.html') || path.includes('/newtestament/')) {
    sectionLabel = 'The New Testament';
    sectionHref = `${BASE}newtestament.html`;
    dataRoot = 'newtestament';
  } else if (path.endsWith('/apocrypha.html') || path.includes('/apocrypha/')) {
    sectionLabel = 'The Apocrypha';
    sectionHref = `${BASE}apocrypha.html`;
    dataRoot = 'apocrypha'; // if/when you add data
  }

  // Helper: try to fetch display name from the book's metadata (BookName.json)
  async function getBookDisplayName(root, folder) {
    if (!root || !folder) return null;
    const metaUrls = [
      `${BASE}data/${root}/${folder}/${folder}.json`, // new convention (BookName.json == folder.json)
      `${BASE}data/${root}/${folder}/book.json`       // fallback (old)
    ];
    for (const url of metaUrls) {
      try {
        const r = await fetch(url, { cache: 'no-cache' });
        if (r.ok) {
          const j = await r.json();
          if (j && (j.name || j.title)) return j.name || j.title;
        }
      } catch (_) {}
    }
    // Fallback: humanize folder (e.g., '1john' -> '1 John', 'songofsolomon' -> 'Songofsolomon')
    return folder.replace(/^(\d)([a-z])/, (_, d, ch) => `${d} ${ch.toUpperCase()}`)  // "1john" -> "1 John"
                 .replace(/^[a-z]/, m => m.toUpperCase());                             // capitalize first letter
  }

  async function build() {
    // Start crumbs
    const crumbs = [
      { label: 'Texts', href: `${BASE}texts.html` }
    ];

    if (sectionLabel && sectionHref) {
      crumbs.push({ label: sectionLabel, href: sectionHref });
    }

    // Book-level
    let bookDisplay = null;
    if (bookFolder && dataRoot) {
      bookDisplay = await getBookDisplayName(dataRoot, bookFolder);
      crumbs.push({
        label: bookDisplay || (bookParam || 'Book'),
        href: `${BASE}${dataRoot}/book.html?book=${encodeURIComponent(bookFolder)}`
      });
    }

    // Chapter-level
    if (chapterParam && dataRoot && bookFolder) {
      crumbs.push({
        label: `Chapter ${chapterParam}`,
        href: `${BASE}${dataRoot}/chapter.html?book=${encodeURIComponent(bookFolder)}&chapter=${encodeURIComponent(chapterParam)}`
      });
    }

    // Verse-level (from #v1 or ?verse=1)
    if (verseFromHash && dataRoot && bookFolder && chapterParam) {
      crumbs.push({ label: `Verse ${verseFromHash}` });
    }

    // Render
    const ol = document.createElement('ol');
    crumbs.forEach((c, i) => {
      const li = document.createElement('li');
      if (c.href && i < crumbs.length - 1) {
        const a = document.createElement('a');
        a.href = c.href;
        a.textContent = c.label;
        li.appendChild(a);
      } else {
        li.textContent = c.label;
      }
      ol.appendChild(li);
    });

    el.innerHTML = '';
    el.appendChild(ol);
  }

  build();
})();
