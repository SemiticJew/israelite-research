// Chapter loader & renderer (Tanakh) — formats Lexicon & Strong's properly
(function () {
  const BASE = '/israelite-research';

  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  // folder: lowercase, keep hyphens
  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');

  const titleEl = document.getElementById('chapterTitle');
  const descEl = document.getElementById('chapterDesc');
  const versesEl = document.getElementById('verses');

  if (titleEl) titleEl.textContent = `${book} ${chapter}`;
  if (descEl) descEl.textContent = '';

  // Breadcrumbs
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

  const url = `${BASE}/data/tanakh/${folder}/${chapter}.json`;

  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => renderChapter(data))
    .catch(err => {
      versesEl.innerHTML =
        `<div class="muted">Could not load ${book} ${chapter}. Check <code>${url}</code> exists.</div>`;
      console.error('Chapter load error:', err);
    });

  function renderChapter(data) {
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();

    data.verses.forEach(v => {
      const row = el('div', 'verse-row', { id: `v${v.num}` });

      const num = el('div', 'vnum', null, String(v.num));
      const txt = el('div', 'vtext', null, v.text || '');

      const btn = el('button', 'tools-btn', { type: 'button' }, 'Tools ▾');

      const panel = el('div', 'tools');
      panel.hidden = true;

      // Cross references
      panel.append(
        el('h4', null, null, 'Cross References'),
        renderRefs(v.crossRefs)
      );

      // Commentary (supports user typing; saved to localStorage)
      panel.append(
        el('h4', null, null, 'Commentary'),
        renderCommentary(book, chapter, v.num, v.commentary)
      );

      // Lexicon (robust formatter)
      panel.append(
        el('h4', null, null, 'Lexicon'),
        renderLexicon(v.lexicon)
      );

      // Strong's (robust formatter)
      panel.append(
        el('h4', null, null, 'Strong’s Concordance'),
        renderStrongs(v.strongs)
      );

      btn.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        btn.textContent = panel.hidden ? 'Tools ▾' : 'Tools ▴';
      });

      // Keep original order/structure
      row.append(num, txt, btn, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }

  /* ---------- helpers ---------- */

  function el(tag, className, attrs, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function renderRefs(refs) {
    if (!Array.isArray(refs) || refs.length === 0) {
      return el('div', 'muted', null, '—');
    }
    const wrap = el('div');
    refs.forEach(cr => {
      const a = el('a', 'xref', { href: '#'}, `${cr.ref}${cr.note ? ' — ' + cr.note : ''}`);
      a.style.display = 'block';
      wrap.appendChild(a);
    });
    return wrap;
  }

  function renderCommentary(book, chap, vnum, initial) {
    const key = `comm:${book}:${chap}:${vnum}`;
    const val = localStorage.getItem(key) ?? (initial || '');
    const ta = el('textarea', 'comm-input', {
      rows: '3',
      placeholder: 'Add your notes here (saved on this device)…'
    });
    ta.value = val;
    ta.addEventListener('input', () => localStorage.setItem(key, ta.value));
    return ta;
  }

  function renderLexicon(lex) {
    // Accept: string | string[] | {lemma?, headword?, definition?/gloss?, pos?}[]
    if (!lex || (Array.isArray(lex) && lex.length === 0)) {
      return el('div', 'muted', null, '—');
    }
    const wrap = el('div');
    const ul = el('ul', 'lex-list');
    (Array.isArray(lex) ? lex : [lex]).forEach(item => {
      const li = el('li');
      if (typeof item === 'string') {
        li.textContent = item;
      } else if (item && typeof item === 'object') {
        const head = item.lemma || item.headword || '';
        const def = item.definition || item.gloss || '';
        const pos = item.pos ? ` (${item.pos})` : '';
        if (head || def) {
          const headSpan = el('span', 'lex-head', null, head);
          const defSpan = el('span', 'lex-def', null, def ? ` — ${def}` : '');
          const posSpan = el('span', 'lex-pos', null, pos);
          li.append(headSpan, defSpan, posSpan);
        } else {
          li.textContent = JSON.stringify(item); // extreme fallback
        }
      } else {
        li.textContent = String(item);
      }
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function renderStrongs(arr) {
    // Accept: string[] | {num/code, lemma?, gloss?/def?}[]
    if (!arr || (Array.isArray(arr) && arr.length === 0)) {
      return el('div', 'muted', null, '—');
    }
    const wrap = el('div');
    const ul = el('ul', 'strongs-list');

    (Array.isArray(arr) ? arr : [arr]).forEach(item => {
      const li = el('li');
      if (typeof item === 'string') {
        const code = item.trim();
        const a = el('a', 'strong-code', {
          href: code ? `https://www.blueletterbible.org/lexicon/${code.toLowerCase()}/kjv/` : '#',
          target: '_blank', rel: 'noopener'
        }, code);
        li.appendChild(a);
      } else if (item && typeof item === 'object') {
        const code = item.num || item.code || '';
        const lemma = item.lemma || '';
        const gloss = item.gloss || item.def || '';
        const a = el('a', 'strong-code', {
          href: code ? `https://www.blueletterbible.org/lexicon/${String(code).toLowerCase()}/kjv/` : '#',
          target: '_blank', rel: 'noopener',
          title: (lemma || gloss) ? `${lemma}${gloss ? ' — ' + gloss : ''}` : ''
        }, code || '—');
        const lemmaSpan = el('span', 'strong-lemma', null, lemma ? ` ${lemma}` : '');
        const glossSpan = el('span', 'strong-gloss', null, gloss ? ` — ${gloss}` : '');
        li.append(a, lemmaSpan, glossSpan);
      } else {
        li.textContent = String(item);
      }
      ul.appendChild(li);
    });

    wrap.appendChild(ul);
    return wrap;
  }
})();
