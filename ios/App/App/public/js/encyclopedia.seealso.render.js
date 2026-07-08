(function(){
  function findEntryByKey(key){
    key = String(key||'').trim().toLowerCase();
    var db = (window.__ENC_DB||[]);
    return db.find(function(x){
      return String(x.id||'').toLowerCase()===key ||
             String(x.headword||'').toLowerCase()===key;
    }) || null;
  }
  function niceLabel(key){
    var e = findEntryByKey(key);
    if (e && e.headword) return e.headword;
    return String(key||'').replace(/[-_]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
  }
  function openById(id){
    var e = findEntryByKey(id);
    if (e && typeof window.__openEntry==='function') window.__openEntry(e);
  }

  // Wrap the existing __openEntry to post-process "See also"
  var _orig = window.__openEntry;
  window.__openEntry = function(e){
    if (typeof _orig === 'function') _orig(e);
    try{
      // Find the dt that says "See also" (with or without trailing period)
      var reader = document.getElementById('reader') || document;
      var dts = reader.querySelectorAll('dt');
      for (var i=0;i<dts.length;i++){
        var dt = dts[i];
        var txt = (dt.textContent||'').trim().toLowerCase().replace(/\.$/,'');
        if (txt !== 'see also') continue;

        // The following DD may be wrapped; walk forward to the first <dd>
        var dd = dt.nextElementSibling;
        while (dd && dd.tagName !== 'DD'){ dd = dd.nextElementSibling; }
        if (!dd) break;
        if (dd.dataset.enhanced === '1') break;

        var ids = Array.isArray(e.see_also) ? e.see_also.slice() : [];
        if (!ids.length){
          // fallback: parse any plain text already present
          var raw = (dd.textContent||'').trim();
          if (raw){
            ids = raw.split(',').map(function(s){return s.trim();}).filter(Boolean);
          }
        }
        if (!ids.length) break;

        dd.innerHTML = ids.map(function(id){
          var key = String(id||'').trim();
          var label = niceLabel(key);
          return '<a href="#" class="see-link" data-id="'+key+'">'+label+'</a>';
        }).join(', ');
        dd.dataset.enhanced = '1';
        break;
      }
    }catch(_e){}
  };

  // Click handler for the links
  document.addEventListener('click', function(ev){
    var a = ev.target.closest && ev.target.closest('a.see-link');
    if (!a) return;
    ev.preventDefault();
    openById(a.getAttribute('data-id'));
  });

  // If an entry is already open when this loads, re-open it to enhance
  setTimeout(function(){
    var current = window.__ENC_CURRENT_ENTRY;
    if (current && typeof window.__openEntry==='function') window.__openEntry(current);
  }, 0);
})();
