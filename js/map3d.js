// js/map3d.js — Cesium 3D globe for Extra-Biblical Sources (patriarch trails clamped to ground)
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

  // Make ground clamping look good
  viewer.scene.globe.enableLighting = true;
  viewer.scene.skyAtmosphere.hueShift = -0.02;
  viewer.scene.skyAtmosphere.saturationShift = -0.05;
  viewer.scene.skyAtmosphere.brightnessShift = -0.05;

  const base = '/israelite-research/data/timelines';
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
    if (!r.ok) throw new Error('Failed to load ' + url);
    return r.json();
  }

  function getCoords(entry) {
    if (Array.isArray(entry.coords) && entry.coords.length === 2) return entry.coords;
    const rids = entry.region_ids || [];
    for (const rid of rids) {
      if (REGION_COORDS[rid]) return REGION_COORDS[rid];
    }
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

  const [patriarchs, judges, captivities, scattering] = await Promise.all([
    jget(SOURCES.patriarchs),
    jget(SOURCES.judges),
    jget(SOURCES.captivities),
    jget(SOURCES.scattering)
  ]);

  const layers = {
    patriarchs: new Cesium.CustomDataSource('Patriarchs'),
    judges: new Cesium.CustomDataSource('Judges'),
    captivities: new Cesium.CustomDataSource('Captivities'),
    scattering: new Cesium.CustomDataSource('Scattering')
  };
  Object.values(layers).forEach(ds => viewer.dataSources.add(ds));

  const styles = {
    patriarchs: { color: Cesium.Color.fromCssColorString('#054A91'), pixelSize: 10 },
    judges: { color: Cesium.Color.fromCssColorString('#3E7CB1'), pixelSize: 9 },
    captivities: { color: Cesium.Color.fromCssColorString('#F17300'), pixelSize: 11 },
    scattering: { color: Cesium.Color.fromCssColorString('#7C3AED'), pixelSize: 9 }
  };

  function toDegs(pts){ const out=[]; for(const p of pts){ out.push(p[0], p[1]); } return out; }

  function addTrail(entry, color, ds) {
    if (!Array.isArray(entry.trail) || entry.trail.length < 2) return;

    // Polyline clamped to ground so it's always visible on terrain
    ds.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(toDegs(entry.trail)),
        clampToGround: true,
        width: 3,
        material: color.withAlpha(0.9)
      }
    });

    // Stops as small dots clamped to ground
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

  function addEntities(arr, type, ds) {
    const s = styles[type];
    for (const entry of arr) {
      const pos = getCoords(entry);
      if (pos) {
        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(pos[0], pos[1]),
          point: {
            color: s.color.withAlpha(0.95),
            pixelSize: s.pixelSize,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1.25,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: entry.name,
            font: '14px "Helvetica", "Arial", sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#0b2340'),
            style: Cesium.LabelStyle.FILL,
            showBackground: true,
            backgroundColor: Cesium.Color.fromBytes(255,255,255,220),
            pixelOffset: new Cesium.Cartesian2(0, -18),
            scaleByDistance: new Cesium.NearFarScalar(1.0e2, 1.1, 1.0e7, 0.2)
          },
          description: describe(entry, ds.name)
        });
      }

      // Draw trail if present
      addTrail(entry, s.color, ds);
    }
  }

  addEntities(patriarchs, 'patriarchs', layers.patriarchs);
  addEntities(judges, 'judges', layers.judges);
  addEntities(captivities, 'captivities', layers.captivities);
  addEntities(scattering, 'scattering', layers.scattering);

  function setLayerVisible(key, visible) {
    const ds = layers[key];
    if (ds) ds.show = !!visible;
  }
  document.getElementById('layer-patriarchs')?.addEventListener('change', e => setLayerVisible('patriarchs', e.target.checked));
  document.getElementById('layer-judges')?.addEventListener('change', e => setLayerVisible('judges', e.target.checked));
  document.getElementById('layer-captivities')?.addEventListener('change', e => setLayerVisible('captivities', e.target.checked));
  document.getElementById('layer-scattering')?.addEventListener('change', e => setLayerVisible('scattering', e.target.checked));

  document.getElementById('btn-near-east')?.addEventListener('click', () => {
    const rect = Cesium.Rectangle.fromDegrees(20, 20, 60, 42);
    viewer.camera.flyTo({ destination: rect, duration: 1.2 });
  });
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    viewer.camera.flyHome(1.2);
  });

  viewer.camera.setView({ destination: Cesium.Rectangle.fromDegrees(10, 10, 70, 50) });
})();
