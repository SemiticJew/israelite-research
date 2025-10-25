(function(){
  function outlineAll(){
    var svg = document.querySelector('#chart-globe svg');
    if(!svg) return;
    var paths = svg.querySelectorAll('path.land[id]');
    paths.forEach(function(p){
      p.style.stroke = '#00A2FF';
      p.style.strokeWidth = '1.2';
      p.style.pointerEvents = 'all';
      p.addEventListener('mouseenter', function(){
        p.__oldStroke = p.style.stroke;
        p.__oldWidth  = p.style.strokeWidth;
        p.style.stroke = '#36CFFF';
        p.style.strokeWidth = '2';
      });
      p.addEventListener('mouseleave', function(){
        p.style.stroke = p.__oldStroke || '#00A2FF';
        p.style.strokeWidth = p.__oldWidth || '1.2';
      });
    });
  }
  window.addEventListener('globe:ready', outlineAll);
  if (document.readyState !== 'loading') setTimeout(outlineAll, 1200);
  else document.addEventListener('DOMContentLoaded', function(){ setTimeout(outlineAll, 1200); });
})();
