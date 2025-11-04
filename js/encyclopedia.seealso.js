(function(){
  function findEntryByKey(key){
    key = String(key||'').trim().toLowerCase();
    var db = window.__ENC_DB || [];
    return db.find(function(x){
      return String(x.id||'').toLowerCase() === key ||
             String(x.headword||'').toLowerCase() === key;
    }) || null;
  }
  function niceLabel(key){
    var e = findEntryByKey(key);
    if (e && e.headword) return e.headword;
    return String(key||'')
      .replace(/[-_]+/g,' ')
      .replace(/\b\w/g, m=>m.toUpperCase());
  }
  function openById(id){
    if (typeof window.__openEntry === 'function'){
      var e = findEntryByKey(id);
      if (e) window.__openEntry(e);
    } else if (typeof window.openEncyclopediaEntryById === 'function'){
      window.openEncyclopediaEntryById(id);
    }
  }
  function linkify(root){
    root = root || document;
    var scope = root.querySelector('#reader') || root;
    var dts = scope.querySelectorAll('dt');
    dts.forEach(function(dt){
      var txt = (dt.textContent||'').trim().toLowerCase();
      if(!/^see also\.?$/.test(txt)) return;              // matches “See also” or “See also.”
      var dd = dt.nextElementSibling;
      if (!dd || dd.tagName !== 'DD' || dd.dataset.enhanced === '1') return;
      var raw = (dd.textContent||'').trim();
      if(!raw) return;
      var parts = raw.split(',').map(function(s){return s.trim();}).filter(Boolean);
      if(!parts.length) return;
      dd.innerHTML = parts.map(function(id){
        var key = id.toLowerCase();
        var label = niceLabel(key);
        return '<a href="#" class="see-link" data-id="'+key+'">'+label+'</a>';
      }).join(', ');
      dd.dataset.enhanced = '1';
    });
  }
  // clicks on links
  document.addEventListener('click', function(e){
    var a = e.target.closest('a.see-link');
    if(!a) return;
    e.preventDefault();
    openById(a.getAttribute('data-id'));
  });
  // observe changes in reader to re-run
  var target = document.getElementById('reader') || document.body;
  var mo = new MutationObserver(function(){ linkify(target); });
  mo.observe(target, {childList:true, subtree:true});
  // initial run
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ linkify(target); });
  } else {
    linkify(target);
  }
})();
