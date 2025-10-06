/* extra-biblical-sources.js — loads JSON and renders dot-plot timelines */
(async function(){
  const base = '/israelite-research/data/timelines';
  const $ = id => document.getElementById(id);

  async function loadJSON(path){
    const r = await fetch(path + `?v=${Date.now()}`, { cache:'no-store' });
    if(!r.ok) throw new Error(`Load failed: ${path}`);
    return r.json();
  }

  // Simple dataset cards (unchanged scaffolding)
  function mountGrid(id, rows, toCard){
    const el = $(id); if(!el) return; el.innerHTML=''; rows.forEach(r=> el.appendChild(toCard(r)));
  }
  const persons = [
    { name:'Abraham', role:'Patriarch', notes:'Covenant; father of Isaac; sojourned in Canaan.' },
    { name:'Isaac', role:'Patriarch', notes:'Son of promise; father of Jacob & Esau.' },
    { name:'Jacob', role:'Patriarch', notes:'Renamed Israel; father of the twelve tribes.' },
    { name:'Joseph', role:'Tribal head', notes:'Preserved Israel in Egypt; 2nd to Pharaoh.' }
  ];
  const events  = [
    { title:'Call of Abram', where:'Ur → Canaan', era:'Genesis 12' },
    { title:'Binding of Isaac', where:'Moriah', era:'Genesis 22' }
  ];
  const epochs  = [{ label:'Patriarchal period', span:'From Abraham to Joseph' }];

  const card = (title, rows) => {
    const c=document.createElement('div'); c.className='card';
    c.innerHTML = `<h4>${title.name||title.label||title.title}</h4><div class="kv">` + rows.map(r=>`<div class="row"><strong>${r[0]}:</strong> ${r[1]??'—'}</div>`).join('') + `</div>`;
    return c;
  };
  mountGrid('personsGrid', persons, p=>card(p,[['Role',p.role],['Notes',p.notes]]));
  mountGrid('eventsGrid',  events,  e=>card(e,[['Where',e.where],['Text/Era',e.era]]));
  mountGrid('epochsGrid',  epochs,  ep=>card(ep,[['Span',ep.span]]));

  // Common hover template
  const hoverHTML = (d)=> `
    <h5>${d.name}</h5>
    ${d.short ? `<div class="muted">${d.short}</div>` : ''}
    ${
      d.lifespan!=null
        ? `<div style="margin-top:.35rem"><strong>Lifespan:</strong> ${d.lifespan} years</div>`
        : (d.duration!=null ? `<div style="margin-top:.35rem"><strong>Duration:</strong> ${d.duration} years</div>` : '')
    }
    ${d.refs ? `<div class="muted" style="margin-top:.25rem"><em>${d.refs}</em></div>` : ''}
  `;

  async function renderDot(containerId, file, axisLabel){
    const el = $(containerId); if(!el) return; el.innerHTML = `<p class="muted">Loading…</p>`;
    try{
      const data = await loadJSON(`${base}/${file}`);
      window.Timelines.renderDotPlot({ container: el, items: data, label: axisLabel, hoverHTML });
    }catch(e){
      console.error(e); el.innerHTML = `<p class="muted">Failed to load ${file}</p>`;
    }
  }

  await Promise.all([
    renderDot('timelineBooks',        'books.json',       'Years'),
    renderDot('timelinePatriarchs',   'patriarchs.json',  'Years'),
    renderDot('timelineJudges',       'judges.json',      'Years'),
    renderDot('timelineCaptivities',  'captivities.json', 'Years'),
    renderDot('timelineScattering',   'scattering.json',  'Years')
  ]);
})();
