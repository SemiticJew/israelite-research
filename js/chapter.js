// js/chapter.js
// Chapter loader for Tanakh pages (GitHub Pages friendly)
// Order per verse: [Tools] [Copy] [#] [Text]
// Tabs: Cross-Refs, Commentary, Lexicon, Strong's (compact sentence style)

(function () {
  const BASE = '/israelite-research';

  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  // folder = lowercase book name, keep letters/numbers/hyphens only
  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');

  // Wire breadcrumb (kept here so it works even if markup is minimal)
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

  const url = `${BASE}/data/tanakh/${folder}/${chapter}.json`;

  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(renderChapter)
    .catch(err => {
      if (versesEl) {
        versesEl.innerHTML =
          `<div class="muted">Could not load ${book} ${chapter}. Check <code>${url}</code>.</div>`;
      }
      console.error('Chapter load error:', err);
    });

  function renderChapter(data) {
    if (!versesEl) return;
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();

    data.verses.forEach(v => {
      const row = el('div', 'verse-row');
      // Ensure four columns to match control order
      row.style.display = 'grid';
      row.style.gridTemplateColumns = 'auto auto 44px 1fr'; // [Tools] [Copy] [#] [Text]
      row.style.gap = '0.6rem';
      row.style.alignItems = 'start';
      row.id = `v${v.num}`;

      // Tools button (leftmost)
      const toolsBtn = el('button', 'tools-btn', 'Tools ▾');
      toolsBtn.type = 'button';
      toolsBtn.setAttribute('aria-expanded', 'false');

      // Copy button
      const copyBtn = el('button', 'copy-btn', 'Copy');
      copyBtn.type = 'button';
      copyBtn.title = 'Copy verse';

      // Verse number
      const num = el('div', 'vnum', String(v.num));

      // Verse text
      const txt = el('div', 'vtext', v.text || '');

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
          flash(copyBtn, 'Copied!');
        } catch {
          flash(copyBtn, 'Press ⌘/Ctrl+C');
        }
      });

      // Append in the required order
      row.append(toolsBtn, copyBtn, num, txt, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }

  // ------- helpers -------

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function flash(btn, msg) {
    const old = btn.textContent;
    btn.textContent = msg;
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = old;
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

  // Strong's: one compact sentence line with tokens
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

// Set Next Chapter button href/text
(function(){
  const BASE = '/israelite-research';
  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  const next = document.getElementById('nextChapter');
  if (next) {
    const nextUrl = `${BASE}/tanakh/chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter+1}`;
    next.href = nextUrl;
    next.textContent = `Next: Chapter ${chapter+1} →`;
  }
})();
