/* chapter-view.js
   Renders a chapter as stacked verses using your local JSON.
   Works on:
     /tanakh/chapter.html?book=genesis&ch=1
     /newtestament/chapter.html?book=john&ch=3
     /apocrypha/chapter.html?book=wisdom&ch=2
*/

(function(){
  'use strict';

  const ROOT = '/israelite-research/data';
  const PREF_KEYS = ['KJV','Text','text','Darby']; // prefer KJV but fall back gracefully

  // Where to render
  const host =
    document.getElementById('chapter-root') ||
    document.querySelector('.chapter-root') ||
    document.querySelector('#content, main, .main, .container, body');

  if (!host) return;

  // Basic styles (lightweight, can be moved to styles.css)
  (function injectCSS(){
    const css = `
      .chapter-meta{margin:0 0 12px; color:var(--muted,#6b7280); font-size:.95rem}
      .chapter-title{margin:.25rem 0 1rem; font-family:var(--ff-serif,serif); font-weight:800; color:var(--ink,#0b2340);}
      .verselist{display:block; margin:8px 0 24px;}
      .verse-row{display:block; padding:.35rem 0; border-bottom:1px solid var(--border,rgba(0,0,0,.1));}
      .verse-row:first-child{border-top:1px solid var(--border,rgba(0,0,0,.1));}
      .verse-num{display:inline-block; min-width:2.25rem; font-weight:700; color:var(--accent,#F17300);}
      .verse-text{display:inline; color:var(--ink,#0b2340); line-height:1.6;}
      html[data-theme="dark"] .verse-row{border-color:rgba(255,255,255,.15);}
      html[data-theme="dark"] .verse-text{color:#fff;}
    `;
    const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  })();

  // Query params
  const url = new URL(location.href);
  const bookParam = (url.searchParams.get('book') || '').trim();
  const chParam   = parseInt(url.searchParams.get('ch') || url.searchParams.get('chapter') || '1', 10);

  if (!bookParam || !chParam || Number.isNaN(chParam)) return;

  // Canon detection from pathname
  const path = location.pathname.toLowerCase();
  const CANON =
    path.includes('/tanakh/') ? 'tanakh' :
    path.includes('/newtestament/') ? 'newtestament' :
    path.includes('/apocrypha/') ? 'apocrypha' : 'tanakh';

  // Slug normalization (supports roman-numeral books like ii-kings)
  function normalizeBookSlug(raw){
    let s = String(raw).toLowerCase().replace(/\s+/g,'-');
    // common aliases
    s = s
      .replace(/^psalm$/, 'psalms')
      .replace(/^song-of-songs$/, 'song-of-solomon')
      .replace(/^canticles$/, 'song-of-solomon')
      .replace(/^ecclesiasticus$/, 'sirach')
      .replace(/^wis$/, 'wisdom')
      .replace(/^sir$/, 'sirach')
      .replace(/^judg$/, 'judges')
      .replace(/^deut$/, 'deuteronomy')
      .replace(/^1-/, 'i-').replace(/^2-/, 'ii-').replace(/^3-/, 'iii-'); // arabic->roman for leading books
    return s;
  }

  const bookSlug = normalizeBookSlug(bookParam);

  // Strong's & artifact stripping
  function stripArtifacts(text){
    if (!text) return '';
    return String(text)
      .replace(/\{[^}]*\}/g, '')                 // remove {...}
      .replace(/\[(?:H|G)\d{1,5}\]/gi,'')        // [H####] [G####]
      .replace(/<(?:H|G)\d{1,5}>/gi,'')          // <H####> <G####>
      .replace(/\b(?:H|G)\d{3,5}\b/gi,'')        // H#### / G####
      .replace(/<\s*\/?\s*strongs[^>]*>/gi,'')   // <strongs> tags
      .replace(/<\s*w[^>]*>(.*?)<\s*\/\s*w\s*>/gi,'$1') // <w>...</w>
      .replace(/<[^>]+>/g,'')                    // any leftover html
      .replace(/\s{2,}/g,' ')
      .trim();
  }

  function normVerseVal(v){
    if (Array.isArray(v)) {
      return v.map(tok => (typeof tok==='string' ? tok : (tok?.t||tok?.text||tok?.w||''))).join(' ');
    }
    if (v && typeof v==='object') {
      return normVerseVal(v.t || v.text || '');
    }
    return String(v||'');
  }

  function pickTranslation(json){
    for (const k of PREF_KEYS) {
      if (json && json[k]) return json[k];
    }
    if (Array.isArray(json?.verses)) return json.verses;
    return json || {};
  }

  async function fetchChapter(canon, slug, ch){
    const url = `${ROOT}/${canon}/${slug}/${ch}.json`;
    const res = await fetch(url, {cache:'force-cache'});
    if (!res.ok) throw new Error(`Missing chapter JSON: ${url}`);
    return res.json();
  }

  function renderHeader(bookLabel, ch){
    const h = document.createElement('div');
    h.innerHTML = `
      <div class="chapter-meta">${bookLabel ? escapeHtml(bookLabel) : ''}</div>
      <h1 class="chapter-title">${escapeHtml(bookLabel)} ${ch}</h1>
    `;
    return h;
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function renderVerses(trans){
    const wrap = document.createElement('div');
    wrap.className = 'verselist';

    // Object keyed by verse number
    if (trans && typeof trans === 'object' && !Array.isArray(trans)) {
      const nums = Object.keys(trans).map(n=>parseInt(n,10)).filter(n=>!Number.isNaN(n)).sort((a,b)=>a-b);
      nums.forEach(n=>{
        const row = document.createElement('div');
        row.className = 'verse-row';
        row.innerHTML = `<span class="verse-num">${n}</span><span class="verse-text">${escapeHtml(stripArtifacts(normVerseVal(trans[n])))}</span>`;
        wrap.appendChild(row);
      });
      return wrap;
    }

    // Array of { v, t } or similar
    if (Array.isArray(trans)) {
      trans.forEach(item=>{
        const vNum = item?.v ?? item?.verse ?? null;
        const raw = item?.t ?? item?.text ?? item;
        const text = stripArtifacts(normVerseVal(raw));
        if (!text) return;
        const row = document.createElement('div');
        row.className = 'verse-row';
        row.innerHTML = `<span class="verse-num">${escapeHtml(vNum)}</span><span class="verse-text">${escapeHtml(text)}</span>`;
        wrap.appendChild(row);
      });
      return wrap;
    }

    // Fallback
    const empty = document.createElement('div');
    empty.textContent = 'No verses found.';
    return empty;
  }

  async function main(){
    try{
      // Title-cased label for heading (space/roman preserved)
      const label = bookParam
        .replace(/-/g,' ')
        .replace(/\b(i{1,3})\b/gi, m => m.toUpperCase())
        .replace(/\b\w/g, c => c.toUpperCase());

      const json = await fetchChapter(CANON, bookSlug, chParam);
      const trans = pickTranslation(json);

      // Clear host and render
      host.innerHTML = '';
      host.appendChild(renderHeader(label, chParam));
      host.appendChild(renderVerses(trans));
    } catch (e){
      host.innerHTML = '<p>Could not load chapter.</p>';
      // console.error(e);
    }
  }

  main();

})();
