(function(){
  function findEntryByKey(key){
    key = String(key||'').trim().toLowerCase();
    var db = window.__ENC_DB || [];
    for (var i=0;i<db.length;i++){
      var x = db[i];
      if (String(x.id||'').toLowerCase()===key || String(x.headword||'').toLowerCase()===key) return x;
    }
    return null;
  }
  function niceLabel(key){
    var e = findEntryByKey(key);
    if (e && e.headword) return e.headword;
    return String(key||'').replace(/[-_]+/g,' ').replace(/\b\w/g,function(m){return m.toUpperCase();});
  }
  function openById(id){
    if (typeof window.__openEntry === 'function'){
      var e = findEntryByKey(id);
      if (e) window.__openEntry(e);
    } else if (typeof window.openEncyclopediaEntryById === 'function'){
      window.openEncyclopediaEntryById(id);
    }
  }

  // robustly get the DD that belongs to a given DT, even if wrappers/whitespace are present
  function ddFromDt(dt){
    // 1) walk siblings forward until a DD is found
    var n = dt.nextSibling, steps = 0;
    while (n && steps < 20){
      if (n.nodeType === 1 && n.tagName === 'DD') return n;
      n = n.nextSibling; steps++;
    }
    // 2) fallback: within the closest DL, take the first DD that appears after this DT
    var p = dt.parentElement;
    while (p && p.tagName !== 'DL') p = p.parentElement;
    if (p){
      var seen = false;
      for (var i=0;i<p.children.length;i++){
        var el = p.children[i];
        if (el === dt){ seen = true; continue; }
        if (seen && el.tagName === 'DD') return el;
      }
    }
    return null;
  }

  function linkify(root){
    root = root || document;
    var scope = root.querySelector('#reader') || root;
    var dts = scope.querySelectorAll('dt');
    for (var i=0;i<dts.length;i++){
      var dt = dts[i];
      var label = (dt.textContent||'').trim().toLowerCase().replace(/\.$/, '');
      if (label !== 'see also') continue;

      var dd = ddFromDt(dt);
      if (!dd || dd.dataset.enhanced === '1') continue;

      var raw = (dd.textContent||'').trim();
      if (!raw) continue;

      var parts = raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      if (!parts.length) continue;

      dd.innerHTML = parts.map(function(id){
        var key = id.toLowerCase();
        var text = niceLabel(key);
        return '<a href="#" class="see-link" data-id="'+key+'">'+text+'</a>';
      }).join(', ');

      dd.dataset.enhanced = '1';
    }
  }

  document.addEventListener('click', function(e){
    var a = e.target.closest('a.see-link');
    if (!a) return;
    e.preventDefault();
    openById(a.getAttribute('data-id'));
  });

  var target = document.getElementById('reader') || document.body;
  var mo = new MutationObserver(function(){ linkify(target); });
  mo.observe(target, {childList:true, subtree:true});

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ linkify(target); });
  } else {
    linkify(target);
  }
})();
