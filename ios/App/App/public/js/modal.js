(function () {
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    var trigger = document.getElementById('author-info');
    var overlay = document.getElementById('author-modal');
    if (!overlay) return;

    var card = overlay.querySelector('.modal-card, .modal-panel') || overlay;
    var closeBtn = document.getElementById('author-modal-close') || overlay.querySelector('.modal-close');
    var lastFocus;

    function getFocusable(){
      return card.querySelectorAll('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])');
    }

    function openM(e){
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      overlay.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow = 'hidden';
      (card.focus || Function.prototype).call(card);
      document.addEventListener('keydown', onKey);
    }

    function closeM(e){
      if (e) e.preventDefault();
      overlay.setAttribute('aria-hidden','true');
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function onKey(e){
      if (e.key === 'Escape') return closeM(e);
      if (e.key === 'Tab'){
        var f = Array.prototype.slice.call(getFocusable());
        if (!f.length){ e.preventDefault(); return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    }

    if (trigger) trigger.addEventListener('click', openM);
    if (closeBtn) closeBtn.addEventListener('click', closeM);

    // Close when clicking backdrop or any element with [data-close]
    overlay.addEventListener('click', function(e){
      if (e.target === overlay || (e.target && e.target.hasAttribute('data-close'))) closeM(e);
    });
  });
})();
