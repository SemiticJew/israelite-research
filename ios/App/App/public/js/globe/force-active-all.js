(function(){
  let armed = false;

  function getISO(el){
    // Prefer explicit id on the path; some maps nest paths inside groups
    if (el && el.id && /^[A-Z]{2}(-[A-Z]{2})?$/.test(el.id)) return el.id;
    // Climb up to find a parent with an ISO-like id
    let p = el;
    while (p && p !== document && p.parentNode){
      if (p.id && /^[A-Z]{2}(-[A-Z]{2})?$/.test(p.id)) return p.id;
      p = p.parentNode;
    }
    return null;
  }

  function wire(el){
    if (!el || el.__wiredAll) return;
    const iso = getISO(el);
    if (!iso) return;
    el.__wiredAll = true;
    el.classList.add('region-active');
    el.style.pointerEvents = 'auto';
    el.style.stroke = 'rgba(0,123,255,.9)';
    el.style.strokeWidth = '1.2';

    el.addEventListener('mouseenter', () => {
      el.dispatchEvent(new CustomEvent('region:focus', { bubbles:true, detail:{ iso } }));
    });
    el.addEventListener('mouseleave', () => {
      el.dispatchEvent(new CustomEvent('region:blur', { bubbles:true, detail:{ iso } }));
    });
    el.addEventListener('click', () => {
      el.dispatchEvent(new CustomEvent('region:select', { bubbles:true, detail:{ iso } }));
    });
  }

  function armAll(){
    const host = document.getElementById('chart-globe');
    if (!host) return false;
    // amCharts renders an SVG within the host; sometimes after a tick
    const svg = host.querySelector('svg');
    if (!svg) return false;

    // Be generous: paths or groups with ISO-like ids
    const nodes = svg.querySelectorAll('[id]');
    let count = 0;
    nodes.forEach(n => {
      if (/^[A-Z]{2}(-[A-Z]{2})?$/.test(n.id)) {
        // If it's a group, also try its child paths
        if (n.tagName.toLowerCase() === 'g') {
          n.querySelectorAll('path').forEach(wire);
        }
        wire(n);
        count++;
      }
    });

    // Also target common class used in your map
    svg.querySelectorAll('.land[id]').forEach(wire);

    console.log('Force-activated regions (all):', count);
    return count > 0;
  }

  function init(){
    if (armed) return;
    // Try a few times because amCharts builds async
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (armAll() || tries > 40){ // ~4s max
        clearInterval(t);
        armed = true;
      }
    }, 100);
  }

  window.addEventListener('globe:ready', init);
  // Fallback if globe:ready never fires
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 300);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
