/* reftagger.js — Simplified version
   Shows:
   Book + Chapter + Verses
   Text: <verses>
*/

(function(){
  'use strict';

  const CFG = Object.assign({
    bibleVersion: 'KJV',
    underlineStyle: 'dotted',
    tooltipDelay: 80,
    autodetect: true
  }, (window.refTagger && window.refTagger.settings) || {});

  const ROOT = '/israelite-research/data';
  const PREF_KEYS = [CFG.bibleVersion, 'KJV', 'Text', 'text', 'Darby'];

  // --- Basic helpers ---
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function stripStrongs(text){
    if (!text) return '';
    return String(text)
      .replace(/\{[^}]*\}/g,'')
      .replace(/\[(?:H|G)\d{1,5}\]/gi,'')
      .replace(/<(?:H|G)\d{1,5}>/gi,'')
      .replace(/\b(?:H|G)\d{3,5}\b/gi,'')
      .replace(/<[^>]+>/g,'')
      .replace(/\s{2,}/g,' ')
      .trim();
  }
  function normVerseVal(v){
    if (Array.isArray(v)) return v.map(tok => typeof tok==='string'? tok : (tok?.t||tok?.text||tok?.w||'')).join(' ');
    if (v && typeof v==='object') return normVerseVal(v.t || v.text || '');
    return String(v||'');
  }

  // --- Canon mapping (minimal) ---
  const BOOK_MAP = {
    '2Tim':'2-Timothy','II Tim':'2-Timothy','2 Timothy':'2-Timothy','II Timothy':'2-Timothy',
    '1Tim':'1-Timothy','I Tim':'1-Timothy','1 Timothy':'1-Timothy','I Timothy':'1-Timothy',
    'Gen':'Genesis','Genesis':'Genesis','Ps':'Psalms','Psalm':'Psalms','Psalms':'Psalms',
    'John':'John','Jn':'John','Rom':'Romans','Romans':'Romans',
    'II':'2','III':'3','I':'1'
    // add more as needed
  };

  function resolveBookCanonical(tokenRaw){
    if (BOOK_MAP[tokenRaw]) return BOOK_MAP[tokenRaw];
    return tokenRaw.charAt(0).toUpperCase()+tokenRaw.slice(1).toLowerCase();
  }

  // --- Parse refs ---
  function cleanRef(s){
    return s.replace(/^[\s\(\[]+/, '').replace(/[\s\)\]]+$/, '').replace(/\s{2,}/g,' ').trim();
  }
  function parseRef(ref){
    ref = cleanRef(ref);
    const m = /^(.+?)\s+(\d+)(?::([\d,\-\s]+))?$/.exec(ref);
    if (!m) return null;
    const book = resolveBookCanonical(m[1].trim());
    const chapter = parseInt(m[2],10);
    const verses = m[3] ? m[3].trim() : '';
    return { book, chapter, verses };
  }

  // --- Data fetching ---
  const chapterCache = new Map();
  async function getChapter(book, chapter){
    const slug = book.toLowerCase().replace(/\s+/g,'-');
    const url  = `${ROOT}/newtestament/${slug}/${chapter}.json`; // adjust per canon if needed
    const key = `${book}|${chapter}`;
    if (chapterCache.has(key)) return chapterCache.get(key);
    const res = await fetch(url); if (!res.ok) throw new Error('Missing '+url);
    const json = await res.json();
    chapterCache.set(key,json); return json;
  }
  function pickTranslation(json){
    for (const k of PREF_KEYS){ if (json && json[k]) return json[k]; }
    if (Array.isArray(json.verses)) return json.verses;
    return json;
  }

  // --- UI ---
  let hc;
  function ensureCard(){
    if (hc) return hc;
    hc = document.createElement('div');
    hc.id='bible-hovercard'; hc.className='refcard'; hc.setAttribute('aria-hidden','true');
    hc.innerHTML = `<div class="refcard-inner">
      <div class="refcard-head"><span class="refcard-ref"></span><button class="refcard-close">&times;</button></div>
      <div class="refcard-body"></div></div>`;
    document.body.appendChild(hc);
    hc.querySelector('.refcard-close').addEventListener('click',()=>hide());
    return hc;
  }
  function show(el, html, refLabel){
    const card=ensureCard();
    card.querySelector('.refcard-ref').textContent = refLabel;
    card.querySelector('.refcard-body').innerHTML = html;
    card.style.opacity='1'; card.setAttribute('aria-hidden','false');
    const r=el.getBoundingClientRect();
    card.style.top=(window.scrollY+r.bottom+8)+'px';
    card.style.left=(window.scrollX+r.left)+'px';
  }
  function hide(){ if(hc){ hc.style.opacity='0'; hc.setAttribute('aria-hidden','true'); } }

  async function render(el,ref){
    try{
      const p=parseRef(ref); if(!p){show(el,'Could not parse',ref);return;}
      const json=await getChapter(p.book,p.chapter);
      const trans=pickTranslation(json);

      let versesOut=[];
      if (p.verses){
        const parts=p.verses.split(/[,]/).map(x=>x.trim());
        for(const seg of parts){
          if (seg.includes('-')){
            const [a,b]=seg.split('-').map(n=>parseInt(n,10));
            for(let v=a;v<=b;v++){
              const raw = trans[v]||''; const txt=stripStrongs(normVerseVal(raw));
              if (txt) versesOut.push(`${v} ${txt}`);
            }
          } else {
            const v=parseInt(seg,10);
            const raw = trans[v]||''; const txt=stripStrongs(normVerseVal(raw));
            if (txt) versesOut.push(`${v} ${txt}`);
          }
        }
      } else {
        // whole chapter fallback
        versesOut.push('[Chapter text omitted]');
      }

      const refLabel = `${p.book} ${p.chapter}${p.verses?', '+p.verses:''}`;
      const html = `<div><strong>Text:</strong><br>${versesOut.join(' ')}</div>`;
      show(el,html,refLabel);
    }catch(e){ show(el,'Could not load',ref); }
  }

  function bindEl(el){
    const ref=cleanRef(el.dataset.ref||el.textContent||'');
    el.classList.add('reftag');
    el.addEventListener('mouseenter',()=>render(el,ref));
    el.addEventListener('mouseleave',()=>hide());
    el.addEventListener('click',e=>e.preventDefault());
  }

  function init(){
    document.querySelectorAll('.verse[data-ref],.bible-ref[data-ref]').forEach(bindEl);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

  // Styles
  const css=`
    .reftag{ color:#054A91; font-weight:600; text-decoration:underline dotted; cursor:pointer; }
    #bible-hovercard.refcard{position:absolute; max-width:520px; z-index:9999; padding:10px;
      border-radius:8px; border:1px solid #ccc; box-shadow:0 4px 16px rgba(0,0,0,.2);
      background:#fff; color:#000; opacity:0; transition:opacity .12s ease;}
    .refcard-inner{font-size:14px; line-height:1.4;}
    .refcard-head{display:flex; justify-content:space-between; font-weight:700; margin-bottom:4px;}
    .refcard-ref{color:#054A91;}
    .refcard-close{background:none; border:0; cursor:pointer; font-size:16px;}
  `;
  const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

})();
