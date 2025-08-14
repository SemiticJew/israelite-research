// Scoped, domain-specific breadcrumbs.
// Domains: articles, texts (+ its 6 categories), apologetics, events, podcast, donations.
// For Texts categories (Tanakh/NT/Apocrypha), adds Book → Chapter → Verse.
// Labels: first alphabetic char uppercased; "Chapter"/"Verse" (no numbers in labels).

(() => {
  const BASE = '/israelite-research/';
  const wrap = document.getElementById('breadcrumbs');
  if (!wrap) return;

  const path = location.pathname.toLowerCase();
  const params = new URLSearchParams(location.search);
  const rawBook = (params.get('book') || '').trim();
  const chapter  = (params.get('chapter') || '').trim();
  const verse =
    (location.hash.match(/^#v(\d+)$/i) || [])[1] ||
    (params.get('verse') || '').trim();

  const norm = s => s.toString().trim().toLowerCase().replace(/\s+/g, '');

  // Detect domain/sectionKey (no overlap across domains)
  let sectionKey = 'home';
  const is = (end, inc='') => path.endsWith(end) || (inc && path.includes(inc));

  if (is('/articles.html') || path.endsWith('/index.html') || path === BASE || path.includes('/articles/')) {
    sectionKey = 'articles';
  } else if (is('/texts.html')) {
    sectionKey = 'texts';
  } else if (is('/tanakh.html','/tanakh/')) {
    sectionKey = 'texts-tanakh';
  } else if (is('/newtestament.html','/newtestament/')) {
    sectionKey = 'texts-nt';
  } else if (is('/apocrypha.html','/apocrypha/')) {
    sectionKey = 'texts-ap';
  } else if (is('/biblical_references.html')) {
    sectionKey = 'texts-refs';
  } else if (is('/extra-biblical-sources.html')) {
    sectionKey = 'texts-extra';
  } else if (is('/apologetics.html','/apologetics/')) {
    sectionKey = 'apologetics';
  } else if (is('/events.html')) {
    sectionKey = 'events';
  } else if (is('/podcast.html')) {
    sectionKey = 'podcast';
  } else if (is('/donate.html')) {
    sectionKey = 'donations';
  }

  // First crumb per domain
  const FIRST = {
    articles:   { label: 'Articles', href: `${BASE}articles.html` },
    texts:      { label: 'Texts', href: `${BASE}texts.html` },
    apologetics:{ label: 'Apologetics', href: `${BASE}apologetics.html` },
    events:     { label: 'Events', href: `${BASE}events.html` },
    podcast:    { label: 'Podcast', href: `${BASE}podcast.html` },
    donations:  { label: 'Donations', href: `${BASE}donate.html` },
    home:       { label: 'Articles', href: `${BASE}articles.html` },
  };

  // Texts categories (only these get appended after "Texts")
  const SUBSECT = {
    'texts-tanakh': { label: 'The Tanakh',        href: `${BASE}tanakh.html`,        root: 'tanakh' },
    'texts-nt':     { label: 'The New Testament', href: `${BASE}newtestament.html`,  root: 'newtestament' },
    'texts-ap':     { label: 'The Apocrypha',     href: `${BASE}apocrypha.html`,     root: 'apocrypha' },
    'texts-refs':   { label: 'Biblical References', href: `${BASE}biblical_references.html`, root: null },
    'texts-extra':  { label: 'Extra-Biblical Sources', href: `${BASE}extra-biblical-sources.html`, root: null },
  };

  // Pretty fallbacks for common no-space keys
  const NICE_NAME = {
    '1samuel':'1 Samuel','2samuel':'2 Samuel',
    '1kings':'1 Kings','2kings':'2 Kings',
    '1chronicles':'1 Chronicles','2chronicles':'2 Chronicles',
    '1corinthians':'1 Corinthians','2corinthians':'2 Corinthians',
    '1thessalonians':'1 Thessalonians','2thessalonians':'2 Thessalonians',
    '1peter':'1 Peter','2peter':'2 Peter',
    '1john':'1 John','2john':'2 John','3john':'3 John',
    'songofsongs':'Song of Songs','songofsolomon':'Song of Solomon'
  };

  async function getBookDisplayName(root, folder) {
    if (!root || !folder) return null;
    const urls = [
      `${BASE}data/${root}/${folder}/${folder}.json`,
      `${BASE}data/${root}/${folder}/book.json`
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
    if (NICE_NAME[folder]) return NICE_NAME[folder];
    return folder
      .replace(/^(\d)([a-z])/, (_, d, ch) => `${d} ${ch.toUpperCase()}`)
      .replace(/^[a-z]/, m => m.toUpperCase());
  }

  // Uppercase the first alphabetic character
  function firstAlphaUpper(s) {
    if (!s) return '';
    const i = s.search(/[A-Za-z]/);
    return i === -1 ? s : s.slice(0, i) + s[i].toUpperCase() + s.slice(i + 1);
  }

  function baseDomainKey(k) {
    return k.startsWith('texts-') ? 'texts' : k;
  }

  async function build() {
    const crumbs = [];

    // First crumb = current domain (no cross-domain overlap)
    const first = FIRST[baseDomainKey(sectionKey)] || FIRST.home;
    if (first) crumbs.push(first);

    // If inside Texts, append the chosen category (one of the six)
    const sub = SUBSECT[sectionKey];
    if (sub) crumbs.push({ label: sub.label, href: sub.href });

    // Only for Tanakh/NT/Apocrypha categories: Book → Chapter → Verse
    if (sub && sub.root && rawBook) {
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

    // Render horizontally (CSS handled by pages)
    const ol = document.createElement('ol');
    crumbs.forEach(c => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = c.href || '#';
      a.textContent = firstAlphaUpper(c.label);
      li.appendChild(a);
      ol.appendChild(li);
    });
    wrap.innerHTML = '';
    wrap.appendChild(ol);
  }

  build();
})();
