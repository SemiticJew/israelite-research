(function () {
  function qs(id){ return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    var pub = qs('pub-date');
    if (pub && !pub.textContent.trim()) {
      var now = new Date();
      pub.dateTime = now.toISOString().slice(0,10);
      pub.textContent = now.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
    }

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
  });
})();
