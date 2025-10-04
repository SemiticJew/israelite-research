/* js/timelines.js
   Renders multiple horizontal SVG timelines on Extra-Biblical Sources page:
   - Books (if metadata available)
   - Patriarchs (from BibleData-Epoch.csv Life entries)
   - Judges (epoch_name/type heuristic)
   - Captivities & Returns
   - Scattering / Diaspora
   Data roots use your /israelite-research/data/ files. Safe if files are missing.
*/
(function(){
  const DATA_ROOT = '/israelite-research/data';
  const EPOCH_CSV = `${DATA_ROOT}/BibleData-Epoch.csv`;
  const BOOK_META = `${DATA_ROOT}/metadata/book-periods.json`; // optional

  // ---------- DOM helpers ----------
  const $ = (s, r=document)=>r.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const clamp = (n, lo, hi)=>Math.max(lo, Math.min(hi, n));

  // ---------- CSV helpers ----------
  function parseCSV(text){
    // tiny CSV parser: handles quoted fields and commas/newlines
    const rows=[]; let i=0, cur='', cell='', inQ=false;
    while(i<=text.length){
      const c = text[i] || '\n';
      if (inQ){
        if (c === '"'){
          if (text[i+1] === '"'){ cell+='"'; i+=2; continue; }
          inQ=false; i++; continue;
        }
        cell+=c; i++; continue;
      }
      if (c === '"'){ inQ=true; i++; continue; }
      if (c === ','){ cur+=cell+'\x1f'; cell=''; i++; continue; }
      if (c === '\r'){ i++; continue; } // skip
      if (c === '\n'){
        cur+=cell; rows.push(cur.split('\x1f')); cur=''; cell=''; i++; continue;
      }
      cell+=c; i++;
    }
    if (rows.length && rows[rows.length-1].every(x=>x==='' )) rows.pop();
    return rows;
  }
  function csvToObjects(text){
    const rows = parseCSV(text);
    if (!rows.length) return [];
    const head = rows[0].map(h=>h.trim());
    return rows.slice(1).map(r=>{
      const obj={}; head.forEach((k,idx)=> obj[k]=r[idx]??''); return obj;
    });
  }

  // ---------- Year helpers ----------
  function toNum(v){ const n = Number(String(v||'').trim()); return Number.isFinite(n) ? n : null; }
  function yearFromRow(r){
    // Prefer AH fields; else attempt calculation. Fall back null.
    let s = toNum(r.start_year_ah);
    let e = toNum(r.end_year_ah);
    const len = toNum(r.period_length);
    if (s!=null && e==null && len!=null) e = s + len;
    if (s==null && e!=null && len!=null) s = e - len;
    return { start:s, end:e };
  }

  // ---------- Timeline renderer ----------
  function renderTimeline(container, items, opts={}){
    const el = (typeof container==='string') ? $(container) : container;
    if (!el) return;
    el.innerHTML = '';
    const clean = items.filter(it=> it && it.start!=null && it.end!=null && it.end>=it.start);
    if (!clean.length){ el.innerHTML = `<div class="muted">No data available.</div>`; return; }

    const padL=90, padR=20, padT=18, rowH=28, gapV=6, labelPad=6;
    const lanes = packLanes(clean); // compute lane (row) to avoid overlaps
    const nlanes = Math.max(...lanes.map(x=>x.lane))+1;

    const w = el.clientWidth || 900;
    const h = padT + nlanes*(rowH+gapV) + 30;

    const years = clean.flatMap(d=>[d.start, d.end]);
    const minY = Math.min(...years);
    const maxY = Math.max(...years);
    const span = Math.max(1, maxY - minY);

    const xScale = (y)=> padL + ( (w - padL - padR) * ( (y - minY) / span ) );

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('role','img');
    svg.style.display='block';

    // Axis
    const axis = document.createElementNS(svgNS,'g');
    const axisY = padT + nlanes*(rowH+gapV) + 6;
    const base = document.createElementNS(svgNS,'line');
    base.setAttribute('x1', String(padL));
    base.setAttribute('x2', String(w - padR));
    base.setAttribute('y1', String(axisY));
    base.setAttribute('y2', String(axisY));
    base.setAttribute('stroke', '#cbd5e1');
    axis.appendChild(base);

    const ticks = 6;
    for (let i=0;i<=ticks;i++){
      const yv = Math.round(minY + (span*i)/ticks);
      const x = xScale(yv);
      const t = document.createElementNS(svgNS,'line');
      t.setAttribute('x1', String(x));
      t.setAttribute('x2', String(x));
      t.setAttribute('y1', String(axisY));
      t.setAttribute('y2', String(axisY+6));
      t.setAttribute('stroke', '#cbd5e1');
      axis.appendChild(t);

      const tx = document.createElementNS(svgNS,'text');
      tx.setAttribute('x', String(x));
      tx.setAttribute('y', String(axisY+18));
      tx.setAttribute('text-anchor','middle');
      tx.setAttribute('fill','#475569');
      tx.setAttribute('font-size','11');
      tx.textContent = `${yv} AH`;
      axis.appendChild(tx);
    }
    svg.appendChild(axis);

    // Bars
    const g = document.createElementNS(svgNS,'g');
    clean.forEach((d, idx)=>{
      const lane = lanes[idx].lane;
      const y = padT + lane*(rowH+gapV);
      const x1 = xScale(d.start);
      const x2 = xScale(d.end);
      const rect = document.createElementNS(svgNS,'rect');
      rect.setAttribute('x', String(x1));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(Math.max(2, x2-x1)));
      rect.setAttribute('height', String(rowH));
      rect.setAttribute('rx','6'); rect.setAttribute('ry','6');
      rect.setAttribute('fill', d.color || '#DBE4EE');
      rect.setAttribute('stroke', '#cfd8e3');
      rect.setAttribute('data-title', d.title||'');
      rect.setAttribute('data-range', `${d.start}–${d.end} AH`);
      rect.style.cursor = d.url ? 'pointer' : 'default';
      if (d.url){
        rect.addEventListener('click', ()=> window.open(d.url,'_blank','noopener'));
      }
      g.appendChild(rect);

      const label = document.createElementNS(svgNS,'text');
      label.setAttribute('x', String(x1 + labelPad));
      label.setAttribute('y', String(y + rowH/2 + 4));
      label.setAttribute('fill', '#0b2340');
      label.setAttribute('font-size','12');
      label.setAttribute('font-weight','700');
      label.textContent = (d.short || d.title || '').slice(0,50);
      g.appendChild(label);

      const sub = document.createElementNS(svgNS,'text');
      sub.setAttribute('x', String(x1 + labelPad));
      sub.setAttribute('y', String(y + rowH - 6));
      sub.setAttribute('fill', '#64748b');
      sub.setAttribute('font-size','11');
      sub.textContent = `${d.start}–${d.end} AH`;
      g.appendChild(sub);
    });
    svg.appendChild(g);

    // Title (optional)
    if (opts && opts.title){
      const t = document.createElementNS(svgNS,'text');
      t.setAttribute('x', String(10));
      t.setAttribute('y', String(16));
      t.setAttribute('fill', '#054A91');
      t.setAttribute('font-size','12');
      t.setAttribute('font-weight','700');
      t.textContent = opts.title;
      svg.appendChild(t);
    }

    el.appendChild(svg);

    // responsive re-render
    let ro;
    if (window.ResizeObserver){
      ro = new ResizeObserver(()=> renderTimeline(el, items, opts));
      ro.observe(el);
    }
  }

  // pack bars into lanes to reduce overlap
  function packLanes(items){
    const slots = []; // [{end}]
    return items.map(it=>{
      const s = it.start, e = it.end;
      let lane = 0;
      while (lane < slots.length && s < slots[lane]) lane++;
      slots[lane] = e + 1e-6; // track last end
      return { lane };
    });
  }

  // ---------- Data mapping from Epoch CSV ----------
  function mapPatriarchs(rows){
    const out=[];
    rows.forEach(r=>{
      const typ = String(r.epoch_type||'').toLowerCase();
      const name = String(r.epoch_name||'');
      if (typ === 'life' || /^life[\s_-]?of/i.test(name)){
        const {start, end} = yearFromRow(r);
        if (start!=null && end!=null){
          out.push({
            title: name || (r.person_id||'Patriarch'),
            short: (name.replace(/^The\s+/i,'')||'').replace(/^Life of\s+/i,''),
            start, end, color:'#E8F3FF',
            url: refURL(r.start_year_reference_id||'')
          });
        }
      }
    });
    return out;
  }

  function mapJudges(rows){
    const out=[];
    rows.forEach(r=>{
      const typ = String(r.epoch_type||'').toLowerCase();
      const name = String(r.epoch_name||'');
      if (typ==='judge' || typ==='judges' || /judge/i.test(name) || /judges/i.test(name) || /ruled/i.test(name)){
        const {start, end} = yearFromRow(r);
        if (start!=null && end!=null){
          out.push({
            title: name || 'Judge',
            short: name.replace(/\b(The|Period of)\b\s*/gi,''),
            start, end, color:'#FFF1E6',
            url: refURL(r.start_year_reference_id||'')
          });
        }
      }
    });
    return out;
  }

  function mapCaptivities(rows){
    const out=[];
    rows.forEach(r=>{
      const typ = String(r.epoch_type||'').toLowerCase();
      const name = String(r.epoch_name||'');
      if (typ==='captivity' || typ==='exile' || /captiv|exile|return/i.test(name)){
        const {start, end} = yearFromRow(r);
        if (start!=null && end!=null){
          out.push({
            title: name || 'Captivity/Return',
            short: name.replace(/\b(The|Period of)\b\s*/gi,''),
            start, end, color:'#FFEDEB',
            url: refURL(r.start_year_reference_id||'')
          });
        }
      }
    });
    return out;
  }

  function mapScattering(rows){
    const out=[];
    rows.forEach(r=>{
      const typ = String(r.epoch_type||'').toLowerCase();
      const name = String(r.epoch_name||'');
      if (typ==='diaspora' || /scatter|dispersion|diaspora/i.test(name)){
        const {start, end} = yearFromRow(r);
        if (start!=null && end!=null){
          out.push({
            title: name || 'Scattering',
            short: name.replace(/\b(The|Period of)\b\s*/gi,''),
            start, end, color:'#EEFCEB',
            url: refURL(r.start_year_reference_id||'')
          });
        }
      }
    });
    return out;
  }

  function mapBooks(bookMeta){
    // bookMeta: [{title, start_ah, end_ah, canon, slug}]
    const out=[];
    (Array.isArray(bookMeta) ? bookMeta : []).forEach(b=>{
      const s = toNum(b.start_ah), e = toNum(b.end_ah);
      if (s!=null && e!=null){
        out.push({
          title: b.title,
          short: b.title,
          start:s, end:e, color:'#F3F4F6',
          url: b.slug ? `/israelite-research/${b.canon||'newtestament'}/chapter.html?book=${encodeURIComponent(b.slug)}&ch=1` : ''
        });
      }
    });
    return out;
  }

  function refURL(ref){
    // expects like "GEN 5:5" or "GEN5:5"
    if (!ref) return '';
    const m = /^([A-Za-z]+)\s*([0-9]+):([0-9]+)$/i.exec(String(ref).replace(/\s+/g,' ').trim());
    if (!m) return '';
    const bookLabel = m[1]; // we don't know canon from ref → leave empty
    return ''; // link unknown; can wire to your canon resolver later
  }

  // ---------- Load + render orchestration ----------
  async function loadEpochs(){
    try{
      const r = await fetch(EPOCH_CSV);
      if (!r.ok) throw 0;
      const txt = await r.text();
      return csvToObjects(txt);
    }catch{ return []; }
  }
  async function loadBookMeta(){
    try{
      const r = await fetch(BOOK_META);
      if (!r.ok) throw 0;
      return await r.json();
    }catch{
      // Soft fallback: minimal examples so the track renders
      return [
        { title:'Torah (Genesis–Deuteronomy)', start_ah:1, end_ah:2550, canon:'tanakh', slug:'genesis' },
        { title:'Prophets (Selected)', start_ah:2800, end_ah:3500, canon:'tanakh', slug:'isaiah' },
        { title:'Gospels (Public ministry era)', start_ah:3950, end_ah:3985, canon:'newtestament', slug:'matthew' }
      ];
    }
  }

  async function init(){
    const [rows, books] = await Promise.all([ loadEpochs(), loadBookMeta() ]);

    const patri = mapPatriarchs(rows);
    const judges = mapJudges(rows);
    const caps   = mapCaptivities(rows);
    const dias   = mapScattering(rows);
    const bookT  = mapBooks(books);

    const has = id => !!$(id);

    if (has('#timelineBooks'))       renderTimeline('#timelineBooks', bookT, {title:'Books (approximate periods, AH)'});
    if (has('#timelinePatriarchs'))  renderTimeline('#timelinePatriarchs', patri, {title:'Patriarchs (lifespans, AH)'});
    if (has('#timelineJudges'))      renderTimeline('#timelineJudges', judges, {title:'Judges / Rules (AH)'});
    if (has('#timelineCaptivities')) renderTimeline('#timelineCaptivities', caps, {title:'Captivities & Returns (AH)'});
    if (has('#timelineScattering'))  renderTimeline('#timelineScattering', dias, {title:'Scattering / Diaspora (AH)'});
  }

  // Kickoff when DOM ready
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
