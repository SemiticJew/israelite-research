(async function(){
  const resEl = document.querySelector("#results");
  const qEl = document.querySelector("#encySearch");

  const manifest = await fetch("/israelite-research/data/encyclopedia/manifest.json").then(r=>r.json());

  const render = (items) => {
    resEl.innerHTML = items.map(it => `
      <article class="card">
        <a href="/israelite-research/encyclopedia/entry.html?id=${encodeURIComponent(it.id)}">
          <div class="thumb"><span>${(it.badge || "ENTRY").toUpperCase()}</span></div>
          <div class="body">
            <div class="kicker">${(it.type||[]).join(" · ")}</div>
            <h3 class="title">${it.term}</h3>
            <p class="desc">${it.summary||""}</p>
            <div class="chips">${(it.tags||[]).map(t=>`<span class="chip">${t}</span>`).join("")}</div>
          </div>
        </a>
      </article>
    `).join("");
  };

  const idxText = it =>
    [it.term, ...(it.type||[]), it.summary, ...(it.biblical_refs||[]), ...(it.tags||[])]
      .join(" ").toLowerCase();

  let cache = manifest.map(it => ({...it, __t: idxText(it)}));
  render(cache);

  qEl.addEventListener("input", (e)=>{
    const q = e.target.value.trim().toLowerCase();
    if(!q){ render(cache); return; }
    render(cache.filter(it => it.__t.includes(q)));
  });
})();
