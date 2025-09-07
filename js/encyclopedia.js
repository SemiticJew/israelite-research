(async function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const indexEl   = $("#encyIndex");
  const searchEl  = $("#encySearch");
  const lettersEl = $("#letters");
  const filtersEl = $("#filters");

  const manifest = await fetch("/israelite-research/data/encyclopedia/manifest.json").then(r=>r.json());

  // Helpers
  const norm = (v) => String(v||"").toLowerCase().replace(/[-\s]+/g,"_");
  const toSet = (arr) => new Set((arr||[]).map(norm));
  const splitTokens = (s) => String(s||"").toLowerCase().split(/[\/|,]\s*/).map(x=>x.trim()).filter(Boolean);

  // Build working index
  const firstLetter = (t) => (t||"").trim().toUpperCase().replace(/^[^A-Z].*$/,'#')[0] || '#';
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const groupsBase = Object.fromEntries([...AZ,"#"].map(L=>[L,[]]));
  const withIdx = manifest.map(it => ({
    ...it,
    type_set: toSet(it.type),
    era_set: toSet(it.era),
    region_set: toSet(it.region),
    tags_set: toSet(it.tags),
    status_val: norm(it.status),
    crossref_count: Number(it.crossref_count||0),
    has_iconography: !!(it.has_iconography || (it.tags_set && it.tags_set.has('iconography'))),
    has_complexion: !!(it.has_complexion_notes || (it.tags_set && it.tags_set.has('complexion'))),
    has_maps: !!(it.has_maps || (it.tags_set && (it.tags_set.has('map') || it.tags_set.has('maps')))),
    __t: [it.term, ...(it.type||[]), it.summary, ...(it.biblical_refs||[]), ...(it.tags||[])].join(" ").toLowerCase(),
    __L: firstLetter(it.term)
  }));

  // State
  let currentLetter = null;
  let active = { type:[], era:[], region:[], features:[], status:[] };
  let dataView = withIdx.slice();

  // Render A–Z (unchanged)
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
      $$('#letters a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      renderIndex();
    }, { once:true }); // bind once; we keep A–Z stable
  }

  // Filters: read active chips
  function readActive(){
    const next = { type:[], era:[], region:[], features:[], status:[] };
    $$('.filter-row', filtersEl).forEach(row=>{
      const key = row.getAttribute('data-key');
      const vals = $$('.chip[data-active="true"]', row).flatMap(btn => splitTokens(btn.getAttribute('data-value')));
      next[key] = vals.map(norm);
    });
    active = next;
  }

  // Toggle chips
  filtersEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if(!btn) return;
    btn.setAttribute('data-active', btn.getAttribute('data-active') === 'true' ? 'false' : 'true');
    readActive();
    computeView();
  });

  // Search input
  searchEl.addEventListener('input', ()=> computeView());

  // Compute filtered + searched view
  function computeView(){
    const q = (searchEl.value||'').toLowerCase().trim();

    const matchesType = (it) => !active.type.length ||
      active.type.some(tok => it.type_set.has(tok));
    const matchesEra = (it) => !active.era.length ||
      active.era.some(tok => it.era_set.has(tok) || it.era_set.has(tok.replace(/_/g,' ')));
    const matchesRegion = (it) => !active.region.length ||
      active.region.some(tok => it.region_set.has(tok));
    const matchesFeatures = (it) => {
      if(!active.features.length) return true;
      // All selected features must be present
      return active.features.every(f=>{
        if(f==='iconography') return it.has_iconography;
        if(f==='complexion')  return it.has_complexion;
        if(f==='maps')        return it.has_maps;
        if(f==='crossrefs')   return (it.crossref_count > 0);
        return true;
      });
    };
    const matchesStatus = (it) => !active.status.length || active.status.includes(it.status_val);

    const base = withIdx.filter(it =>
      matchesType(it) && matchesEra(it) && matchesRegion(it) && matchesFeatures(it) && matchesStatus(it)
    );

    dataView = q ? base.filter(it => it.__t.includes(q)) : base;
    renderIndex();
  }

  // Render index (respects currentLetter)
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
        const badge = it.badge?` <span class="badge">${it.badge}</span>`:'';
        return `<a href="/israelite-research/encyclopedia/entry.html?id=${encodeURIComponent(it.id)}" title="${it.term}">${it.term}${badge}</a>`;
      }).join('');
      return `
        <section class="letter-group" id="letter-${L}">
          <h2 class="letter-head">${L}</h2>
          <div class="entry-list">${list}</div>
        </section>
      `;
    }).join('');
  }

  // Init
  renderLetters();
  readActive();
  computeView();
})();
