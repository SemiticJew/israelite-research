(async function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const indexEl = $("#encyIndex");
  const searchEl = $("#encySearch");
  const lettersEl = $("#letters");
  const controlsEl = $("#controls");
  const toggleEl = $("#searchToggle");

  // Toggleable search UI (+ keyboard '/')
  function openSearch(){ controlsEl.classList.add('open'); toggleEl.setAttribute('aria-expanded','true'); searchEl.focus(); }
  function closeSearch(){ controlsEl.classList.remove('open'); toggleEl.setAttribute('aria-expanded','false'); searchEl.blur(); }
  toggleEl.addEventListener('click', ()=> controlsEl.classList.toggle('open') ? openSearch() : closeSearch());
  document.addEventListener('keydown', (e)=>{ if(e.key === '/') { e.preventDefault(); openSearch(); } });

  const manifest = await fetch("/israelite-research/data/encyclopedia/manifest.json").then(r=>r.json());

  // Normalize & group
  const firstLetter = (t) => (t||"").trim().toUpperCase().replace(/^[^A-Z].*$/,'#')[0] || '#';
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const groupsBase = Object.fromEntries([...AZ,"#"].map(L=>[L,[]]));
  const withIdx = manifest.map(it => ({
    ...it,
    biblio_count: Number(it.biblio_count||0),
    __t: [it.term, ...(it.type||[]), it.summary, ...(it.biblical_refs||[]), ...(it.tags||[])].join(" ").toLowerCase(),
    __L: firstLetter(it.term)
  }));

  let currentLetter = null;
  let dataView = withIdx.slice();

  function renderLetters(){
    lettersEl.innerHTML = ['All',...AZ,'#'].map(L=>{
      const val = L==='All'? '' : L;
      const active = (currentLetter===val) || (L==='All' && currentLetter===null);
      return `<a href="#" data-letter="${val}" class="${active?'active':''}">${L}</a>`;
    }).join('');
    lettersEl.addEventListener('click',(e)=>{
      const a = e.target.closest('a'); if(!a) return;
      e.preventDefault();
      currentLetter = a.dataset.letter || null;
      $$('a',lettersEl).forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      renderIndex();
    });
  }

  function meterWidth(count){
    const capped = Math.min(Number(count)||0, 12); // cap to 12
    return (capped/12*100).toFixed(0) + '%';
  }

  function renderIndex(){
    const grouped = structuredClone(groupsBase);
    (currentLetter ? dataView.filter(it=>it.__L===currentLetter) : dataView)
      .forEach(it => grouped[it.__L||'#'].push(it));

    const order = currentLetter ? [currentLetter] : [...AZ,'#'];
    indexEl.innerHTML = order.map(L=>{
      const items = grouped[L];
      if(!items || !items.length) return '';
      items.sort((a,b)=>a.term.localeCompare(b.term));
      const list = items.map(it=>{
        const p = meterWidth(it.biblio_count);
        const badge = it.badge?` <span class="badge">${it.badge}</span>`:'';
        return `
          <a href="/israelite-research/encyclopedia/entry.html?id=${encodeURIComponent(it.id)}" title="${it.term}">
            <span class="label">${it.term}${badge}</span>
            <span class="meta">
              <span class="meter" aria-hidden="true"><i style="--p:${p}"></i></span>
              <span class="count" aria-label="bibliography items">${it.biblio_count}</span>
            </span>
          </a>`;
      }).join('');
      return `
        <section class="letter-group" id="letter-${L}">
          <h2 class="letter-head">${L}</h2>
          <div class="entry-list">${list}</div>
        </section>`;
    }).join('');
  }

  function applySearch(q){
    q = (q||'').toLowerCase().trim();
    dataView = q ? withIdx.filter(it => it.__t.includes(q)) : withIdx.slice();
    renderIndex();
  }

  renderLetters();
  renderIndex();
  searchEl.addEventListener('input', e => applySearch(e.target.value));
})();
