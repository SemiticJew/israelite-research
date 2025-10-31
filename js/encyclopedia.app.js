(function(){
  const DATA_URL = '/israelite-research/data/israelite_dictionary.json';
  const resultsEl = document.getElementById('results');
  const readerEl  = document.getElementById('reader');
  const azRoot    = document.getElementById('az-root');
  const q         = document.getElementById('q');
  const clearQ    = document.getElementById('clearQ');

  const DB = [];
  let activeLetter = null;

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function letters(){ return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split(''); }
  function abstractOf(e){ return (e.definition||'').slice(0, 220); }

  function normalize(e){
    return {
      id: e.id,
      letter: (e.letter || e.headword?.[0] || '#').toUpperCase(),
      headword: e.headword || '',
      pos: e.pos || '',
      variants: e.variants || [],
      syllables: e.syllables || '',
      etymology: e.etymology || '',
      definition: e.definition || '',
      usage_notes: e.usage_notes || '',
      see_also: e.see_also || []
    };
  }

  function buildAZ(){
    const frag=document.createDocumentFragment();
    letters().forEach(ch=>{
      const b=document.createElement('button');
      b.textContent=ch;
      b.title="Jump to "+ch;
      b.addEventListener('click',()=>{
        activeLetter = (ch==="#") ? null : ch;
        renderResults();
        // reset hash when switching letter
        history.replaceState(null, '', location.pathname + location.search);
      });
      frag.appendChild(b);
    });
    azRoot.appendChild(frag);
  }

  function filterEntries(){
    const query=(q.value||'').trim().toLowerCase();
    const hits=DB.filter(e=>{
      if(activeLetter && e.letter!==activeLetter) return false;
      if(query){
        const hay=[e.headword, e.pos, e.syllables, e.etymology, e.definition, ...(e.variants||[])].join(' ').toLowerCase();
        return hay.includes(query);
      }
      return true;
    });
    hits.sort((a,b)=> a.headword.localeCompare(b.headword));
    return hits.slice(0, 400);
  }

  function renderResults(){
    const hits=filterEntries();
    if(!hits.length){ resultsEl.innerHTML='<div class="empty">No results.</div>'; return; }

    const frag=document.createDocumentFragment();
    hits.forEach(e=>{
      const card=document.createElement('div');
      card.className='card';
      card.innerHTML = `
        <div class="line1">
          <div class="term">${escapeHtml(e.headword)}</div>
          ${e.pos ? `<div class="pos" style="color:#6b7280">${escapeHtml(e.pos)}</div>` : ''}
        </div>
        <div class="abstract">${escapeHtml(abstractOf(e))}</div>
      `;
      card.addEventListener('click', ()=> openEntry(e, true));
      frag.appendChild(card);
    });
    resultsEl.innerHTML='';
    resultsEl.appendChild(frag);
  }

  function seeAlsoHTML(list){
    if(!list || !list.length) return '';
    return `<div class="cite">See also: ${list.map(id=>`<a href="#${id}">${escapeHtml(id.replace(/-/g,' '))}</a>`).join(', ')}</div>`;
  }

  function openEntry(e, pushHash){
    const art = readerEl.querySelector('article');
    readerEl.querySelector('.r-title').textContent = e.headword;
    art.innerHTML = `
      ${e.syllables || e.pos || e.variants.length ? `<div class="submeta">
        ${e.syllables ? `<span>${escapeHtml(e.syllables)}</span>` : ''}
        ${e.pos ? `<span style="margin-left:.5rem">${escapeHtml(e.pos)}</span>` : ''}
        ${e.variants.length ? `<span style="margin-left:.5rem">(${e.variants.map(escapeHtml).join(' · ')})</span>` : ''}
      </div>` : ''}
      ${e.etymology ? `<p><em>Etymology:</em> ${escapeHtml(e.etymology)}</p>` : ''}
      <p>${escapeHtml(e.definition)}</p>
      ${e.usage_notes ? `<p><em>Usage:</em> ${escapeHtml(e.usage_notes)}</p>` : ''}
      ${seeAlsoHTML(e.see_also)}
    `;
    if(pushHash){
      const url = new URL(location.href);
      url.hash = e.id || '';
      history.pushState({id:e.id}, '', url);
    }
  }

  function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
  const doFilter = debounce(renderResults, 120);

  q.addEventListener('input', doFilter);
  clearQ.addEventListener('click', ()=>{ q.value=''; renderResults(); q.focus(); });

  window.addEventListener('popstate', ()=>{
    const id = location.hash.replace(/^#/, '');
    if(id){
      const e = DB.find(x=>x.id===id);
      if(e) openEntry(e, false);
    }
    renderResults();
  });

  fetch(DATA_URL, {cache:'no-store'})
    .then(r=>r.json())
    .then(json=>{
      (json.entries||[]).forEach(row=> DB.push(normalize(row)));
      DB.sort((a,b)=> a.headword.localeCompare(b.headword));
      buildAZ();

      // Seed from URL (?q= & #id)
      const url = new URL(location.href);
      const qParam = url.searchParams.get('q') || '';
      if(qParam){ q.value = qParam; }

      renderResults();

      const id = location.hash.replace(/^#/, '');
      if(id){
        const e = DB.find(x=>x.id===id);
        if(e) openEntry(e, false);
      }
    })
    .catch(()=>{
      resultsEl.innerHTML = '<div class="empty">Unable to load encyclopedia data.</div>';
    });
})();
