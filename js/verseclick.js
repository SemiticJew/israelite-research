<script>
(function(){
  const CANONS = ['tanakh','newtestament','apocrypha'];

  const REF_RE = /\b((?:[1-3]\s*)?[A-Za-z][A-Za-z\.\-\s]+?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?\b/g;

  const $tip = document.createElement('div');
  $tip.className = 'vcTooltip';
  $tip.setAttribute('role','dialog');
  $tip.setAttribute('aria-hidden','true');
  document.addEventListener('DOMContentLoaded', ()=> document.body.appendChild($tip));

  const esc = s => String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const slugify = (name) => {
    let s = (name||'').trim()
      .replace(/^Song of Songs$/i,'Song of Solomon')
      .replace(/^Ecclesiasticus$/i,'Sirach')
      .replace(/^Canticles$/i,'Song of Solomon')
      .replace(/^Wis$/i,'Wisdom')
      .replace(/^Sir$/i,'Sirach');
    s = s.replace(/^(I{1,3}|IV|V|VI{0,3}|IX|X)\s+/i, m=>{
      const map={I:'1',II:'2',III:'3',IV:'4',V:'5',VI:'6',VII:'7',VIII:'8',IX:'9',X:'10'};
      return (map[m.trim().toUpperCase()]||m)+ ' ';
    });
    s = s.toLowerCase().replace(/&/g,'and').replace(/[’'`.]/g,'');
    s = s.replace(/^(\d+)\s+/, '$1-');
    s = s.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return s;
  };

  // Caching previews by key: canon|slug|ch|v
  const PREVIEW_CACHE = new Map();

  async function fetchVerse(bookName, chapter, verse){
    const slug = slugify(bookName);
    for (const canon of CANONS) {
      const key = `${canon}|${slug}|${chapter}|${verse}`;
      if (PREVIEW_CACHE.has(key)) return PREVIEW_CACHE.get(key);
      try {
        const res = await fetch(`/israelite-research/data/${canon}/${slug}/${chapter}.json`, { cache:'force-cache' });
        if (!res.ok) continue;
        const j = await res.json();
        const found = Array.isArray(j.verses) ? j.verses.find(x => Number(x.v) === Number(verse)) : null;
        if (found) {
          const payload = { canon, slug, chapter:Number(chapter), verse:Number(verse), text: found.t || '' , book: bookName };
          PREVIEW_CACHE.set(key, payload);
          return payload;
        }
      } catch {}
    }
    return null;
  }

  let tipTimer=null;
  function showTip(html, x, y){
    $tip.innerHTML = html;
    $tip.style.left = (x+12)+'px';
    $tip.style.top  = (y+12)+'px';
    $tip.classList.add('open');
    $tip.setAttribute('aria-hidden','false');
  }
  function hideTipSoon(){
    clearTimeout(tipTimer);
    tipTimer = setTimeout(()=>{ $tip.classList.remove('open'); $tip.setAttribute('aria-hidden','true'); }, 80);
  }

  // Convert text nodes to links (skip H1/H4/A/SCRIPT/STYLE/PRE/CODE)
  function shouldSkip(node){
    if (!node) return true;
    if (node.nodeType !== Node.TEXT_NODE) return true;
    const p = node.parentElement;
    if (!p) return true;
    const tag = p.tagName;
    if (['A','SCRIPT','STYLE','PRE','CODE'].includes(tag)) return true;
    if (tag === 'H1' || tag === 'H4') return true;
    if (p.closest('h1, h4, script, style, pre, code, a')) return true;
    return false;
  }

  function linkify(container){
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
        if (!REF_RE.test(n.nodeValue)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const text = node.nodeValue;
      REF_RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = REF_RE.exec(text)) !== null){
        const before = text.slice(last, m.index);
        if (before) frag.appendChild(document.createTextNode(before));

        const [full, book, ch, v1, v2] = m;
        const a = document.createElement('a');
        a.className = 'vcVerseLink';
        a.href = 'javascript:void(0)';
        a.setAttribute('data-vc-book', book.trim());
        a.setAttribute('data-vc-ch', String(ch));
        a.setAttribute('data-vc-v', String(v1));
        a.textContent = full;
        wireLink(a);
        frag.appendChild(a);

        last = REF_RE.lastIndex;
      }
      const rest = text.slice(last);
      if (rest) frag.appendChild(document.createTextNode(rest));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function wireLink(a){
    let hoverDelay;
    a.addEventListener('mouseenter', async (ev)=>{
      clearTimeout(hoverDelay);
      hoverDelay = setTimeout(async ()=>{
        const book = a.getAttribute('data-vc-book');
        const ch   = a.getAttribute('data-vc-ch');
        const v    = a.getAttribute('data-vc-v');
        const data = await fetchVerse(book, ch, v);
        if (!data) { showTip('<div class="vcT">Reference not found.</div>', ev.clientX, ev.clientY); return; }
        const html = `<div class="vcH">${esc(book)} ${ch}:${v}</div><div class="vcT">${esc(data.text)}</div>`;
        showTip(html, ev.clientX, ev.clientY);
      }, 120);
    });
    a.addEventListener('mousemove', (ev)=>{
      if ($tip.classList.contains('open')) {
        $tip.style.left = (ev.clientX+12)+'px';
        $tip.style.top  = (ev.clientY+12)+'px';
      }
    });
    a.addEventListener('mouseleave', ()=>{
      clearTimeout(hoverDelay);
      hideTipSoon();
    });
    a.addEventListener('click', async (ev)=>{
      ev.preventDefault();
      const book = a.getAttribute('data-vc-book');
      const ch   = a.getAttribute('data-vc-ch');
      const v    = a.getAttribute('data-vc-v');
      // Resolve canon/slug for the chapter link (use cache if present, else try fetchVerse)
      let target=null;
      for (const canon of CANONS){
        const slug = slugify(book);
        const key = `${canon}|${slug}|${ch}|${v}`;
        if (PREVIEW_CACHE.has(key)) { target = {canon, slug}; break; }
      }
      if (!target){
        const data = await fetchVerse(book, ch, v);
        if (data) target = { canon: data.canon, slug: data.slug };
      }
      const canon = target?.canon || 'newtestament';
      const slug  = target?.slug  || slugify(book);
      const url = `/israelite-research/${canon}/chapter.html?book=${slug}&ch=${ch}#v${v}`;
      window.open(url, '_blank', 'noopener');
    });
  }

  // Initialize on DOM ready: scan the main content area
  document.addEventListener('DOMContentLoaded', ()=>{
    linkify(document.body);
  });

  // Optional: re-run for dynamically inserted content
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (n.nodeType === 1) linkify(n);
      }
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();
</script>
