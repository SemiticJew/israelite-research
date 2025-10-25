(function(){
  function outlineFR() {
    var els = Array.from(document.querySelectorAll('path, polygon, polyline'))
      .filter(function(el){
        var iso = (el.getAttribute('data-iso')||'').toUpperCase();
        var id  = (el.id||'').toUpperCase();
        var n   = (el.getAttribute('data-name')||el.getAttribute('name')||'').toLowerCase();
        return iso === 'FRA' || id === 'FRA' || iso === 'FR' || id === 'FR' || /france|gaul|fran[cç]e/.test(n);
      });
    els.forEach(function(el){
      el.classList.add('region--outlined');
      el.setAttribute('data-iso','FR');
      if (!el.style.stroke) el.style.stroke = 'var(--region-outline, #054A91)';
      if (!el.style.fillOpacity) el.style.fillOpacity = '0.25';
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(outlineFR, 0);
  } else {
    document.addEventListener('DOMContentLoaded', outlineFR);
  }
  window.addEventListener('globe:ready', outlineFR);
})();
