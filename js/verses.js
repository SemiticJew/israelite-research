(function(){
  // === Config ===
  // Recognized book names/abbreviations
  const BOOKS = [
    'Genesis','Gen','Gn','Exodus','Exod','Ex','Leviticus','Lev','Numbers','Num','Nm','Deuteronomy','Deut','Dt',
    'Joshua','Josh','Judges','Judg','Ruth',
    '1 Samuel','1Sam','1 Sam','I Sam','2 Samuel','2Sam','2 Sam','II Sam',
    '1 Kings','1Kgs','1 Kgs','2 Kings','2Kgs','2 Kgs',
    '1 Chronicles','1Chr','1 Chr','2 Chronicles','2Chr','2 Chr',
    'Ezra','Nehemiah','Neh','Esther','Esth','Job','Psalm','Psalms','Ps','Psa','Proverbs','Prov',
    'Ecclesiastes','Eccl','Song of Songs','Song of Solomon','Song',
    'Isaiah','Isa','Jeremiah','Jer','Lamentations','Lam','Ezekiel','Ezek','Daniel','Dan',
    'Hosea','Hos','Joel','Amos','Obadiah','Obad','Jonah','Jon','Micah','Mic','Nahum','Nah',
    'Habakkuk','Hab','Zephaniah','Zeph','Haggai','Hag','Zechariah','Zech','Malachi','Mal',
    'Matthew','Matt','Mark','Luke','John','Acts','Romans','Rom',
    '1 Corinthians','1 Cor','2 Corinthians','2 Cor',
    'Galatians','Gal','Ephesians','Eph','Philippians','Phil','Colossians','Col',
    '1 Thessalonians','1 Thess','2 Thessalonians','2 Thess',
    '1 Timothy','1 Tim','2 Timothy','2 Tim','Titus','Philemon','Philem','Hebrews','Heb',
    'James','1 Peter','1 Pet','2 Peter','2 Pet',
    '1 John','2 John','3 John','Jude','Revelation','Rev'
  ];

  // Normalize variants to canonical names
  function canonBook(raw){
    raw = raw.replace(/\s+/g,' ').trim();
    const roman = {'I':'1','II':'2','III':'3'};
    raw = raw.replace(/^(I{1,3})\s/, (_,r)=> roman[r]+' ');
    const M = {
      Gn:'Genesis', Gen:'Genesis', Genesis:'Genesis',
      Ex:'Exodus', Exod:'Exodus', Exodus:'Exodus',
      Lev:'Leviticus', Leviticus:'Leviticus',
      Num:'Numbers', Nm:'Numbers', Numbers:'Numbers',
      Deut:'Deuteronomy', Dt:'Deuteronomy', Deuteronomy:'Deuteronomy',
      Josh:'Joshua', Joshua:'Joshua', Judg:'Judges', Judges:'Judges', Ruth:'Ruth',
      '1 Sam':'1 Samuel','1Sam':'1 Samuel','1 Samuel':'1 Samuel',
      '2 Sam':'2 Samuel','2Sam':'2 Samuel','2 Samuel':'2 Samuel',
      '1 Kgs':'1 Kings','1 Kings':'1 Kings','2 Kgs':'2 Kings','2 Kings':'2 Kings',
      '1 Chr':'1 Chronicles','1 Chronicles':'1 Chronicles',
      '2 Chr':'2 Chronicles','2 Chronicles':'2 Chronicles',
      Ezra:'Ezra', Neh:'Nehemiah', Nehemiah:'Nehemiah', Esth:'Esther', Esther:'Esther',
      Job:'Job', Ps:'Psalm', Psa:'Psalm', Psalm:'Psalm', Psalms:'Psalms',
      Prov:'Proverbs', Proverbs:'Proverbs', Eccl:'Ecclesiastes', Ecclesiastes:'Ecclesiastes',
      Song:'Song of Songs','Song of Solomon':'Song of Songs','Song of Songs':'Song of Songs',
      Isa:'Isaiah', Isaiah:'Isaiah', Jer:'Jeremiah', Jeremiah:'Jeremiah',
      Lam:'Lamentations', Lamentations:'Lamentations', Ezek:'Ezekiel', Ezekiel:'Ezekiel',
      Dan:'Daniel', Daniel:'Daniel', Hos:'Hosea', Hosea:'Hosea', Joel:'Joel', Amos:'Amos',
      Obad:'Obadiah', Obadiah:'Obadiah', Jon:'Jonah', Jonah:'Jonah',
      Mic:'Micah', Micah:'Micah', Nah:'Nahum', Nahum:'Nahum',
      Hab:'Habakkuk', Habakkuk:'Habakkuk', Zeph:'Zephaniah', Zephaniah:'Zephaniah',
      Hag:'Haggai', Haggai:'Haggai', Zech:'Zechariah', Zechariah:'Zechariah',
      Mal:'Malachi', Malachi:'Malachi',
      Matt:'Matthew', Matthew:'Matthew', Mark:'Mark', Luke:'Luke', John:'John', Acts:'Acts',
      Rom:'Romans', Romans:'Romans', '1 Cor':'1 Corinthians','1 Corinthians':'1 Corinthians',
      '2 Cor':'2 Corinthians','2 Corinthians':'2 Corinthians',
      Gal:'Galatians', Galatians:'Galatians', Eph:'Ephesians', Ephesians:'Ephesians',
      Phil:'Philippians', Philippians:'Philippians', Col:'Colossians', Colossians:'Colossians',
      '1 Thess':'1 Thessalonians','1 Thessalonians':'1 Thessalonians',
      '2 Thess':'2 Thessalonians','2 Thessalonians':'2 Thessalonians',
      '1 Tim':'1 Timothy','1 Timothy':'1 Timothy','2 Tim':'2 Timothy','2 Timothy':'2 Timothy',
      Titus:'Titus', Philem:'Philemon', Philemon:'Philemon', Heb:'Hebrews', Hebrews:'Hebrews',
      James:'James','1 Pet':'1 Peter','1 Peter':'1 Peter','2 Pet':'2 Peter','2 Peter':'2 Peter',
      '1 John':'1 John','2 John':'2 John','3 John':'3 John', Jude:'Jude', Rev:'Revelation', Revelation:'Revelation'
    };
    return M[raw] || raw;
  }

  // Build regex for (Book)(space?)Chapter:Verse(-Verse)
  const BOOK_ALT = BOOKS.map(b=>b.replace(/\s+/g,'\\s+')).sort((a,b)=>b.length-a.length).join('|');
  const REF_RE = new RegExp(
    String.raw`\b((?:` + BOOK_ALT + String.raw`))\.?\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?`,
    'gi'
  );

  // Only accept up to 3 verses (single verse or a range of max length 3)
  function validRange(v1, v2){
    if (!v2) return true;
    const a = parseInt(v1,10), b = parseInt(v2,10);
    if (isNaN(a) || isNaN(b) || b < a) return false;
    return (b - a + 1) <= 3;
  }

  // Wrap matched references in .verse spans (non-destructive scan)
  function wrapTextNode(node){
    const text = node.nodeValue;
    REF_RE.lastIndex = 0;
    let m, idx = 0, frag = document.createDocumentFragment(), changed = false;

    while ((m = REF_RE.exec(text))){
      const before = text.slice(idx, m.index);
      if (before) frag.appendChild(document.createTextNode(before));

      const bookRaw = m[1];
      const chap = m[2];
      const v1 = m[3];
      const v2 = m[4] || '';

      if (!validRange(v1, v2)){
        // Not eligible: append as-is
        frag.appendChild(document.createTextNode(m[0]));
      } else {
        const book = canonBook(bookRaw);
        let ref = `${book} ${chap}:${v1}${v2 ? '–'+v2 : ''}`;

        const span = document.createElement('span');
        span.className = 'verse';
        span.tabIndex = 0;
        span.dataset.ref = ref;
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
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (/^(script|style|noscript|code|pre|textarea|input|select|option)$/i.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('a,button,[contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
        if (!/:\s*\d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT; // fast check
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[]; let cur;
    while (cur = walker.nextNode()) nodes.push(cur);
    nodes.forEach(wrapTextNode);
  }

  // Hover card
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
  function showCard(el){
    const ref = el.dataset.ref || el.textContent.trim();
    const card = ensureCard();
    card.querySelector('.vc-head').textContent = ref;
    // Optional: attach short preview text via data-note; if absent, show a neutral hint
    card.querySelector('.vc-text').textContent = el.dataset.note || 'Reference preview';
    position(card, el);
  }
  function hideCard(){
    const c = document.getElementById('verse-card');
    if (c) c.style.display = 'none';
  }

  function bindEvents(){
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
    // Touch toggle
    document.addEventListener('click', e=>{
      const t = e.target.closest('.verse');
      const c = document.getElementById('verse-card');
      if (t){
        if (c && c.style.display === 'block') hideCard(); else showCard(t);
      } else if (c && !e.target.closest('#verse-card')) {
        hideCard();
      }
    });
    window.addEventListener('scroll', hideCard, {passive:true});
    window.addEventListener('resize', hideCard, {passive:true});
  }

  function init(){
    // Limit scanning to article body + bibliography/footnotes
    const roots = [];
    const main = document.querySelector('.article-content');
    if (main) roots.push(main);
    const notes = document.querySelector('.footnotes, .refs');
    if (notes) roots.push(notes);

    roots.forEach(scan);
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
