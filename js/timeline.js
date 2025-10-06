/* timelines.js — ultra-simple horizontal number line renderer
   - Expects items with { name, lifespan? , duration?, short?, refs? }
   - We convert lifespan/duration -> length (years) and draw a left-origin segment on a single axis.
   - Minimal CSS injected. No dependencies.
*/
(function () {
  const CSS = `
    .nl-wrap{--ink:#0b2340;--muted:#6b7280;--line:#e6ebf2;--bar:#054A91;--fade:#DBE4EE}
    .nl{position:relative; border:1px solid var(--fade); border-radius:12px; background:#fff; padding:14px 12px}
    .nl-axis{position:relative; height:2px; background:var(--line); margin:4px 0 14px}
    .nl-tick{position:absolute; top:-4px; width:1px; height:10px; background:#cfd8e3}
    .nl-ticklabel{position:absolute; top:10px; transform:translateX(-50%); font-size:.75rem; color:var(--muted)}
    .nl-rows{display:flex; flex-direction:column; gap:10px}
    .nl-row{display:grid; grid-template-columns:180px 1fr; gap:10px; align-items:center}
    .nl-name{font-weight:700; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
    .nl-line{position:relative; height:2px; background:var(--line); border-radius:2px}
    .nl-seg{position:absolute; left:0; top:-6px; height:14px; background:var(--bar); border-radius:7px}
    /* Hovercard */
    .hovercard{position:fixed; pointer-events:none; z-index:9999; max-width:320px; background:#fff; border:1px solid #e6ebf2; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.08); padding:10px 12px; display:none}
    .hovercard h5{margin:0 0 .25rem; font-size:1rem; color:#0b2340}
    .hovercard .muted{color:#6b7280; font-size:.88rem}
  `;

  function ensureStyle(id, css){
    if (document.getElementById(id)) return;
    const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s);
  }
  function E(tag, cls, html){ const el = document.createElement(tag); if(cls) el.className=cls; if(html!=null) el.innerHTML=html; return el; }

  function mountHover(){
    let hc = document.getElementById('hovercard'); // reuse page-level hovercard if present
    if (!hc){ hc = E('div','hovercard'); hc.id='hovercard'; document.body.appendChild(hc); }
    return hc;
  }
  function showHover(hc, html, x, y){ hc.innerHTML = html; hc.style.left = (x+12)+'px'; hc.style.top = (y+12)+'px'; hc.style.display='block'; }
  function hideHover(hc){ hc.style.display='none'; }

  function ticks(max, count=6){
    const span = Math.max(1, max);
    const step = Math.max(1, Math.round(span/(count-1)));
    const arr=[]; for(let t=0;t<=span;t+=step) arr.push(t);
    if(arr[arr.length-1]!==span) arr.push(span);
    return arr;
  }

  function renderNumberLine({ container, items, label='Years', hoverHTML }){
    ensureStyle('timelines-simple-css', CSS);

    const lengths = items.map(d => d.lifespan ?? d.duration ?? 0);
    const maxLen = Math.max(1, ...lengths);
    const wrap = E('div','nl-wrap');
    const nl = E('div','nl');

    // Top axis
    const axis = E('div','nl-axis');
    const tk = ticks(maxLen, 7);
    tk.forEach(t=>{
      const p = (t/maxLen)*100;
      const tEl = E('div','nl-tick'); tEl.style.left = p+'%';
      const lEl = E('div','nl-ticklabel', t.toString()); lEl.style.left = p+'%';
      axis.appendChild(tEl); axis.appendChild(lEl);
    });
    nl.appendChild(E('div', null, `<div style="font-size:.85rem;color:#6b7280;margin-bottom:6px"><strong style="color:#0b2340">Scale:</strong> ${label}</div>`));
    nl.appendChild(axis);

    const rows = E('div','nl-rows');
    const hc = mountHover();

    items.forEach(d=>{
      const row  = E('div','nl-row');
      const name = E('div','nl-name', d.name);
      const line = E('div','nl-line');
      const seg  = E('div','nl-seg');
      const w    = Math.max(2, ( (d.lifespan ?? d.duration ?? 0) / maxLen ) * 100);
      seg.style.width = w + '%';

      // hover on name + segment
      const onEnter = ev => { if(!hoverHTML) return; showHover(hc, hoverHTML(d), ev.clientX, ev.clientY); };
      const onMove  = ev => { if(hc.style.display==='block'){ hc.style.left=(ev.clientX+12)+'px'; hc.style.top=(ev.clientY+12)+'px'; } };
      const onLeave = () => hideHover(hc);
      [name, seg].forEach(el=>{
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
      });

      line.appendChild(seg);
      row.appendChild(name);
      row.appendChild(line);
      rows.appendChild(row);
    });

    nl.appendChild(rows);
    wrap.appendChild(nl);
    container.innerHTML = '';
    container.appendChild(wrap);
  }

  window.Timelines = { renderNumberLine };
})();
