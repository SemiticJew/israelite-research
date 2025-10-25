(function(){
  window.addEventListener('globe:ready', function(){
    var host = document.getElementById('chart-globe');
    if (!host) return;
    var fr =
      host.querySelector('svg #FR') ||
      host.querySelector('#FR');
    if (!fr) return;
    fr.classList.add('region-active');
    try {
      fr.style.stroke = 'var(--accent, #3b82f6)';
      fr.style.strokeWidth = '2';
      fr.style.fillOpacity = fr.style.fillOpacity || '0.95';
    } catch(_) {}
  });
})();
