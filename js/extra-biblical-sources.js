/* extra-biblical-sources.js
   - Feeds datasets to the tabs (Persons/Events/Epochs) if you want
   - Renders the "Patriarchs" timeline on this page.
*/

(function(){

  // --- Minimal datasets for the tabs (placeholder) ---
  const persons = [
    { name:'Abraham',  role:'Patriarch',   notes:'Covenant; father of Isaac; sojourned in Canaan.' },
    { name:'Isaac',    role:'Patriarch',   notes:'Son of promise; father of Jacob & Esau.' },
    { name:'Jacob',    role:'Patriarch',   notes:'Renamed Israel; father of the twelve tribes.' },
    { name:'Joseph',   role:'Tribal head', notes:'Preserved Israel in Egypt; 2nd to Pharaoh.' },
  ];
  const events  = [
    { title:'Call of Abram', where:'Ur → Canaan', era:'Genesis 12' },
    { title:'Binding of Isaac', where:'Moriah', era:'Genesis 22' },
  ];
  const epochs  = [
    { label:'Patriarchal period', span:'From Abraham to Joseph' },
  ];

  function mountGrid(id, rows, toCard){
    const el = document.getElementById(id);
    if (!el) return;
    if (!rows || !rows.length){
      el.innerHTML = '<p class="muted">No entries yet.</p>';
      return;
    }
    el.innerHTML = '';
    rows.forEach(r=> el.appendChild(toCard(r)));
  }

  function personCard(p){
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${p.name}</h4>
      <div class="kv">
        <div class="row"><strong>Role:</strong> ${p.role||'—'}</div>
        <div class="row"><strong>Notes:</strong> ${p.notes||'—'}</div>
      </div>`;
    return card;
  }
  function eventCard(e){
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${e.title}</h4>
      <div class="kv">
        <div class="row"><strong>Where:</strong> ${e.where||'—'}</div>
        <div class="row"><strong>Text/Era:</strong> ${e.era||'—'}</div>
      </div>`;
    return card;
  }
  function epochCard(ep){
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${ep.label}</h4>
      <div class="kv">
        <div class="row"><strong>Span:</strong> ${ep.span||'—'}</div>
      </div>`;
    return card;
  }

  // Mount the three grids
  mountGrid('personsGrid', persons, personCard);
  mountGrid('eventsGrid',  events,  eventCard);
  mountGrid('epochsGrid',  epochs,  epochCard);

  // --- Patriarchs timeline (LIFESPAN SCALE: works immediately) ---
  // Lifespans from Genesis (Masoretic): Abraham 175; Isaac 180; Jacob 147; Joseph 110
  // You can add more (e.g., Job 140+, etc.) or swap to absolute-scale later.
  const patriarchsLifespan = [
    {
      name:'Abraham',
      lifespan:175,
      short:'Father of the faithful; covenant bearer; sojourns in Canaan; ancestor of Israel.',
      refs:'Gen 12–25'
    },
    {
      name:'Isaac',
      lifespan:180,
      short:'Son of promise; covenant line continues; father of Jacob & Esau.',
      refs:'Gen 21–27; 35:27–29'
    },
    {
      name:'Jacob (Israel)',
      lifespan:147,
      short:'Renamed Israel; father of the twelve tribes; sojourns in Egypt at end of life.',
      refs:'Gen 25–49'
    },
    {
      name:'Joseph',
      lifespan:110,
      short:'Preserver of Israel in famine; rises to power in Egypt.',
      refs:'Gen 37–50'
    }
  ];

  // Optional: switch to absolute scale later by providing .start/.end on a common axis
  // Example (Anno Mundi placeholders): {name:'Abraham', start:1948, end:2123, ...}
  function patriarchHoverHTML(d){
    return `
      <h5>${d.name}</h5>
      <div class="muted">${d.short||''}</div>
      <div style="margin-top:.35rem"><strong>Lifespan:</strong> ${d.lifespan ? d.lifespan + ' years' : '—'}</div>
      ${d.refs ? `<div class="muted" style="margin-top:.25rem"><em>${d.refs}</em></div>` : '' }
    `;
  }

  const patEl = document.getElementById('timelinePatriarchs');
  if (patEl && window.Timelines){
    window.Timelines.renderLifespanScale({
      container: patEl,
      items: patriarchsLifespan,
      label: 'Years lived',
      hoverHTML: patriarchHoverHTML
    });
  }

  // --- HOW TO: upgrade to absolute timeline later (BCE or AM) ---
  // 1) Build data with `start` and `end` numbers on a shared axis (e.g., AM years).
  // 2) Compute {min, max} across all items.
  // 3) Call Timelines.renderAbsoluteScale({...})
  //
  // Example:
  // const patriarchsAbsolute = [
  //   { name:'Abraham', start:1948, end:2123, short:'…', refs:'Gen 12–25' },
  //   { name:'Isaac',   start:2048, end:2228, short:'…', refs:'Gen 21–27' },
  //   { name:'Jacob',   start:2108, end:2255, short:'…', refs:'Gen 25–49' },
  //   { name:'Joseph',  start:2199, end:2309, short:'…', refs:'Gen 37–50' },
  // ];
  // const min = Math.min(...patriarchsAbsolute.map(d=>d.start));
  // const max = Math.max(...patriarchsAbsolute.map(d=>d.end));
  // Timelines.renderAbsoluteScale({
  //   container: patEl,
  //   items: patriarchsAbsolute,
  //   min, max,
  //   axisLabel: 'Anno Mundi (AM)',
  //   hoverHTML: (d)=> `<h5>${d.name}</h5><div class="muted">${d.short}</div>
  //                     <div style="margin-top:.35rem"><strong>Span:</strong> ${d.start}–${d.end} AM</div>
  //                     <div class="muted" style="margin-top:.25rem"><em>${d.refs}</em></div>`
  // });

})();
