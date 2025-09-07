(function(){
  // --- Book normalization ---
  const MAP = {
    'Gn':'Genesis','Gen':'Genesis','Genesis':'Genesis',
    'Ex':'Exodus','Exod':'Exodus','Exodus':'Exodus',
    'Lev':'Leviticus','Leviticus':'Leviticus',
    'Num':'Numbers','Nm':'Numbers','Numbers':'Numbers',
    'Deut':'Deuteronomy','Dt':'Deuteronomy','Deuteronomy':'Deuteronomy',
    'Josh':'Joshua','Joshua':'Joshua','Judg':'Judges','Judges':'Judges','Ruth':'Ruth',
    '1 Sam':'1 Samuel','1Sam':'1 Samuel','1 Samuel':'1 Samuel',
    '2 Sam':'2 Samuel','2Sam':'2 Samuel','2 Samuel':'2 Samuel',
    '1 Kgs':'1 Kings','1 Kings':'1 Kings','2 Kgs':'2 Kings','2 Kings':'2 Kings',
    '1 Chr':'1 Chronicles','1 Chronicles':'1 Chronicles',
    '2 Chr':'2 Chronicles','2 Chronicles':'2 Chronicles',
    'Ezra':'Ezra','Neh':'Nehemiah','Nehemiah':'Nehemiah','Esth':'Esther','Esther':'Esther',
    'Job':'Job','Ps':'Psalm','Psa':'Psalm','Psalm':'Psalm','Psalms':'Psalms',
    'Prov':'Proverbs','Proverbs':'Proverbs','Eccl':'Ecclesiastes','Ecclesiastes':'Ecclesiastes',
    'Song':'Song of Songs','Song of Solomon':'Song of Songs','Song of Songs':'Song of Songs',
    'Isa':'Isaiah','Isaiah':'Isaiah','Jer':'Jeremiah','Jeremiah':'Jeremiah',
    'Lam':'Lamentations','Lamentations':'Lamentations','Ezek':'Ezekiel','Ezekiel':'Ezekiel',
    'Dan':'Daniel','Daniel':'Daniel','Hos':'Hosea','Hosea':'Hosea','Joel':'Joel','Amos':'Amos',
    'Obad':'Obadiah','Obadiah':'Obadiah','Jon':'Jonah','Jonah':'Jonah',
    'Mic':'Micah','Micah':'Micah','Nah':'Nahum','Nahum':'Nahum',
    'Hab':'Habakkuk','Habakkuk':'Habakkuk','Zeph':'Zephaniah','Zephaniah':'Zephaniah',
    'Hag':'Haggai','Haggai':'Haggai','Zech':'Zechariah','Zechariah':'Zechariah','Mal':'Malachi','Malachi':'Malachi',
    'Matt':'Matthew','Matthew':'Matthew','Mark':'Mark','Luke':'Luke','John':'John','Acts':'Acts',
    'Rom':'Romans','Romans':'Romans','1 Cor':'1 Corinthians','1 Corinthians':'1 Corinthians',
    '2 Cor':'2 Corinthians','2 Corinthians':'2 Corinthians',
    'Gal':'Galatians','Galatians':'Galatians','Eph':'Ephesians','Ephesians':'Ephesians',
    'Phil':'Philippians','Philippians':'Philippians','Col':'Colossians','Colossians':'Colossians',
    '1 Thess':'1 Thessalonians','1 Thessalonians':'1 Thessalonians',
    '2 Thess':'2 Thessalonians','2 Thessalonians':'2 Thessalonians',
    '1 Tim':'1 Timothy','1 Timothy':'1 Timothy','2 Tim':'2 Timothy','2 Timothy':'2 Timothy',
    'Titus':'Titus','Philem':'Philemon','Philemon':'Philemon','Heb':'Hebrews','Hebrews':'Hebrews',
    'James':'James','1 Pet':'1 Peter','1 Peter':'1 Peter','2 Pet':'2 Peter','2 Peter':'2 Peter',
    '1 John':'1 John','2 John':'2 John','3 John':'3 John','Jude':'Jude','Rev':'Revelation','Revelation':'Revelation'
  };
  function canonBook(raw){
    raw = (raw||'').replace(/\s+/g,' ').trim();
    const roman = {'I':'1','II':'2','III':'3'};
    raw = raw.replace(/^(I{1,3})\s/, (_,r)=> (roman[r]||r)+' ');
    return MAP[raw] || raw;
  }
  function canonRef(str){
    // Accept "Gen 1:1-3", "Genesis 1:1–3", etc.
    const m = String(str||'').match(/^(.+?)\s+(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/);
    if(!m) return null;
    const book = canonBook(m[1]);
    const c = m[2], v1 = m[3], v2 = m[4]||'';
    if (v2 && (parseInt(v2,10) - parseInt(v1,10) + 1) > 3) return null; // limit to 1–3 verses
    return book + ' ' + c + ':' + v1 + (v2 ? '–'+v2 : '');
  }

  // --- Local verse cache (KJV public domain excerpts) ---
  const LOCAL = {
    'Psalm 68:31': 'Princes shall come out of Egypt; Ethiopia shall soon stretch out her hands unto God.',
    'Isaiah 11:11': 'And it shall come to pass in that day, that the Lord shall set his hand again the second time to recover the remnant of his people...',
    'Song of Songs 1:5': 'I am black, but comely, O ye daughters of Jerusalem...',
    'Song of Songs 1:5–6': 'I am black, but comely... look not upon me, because I am black, because the sun hath looked upon me.',
    'Jeremiah 13:23': 'Can the Ethiopian change his skin, or the leopard his spots? then may ye also do good...'
  };

  // Optional per-page JSON cache:
  // <script type="application/json" id="verse-cache">{ "Genesis 1:1–3": "..." }</script>
  function pageCache(){
    try{
      const el = document.getElementById('verse-cache') || document.getElementById('bible-verse-cache');
      if (!el) return null;
      return JSON.parse(el.textContent||'{}');
    }catch(e){ return null; }
  }

  // --- Scanner: wrap inline refs in bibliography and article content ---
  const BOOK_ALT = Object.keys(MAP).concat(Object.values(MAP))
    .map(b=>b.replace(/\s+/g,'\\s+'))
    .sort((a,b)=>b.length-a.length).join('|');
  const REF_RE = new RegExp(String.raw`\b((?:`+BOOK_ALT+String.raw`))\.?\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?`,'gi');

  function validRange(v1,v2){
    if(!v2) return true;
    const a=+v1,b=+v2; if(isNaN(a)||isNaN(b)||b<a) return false;
    return (b-a+1) <= 3;
  }

  function wrapTextNode(node){
    const text = node.nodeValue;
    REF_RE.lastIndex = 0;
    let m, idx=0, frag=document.createDocumentFragment(), changed=false;

    while ((m = REF_RE.exec(text))){
      const before = text.slice(idx, m.index);
      if (before) frag.appendChild(document.createTextNode(before));

      const book = canonBook(m[1]), ch = m[2], v1 = m[3], v2 = m[4]||'';
      const raw = book + ' ' + ch + ':' + v1 + (v2? '–'+v2 : '');
      if (!validRange(v1,v2)) {
        frag.appendChild(document.createTextNode(m[0]));
      } else {
        const span = document.createElement('span');
        span.className = 'verse';
        span.tabIndex = 0;
        span.dataset.ref = raw;
        span.textContent = m[0];
        frag.appendChild(span);
        changed = true;
      }
      idx = REF_RE.lastIndex;
    }

    if (!changed) return;
    const after = text.slice(idx);
    if (after) frag.appendChild(document.createTextNode(after));
    node.parentNode.replaceChild(frag, node);
  }

  function scan(root){
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || n.nodeValue.length < 6) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement; if(!p) return NodeFilter.FILTER_REJECT;
        if (/^(script|style|noscript|code|pre|textarea|input|select|option)$/i.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('a,button,[contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
        if (!/:\s*\d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[]; let cur;
    while (cur = walker.nextNode()) nodes.push(cur);
    nodes.forEach(wrapTextNode);
  }

  // --- Hover card ---
  function ensureCard(){
    let el = document.getElementById('verse-card');
    if (!el){
      el = document.createElement('div');
      el.id = 'verse-card';
      el.setAttribute('role','tooltip');
      el.innerHTML = '<div class="vc-head"></div><div class="vc-text"></div>';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    return el;
  }
  function position(card, target){
    const r = target.getBoundingClientRect();
    card.style.visibility='hidden'; card.style.display='block';
    const cw=card.offsetWidth, ch=card.offsetHeight;
    card.style.visibility='';
    let left = r.left, top = r.top - ch - 8;
    if (left + cw > window.innerWidth - 12) left = window.innerWidth - cw - 12;
    if (left < 12) left = 12;
    if (top < 12) top = r.bottom + 8;
    card.style.left = (left + window.scrollX) + 'px';
    card.style.top  = (top  + window.scrollY) + 'px';
  }
  function resolveText(ref, el){
    // 1) explicit data-text / data-note on the element
    const dt = el.getAttribute('data-text') || el.getAttribute('data-note');
    if (dt) return dt;
    // 2) per-page JSON cache
    const cache = pageCache();
    if (cache && cache[ref]) return cache[ref];
    // 3) built-in local cache
    if (LOCAL[ref]) return LOCAL[ref];
    // 4) last resort: show normalized ref only
    return '';
  }
  function showCard(el){
    const raw = el.getAttribute('data-ref') || el.textContent.trim();
    const ref = canonRef(raw) || raw;
    const card = ensureCard();
    card.querySelector('.vc-head').textContent = ref;
    const text = resolveText(ref, el);
    card.querySelector('.vc-text').textContent = text || 'Verse preview';
    position(card, el);
  }
  function hideCard(){
    const c = document.getElementById('verse-card');
    if (c) c.style.display = 'none';
  }

  function bind(){
    document.addEventListener('mouseenter', e=>{
      const t = e.target.closest('.verse');
      if (t) showCard(t);
    }, true);
    document.addEventListener('mouseleave', e=>{
      const t = e.target.closest('.verse');
      if (t) hideCard();
    }, true);
    document.addEventListener('focusin', e=>{
      const t = e.target.closest('.verse');
      if (t) showCard(t);
    });
    document.addEventListener('focusout', e=>{
      const t = e.target.closest('.verse');
      if (t) hideCard();
    });
    document.addEventListener('click', e=>{
      const t = e.target.closest('.verse');
      const c = document.getElementById('verse-card');
      if (t){
        if (c && c.style.display === 'block') hideCard(); else showCard(t);
        e.preventDefault();
      } else if (c && !e.target.closest('#verse-card')) {
        hideCard();
      }
    });
    window.addEventListener('scroll', hideCard, {passive:true});
    window.addEventListener('resize', hideCard, {passive:true});
  }

  function init(){
    // Limit to article content + footnotes/refs
    const roots = [];
    const main = document.querySelector('.article-content'); if (main) roots.push(main);
    const notes = document.querySelector('.footnotes, .refs'); if (notes) roots.push(notes);
    roots.forEach(scan);
    // Also respect any pre-marked .verse spans
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
