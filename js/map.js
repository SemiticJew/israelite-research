/* map.js — Leaflet map with clickable regions, English tiles, and a dynamic context panel */
(async function(){
  // --- CONFIG ---
  const BRAND = { blue:"#054A91", light:"#DBE4EE", orange:"#F17300" };
  const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
  const REGIONS_GEOJSON = "/israelite-research/data/regions/israelite-regions.geojson";
  const ERA_JSON = "/israelite-research/data/eras/eras.json";

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
  const $ = sel => document.querySelector(sel);
  async function jget(url){
    const r = await fetch(`${url}?v=${Date.now()}`, { cache:"no-store" });
    if(!r.ok) throw new Error("Failed: "+url);
    return r.json();
  }

  // Context panel helpers
  function setContext(title, html){
    $("#ctx-title").textContent = title || "Map Context";
    $("#ctx-body").innerHTML = html || "<p class='muted'>—</p>";
  }
  $("#ctx-close")?.addEventListener("click", ()=> setContext("Map Context",
    "<p class='muted'>Select an era or click a region to see details.</p>"
  ));

  // Index datasets by region id for popups/panel
  function indexByRegion(datasets){
    const idx = {};
    const add = (rid, payload)=>{
      if(!rid) return;
      (idx[rid] ||= []).push(payload);
    };
    const pump = (entry, type)=>{
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
    };
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

  // --- LOAD DATA ---
  const [regions, patriarchs, judges, captivities, scattering, books, eras] = await Promise.all([
    jget(REGIONS_GEOJSON),
    jget(SOURCES.patriarchs),
    jget(SOURCES.judges),
    jget(SOURCES.captivities),
    jget(SOURCES.scattering),
    jget(SOURCES.books),
    jget(ERA_JSON).catch(()=>[]) // eras are optional at first
  ]);

  const regionIndex = indexByRegion({patriarchs, judges, captivities, scattering, books});

  // --- INIT MAP ---
  const map = L.map("isr-map", { zoomControl: true, minZoom: 2, maxZoom: 12 });
  const baseTiles = L.tileLayer(TILE_URL, {
    attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
    subdomains: 'abcd', maxZoom: 20, detectRetina: true
  }).addTo(map);
  map.fitBounds([[-40,-25],[65,85]]);

  // --- Regions overlay with interaction
  function styleFeature(){ return { color:BRAND.blue, weight:1.25, fillColor:BRAND.light, fillOpacity:.35 }; }
  function highlight(e){ e.target.setStyle({weight:2, fillOpacity:.55, color:BRAND.orange}); }
  function resetHighlight(e){ geo.resetStyle(e.target); }

  function onEachFeature(feature, layer){
    const id = feature.id || feature.properties?.abbr;
    const linked = regionIndex[id] || [];
    const popupHTML = `<div style="min-width:240px">
      <h4 style="margin:.25rem 0;color:${BRAND.blue}">${feature.properties.name}</h4>
      ${listHTML(linked)}
    </div>`;
    layer.bindPopup(popupHTML);
    layer.on({
      mouseover: highlight,
      mouseout: resetHighlight,
      click: (e)=>{
        layer.openPopup(e.latlng);
        setContext(feature.properties.name, `
          <div class="subtle">Linked Records</div>
          ${listHTML(linked)}
        `);
      }
    });
  }
  const geo = L.geoJSON(regions, { style:styleFeature, onEachFeature }).addTo(map);

  // --- Era presets (optional but recommended)
  let maskLayer, eraRegionsLayer, labelsLayer;
  async function loadEra(era){
    // clear prior
    [maskLayer, eraRegionsLayer, labelsLayer].forEach(l => l && map.removeLayer(l));

    // fit era view
    if (era.bounds) map.fitBounds(era.bounds);

    // mask outside area
    if (era.mask){
      maskLayer = L.geoJSON(
        { "type":"Feature", "geometry":{ "type":"Polygon", "coordinates": era.mask } },
        { style:{ color:"#000", weight:0, fillColor:"#000", fillOpacity:.78 } }
      ).addTo(map);
    }

    // ancient regions overlay
    if (era.regions_geojson){
      const r = await jget(era.regions_geojson);
      eraRegionsLayer = L.geoJSON(r, { style:{ color:"#054A91", weight:1.2, fillColor:"#DBE4EE", fillOpacity:.4 } }).addTo(map);
    }

    // optional fixed labels for the era
    if (era.labels_geojson){
      const lbls = await jget(era.labels_geojson);
      labelsLayer = L.geoJSON(lbls, {
        pointToLayer:(f,latlng)=> L.marker(latlng,{opacity:0})
          .bindTooltip(f.properties.name, { permanent:true, direction:'center', className:'era-label' })
      }).addTo(map);
    }

    // update context panel with era overview
    const overview = `
      ${era.dates ? `<div class="subtle">Dates</div><p>${era.dates}</p>` : ""}
      ${era.overview ? `<div class="subtle">Overview</div><p>${era.overview}</p>` : ""}
      ${Array.isArray(era.highlights) && era.highlights.length
        ? `<div class="subtle">Highlights</div><ul>${era.highlights.map(h=>`<li>${h}</li>`).join("")}</ul>` : ""}
      ${Array.isArray(era.scripture) && era.scripture.length
        ? `<div class="subtle">Key Scripture</div><ul>${era.scripture.map(s=>`<li><em>${s}</em></li>`).join("")}</ul>` : ""}
    `;
    setContext(era.name || "Era", overview || "<p class='muted'>No summary available.</p>");
  }

  // Era select control (only if eras.json present)
  if (eras && eras.length){
    const eraCtl = L.control({position:"topleft"});
    eraCtl.onAdd = function(){
      const div = L.DomUtil.create('div','leaf-era');
      div.style.background = "#fff";
      div.style.padding = "6px 8px";
      div.style.border = "1px solid #e6ebf2";
      div.style.borderRadius = "8px";
      div.style.boxShadow = "0 6px 18px rgba(0,0,0,.06)";
      div.innerHTML = `
        <label style="font-size:.85rem;color:#334155;margin-right:6px">Era:</label>
        <select id="era-select" style="font:inherit;padding:.25rem .4rem;border:1px solid #e6ebf2;border-radius:8px;">
          <option value="">— Select —</option>
          ${eras.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}
        </select>
      `;
      return div;
    };
    eraCtl.addTo(map);

    document.addEventListener('change', async (e)=>{
      if (e.target.id === 'era-select'){
        const era = eras.find(x => x.id === e.target.value);
        if (era) await loadEra(era);
        else setContext("Map Context", "<p class='muted'>Select an era or click a region to see details.</p>");
      }
    });
  }

  // Legend (kept)
  const ctl = L.control({position:"topright"});
  ctl.onAdd = function(){
    const div = L.DomUtil.create('div','leaf-legend');
    div.style.background="#fff"; div.style.padding="8px 10px";
    div.style.border="1px solid #e6ebf2"; div.style.borderRadius="10px";
    div.style.boxShadow="0 6px 18px rgba(0,0,0,.06)";
    div.innerHTML = `
      <div style="font-weight:700;color:${BRAND.blue};margin-bottom:4px">Layers</div>
      <label style="display:block;font-size:.9rem"><input type="checkbox" checked disabled/> Regions</label>
      <div class="muted" style="font-size:.8rem;margin-top:4px">Click a region or choose an era.</div>
    `;
    return div;
  };
  ctl.addTo(map);
})();
