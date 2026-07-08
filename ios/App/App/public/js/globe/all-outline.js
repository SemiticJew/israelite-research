(function () {
  function activateAll() {
    const host = document.getElementById('chart-globe');
    if (!host) return setTimeout(activateAll, 100);
    const svg = host.querySelector('svg');
    if (!svg) return setTimeout(activateAll, 100);

    const paths = svg.querySelectorAll('.land[id]');
    paths.forEach(p => {
      p.classList.add('region-active');
      p.style.stroke = 'rgba(0,123,255,.9)';
      p.style.strokeWidth = '1.2';
      p.style.pointerEvents = 'auto';
    });
    console.log('All regions active:', paths.length);
  }
  window.addEventListener('globe:ready', activateAll);
})();
