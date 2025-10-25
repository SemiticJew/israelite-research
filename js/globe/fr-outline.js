(function(){
  function outlineFR(){
    var fr = document.querySelector('#chart-globe svg #FR, #chart-globe #FR, svg #FR, #FR');
    if (!fr) return;
    fr.classList.add('active');
    fr.dispatchEvent(new CustomEvent('region:focus',{bubbles:true, detail:{iso:'FR'}}));
  }
  window.addEventListener('globe:ready', outlineFR);
  if (document.readyState !== 'loading') outlineFR();
})();
