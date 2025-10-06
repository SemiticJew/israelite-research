/* map.js — Leaflet demo with clickable GeoJSON regions + data from your timelines JSONs */

(async function(){
  // --- CONFIG ---
  const BRAND = { blue:"#054A91", light:"#DBE4EE", orange:"#F17300" };
  const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"; // OSM tiles
  const REGIONS_GEOJSON = "/israelite-research/data/regions/israelite-regions.geojson";

  // Timeline datasets (already created earlier)
  const TL = "/israelite-research/data/timelines";
  const SOURCES = {
    patriarchs:   `${TL}/patriarchs.json`,
    judges:       `${TL}/judges.json`,
    captivities:  `${TL}/captivities.json`,
    scattering:   `${TL}/scattering.json`,
    books:        `${TL}/books.json`
  };

  // --- UTILITIES ---
  const qs = sel => document.querySelector(sel);
  async function jget(url){
    const r = await fetch(`${url}?v=${Date.now()}`, { cache:"no-store" });
    if(!r.ok) throw new Error("Failed: "+url);
    return r.json();
  }

  // Build an index from your datasets keyed by region id
  function indexByRegion(datasets){
    const idx = {};
    function add(regionId, payload){
      if(!regionId) return;
      if(!idx[regionId]) idx[regionId] = [];
      idx[regionId].push(payload);
    }
    // helper to push each region id
    function pushRegions(entry, type){
      const ridList = entry.region_ids || []; // optional; add later as you curate
      ridList.forEach(rid=>{
        add(rid, {
          type,
          name: entry.name,
          span: (entry.lifespan!=null) ? `${entry.lifespan} yrs` :
                (entry.duration!=null) ? `${entry.duration} yrs` : "—",
          short: entry.short || "",
          refs: entry.refs || ""
        });
      });
    }

    datasets.patriarchs.forEach(e=> pushRegions(e, "Patriarch"));
    datasets.judges.forEach(e=> pushRegions(e, "Judge"));
    datasets.captivities.forEach(e=> pushRegions(e, "Captivity"));
    datasets.scattering.forEach(e=> pushRegions(e, "Scattering"));
    datasets.books.forEach(e=> pushRegions(e, "Book/Corpus"));
    return idx;
  }

  function renderList(items){
    if(!items || !items.length) return "<p class='muted'>No linked records yet.</p>";
    return `
      <ul style="margin:0;padding-left:1rem;line-height:1.35">
        ${items.map(it=>`
          <li>
            <strong>${it.type}:</strong> ${it.name}
            ${it.span ? ` <span style="color:#6b7280">(${it.span})</span>` : ""}
            ${it.short ? `<div style="color:#6b7280">${it.short}</div>` : ""}
            ${it.refs ? `<div style="color:#6b7280"><em>${it.refs}</em></div>` : ""}
          </li>
        `).join("")}
      </ul>
    `;
  }

  // --- LOAD DATA ---
  const [regions, patriarchs, judges, captivities, scattering, books] = await Promise.all([
    jget(REGIONS_GEOJSON),
    jget(SOURCES.patriarchs),
    jget(SOURCES.judges),
    jget(SOURCES.captivities),
    jget(SOURCES.scattering),
    jget(SOURCES.books)
  ]);

  const regionIndex = indexByRegion({patriarchs, judges, captivities, scattering, books});

  // --- INIT LEAFLET MAP ---
  const map = L.map("isr-map", { zoomControl: true, minZoom: 3, maxZoom: 12 });
  L.tileLayer(TILE_URL, {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  // Fit to Eastern Med / Near East quickly
  const initBounds = [[18, -10],[48, 60]]; // [southWest],[northEast] lat/lon
  map.fitBounds(initBounds);

  // --- REGION STYLE + INTERACTION ---
  function styleFeature() {
    return {
      color: BRAND.blue,
      weight: 1.25,
      fillColor: BRAND.light,
      fillOpacity: 0.35
    };
  }
  function highlight(e){
    const l = e.target;
    l.setStyle({ weight: 2, fillOpacity: 0.55, color: BRAND.orange });
    if(!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) l.bringToFront();
  }
  function resetHighlight(e){ geo.resetStyle(e.target); }

  function onEachFeature(feature, layer){
    const id = feature.id || feature.properties?.abbr;
    const linked = regionIndex[id] || [];
    const html = `
      <div style="min-width:240px">
        <h4 style="margin:.25rem 0;color:${BRAND.blue}">${feature.properties.name}</h4>
        ${renderList(linked)}
      </div>`;
    layer.bindPopup(html);
    layer.on({
      mouseover: highlight,
      mouseout: resetHighlight,
      click: (e)=> {
        layer.openPopup(e.latlng);
      }
    });
  }

  const geo = L.geoJSON(regions, {
    style: styleFeature,
    onEachFeature
  }).addTo(map);

  // --- LEGEND / FILTERS (simple toggles for now) ---
  const ctl = L.control({position:"topright"});
  ctl.onAdd = function(){
    const div = L.DomUtil.create('div', 'leaf-legend');
    div.style.background = "#fff";
    div.style.padding = "8px 10px";
    div.style.border = "1px solid #e6ebf2";
    div.style.borderRadius = "10px";
    div.style.boxShadow = "0 6px 18px rgba(0,0,0,.06)";
    div.innerHTML = `
      <div style="font-weight:700;color:${BRAND.blue};margin-bottom:4px">Layers</div>
      <label style="display:block;font-size:.9rem"><input type="checkbox" checked disabled/> Regions</label>
      <div class="muted" style="font-size:.8rem;color:#6b7280;margin-top:4px">Click any region to view linked records.</div>
    `;
    return div;
  };
  ctl.addTo(map);

})();
