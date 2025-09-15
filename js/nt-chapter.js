/* nt-chapter.js — unified chapter loader for all canons
   - Canon/book/chapter selectors from /data/<canon>/books.json
   - Verse rows with tools: e.g. (cross refs), exposition (notes), strongs, copy icon
   - Panels open/close properly
   - Cross-references inline, semicolon-separated, small font
   - Easton dictionary: /data/dictionaries/easton_dictionary.json
   - Inserts <hr class="scripture-divider"> after each verse block
   - Robust on-hover/focus cross-ref previews via #hovercard
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
  const hover = $('#hovercard');

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
        const firstBook = Object.keys(BOOKS).sort()[0] || CANON_DEFAULTS[canon] || 'matthew';
        location.href = chapterHref(canon, firstBook, 1);
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

      const bST = document.createElement('button');
      bST.type = 'button'; bST.className = 'tool-btn'; bST.textContent = 'strongs'; bST.title = 'Strongs — lexical codes';

      tools.appendChild(bCP);
      tools.appendChild(bXR);
      tools.appendChild(bCM);
      tools.appendChild(bST);

      // panels
      const pXR = document.createElement('div');
      pXR.className = 'v-panel xr';
      const refs = (XREFS && XREFS[String(v.v)]) || [];
      if (!refs.length){
        pXR.innerHTML = '<div class="muted">No cross references.</div>';
      } else {
        const lineRefs = refs.map(r=>{
          const href = chapterHref(r.canon, r.slug, r.c) + `#v${r.v}`;
          return `<a href="${href}">${esc(prettyBook(r.slug) + ' ' + r.c + ':' + r.v)}</a>`;
        }).join('; ');
        pXR.innerHTML = `<div class="xr-line" style="font-size:.88rem">${lineRefs};</div>`;
      }

      const pCM = document.createElement('div');
      pCM.className = 'v-panel cm';
      const ta = document.createElement('textarea');
      ta.className = 'exposition-text';
      ta.setAttribute('rows','8'); // fixed height via CSS
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

      const pST = document.createElement('div');
      pST.className = 'v-panel st';
      if (Array.isArray(v.s) && v.s.length){
        const seen = new Set();
        const parts = [];
        v.s.forEach(code=>{
          if (!code || seen.has(code)) return; seen.add(code);
          parts.push(`<span class="badge" data-strong="${esc(code)}">${esc(code)}</span>`);
        });
        pST.innerHTML = parts.length ? `<div>${parts.join(' ')}</div>` : '<div class="muted">No Strong’s for this verse.</div>';
      } else {
        pST.innerHTML = '<div class="muted">No Strong’s for this verse.</div>';
      }

      // wire toggles
      bXR.addEventListener('click', ()=> togglePanel(pXR));
      bCM.addEventListener('click', ()=> togglePanel(pCM));
      bST.addEventListener('click', ()=> togglePanel(pST));

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
      row.appendChild(pST);

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

  // ---------- Hover card core ----------
  function openHover(html, x, y){
    if (!hover) return;
    hover.innerHTML = html;

    // Treat x,y as viewport (client) coordinates for position:fixed
    const pad = 16;
    const vw = window.innerWidth, vh = window.innerHeight;

    // Show to measure
    hover.style.display = 'block';
    hover.style.visibility = 'hidden';
    hover.classList.add('open');

    const r = hover.getBoundingClientRect();

    // Initial placement with small offset
    let left = (x ?? 0) + 12;
    let top  = (y ?? 0) + 12;

    // Clamp within viewport
    if (left + r.width + pad > vw) left = vw - r.width - pad;
    if (top + r.height + pad > vh) top = vh - r.height - pad;
    if (left < pad) left = pad;
    if (top  < pad) top  = pad;

    hover.style.left = left + 'px';
    hover.style.top  = top  + 'px';
    hover.style.visibility = '';
    hover.setAttribute('aria-hidden','false');
}
  function closeHover(){
    if (!hover) return;
    hover.classList.remove('open');
    hover.setAttribute('aria-hidden','true');
    hover.style.display = 'none';
  }

  // ---------- Cross-ref hover previews ----------
  async function getChapterJson(canon, slug, cnum){
    const key = `${canon}/${slug}/${cnum}`;
    if (_CHAPTER_CACHE[key]) return _CHAPTER_CACHE[key];
    try{
      const r = await fetch(CHAPTER_JSON(canon, slug, cnum));
      if (!r.ok) throw 0;
      const j = await r.json();
      _CHAPTER_CACHE[key] = j;
      return j;
    }catch{ return null; }
  }

  function parseRefFromHref(href){
    try{
      const u = new URL(href, location.origin);
      const parts = u.pathname.split('/').filter(Boolean);
      const canon = parts[1] || '';
      const qs = new URLSearchParams(u.search);
      const slug = (qs.get('book')||'').toLowerCase();
      const ch = parseInt(qs.get('ch')||'1',10) || 1;
      const v = parseInt((u.hash||'').replace(/^#v/,''),10) || 1;
      return {canon, slug, ch, v};
    }catch{ return null; }
  }

  async function showXrefPreview(a, evt){
    const ref = parseRefFromHref(a.getAttribute('href'));
    if (!ref) return;
    const data = await getChapterJson(ref.canon, ref.slug, ref.ch);
    if (!data || !Array.isArray(data.verses)) return;
    const vv = data.verses.find(x => Number(x.v) === Number(ref.v));
    const title = `${prettyBook(ref.slug)} ${ref.ch}:${ref.v}`;
    const txt = vv ? esc(vv.t||'') : 'Verse not available.';
    const html = `<div style="font-weight:700; margin-bottom:.25rem">${esc(title)}</div><div style="max-width:46ch; line-height:1.55">${txt}</div>`;

    const rect = a.getBoundingClientRect();
    // Prefer client (viewport) coordinates for fixed positioning
    const x = (evt && 'clientX' in evt) ? evt.clientX : rect.left + 4;
    const y = (evt && 'clientY' in evt) ? evt.clientY : rect.bottom + 4;

    openHover(html, x, y);
}

  if (versesEl && hover){
    let hideTimer = null;

    // Keep card open while mouse is over it
    hover.addEventListener('mouseenter', ()=> { if (hideTimer){ clearTimeout(hideTimer); hideTimer = null; }});
    hover.addEventListener('mouseleave', ()=> { hideTimer = setTimeout(closeHover, 120); });

    versesEl.addEventListener('mouseover', (e)=>{
      const a = e.target.closest('.v-panel.xr a');
      if (!a) return;
      if (e.relatedTarget && a.contains(e.relatedTarget)) return; // internal move
      if (hideTimer){ clearTimeout(hideTimer); hideTimer = null; }
      showXrefPreview(a, e);
    });
    versesEl.addEventListener('mouseout', (e)=>{
      const a = e.target.closest('.v-panel.xr a');
      if (!a) return;
      if (e.relatedTarget && a.contains(e.relatedTarget)) return; // internal move
      hideTimer = setTimeout(closeHover, 120);
    });

    // Keyboard accessibility
    versesEl.addEventListener('focusin', (e)=>{
      const a = e.target.closest('.v-panel.xr a');
      if (!a) return;
      if (hideTimer){ clearTimeout(hideTimer); hideTimer = null; }
      showXrefPreview(a, {pageX:0,pageY:0});
    });
    versesEl.addEventListener('focusout', (e)=>{
      const a = e.target.closest('.v-panel.xr a');
      if (!a) return;
      hideTimer = setTimeout(closeHover, 120);
    });
  }

  // Close on scroll or click outside
  document.addEventListener('scroll', closeHover);
  document.addEventListener('click', (e)=>{
    if (hover && !hover.contains(e.target) && !e.target.closest('.v-panel.xr')) closeHover();
  });

  // ---------- Init ----------
  (async function init(){
    const pageTitle = $('#pageTitle'); if (pageTitle) pageTitle.textContent = 'Bible Reader';
    const crumbs = $('#crumbs'); if (crumbs) crumbs.textContent = `${ctx.canon} → ${prettyBook(ctx.book)} → ${ctx.chapter}`;

    await loadBooks();
    wireToolbar();
    wireDictionary();

    await loadXrefs();
    await loadChapter();
  })();

})();
