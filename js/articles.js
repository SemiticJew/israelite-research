// /israelite-research/js/article.js
(function () {
  function qs(id){ return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    // Publish date fill
    var pub = qs('pub-date');
    if (pub && !pub.textContent.trim()) {
      var now = new Date();
      pub.dateTime = now.toISOString().slice(0,10);
      pub.textContent = now.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
    }

    // Share links
    var url = location.href, title = document.title;
    var x = qs('share-x'), fb = qs('share-fb'), cp = qs('share-copy');
    if (x)  x.href  = 'https://x.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url);
    if (fb) fb.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    if (cp) {
      function copyIcon(){
        return '<svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">'
             + '<path d="M9 3h9a2 2 0 0 1 2 2v9h-2V5H9V3z" fill="currentColor"></path>'
             + '<rect x="4" y="8" width="12" height="12" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"></rect>'
             + '</svg>';
      }
      cp.addEventListener('click', function(){
        if (navigator.share) { navigator.share({title, url}).catch(function(){}); return; }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function(){
            cp.textContent = 'Link copied ✓';
            setTimeout(function(){ cp.innerHTML = copyIcon(); }, 1100);
          });
        }
      });
    }

    // Modal (author)
    var trigger = qs('author-info');
    var overlay = qs('author-modal');
    var card    = overlay ? overlay.querySelector('.modal-card') : null;
    var closeBtn= qs('author-modal-close');
    var lastFocus;

    function getFocusable(){
      return card ? card.querySelectorAll('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])') : [];
    }
    function onKey(e){
      if (e.key === 'Escape') return closeM(e);
      if (e.key === 'Tab'){
        var f = Array.prototype.slice.call(getFocusable());
        if (!f.length) { e.preventDefault(); return; }
        var first = f[0], last = f[f.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    function openM(e){
      if (e) e.preventDefault();
      if (!overlay) return;
      lastFocus = document.activeElement;
      overlay.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow = 'hidden';
      if (card) card.focus();
      document.addEventListener('keydown', onKey);
    }
    function closeM(e){
      if (e) e.preventDefault();
      if (!overlay) return;
      overlay.setAttribute('aria-hidden','true');
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    if (trigger) trigger.addEventListener('click', openM);
    if (overlay) overlay.addEventListener('click', function(e){ if (e.target === overlay) closeM(e); });
    if (closeBtn) closeBtn.addEventListener('click', closeM);

    // Footnote backrefs wiring (maps inline refs -> bibliography back buttons)
    document.querySelectorAll('.footnote-ref a[href^="#fn"]').forEach(function (a) {
      var liId = a.getAttribute('href').slice(1);
      var sup = a.closest('.footnote-ref');
      if (!sup.id) {
        var n = a.textContent.trim() || liId.replace(/\D+/g,'');
        sup.id = 'ref-fn' + n;
      }
      var entry = document.getElementById(liId);
      if (entry) {
        var back = entry.querySelector('.backref');
        if (back) back.setAttribute('href', '#' + sup.id);
      }
    });
  });
})();
