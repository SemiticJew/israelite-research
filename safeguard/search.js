(function(){
  const idxURL = '/israelite-research/search-index.json';
  const qEl = document.getElementById('q');
  const go = document.getElementById('go');
  const out = document.getElementById('results');

  const params = new URLSearchParams(location.search);
  if(params.get('q')) qEl.value = params.get('q');

  function norm(s){ return (s||'').toLowerCase(); }

  function render(items){
    out.innerHTML = items.map(it => `
      <article class="search-card">
        <div class="media">
          <img src="${it.image||'/israelite-research/images/articles/logic-compatibility-700x394.jpg'}" alt="">
          ${it.type ? `<span class="label-pill">${it.type}</span>` : ''}
        </div>
        <div class="body">
          <h3 class="title"><a href="${it.url}">${it.title}</a></h3>
          ${it.excerpt ? `<p class="excerpt">${it.excerpt}</p>` : ''}
          ${it.date ? `<div class="date">${it.date}</div>` : ''}
        </div>
      </article>
    `).join('');
  }

  function search(data, q){
    if(!q) return data;
    const nq = norm(q);
    return data.filter(it =>
      norm(it.title).includes(nq) ||
      norm(it.excerpt).includes(nq) ||
      (it.tags||[]).some(t => norm(t).includes(nq))
    );
  }

  function run(){
    fetch(idxURL)
      .then(r => r.json())
      .then(data => {
        const q = qEl.value.trim();
        const results = search(data, q);
        render(results);
        const sp = new URLSearchParams(location.search);
        if(q) sp.set('q', q); else sp.delete('q');
        history.replaceState({}, '', location.pathname + (sp.toString()?`?${sp}`:''));
      })
      .catch(() => { out.innerHTML = '<p>Search is unavailable right now.</p>';});
  }

  go.addEventListener('click', run);
  qEl.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); run(); }});
  window.addEventListener('DOMContentLoaded', run);
})();
