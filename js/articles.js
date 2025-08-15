(function(){
  const BASE = '/israelite-research';
  const JSON_URL = `${BASE}/data/articles.json?v=${Date.now()}`;
  const AVATAR_FALLBACK = `${BASE}/images/authors/default.jpg`;
  const CARD_FALLBACK   = `${BASE}/images/articles/placeholder-700x394.jpg`;
  const PAGE_SIZE = 12;

  const $grid = document.getElementById('articlesGrid');
  const $loadMore = document.getElementById('loadMore');
  const $tagNotice = document.getElementById('tagNotice');
  const params = new URLSearchParams(location.search);
  const filterTag = (params.get('tag') || '').toLowerCase();

  let all = [];
  let visible = 0;

  fetch(JSON_URL)
    .then(r => r.json())
    .then(items => {
      // normalize + sort newest first
      all = (items || [])
        .map(x => ({
          ...x,
          dateObj: new Date(x.date),
          tags: (x.tags || []).map(t => String(t).toLowerCase())
        }))
        .filter(x => !filterTag || x.tags.includes(filterTag))
        .sort((a,b) => b.dateObj - a.dateObj);

      if (filterTag && $tagNotice) {
        $tagNotice.style.display = 'block';
        $tagNotice.innerHTML = `Filtering by tag: <strong>${escapeHtml(params.get('tag'))}</strong>`;
      }

      renderMore();
      setupLoadMore();
    })
    .catch(err => {
      console.error('Failed to load articles.json', err);
      if ($grid) $grid.innerHTML = `<p style="color:#666">Unable to load articles.</p>`;
      if ($loadMore) $loadMore.style.display = 'none';
    });

  function setupLoadMore(){
    if (!$loadMore) return;
    $loadMore.addEventListener('click', renderMore);
    toggleLoadMore();
  }

  function toggleLoadMore(){
    if (!$loadMore) return;
    $loadMore.style.display = visible < all.length ? 'inline-block' : 'none';
  }

  function renderMore(){
    if (!$grid) return;
    const next = all.slice(visible, visible + PAGE_SIZE);
    const frag = document.createDocumentFragment();
    next.forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = card(item);
      frag.appendChild(div.firstElementChild);
    });
    $grid.appendChild(frag);
    visible += next.length;
    toggleLoadMore();
  }

  function urlFor(slug){
    return `${BASE}/articles/${slug}.html`;
  }

  function imgTag(item, cls=''){
    const src = `${BASE}/images/articles/${item.image || 'placeholder-700x394.jpg'}`;
    const src2x = item.image2x ? `${BASE}/images/articles/${item.image2x}` : src;
    return `<img class="${cls}" src="${src}"
              srcset="${src} 700w, ${src2x} 1000w"
              sizes="(min-width: 1024px) 420px, 100vw"
              alt="${escapeHtml(item.title)}"
              onerror="this.onerror=null;this.src='${CARD_FALLBACK}'">`;
  }

  function avatarTag(item){
    const src = `${BASE}/images/authors/${item.authorSlug || 'semitic-jew'}.jpg`;
    return `<img class="author-avatar" src="${src}" alt="Author: ${escapeHtml(item.author || 'Semitic Jew')}"
            onerror="this.src='${AVATAR_FALLBACK}'">`;
  }

  // Card markup matching your site’s existing card style
  function card(item){
    return `
      <article class="card">
        <a class="card-image" href="${urlFor(item.slug)}">
          ${imgTag(item)}
        </a>
        <div class="card-body">
          <span class="resource-label">${escapeHtml(item.label || 'Article')}</span>
          <h3 class="card-title">
            <a href="${urlFor(item.slug)}">${escapeHtml(item.title)}</a>
          </h3>
          <p class="excerpt">${escapeHtml(item.excerpt || '')}</p>
        </div>
        <div class="article-footer">
          <span class="author-mini">
            ${avatarTag(item)}
            <span class="author-name">${escapeHtml(item.author || 'Semitic Jew')}</span>
          </span>
          <span class="meta">${formatDate(item.dateObj)}</span>
        </div>
      </article>`;
  }

  function formatDate(d){
    if(!(d instanceof Date) || isNaN(d)) return '';
    return d.toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric'});
  }

  function escapeHtml(s=''){
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
})();
