/* timelines.js — interactive dot-plot timelines (horizontal, responsive)
   Expects items with either {lifespan} or {duration} representing "years".
   API: Timelines.renderDotPlot({ container, items, label, hoverHTML })
*/
(function () {
  const CSS = `
  .dp-wrap{--ink:#0b2340;--muted:#6b7280;--grid:#e6ebf2;--dot:#054A91;--dotAlt:#3E7CB1;--bg:#fff}
  .dp{position:relative;border:1px solid var(--grid);border-radius:12px;background:var(--bg);padding:12px}
  .dp-scale{font-size:.85rem;color:var(--muted);margin-bottom:8px}
  .dp-axis{position:relative;height:2px;background:var(--grid);margin:6px 0 14px}
  .dp-tick{position:absolute;top:-5px;width:1px;height:12px;background:#cfd8e3}
  .dp-ticklabel{position:absolute;top:10px;transform:translateX(-50%);font-size:.74rem;color:#667085;white-space:nowrap}
  .dp-plane{position:relative; width:100%; height:auto; min-height:60px}
  .dp-dot{position:absolute; width:12px;height:12px;border-radius:50%; background:var(--dot);box-shadow:0 1px 0 rgba(0,0,0,.1);cursor:pointer;transition:transform .08s ease}
  .dp-dot:focus-visible{outline:2px solid var(--dotAlt);outline-offset:2px}
  .dp-dot:hover{transform:scale(1.06)}
  .dp-label{position:absolute;left:0;top:-2px;transform:translateX(-100%);font-size:.8rem;color:var(--ink);font-weight:700}
  /* hovercard (reuses page #hovercard if present) */
  .hovercard{position:fixed;pointer-events:none;z-index:9999;max-width:320px;background:#fff;border:1px solid #e6ebf2;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.08);padding:10px 12px;display:none}
  .hovercard h5{margin:0 0 .25rem;font-size:1rem;color:#0b2340}
  .hovercard .muted{color:#6b7280;font-size:.88rem}
  `;

  function ensureStyle(id, css){
    if(document.getElementById(id)) return;
    const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s);
  }
  function E(tag, cls, html){ const el=document.createElement(tag); if(cls) el.className=cls; if(html!=null) el.innerHTML=html; return el; }

  function mountHover(){
    let hc=document.getElementById('hovercard');
    if(!hc){ hc=E('div','hovercard'); hc.id='hovercard'; document.body.appendChild(hc); }
    return hc;
  }
  function showHover(hc, html, x, y){ hc.innerHTML=html; hc.style.left=(x+12)+'px'; hc.style.top=(y+12)+'px'; hc.style.display='block'; }
  function hideHover(hc){ hc.style.display='none'; }

  function ticks(max, target=7){
    const span=Math.max(1, max);
    const raw=span/(target-1);
    const pow=Math.pow(10, Math.floor(Math.log10(raw)));
    const niceStep=[1,2,5,10].map(m=>m*pow).reduce((a,b)=>Math.abs(b-raw)<Math.abs(a-raw)?b:a, pow);
    const out=[]; for(let t=0; t<=span+1e-9; t+=niceStep) out.push(Math.round(t));
    if(out[out.length-1]!==span) out.push(Math.round(span));
    return out;
  }

  // Simple vertical stacking to avoid overlap: bucket x-pos into bins and stack within each bin.
  function stackPositions(xs, dotPx=12, laneGap=8){
    const lanes=[]; // each lane stores lastX placed
    const placed = xs.map(x=>{
      let lane=0;
      while(true){
        if(!lanes[lane] || Math.abs(x - lanes[lane]) > (dotPx+4)) { lanes[lane]=x; break; }
        lane++;
      }
      return {x, lane};
    });
    const height = (Math.max(...placed.map(p=>p.lane), 0)+1)*(dotPx+laneGap) + 8;
    return { placed, height };
  }

  function renderDotPlot({ container, items, label='Years', hoverHTML }){
    ensureStyle('dp-css', CSS);

    const values = items.map(d => d.lifespan ?? d.duration ?? 0);
    const maxV = Math.max(1, ...values);
    const wrap = E('div','dp-wrap');
    const dp   = E('div','dp');
    dp.appendChild(E('div','dp-scale', `<strong style="color:#0b2340">Scale:</strong> ${label}`));

    // axis
    const axis = E('div','dp-axis');
    ticks(maxV, 7).forEach(t=>{
      const p=(t/maxV)*100;
      const tk=E('div','dp-tick'); tk.style.left=p+'%';
      const lb=E('div','dp-ticklabel', t.toString()); lb.style.left=p+'%';
      axis.appendChild(tk); axis.appendChild(lb);
    });
    dp.appendChild(axis);

    // compute x% for each item
    const xs = values.map(v => (v/maxV)*100);
    const { placed, height } = stackPositions(xs.map(p=>p), 12, 10);

    const plane = E('div','dp-plane');
    plane.style.height = height+'px';

    const hc = mountHover();

    placed.forEach((p, i)=>{
      const d = items[i];
      const dot = E('button','dp-dot'); dot.type='button'; dot.setAttribute('aria-label', d.name);
      dot.style.left = `calc(${p.x}% - 6px)`;
      dot.style.top  = `${p.lane * 22}px`;

      // hover/keyboard
      const html = hoverHTML ? hoverHTML(d) : `<h5>${d.name}</h5>`;
      const enter = ev => showHover(hc, html, (ev.clientX||dot.getBoundingClientRect().x), (ev.clientY||dot.getBoundingClientRect().y));
      const move  = ev => { if(hc.style.display==='block'){ hc.style.left=(ev.clientX+12)+'px'; hc.style.top=(ev.clientY+12)+'px'; } };
      const leave = () => hideHover(hc);
      dot.addEventListener('mouseenter', enter);
      dot.addEventListener('mousemove', move);
      dot.addEventListener('mouseleave', leave);
      dot.addEventListener('focus', ()=> {
        const r = dot.getBoundingClientRect();
        showHover(hc, html, r.right, r.top);
      });
      dot.addEventListener('blur', hideHover);

      // optional tiny label near left edge for context on first lane
      if (i===0) {
        const labelEl = E('div','dp-label', items.length ? (items[0].lifespan!=null?'lifespan':'duration') : '');
        plane.appendChild(labelEl);
      }
      plane.appendChild(dot);
    });

    dp.appendChild(plane);
    wrap.appendChild(dp);
    container.innerHTML='';
    container.appendChild(wrap);
  }

  window.Timelines = { renderDotPlot };
})();
