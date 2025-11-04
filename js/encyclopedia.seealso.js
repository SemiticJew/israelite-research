(function(){
  function titleFromId(id){
    var db = window.__ENC_DB || [];
    for (var i=0;i<db.length;i++){ if(db[i].id===id) return db[i].headword||id; }
    // fallback prettifier
    return id.replace(/[-_]+/g,' ').replace(/\b\w/g, m=>m.toUpperCase());
  }
  function enhance(root){
    root = root || document;
    var nodes = root.querySelectorAll('.see-also:not([data-enhanced])');
    nodes.forEach(function(dd){
      dd.setAttribute('data-enhanced','1');
      var raw = (dd.textContent||'').trim();
      if(!raw) return;
      var ids = raw.split(',').map(function(t){ return t.trim().toLowerCase(); }).filter(Boolean);
      if(!ids.length) return;
      dd.innerHTML = ids.map(function(id){
        var label = titleFromId(id);
        return '<a href="#" class="see-link" data-id="'+id+'">'+label+'</a>';
      }).join(', ');
    });
  }
  // click → open the linked entry using app helper
  document.addEventListener('click', function(e){
    var a = e.target.closest('a.see-link');
    if(!a) return;
    e.preventDefault();
    var id = a.getAttribute('data-id');
    if (typeof window.openEncyclopediaEntryById === 'function'){
      window.openEncyclopediaEntryById(id);
    }
  });
  // Observe reader area and enhance when entries render
  var reader = document.getElementById('reader') || document;
  var mo = new MutationObserver(function(){ enhance(reader); });
  mo.observe(reader, {childList:true, subtree:true});
  // initial pass
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ enhance(reader); });
  } else {
    enhance(reader);
  }
})();
(function(){
  function enhanceFromDt(){
    var dts=document.querySelectorAll("#reader dt");
    dts.forEach(function(dt){
      if((dt.textContent||"").trim().toLowerCase().indexOf("see also")===0){
        var dd=dt.nextElementSibling; if(dd && dd.tagName==="DD" && !dd.classList.contains("see-also")){ dd.classList.add("see-also"); }
      }
    });
  }
  var mo=new MutationObserver(enhanceFromDt);
  mo.observe(document.getElementById("reader")||document,{childList:true,subtree:true});
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",enhanceFromDt);}else{enhanceFromDt()}
})();
