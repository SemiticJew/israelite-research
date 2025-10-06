/* timelines.js — lightweight, dependency-free timeline/bar renderer
   - Supports two modes:
     A) lifespan-scale (no absolute start/end; bar length = lifespan)
     B) absolute-scale    (place bars from `start` to `end` on a shared axis)
   - Hovercard: attach any HTML via `hoverHTML(item)` and we'll display it.
*/

(function(){
  const CSS = `
  .tl-wrap{--ink:#0b2340;--accent:#F17300;--brand:#054A91;--sky:#DBE4EE;--muted:#6b7280;--bg:#fff}
  .tl{position:relative; width:100%; border:1px solid var(--sky); border-radius:12px; background:var(--bg); padding:12px 10px 16px}
  .tl-axis{display:flex; align-items:center; gap:8px; font-size:.85rem; color:var(--muted); margin:0 0 8px}
  .tl-rows{display:flex; flex-direction:column; gap:8px}
  .tl-row{display:grid; grid-template-columns:180px 1fr; gap:8px; align-items:center}
  .tl-name{font-weight:700; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .tl-barwrap{position:relative; height:30px; background:#f8fafc; border:1px dashed #e6ebf2; border-radius:999px; overflow:hidden}
  .tl-bar{position:absolute; left:0; top:0; height:100%; background:linear-gradient(90deg,var(--brand),#3E7CB1); border-radius:999px}
  .tl-tickrow{position:relative; height:0; margin:6px 0 0}
  .tl-tick{position:absolute; top:0; height:6px; width:1px; background:#cfd8e3}
  .tl-ticklabel{position:absolute; top:8px; transform:translateX(-50%); font-size:.75rem; color:#667085}
  .tl-legend{display:flex; gap:12px; flex-wrap:wrap; font-size:.85rem; color:#475569; margin-top:10px}

  /* Hovercard */
  .hovercard{position:fixed; pointer-events:none; z-index:9999; max-width:320px; background:#fff; border:1px solid #e6ebf2; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.08); padding:10px 12px}
  .hovercard h5{margin:0 0 .25rem; font-size:1rem; color:#0b2340}
  .hovercard .muted{color:#6b7280; font-size:.88rem}
  `;

  function ensureStyle(id, css){
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function createEl(tag, cls, html){
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }

  function mountHover(){
    let hc = document.getElementById('hovercard');
    if (!hc){
      hc = createEl('div','hovercard');
      hc.id = 'hovercard';
      document.body.appendChild(hc);
    }
    hc.setAttribute('aria-hidden','true');
    hc.style.display = 'none';
    return hc;
  }

  function showHover(hc, html, x, y){
    hc.innerHTML = html;
    hc.style.left = (x + 12) + 'px';
    hc.style.top  = (y + 12) + 'px';
    hc.style.display = 'block';
    hc.setAttribute('aria-hidden','false');
  }
  function hideHover(hc){
    hc.style.display = 'none';
    hc.setAttribute('aria-hidden','true');
  }

  function scaleTicks(min, max, count=6){
    const span = max - min;
    if (span <= 0) return [];
    const step = Math.max(1, Math.round(span / (count-1)));
    const out = [];
    for (let t=min; t<=max; t+=step) out.push(t);
    if (out[out.length-1] !== max) out.push(max);
    return out;
  }

  function renderLifespanScale({container, items, label='Years', hoverHTML}){
    const maxLife = Math.max(...items.map(d=> d.lifespan||0), 1);
    const ticks   = scaleTicks(0, maxLife, 7);

    const wrap = createEl('div','tl-wrap');
    const tl   = createEl('div','tl');

    const axis = createEl('div','tl-axis', `<strong style="color:#0b2340">Scale:</strong> ${label} (bar length = lifespan)`);
    tl.appendChild(axis);

    // Tick row over full width
    const tickRow = createEl('div','tl-tickrow');
    ticks.forEach(t=>{
      const tk = createEl('div','tl-tick');
      tk.style.left = (t/maxLife*100)+'%';
      const lb = createEl('div','tl-ticklabel', t.toString());
      lb.style.left = (t/maxLife*100)+'%';
      tickRow.appendChild(tk);
      tickRow.appendChild(lb);
    });
    tl.appendChild(tickRow);

    const rows = createEl('div','tl-rows');
    const hc = mountHover();

    items.forEach(d=>{
      const row = createEl('div','tl-row');
      const name = createEl('div','tl-name', d.name);
      const barw = createEl('div','tl-barwrap');
      const bar  = createEl('div','tl-bar');

      const w = Math.max(2, (d.lifespan/maxLife)*100);
      bar.style.width = w + '%';

      // Hover handlers (on name and bar)
      const onEnter = (ev)=>{
        if (!hoverHTML) return;
        const html = hoverHTML(d);
        showHover(hc, html, ev.clientX, ev.clientY);
      };
      const onMove = (ev)=>{
        if (hc.getAttribute('aria-hidden')==='false'){
          hc.style.left = (ev.clientX + 12)+'px';
          hc.style.top  = (ev.clientY + 12)+'px';
        }
      };
      const onLeave = ()=> hideHover(hc);

      [name, bar].forEach(el=>{
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
      });

      barw.appendChild(bar);
      row.appendChild(name);
      row.appendChild(barw);
      rows.appendChild(row);
    });

    tl.appendChild(rows);
    wrap.appendChild(tl);
    container.innerHTML = '';
    container.appendChild(wrap);
  }

  function renderAbsoluteScale({container, items, min, max, axisLabel='Year', hoverHTML}){
    // Items need {start, end}. Draw bars positioned by (start..end) across min..max.
    const span = Math.max(1, max - min);
    const ticks = scaleTicks(min, max, 7);

    const wrap = createEl('div','tl-wrap');
    const tl   = createEl('div','tl');
    tl.appendChild(createEl('div','tl-axis', `<strong style="color:#0b2340">Scale:</strong> ${axisLabel}`));

    const tickRow = createEl('div','tl-tickrow');
    ticks.forEach(t=>{
      const p = ((t - min)/span)*100;
      const tk = createEl('div','tl-tick');
      tk.style.left = p + '%';
      const lb = createEl('div','tl-ticklabel', t.toString());
      lb.style.left = p + '%';
      tickRow.appendChild(tk);
      tickRow.appendChild(lb);
    });
    tl.appendChild(tickRow);

    const rows = createEl('div','tl-rows');
    const hc = mountHover();

    items.forEach(d=>{
      const row  = createEl('div','tl-row');
      const name = createEl('div','tl-name', d.name);
      const barw = createEl('div','tl-barwrap');
      const bar  = createEl('div','tl-bar');

      const left = Math.max(0, ((d.start - min)/span)*100);
      const wid  = Math.max(1, ((d.end   - d.start)/span)*100);
      bar.style.left  = left + '%';
      bar.style.width = wid  + '%';

      const onEnter = (ev)=>{
        if (!hoverHTML) return;
        showHover(hc, hoverHTML(d), ev.clientX, ev.clientY);
      };
      const onMove  = (ev)=>{
        if (hc.getAttribute('aria-hidden')==='false'){
          hc.style.left = (ev.clientX + 12)+'px';
          hc.style.top  = (ev.clientY + 12)+'px';
        }
      };
      const onLeave = ()=> hideHover(hc);
      [name, bar].forEach(el=>{
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
      });

      barw.appendChild(bar);
      row.appendChild(name);
      row.appendChild(barw);
      rows.appendChild(row);
    });

    tl.appendChild(rows);
    wrap.appendChild(tl);
    container.innerHTML = '';
    container.appendChild(wrap);
  }

  ensureStyle('timelines-css', CSS);

  // Expose minimal API
  window.Timelines = {
    renderLifespanScale,
    renderAbsoluteScale
  };
})();
