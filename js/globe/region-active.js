(function(){
  var activeEl = null;

  function isoOf(el){
    return (el && (el.getAttribute('data-iso') || el.id || '')).toUpperCase() || null;
  }

  function deactivate(el){
    if (!el) return;
    el.classList.remove('region--active');
    el.setAttribute('aria-selected','false');
    el.dispatchEvent(new CustomEvent('region:blur',{bubbles:true, detail:{iso: isoOf(el)}}));
    if (activeEl === el) activeEl = null;
  }

  function activate(el){
    if (!el) return;
    if (activeEl && activeEl !== el) deactivate(activeEl);
    if (el.classList.toggle('region--active')) {
      activeEl = el;
      el.setAttribute('aria-selected','true');
      el.dispatchEvent(new CustomEvent('region:focus',{bubbles:true, detail:{iso: isoOf(el)}}));
    } else {
      deactivate(el);
    }
  }

  function clickHandler(e){
    // Find nearest region element with data-iso (works for tiny island markers too)
    var el = e.target.closest('[data-iso]');
    if (el) {
      activate(el);
    } else {
      deactivate(activeEl);
    }
  }

  function keyHandler(e){
    var el = e.target.closest('[data-iso]');
    if (!el) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(el);
    }
  }

  function prepareRegions(){
    var svg = document.querySelector('svg');
    if (!svg) return;
    // Make regions keyboard-focusable
    document.querySelectorAll('[data-iso]').forEach(function(el){
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
      if (!el.hasAttribute('role')) el.setAttribute('role','button');
      if (!el.hasAttribute('aria-selected')) el.setAttribute('aria-selected','false');
    });
    svg.addEventListener('click', clickHandler);
    svg.addEventListener('keydown', keyHandler);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(prepareRegions, 0);
  } else {
    document.addEventListener('DOMContentLoaded', prepareRegions);
  }
  window.addEventListener('globe:ready', prepareRegions);
})();
