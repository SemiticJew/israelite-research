(function () {
  var trigger = document.getElementById('author-info');
  var overlay = document.getElementById('author-modal');
  if (!overlay) return;
  var card = overlay.querySelector('.modal-card');
  var closeBtn = document.getElementById('author-modal-close');
  var lastFocus;

  function focusables() {
    return card ? card.querySelectorAll('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])') : [];
  }
  function onKey(e){
    if(e.key==='Escape'){ closeM(e); return; }
    if(e.key==='Tab'){
      var f=[...focusables()];
      if(!f.length){ e.preventDefault(); return; }
      var first=f[0], last=f[f.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  }
  function openM(e){
    if(e) e.preventDefault();
    lastFocus=document.activeElement;
    overlay.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow='hidden';
    if(card) card.focus();
    document.addEventListener('keydown', onKey);
  }
  function closeM(e){
    if(e) e.preventDefault();
    overlay.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow='';
    document.removeEventListener('keydown', onKey);
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if(trigger) trigger.addEventListener('click', openM);
  if(closeBtn) closeBtn.addEventListener('click', closeM);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) closeM(e); });
})();
