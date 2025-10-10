const fs = require('fs');
const path = require('path');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const GEOMDIR = path.join(DATA, 'geometry');

const idxCandidates = [
  path.join(DATA, 'ancient.index.json'),
  path.join(DATA, 'ancient.json')
];

let indexPath = null;
let indexData = null;
for (const p of idxCandidates) {
  if (!exists(p)) continue;
  const j = readJSON(p);
  if (!j) continue;
  if (j.$schema) continue;
  if (Array.isArray(j)) { indexPath = p; indexData = j; break; }
  if (Array.isArray(j.records)) { indexPath = p; indexData = j.records; break; }
}
if (!indexData || !indexData.length) {
  console.error('No valid index found. Provide data/ancient.index.json or data/ancient.json with an array of records.');
  process.exit(1);
}

function firstExisting(paths){
  for (const p of paths) if (exists(p)) return p;
  return null;
}

function normGeom(id, j, srcPath) {
  // Accept GeoJSON Feature, Geometry, FeatureCollection(1), or custom lonlats/points/lonlat
  let g = j;
  if (j && j.type === 'Feature') g = j.geometry || {};
  else if (j && j.type === 'FeatureCollection' && Array.isArray(j.features) && j.features.length) {
    const f = j.features[0];
    g = (f && f.type === 'Feature') ? f.geometry : f || {};
  }
  const coords = g.coordinates ?? j.lonlats ?? j.points ?? j.lonlat ?? j.coords ?? null;
  const t = (g.type || j.type || '').toLowerCase();

  // Decide kind
  let kind = null;
  if (t.includes('polygon')) kind = 'polygon';
  else if (t.includes('line')) kind = 'line';
  else if (t.includes('point')) kind = 'point';
  else if (Array.isArray(coords) && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) kind = 'polygon';
  else if (Array.isArray(coords) && Array.isArray(coords[0]) && !Array.isArray(coords[0][0]) && coords.length >= 2) kind = 'line';
  else if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number') kind = 'point';
  else if (Array.isArray(coords) && Array.isArray(coords[0]) && coords.length === 1 && coords[0].length === 2) kind = 'point';

  if (!kind || !coords) {
    return { ok:false, reason:`Unrecognized geometry for ${id} (${srcPath})` };
  }

  if (kind === 'polygon') {
    const rings = (Array.isArray(coords[0][0])) ? coords : [coords];
    return { ok:true, data:{ id, type:'polygon', coordinates:rings } };
  }
  if (kind === 'line') {
    return { ok:true, data:{ id, type:'line', coordinates:coords } };
  }
  if (kind === 'point') {
    const pt = Array.isArray(coords[0]) ? coords[0] : coords;
    return { ok:true, data:{ id, type:'point', lonlat:pt } };
  }
  return { ok:false, reason:`Unknown kind for ${id} (${srcPath})` };
}

const outRecords = [];
const outGeoms = [];
const misses = [];

for (const rec of indexData) {
  const gid = String(rec.geometry_id || rec.geometryId || rec.geometryID || rec.gid || '').trim();
  if (!gid) { misses.push({id:rec.id||'?', reason:'no geometry_id'}); continue; }

  const base = path.join(GEOMDIR, gid);
  const candidates = [
    base + '.geometry.geojson',
    base + '.simplified.geojson',
    base + '.lonlats.json',
    base + '.simplified_lonlats.json',
    path.join(DATA, gid + '.geojson'),
    path.join(DATA, gid + '.json')
  ];
  const src = firstExisting(candidates);
  if (!src) { misses.push({id:gid, reason:'no geometry file'}); continue; }

  const raw = readJSON(src);
  if (!raw) { misses.push({id:gid, reason:'invalid JSON'}); continue; }

  const n = normGeom(gid, raw, src);
  if (!n.ok) { misses.push({id:gid, reason:n.reason}); continue; }

  outGeoms.push(n.data);
  outRecords.push({
    id: String(rec.id || ''),
    title: rec.title || rec.name || rec.id || gid,
    type: rec.type || '',
    period: rec.period || '',
    geometry_id: gid,
    blurb: rec.blurb || '',
    properties: rec.properties || {}
  });
}

fs.writeFileSync(path.join(DATA, 'geometry.json'), JSON.stringify(outGeoms, null, 2));
fs.writeFileSync(path.join(DATA, 'ancient.json'), JSON.stringify(outRecords, null, 2));

console.log(`Wrote data/geometry.json (${outGeoms.length}) and data/ancient.json (${outRecords.length}).`);
if (misses.length) {
  console.log(`Misses: ${misses.length}`);
  for (const m of misses.slice(0, 20)) console.log('-', m.id, m.reason);
  if (misses.length > 20) console.log('…', misses.length - 20, 'more');
}
