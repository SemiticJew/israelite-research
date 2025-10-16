(function(){
  var activeEl = null;

  function getISO(el){
    if (!el) return null;
    var iso = el.getAttribute('data-iso');
    if (iso) return iso.toUpperCase();
    var id  = (el.id||'').trim();
    var nm  = (el.getAttribute('data-name')||el.getAttribute('name')||'').trim();
    // Heuristics: 2–3 letter IDs or known names
    if (/^[A-Za-z]{2,3}$/.test(id)) { el.setAttribute('data-iso', id.toUpperCase()); return id.toUpperCase(); }
    if (/^[A-Za-z]{2,3}$/.test(nm)) { el.setAttribute('data-iso', nm.toUpperCase()); return nm.toUpperCase(); }
    if (nm) { el.setAttribute('data-iso', nm); return nm; }
    return null;
  }

  function deactivate(el){
    if (!el) return;
    el.classList.remove('region--active');
    el.setAttribute('aria-selected','false');
    el.dispatchEvent(new CustomEvent('region:blur',{bubbles:true, detail:{iso:getISO(el)}}));
    if (activeEl === el) activeEl = null;
  }

  function activate(el){
    if (!el) return;
    if (activeEl && activeEl !== el) deactivate(activeEl);
    if (!el.classList.contains('region--active')) {
      el.classList.add('region--active');
      el.setAttribute('aria-selected','true');
      activeEl = el;
      el.dispatchEvent(new CustomEvent('region:focus',{bubbles:true, detail:{iso:getISO(el)}}));
    } else {
      deactivate(el);
    }
  }

  function findRegionEl(target){
    // Accept any vector shape; climb to nearest shape with (or derivable) ISO
    var el = target.closest('path,polygon,polyline,circle');
    if (!el) return null;
    var iso = getISO(el);
    return iso ? el : null;
  }

  function clickHandler(e){
    var el = findRegionEl(e.target);
    if (el) activate(el); else deactivate(activeEl);
  }

  function keyHandler(e){
    var el = findRegionEl(e.target);
    if (!el) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(el); }
  }

  function prepareRegions(){
    var svg = document.querySelector('svg');
    if (!svg) return;
    // Make regions clickable/accessible
    svg.querySelectorAll('path,polygon,polyline,circle').forEach(function(el){
      if (!getISO(el)) return; // only treat as region if we can resolve an ISO/name
      el.style.pointerEvents = 'auto';
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
      if (!el.hasAttribute('role')) el.setAttribute('role','button');
      if (!el.hasAttribute('aria-selected')) el.setAttribute('aria-selected','false');
    });
    svg.addEventListener('click', clickHandler);
    svg.addEventListener('keydown', keyHandler);
  }

  function ready(fn){
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn,0);
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(prepareRegions);
  window.addEventListener('globe:ready', prepareRegions);
})();
