/* nt-chapter.js — unified chapter loader for all canons
   - Canon/book/chapter selectors from /data/<canon>/books.json
   - Verse rows with tools: e.g. (cross refs), exposition (notes), lexicon (Strong’s), copy icon
   - Cross-references use shared /js/xref-hover.js via .xref-trigger + data-xref
   - Easton dictionary: /data/dictionaries/easton_dictionary.json (sidebar search)
   - Inserts <hr class="scripture-divider"> after each verse block
   - URL: /israelite-research/<canon>/chapter.html?book=<slug>&ch=<n>
*/
(function(){
  // ---------- Helpers ----------
  const $ = (s, r=document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function prettyBook(slug){
    return String(slug||'')
      .split('-')
      .map(w=> w ? w.charAt(0).toUpperCase() + w.slice(1) : w)
      .join(' ');
  }
  function status(msg){ const el = $('#verses'); if (el) el.innerHTML = `<p class="muted">${esc(msg)}</p>`; }
  function togglePanel(el){ if (el) el.classList.toggle('open'); }

  // ---------- DOM ----------
  const versesEl = $('#verses');

  const selCanon = $('#canonSelect');
  const selBook  = $('#bookSelect');
  const selCh    = $('#chSelect');
  const btnPrev  = $('#btnPrev');
  const btnNext  = $('#btnNext');

  const dictToggle = $('#dictToggle');
  const dictReveal = $('#dictReveal');
  const dictInput  = $('#dictQuery');
  const dictBody   = $('#dictBody');

  // ---------- Context / URLs ----------
  const CANON_DEFAULTS = { tanakh: 'genesis', newtestament: 'matthew', apocrypha: 'tobit' };

  function getCanonFromPath(){
    const p = location.pathname.toLowerCase();
    if (p.includes('/tanakh/')) return 'tanakh';
    if (p.includes('/newtestament/')) return 'newtestament';
    if (p.includes('/apocrypha/')) return 'apocrypha';
    return 'newtestament';
  }

  function getCtx(){
    const canon = getCanonFromPath();
    const q = new URLSearchParams(location.search);
    const book = (q.get('book') || CANON_DEFAULTS[canon] || 'matthew').toLowerCase();
    let ch = parseInt(q.get('ch') || q.get('c') || '1', 10); if (!Number.isFinite(ch) || ch < 1) ch = 1;
    return { canon, book, chapter: ch };
  }
  const ctx = getCtx();

  const DATA_ROOT = '/israelite-research/data';
  const BOOKS_JSON    = (canon)        => `${DATA_ROOT}/${canon}/books.json`;
  const CHAPTER_JSON  = (canon,b,c)    => `${DATA_ROOT}/${canon}/${b}/${c}.json`;
  const XREF_JSON     = (canon,b,c)    => `${DATA_ROOT}/crossrefs/${canon}/${b}/${c}.json`;
  const EASTON_JSON   = `${DATA_ROOT}/dictionaries/easton_dictionary.json`;

  function chapterHref(canon, book, ch){
    return `/israelite-research/${canon}/chapter.html?book=${book}&ch=${ch}`;
  }

  // ---------- State ----------
  let BOOKS = {};     // {slug: totalChapters}
  let TOTAL = 150;    // fallback until books.json loads
  let XREFS = null;   // {"1": [{canon,slug,c,v,label}, ...]}
  let EASTON = null;  // [{term, definitions[]}]
  const _CHAPTER_CACHE = Object.create(null);

  // ---------- Strong’s (lexicon) ----------
  const LEX_ROOT = '/israelite-research/data/lexicon';
  let STRONGS_HE = null;
  let STRONGS_GR = null;

  async function loadStrongLexicons(){
    try{
      const [he, gr] = await Promise.all([
        fetch(`${LEX_ROOT}/strongs-hebrew.json`).then(r=> r.ok ? r.json() : {}),
        fetch(`${LEX_ROOT}/strongs-greek.json`).then(r=> r.ok ? r.json() : {}),
      ]);
      STRONGS_HE = he; STRONGS_GR = gr;
    }catch{
      STRONGS_HE = STRONGS_HE || {};
      STRONGS_GR = STRONGS_GR || {};
    }
  }

  function strongsLookup(code){
    if (!code) return null;
    const m = /^([HG])(\d+)$/.exec(String(code).toUpperCase());
    if (!m) return null;
    const key = m[1] + String(parseInt(m[2],10));
    const dict = m[1] === 'H' ? STRONGS_HE : STRONGS_GR;
    return dict && dict[key] ? { code: key, ...dict[key] } : { code: key };
  }

  function strongsListRow(entry){
    if (!entry) return '';
    const { code, lemma='', translit='', gloss='' } = entry;
    const meta = [lemma, translit].filter(Boolean).join(' · ');
    const desc = gloss || '';
    return `
      <div class="lx-row" data-code="${esc(code)}" style="padding:.4rem 0;border-top:1px solid var(--sky);cursor:pointer">
        <div style="display:flex;align-items:baseline;gap:.5rem;">
          <div style="font-weight:700;color:var(--brand)">${esc(code)}</div>
          ${meta ? `<div style="font-size:.92rem">${esc(meta)}</div>` : ''}
        </div>
        ${desc ? `<div class="muted" style="font-size:.9rem;margin-top:.15rem">${esc(desc)}</div>` : ''}
      </div>`;
  }

  function strongsDetailHTML(entry){
    if (!entry) return '<div class="muted">No entry.</div>';
    const { code, lemma='', translit='', pos='', gloss='', defs=[], derivation='', strongs_def='', kjv_def='' } = entry;
    const defsHtml = Array.isArray(defs) && defs.length
      ? `<ul style="margin:.35rem 0 .2rem .95rem">${defs.slice(0,7).map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`
      : '';
    const glossLine = gloss ? `<div style="margin-top:.1rem"><em>${esc(gloss)}</em></div>` : '';
    const posLine = pos ? `<span class="badge" style="margin-left:.4rem">${esc(pos)}</span>` : '';
    const extra = `
      ${derivation ? `<div style="margin-top:.35rem"><b>Derivation:</b> ${esc(derivation)}</div>`:''}
      ${strongs_def ? `<div style="margin-top:.35rem"><b>Strong’s:</b> ${esc(strongs_def)}</div>`:''}
      ${kjv_def ? `<div style="margin-top:.35rem"><b>KJV:</b> ${esc(kjv_def)}</div>`:''}
    `;
    return `
      <div class="lx-details" data-code="${esc(code)}" style="margin:.45rem 0 .15rem;padding:.6rem;border:1px solid var(--sky);border-radius:8px;background:#f9fafb">
        <div style="font-weight:800;color:var(--brand)">${esc(code)}${posLine}</div>
        <div style="margin:.2rem 0 .1rem">
          <span dir="auto" style="font-weight:700">${esc(lemma)}</span>
          ${translit ? `<span class="muted" style="margin-left:.4rem">${esc(translit)}</span>` : ''}
        </div>
        ${glossLine}
        ${defsHtml}
        ${extra}
      </div>
    `;
  }

  function verseLexiconPanelHTML(codes){
    const uniq = Array.from(new Set((codes||[]).map(c=>String(c).toUpperCase())));
    if (!uniq.length) return '<div class="muted">No Strong’s codes for this verse.</div>';
    const rows = uniq.map(c=> strongsListRow(strongsLookup(c))).join('');
    return `
      <div>
        <div style="font-weight:800;margin:0 0 .35rem">Lexicon</div>
        ${rows}
        <div class="muted" style="margin-top:.5rem;font-size:.85rem">Click a code to expand details. Double-click the pill to collapse.</div>
      </div>`;
  }

  // ---------- Toolbar / Navigation ----------
  async function loadBooks(){
    try {
      const r = await fetch(BOOKS_JSON(ctx.canon));
      if (!r.ok) throw new Error('books.json not found');
      BOOKS = await r.json();

      // book select
      selBook.innerHTML = '';
      Object.keys(BOOKS).sort().forEach(slug=>{
        const opt = document.createElement('option');
        opt.value = slug;
        opt.textContent = prettyBook(slug);
        if (slug === ctx.book) opt.selected = true;
        selBook.appendChild(opt);
      });
      TOTAL = BOOKS[ctx.book] || TOTAL;

      // chapter select
      buildChapterSelect(TOTAL, ctx.chapter);
    } catch {
      BOOKS = {[ctx.book]: TOTAL};
      buildChapterSelect(TOTAL, ctx.chapter);
    }
  }

  function buildChapterSelect(total, current){
    selCh.innerHTML = '';
    const t = Math.max(1, total|0);
    for (let i=1;i<=t;i++){
      const o = document.createElement('option');
      o.value = i; o.textContent = `Chapter ${i}`;
      if (i === current) o.selected = true;
      selCh.appendChild(o);
    }
  }

  function wireToolbar(){
    if (selCanon){
      selCanon.value = ctx.canon;
      selCanon.addEventListener('change', ()=>{
        const canon = selCanon.value;
        const nextBook = (CANON_DEFAULTS[canon] || 'matthew').toLowerCase();
        location.href = chapterHref(canon, nextBook, 1);
      });
    }
    if (selBook){
      selBook.addEventListener('change', ()=>{
        const book = selBook.value;
        location.href = chapterHref(ctx.canon, book, 1);
      });
    }
    if (selCh){
      selCh.addEventListener('change', ()=>{
        const n = parseInt(selCh.value,10) || 1;
        location.href = chapterHref(ctx.canon, ctx.book, n);
      });
    }
    if (btnPrev){
      btnPrev.onclick = ()=>{
        const total = BOOKS[ctx.book] || TOTAL;
        const n = clamp(ctx.chapter - 1, 1, total);
        location.href = chapterHref(ctx.canon, ctx.book, n);
      };
    }
    if (btnNext){
      btnNext.onclick = ()=>{
        const total = BOOKS[ctx.book] || TOTAL;
        const n = clamp(ctx.chapter + 1, 1, total);
        location.href = chapterHref(ctx.canon, ctx.book, n);
      };
    }
  }

  // ---------- Dictionary ----------
  function wireDictionary(){
    if (!dictToggle || !dictReveal || !dictBody) return;
    dictToggle.addEventListener('click', ()=>{
      const open = dictReveal.getAttribute('data-open') === '1';
      dictReveal.style.maxHeight = open ? '0px' : '100px';
      dictReveal.setAttribute('data-open', open ? '0':'1');
      dictReveal.setAttribute('aria-hidden', open ? 'true':'false');
      if (!open) dictInput?.focus();
    });
    dictInput?.addEventListener('keydown', async (e)=>{
      if (e.key !== 'Enter') return;
      const term = (dictInput.value||'').trim();
      if (!term){ dictBody.innerHTML = '<p class="muted">Type a word, then press Enter.</p>'; return; }
      try {
        if (!EASTON){
          const r = await fetch(EASTON_JSON);
          EASTON = r.ok ? await r.json() : [];
        }
        const tnorm = term.toLowerCase();
        const hit = EASTON.find(x => (x.term||'').toLowerCase() === tnorm)
                || EASTON.find(x => (x.term||'').toLowerCase().startsWith(tnorm));
        if (!hit){ dictBody.innerHTML = `<p class="muted">No match for “${esc(term)}”.</p>`; return; }
        const defs = Array.isArray(hit.definitions) ? hit.definitions : [];
        dictBody.innerHTML = defs.length
          ? `<h4 style="margin:.2rem 0 .4rem">${esc(hit.term)}</h4>` +
            `<ol style="margin:.3rem 0 .2rem .95rem">${defs.map(d=>`<li>${esc(d)}</li>`).join('')}</ol>`
          : `<h4>${esc(hit.term)}</h4><p class="muted">No definition text.</p>`;
      } catch {
        dictBody.innerHTML = '<p class="muted">Dictionary unavailable.</p>';
      }
    });
  }

  // ---------- Rendering ----------
  let currentlyOpenLX = null; // only one lexicon panel open across the page

  function renderVerses(chJson){
    const arr = Array.isArray(chJson?.verses) ? chJson.verses : [];
    if (!arr.length){ status('Verses coming soon.'); return; }

    const storeKey = `notes:${ctx.canon}/${ctx.book}/${ctx.chapter}`;
    let notes = {};
    try { notes = JSON.parse(localStorage.getItem(storeKey)||'{}'); } catch { notes = {}; }
    let saveTimer;

    const frag = document.createDocumentFragment();

    arr.forEach(v => {
      // container
      const row = document.createElement('article');
      row.className = 'verse';
      row.id = `v${v.v}`;
      row.setAttribute('data-verse', v.v);

      // number + text line
      const line = document.createElement('div');
      line.style.display = 'flex';
      line.style.alignItems = 'flex-start';
      line.style.gap = '.5rem';

      const num = document.createElement('span');
      num.className = 'vnum';
      num.textContent = v.v;

      const txt = document.createElement('span');
      txt.className = 'vtext';
      txt.textContent = v.t || '';

      line.appendChild(num);
      line.appendChild(txt);

      // tools
      const tools = document.createElement('div');
      tools.className = 'v-tools';

      // copy button (icon)
      const bCP = document.createElement('button');
      bCP.type = 'button'; bCP.className = 'tool-btn copy-btn';
      bCP.title = 'Copy verse text'; bCP.setAttribute('aria-label','Copy verse text');
      bCP.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="4" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

      const bXR = document.createElement('button');
      bXR.type = 'button'; bXR.className = 'tool-btn'; bXR.textContent = 'e.g.'; bXR.title = 'e.g. — cross references';

      const bCM = document.createElement('button');
      bCM.type = 'button'; bCM.className = 'tool-btn'; bCM.textContent = 'exposition'; bCM.title = 'Exposition — your notes';

      // Lexicon button
      const bLX = document.createElement('button');
      bLX.type = 'button';
      bLX.className = 'tool-btn';
      bLX.textContent = 'lexicon';
      bLX.title = 'Show Strong’s entries for this verse';

      tools.appendChild(bCP);
      tools.appendChild(bXR);
      tools.appendChild(bCM);
      tools.appendChild(bLX);

      // panels
      const pXR = document.createElement('div');
      pXR.className = 'v-panel xr';
      const refs = (XREFS && XREFS[String(v.v)]) || [];
      if (!refs.length){
        pXR.innerHTML = '<div class="muted">No cross references.</div>';
      } else {
        const lineRefs = refs.map(r=>{
          const href  = chapterHref(r.canon, r.slug, r.c) + `#v${r.v}`;
          const label = `${prettyBook(r.slug)} ${r.c}:${r.v}`;
          return `<a class="xref-trigger" data-xref="${esc(label)}" href="${href}">${esc(label)}</a>`;
        }).join('; ');
        pXR.innerHTML = `<div class="xr-line" style="font-size:.88rem">${lineRefs};</div>`;
      }

      const pCM = document.createElement('div');
      pCM.className = 'v-panel cm';
      const ta = document.createElement('textarea');
      ta.className = 'exposition-text';
      ta.setAttribute('rows','8');
      ta.placeholder = 'Personal exposition for this verse…';
      ta.value = notes[v.v] || '';
      ta.addEventListener('input', ()=>{
        clearTimeout(saveTimer);
        saveTimer = setTimeout(()=>{
          notes[v.v] = ta.value.trim();
          localStorage.setItem(storeKey, JSON.stringify(notes));
        }, 250);
      });
      pCM.appendChild(ta);

      // Inline Lexicon panel (hidden until opened)
      const pLX = document.createElement('div');
      pLX.className = 'v-panel lx';
      pLX.innerHTML = '<div class="muted">No Strong’s codes for this verse.</div>';

      // wire toggles
      bXR.addEventListener('click', ()=> togglePanel(pXR));
      bCM.addEventListener('click', ()=> togglePanel(pCM));

      // Lexicon button behavior:
      //  - single-open across page (close any other open lexicon panel)
      //  - click toggles open; double-click on the pill closes if open
      bLX.addEventListener('click', ()=>{
        // close previously open panel
        if (currentlyOpenLX && currentlyOpenLX !== pLX){
          currentlyOpenLX.classList.remove('open');
        }
        // (re)render and open
        pLX.innerHTML = verseLexiconPanelHTML(v.s || []);
        pLX.classList.add('open');
        currentlyOpenLX = pLX;

        const r = pLX.getBoundingClientRect();
        if (r.bottom > window.innerHeight) pLX.scrollIntoView({behavior:'smooth', block:'nearest'});
      });
      bLX.addEventListener('dblclick', ()=>{
        if (pLX.classList.contains('open')){
          pLX.classList.remove('open');
          if (currentlyOpenLX === pLX) currentlyOpenLX = null;
        }
      });

      // delegation inside Lexicon panel: click code row → toggle one details block per verse
      pLX.addEventListener('click', (e)=>{
        const row = e.target.closest('.lx-row');
        if (!row) return;
        const code = row.getAttribute('data-code');

        // close any other open details in this panel
        [...pLX.querySelectorAll('.lx-details')].forEach(n=>n.remove());
        [...pLX.querySelectorAll('.lx-row[data-open="1"]')].forEach(r=>r.setAttribute('data-open','0'));

        const wasOpen = row.getAttribute('data-open') === '1';
        if (wasOpen){ row.setAttribute('data-open','0'); return; }

        const entry = strongsLookup(code);
        const html = strongsDetailHTML(entry);
        const det = document.createElement('div');
        det.innerHTML = html;
        row.after(det.firstElementChild);
        row.setAttribute('data-open','1');
      });

      // copy handler
      {
        const refLabel = `${prettyBook(ctx.book)} ${ctx.chapter}:${v.v}`;
        bCP.addEventListener('click', async ()=>{
          const payload = `${refLabel} ${v.t || ''}`.trim();
          try {
            await navigator.clipboard.writeText(payload);
            bCP.classList.add('copied');
            setTimeout(()=>bCP.classList.remove('copied'), 900);
          } catch {}
        });
      }

      // assemble verse block
      row.appendChild(line);
      row.appendChild(tools);
      row.appendChild(pXR);
      row.appendChild(pCM);
      row.appendChild(pLX);

      // append verse + divider
      const hr = document.createElement('hr');
      hr.className = 'scripture-divider';
      const wrap = document.createDocumentFragment();
      wrap.appendChild(row);
      wrap.appendChild(hr);
      frag.appendChild(wrap);
    });

    // clear placeholder and append all verses at once
    versesEl.innerHTML = '';
    versesEl.appendChild(frag);

    // anchor scroll
    if (location.hash && /^#v\d+$/.test(location.hash)){
      const anchor = document.getElementById(location.hash.slice(1));
      if (anchor) anchor.scrollIntoView({behavior:'instant', block:'start'});
    }
  }

  // ---------- Loaders ----------
  async function loadChapter(){
    status('Loading…');
    try {
      const r = await fetch(CHAPTER_JSON(ctx.canon, ctx.book, ctx.chapter));
      if (!r.ok) throw new Error('chapter not found');
      const json = await r.json();
      renderVerses(json);
    } catch {
      status('Verses coming soon.');
    }
  }

  async function loadXrefs(){
    try {
      const r = await fetch(XREF_JSON(ctx.canon, ctx.book, ctx.chapter));
      XREFS = r.ok ? await r.json() : null;
    } catch { XREFS = null; }
  }

  // ---------- Init ----------
  (async function init(){
    const pageTitle = $('#pageTitle'); if (pageTitle) pageTitle.textContent = 'Bible Reader';
    const crumbs = $('#crumbs'); if (crumbs) crumbs.textContent = `${ctx.canon} → ${prettyBook(ctx.book)} → ${ctx.chapter}`;

    await loadBooks();
    wireToolbar();
    wireDictionary();

    await loadStrongLexicons();
    await loadXrefs();
    await loadChapter();
  })();

})();
