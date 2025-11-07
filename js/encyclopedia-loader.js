(function(){
  const host = document.querySelector('#enc-root') || document.body;
  function log(...args){ try{ console.log('[encyclopedia]', ...args); }catch(e){} }

  async function fetchJSON(url){
    try{
      const r = await fetch(url, {cache:'no-store'});
      if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const j = await r.json();
      log('loaded', url, Array.isArray(j)? `entries: ${j.length}` : typeof j);
      return j;
    }catch(err){
      log('error', url, err);
      return null;
    }
  }

  const sources = [
    'data/israelite_dictionary.json'
  ];

  (async ()=>{
    let data=null, src=null;
    for(const s of sources){
      const j = await fetchJSON(s);
      if(Array.isArray(j)){ data=j; src=s; break; }
    }
    if(!Array.isArray(data)){
      const p=document.createElement('p');
      p.style.color='crimson';
      p.textContent='Failed to load encyclopedia data (see console).';
      host.appendChild(p);
      return;
    }

    const list=document.createElement('div');
    list.id='enc-list';
    list.style.display='grid';
    list.style.gridTemplateColumns='repeat(auto-fill,minmax(220px,1fr))';
    list.style.gap='8px';
    list.style.margin='16px 0';

    data = data.slice().filter(e=>e && typeof e==='object' && e.headword).sort((a,b)=>String(a.headword).localeCompare(String(b.headword)));

    list.innerHTML = data.map((e,i)=>`<button class="enc-item" data-i="${i}" style="padding:.5rem;border:1px solid #ddd;border-radius:8px;cursor:pointer;text-align:left;background:var(--card,#fff);">
      ${e.headword ? e.headword : '(untitled)'}
    </button>`).join('');

    const detail=document.createElement('div');
    detail.id='enc-detail';
    detail.style.padding='12px';
    detail.style.border='1px solid #eee';
    detail.style.borderRadius='8px';
    detail.style.background='var(--card,#fff)';
    detail.innerHTML='<em>Select an entry to view details.</em>';

    host.appendChild(list);
    host.appendChild(detail);

    list.addEventListener('click', ev=>{
      const b=ev.target.closest('button.enc-item'); if(!b) return;
      const e = data[+b.dataset.i] || {};
      detail.innerHTML = `
        <h2 style="margin:0 0 .25rem 0;">${e.headword||''}</h2>
        ${e.pos?`<p style="margin:.25rem 0;"><em>${e.pos}</em></p>`:''}
        ${e.definition?`<p style="margin:.5rem 0;">${e.definition}</p>`:''}
        ${e.usage_notes?`<p style="margin:.5rem 0;font-size:.95em;opacity:.9;"><strong>Notes:</strong> ${e.usage_notes}</p>`:''}
        ${e.bible_refs?`<p style="margin:.5rem 0;font-size:.95em;"><strong>Refs:</strong> ${e.bible_refs}</p>`:''}
        ${e.see_also?`<p style="margin:.5rem 0;font-size:.95em;"><strong>See also:</strong> ${e.see_also}</p>`:''}
        <p style="margin:.5rem 0;font-size:.8em;opacity:.7;">Source: ${src}</p>
      `;
      window.scrollTo({top: detail.offsetTop - 80, behavior:'smooth'});
    });

    log('rendered', {source: src, count: data.length});
  })();
})();
