// js/breadcrumbs.js — first crumb = current section; clean labels; all links clickable
(() => {
  const BASE = '/israelite-research/'; // GitHub Pages repo root
  const wrap = document.getElementById('breadcrumbs');
  if (!wrap) return;

  const path = location.pathname.toLowerCase();
  const params = new URLSearchParams(location.search);
  const rawBook = (params.get('book') || '').trim();
  const chapter = (params.get('chapter') || '').trim();
  const verse =
    (location.hash.match(/^#v(\d+)$/i) || [])[1] ||
    (params.get('verse') || '').trim();

  const norm = s => s.toString().trim().toLowerCase().replace(/\s+/g, '');

  // Section detection
  let sectionKey = 'home';
  if (path.endsWith('/articles.html') || path.includes('/articles/') || path.endsWith('/index.html') || path === BASE) {
    sectionKey = 'articles';
  } else if (path.endsWith('/texts.html')) {
    sectionKey = 'texts';
  } else if (path.endsWith('/tanakh.html') || path.includes('/tanakh/')) {
    sectionKey = 'texts-tanakh';
  } else if (path.endsWith('/newtestament.html') || path.includes('/newtestament/')) {
    sectionKey = 'texts-nt';
  } else if (path.endsWith('/apocrypha.html') || path.includes('/apocrypha/')) {
    sectionKey = 'texts-ap';
  } else if (path.endsWith('/apologetics.html') || path.includes('/apologetics/')) {
    sectionKey = 'apologetics';
  } else if (path.endsWith('/events.html')) {
    sectionKey = 'events';
  } else if (path.endsWith('/podcast.html')) {
    sectionKey = 'podcast';
  } else if (path.endsWith('/donate.html')) {
    sectionKey = 'donations';
  } else if (path.endsWith('/biblical_references.html') || path.endsWith('/biblicalreference.html')) {
    sectionKey = 'refs';
  } else if (path.endsWith('/extra-biblical-sources.html')) {
    sectionKey = 'extra';
  }

  // Static first-crumb map
  const FIRST = {
    'articles':   { label: 'Articles',   href: `${BASE}articles.html` },
    'texts':      { label: 'Texts',      href: `${BASE}texts.html` },
    'texts-tanakh': { label: 'Texts',    href: `${BASE}texts.html` },
    'texts-nt':     { label: 'Texts',    href: `${BASE}texts.html` },
    'texts-ap':     { label: 'Texts',    href: `${BASE}texts.html` },
    'apologetics':{ label: 'Apologetics',href: `${BASE}apologetics.html` },
    'events':     { label: 'Events',     href: `${BASE}events.html` },
    'podcast':    { label: 'Podcast',    href: `${BASE}podcast.html` },
    'donations':  { label: 'Donations',  href: `${BASE}donate.html` },
    'refs':       { label: 'Bible References', href: `${BASE}biblical_references.html` },
    'extra':      { label: 'Extra-Biblical Sources', href: `${BASE}extra-biblical-sources.html` },
    'home':       { label: 'Articles',   href: `${BASE}articles.html` } // fallback
  };

  // For Texts sub-sections, add the section crumb after "Texts"
  const SUBSECT = {
    'texts-tanakh': { label: 'The Tanakh',       href: `${BASE}tanakh.html`,       root: 'tanakh' },
    'texts-nt':     { label: 'The New Testament',href: `${BASE}newtestament.html`, root: 'newtestament' },
    'texts-ap':     { label: 'The Apocrypha',    href: `${BASE}apocrypha.html`,    root: 'apocrypha' }
  };

  async function getBookDisplayName(root, folder) {
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
      } catch(_) {}
    }
    // Fallback: humanize folder (e.g., 1john -> 1 John)
    return folder
      .replace(/^(\d)([a-z])/, (_, d, ch) => `${d} ${ch.toUpperCase()}`)
      .replace(/^[a-z]/, m => m.toUpperCase());
  }

  async function build() {
    const crumbs = [];

    // First crumb is always the detected section
    const first = FIRST[sectionKey] || FIRST.home;
    if (first) crumbs.push(first);

    // If it's a Texts subsection, append the subsection crumb
    const sub = SUBSECT[sectionKey];
    if (sub) crumbs.push({ label: sub.label, href: sub.href });

    // If we're on a book/chapter page under Texts, append Book → Chapter → Verse
    if (sub && rawBook) {
      const folder = norm(rawBook);
      const bookLabel = await getBookDisplayName(sub.root, folder);
      crumbs.push({
        label: bookLabel || rawBook,
        href: `${BASE}${sub.root}/book.html?book=${encodeURIComponent(folder)}`
      });

      if (chapter) {
        crumbs.push({
          label: 'Chapter',
          href: `${BASE}${sub.root}/chapter.html?book=${encodeURIComponent(folder)}&chapter=${encodeURIComponent(chapter)}`
        });
        if (verse) {
          crumbs.push({
            label: 'Verse',
            href: `${BASE}${sub.root}/chapter.html?book=${encodeURIComponent(folder)}&chapter=${encodeURIComponent(chapter)}#v${verse}`
          });
        }
      }
    }

    // Render horizontally (CSS handled by your page/global styles)
    const ol = document.createElement('ol');
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
