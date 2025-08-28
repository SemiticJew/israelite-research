// chapter.js — Tanakh chapter loader with Strong's labels support
(function () {
  const BASE = '/israelite-research';

  // --- URL params ---
  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  // Folder: lowercase, strip non [a-z0-9-]
  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');

  // --- DOM targets ---
  const titleEl  = document.getElementById('chapterTitle');
  const descEl   = document.getElementById('chapterDesc');
  const versesEl = document.getElementById('verses');

  titleEl && (titleEl.textContent = `${book} ${chapter}`);
  if (descEl) descEl.textContent = ''; // optional

  // --- Breadcrumbs (static pathing for GitHub Pages) ---
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
        </ol>
      `;
    }
  } catch (_) {}

  // --- Data sources ---
  const CHAPTER_URL = `${BASE}/data/tanakh/${folder}/${chapter}.json`;
  const STRONGS_URL = `${BASE}/data/strongs/labels.json`; // expects either nested {H:{ "7225": {lemma,gloss} }} or flat {"H7225": {...}}

  // --- Strong's cache ---
  let STRONGS = null;

  function loadStrongsLabels() {
    if (STRONGS) return Promise.resolve(STRONGS);
    return fetch(STRONGS_URL, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`Strong's labels HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        STRONGS = json || {};
        return STRONGS;
      })
      .catch(err => {
        console.warn("Couldn't load Strong's labels:", err);
        STRONGS = {}; // fallback to empty map
        return STRONGS;
      });
  }

  function fetchChapter() {
    return fetch(CHAPTER_URL, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`Chapter HTTP ${r.status}`);
        return r.json();
      });
  }

  // Resolve a Strong's code like "H7225" to a readable label string.
  function strongLabel(code) {
    if (!code || !STRONGS) return null;

    const c = String(code).trim();
    const letter = c[0]?.toUpperCase();
    const numRaw = c.slice(1);
    const numNoLead = numRaw.replace(/^0+/, '') || '0';

    // Support both flat and nested JSON layouts.
    // 1) flat: STRONGS["H7225"]
    let entry = STRONGS[c] || STRONGS[letter + numRaw] || STRONGS[letter + numNoLead];

    // 2) nested: STRONGS.H["7225"]
    if (!entry && STRONGS[letter] && (STRONGS[letter][numRaw] || STRONGS[letter][numNoLead])) {
      entry = STRONGS[letter][numRaw] || STRONGS[letter][numNoLead];
    }

    if (!entry) return null;

    // Accept common fields: lemma, gloss, translit, def, label
    const lemma = entry.lemma || entry.form || '';
    const gloss = entry.gloss || entry.def || entry.label || '';
    const parts = [];
    if (lemma) parts.push(lemma);
    if (gloss) parts.push(gloss);

    const text = parts.length ? `${c} — ${parts.join(' · ')}` : c;
    return { text, title: parts.join(' · ') || c };
  }

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
      txt.textContent = v.text || '';

      const btn = document.createElement('button');
      btn.className = 'tools-btn';
      btn.type = 'button';
      btn.textContent = 'Tools ▾';

      const panel = document.createElement('div');
      panel.className = 'tools';
      panel.hidden = true;

      // Cross References
      const xh = document.createElement('h4');
      xh.textContent = 'Cross References';
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

      // Commentary (editable container placeholder)
      const ch = document.createElement('h4');
      ch.textContent = 'Commentary';
      const cbody = document.createElement('div');
      cbody.className = 'muted';
      cbody.textContent = (v.commentary && v.commentary.trim()) ? v.commentary : '—';

      // Lexicon
      const lh = document.createElement('h4');
      lh.textContent = 'Lexicon';
      const lbody = document.createElement('div');
      lbody.className = 'muted';
      lbody.textContent = 'Coming soon.';

      // Strong’s (render from v.strongs if present)
      const sh = document.createElement('h4');
      sh.textContent = "Strong’s Concordance";
      const sbody = document.createElement('div');

      if (Array.isArray(v.strongs) && v.strongs.length) {
        v.strongs.forEach(code => {
          const info = strongLabel(code);
          const line = document.createElement('div');
          if (info) {
            const tag = document.createElement('span');
            tag.textContent = info.text;
            if (info.title) tag.title = info.title; // simple hover tooltip
            line.appendChild(tag);
          } else {
            line.textContent = String(code);
          }
          sbody.appendChild(line);
        });
      } else {
        sbody.innerHTML = `<div class="muted">—</div>`;
      }

      panel.append(xh, xbody, ch, cbody, lh, lbody, sh, sbody);

      btn.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        btn.textContent = panel.hidden ? 'Tools ▾' : 'Tools ▴';
      });

      row.append(num, txt, btn, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }

  // Load Strong's labels + chapter, then render
  Promise.all([loadStrongsLabels(), fetchChapter()])
    .then(([, data]) => renderChapter(data))
    .catch(err => {
      versesEl.innerHTML =
        `<div class="muted">Could not load ${book} ${chapter}. Check <code>${CHAPTER_URL}</code>.</div>`;
      console.error('Chapter load error:', err);
    });
})();
