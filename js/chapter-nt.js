// /israelite-research/js/chapter-nt.js
(function(){
  const params = new URLSearchParams(location.search);
  const book = params.get('book') || 'Matthew';
  const chapter = parseInt(params.get('chapter')||'1',10);

  const titleEl = document.getElementById('chapterTitle');
  const subEl   = document.getElementById('chapterSub');
  const versesEl= document.getElementById('verses');
  const controls= document.getElementById('chapterControls');

  titleEl.textContent = `${book} ${chapter}`;
  subEl.textContent   = `Chapter ${chapter} • ${book}`;

  const prev = document.createElement('a');
  prev.className='btn-sm'; prev.href=`?book=${encodeURIComponent(book)}&chapter=${Math.max(1,chapter-1)}`;
  prev.textContent='◀ Prev';
  const next = document.createElement('a');
  next.className='btn-sm'; next.href=`?book=${encodeURIComponent(book)}&chapter=${chapter+1}`;
  next.textContent='Next ▶';
  controls.append(prev, next);

  // Slug folder should match your data path, e.g. data/newtestament/Matthew/1.json
  const path = `/israelite-research/data/newtestament/${encodeURIComponent(book)}/${chapter}.json`;
  fetch(path).then(r=>r.json()).then(render).catch(err=>{
    versesEl.innerHTML = `<div style="color:#a00">Could not load chapter data.</div>`;
    console.error(err);
  });

  function render(data){
    versesEl.innerHTML='';
    data.verses.forEach(v=>{
      const row = document.createElement('section');
      row.className='verse-row';
      row.id = `v${v.num}`;

      const n = document.createElement('a');
      n.className='verse-num';
      n.href = `#v${v.num}`;
      n.textContent = v.num;

      const t = document.createElement('div');
      t.className='verse-text';
      t.innerHTML = v.text;

      row.appendChild(n);
      row.appendChild(t);

      const hasXrefs = Array.isArray(v.crossRefs) && v.crossRefs.length>0;
      const hasComm  = v.commentary && v.commentary.trim().length>0;

      if (hasXrefs || hasComm){
        const actions = document.createElement('div');
        actions.className='verse-actions';

        if (hasXrefs){
          const xBtn = document.createElement('button');
          xBtn.className='btn-sm';
          xBtn.textContent='Cross-refs';
          actions.appendChild(xBtn);

          const panel = document.createElement('div');
          panel.className='panel';
          const list = document.createElement('div');
          list.className='xref-list';
          v.crossRefs.forEach(x=>{
            const a = document.createElement('a');
            a.href = `https://biblia.com/bible/kjv1900/${encodeURIComponent(x.ref)}`;
            a.target='_blank'; a.rel='noopener';
            a.textContent = x.ref + (x.note ? ` — ${x.note}` : '');
            list.appendChild(a);
          });
          panel.appendChild(list);
          row.appendChild(panel);

          xBtn.addEventListener('click', ()=> panel.classList.toggle('open'));
        }

        if (hasComm){
          const cBtn = document.createElement('button');
          cBtn.className='btn-sm';
          cBtn.textContent='Notes';
          actions.appendChild(cBtn);

          const cPanel = document.createElement('div');
          cPanel.className='panel';
          cPanel.innerHTML = `<div>${v.commentary}</div>`;
          row.appendChild(cPanel);

          cBtn.addEventListener('click', ()=> cPanel.classList.toggle('open'));
        }

        row.appendChild(actions);
      }

      versesEl.appendChild(row);
    });
  }
})();
