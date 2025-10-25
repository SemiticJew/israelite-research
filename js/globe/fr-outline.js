(function(){
  function outlineNG() {
    var els = Array.from(document.querySelectorAll('path, polygon, polyline'))
      .filter(function(el){
        var iso = (el.getAttribute('data-iso')||'').toUpperCase();
        var id  = (el.id||'').toUpperCase();
        var n   = (el.getAttribute('data-name')||el.getAttribute('name')||'').toLowerCase();
        return iso === 'NGA' || id === 'NGA' || iso === 'NG' || id === 'NG' || /nigeria/.test(n);
      });
    els.forEach(function(el){
      el.classList.add('region--outlined');
      el.setAttribute('data-iso','NGA');
      if (!el.style.stroke) el.style.stroke = 'var(--region-outline, #054A91)';
      if (!el.style.fillOpacity) el.style.fillOpacity = '0.25';
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(outlineNG, 0);
  } else {
    document.addEventListener('DOMContentLoaded', outlineNG);
  }
  window.addEventListener('globe:ready', outlineNG);
})();
