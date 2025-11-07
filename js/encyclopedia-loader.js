(async function(){
  const $ = (s)=>document.querySelector(s);
  const host = document.body;
  async function fetchJSON(url){
    try{
      const r = await fetch(url, {cache:'no-store'});
      if(!r.ok) throw new Error(r.status+' '+r.statusText);
      return await r.json();
    }catch(e){ console.error('fetch failed:', url, e); return null; }
  }
  const candidates = [
    'data/encyclopedia.json',
    'data/israelite_dictionary.json'
  ];
  let data = null;
  for(const u of candidates){
    const j = await fetchJSON(u);
    if (Array.isArray(j)) { data = j; break; }
  }
  if(!Array.isArray(data)){
    const msg = document.createElement('p');
    msg.className = 'error';
    msg.textContent = 'Failed to load encyclopedia data.';
    host.appendChild(msg);
    return;
  }
  const list = document.createElement('div');
  list.id = 'enc-list';
  list.style.display = 'grid';
  list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  list.style.gap = '8px';
  list.style.margin = '16px 0';
  list.innerHTML = data.map((e,i)=>`<button class="enc-item" data-i="${i}" style="padding:.5rem;border:1px solid #ddd;border-radius:8px;cursor:pointer;text-align:left;">
    ${e.headword ? e.headword : '(untitled)'}
  </button>`).join('');
  const panel = document.createElement('div');
  panel.id = 'enc-detail';
  panel.style.padding = '12px';
  panel.style.border = '1px solid #eee';
  panel.style.borderRadius = '8px';
  panel.style.background = 'var(--card, #fff)';
  panel.innerHTML = '<em>Select an entry to view details.</em>';
  host.appendChild(list);
  host.appendChild(panel);
  list.addEventListener('click', (ev)=>{
    const b = ev.target.closest('button.enc-item'); if(!b) return;
    const e = data[+b.dataset.i] || {};
    panel.innerHTML = `
      <h2 style="margin:0 0 .25rem 0;">${e.headword||''}</h2>
      ${e.pos?`<p style="margin:.25rem 0;"><em>${e.pos}</em></p>`:''}
      ${e.definition?`<p style="margin:.5rem 0;">${e.definition}</p>`:''}
      ${e.usage_notes?`<p style="margin:.5rem 0;font-size:.95em;opacity:.9;"><strong>Notes:</strong> ${e.usage_notes}</p>`:''}
      ${e.bible_refs?`<p style="margin:.5rem 0;font-size:.95em;"><strong>Refs:</strong> ${e.bible_refs}</p>`:''}
      ${e.see_also?`<p style="margin:.5rem 0;font-size:.95em;"><strong>See also:</strong> ${e.see_also}</p>`:''}
    `;
    window.scrollTo({top: panel.offsetTop - 80, behavior:'smooth'});
  });
})();
