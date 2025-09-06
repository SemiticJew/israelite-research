cat <<'EOF' > js/dictionary.js
(async function(){
  const resEl = document.querySelector("#results");
  const qEl = document.querySelector("#dictSearch");

  const manifest = await fetch("/israelite-research/data/encyclopedia/manifest.json")
    .then(r=>r.json());

  const render = (items) => {
    resEl.innerHTML = items.map(it => `
      <article class="card">
        <h3 style="margin:0 0 6px"><a href="/israelite-research/dictionary/entry.html?id=${encodeURIComponent(it.id)}">${it.term}</a></h3>
        <div class="meta">${(it.type||[]).join(" · ")}</div>
        <p>${it.summary||""}</p>
        <div>${(it.tags||[]).map(t=>`<span class="chip">${t}</span>`).join("")}</div>
        <div class="meta">Last updated: ${it.last_updated||""}</div>
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
EOF
