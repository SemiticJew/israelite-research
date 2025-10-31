(function(){
  const DATA_URL = '/israelite-research/data/israelite_dictionary.json';
  const mount = document.getElementById('enc-entries');
  const azBar = document.getElementById('enc-az');
  const search = document.getElementById('enc-search');

  function azLetters(){ return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); }

  function renderAZ(){
    const frag = document.createDocumentFragment();
    azLetters().forEach(L=>{
      const a = document.createElement('a');
      a.href = '#sec-'+L; a.textContent = L;
      a.className = 'az-link';
      frag.appendChild(a);
    });
    azBar.innerHTML = '';
    azBar.appendChild(frag);
  }

  function groupByLetter(entries){
    const map = new Map(azLetters().map(L=>[L, []]));
    entries.forEach(e=>{
      const L = (e.letter || e.headword?.[0] || '').toUpperCase();
      if(map.has(L)) map.get(L).push(e);
    });
    for(const [L, list] of map) list.sort((a,b)=> a.headword.localeCompare(b.headword));
    return map;
  }

  function entryHTML(e){
    const vars = e.variants && e.variants.length ? ` <span class="enc-var">(${e.variants.join(' · ')})</span>` : '';
    const pos = e.pos ? `<span class="enc-pos">${e.pos}</span>` : '';
    const syl = e.syllables ? `<span class="enc-syl"> · ${e.syllables}</span>` : '';
    const notes = e.usage_notes ? `<div class="enc-notes">${escapeHTML(e.usage_notes)}</div>` : '';
    const see = (e.see_also && e.see_also.length)
      ? `<div class="enc-see">See also: ${e.see_also.map(id=>`<a href="#${id}">${id.replace(/-/g,' ')}</a>`).join(', ')}</div>`
      : '';
    return `
      <article class="enc-card" id="${e.id}">
        <h3 class="enc-head">${escapeHTML(e.headword)} ${pos}${syl}${vars}</h3>
        <p class="enc-def">${escapeHTML(e.definition)}</p>
        ${notes}
        ${see}
      </article>`;
  }

  function render(entries){
    const groups = groupByLetter(entries);
    const out = [];
    groups.forEach((list, L)=>{
      if(list.length===0) return;
      out.push(`
        <section class="enc-letter" id="sec-${L}" aria-labelledby="h-${L}">
          <h2 class="enc-letter-head" id="h-${L}">${L}</h2>
          <div class="enc-grid">
            ${list.map(entryHTML).join('')}
          </div>
        </section>`);
    });
    mount.innerHTML = out.join('\n');
  }

  function escapeHTML(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }

  function filterEntries(entries, q){
    if(!q) return entries;
    const needle = q.trim().toLowerCase();
    return entries.filter(e=>{
      return [e.headword, e.pos, e.syllables, e.etymology, e.definition, ...(e.variants||[])]
        .filter(Boolean)
        .some(t => t.toLowerCase().includes(needle));
    });
  }

  fetch(DATA_URL, {cache:'no-store'})
    .then(r=>r.json())
    .then(json=>{
      renderAZ();
      let entries = json.entries || [];
      render(entries);

      if(search){
        search.addEventListener('input', ()=>{
          const q = search.value;
          render(filterEntries(entries, q));
        });
      }
    })
    .catch(()=> {
      mount.innerHTML = '<p style="color:#b91c1c">Unable to load encyclopedia data.</p>';
    });
})();
