(function(){
  function ensureCard(){
    var el = document.getElementById('verse-card');
    if(!el){
      el = document.createElement('div');
      el.id = 'verse-card';
      el.innerHTML = '<div class="vc-head"></div><div class="vc-text"></div>';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    return el;
  }
  function pos(card, target){
    var r = target.getBoundingClientRect();
    card.style.visibility='hidden'; card.style.display='block';
    var cw = card.offsetWidth, ch = card.offsetHeight;
    card.style.visibility='';
    var left = r.left, top = r.top - ch - 8;
    if(left + cw > window.innerWidth - 12) left = window.innerWidth - cw - 12;
    if(left < 12) left = 12;
    if(top < 12) top = r.bottom + 8;
    card.style.left = (left + window.scrollX) + 'px';
    card.style.top  = (top + window.scrollY) + 'px';
  }
  function show(el){
    var c = ensureCard();
    c.querySelector('.vc-head').textContent = el.getAttribute('data-ref') || el.textContent.trim();
    c.querySelector('.vc-text').textContent = el.getAttribute('data-note') || 'Open references for full passage.';
    pos(c, el);
  }
  function hide(){
    var c = document.getElementById('verse-card');
    if(c) c.style.display='none';
  }
  function bindOne(el){
    el.addEventListener('mouseenter', function(){ show(el); });
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', function(){ show(el); });
    el.addEventListener('blur', hide);
    el.addEventListener('click', function(e){ e.preventDefault(); });
  }
  function init(){
    document.querySelectorAll('.verse').forEach(bindOne);
    window.addEventListener('scroll', hide, {passive:true});
    window.addEventListener('resize', hide, {passive:true});
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
