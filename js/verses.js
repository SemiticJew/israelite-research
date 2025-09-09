/* js/verses.js
   Site-wide Bible citation hovercards using your OWN JSON data.
   - Works with <span class="verse" data-ref="...">...</span>
   - Also (optionally) auto-decorates plain-text refs into anchors
   - Uses lowercase, hyphenated, roman-numeral slugs for numbered books
   - Normalizes en/em dashes in refs
*/

(() => {
  // ----------------------- CONFIG -----------------------
  const ROOT = '/israelite-research/data';
  const TRANSLATION_ORDER = ['KJV','Darby','Text','text'];
  const ENABLE_AUTODECORATE = true; // set false if you only use .verse[data-ref]

  // Canon routing (canonical → canon folder)
  const BOOK_CANON = {
    // Tanakh
    'Genesis':'tanakh','Exodus':'tanakh','Leviticus':'tanakh','Numbers':'tanakh','Deuteronomy':'tanakh',
    'Joshua':'tanakh','Judges':'tanakh','Ruth':'tanakh',
    '1-Samuel':'tanakh','2-Samuel':'tanakh','1-Kings':'tanakh','2-Kings':'tanakh',
    '1-Chronicles':'tanakh','2-Chronicles':'tanakh',
    'Ezra':'tanakh','Nehemiah':'tanakh','Esther':'tanakh',
    'Job':'tanakh','Psalms':'tanakh','Proverbs':'tanakh','Ecclesiastes':'tanakh','Song-of-Solomon':'tanakh',
    'Isaiah':'tanakh','Jeremiah':'tanakh','Lamentations':'tanakh','Ezekiel':'tanakh','Daniel':'tanakh',
    'Hosea':'tanakh','Joel':'tanakh','Amos':'tanakh','Obadiah':'tanakh','Jonah':'tanakh','Micah':'tanakh',
    'Nahum':'tanakh','Habakkuk':'tanakh','Zephaniah':'tanakh','Haggai':'tanakh','Zechariah':'tanakh','Malachi':'tanakh',

    // New Testament
    'Matthew':'newtestament','Mark':'newtestament','Luke':'newtestament','John':'newtestament','Acts':'newtestament',
    'Romans':'newtestament','1-Corinthians':'newtestament','2-Corinthians':'newtestament','Galatians':'newtestament',
    'Ephesians':'newtestament','Philippians':'newtestament','Colossians':'newtestament',
    '1-Thessalonians':'newtestament','2-Thessalonians':'newtestament',
    '1-Timothy':'newtestament','2-Timothy':'newtestament','Titus':'newtestament','Philemon':'newtestament',
    'Hebrews':'newtestament','James':'newtestament','1-Peter':'newtestament','2-Peter':'newtestament',
    '1-John':'newtestament','2-John':'newtestament','3-John':'newtestament','Jude':'newtestament','Revelation':'newtestament',

    // Apocrypha (extend as you add)
    'Tobit':'apocrypha','Judith':'apocrypha','Wisdom':'apocrypha','Sirach':'apocrypha',
    'Baruch':'apocrypha','1-Maccabees':'apocrypha','2-Maccabees':'apocrypha'
  };

  // Abbrev/alias → canonical. Includes common OT/NT forms + numerals
  const BOOK_MAP = {
    // Pentateuch
    'Gen':'Genesis','Ge':'Genesis','Gn':'Genesis','Genesis':'Genesis',
    'Ex':'Exodus','Exod':'Exodus','Exodus':'Exodus',
    'Lev':'Leviticus','Leviticus':'Leviticus',
    'Num':'Numbers','Nu':'Numbers','Numbers':'Numbers',
    'Deut':'Deuteronomy','Dt':'Deuteronomy','Deuteronomy':'Deuteronomy',

    // History
    'Josh':'Joshua','Joshua':'Joshua',
    'Judg':'Judges','Jdg':'Judges','Judges':'Judges',
    'Ruth':'Ruth',
    '1Sam':'1-Samuel','I Sam':'1-Samuel','1 Samuel':'1-Samuel','First Samuel':'1-Samuel',
    '2Sam':'2-Samuel','II Sam':'2-Samuel','2 Samuel':'2-Samuel','Second Samuel':'2-Samuel',
    '1Kgs':'1-Kings','1 Kings':'1-Kings','I Kgs':'1-Kings','I Kings':'1-Kings','First Kings':'1-Kings',
    '2Kgs':'2-Kings','2 Kings':'2-Kings','II Kgs':'2-Kings','II Kings':'2-Kings','Second Kings':'2-Kings',
    '1Chr':'1-Chronicles','1 Chron':'1-Chronicles','I Chr':'1-Chronicles','I Chron':'1-Chronicles','1 Chronicles':'1-Chronicles',
    '2Chr':'2-Chronicles','2 Chron':'2-Chronicles','II Chr':'2-Chronicles','II Chron':'2-Chronicles','2 Chronicles':'2-Chronicles',
    'Ezra':'Ezra','Neh':'Nehemiah','Nehemiah':'Nehemiah','Esth':'Esther','Esther':'Esther',

    // Wisdom/Poetry
    'Job':'Job',
    'Ps':'Psalms','Psa':'Psalms','Psalm':'Psalms','Psalms':'Psalms',
    'Prov':'Proverbs','Proverbs':'Proverbs',
    'Eccl':'Ecclesiastes','Qoheleth':'Ecclesiastes','Ecclesiastes':'Ecclesiastes',
    'Song':'Song-of-Solomon','SoS':'Song-of-Solomon','Cant':'Song-of-Solomon','Song of Songs':'Song-of-Solomon','Song of Solomon':'Song-of-Solomon',

    // Major Prophets
    'Isa':'Isaiah','Isaiah':'Isaiah',
    'Jer':'Jeremiah','Jeremiah':'Jeremiah',
    'Lam':'Lamentations','Lamentations':'Lamentations',
    'Ezek':'Ezekiel','Eze':'Ezekiel','Ezekiel':'Ezekiel',
    'Dan':'Daniel','Daniel':'Daniel',

    // Minor Prophets
    'Hos':'Hosea','Hosea':'Hosea','Joel':'Joel','Amos':'Amos','Obad':'Obadiah','Obadiah':'Obadiah',
    'Jonah':'Jonah','Mic':'Micah','Micah':'Micah','Nah':'Nahum','Nahum':'Nahum',
    'Hab':'Habakkuk','Habakkuk':'Habakkuk','Zeph':'Zephaniah','Zephaniah':'Zephaniah',
    'Hag':'Haggai','Haggai':'Haggai','Zech':'Zechariah','Zechariah':'Zechariah','Mal':'Malachi','Malachi':'Malachi',

    // Gospels/Acts
    'Matt':'Matthew','Mt':'Matthew','Matthew':'Matthew',
    'Mark':'Mark','Mk':'Mark',
    'Luke':'Luke','Lk':'Luke','John':'John','Jn':'John',
    'Acts':'Acts',

    // Paul
    'Rom':'Romans','Romans':'Romans',
    '1Cor':'1-Corinthians','I Cor':'1-Corinthians','1 Corinthians':'1-Corinthians',
    '2Cor':'2-Corinthians','II Cor':'2-Corinthians','2 Corinthians':'2-Corinthians',
    'Gal':'Galatians','Galatians':'Galatians','Eph':'Ephesians','Ephesians':'Ephesians',
    'Phil':'Philippians','Philippians':'Philippians',
    'Col':'Colossians','Colossians':'Colossians',
    '1Thess':'1-Thessalonians','I Thess':'1-Thessalonians','1 Thessalonians':'1-Thessalonians',
    '2Thess':'2-Thessalonians','II Thess':'2-Thessalonians','2 Thessalonians':'2-Thessalonians',
    '1Tim':'1-Timothy','I Tim':'1-Timothy','1 Timothy':'1-Timothy',
    '2Tim':'2-Timothy','II Tim':'2-Timothy','2 Timothy':'2-Timothy',
    'Titus':'Titus','Phlm':'Philemon','Philemon':'Philemon',

    // General + Revelation
    'Heb':'Hebrews','Hebrews':'Hebrews','Jas':'James','James':'James',
    '1Pet':'1-Peter','I Pet':'1-Peter','1 Peter':'1-Peter',
    '2Pet':'2-Peter','II Pet':'2-Peter','2 Peter':'2-Peter',
    '1John':'1-John','I John':'1-John','1 John':'1-John',
    '2John':'2-John','II John':'2-John','2 John':'2-John',
    '3John':'3-John','III John':'3-John','3 John':'3-John',
    'Jude':'Jude','Rev':'Revelation','Revelation':'Revelation','Apocalypse':'Revelation',

    // Apocrypha (add more if needed)
    'Tob':'Tobit','Tobit':'Tobit','Jdt':'Judith','Judith':'Judith',
    'Wis':'Wisdom','Wisdom':'Wisdom','Sir':'Sirach','Sirach':'Sirach','Ecclus':'Sirach',
    'Bar':'Baruch','Baruch':'Baruch',
    '1Macc':'1-Maccabees','I Macc':'1-Maccabees','1 Maccabees':'1-Maccabees',
    '2Macc':'2-Maccabees','II Macc':'2-Maccabees','2 Maccabees':'2-Maccabees'
  };

  // ----------------------- UTILITIES -----------------------
  const cache = new Map();
  const DASH_RE = /[\u2010-\u2015\u2212]/g; // hyphen range, en/em, minus

  const ARABIC_TO_ROMAN_SLUG = {1:'i',2:'ii',3:'iii'};

  function normalizeDashes(s){ return String(s).replace(DASH_RE, '-'); }

  // Create lowercase, hyphenated, roman-numeral slug (e.g., "2-Kings" -> "ii-kings")
  function slugifyBook(bookCanonical){
    const m = /^([123])-(.+)$/.exec(bookCanonical);
    if (m){
      const rn = ARABIC_TO_ROMAN_SLUG[+m[1]] || m[1];
      return `${rn}-${m[2].toLowerCase().replace(/\s+/g,'-')}`;
    }
    return bookCanonical.toLowerCase().replace(/\s+/g,'-');
  }

  function canonFor(bookCanonical){ return BOOK_CANON[bookCanonical] || 'tanakh'; }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ----------------------- PARSING -----------------------
  // Accepts: "Ps 68:31", "Song 1:5-6", "Isa 20", "1 Kgs 8:10-11"
  function parseRef(ref){
    ref = normalizeDashes(ref);
    const m = /^\s*([^\d]+?)\s+(\d+)(?::([\d,\-\s]+))?\s*$/.exec(ref);
    if (!m) return null;
    const tokenRaw = m[1].trim().replace(/\s+/g,' ');
    const chapter = parseInt(m[2],10);
    const versesRaw = (m[3] || '').trim();

    const bookCanonical = resolveBookCanonical(tokenRaw);
    const parts = versesRaw ? splitVerseParts(versesRaw) : [{type:'chapter'}];

    return { bookCanonical, chapter, parts };
  }

  function resolveBookCanonical(tokenRaw){
    // Try direct map first
    if (BOOK_MAP[tokenRaw]) return BOOK_MAP[tokenRaw];

    // Normalize things like "II Kings" → "2 Kings" → BOOK_MAP
    const romanToArabic = tokenRaw
      .replace(/^III(\s|-)/i, '3$1')
      .replace(/^II(\s|-)/i,  '2$1')
      .replace(/^I(\s|-)/i,   '1$1')
      .replace(/\s+/g,' ')
      .trim();

    if (BOOK_MAP[romanToArabic]) return BOOK_MAP[romanToArabic];

    // Compact forms like "2Kings" → "2 Kings"
    const compact = romanToArabic.replace(/^([123])([A-Za-z])/, '$1 $2');
    if (BOOK_MAP[compact]) return BOOK_MAP[compact];

    // Fallback: title case words, replace spaces with hyphens only later in slugify
    return tokenRaw
      .split(/\s+/)
      .map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase())
      .join('-');
  }

  function splitVerseParts(vs){
    // "1-3,7,9-10"
    const parts = [];
    vs.split(',').forEach(seg=>{
      const s = seg.trim();
      if (!s) return;
      if (s.includes('-')){
        const [a,b] = s.split('-').map(x=>parseInt(x.trim(),10));
        if (!isNaN(a) && !isNaN(b)) parts.push({type:'range', from:Math.min(a,b), to:Math.max(a,b)});
      } else {
        const v = parseInt(s,10);
        if (!isNaN(v)) parts.push({type:'single', from:v, to:v});
      }
    });
    return parts;
  }

  // ----------------------- DATA FETCH -----------------------
  async function getChapter(bookCanonical, chapter){
    const key = `${bookCanonical}|${chapter}`;
    if (cache.has(key)) return cache.get(key);

    const canon = canonFor(bookCanonical);
    const slug  = slugifyBook(bookCanonical); // e.g., 'psalms', 'mark', 'ii-kings'
    const url   = `${ROOT}/${canon}/${slug}/${chapter}.json`;

    const res = await fetch(url, {cache:'force-cache'});
    if (!res.ok) throw new Error(`Missing chapter data: ${url}`);
    const json = await res.json();
    cache.set(key, json);
    return json;
  }

  function pickTranslation(chapterJson){
    for (const k of TRANSLATION_ORDER){
      if (chapterJson && chapterJson[k]) return chapterJson[k];
    }
    if (chapterJson && Array.isArray(chapterJson.verses)) return chapterJson.verses;
    return chapterJson || {};
  }

  function extractVerses(trans, parts){
    const getVerse = (n)=>{
      if (Array.isArray(trans)){
        const hit = trans.find(x => (x.v ?? x.verse) == n);
        return hit ? (hit.t ?? hit.text ?? '') : '';
      } else if (trans && typeof trans === 'object'){
        return trans[n] || '';
      }
      return '';
    };

    const chunks = [];
    for (const p of parts){
      if (p.type === 'single'){
        const t = getVerse(p.from);
        if (t) chunks.push({label:`v${p.from}`, text:escapeHtml(t)});
      } else if (p.type === 'range'){
        const lines = [];
        for (let v=p.from; v<=p.to; v++){
          const t = getVerse(v);
          if (t) lines.push(`<span class="vr">${v}</span> ${escapeHtml(t)}`);
        }
        if (lines.length) chunks.push({label:`v${p.from}-${p.to}`, text:lines.join('<br>')});
      }
    }
    return chunks;
  }

  function autosummarizeChapter(chapterJson){
    const built = chapterJson && (chapterJson.summary || chapterJson.Summary);
    if (typeof built === 'string' && built.trim()) return built.trim();

    const trans = pickTranslation(chapterJson);
    let total = 0;
    if (Array.isArray(trans)) total = trans.length;
    else if (trans && typeof trans === 'object') total = Object.keys(trans).length;

    return `This chapter contains approximately ${total} verses.`;
  }

  // ----------------------- HOVER UI -----------------------
  let hoverHideTimer = null;

  function ensureHoverContainer(){
    let hc = document.querySelector('#bible-hovercard');
    if (hc) return hc;
    hc = document.createElement('div');
    hc.id = 'bible-hovercard';
    hc.setAttribute('aria-hidden','true');
    hc.style.position = 'absolute';
    hc.style.maxWidth = '520px';
    hc.style.zIndex = '9999';
    hc.style.background = 'var(--white, #fff)';
    hc.style.color = 'var(--ink, #0b2340)';
    hc.style.border = '1px solid rgba(0,0,0,.08)';
    hc.style.borderRadius = '12px';
    hc.style.boxShadow = '0 10px 30px rgba(0,0,0,.18)';
    hc.style.padding = '10px';
    hc.style.transition = 'opacity .12s ease';
    hc.style.opacity = '0';

    hc.innerHTML = `
      <div class="bh-inner" style="padding:8px 10px 10px;">
        <div class="bh-header" style="display:flex;align-items:center;justify-content:space-between;font-weight:600;margin-bottom:6px;">
          <span class="bh-ref" style="color:var(--brand,#054A91)"></span>
          <button class="bh-close" aria-label="Close" style="background:transparent;border:0;font-size:20px;line-height:1;color:var(--muted,#6b7280);cursor:pointer;border-radius:50%;width:28px;height:28px">&times;</button>
        </div>
        <div class="bh-body" style="font-size:14px;line-height:1.45"></div>
      </div>`;
    document.body.appendChild(hc);
    hc.querySelector('.bh-close').addEventListener('click', hideHover);
    return hc;
  }

  function showHoverFor(el, html){
    clearTimeout(hoverHideTimer);
    const hc = ensureHoverContainer();
    const refText = el.dataset.ref || el.getAttribute('data-ref') || el.textContent || '';
    hc.querySelector('.bh-ref').textContent = refText;
    hc.querySelector('.bh-body').innerHTML = html;

    hc.style.opacity = '1';
    hc.setAttribute('aria-hidden','false');

    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.bottom + 8;
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

  function handleLeave(){
    clearTimeout(hoverHideTimer);
    hoverHideTimer = setTimeout(hideHover, 120);
  }

  // ----------------------- BINDINGS -----------------------
  async function renderRefIntoHover(el, ref){
    try {
      const parsed = parseRef(ref);
      if (!parsed){ showHoverFor(el, `<div>Couldn’t parse: ${escapeHtml(ref)}</div>`); return; }

      const chapterJson = await getChapter(parsed.bookCanonical, parsed.chapter);
      const trans = pickTranslation(chapterJson);

      let html = '';
      // full-chapter case
      if (parsed.parts.some(p=>p.type==='chapter')){
        const summary = autosummarizeChapter(chapterJson);
        html += `<div class="bh-section"><div class="bh-label" style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#6b7280);margin-bottom:4px;">Chapter Overview</div><div class="bh-text">${escapeHtml(summary)}</div></div>`;
      }
      // verse/range chunks
      const chunks = extractVerses(trans, parsed.parts.filter(p=>p.type!=='chapter'));
      chunks.forEach(({label,text})=>{
        html += `<div class="bh-section" style="margin:8px 0"><div class="bh-label" style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#6b7280);margin-bottom:4px;">${label}</div><div class="bh-text">${text}</div></div>`;
      });

      if (!html) html = `<div class="bh-section"><div class="bh-text">No verses found for ${escapeHtml(ref)}.</div></div>`;
      showHoverFor(el, html);
    } catch (e){
      showHoverFor(el, `<div class="bh-section"><div class="bh-text">Couldn’t load: ${escapeHtml(ref)}</div></div>`);
    }
  }

  // For your existing markup: <span class="verse" data-ref="Ps 68:31">...</span>
  function bindExistingVerseSpans(root=document){
    root.querySelectorAll('.verse[data-ref]').forEach(el=>{
      const ref = normalizeDashes((el.dataset.ref || '').trim());
      if (!ref) return;
      el.addEventListener('mouseenter', ()=>renderRefIntoHover(el, ref));
      el.addEventListener('mouseleave', handleLeave);
      el.addEventListener('focus', ()=>renderRefIntoHover(el, ref));
      el.addEventListener('blur', handleLeave);
    });
  }

  // Optional: auto-decorate plain text citations (e.g., "Ps 68:31") into anchors
  const CITE_RE = new RegExp(
    // Build a permissive matcher; book token then space, chapter, optional :verses
    String.raw`(?:^|[\s\(\[\{,;])` + // leading boundary
    String.raw`(` + [
      // Build from keys of BOOK_MAP plus a few generic patterns to catch “II Kings”, etc.
      ...Object.keys(BOOK_MAP).sort((a,b)=>b.length-a.length).map(escapeRegex),
      'I\\s+Sam','II\\s+Sam','III\\s+John','II\\s+John','I\\s+John',
      'I\\s+Kgs','II\\s+Kgs','I\\s+Chr','II\\s+Chr',
      'I\\s+Pet','II\\s+Pet',
      'I\\s+Cor','II\\s+Cor',
      'I\\s+Thess','II\\s+Thess',
      'I\\s+Tim','II\\s+Tim',
      'I\\s+Macc','II\\s+Macc'
    ].join('|') + String.raw`)` +
    String.raw`[\s\-]+(\d+)(?::([0-9,\-\u2010-\u2015\u2212\s]+))?` +
    String.raw`(?=$|[\s\)\]\},;:.!?"'—–-])`, 'g'
  );

  function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  function decorateCitations(root=document){
    const nodeFilter = NodeFilter.SHOW_TEXT;
    const walker = document.createTreeWalker(root.body || root, nodeFilter, null);
    const targets = [];
    while (walker.nextNode()){
      const node = walker.currentNode;
      if (!node.nodeValue) continue;
      if (CITE_RE.test(node.nodeValue)){ targets.push(node); }
      CITE_RE.lastIndex = 0;
    }
    targets.forEach(node=>{
      const frag = document.createDocumentFragment();
      let text = node.nodeValue, last = 0;
      CITE_RE.lastIndex = 0;
      let m;
      while ((m = CITE_RE.exec(text))){
        const [full, bookTok, chap, verses] = m;
        const start = m.index, end = start + full.length;

        if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
        const ref = normalizeDashes(`${bookTok} ${chap}${verses?`:${verses}`:''}`).replace(/\s{2,}/g,' ').trim();

        const a = document.createElement('a');
        a.className = 'bible-ref';
        a.href = 'javascript:void(0)';
        a.dataset.ref = ref;
        a.textContent = ref;
        a.addEventListener('mouseenter', ()=>renderRefIntoHover(a, ref));
        a.addEventListener('mouseleave', handleLeave);
        a.addEventListener('focus', ()=>renderRefIntoHover(a, ref));
        a.addEventListener('blur', handleLeave);

        frag.appendChild(a);
        last = end;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  // ----------------------- INIT -----------------------
  function init(){
    if (ENABLE_AUTODECORATE) decorateCitations(document);
    bindExistingVerseSpans(document);

    // Dismiss on outside click
    document.addEventListener('click', (ev)=>{
      const hc = document.querySelector('#bible-hovercard');
      if (!hc) return;
      if (!hc.contains(ev.target) && !ev.target.closest('.bible-ref') && !ev.target.closest('.verse[data-ref]')){
        hideHover();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
