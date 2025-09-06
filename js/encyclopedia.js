(async function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const indexEl = $("#encyIndex");
  const searchEl = $("#encySearch");
  const lettersEl = $("#letters");

  const manifest = await fetch("/israelite-research/data/encyclopedia/manifest.json").then(r=>r.json());

  // Normalize & group by first letter
  const firstLetter = (t) => (t||"").trim().toUpperCase().replace(/^[^A-Z].*$/,'#')[0] || '#';
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const groupsBase = Object.fromEntries([...AZ,"#"].map(L=>[L,[]]));
  const withIdx = manifest.map(it => ({
    ...it,
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

  function renderIndex(){
    const grouped = structuredClone(groupsBase);
    (currentLetter ? dataView.filter(it=>it.__L===currentLetter) : dataView)
      .forEach(it => grouped[it.__L||'#'].push(it));

    const order = currentLetter ? [currentLetter] : [...AZ,'#'];
    indexEl.innerHTML = order.map(L=>{
      const items = grouped[L];
      if(!items || !items.length) return '';
      items.sort((a,b)=>a.term.localeCompare(b.term));
      const list = items.map(it=>`
        <a href="/israelite-research/encyclopedia/entry.html?id=${encodeURIComponent(it.id)}">
          ${it.term}${(it.badge?` <span class="badge">${it.badge}</span>`:'')}
        </a>`).join('');
      return `
        <section class="letter-group" id="letter-${L}">
          <h2 class="letter-head">${L}</h2>
          <div class="entry-list">${list}</div>
        </section>
      `;
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
