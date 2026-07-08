(function(){
  function rebind(root){
    try {
      if (window.XRef && typeof window.XRef.init === 'function') window.XRef.init(root);
      if (window.XRef && typeof window.XRef.bind === 'function') window.XRef.bind(root);
      if (typeof window.initXrefHover === 'function') window.initXrefHover(root);
      if (window.Citations && typeof window.Citations.bind === 'function') window.Citations.bind(root);
    } catch(e) {
      console && console.warn && console.warn('xref rebind warning:', e);
    }
  }
  document.addEventListener('DOMContentLoaded', function(){ rebind(document); });
  document.addEventListener('xrefs:updated', function(ev){ rebind((ev && ev.detail && ev.detail.root) || document); });
})();
