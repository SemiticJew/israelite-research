(function(){
  const FEED = "/israelite-research/data/articles.json";
  const authorImg = "/israelite-research/images/authors/semitic-jew.jpg";

  function fmt(d){
    try {
      const dt = new Date(d+"T12:00:00Z");
      return dt.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
    } catch { return d; }
  }

  function featuredLeft(a){
    return `
<article class="card-featured primary">
  <a class="inner" href="/israelite-research/articles/${a.slug}.html">
    <div class="media">
      <img src="${a.image}" alt="${a.title}">
      <span class="label-pill">Article</span>
    </div>
    <div class="content">
      <h2 class="title">${a.title}</h2>
      <p class="excerpt">${a.excerpt}</p>
      <div class="foot">
        <img class="author-avatar" src="${authorImg}" alt="${a.author}">
        <span class="author-name">${a.author}</span>
        <span class="date">${fmt(a.date)}</span>
      </div>
    </div>
  </a>
</article>`;
  }

  function featuredRight(a){
    return `
<article class="card-featured secondary">
  <a class="inner" href="/israelite-research/articles/${a.slug}.html">
    <div class="media">
      <img src="${a.image}" alt="${a.title}">
      <span class="label-pill">Article</span>
    </div>
    <div class="body">
      <h3 class="title"><a href="/israelite-research/articles/${a.slug}.html">${a.title}</a></h3>
      <p class="excerpt">${a.excerpt}</p>
      <div class="card-foot">
        <img class="author-avatar" src="${authorImg}" alt="${a.author}">
        <span class="author-name">${a.author}</span>
      </div>
      <div class="card-date">${fmt(a.date)}</div>
    </div>
  </a>
</article>`;
  }

  function recentCard(a){
    return `
<article class="card">
  <div class="card-media">
    <img src="${a.image}" alt="${a.title}">
    <span class="label-pill">Article</span>
  </div>
  <div class="card-body">
    <h3 class="card-title"><a href="/israelite-research/articles/${a.slug}.html">${a.title}</a></h3>
    <p class="card-excerpt">${a.excerpt}</p>
    <div class="card-date">${fmt(a.date)}</div>
  </div>
  <div class="card-foot">
    <img class="author-avatar" src="${authorImg}" alt="${a.author}">
    <span class="author-name">${a.author}</span>
  </div>
</article>`;
  }

  async function run(){
    const res = await fetch(FEED,{cache:"no-store"});
    if(!res.ok) return;
    const list = (await res.json()).slice().sort((a,b)=>b.date.localeCompare(a.date));

    const featuredGrid = document.querySelector(".featured-grid");
    const recentGrid   = document.querySelector(".articles-list .grid");

    if(!featuredGrid || !recentGrid || list.length === 0) return;

    const [A,B,...rest] = list;

    // Render featured (left + right)
    featuredGrid.innerHTML = `
      ${A ? featuredLeft(A) : ""}
      ${B ? featuredRight(B) : ""}
    `;

    // Render recent (all remaining)
    recentGrid.innerHTML = rest.map(recentCard).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
