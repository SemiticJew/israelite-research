(function(){
  function slug(b){
    const s=b.toLowerCase().replace(/\./g,'').trim();
    if (s==='dan' || s==='daniel') return 'daniel';
    if (s==='1 maccabees' || s==='i maccabees' || s==='maccabees i' || s==='first maccabees' || s==='1mac' || s==='1-macc' || s==='1 macc') return '1-maccabees';
    return null;
  }
  function parse(t){
    t=(t||'').replace(/[\u2012\u2013\u2014]/g,'-').trim();
    const m=t.match(/^((?:[1-3]\s+)?[A-Za-z][A-Za-z .-]+)\s+(\d+):(\d+)(?:-(\d+))?/);
    if(!m) return null;
    return {book:m[1].trim(), ch:m[2], v:m[3]};
  }
  function fixHref(a){
    const ref=a.getAttribute('data-ref')||a.textContent;
    const p=parse(ref); if(!p) return;
    const s=slug(p.book); if(!s) return;
    const href=`/israelite-research/tanakh/chapter.html?book=${encodeURIComponent(s)}&ch=${encodeURIComponent(p.ch)}#v${encodeURIComponent(p.v)}`;
    a.setAttribute('href', href);
  }
  function run(root){
    (root||document).querySelectorAll('.encyclopedia-detail a.xref, a.xref').forEach(fixHref);
  }
  document.addEventListener('DOMContentLoaded', function(){ run(document); });
  document.addEventListener('xrefs:updated', function(ev){ run((ev&&ev.detail&&ev.detail.root)||document); });
})();
