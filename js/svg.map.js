/* svg-map.js — Option A (SVG): clickable regions + context/tooltip using your JSON datasets */

(async function(){
  const BRAND = { blue:"#054A91", light:"#DBE4EE", orange:"#F17300" };
  const TL = "/israelite-research/data/timelines";
  const SOURCES = {
    patriarchs:   `${TL}/patriarchs.json`,
    judges:       `${TL}/judges.json`,
    captivities:  `${TL}/captivities.json`,
    scattering:   `${TL}/scattering.json`,
    books:        `${TL}/books.json`
  };

  const $ = sel => document.querySelector(sel);
  const svg = $("#isr-svg");
  const hover = $("#hovercard");
  const ctxTitle = $("#ctx-title");
  const ctxBody  = $("#ctx-body");

  function showHover(html, x, y){
    hover.innerHTML = html;
    hover.style.left = (x+12) + "px";
    hover.style.top  = (y+12) + "px";
    hover.style.display = "block";
  }
  function hideHover(){ hover.style.display = "none"; }

  function setContext(title, html){
    ctxTitle.textContent = title || "Map Context";
    ctxBody.innerHTML = html || "<p class='muted'>—</p>";
  }
  $("#ctx-close")?.addEventListener("click", ()=> setContext("Map Context",
    "<p class='muted'>Click a region to see linked records.</p>"
  ));

  async function jget(url){
    const r = await fetch(`${url}?v=${Date.now()}`, { cache:"no-store" });
    if(!r.ok) throw new Error("Failed: "+url);
    return r.json();
  }

  // Build region index from datasets
  function indexByRegion(datasets){
    const idx = {};
    const add = (rid, payload)=>{
      if(!rid) return;
      (idx[rid] ||= []).push(payload);
    };
    function pump(entry, type){
      (entry.region_ids||[]).forEach(rid=>{
        add(rid, {
          type,
          name: entry.name,
          span: (entry.lifespan!=null) ? `${entry.lifespan} yrs`
               : (entry.duration!=null) ? `${entry.duration} yrs` : "—",
          short: entry.short || "",
          refs: entry.refs || ""
        });
      });
    }
    datasets.patriarchs.forEach(e=>pump(e,"Patriarch"));
    datasets.judges.forEach(e=>pump(e,"Judge"));
    datasets.captivities.forEach(e=>pump(e,"Captivity"));
    datasets.scattering.forEach(e=>pump(e,"Scattering"));
    datasets.books.forEach(e=>pump(e,"Book/Corpus"));
    return idx;
  }

  const listHTML = (items)=>
    (!items?.length)
      ? "<p class='muted'>No linked records yet.</p>"
      : `<ul>${items.map(it=>`
          <li><strong>${it.type}:</strong> ${it.name}
            ${it.span?` <span class="muted">(${it.span})</span>`:""}
            ${it.short?`<div class="muted">${it.short}</div>`:""}
            ${it.refs?`<div class="muted"><em>${it.refs}</em></div>`:""}
          </li>`).join("")}</ul>`;

  // Load datasets
  const [patriarchs, judges, captivities, scattering, books] = await Promise.all([
    jget(SOURCES.patriarchs),
    jget(SOURCES.judges),
    jget(SOURCES.captivities),
    jget(SOURCES.scattering),
    jget(SOURCES.books)
  ]);
  const regionIndex = indexByRegion({patriarchs, judges, captivities, scattering, books});

  // Wire up regions
  const regions = svg.querySelectorAll(".region");
  let selected = null;

  regions.forEach(region=>{
    const rid = region.id;
    const name = rid; // default label = id; you can map IDs → display names if needed
    const linked = regionIndex[rid] || [];

    const hoverHTML = `
      <h5>${name}</h5>
      <div class="muted">Linked records: ${linked.length}</div>
    `;

    region.setAttribute("tabindex","0");
    region.setAttribute("role","button");
    region.setAttribute("aria-label", name);

    region.addEventListener("mouseenter", (e)=> {
      const { clientX:x, clientY:y } = e;
      showHover(hoverHTML, x, y);
    });
    region.addEventListener("mousemove", (e)=> {
      if (hover.style.display === "block"){
        hover.style.left = (e.clientX+12)+"px";
        hover.style.top  = (e.clientY+12)+"px";
      }
    });
    region.addEventListener("mouseleave", hideHover);

    function selectRegion(){
      if (selected) selected.classList.remove("selected");
      selected = region;
      selected.classList.add("selected");
      setContext(name, `
        <div class="subtle">Linked Records</div>
        ${listHTML(linked)}
      `);
    }

    region.addEventListener("click", selectRegion);
    region.addEventListener("keydown", (e)=> {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRegion(); }
    });
  });

  // Initial context
  setContext("Map Context", "<p class='muted'>Click a region to see linked records.</p>");
})();
