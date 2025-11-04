(function(){
  const RESULTS = document.getElementById('results');
  const READER  = document.getElementById('reader');
  const AZROOT  = document.querySelector('.az');
  const Q       = document.getElementById('q');
  const CLEAR   = document.getElementById('clearQ');

  // Try multiple locations so it works on GitHub Pages (/israelite-research/) and locally
  const CANDIDATE_JSON = [
    "/israelite-research/data/israelite_dictionary.json",
    "./data/israelite_dictionary.json",
    "../data/israelite_dictionary.json",
    "/data/israelite_dictionary.json"
  ];

  const DB = [];
  let activeLetter = null;

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function debounce(fn,ms){ let t; return(...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms); }; }

  function normalizeEntry(e){
    const head = String(e.headword||'').trim();
    const abs  = String(e.definition||'').slice(0,220);
    return {
      id: e.id || head.toLowerCase().replace(/\s+/g,'-'),
      letter: (e.letter||head[0]||'#').toUpperCase(),
      headword: head,
      pos: e.pos||'',
      variants: e.variants||[],
      syllables: e.syllables||'',
      etymology: e.etymology||'',
      definition: e.definition||'',
      usage_notes: e.usage_notes||'',
      bible_refs: e.bible_refs||[],
      see_also: e.see_also||[],
      abstract: abs
    };
  }

  async function loadJSON(){
    let lastErr;
    for (const url of CANDIDATE_JSON){
      try{
        const r = await fetch(url, {cache:'no-store'});
        if(!r.ok) throw new Error("HTTP "+r.status);
        const j = await r.json();
        const arr = Array.isArray(j?.entries) ? j.entries : [];
        DB.length = 0;
        arr.forEach(e => DB.push(normalizeEntry(e)));
        DB.sort((a,b)=> a.headword.localeCompare(b.headword));
        console.info("[encyclopedia] loaded:", url, "entries:", DB.length);
        return;
      }catch(e){ lastErr = e; console.warn("[encyclopedia] failed:", url, e.message); }
    }
    RESULTS.innerHTML = '<div class="empty">Failed to load encyclopedia data.</div>';
    throw lastErr || new Error("Failed to load JSON");
  }

  function buildAZ(){
    const frag = document.createDocumentFragment();
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("").forEach(ch=>{
      const b = document.createElement('button');
      b.textContent = ch;
      b.title = "Jump to " + ch;
      b.addEventListener('click', ()=>{ activeLetter = (ch==="#"?null:ch); renderResults(); });
      frag.appendChild(b);
    });
    AZROOT.innerHTML = '';
    AZROOT.appendChild(frag);
  }

  function renderResults(){
    const query = (Q.value||'').trim().toLowerCase();
    const hits = DB.filter(e=>{
      if(activeLetter && e.letter!==activeLetter) return false;
      if(query && !e.headword.toLowerCase().includes(query)) return false;
      return true;
    }).slice(0,400);

    if(!hits.length){
      RESULTS.innerHTML = '<div class="empty">No results.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    hits.forEach(e=>{
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="line1">
          <div class="term">${escapeHtml(e.headword)}</div>
          <div class="pos">${escapeHtml(e.pos)}</div>
        </div>
        <div class="abstract">${escapeHtml(e.abstract)}</div>`;
      card.addEventListener('click', ()=>openEntry(e));
      frag.appendChild(card);
    });
    RESULTS.innerHTML = '';
    RESULTS.appendChild(frag);
  }

  function hrefForRef(r){
    // expects: {label:"Isaiah 9:1–2", canon:"tanakh", slug:"isaiah", ch:9, vStart:1, vEnd:2}
    const base = `/israelite-research/${r.canon}/chapter.html?book=${encodeURIComponent(r.slug)}&ch=${encodeURIComponent(r.ch)}`;
    const hash = r.vStart ? `#v${r.vStart}` : '';
    return base + hash;
  }

  function renderRefs(list){
    if(!list || !list.length) return '';
    const items = list.map(r=>{
      const label = escapeHtml(r.label||'');
      const href  = hrefForRef(r);
      const dataX = label; // xref-hover parses the label for range
      return `<li><a class="xref-trigger" data-xref="${dataX}" href="${href}">${label}</a></li>`;
    }).join('');
    return `<h4>Bible references</h4><ul>${items}</ul>`;
  }

  function openEntry(e){
  window.__openEntry = openEntry;
    const art = READER.querySelector('article');
    const bits = [];

    // Dictionary-style: headword / POS; then definition top, then extras below
    bits.push(`<h2 class="r-title">${escapeHtml(e.headword)}${e.pos?` <span style="font-weight:400;color:#6b7280">(${escapeHtml(e.pos)})</span>`:''}</h2>`);
    bits.push(`<p>${escapeHtml(e.definition)}</p>`);

    if(e.etymology)    bits.push(`<p><strong>Etymology.</strong> ${escapeHtml(e.etymology)}</p>`);
    if(e.variants?.length) bits.push(`<p><strong>Variants.</strong> ${escapeHtml(e.variants.join(', '))}</p>`);
    if(e.syllables)    bits.push(`<p><strong>Pronunciation.</strong> ${escapeHtml(e.syllables)}</p>`);
    if(e.usage_notes)  bits.push(`<p><strong>Usage.</strong> ${escapeHtml(e.usage_notes)}</p>`);

    // Bible refs (hover-enabled)
    bits.push(renderRefs(e.bible_refs));

    if(e.see_also?.length){
      bits.push(`<p><strong>See also.</strong> ${e.see_also.map(s=>`<span>${escapeHtml(s)}</span>`).join(', ')}</p>`);
    }

    art.classList.add('article-content'); // ensure target for hover script
    art.innerHTML = bits.join('\n');

    // Rescan for hover links if script is present
    if (typeof window.rescanXrefs === 'function') {
      try { window.rescanXrefs(); } catch(_) {}
    }
  }

  const doFilter = debounce(renderResults, 120);
  Q.addEventListener('input', doFilter);
  CLEAR.addEventListener('click', ()=>{ Q.value=''; renderResults(); Q.focus(); });

  (async function init(){
    buildAZ();
    await loadJSON();
    renderResults();
  })();
})();
