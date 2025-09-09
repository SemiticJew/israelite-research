/* chapter-view.js — robust mount + one-verse-per-line rendering */
(function(){
  'use strict';

  const ROOT = '/israelite-research/data';
  const PREF_KEYS = ['KJV','Text','text','Darby'];

  // ---------- Find the correct mount ----------
  function findHost(){
    // 1) Explicit container
    let host = document.getElementById('chapter-root') || document.querySelector('[data-chapter-root]');
    if (host) return host;

    // 2) Follow the "Text" heading (h2/h3) and use the next element (often where "Loading…" lives)
    const heads = Array.from(document.querySelectorAll('h2, h3'));
    const textHead = heads.find(h => h.textContent.trim().toLowerCase() === 'text');
    if (textHead) {
      // use the block immediately following the heading, or insert a fresh container
      let next = textHead.nextElementSibling;
      if (!next || next.tagName.toLowerCase() === 'script') {
        next = document.createElement('div');
        textHead.insertAdjacentElement('afterend', next);
      }
      next.id = next.id || 'chapter-root';
      return next;
    }

    // 3) Fallback: create a fresh container near the end of <main> or <body>
    const fresh = document.createElement('div');
    fresh.id = 'chapter-root';
    const main = document.querySelector('main') || document.body;
    main.appendChild(fresh);
    return fresh;
  }

  const host = findHost();
  if (!host) return;

  // ---------- Styling: each verse clearly separated ----------
  (function injectCSS(){
    const css = `
      #chapter-root .verselist{ display:block; margin:14px 0 28px; }
      #chapter-root .verse-row{ display:block; margin:.6rem 0 .9rem; padding:0 0 .6rem 0;
                                border-bottom:1px solid var(--border, rgba(0,0,0,.12)); line-height:1.8; }
      #chapter-root .verse-row:last-child{ border-bottom:1px solid var(--border, rgba(0,0,0,.12)); }
      #chapter-root .verse-num{ font-weight:800; color:var(--accent,#F17300); margin-right:.5rem; }
      #chapter-root .verse-text{ white-space:normal; }
      html[data-theme="dark"] #chapter-root .verse-row{ border-color: rgba(255,255,255,.18); }
      html[data-theme="dark"] #chapter-root .verse-text{ color:#fff; }
      #chapter-root .chapter-title{ margin:.25rem 0 .9rem; font-family:var(--ff-serif,serif); font-weight:900; }
    `;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  })();

  // ---------- Utilities ----------
  function stripArtifacts(text){
    if (!text) return '';
    return String(text)
      .replace(/\{[^}]*\}/g, '')                 // {...}
      .replace(/\[(?:H|G)\d{1,5}\]/gi,'')        // [H####]/[G####]
      .replace(/<(?:H|G)\d{1,5}>/gi,'')          // <H####>/<G####>
      .replace(/\b(?:H|G)\d{3,5}\b/gi,'')        // H#### / G####
      .replace(/<\s*\/?\s*strongs[^>]*>/gi,'')   // <strongs>
      .replace(/<\s*w[^>]*>(.*?)<\s*\/\s*w\s*>/gi,'$1') // <w>...</w>
      .replace(/<[^>]+>/g,'')                    // leftover html
      .replace(/\s{2,}/g,' ')
      .trim();
  }
  function normVerseVal(v){
    if (Array.isArray(v))  return v.map(tok => (typeof tok==='string' ? tok : (tok?.t||tok?.text||tok?.w||''))).join(' ');
    if (v && typeof v==='object') return normVerseVal(v.t || v.text || '');
    return String(v||'');
  }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  // ---------- Params & canon ----------
  const url = new URL(location.href);
  const rawBook = (url.searchParams.get('book') || '').trim();
  const chParam = parseInt(url.searchParams.get('ch') || url.searchParams.get('chapter') || '1', 10);
  if (!rawBook || !chParam || Number.isNaN(chParam)) return;

  const path = location.pathname.toLowerCase();
  const CANON =
    path.includes('/tanakh/') ? 'tanakh' :
    path.includes('/newtestament/') ? 'newtestament' :
    path.includes('/apocrypha/') ? 'apocrypha' : 'tanakh';

  function normalizeBookSlug(raw){
    let s = String(raw).toLowerCase().replace(/\s+/g,'-');
    s = s
      .replace(/^psalm$/, 'psalms')
      .replace(/^song-of-songs$/, 'song-of-solomon')
      .replace(/^canticles$/, 'song-of-solomon')
      .replace(/^ecclesiasticus$/, 'sirach')
      .replace(/^wis$/, 'wisdom')
      .replace(/^sir$/, 'sirach')
      .replace(/^judg$/, 'judges')
      .replace(/^deut$/, 'deuteronomy')
      .replace(/^1-/, 'i-').replace(/^2-/, 'ii-').replace(/^3-/, 'iii-');
    return s;
  }
  const bookSlug = normalizeBookSlug(rawBook);

  // ---------- Data ----------
  async function fetchChapter(canon, slug, ch){
    const endpoint = `${ROOT}/${canon}/${slug}/${ch}.json`;
    const res = await fetch(endpoint, {cache:'force-cache'});
    if (!res.ok) throw new Error(`Missing chapter JSON: ${endpoint}`);
    return res.json();
  }
  function pickTranslation(json){
    for (const k of PREF_KEYS){ if (json && json[k]) return json[k]; }
    if (Array.isArray(json?.verses)) return json.verses;
    return json || {};
  }

  // ---------- Render ----------
  function renderHeader(label, ch){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<h1 class="chapter-title">${escapeHtml(label)} ${ch}</h1>`;
    return wrap;
  }

  function renderVerses(trans){
    const list = document.createElement('div');
    list.className = 'verselist';

    if (trans && typeof trans === 'object' && !Array.isArray(trans)) {
      Object.keys(trans)
        .map(n=>parseInt(n,10))
        .filter(n=>!Number.isNaN(n))
        .sort((a,b)=>a-b)
        .forEach(n=>{
          const p = document.createElement('p');
          p.className = 'verse-row';
          const num = document.createElement('sup');
          num.className = 'verse-num';
          num.textContent = n;
          const text = document.createElement('span');
          text.className = 'verse-text';
          text.textContent = stripArtifacts(normVerseVal(trans[n]));
          p.appendChild(num);
          p.appendChild(text);
          list.appendChild(p);
        });
      return list;
    }

    if (Array.isArray(trans)) {
      trans.forEach(item=>{
        const vNum = item?.v ?? item?.verse ?? '';
        const p = document.createElement('p');
        p.className = 'verse-row';
        const num = document.createElement('sup');
        num.className = 'verse-num';
        num.textContent = vNum;
        const text = document.createElement('span');
        text.className = 'verse-text';
        text.textContent = stripArtifacts(normVerseVal(item?.t ?? item?.text ?? item));
        p.appendChild(num);
        p.appendChild(text);
        list.appendChild(p);
      });
      return list;
    }

    const empty = document.createElement('p');
    empty.textContent = 'No verses found.';
    return empty;
  }

  (async function main(){
    try{
      const label = rawBook
        .replace(/-/g,' ')
        .replace(/\b(i{1,3})\b/gi, m => m.toUpperCase())
        .replace(/\b\w/g, c => c.toUpperCase());

      const json = await fetchChapter(CANON, bookSlug, chParam);
      const trans = pickTranslation(json);

      // If the host currently says "Loading…", wipe it
      host.textContent = '';

      host.appendChild(renderHeader(label, chParam));
      host.appendChild(renderVerses(trans));
    } catch {
      host.textContent = 'Could not load chapter.';
    }
  })();

})();
