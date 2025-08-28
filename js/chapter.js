// js/chapter.js
// Chapter loader for Tanakh pages (GitHub Pages friendly)
// Per-verse order: [Tools] [Copy] [#] [Text]
// Tabs: Cross-Refs, Commentary, Lexicon, Strong's (compact sentence style)
// Adds Prev/Next chapter controls (auto-hide when at edges)

(function () {
  const BASE = '/israelite-research';

  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  // folder = lowercase book name, keep letters/numbers/hyphens only
  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');

  // Wire breadcrumb quickly so it shows even if content fetch is slow
  try {
    const bc = document.getElementById('breadcrumbs');
    if (bc) {
      bc.innerHTML = `
        <ol>
          <li><a href="${BASE}/index.html">Home</a></li>
          <li><a href="${BASE}/texts.html">Texts</a></li>
          <li><a href="${BASE}/tanakh.html">The Tanakh</a></li>
          <li><a href="${BASE}/tanakh/book.html?book=${encodeURIComponent(book)}">${book}</a></li>
          <li>Chapter ${chapter}</li>
        </ol>`;
    }
  } catch {}

  const titleEl  = document.getElementById('chapterTitle');
  const descEl   = document.getElementById('chapterDesc');
  const versesEl = document.getElementById('verses');

  if (titleEl) titleEl.textContent = `${book} ${chapter}`;
  if (descEl)  descEl.textContent  = '';

  const chapterUrl = `${BASE}/data/tanakh/${folder}/${chapter}.json`;
  const booksMetaUrl = `${BASE}/data/tanakh/books.json`;

  Promise.all([
    fetch(chapterUrl, { cache: 'no-store' }).then(r => (r.ok ? r.json() : Promise.reject(r))),
    fetch(booksMetaUrl, { cache: 'no-store' }).then(r => (r.ok ? r.json() : [] )).catch(() => []),
  ])
    .then(([chapterData, booksMeta]) => {
      renderChapter(chapterData);
      const totalChapters = findTotalChapters(booksMeta, book);
      buildChapterNav(book, chapter, totalChapters);
    })
    .catch(err => {
      if (versesEl) {
        versesEl.innerHTML =
          `<div class="muted">Could not load ${book} ${chapter}. Check <code>${chapterUrl}</code>.</div>`;
      }
      console.error('Chapter load error:', err);
    });

  function findTotalChapters(meta, name) {
    try {
      const m = (Array.isArray(meta) ? meta : []).find(
        b => (b.name || '').toLowerCase() === (name || '').toLowerCase()
      );
      return m && Number.isFinite(m.chapters) ? m.chapters : null;
    } catch { return null; }
  }

  function renderChapter(data) {
    if (!versesEl) return;
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();

    data.verses.forEach(v => {
      const row = el('div', 'verse-row');
      // Grid: [Tools] [Copy] [#] [Text]
      row.style.display = 'grid';
      row.style.gridTemplateColumns = 'auto auto 44px 1fr';
      row.style.gap = '0.6rem';
      row.style.alignItems = 'start';
      row.id = `v${v.num}`;

      // Tools button (leftmost) — blue background #054A91, subtle hover lift
      const toolsBtn = el('button', 'tools-btn', 'Tools ▾');
      toolsBtn.type = 'button';
      toolsBtn.setAttribute('aria-expanded', 'false');
      toolsBtn.style.background = '#054A91';
      toolsBtn.style.color = '#fff';
      toolsBtn.style.border = 'none';
      toolsBtn.style.borderRadius = '8px';
      toolsBtn.style.padding = '.25rem .6rem';
      toolsBtn.style.cursor = 'pointer';
      toolsBtn.style.transition = 'transform .12s ease';
      toolsBtn.addEventListener('mouseenter', () => toolsBtn.style.transform = 'translateY(-1px)');
      toolsBtn.addEventListener('mouseleave', () => toolsBtn.style.transform = '');

      // Copy button (icon)
      const copyBtn = el('button', 'copy-btn');
      copyBtn.type = 'button';
      copyBtn.title = 'Copy verse';
      copyBtn.style.border = '1px solid #e6ebf2';
      copyBtn.style.background = '#fff';
      copyBtn.style.borderRadius = '8px';
      copyBtn.style.padding = '.25rem .45rem';
      copyBtn.style.cursor = 'pointer';
      copyBtn.style.display = 'inline-flex';
      copyBtn.style.alignItems = 'center';
      copyBtn.style.justifyContent = 'center';
      copyBtn.style.lineHeight = '1';
      copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="#054A91" d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
      `;

      // Verse number
      const num = el('div', 'vnum', String(v.num));
      num.style.fontWeight = '700';
      num.style.color = '#666';
      num.style.textAlign = 'center';

      // Verse text
      const txt = el('div', 'vtext', v.text || '');
      txt.style.lineHeight = '1.6';

      // Tools panel (tabs)
      const panel = buildToolsPanel(v, { book, chapter });
      panel.hidden = true;
      panel.style.gridColumn = '1 / -1'; // full width row when opened
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
          flash(copyBtn, '⎘');
        }
      });

      // Append in required order
      row.append(toolsBtn, copyBtn, num, txt, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }

  // ------- chapter navigation (Prev / Next) -------

  function buildChapterNav(book, chapter, totalChapters) {
    const main = document.querySelector('main') || document.body;
    const nav = document.createElement('div');
    nav.className = 'chapter-nav';
    nav.style.display = 'flex';
    nav.style.justifyContent = 'space-between';
    nav.style.gap = '1rem';
    nav.style.margin = '1.25rem 0';

    // Prev button (left)
    const prev = document.createElement('a');
    prev.id = 'prevChapter';
    prev.className = 'nav-btn prev';
    prev.textContent = '← Previous';
    prev.href = `${BASE}/tanakh/chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter - 1}`;
    styleNavBtn(prev);

    // Next button (right)
    const next = document.createElement('a');
    next.id = 'nextChapter';
    next.className = 'nav-btn next';
    next.textContent = `Next: Chapter ${chapter + 1} →`;
    next.href = `${BASE}/tanakh/chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter + 1}`;
    styleNavBtn(next);

    // Hide logic
    // If first chapter, hide Prev
    if (chapter <= 1) prev.style.display = 'none';
    // If we know totalChapters and we're at the end, hide Next
    if (Number.isFinite(totalChapters) && chapter >= totalChapters) next.style.display = 'none';
    // If only one chapter, hide both
    if (Number.isFinite(totalChapters) && totalChapters <= 1) {
      prev.style.display = 'none';
      next.style.display = 'none';
    }

    nav.append(prev, next);
    main.appendChild(nav);
  }

  function styleNavBtn(a) {
    a.style.display = 'inline-block';
    a.style.padding = '.4rem .7rem';
    a.style.border = '1px solid #e6ebf2';
    a.style.borderRadius = '10px';
    a.style.background = '#fff';
    a.style.color = '#054A91';
    a.style.textDecoration = 'none';
    a.style.transition = 'transform .12s ease, box-shadow .12s ease';
    a.addEventListener('mouseenter', () => {
      a.style.transform = 'translateY(-1px)';
      a.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)';
    });
    a.addEventListener('mouseleave', () => {
      a.style.transform = '';
      a.style.boxShadow = '';
    });
  }

  // ------- helpers -------

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function flash(btn, msg) {
    const old = btn.innerHTML;
    btn.innerHTML = msg;
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
      ['Lexicon', buildLexicon(v)],
      ['Strong’s', buildStrongsSentence(v)],
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
        a.style.color = '#054A91';
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
    save.addEventListener('click', () => {
      localStorage.setItem(key, ta.value.trim());
      flash(save, 'Saved');
    });

    box.append(ta, save);
    return box;
  }

  // Lexicon: compact list from v.strongs (if present)
  function buildLexicon(v) {
    const box = el('div');
    const arr = Array.isArray(v.strongs) ? v.strongs : [];
    if (!arr.length) {
      box.innerHTML = `<div class="muted">—</div>`;
      return box;
    }
    const ul = document.createElement('ul');
    ul.style.margin = '0';
    ul.style.paddingLeft = '1rem';
    arr.forEach(s => {
      const li = document.createElement('li');
      const num = s.num || '';
      const lemma = s.lemma || '';
      const gloss = s.gloss || '';
      li.textContent = `${num} — ${lemma}${gloss ? `: ${gloss}` : ''}`;
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  // Strong's: one compact sentence line with tokens (hover for detail)
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

      const num = s.num || '';
      const lemma = s.lemma || '';
      const gloss = s.gloss || '';

      span.title = `${num} — ${lemma}${gloss ? `: ${gloss}` : ''}`;
      span.textContent = `${num}${lemma ? ` (${lemma}` : ''}${gloss ? ` — ${gloss}` : ''}${lemma ? `)` : ''}`;

      p.appendChild(span);
      if (i !== arr.length - 1) p.appendChild(document.createTextNode('; '));
    });

    box.appendChild(p);
    return box;
  }
})();
