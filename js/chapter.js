// /israelite-research/js/chapter.js
// Chapter loader for Tanakh/NT pages (GitHub Pages friendly)
// Order per verse: [Tools] [Copy] [#] [Text]
// Tabs: Cross-Refs, Commentary, Lexicon, Strong's (compact sentence style)
// Adds: Lexicon preloader (Hebrew/Greek) + enriched builders using global map.

(function () {
  const BASE = '/israelite-research';

  // -------- context --------
  // -------- helpers: per-book manifest (chapters count) --------
  async function fetchBookManifest(bookName, folderName, isNT) {
    // Try nested manifest first: /data/.../{folder}/{folder}.json (e.g., tanakh/exodus/exodus.json)
    const nested = `${BASE}/data/${isNT ? 'newtestament' : 'tanakh'}/${folderName}/${folderName}.json`;
    // Fallback to root manifest: /data/.../{folder}.json (e.g., tanakh/exodus.json)
    const root   = `${BASE}/data/${isNT ? 'newtestament' : 'tanakh'}/${folderName}.json`;

    for (const url of [nested, root]) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          if (j && typeof j.chapters === 'number' && j.chapters > 0) {
            return { url, name: j.name || bookName, chapters: j.chapters };
          }
        }
      } catch (_) {}
    }
    return { url: null, name: bookName, chapters: null };
  }

  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  // folder = lowercase book name, keep letters/numbers/hyphens only
  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');

  // NT set for lexicon selection
  const NT_BOOKS = new Set([
    'Matthew','Mark','Luke','John','Acts','Romans',
    '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
    '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
    'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
  ]);

  function langForBook(name) {
    // Basic heuristic: NT -> greek, else hebrew
    return NT_BOOKS.has(name) ? 'greek' : 'hebrew';
  }

  // -------- breadcrumb wiring --------
  try {
    const bc = document.getElementById('breadcrumbs');
    if (bc) {
      bc.innerHTML = `
        <ol>
          <li><a href="${BASE}/index.html">Home</a></li>
          <li><a href="${BASE}/texts.html">Texts</a></li>
          <li><a href="${BASE}/${NT_BOOKS.has(book) ? 'newtestament' : 'tanakh'}.html">${NT_BOOKS.has(book) ? 'New Testament' : 'The Tanakh'}</a></li>
          <li><a href="${BASE}/${NT_BOOKS.has(book) ? 'newtestament' : 'tanakh'}/book.html?book=${encodeURIComponent(book)}">${book}</a></li>
          <li>Chapter ${chapter}</li>
        </ol>`;
    }
  } catch {}

  const titleEl  = document.getElementById('chapterTitle');
  const descEl   = document.getElementById('chapterDesc');
  const versesEl = document.getElementById('verses');

  if (titleEl) titleEl.textContent = `${book} ${chapter}`;
  if (descEl)  descEl.textContent  = '';

  // -------- lexicon preload (with localStorage cache) --------
  const Lexicon = {
    map: null,
    loaded: false,
  };

  async function preloadLexicon(lang) {
    if (Lexicon.loaded && Lexicon.map) return Lexicon.map;

    const key = `lexicon:${lang}:v1`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        Lexicon.map = JSON.parse(cached);
        Lexicon.loaded = true;
        return Lexicon.map;
      } catch {}
    }

    const url = `${BASE}/data/lexicon/strongs-${lang}.min.json`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      Lexicon.map = data || {};
      Lexicon.loaded = true;
      // cache (best-effort)
      try { localStorage.setItem(key, JSON.stringify(Lexicon.map)); } catch {}
      return Lexicon.map;
    } catch (e) {
      // Graceful fallback if missing
      Lexicon.map = {};
      Lexicon.loaded = true;
      return Lexicon.map;
    }
  }

  // -------- load chapter JSON then render --------
  const dataUrl = `${BASE}/data/${NT_BOOKS.has(book) ? 'newtestament' : 'tanakh'}/${folder}/${chapter}.json`;

  // Begin both fetches in parallel
  const lexPromise = preloadLexicon(langForBook(book));
  const manifestPromise = fetchBookManifest(book, folder, NT_BOOKS.has(book));
  const chapPromise = fetch(dataUrl, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

  Promise.all([lexPromise, chapPromise, manifestPromise])
    .then(([lex, data, manifest]) => {
      // Attach manifest to window for debugging/use elsewhere
      window.__BOOK_MANIFEST__ = manifest;
      return renderChapter(data))
    .catch(err => {
      if (versesEl) {
        versesEl.innerHTML =
          `<div class="muted">Could not load ${book} ${chapter}. Check <code>${dataUrl}</code>.</div>`;
      }
      console.error('Chapter load error:', err);
    });

  // -------- render --------
  function renderChapter(data) {
    if (!versesEl) return;
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();

    data.verses.forEach(v => {
      const row = el('div', 'verse-row');
      // Four columns to match control order: [Tools] [Copy] [#] [Text]
      row.style.display = 'grid';
      row.style.gridTemplateColumns = 'auto auto 44px 1fr';
      row.style.gap = '0.6rem';
      row.style.alignItems = 'start';
      row.id = `v${v.num}`;

      // ------- Tools button (brand color #054A91) -------
      const toolsBtn = el('button', 'tools-btn', 'Tools ▾');
      toolsBtn.type = 'button';
      toolsBtn.setAttribute('aria-expanded', 'false');
      toolsBtn.style.background = '#054A91';
      toolsBtn.style.color = '#fff';
      toolsBtn.style.border = '1px solid #054A91';
      toolsBtn.style.borderRadius = '8px';
      toolsBtn.style.padding = '.25rem .6rem';
      toolsBtn.style.cursor = 'pointer';
      toolsBtn.style.transition = 'transform .06s ease';
      toolsBtn.addEventListener('mousedown', () => { toolsBtn.style.transform = 'translateY(1px)'; });
      toolsBtn.addEventListener('mouseup',   () => { toolsBtn.style.transform = 'translateY(0)'; });
      toolsBtn.addEventListener('mouseleave',() => { toolsBtn.style.transform = 'translateY(0)'; });

      // ------- Copy button (icon-only) -------
      const copyBtn = el('button', 'copy-btn');
      copyBtn.type = 'button';
      copyBtn.title = 'Copy verse';
      copyBtn.setAttribute('aria-label', 'Copy verse');
      copyBtn.style.display = 'inline-flex';
      copyBtn.style.alignItems = 'center';
      copyBtn.style.justifyContent = 'center';
      copyBtn.style.width = '36px';
      copyBtn.style.height = '28px';
      copyBtn.style.border = '1px solid #e6ebf2';
      copyBtn.style.background = '#fff';
      copyBtn.style.borderRadius = '8px';
      copyBtn.style.cursor = 'pointer';
      copyBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="#054A91" d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16h-9V7h9v14z"/>' +
        '</svg>';

      // ------- Verse number -------
      const num = el('div', 'vnum', String(v.num));

      // ------- Verse text -------
      const txt = el('div', 'vtext', v.text || '');
      txt.style.lineHeight = '1.6';

      // ------- Tools panel (tabs) -------
      const panel = buildToolsPanel(v, { book, chapter });
      panel.hidden = true;
      panel.style.gridColumn = '1 / -1'; // full width when opened
      panel.style.marginTop = '.5rem';
      panel.style.borderTop = '1px dashed #e0e6ef';
      panel.style.paddingTop = '.5rem';

      // Interactions
      toolsBtn.addEventListener('click', () => {
        const open = panel.hidden;
        panel.hidden = !open;
        toolsBtn.textContent = open ? 'Tools ▴' : 'Tools ▾';
        toolsBtn.setAttribute('aria-expanded', String(open));
      });

      copyBtn.addEventListener('click', async () => {
        const payload = `${book} ${chapter}:${v.num} ${v.text || ''}`.trim();
        try {
          await navigator.clipboard.writeText(payload);
          flash(copyBtn, '✓');
        } catch {
          flash(copyBtn, '⌘/Ctrl+C');
        }
      });

      // Append in requested order
      row.append(toolsBtn, copyBtn, num, txt, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);

    // Prev/Next wiring (if present in page)
    wirePrevNextControls();
  }

  // -------- helpers --------
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function flash(btn, msg) {
    const old = btn.innerHTML;
    btn.innerHTML = `<span style="font-size:12px;color:#054A91;">${msg}</span>`;
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = old;
      btn.disabled = false;
    }, 900);
  }

  // Build tabbed tools panel for one verse
  function buildToolsPanel(v, ctx) {
    const wrap = el('div', 'tools');

    // Tab header
    const tabsBar = el('div', 'tools-tabs');
    tabsBar.style.display = 'flex';
    tabsBar.style.flexWrap = 'wrap';
    tabsBar.style.gap = '.4rem';
    tabsBar.style.marginBottom = '.5rem';

    const contentWrap = el('div', 'tools-contents');

    const sections = [
      ['Cross-Refs', buildCrossRefs(v)],
      ['Commentary', buildCommentary(v, ctx)],
      ['Lexicon', buildLexicon(v)],        // uses preloaded map
      ['Strong’s', buildStrongsSentence(v)] // uses preloaded map
    ];

    const btns = sections.map(([label, content], i) => {
      const b = el('button', 'tab-btn', label);
      b.type = 'button';
      b.style.border = '1px solid #e6ebf2';
      b.style.background = '#f8fafc';
      b.style.borderRadius = '8px';
      b.style.padding = '.25rem .6rem';
      b.style.cursor = 'pointer';
      b.setAttribute('aria-controls', `pane-${label}`);
      b.addEventListener('click', () => activate(i));
      tabsBar.appendChild(b);

      content.id = `pane-${label}`;
      content.style.display = 'none';
      contentWrap.appendChild(content);
      return b;
    });

    function activate(idx) {
      sections.forEach(([, node], i) => {
        node.style.display = i === idx ? 'block' : 'none';
      });
      btns.forEach((b, i) => {
        b.style.background = i === idx ? '#fff' : '#f8fafc';
      });
    }
    activate(0); // Cross-Refs first

    wrap.append(tabsBar, contentWrap);
    return wrap;
  }

  function buildCrossRefs(v) {
    const box = el('div');
    if (Array.isArray(v.crossRefs) && v.crossRefs.length) {
      v.crossRefs.forEach(cr => {
        const a = document.createElement('a');
        a.className = 'xref';
        a.href = '#';
        a.textContent = cr.ref + (cr.note ? ` — ${cr.note}` : '');
        a.style.display = 'block';
        a.style.margin = '.15rem 0';
        box.appendChild(a);
      });
    } else {
      box.innerHTML = `<div class="muted">—</div>`;
    }
    return box;
  }

  // Commentary with localStorage save per verse
  function buildCommentary(v, { book, chapter }) {
    const key = `commentary:${book}:${chapter}:${v.num}`;

    const box = el('div');
    const ta = document.createElement('textarea');
    ta.rows = 4;
    ta.style.width = '100%';
    ta.style.border = '1px solid #e6ebf2';
    ta.style.borderRadius = '8px';
    ta.style.padding = '.5rem';
    ta.placeholder = 'Write personal commentary… (saved locally)';

    ta.value = (localStorage.getItem(key) || v.commentary || '').trim();

    const save = el('button', 'save-comm', 'Save');
    save.type = 'button';
    save.style.marginTop = '.4rem';
    save.style.border = '1px solid #e6ebf2';
    save.style.background = '#fff';
    save.style.borderRadius = '8px';
    save.style.padding = '.25rem .6rem';
    save.style.cursor = 'pointer';
    save.addEventListener('click', () => {
      localStorage.setItem(key, ta.value.trim());
      flash(save, 'Saved');
    });

    box.append(ta, save);
    return box;
  }

  // Lexicon: enriched list using preloaded map for this verse's strongs[]
  function buildLexicon(v) {
    const box = el('div');
    const arr = Array.isArray(v.strongs) ? v.strongs : [];
    if (!arr.length) {
      box.innerHTML = `<div class="muted">—</div>`;
      return box;
    }

    const seen = new Set();
    const ul = document.createElement('ul');
    ul.style.margin = '0';
    ul.style.paddingLeft = '1rem';

    arr.forEach(s => {
      const code = (s.num || '').toUpperCase();
      if (!code || seen.has(code)) return;
      seen.add(code);

      const li = document.createElement('li');
      const entry = Lexicon.map && Lexicon.map[code] || null;

      const lemma = entry?.lemma || s.lemma || '';
      const translit = entry?.translit || '';
      const pos = entry?.pos || '';
      const gloss = entry?.gloss || s.gloss || '';
      const def = entry?.def || '';

      // Hxxxx — lemma (translit) — POS — gloss : def
      li.textContent =
        `${code} — ${lemma}${translit ? ` (${translit})` : ''}` +
        `${pos ? ` — ${pos}` : ''}` +
        `${gloss ? ` — ${gloss}` : ''}` +
        `${def ? `: ${def}` : ''}`;

      ul.appendChild(li);
    });

    if (!ul.children.length) {
      box.innerHTML = `<div class="muted">—</div>`;
      return box;
    }
    box.appendChild(ul);
    return box;
  }

  // Strong's: compact sentence with hover tooltips enriched from lexicon map
  function buildStrongsSentence(v) {
    const box = el('div');
    const arr = Array.isArray(v.strongs) ? v.strongs : [];
    if (!arr.length) {
      box.innerHTML = `<div class="muted">—</div>`;
      return box;
    }
    const p = document.createElement('p');
    p.style.margin = '0';
    p.style.lineHeight = '1.6';

    arr.forEach((s, i) => {
      const span = document.createElement('span');
      span.className = 'strong-token';
      span.style.whiteSpace = 'nowrap';
      span.style.borderBottom = '1px dotted #c9d4e5';
      span.style.cursor = 'help';

      const code = (s.num || '').toUpperCase();
      const entry = Lexicon.map && Lexicon.map[code] || null;

      const lemma = entry?.lemma || s.lemma || '';
      const gloss = entry?.gloss || s.gloss || '';
      const pos = entry?.pos || '';

      span.title = `${code}${lemma ? ` — ${lemma}` : ''}${pos ? ` (${pos})` : ''}${gloss ? `: ${gloss}` : ''}`;
      span.textContent = `${code}${lemma ? ` (${lemma}` : ''}${gloss ? ` — ${gloss}` : ''}${lemma ? `)` : ''}`;

      p.appendChild(span);
      if (i !== arr.length - 1) p.appendChild(document.createTextNode('; '));
    });

    box.appendChild(p);
    return box;
  }

  // -------- prev/next controls (optional anchors in HTML) --------
  function wirePrevNextControls() {
    const prev = document.getElementById('prevChapter');
    const next = document.getElementById('nextChapter');

    if (prev || next) {
      const isNT = NT_BOOKS.has(book);
      const hrefBase = `${BASE}/${isNT ? 'newtestament' : 'tanakh'}/chapter.html?book=${encodeURIComponent(book)}`;

      if (prev) {
        if (chapter > 1) {
          prev.href = `${hrefBase}&chapter=${chapter - 1}`;
          prev.textContent = `← Chapter ${chapter - 1}`;
          prev.style.visibility = 'visible';
        } else {
          prev.style.visibility = 'hidden';
        }
      }
      if (next) {
        const maxCh = (window.__BOOK_MANIFEST__ && window.__BOOK_MANIFEST__.chapters) ? window.__BOOK_MANIFEST__.chapters : null;
        if (maxCh && chapter >= maxCh) {
          // At or beyond last chapter — hide Next
          next.style.visibility = 'hidden';
          next.removeAttribute('href');
          next.textContent = 'End of book';
        } else {
          next.href = `${hrefBase}&chapter=${chapter + 1}`;
          next.textContent = `Next: Chapter ${chapter + 1} →`;
          next.style.visibility = 'visible';
        }
      }&chapter=${chapter + 1}`;
        next.textContent = `Next: Chapter ${chapter + 1} →`;
        next.style.visibility = 'visible';
      }
    }
  }
})();