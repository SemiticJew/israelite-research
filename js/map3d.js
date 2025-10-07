// map3d.js — Cesium 3D globe with trails, de-overlap markers, and tribal allotments
(async function () {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlZWU1MTYyOS1iYjZkLTRlMWMtODFhNy1iNzJlZjJlN2VmOWQiLCJpZCI6MzQ4MTI5LCJpYXQiOjE3NTk4NTg3NDB9.P-FQaGFbRTEaGJovFo6Bc9NuzPAFPNJNcNlaSXrqIA0';

  const viewer = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    sceneModePicker: false,
    selectionIndicator: true,
    infoBox: true
  });

  const ssc = viewer.scene.screenSpaceCameraController;
  ssc.enableZoom = true;
  ssc.minimumZoomDistance = 20000;
  ssc.maximumZoomDistance = 20000000;

  viewer.scene.globe.enableLighting = true;
  viewer.scene.skyAtmosphere.hueShift = -0.02;
  viewer.scene.skyAtmosphere.saturationShift = -0.05;
  viewer.scene.skyAtmosphere.brightnessShift = -0.05;

  const base = 'data/timelines';
  const SOURCES = {
    patriarchs:   `${base}/patriarchs.json`,
    judges:       `${base}/judges.json`,
    captivities:  `${base}/captivities.json`,
    scattering:   `${base}/scattering.json`
  };

  const REGION_COORDS = {
    EGYPT: [31.2357, 30.0444],
    SINAI: [33.6176, 28.5394],
    CANAAN: [35.2137, 31.7683],
    ASSYRIA: [43.1300, 36.3450],
    BABYLON: [44.4200, 32.5364],
    ROME: [12.4964, 41.9028],
    HARAN: [39.0333, 36.8667],
    UR: [46.1030, 30.9640]
  };

  async function jget(url) {
    const r = await fetch(url + `?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('Failed: ' + url + ' (' + r.status + ')');
    return r.json();
  }

  function getCoords(entry) {
    if (Array.isArray(entry.coords) && entry.coords.length === 2) return entry.coords;
    const rids = entry.region_ids || [];
    for (const rid of rids) if (REGION_COORDS[rid]) return REGION_COORDS[rid];
    return null;
  }

  function describe(entry, type) {
    const span = (entry.lifespan != null) ? `${entry.lifespan} yrs`
               : (entry.duration != null) ? `${entry.duration} yrs` : '—';
    const header = `<span style="display:inline-block;padding:2px 6px;border-radius:6px;background:#eaf2fb;color:#054A91;font-weight:700;margin-right:6px">${type}</span><strong>${entry.name}</strong>`;
    const short = entry.short ? `<div style="margin-top:.35rem;color:#334155">${entry.short}</div>` : '';
    const refs  = entry.refs ? `<div style="margin-top:.35rem;color:#6b7280"><em>${entry.refs}</em></div>` : '';
    return `${header}${short}<div style="margin-top:.35rem;color:#0b2340"><strong>Span:</strong> ${span}</div>${refs}`;
  }

  let patriarchs = [], judges = [], captivities = [], scattering = [];
  try {
    [patriarchs, judges, captivities, scattering] = await Promise.all([
      jget(SOURCES.patriarchs),
      jget(SOURCES.judges),
      jget(SOURCES.captivities),
      jget(SOURCES.scattering)
    ]);
    console.log('[3D] datasets', {
      patriarchs: patriarchs.length,
      judges: judges.length,
      captivities: captivities.length,
      scattering: scattering.length
    });
  } catch (e) {
    console.error('[3D] dataset load error:', e);
  }

  const layers = {
    patriarchs: new Cesium.CustomDataSource('Patriarchs'),
    judges: new Cesium.CustomDataSource('Judges'),
    captivities: new Cesium.CustomDataSource('Captivities'),
    scattering: new Cesium.CustomDataSource('Scattering')
  };
  Object.values(layers).forEach(ds => viewer.dataSources.add(ds));

  const styles = {
    patriarchs: { color: Cesium.Color.fromCssColorString('#054A91') },
    judges: { color: Cesium.Color.fromCssColorString('#3E7CB1') },
    captivities: { color: Cesium.Color.fromCssColorString('#F17300') },
    scattering: { color: Cesium.Color.fromCssColorString('#7C3AED') }
  };

  function toDegs(pts){ const out=[]; for(const p of pts){ out.push(p[0], p[1]); } return out; }

  function addTrail(entry, color, ds) {
    if (!Array.isArray(entry.trail) || entry.trail.length < 2) return;
    ds.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(toDegs(entry.trail)),
        clampToGround: true,
        width: 3,
        material: color.withAlpha(0.9)
      }
    });
    for (const stop of entry.trail) {
      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(stop[0], stop[1]),
        point: {
          color: color.withAlpha(0.95),
          pixelSize: 6,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    }
  }

  function circleDataUrl(hex = '#054A91', r = 6) {
    const s = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${r*2}" height="${r*2}">
         <circle cx="${r}" cy="${r}" r="${r-1}" fill="${hex}" stroke="white" stroke-width="1"/>
       </svg>`
    );
    return `data:image/svg+xml;charset=utf-8,${s}`;
  }

  function offsetsFor(n, radius = 14) {
    if (n === 1) return [new Cesium.Cartesian2(0,0)];
    const arr = [];
    for (let i=0;i<n;i++){
      const angle = (i / n) * Math.PI * 2;
      arr.push(new Cesium.Cartesian2(Math.cos(angle)*radius, Math.sin(angle)*radius));
    }
    return arr;
  }

  function addEntities(arr, type, ds) {
    const color = styles[type].color;
    const groups = new Map();
    const items = [];

    for (const entry of arr) {
      const pos = getCoords(entry);
      items.push({ entry, pos });
      if (!pos) continue;
      const key = `${pos[0].toFixed(4)},${pos[1].toFixed(4)}`;
      const bucket = groups.get(key) || [];
      bucket.push(entry);
      groups.set(key, bucket);
    }

    const groupOffsets = new Map();
    for (const [key, bucket] of groups.entries()) groupOffsets.set(key, offsetsFor(bucket.length, 14));
    const groupIndex = new Map();

    for (const {entry, pos} of items) {
      if (pos) {
        const key = `${pos[0].toFixed(4)},${pos[1].toFixed(4)}`;
        const offsArr = groupOffsets.get(key) || [new Cesium.Cartesian2(0,0)];
        const used = groupIndex.get(key) || 0;
        const pxOffset = offsArr[Math.min(used, offsArr.length-1)];
        groupIndex.set(key, used + 1);

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(pos[0], pos[1]),
          billboard: {
            image: circleDataUrl(color.toCssColorString(), 6),
            color: Cesium.Color.WHITE.withAlpha(1.0),
            scale: 1,
            pixelOffset: pxOffset,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: entry.name,
            font: '14px "Helvetica", "Arial", sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#0b2340'),
            style: Cesium.LabelStyle.FILL,
            showBackground: true,
            backgroundColor: Cesium.Color.fromBytes(255,255,255,220),
            pixelOffset: new Cesium.Cartesian2(pxOffset.x, pxOffset.y - 18),
            scaleByDistance: new Cesium.NearFarScalar(1.0e2, 1.1, 1.0e7, 0.2)
          },
          description: describe(entry, ds.name)
        });
      } else {
        console.warn('[3D] missing coords for', type, '→', entry.name);
      }
      addTrail(entry, color, ds);
    }
  }

  addEntities(patriarchs, 'patriarchs', layers.patriarchs);
  addEntities(judges, 'judges', layers.judges);
  addEntities(captivities, 'captivities', layers.captivities);
  addEntities(scattering, 'scattering', layers.scattering);

  // Tribal allotments
  const TRIBAL_GEOJSON = 'data/maps/tribal-allotments.geojson';
  let tribalDS;
  try {
    tribalDS = await Cesium.GeoJsonDataSource.load(TRIBAL_GEOJSON, { clampToGround: true });
    const ents = tribalDS.entities.values;
    for (const e of ents) {
      const props = e.properties && e.properties.getValue ? e.properties.getValue() : (e.properties || {});
      const style = props.style || (props.getValue ? props.getValue().style : null);

      if (e.polygon) {
        const fill = style && style.fill ? style.fill : '#ffff00';
        const stroke = style && style.stroke ? style.stroke : '#000000';
        e.polygon.material = Cesium.Color.fromCssColorString(fill).withAlpha(0.45);
        e.polygon.outline = true;
        e.polygon.outlineColor = Cesium.Color.fromCssColorString(stroke);
        e.polygon.outlineWidth = 1;
      }
      if (e.point) {
        const fill = style && style.fill ? style.fill : '#333333';
        e.point.color = Cesium.Color.fromCssColorString(fill).withAlpha(0.9);
        e.point.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
        if (!e.point.pixelSize) e.point.pixelSize = 8;
      }

      const tribeName = props.tribe || (props.getValue ? props.getValue().tribe : null);
      const lp = props.label_point || (props.getValue ? props.getValue().label_point : null);
      if (!e.label && Array.isArray(lp) && lp.length === 2) {
        tribalDS.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lp[0], lp[1]),
          label: {
            text: tribeName || 'Tribe',
            font: '14px Helvetica, Arial, sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#0b2340'),
            showBackground: true,
            backgroundColor: Cesium.Color.fromBytes(255,255,255,220),
            pixelOffset: new Cesium.Cartesian2(0, -10),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            scaleByDistance: new Cesium.NearFarScalar(1.0e2, 1.1, 1.0e7, 0.2)
          }
        });
      }
    }
    viewer.dataSources.add(tribalDS);
  } catch(e) {
    console.error('[3D] tribal allotments load error:', e);
  }

  document.getElementById('layer-tribes')?.addEventListener('change', e => {
    if (tribalDS) tribalDS.show = e.target.checked;
  });

  document.getElementById('layer-patriarchs')?.addEventListener('change', e => { layers.patriarchs.show = !!e.target.checked; });
  document.getElementById('layer-judges')?.addEventListener('change', e => { layers.judges.show = !!e.target.checked; });
  document.getElementById('layer-captivities')?.addEventListener('change', e => { layers.captivities.show = !!e.target.checked; });
  document.getElementById('layer-scattering')?.addEventListener('change', e => { layers.scattering.show = !!e.target.checked; });

  document.getElementById('btn-near-east')?.addEventListener('click', () => {
    const rect = Cesium.Rectangle.fromDegrees(20, 20, 60, 42);
    viewer.camera.flyTo({ destination: rect, duration: 1.2 });
  });
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    viewer.camera.flyHome(1.2);
  });

  viewer.camera.setView({ destination: Cesium.Rectangle.fromDegrees(10, 10, 70, 50) });
})();
