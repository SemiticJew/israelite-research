// /js/chapter.js  — Tanakh chapter renderer (Tools ▸ Copy ▸ # ▸ text)
// Assumes JSON at /israelite-research/data/tanakh/<book-folder>/<chapter>.json
(function () {
  const BASE = '/israelite-research';

  // ---- tiny CSS injection so we don't have to touch styles.css ----
  (function injectStyles() {
    if (document.getElementById('chapter-inline-styles')) return;
    const css = `
    .chapter-wrap{max-width:900px;margin:0 auto;padding:1rem}
    .chapter-head{margin:0 0 1rem}
    .verses{display:flex;flex-direction:column;gap:.5rem}

    /* grid: Tools | Copy | # | text */
    .verse-row{
      display:grid; grid-template-columns:auto auto 44px 1fr;
      gap:.6rem; align-items:start; padding:.6rem .8rem;
      border:1px solid #e6ebf2; background:#fff; border-radius:12px;
    }
    .vnum{font-weight:700;color:#666;text-align:center}
    .vtext{line-height:1.65}

    .tools-btn{
      background:#3E7CB1; color:#fff; border:none; border-radius:8px;
      padding:.35rem .6rem; cursor:pointer;
      transition:transform .12s ease, box-shadow .12s ease, opacity .15s ease;
    }
    .tools-btn:hover{ transform:translateY(-1px); box-shadow:0 2px 10px rgba(0,0,0,.12); }
    .copy-btn{
      border:1px solid #e6ebf2; background:#f8fafc; color:#0b2340;
      border-radius:8px; padding:.35rem .6rem; cursor:pointer;
      transition:transform .12s ease, box-shadow .12s ease;
    }
    .copy-btn:hover{ transform:translateY(-1px); box-shadow:0 2px 8px rgba(0,0,0,.08); }

    .tools-panel{ grid-column:1 / -1; margin-top:.55rem; border-top:1px dashed #e0e6ef; padding-top:.55rem; }
    .tools-panel[hidden]{ display:none; }

    .tools-tabs{ display:flex; gap:.5rem; border-bottom:1px solid #e6ebf2; margin:.1rem 0 .6rem; }
    .tools-tab{
      border:none; background:#f6f8fb; color:#333; cursor:pointer;
      padding:.4rem .65rem; border-radius:8px 8px 0 0;
      border:1px solid transparent; border-bottom:none;
    }
    .tools-tab[aria-selected="true"]{
      background:#fff; border-color:#e6ebf2; border-bottom-color:#fff;
    }
    .tab-panel{ display:none; }
    .tab-panel.active{ display:block; }

    .xref a{ color:#054A91; text-decoration:none; }
    .xref a:hover{ text-decoration:underline; }
    .muted{ color:#666; font-size:.95rem; }

    .commentary-wrap textarea{
      width:100%; min-height:110px; padding:.6rem .7rem; border-radius:10px;
      border:1px solid #e1e7f0; resize:vertical; font:inherit; line-height:1.5;
      background:#fbfdff;
    }
    .commentary-actions{ display:flex; gap:.5rem; margin-top:.5rem; }
    .btn{
      border:1px solid #e1e7f0; background:#fff; border-radius:8px; padding:.35rem .6rem; cursor:pointer;
    }
    .btn.primary{ background:#3E7CB1; color:#fff; border-color:#3E7CB1; }

    /* Strong's widgets */
    .strongs-cloud{ display:flex; flex-wrap:wrap; gap:.35rem; }
    .strongs-badge{
      display:inline-block; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size:.85rem; background:#eef5ff; border:1px solid #d6e6ff;
      border-radius:6px; padding:.1rem .4rem; position:relative;
    }
    .strongs-badge[data-def]:hover::after{
      content:attr(data-def);
      position:absolute; left:0; bottom:120%;
      background:#fff; border:1px solid #dfe7f3; padding:.45rem .55rem;
      border-radius:10px; box-shadow:0 6px 18px rgba(0,0,0,.14);
      width:min(360px,80vw); color:#333; z-index:3;
    }`;
    const s = document.createElement('style');
    s.id = 'chapter-inline-styles';
    s.textContent = css;
    document.head.appendChild(s);
  })();

  // ---- URL + breadcrumb + targets
  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');
  const titleEl = document.getElementById('chapterTitle');
  const descEl  = document.getElementById('chapterDesc');
  const versesEl= document.getElementById('verses');

  if (titleEl) titleEl.textContent = `${book} ${chapter}`;
  if (descEl)  descEl.textContent  = '';

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

  // ---- optional Strong's lexicon preload (id → definition blob)
  let STRONGS = {};
  fetch(`${BASE}/data/strongs-lexicon.json`, { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : {}))
    .then(j => { STRONGS = j || {}; })
    .catch(() => { STRONGS = {}; });

  // ---- load chapter JSON
  const url = `${BASE}/data/tanakh/${folder}/${chapter}.json`;
  fetch(url, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(data => renderChapter(data))
    .catch(err => {
      if (versesEl) {
        versesEl.innerHTML =
          `<div class="muted">Could not load ${book} ${chapter}. Check <code>${url}</code>.</div>`;
      }
      console.error('Chapter load error:', err);
    });

  // ---- helpers
  function lsKey(vnum){ return `commentary:${book}:${chapter}:${vnum}`; }
  function getDef(id){
    const e = STRONGS && STRONGS[id];
    if (!e) return '';
    // Accept common shapes: {gloss, def}, or {definition}, etc.
    return e.def || e.definition || e.gloss || e.meaning || '';
  }

  // ---- main renderer
  function renderChapter(data){
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }
    const frag = document.createDocumentFragment();

    data.verses.forEach(v => {
      // Row shell
      const row = el('div', 'verse-row', null, { id: `v${v.num}` });

      // 1) Tools
      const btnTools = el('button', 'tools-btn', 'Tools ▾', { type: 'button', 'aria-expanded':'false' });

      // 2) Copy
      const btnCopy = el('button', 'copy-btn', 'Copy', { type:'button' });

      // 3) Verse #
      const num = el('div', 'vnum', String(v.num));

      // 4) Verse text
      const txt = el('div', 'vtext', v.text || '');

      // Panel with tabs
      const panel = el('div', 'tools-panel', null, { hidden: true });

      // Tabs
      const tabs = el('div', 'tools-tabs');
      const tabNames = ['Cross-Refs', 'Commentary', 'Lexicon', "Strong’s"];
      const panels = tabNames.map((name, i) => {
        const t = el('button', 'tools-tab', name, { type:'button', role:'tab', 'aria-selected': i===0?'true':'false' });
        tabs.appendChild(t);
        const p = el('div', 'tab-panel' + (i===0?' active':''), null, { role:'tabpanel' });
        t.addEventListener('click', () => {
          [...tabs.children].forEach(b => b.setAttribute('aria-selected','false'));
          t.setAttribute('aria-selected','true');
          [...panel.querySelectorAll('.tab-panel')].forEach(x => x.classList.remove('active'));
          p.classList.add('active');
        });
        return p;
      });

      // Cross-Refs content
      const crWrap = el('div', 'xref');
      if (Array.isArray(v.crossRefs) && v.crossRefs.length) {
        v.crossRefs.forEach(cr => {
          // Render as plain line; you can later wire to your refs page.
          const line = el('div', null, `${cr.ref}${cr.note ? ' — ' + cr.note : ''}`);
          crWrap.appendChild(line);
        });
      } else {
        crWrap.innerHTML = `<div class="muted">—</div>`;
      }
      panels[0].appendChild(crWrap);

      // Commentary content (editable; autosave to localStorage)
      const cmWrap = el('div','commentary-wrap');
      const saved = localStorage.getItem(lsKey(v.num));
      const initial = (saved!=null ? saved : (v.commentary || '')).trim();
      const ta = el('textarea'); ta.value = initial;
      const actions = el('div','commentary-actions');
      const saveBtn = el('button','btn primary','Save');
      const clearBtn= el('button','btn','Clear');
      saveBtn.addEventListener('click', () => {
        localStorage.setItem(lsKey(v.num), ta.value.trim());
        saveBtn.textContent = 'Saved ✓';
        setTimeout(() => saveBtn.textContent = 'Save', 900);
      });
      clearBtn.addEventListener('click', () => {
        ta.value=''; localStorage.removeItem(lsKey(v.num));
      });
      actions.append(saveBtn, clearBtn);
      cmWrap.append(ta, actions);
      panels[1].appendChild(cmWrap);

      // Lexicon (show badges from v.strongs if present)
      const lexWrap = el('div', 'strongs-cloud');
      if (Array.isArray(v.strongs) && v.strongs.length){
        v.strongs.forEach(id => {
          const d = getDef(id);
          const badge = el('span','strongs-badge', id, d ? {'data-def': d} : null);
          lexWrap.appendChild(badge);
        });
      } else {
        lexWrap.innerHTML = `<div class="muted">—</div>`;
      }
      panels[2].appendChild(lexWrap);

      // Strong’s details (list id + first line of def)
      const stWrap = el('div', null);
      if (Array.isArray(v.strongs) && v.strongs.length){
        v.strongs.forEach(id => {
          const d = getDef(id);
          const line = el('div', null, `${id}: ${d || '—'}`);
          stWrap.appendChild(line);
        });
      } else {
        stWrap.innerHTML = `<div class="muted">—</div>`;
      }
      panels[3].appendChild(stWrap);

      panel.append(tabs, ...panels);

      // Interactions
      btnTools.addEventListener('click', () => {
        const open = panel.hasAttribute('hidden') ? false : true;
        if (open) {
          panel.setAttribute('hidden','');
          btnTools.setAttribute('aria-expanded','false');
          btnTools.textContent = 'Tools ▾';
        } else {
          panel.removeAttribute('hidden');
          btnTools.setAttribute('aria-expanded','true');
          btnTools.textContent = 'Tools ▴';
        }
      });

      btnCopy.addEventListener('click', async () => {
        const ref = `${book} ${chapter}:${v.num}`;
        try {
          await navigator.clipboard.writeText(`${ref} — ${v.text || ''}`);
          btnCopy.textContent = 'Copied ✓';
          setTimeout(()=> btnCopy.textContent='Copy', 900);
        } catch {
          btnCopy.textContent = 'Copy (blocked)';
          setTimeout(()=> btnCopy.textContent='Copy', 1200);
        }
      });

      // Assemble: Tools | Copy | # | text | panel
      row.append(btnTools, btnCopy, num, txt, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }

  function el(tag, cls, text, attrs){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (attrs) for (const [k,v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  }
})();
