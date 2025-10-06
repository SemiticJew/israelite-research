/* map.js — Leaflet map with clickable GeoJSON regions + timeline dataset linkage
   Now using CARTO Positron (English labels, global coverage)
*/

(async function(){
  // --- CONFIG ---
  const BRAND = { blue:"#054A91", light:"#DBE4EE", orange:"#F17300" };
  const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"; // English world map
  const REGIONS_GEOJSON = "/israelite-research/data/regions/israelite-regions.geojson";

  // Timeline datasets
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

  // Build an index keyed by region id for quick lookup
  function indexByRegion(datasets){
    const idx = {};
    function add(regionId, payload){
      if(!regionId) return;
      if(!idx[regionId]) idx[regionId] = [];
      idx[regionId].push(payload);
    }
    function pushRegions(entry, type){
      const ridList = entry.region_ids || [];
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
  const map = L.map("isr-map", { zoomControl: true, minZoom: 2, maxZoom: 12 });

  // CARTO Positron (English labels)
  L.tileLayer(TILE_URL, {
    attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    detectRetina: true
  }).addTo(map);

  // Fit view roughly around the Old World (adjust later if needed)
  const initBounds = [[-40, -25],[65, 85]]; // global-ish
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

    // --- LEGEND / INFO BOX ---
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
      <div class="muted" style="font-size:.8rem;color:#6b7280;margin-top:4px">
        Click any region to view linked records.
      </div>
    `;
    return div;
  };
  ctl.addTo(map);

  /* ⬇️ ERA PRESET WIRING BELOW (insert here, before the closing })(); ) */
  // ===============================
  const ERA_JSON = "/israelite-research/data/eras/eras.json";
  let maskLayer, regionsLayer, labelsLayer;

  async function loadEraById(eraId){
    const eras = await (await fetch(ERA_JSON)).json();
    const era = eras.find(e => e.id === eraId);
    if(!era) return console.warn("Era not found:", eraId);
    if(maskLayer) map.removeLayer(maskLayer);
    if(regionsLayer) map.removeLayer(regionsLayer);
    if(labelsLayer) map.removeLayer(labelsLayer);

    map.fitBounds(era.bounds);

    // 1. Mask (darken world outside area)
    maskLayer = L.geoJSON({
      "type":"Feature",
      "geometry":{"type":"Polygon","coordinates":era.mask}
    }, {
      style:{color:"#000",weight:0,fillColor:"#000",fillOpacity:0.75}
    }).addTo(map);

    // 2. Ancient regions overlay
    const regions = await (await fetch(era.regions_geojson)).json();
    regionsLayer = L.geoJSON(regions, {
      style:{color:"#054A91",weight:1.2,fillColor:"#DBE4EE",fillOpacity:0.4}
    }).addTo(map);

    // 3. Optional custom labels
    if(era.labels_geojson){
      const labels = await (await fetch(era.labels_geojson)).json();
      labelsLayer = L.geoJSON(labels, {
        pointToLayer:(f,latlng)=>L.marker(latlng,{opacity:0})
          .bindTooltip(f.properties.name,{permanent:true,direction:'center',className:'era-label'})
      }).addTo(map);
    }
  }

  // Example: add simple dropdown (top-left)
  const eraCtl = L.control({position:"topleft"});
  eraCtl.onAdd = function(){
    const div = L.DomUtil.create('div','leaf-era');
    div.innerHTML = `
      <select id="era-select" style="font:inherit;padding:.25rem .4rem;border:1px solid #e6ebf2;border-radius:8px;">
        <option value="">Select Era</option>
        <option value="egyptian_period">Egyptian Period</option>
        <option value="babylonian_period">Babylonian Period</option>
        <option value="roman_period">Roman Period</option>
      </select>
    `;
    return div;
  };
  eraCtl.addTo(map);

  document.addEventListener('change', e=>{
    if(e.target.id==='era-select' && e.target.value){
      loadEraById(e.target.value);
    }
  });
  // ===============================
})();
