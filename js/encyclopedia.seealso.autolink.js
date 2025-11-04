(function(){
  // Wait until the dictionary DB is available
  function onReadyDB(cb){
    if (Array.isArray(window.__ENC_DB) && window.__ENC_DB.length){ cb(); return; }
    const t = setInterval(function(){
      if (Array.isArray(window.__ENC_DB) && window.__ENC_DB.length){
        clearInterval(t); cb();
      }
    }, 120);
  }

  function labelForId(id){
    var hit = (window.__ENC_DB||[]).find(function(x){ return String(x.id).toLowerCase() === String(id).toLowerCase(); });
    if (hit && hit.headword) return hit.headword;
    return String(id||'').replace(/[-_]+/g,' ').replace(/\b\w/g,function(m){return m.toUpperCase();});
  }

  function openById(id){
    if (typeof window.openEncyclopediaEntryById === 'function') {
      window.openEncyclopediaEntryById(id);
    } else if (typeof window.__openEntry === 'function') {
      var e = (window.__ENC_DB||[]).find(function(x){ return String(x.id).toLowerCase() === String(id).toLowerCase(); });
      if (e) window.__openEntry(e);
    } else {
      // Fallback: try selecting card by term
      var term = labelForId(id).toLowerCase();
      var cards = document.querySelectorAll('.panel-left .card');
      for (var i=0;i<cards.length;i++){
        var t = (cards[i].querySelector('.term')||{}).textContent||'';
        if (t.trim().toLowerCase() === term){ cards[i].click(); break; }
      }
    }
  }

  function enhance(root){
    root = root || document;
    var reader = root.querySelector('#reader') || root;
    // Find any DT with "See also" (case/period tolerant) and transform the following DD,
    // even if there are wrappers between them.
    var dts = reader.querySelectorAll('dt');
    dts.forEach(function(dt){
      var txt = (dt.textContent||'').trim().toLowerCase();
      if (!/^see also\.?$/.test(txt)) return;

      // Walk forward to find the next DD (skip wrappers like div)
      var node = dt.nextSibling, dd = null;
      while (node){
        if (node.nodeType === 1) { // element
          if (node.tagName === 'DD'){ dd = node; break; }
          // if element contains a DD inside (e.g., wrapper), grab the first one
          var inner = node.querySelector && node.querySelector('dd');
          if (inner){ dd = inner; break; }
        }
        node = node.nextSibling;
      }
      if (!dd || dd.dataset.seeAutoLinked === '1') return;

      var raw = (dd.textContent||'').trim();
      if (!raw) return;
      var parts = raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      if (!parts.length) return;

      dd.innerHTML = parts.map(function(id){
        var key = id.toLowerCase();
        var label = labelForId(key);
        return '<a href="#" class="see-link" data-id="'+key+'">'+label+'</a>';
      }).join(', ');
      dd.dataset.seeAutoLinked = '1';
    });
  }

  // Click delegation
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a.see-link');
    if (!a) return;
    e.preventDefault();
    openById(a.getAttribute('data-id'));
  });

  function bind(){
    var reader = document.getElementById('reader') || document.body;
    // Initial run
    enhance(reader);
    // Observe changes (opening a new entry re-renders the reader)
    var mo = new MutationObserver(function(){ enhance(reader); });
    mo.observe(reader, {childList:true, subtree:true});
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ onReadyDB(bind); });
  } else {
    onReadyDB(bind);
  }
})();
