(function(){
  const MAP = {
    "genesis":     {canon:"tanakh", slug:"genesis"},
    "isaiah":      {canon:"tanakh", slug:"isaiah"},
    "daniel":      {canon:"tanakh", slug:"daniel"},
    "1 maccabees": {canon:"apocrypha", slug:"1-maccabees"},
    "2 maccabees": {canon:"apocrypha", slug:"2-maccabees"},
    "wisdom":      {canon:"apocrypha", slug:"wisdom"},
    "sirach":      {canon:"apocrypha", slug:"sirach"}
  };

  function norm(s){ return (s||"").toLowerCase().replace(/\./g,"").trim(); }
  function parseRef(t){
    t=(t||"").replace(/[\u2012\u2013\u2014]/g,"-").trim();
    const m=t.match(/^((?:[1-3]\s+)?[A-Za-z][A-Za-z .'-]+?)\s+(\d+):(\d+)/);
    if(!m) return null;
    return { book: norm(m[1]), ch: m[2], v: m[3] };
  }
  function buildHref(book, ch, v){
    const hit = MAP[book];
    if(!hit) return null;
    if (hit.canon==="apocrypha"){
      return `/israelite-research/apocrypha/chapter.html?book=${encodeURIComponent(hit.slug)}&ch=${encodeURIComponent(ch)}`;
    }
    if (hit.canon==="tanakh"){
      return `/israelite-research/tanakh/chapter.html?book=${encodeURIComponent(hit.slug)}&ch=${encodeURIComponent(ch)}#v=${encodeURIComponent(v)}`;
    }
    if (hit.canon==="new-testament"){
      return `/israelite-research/new-testament/chapter.html?book=${encodeURIComponent(hit.slug)}&ch=${encodeURIComponent(ch)}#v=${encodeURIComponent(v)}`;
    }
    return null;
  }
  function fix(a){
    const ref=a.getAttribute('data-ref')||a.textContent;
    const p=parseRef(ref); if(!p) return;
    const href=buildHref(p.book, p.ch, p.v);
    if(href) a.setAttribute('href', href);
  }
  function run(root){
    (root||document).querySelectorAll('.encyclopedia-detail a.xref, a.xref').forEach(fix);
  }
  document.addEventListener('DOMContentLoaded', function(){ run(document); });
  document.addEventListener('xrefs:updated', function(ev){ run((ev&&ev.detail&&ev.detail.root)||document); });
})();
