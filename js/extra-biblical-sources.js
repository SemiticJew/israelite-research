/* extra-biblical-sources.js — dynamic data loader for Extra-Biblical Sources */

(async function(){
  // ---------- helpers ----------
  async function loadJSON(path){
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }
  function byId(id){ return document.getElementById(id); }

  // Adapter: map {lifespan} or {duration} into a single length used by lifespan renderer
  function toLifespanItems(arr){
    return arr.map(d => ({
      ...d,
      lifespan: d.lifespan != null ? d.lifespan : (d.duration != null ? d.duration : 0)
    }));
  }

  // ---------- datasets (grids) - keep simple placeholders for now ----------
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
  const epochs  = [
    { label:'Patriarchal period', span:'From Abraham to Joseph' }
  ];

  function mountGrid(id, rows, toCard){
    const el = byId(id);
    if (!el) return;
    el.innerHTML = '';
    rows.forEach(r => el.appendChild(toCard(r)));
  }
  function personCard(p){
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h4>${p.name}</h4>
      <div class="kv">
        <div class="row"><strong>Role:</strong> ${p.role||'—'}</div>
        <div class="row"><strong>Notes:</strong> ${p.notes||'—'}</div>
      </div>`;
    return c;
  }
  function eventCard(e){
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h4>${e.title}</h4>
      <div class="kv">
        <div class="row"><strong>Where:</strong> ${e.where||'—'}</div>
        <div class="row"><strong>Text/Era:</strong> ${e.era||'—'}</div>
      </div>`;
    return c;
  }
  function epochCard(ep){
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h4>${ep.label}</h4>
      <div class="kv">
        <div class="row"><strong>Span:</strong> ${ep.span||'—'}</div>
      </div>`;
    return c;
  }

  // Mount placeholder grids
  mountGrid('personsGrid', persons, personCard);
  mountGrid('eventsGrid',  events,  eventCard);
  mountGrid('epochsGrid',  epochs,  epochCard);

  // ---------- timelines: fetch JSON & render ----------
  const base = '/israelite-research/data/timelines';

  async function safeRender(containerId, filePath, label){
    const el = byId(containerId);
    if (!el) return;
    el.innerHTML = `<p class="muted">Loading…</p>`;
    try {
      const data = await loadJSON(filePath + `?v=${Date.now()}`); // cache-bust on updates
      const items = toLifespanItems(data);
      window.Timelines.renderLifespanScale({
        container: el,
        items,
        label,
        hoverHTML: (d)=> `
          <h5>${d.name}</h5>
          ${d.short ? `<div class="muted">${d.short}</div>` : ''}
          ${d.lifespan != null
            ? `<div style="margin-top:.35rem"><strong>Lifespan:</strong> ${d.lifespan} years</div>`
            : (d.duration != null
                ? `<div style="margin-top:.35rem"><strong>Duration:</strong> ${d.duration} years</div>`
                : ''
              )
          }
          ${d.refs ? `<div class="muted" style="margin-top:.25rem"><em>${d.refs}</em></div>` : '' }
        `
      });
    } catch (err){
      el.innerHTML = `<p class="muted">Failed to load: ${filePath}</p>`;
      console.error(err);
    }
  }

  await Promise.all([
    safeRender('timelinePatriarchs', `${base}/patriarchs.json`, 'Years (lifespan)'),
    safeRender('timelineJudges', `${base}/judges.json`, 'Years (lifespan)'),
    safeRender('timelineCaptivities', `${base}/captivities.json`, 'Years (duration)'),
    safeRender('timelineScattering', `${base}/scattering.json`, 'Years (duration)'),
    safeRender('timelineBooks', `${base}/books.json`, 'Years (approx. composition span)')
  ]);
})();
