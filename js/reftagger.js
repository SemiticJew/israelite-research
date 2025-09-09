/* reftagger.js
   Site-local "RefTagger"-style hovercards using your own JSON data.
   - Reads window.refTagger.settings
   - Works with <span class="verse" data-ref="..."> and auto-detects plain text citations
   - Uses lowercase, hyphenated, roman-numeral slugs
   - Strips Strong’s numbers/tags from shown text
*/

(function(){
  'use strict';

  // ---------------- Settings ----------------
  const CFG = Object.assign({
    bibleVersion: 'KJV',
    underlineStyle: 'dotted',
    showIcon: true,
    tooltipDelay: 80,
    theme: 'auto',
    autodetect: true,
    clickBehavior: 'none'
  }, (window.refTagger && window.refTagger.settings) || {});

  const ROOT = '/israelite-research/data';
  const PREF_KEYS = [CFG.bibleVersion, 'KJV', 'Text', 'text', 'Darby'];

  // --------------- Canon & mapping ---------------
  const BOOK_CANON = {
    'Genesis':'tanakh','Exodus':'tanakh','Leviticus':'tanakh','Numbers':'tanakh','Deuteronomy':'tanakh',
    'Joshua':'tanakh','Judges':'tanakh','Ruth':'tanakh',
    '1-Samuel':'tanakh','2-Samuel':'tanakh','1-Kings':'tanakh','2-Kings':'tanakh',
    '1-Chronicles':'tanakh','2-Chronicles':'tanakh',
    'Ezra':'tanakh','Nehemiah':'tanakh','Esther':'tanakh',
    'Job':'tanakh','Psalms':'tanakh','Proverbs':'tanakh','Ecclesiastes':'tanakh','Song-of-Solomon':'tanakh',
    'Isaiah':'tanakh','Jeremiah':'tanakh','Lamentations':'tanakh','Ezekiel':'tanakh','Daniel':'tanakh',
    'Hosea':'tanakh','Joel':'tanakh','Amos':'tanakh','Obadiah':'tanakh','Jonah':'tanakh','Micah':'tanakh',
    'Nahum':'tanakh','Habakkuk':'tanakh','Zephaniah':'tanakh','Haggai':'tanakh','Zechariah':'tanakh','Malachi':'tanakh',
    'Matthew':'newtestament','Mark':'newtestament','Luke':'newtestament','John':'newtestament','Acts':'newtestament',
    'Romans':'newtestament','1-Corinthians':'newtestament','2-Corinthians':'newtestament','Galatians':'newtestament',
    'Ephesians':'newtestament','Philippians':'newtestament','Colossians':'newtestament',
    '1-Thessalonians':'newtestament','2-Thessalonians':'newtestament',
    '1-Timothy':'newtestament','2-Timothy':'newtestament','Titus':'newtestament','Philemon':'newtestament',
    'Hebrews':'newtestament','James':'newtestament','1-Peter':'newtestament','2-Peter':'newtestament',
    '1-John':'newtestament','2-John':'newtestament','3-John':'newtestament','Jude':'newtestament','Revelation':'newtestament',
    'Tobit':'apocrypha','Judith':'apocrypha','Wisdom':'apocrypha','Sirach':'apocrypha',
    'Baruch':'apocrypha','1-Maccabees':'apocrypha','2-Maccabees':'apocrypha'
  };

  const BOOK_MAP = {
    // OT
    'Gen':'Genesis','Ge':'Genesis','Gn':'Genesis','Genesis':'Genesis',
    'Ex':'Exodus','Exod':'Exodus','Exodus':'Exodus',
    'Lev':'Leviticus','Leviticus':'Leviticus',
    'Num':'Numbers','Nu':'Numbers','Numbers':'Numbers',
    'Deut':'Deuteronomy','Dt':'Deuteronomy','Deuteronomy':'Deuteronomy',
    'Josh':'Joshua','Joshua':'Joshua','Judg':'Judges','Jdg':'Judges','Judges':'Judges','Ruth':'Ruth',
    '1Sam':'1-Samuel','1 Samuel':'1-Samuel','I Sam':'1-Samuel',
    '2Sam':'2-Samuel','2 Samuel':'2-Samuel','II Sam':'2-Samuel',
    '1Kgs':'1-Kings','1 Kings':'1-Kings','I Kings':'1-Kings',
    '2Kgs':'2-Kings','2 Kings':'2-Kings','II Kings':'2-Kings',
    '1Chr':'1-Chronicles','1 Chronicles':'1-Chronicles','I Chron':'1-Chronicles',
    '2Chr':'2-Chronicles','2 Chronicles':'2-Chronicles','II Chron':'2-Chronicles',
    'Ezra':'Ezra','Neh':'Nehemiah','Nehemiah':'Nehemiah','Esth':'Esther','Esther':'Esther',
    'Job':'Job','Ps':'Psalms','Psa':'Psalms','Psalm':'Psalms','Psalms':'Psalms',
    'Prov':'Proverbs','Proverbs':'Proverbs','Eccl':'Ecclesiastes','Ecclesiastes':'Ecclesiastes','Qoheleth':'Ecclesiastes',
    'Song':'Song-of-Solomon','SoS':'Song-of-Solomon','Song of Songs':'Song-of-Solomon','Song of Solomon':'Song-of-Solomon','Cant':'Song-of-Solomon',
    'Isa':'Isaiah','Isaiah':'Isaiah','Jer':'Jeremiah','Jeremiah':'Jeremiah','Lam':'Lamentations','Lamentations':'Lamentations',
    'Ezek':'Ezekiel','Ezekiel':'Ezekiel','Dan':'Daniel','Daniel':'Daniel',
    'Hos':'Hosea','Hosea':'Hosea','Joel':'Joel','Amos':'Amos','Obad':'Obadiah','Obadiah':'Obadiah',
    'Jonah':'Jonah','Mic':'Micah','Micah':'Micah','Nah':'Nahum','Nahum':'Nahum','Hab':'Habakkuk','Habakkuk':'Habakkuk',
    'Zeph':'Zephaniah','Zephaniah':'Zephaniah','Hag':'Haggai','Haggai':'Haggai','Zech':'Zechariah','Zechariah':'Zechariah','Mal':'Malachi','Malachi':'Malachi',
    // NT
    'Matt':'Matthew','Mt':'Matthew','Matthew':'Matthew','Mark':'Mark','Mk':'Mark','Luke':'Luke','Lk':'Luke','John':'John','Jn':'John','Acts':'Acts',
    'Rom':'Romans','Romans':'Romans',
    '1Cor':'1-Corinthians','1 Corinthians':'1-Corinthians','I Cor':'1-Corinthians',
    '2Cor':'2-Corinthians','2 Corinthians':'2-Corinthians','II Cor':'2-Corinthians',
    'Gal':'Galatians','Galatians':'Galatians','Eph':'Ephesians','Ephesians':'Ephesians',
    'Phil':'Philippians','Philippians':'Philippians','Col':'Colossians','Colossians':'Colossians',
    '1Thess':'1-Thessalonians','1 Thessalonians':'1-Thessalonians','I Thess':'1-Thessalonians',
    '2Thess':'2-Thessalonians','2 Thessalonians':'2-Thessalonians','II Thess':'2-Thessalonians',
    '1Tim':'1-Timothy','1 Timothy':'1-Timothy','I Tim':'1-Timothy',
    '2Tim':'2-Timothy','2 Timothy':'2-Timothy','II Tim':'2-Timothy',
    'Titus':'Titus','Phlm':'Philemon','Philemon':'Philemon',
    'Heb':'Hebrews','Hebrews':'Hebrews','Jas':'James','James':'James',
    '1Pet':'1-Peter','1 Peter':'1-Peter','I Pet':'1-Peter',
    '2Pet':'2-Peter','2 Peter':'2-Peter','II Pet':'2-Peter',
    '1John':'1-John','1 John':'1-John','I John':'1-John',
    '2John':'2-John','2 John':'2-John','II John':'2-John',
    '3John':'3-John','3 John':'3-John','III John':'3-John',
    'Jude':'Jude','Rev':'Revelation','Revelation':'Revelation','Apocalypse':'Revelation',
    // Apocrypha (sample)
    'Tob':'Tobit','Tobit':'Tobit','Jdt':'Judith','Judith':'Judith','Wis':'Wisdom','Wisdom':'Wisdom',
    'Sir':'Sirach','Sirach':'Sirach','Ecclus':'Sirach','Bar':'Baruch','Baruch':'Baruch',
    '1Macc':'1-Maccabees','1 Maccabees':'1-Maccabees','I Macc':'1-Maccabees',
    '2Macc':'2-Maccabees','2 Maccabees':'2-Maccabees','II Macc':'2-Maccabees'
  };

  const dashRange = /[\u2010-\u2015\u2212]/g;
  const ARABIC_TO_ROMAN_SLUG = {1:'i',2:'ii',3:'iii'};

  function normalizeDashes(s){ return String(s).replace(dashRange, '-'); }
  function canonFor(bookCanonical){ return BOOK_CANON[bookCanonical] || 'tanakh'; }
  function slugifyBook(bookCanonical){
    const m = /^([123])-(.+)$/.exec(bookCanonical);
    if (m){
      const rn = ARABIC_TO_ROMAN_SLUG[+m[1]] || m[1];
      return `${rn}-${m[2].toLowerCase().replace(/\s+/g,'-')}`;
    }
    return bookCanonical.toLowerCase().replace(/\s+/g,'-');
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Strip Strong’s numbers/tags
  function stripStrongs(text){
    if (!text) return '';
    let t = String(text);
    t = t.replace(/\[(?:H|G)\d{1,5}\]/gi, '')
         .replace(/<(?:H|G)\d{1,5}>/gi, '')
         .replace(/\b(?:H|G)\d{3,5}\b/gi, '')
         .replace(/<\s*\/?\s*strongs[^>]*>/gi, '')
         .replace(/<\s*w[^>]*>(.*?)<\s*\/\s*w\s*>/gi, '$1')
         .replace(/<[^>]+>/g, '')
         .replace(/\s{2,}/g, ' ')
         .trim();
    return t;
  }
  function normVerseVal(v){
    if (Array.isArray(v)) return v.map(tok => (typeof tok==='string'? tok : (tok?.w||tok?.word||tok?.text||tok?.t||''))).join(' ');
    if (v && typeof v==='object') return normVerseVal(v.t || v.text || '');
    return String(v||'');
  }

  // --------------- Parsing refs ---------------
  function resolveBookCanonical(tokenRaw){
    if (BOOK_MAP[tokenRaw]) return BOOK_MAP[tokenRaw];
    const romanToArabic = tokenRaw
      .replace(/^III(\s|-)/i, '3$1')
      .replace(/^II(\s|-)/i,  '2$1')
      .replace(/^I(\s|-)/i,   '1$1')
      .replace(/\s+/g,' ')
      .trim();
    if (BOOK_MAP[romanToArabic]) return BOOK_MAP[romanToArabic];
    const compact = romanToArabic.replace(/^([123])([A-Za-z])/, '$1 $2');
    if (BOOK_MAP[compact]) return BOOK_MAP[compact];
    return tokenRaw
      .split(/\s+/)
      .map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase())
      .join('-');
  }
  function splitVerseParts(vs){
    const out=[]; vs.split(',').forEach(seg=>{
      const s=seg.trim(); if(!s) return;
      if (s.includes('-')){ const [a,b]=s.split('-').map(x=>parseInt(x.trim(),10)); if(!isNaN(a)&&!isNaN(b)) out.push({type:'range',from:Math.min(a,b),to:Math.max(a,b)}); }
      else { const v=parseInt(s,10); if(!isNaN(v)) out.push({type:'single',from:v,to:v}); }
    }); return out;
  }
  function parseRef(ref){
    ref = normalizeDashes(ref);
    const m = /^\s*([^\d]+?)\s+(\d+)(?::([\d,\-\s]+))?\s*$/.exec(ref);
    if (!m) return null;
    const bookCanonical = resolveBookCanonical(m[1].trim().replace(/\s+/g,' '));
    const chapter = parseInt(m[2],10);
    const parts = m[3] ? splitVerseParts(m[3].trim()) : [{type:'chapter'}];
    return { bookCanonical, chapter, parts };
  }

  // --------------- Data fetching ---------------
  const chapterCache = new Map();
  async function getChapter(bookCanonical, chapter){
    const key = `${bookCanonical}|${chapter}`;
    if (chapterCache.has(key)) return chapterCache.get(key);
    const canon = canonFor(bookCanonical);
    const slug  = slugifyBook(bookCanonical);
    const url   = `${ROOT}/${canon}/${slug}/${chapter}.json`;
    const res = await fetch(url, {cache:'force-cache'});
    if (!res.ok) throw new Error(`Missing: ${url}`);
    const json = await res.json();
    chapterCache.set(key, json); return json;
  }
  function pickTranslation(chapterJson){
    for (const k of PREF_KEYS){ if (chapterJson && chapterJson[k]) return chapterJson[k]; }
    if (chapterJson && Array.isArray(chapterJson.verses)) return chapterJson.verses;
    return chapterJson || {};
  }
  function extractVerses(trans, parts){
    const getV = (n)=>{
      if (Array.isArray(trans)){
        const hit = trans.find(x => (x.v ?? x.verse) == n);
        const raw = hit ? (hit.t ?? hit.text ?? hit) : '';
        return stripStrongs(normVerseVal(raw));
      } else if (trans && typeof trans==='object'){
        return stripStrongs(normVerseVal(trans[n]));
      }
      return '';
    };
    const chunks=[];
    for (const p of parts){
      if(p.type==='single'){
        const t=getV(p.from); if (t) chunks.push({label:`v${p.from}`, text:escapeHtml(t)});
      } else if(p.type==='range'){
        const lines=[]; for(let v=p.from; v<=p.to; v++){ const t=getV(v); if (t) lines.push(`<span class="vr">${v}</span> ${escapeHtml(t)}`); }
        if (lines.length) chunks.push({label:`v${p.from}-${p.to}`, text:lines.join('<br>')});
      }
    }
    return chunks;
  }
  function autosummary(json){
    const s = json && (json.summary || json.Summary);
    if (typeof s === 'string' && s.trim()) return s.trim();
    const t = pickTranslation(json);
    let total = 0;
    if (Array.isArray(t)) total = t.length; else if (t && typeof t==='object') total = Object.keys(t).length;
    return `This chapter contains approximately ${total} verses.`;
  }

  // --------------- UI ---------------
  let hc, hideTimer, showTimer;
  function ensureCard(){
    if (hc) return hc;
    hc = document.createElement('div');
    hc.id = 'bible-hovercard';
    hc.setAttribute('aria-hidden','true');
    hc.className = 'refcard';
    hc.innerHTML = `
      <div class="refcard-inner">
        <div class="refcard-head">
          <span class="refcard-ref"></span>
          <button class="refcard-close" aria-label="Close">&times;</button>
        </div>
        <div class="refcard-body"></div>
      </div>`;
    document.body.appendChild(hc);
    hc.querySelector('.refcard-close').addEventListener('click', () => hide());
    applyTheme();
    return hc;
  }
  function applyTheme(){
    const mode = CFG.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light') : CFG.theme;
    document.documentElement.dataset.reftaggerTheme = mode;
  }
  function show(el, html){
    clearTimeout(hideTimer);
    const card = ensureCard();
    card.querySelector('.refcard-ref').textContent = el.dataset.ref || el.textContent || '';
    card.querySelector('.refcard-body').innerHTML = html;
    card.style.opacity = '1'; card.setAttribute('aria-hidden','false');
    const r = el.getBoundingClientRect();
    const top = window.scrollY + r.bottom + 8;
    const left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + window.innerWidth - card.offsetWidth - 8));
    card.style.top = `${Math.max(8, top)}px`;
    card.style.left = `${left}px`;
  }
  function hide(){
    if (!hc) return;
    hc.style.opacity = '0'; hc.setAttribute('aria-hidden','true');
  }

  async function render(el, ref){
    try{
      const p = parseRef(ref);
      if (!p) { show(el, `<div>Couldn’t parse: ${escapeHtml(ref)}</div>`); return; }
      const json = await getChapter(p.bookCanonical, p.chapter);
      const trans = pickTranslation(json);
      let html = '';
      if (p.parts.some(x=>x.type==='chapter')){
        html += `<div class="refcard-sec">
          <div class="refcard-label">Chapter Overview</div>
          <div class="refcard-text">${escapeHtml(autosummary(json))}</div>
        </div>`;
      }
      extractVerses(trans, p.parts.filter(x=>x.type!=='chapter')).forEach(({label,text})=>{
        html += `<div class="refcard-sec"><div class="refcard-label">${label}</div><div class="refcard-text">${text}</div></div>`;
      });
      if (!html) html = `<div class="refcard-sec"><div class="refcard-text">No verses found for ${escapeHtml(ref)}.</div></div>`;
      show(el, html);
    } catch (e){
      show(el, `<div class="refcard-sec"><div class="refcard-text">Couldn’t load: ${escapeHtml(ref)}</div></div>`);
    }
  }

  // --------------- Decoration & binding ---------------
  function addBadge(el){
    if (!CFG.showIcon) return;
    if (el.querySelector('.reftag-badge')) return;
    const b = document.createElement('span');
    b.className = 'reftag-badge';
    b.setAttribute('aria-hidden','true');
    el.appendChild(b);
  }

  function bindEl(el){
    const ref = normalizeDashes((el.dataset.ref || el.textContent || '').trim());
    if (!ref) return;
    el.classList.add('reftag');
    el.dataset.ref = ref;
    addBadge(el);
    el.style.textDecorationStyle = CFG.underlineStyle;
    el.style.cursor = 'pointer';

    el.addEventListener('mouseenter', ()=>{
      clearTimeout(showTimer);
      showTimer = setTimeout(()=>render(el, ref), CFG.tooltipDelay);
    });
    el.addEventListener('mouseleave', ()=>{ clearTimeout(showTimer); hideTimer = setTimeout(hide, 120); });
    el.addEventListener('focus', ()=>render(el, ref));
    el.addEventListener('blur', hide);

    if (CFG.clickBehavior === 'goto'){
      el.addEventListener('click', ()=>{ /* future: navigate to a chapter page */ });
    } else {
      el.addEventListener('click', (e)=> e.preventDefault());
    }
  }

  // Auto-detect plain text citations and wrap them like Logos
  const CITE_RE = new RegExp(
    String.raw`(?:^|[\s\(\[\{,;])(` + [
      ...Object.keys(BOOK_MAP).sort((a,b)=>b.length-a.length).map(escapeRegex),
      'I\\s+Sam','II\\s+Sam','III\\s+John','II\\s+John','I\\s+John',
      'I\\s+Kgs','II\\s+Kgs','I\\s+Chr','II\\s+Chr',
      'I\\s+Pet','II\\s+Pet','I\\s+Cor','II\\s+Cor',
      'I\\s+Thess','II\\s+Thess','I\\s+Tim','II\\s+Tim','I\\s+Macc','II\\s+Macc'
    ].join('|') + String.raw`)` +
    String.raw`[\s\-]+(\d+)(?::([0-9,\-\u2010-\u2015\u2212\s]+))?` +
    String.raw`(?=$|[\s\)\]\},;:.!?"'—–-])`, 'g'
  );
  function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  function autodetect(root=document){
    const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()){
      const n = walker.currentNode;
      if (!n.nodeValue) continue;
      if (CITE_RE.test(n.nodeValue)) nodes.push(n);
      CITE_RE.lastIndex = 0;
    }
    nodes.forEach(node=>{
      const frag = document.createDocumentFragment();
      let text = node.nodeValue, last = 0; CITE_RE.lastIndex = 0; let m;
      while ((m=CITE_RE.exec(text))){
        const [full, tok, chap, verses] = m;
        const s = m.index, e = s + full.length;
        if (s>last) frag.appendChild(document.createTextNode(text.slice(last,s)));
        const ref = normalizeDashes(`${tok} ${chap}${verses?`:${verses}`:''}`).replace(/\s{2,}/g,' ').trim();
        const span = document.createElement('span');
        span.className = 'reftag';
        span.dataset.ref = ref;
        span.textContent = ref;
        addBadge(span);
        frag.appendChild(span);
        last = e;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function init(){
    applyTheme();
    // Bind existing explicit spans
    document.querySelectorAll('.verse[data-ref], .bible-ref[data-ref]').forEach(bindEl);
    // Autodetect plain text citations (like Logos)
    if (CFG.autodetect) {
      autodetect(document);
      document.querySelectorAll('.reftag').forEach(bindEl);
    }
    // Dismiss on outside click
    document.addEventListener('click', (ev)=>{
      if (hc && !hc.contains(ev.target) && !ev.target.closest('.reftag')) hide();
    });
    // Re-apply theme if system theme changes
    if (CFG.theme === 'auto') {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // --------------- Minimal styles injected (scoped) ---------------
  const css = `
    .reftag{ position:relative; color:var(--brand, #054A91); font-weight:600; text-decoration-line: underline; text-decoration-thickness: from-font; }
    .reftag .reftag-badge{ display:inline-block; width:0; height:0; margin-left:4px; vertical-align:baseline; }
    ${CFG.showIcon ? `.reftag::after{
      content:"📖"; font-size:0.85em; margin-left:4px; opacity:.7;
    }` : ''}

    #bible-hovercard.refcard{
      position:absolute; max-width:520px; z-index:9999; padding:10px;
      border-radius:12px; border:1px solid rgba(0,0,0,.08); box-shadow:0 10px 30px rgba(0,0,0,.18);
      background:#fff; color:#0b2340; transition:opacity .12s ease; opacity:0;
    }
    .refcard-inner{ padding:8px 10px 10px; }
    .refcard-head{ display:flex; align-items:center; justify-content:space-between; font-weight:700; margin-bottom:6px; }
    .refcard-ref{ color:var(--brand,#054A91); }
    .refcard-close{ background:transparent; border:0; font-size:20px; line-height:1; color:var(--muted,#6b7280); cursor:pointer; border-radius:50%; width:28px; height:28px; }
    .refcard-sec{ margin:8px 0; }
    .refcard-label{ font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted,#6b7280); margin-bottom:4px; }
    .refcard-text{ font-size:14px; line-height:1.45; }
    .refcard .vr{ display:inline-block; min-width:1.75em; font-weight:600; color:var(--accent,#F17300); }

    /* Dark theme */
    :root[data-reftagger-theme="dark"] #bible-hovercard.refcard{
      background:#0b1220; color:#e6e8ee; border-color:rgba(255,255,255,.1); box-shadow:0 10px 30px rgba(0,0,0,.6);
    }
    :root[data-reftagger-theme="dark"] .refcard-ref{ color:#81A4CD; }
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

})();
