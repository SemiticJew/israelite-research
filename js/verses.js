/* js/verses.js
   Site-wide Bible citation hovercards using site-internal data only.
   Assumes JSON chapter files like:
   /israelite-research/data/tanakh/Genesis/1.json
   /israelite-research/data/newtestament/Matthew/5.json
   /israelite-research/data/apocrypha/1-Maccabees/1.json
*/

(() => {
  // --- CONFIG ---------------------------------------------------------------
  const ROOT = '/israelite-research/data';
  // Preferred translation key inside your chapter JSON (fallbacks allowed):
  const TRANSLATION_ORDER = ['KJV','Darby','Text','text'];

  // Map common abbreviations -> canonical folder names used in your data
  const BOOK_MAP = {
    // Tanakh / OT (add all you use)
    'Gen':'Genesis','Ge':'Genesis','Gn':'Genesis',
    'Ex':'Exodus','Exod':'Exodus',
    'Lev':'Leviticus','Lv':'Leviticus',
    'Num':'Numbers','Nm':'Numbers','Nb':'Numbers',
    'Deut':'Deuteronomy','Dt':'Deuteronomy',
    'Josh':'Joshua','Jos':'Joshua',
    'Judg':'Judges','Jdg':'Judges',
    'Ruth':'Ruth',
    '1Sam':'I-Samuel','2Sam':'II-Samuel',
    '1Kgs':'I-Kings','2Kgs':'II-Kings',
    '1Chr':'I-Chronicles','2Chr':'II-Chronicles',
    'Ezra':'Ezra','Neh':'Nehemiah','Esth':'Esther',
    'Job':'Job','Ps':'Psalms','Prov':'Proverbs',
    'Eccl':'Ecclesiastes','Song':'Song-of-Solomon','SoS':'Song-of-Solomon','Cant':'Song-of-Solomon',
    'Isa':'Isaiah','Jer':'Jeremiah','Lam':'Lamentations',
    'Ezek':'Ezekiel','Dan':'Daniel',
    'Hos':'Hosea','Joel':'Joel','Amos':'Amos','Obad':'Obadiah','Jonah':'Jonah','Mic':'Micah',
    'Nah':'Nahum','Hab':'Habakkuk','Zeph':'Zephaniah','Hag':'Haggai','Zech':'Zechariah','Mal':'Malachi',

    // NT (title-cased to match your folders)
    'Matt':'Matthew','Mt':'Matthew',
    'Mark':'Mark','Mk':'Mark',
    'Luke':'Luke','Lk':'Luke',
    'John':'John','Jn':'John',
    'Acts':'Acts',
    'Rom':'Romans',
    '1Cor':'1-Corinthians','2Cor':'2-Corinthians',
    'Gal':'Galatians','Eph':'Ephesians','Phil':'Philippians','Col':'Colossians',
    '1Thess':'1-Thessalonians','2Thess':'2-Thessalonians',
    '1Tim':'1-Timothy','2Tim':'2-Timothy',
    'Titus':'Titus','Phlm':'Philemon','Philemon':'Philemon',
    'Heb':'Hebrews','Jas':'James','James':'James',
    '1Pet':'1-Peter','2Pet':'2-Peter',
    '1John':'1-John','2John':'2-John','3John':'3-John',
    'Jude':'Jude','Rev':'Revelation','Apoc':'Revelation',

    // Apocrypha (example names; adjust to your folder slugs)
    '1Macc':'1-Maccabees','2Macc':'2-Maccabees',
    'Wis':'Wisdom','Sir':'Sirach','Tob':'Tobit','Jdt':'Judith','Bar':'Baruch'
  };

  // Decide which canon a book belongs to (folder names under /data)
  function canonFor(bookCanonical) {
    // crude routing; tune as needed for your repo layout
    const apocBooks = new Set(['1-Maccabees','2-Maccabees','Wisdom','Sirach','Tobit','Judith','Baruch']);
    const ntStarts = new Set(['Matthew','Mark','Luke','John','Acts','Romans','1-Corinthians','2-Corinthians','Galatians','Ephesians','Philippians','Colossians','1-Thessalonians','2-Thessalonians','1-Timothy','2-Timothy','Titus','Philemon','Hebrews','James','1-Peter','2-Peter','1-John','2-John','3-John','Jude','Revelation']);
    if (apocBooks.has(bookCanonical)) return 'apocrypha';
    if (ntStarts.has(bookCanonical)) return 'newtestament';
    return 'tanakh';
  }

  // --- CITATION PARSER ------------------------------------------------------
  // Supported patterns:
  //   Book 1:2
  //   Book 1:2-5
  //   Book 1:2,5,7-9
  //   Book 10 (whole chapter)
  // Multiple segments separated by "; " are supported: "Matt 5:1-12; 17-20"
  const CITE_RE = new RegExp(
    String.raw`\b(` +
      Object.keys(BOOK_MAP).sort((a,b)=>b.length-a.length).map(escapeRe).join('|') +
    String.raw`)\s+(\d+)(?::([0-9,\-\–\u2013\s]+))?`, 'g'
  );

  function escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

  // Turn found plain-text citations into actionable anchors
  function decorateCitations(root=document){
    const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT, null);
    const toReplace = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.nodeValue || !CITE_RE.test(node.nodeValue)) { CITE_RE.lastIndex = 0; continue; }
      toReplace.push(node);
      CITE_RE.lastIndex = 0;
    }
    toReplace.forEach(node=>{
      const frag = document.createDocumentFragment();
      let text = node.nodeValue;
      let lastIndex = 0;
      CITE_RE.lastIndex = 0;
      let m;
      while ((m = CITE_RE.exec(text))){
        const [full, bookAbbr, chapterStr, versesStrRaw] = m;
        const start = m.index;
        const end = start + full.length;
        // prepend preceding text
        if (start>lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex,start)));
        const anchor = document.createElement('a');
        anchor.className = 'bible-ref';
        anchor.href = 'javascript:void(0)';
        // Normalize en-dash
        const versesStr = versesStrRaw ? versesStrRaw.replace(/\u2013|\u2014|–/g,'-').trim() : '';
        const ref = `${bookAbbr} ${chapterStr}${versesStr?':'+versesStr:''}`;
        anchor.dataset.ref = ref;
        anchor.textContent = ref; // no parentheses
        frag.appendChild(anchor);
        lastIndex = end;
      }
      if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  // --- FETCH, FORMAT, CACHE -------------------------------------------------
  const cache = new Map();
  async function getChapter(bookCanonical, chapter){
    const key = `${bookCanonical}|${chapter}`;
    if (cache.has(key)) return cache.get(key);
    const canon = canonFor(bookCanonical);
    const url = `${ROOT}/${canon}/${bookCanonical}/${chapter}.json`;
    const res = await fetch(url, {cache:'force-cache'});
    if (!res.ok) throw new Error(`Missing chapter data: ${url}`);
    const json = await res.json();
    cache.set(key, json);
    return json;
  }

  function pickTranslation(chapterJson){
    for (const k of TRANSLATION_ORDER){
      if (chapterJson[k] && typeof chapterJson[k]==='object') return chapterJson[k];
      if (chapterJson[k] && typeof chapterJson[k]==='string') return chapterJson[k];
    }
    // Fallback if structure is { verses: [{v:1, t:""}] } etc.
    if (Array.isArray(chapterJson.verses)) return chapterJson.verses;
    return chapterJson;
  }

  function parseRef(ref){
    // returns { bookCanonical, chapter:Number, parts:[{type:'range'|'single'|'chapter', from:verse, to:verse}] }
    // Examples:
    //  "Gen 1:1-3,7,9-10" -> parts for 1-3,7,9-10
    //  "Gen 10" -> chapter
    const m = ref.match(/^\s*([^\d]+?)\s+(\d+)(?::([\d,\-\s]+))?\s*$/);
    if (!m) return null;
    const abbr = m[1].trim();
    const chapter = parseInt(m[2],10);
    const bookCanonical = BOOK_MAP[abbr] || abbr;
    if (!m[3]) return {bookCanonical, chapter, parts:[{type:'chapter'}]};
    const parts = [];
    m[3].split(',').forEach(seg=>{
      const s = seg.trim();
      if (!s) return;
      if (s.includes('-')) {
        const [a,b] = s.split('-').map(x=>parseInt(x.trim(),10));
        if (!isNaN(a) && !isNaN(b)) parts.push({type:'range', from:Math.min(a,b), to:Math.max(a,b)});
      } else {
        const v = parseInt(s,10);
        if (!isNaN(v)) parts.push({type:'single', from:v, to:v});
      }
    });
    return {bookCanonical, chapter, parts};
  }

  function extractVerses(trans, parts){
    // trans could be array of {v, t} OR object keyed by verse "1":"In the..."
    const getVerse = (n)=>{
      if (Array.isArray(trans)) {
        const hit = trans.find(x => (x.v ?? x.verse) == n);
        return hit ? (hit.t ?? hit.text ?? '') : '';
      } else if (typeof trans === 'object'){
        return trans[n] || '';
      }
      return '';
    };

    const chunks = [];
    for (const p of parts){
      if (p.type==='chapter') {
        chunks.push({label:'Chapter', text:''}); // handled separately
      } else if (p.type==='single') {
        const t = getVerse(p.from);
        if (t) chunks.push({label:`v${p.from}`, text:t});
      } else if (p.type==='range') {
        const lines = [];
        for (let v=p.from; v<=p.to; v++) {
          const t = getVerse(v);
          if (t) lines.push(`<span class="vr">${v}</span> ${escapeHtml(t)}`);
        }
        if (lines.length) chunks.push({label:`v${p.from}-${p.to}`, text:lines.join('<br>')});
      }
    }
    return chunks;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&nbsp;amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  // Simple auto-summary if entire chapter is cited and no summary exists in JSON
  function autosummarizeChapter(chapterJson){
    // If your JSON has a field like chapterJson.summary, use it:
    const builtIn = chapterJson.summary || chapterJson.Summary || null;
    if (builtIn && typeof builtIn === 'string') return builtIn;

    // Otherwise heuristic summary:
    const trans = pickTranslation(chapterJson);
    let verses = [];
    if (Array.isArray(trans)) verses = trans.map(x=>String(x.t||x.text||''));
    else verses = Object.keys(trans).sort((a,b)=>(+a)-(+b)).map(k=>String(trans[k]));

    const total = verses.length;
    const textAll = verses.join(' ').toLowerCase();

    const topics = [];
    if ((textAll.match(/\bbegat\b|\bgenerations\b|\bnations\b/g)||[]).length >= 3) topics.push('genealogies');
    if (/\bwar\b|\bbattle\b|\barmy\b/g.test(textAll)) topics.push('war/conflict');
    if (/\bcovenant\b|\boath\b|\bpromise\b/g.test(textAll)) topics.push('covenant');
    if (/\bvision\b|\bdream\b/g.test(textAll)) topics.push('visions/dreams');
    if (/\blaw\b|\bcommandment\b/g.test(textAll)) topics.push('law/commands');
    if (/\bparable\b/g.test(textAll)) topics.push('parables');

    const first = verses[0]?.trim() || '';
    const last = verses[verses.length-1]?.trim() || '';

    const parts = [];
    parts.push(`This chapter contains approximately ${total} verses.`);
    if (topics.length) parts.push(`Major themes (auto): ${topics.join(', ')}.`);
    if (first) parts.push(`Opening: “${first.slice(0,160)}${first.length>160?'…':''}”`);
    if (last) parts.push(`Closing: “${last.slice(0,160)}${last.length>160?'…':''}”`);
    return parts.join(' ');
  }

  // --- HOVERCARD UI ---------------------------------------------------------
  function ensureHoverContainer(){
    let hc = document.querySelector('#bible-hovercard');
    if (hc) return hc;
    hc = document.createElement('div');
    hc.id = 'bible-hovercard';
    hc.setAttribute('role','dialog');
    hc.setAttribute('aria-hidden','true');
    hc.innerHTML = `<div class="bh-inner">
      <div class="bh-header">
        <span class="bh-ref"></span>
        <button class="bh-close" aria-label="Close">&times;</button>
      </div>
      <div class="bh-body"></div>
    </div>`;
    document.body.appendChild(hc);
    hc.querySelector('.bh-close').addEventListener('click', ()=>hideHover());
    return hc;
  }

  let hoverHideTimer = null;
  function showHoverFor(el, html){
    const hc = ensureHoverContainer();
    hc.querySelector('.bh-ref').textContent = el.dataset.ref;
    hc.querySelector('.bh-body').innerHTML = html;
    hc.style.opacity = '1';
    hc.setAttribute('aria-hidden','false');

    // position
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top - hc.offsetHeight - 12;
    const left = Math.max(8, Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - hc.offsetWidth - 8));
    hc.style.top = `${Math.max(8, top)}px`;
    hc.style.left = `${left}px`;
  }

  function hideHover(){ 
    const hc = document.querySelector('#bible-hovercard');
    if (!hc) return;
    hc.style.opacity = '0';
    hc.setAttribute('aria-hidden','true');
  }

  async function handleEnter(el){
    clearTimeout(hoverHideTimer);
    const ref = el.dataset.ref;
    const parsed = parseRef(ref);
    if (!parsed) return;

    try {
      const chapterJson = await getChapter(parsed.bookCanonical, parsed.chapter);
      const trans = pickTranslation(chapterJson);

      let html = '';
      const hasWhole = parsed.parts.some(p=>p.type==='chapter');
      if (hasWhole) {
        const summary = autosummarizeChapter(chapterJson);
        html += `<div class="bh-section"><div class="bh-label">Chapter Overview</div><div class="bh-text">${escapeHtml(summary)}</div></div>`;
      }

      const chunks = extractVerses(trans, parsed.parts.filter(p=>p.type!=='chapter'));
      chunks.forEach(({label, text})=>{
        html += `<div class="bh-section"><div class="bh-label">${label}</div><div class="bh-text">${text}</div></div>`;
      });

      if (!html) {
        html = `<div class="bh-section"><div class="bh-text">No verses found for ${ref}.</div></div>`;
      }

      showHoverFor(el, html);
    } catch (e) {
      showHoverFor(el, `<div class="bh-section"><div class="bh-text">Couldn’t load: ${ref}</div></div>`);
      // console.warn(e);
    }
  }

  function handleLeave(){
    clearTimeout(hoverHideTimer);
    hoverHideTimer = setTimeout(hideHover, 120);
  }

  function bindHoverHandlers(root=document){
    root.querySelectorAll('a.bible-ref').forEach(a=>{
      a.addEventListener('mouseenter', ()=>handleEnter(a));
      a.addEventListener('mouseleave', handleLeave);
      a.addEventListener('focus', ()=>handleEnter(a));
      a.addEventListener('blur', handleLeave);
    });
    // hide when clicking elsewhere
    document.addEventListener('click', (ev)=>{
      const hc = document.querySelector('#bible-hovercard');
      if (!hc) return;
      if (!hc.contains(ev.target) && !ev.target.closest('a.bible-ref')) hideHover();
    });
  }

  // --- INIT -----------------------------------------------------------------
  function init(){
    decorateCitations(document);
    bindHoverHandlers(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
