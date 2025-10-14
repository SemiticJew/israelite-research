(function(){
  function outlineSTP() {
    var candidates = Array.from(document.querySelectorAll('path, polygon, polyline'))
      .filter(function(el){
        var iso = (el.getAttribute('data-iso')||'').toUpperCase();
        var id  = (el.id||'').toUpperCase();
        var n   = (el.getAttribute('data-name')||el.getAttribute('name')||'').toLowerCase();
        return iso === 'STP' || id === 'STP' || /sao\s*t(om|om[eé])|principe/.test(n);
      });
    candidates.forEach(function(el){
      el.classList.add('region--outlined','region--tiny-island');
      el.setAttribute('data-iso','STP');
      el.style.stroke = 'var(--region-outline, #054A91)';
      el.style.fillOpacity = (el.style.fillOpacity || '') || '0.25';
    });
    var hasGeom = candidates.length > 0;
    var svg = document.querySelector('svg');
    if (!svg) return;
    if (!hasGeom) {
      var marker = document.createElementNS('http://www.w3.org/2000/svg','circle');
      marker.setAttribute('r','4.5');
      marker.setAttribute('class','region--tiny-island stp-marker');
      marker.setAttribute('data-iso','STP');
      try {
        if (window.project) {
          var p = window.project([6.73, 0.336]);
          marker.setAttribute('cx', p[0]);
          marker.setAttribute('cy', p[1]);
        } else {
          marker.setAttribute('cx', 360);
          marker.setAttribute('cy', 190);
        }
      } catch(e){
        marker.setAttribute('cx', 360);
        marker.setAttribute('cy', 190);
      }
      svg.appendChild(marker);
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(outlineSTP, 0);
  } else {
    document.addEventListener('DOMContentLoaded', outlineSTP);
  }
  window.addEventListener('globe:ready', outlineSTP);
})();
