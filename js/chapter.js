// Robust Chapter loader for GitHub Pages + Strong's hover tooltips
(function () {
  const BASE = '/israelite-research';

  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  // folder: lowercase, strip non [a-z0-9-]
  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');

  const titleEl  = document.getElementById('chapterTitle');
  const descEl   = document.getElementById('chapterDesc');
  const versesEl = document.getElementById('verses');

  titleEl.textContent = `${book} ${chapter}`;
  descEl.textContent = '';

  // Breadcrumbs
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
  } catch (_) {}

  const url = `${BASE}/data/tanakh/${folder}/${chapter}.json`;

  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(json => renderChapter(json))
    .catch(err => {
      versesEl.innerHTML =
        `<div class="muted">Could not load ${book} ${chapter}. Check the path
         <code>${url}</code> and that <code>${chapter}.json</code> exists.</div>`;
      console.error('Chapter load error:', err);
    });

  // --- Helpers --------------------------------------------------------------

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Wrap inline [[H1234|word]] markers or a per-verse strongs[] list
  function annotateStrongs(plainText, strongsList) {
    let html = escapeHTML(plainText);

    // Track used ranges to avoid double-wrapping
    const WRAP = (word, code, gloss) =>
      `<span class="strong-term" data-code="${escapeHTML(code)}" data-def="${escapeHTML(gloss || '')}">${escapeHTML(word)}</span>`;

    // 1) Inline markers: [[H1234|word]]
    html = html.replace(/\[\[((?:H|G)\d{1,5})\|([^\]]+)\]\]/g, (_, code, word) => {
      return WRAP(word, code, '');
    });

    // 2) Per-verse array: [{ code:"H7225", match:"beginning", gloss:"beginning; first, chief" }, ...]
    if (Array.isArray(strongsList)) {
      strongsList.forEach(item => {
        if (!item || !item.code || !item.match) return;
        // replace first occurrence of the *escaped* match boundary-safely
        const esc = escapeRegExp(item.match);
        const re = new RegExp(`\\b${esc}\\b`);
        html = html.replace(re, WRAP(item.match, item.code, item.gloss || ''));
      });
    }

    return html;
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // --- Render ---------------------------------------------------------------

  function renderChapter(data) {
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();

    data.verses.forEach(v => {
      const row = document.createElement('div');
      row.className = 'verse-row';
      row.id = `v${v.num}`;

      const num = document.createElement('div');
      num.className = 'vnum';
      num.textContent = v.num;

      const txt = document.createElement('div');
      txt.className = 'vtext';
      // Convert inline markers + strongs list to tooltip spans
      txt.innerHTML = annotateStrongs(v.text || '', v.strongs);

      const btn = document.createElement('button');
      btn.className = 'tools-btn';
      btn.type = 'button';
      btn.textContent = 'Tools ▾';
      btn.setAttribute('aria-expanded', 'false');

      const panel = document.createElement('div');
      panel.className = 'tools';
      panel.hidden = true;

      // Cross references
      const xh = document.createElement('h4'); xh.textContent = 'Cross References';
      const xbody = document.createElement('div');
      if (Array.isArray(v.crossRefs) && v.crossRefs.length) {
        v.crossRefs.forEach(cr => {
          const a = document.createElement('a');
          a.className = 'xref';
          a.href = '#';
          a.textContent = cr.ref + (cr.note ? ` — ${cr.note}` : '');
          a.style.display = 'block';
          xbody.appendChild(a);
        });
      } else {
        xbody.innerHTML = `<div class="muted">—</div>`;
      }

      // Commentary (editable text area you can type in)
      const ch = document.createElement('h4'); ch.textContent = 'Commentary';
      const cwrap = document.createElement('div');
      cwrap.className = 'commentary-box';
      const ta = document.createElement('textarea');
      ta.className = 'commentary-input';
      ta.placeholder = 'Write your commentary for this verse…';
      ta.value = (v.commentary && v.commentary.trim()) ? v.commentary : '';
      // (Optional) Save hook — replace with your own persistence later
      ta.addEventListener('change', () => {
        // You can capture and save ta.value keyed by book/chapter/verse in localStorage or your backend
        try {
          const key = `commentary:${book}:${chapter}:${v.num}`;
          localStorage.setItem(key, ta.value);
        } catch (_) {}
      });
      // Load any saved draft
      try {
        const key = `commentary:${book}:${chapter}:${v.num}`;
        const saved = localStorage.getItem(key);
        if (saved !== null) ta.value = saved;
      } catch (_) {}

      cwrap.appendChild(ta);

      // Lexicon & Strong’s (placeholders for now)
      const lh = document.createElement('h4'); lh.textContent = "Lexicon";
      const lbody = document.createElement('div'); lbody.className = 'muted'; lbody.textContent = 'Coming soon.';
      const sh = document.createElement('h4'); sh.textContent = "Strong’s Concordance";
      const sbody = document.createElement('div'); sbody.className = 'muted'; sbody.textContent = 'Coming soon.';

      panel.append(xh, xbody, ch, cwrap, lh, lbody, sh, sbody);

      btn.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        btn.textContent = panel.hidden ? 'Tools ▾' : 'Tools ▴';
        btn.setAttribute('aria-expanded', String(!panel.hidden));
      });

      // Layout: number | text | tools | (panel spans full row)
      row.append(num, txt, btn, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }
})();
