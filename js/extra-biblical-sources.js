/* extra-biblical-sources.js — loads JSON datasets and renders simple number lines */
(async function(){
  const base = '/israelite-research/data/timelines';
  const byId = id => document.getElementById(id);
  async function loadJSON(path){
    const r = await fetch(path + `?v=${Date.now()}`, { cache:'no-store' });
    if(!r.ok) throw new Error(`Load failed: ${path}`);
    return r.json();
  }
  // Simple grids (unchanged)
  function mountGrid(id, rows, toCard){
    const el = byId(id); if(!el) return; el.innerHTML='';
    rows.forEach(r=> el.appendChild(toCard(r)));
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
  const personCard = p => {
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `<h4>${p.name}</h4><div class="kv">
      <div class="row"><strong>Role:</strong> ${p.role||'—'}</div>
      <div class="row"><strong>Notes:</strong> ${p.notes||'—'}</div></div>`;
    return c;
  };
  const eventCard = e => {
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `<h4>${e.title}</h4><div class="kv">
      <div class="row"><strong>Where:</strong> ${e.where||'—'}</div>
      <div class="row"><strong>Text/Era:</strong> ${e.era||'—'}</div></div>`;
    return c;
  };
  const epochCard = ep => {
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `<h4>${ep.label}</h4><div class="kv">
      <div class="row"><strong>Span:</strong> ${ep.span||'—'}</div></div>`;
    return c;
  };
  mountGrid('personsGrid', persons, personCard);
  mountGrid('eventsGrid',  events,  eventCard);
  mountGrid('epochsGrid',  epochs,  epochCard);

  // Helper: common hover HTML
  const hover = d => `
    <h5>${d.name}</h5>
    ${d.short ? `<div class="muted">${d.short}</div>` : ''}
    ${
      d.lifespan!=null
        ? `<div style="margin-top:.35rem"><strong>Lifespan:</strong> ${d.lifespan} years</div>`
        : (d.duration!=null ? `<div style="margin-top:.35rem"><strong>Duration:</strong> ${d.duration} years</div>` : '')
    }
    ${d.refs ? `<div class="muted" style="margin-top:.25rem"><em>${d.refs}</em></div>` : ''}
  `;

  async function loadAndRender(containerId, file, axisLabel){
    const el = byId(containerId); if(!el) return;
    el.innerHTML = `<p class="muted">Loading…</p>`;
    try {
      const data = await loadJSON(`${base}/${file}`);
      // The number line expects items with either lifespan or duration. We pass as-is.
      window.Timelines.renderNumberLine({
        container: el,
        items: data,
        label: axisLabel,
        hoverHTML: hover
      });
    } catch (e){
      console.error(e);
      el.innerHTML = `<p class="muted">Failed to load ${file}</p>`;
    }
  }

  await Promise.all([
    loadAndRender('timelineBooks',        'books.json',       'Years'),
    loadAndRender('timelinePatriarchs',   'patriarchs.json',  'Years'),
    loadAndRender('timelineJudges',       'judges.json',      'Years'),
    loadAndRender('timelineCaptivities',  'captivities.json', 'Years'),
    loadAndRender('timelineScattering',   'scattering.json',  'Years')
  ]);
})();
