(function(){
  const normDash = s => s ? s.replace(/[\u2012\u2013\u2014]/g,'-') : '';
  const RE = /\b((?:[1-3]\s+)?[A-Za-z][A-Za-z.]+)\s+\d+:\d+(?:-\d+)?(?:\s*,\s*\d+:\d+)?\b/g;

  function linkify(root){
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(node => {
      const t = normDash(node.nodeValue);
      if (!RE.test(t)) return;
      const html = t.replace(RE, m => `<a class="xref" data-ref="${m}">${m}</a>`);
      const span = document.createElement('span');
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
    });
  }

  function run(){
    const detail = document.querySelector('.encyclopedia-detail') || document.querySelector('#encyclopedia') || document.querySelector('.enc-item') || document.body;
    linkify(detail);
    try {
      document.dispatchEvent(new CustomEvent("xrefs:updated", { detail: { root: detail } }));
    } catch(_) {}
  }

  document.addEventListener('DOMContentLoaded', run);
  document.addEventListener('click', (e) => {
    if (e.target.closest('.encyclopedia-item') || e.target.closest('.enc-item')) {
      setTimeout(run, 0);
    }
  });
})();
