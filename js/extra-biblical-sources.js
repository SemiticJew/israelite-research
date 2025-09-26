// Robust header inference edition — adapts to many column name variants.
// Path: /israelite-research/js/extra-biblical-sources.js

const DATA = {
  chron: "/israelite-research/data/extra-biblical/Ussher-AnnalsOfTheWorld.csv",
  persons: "/israelite-research/data/extra-biblical/BibleData-Person.csv",
  events: "/israelite-research/data/extra-biblical/BibleData-Event.csv",
  epochs: "/israelite-research/data/extra-biblical/BibleData-Epoch.csv",
};

const GH_RAW = {
  chron: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/Ussher-AnnalsOfTheWorld.csv",
  persons: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/BibleData-Person.csv",
  events: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/BibleData-Event.csv",
  epochs: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/BibleData-Epoch.csv",
};

// ---------- small utils ----------
const toLower = (s) => (s ?? "").toString().toLowerCase();
const excerpt = (s, n = 220) => {
  const txt = (s ?? "").toString().trim();
  return txt.length > n ? txt.slice(0, n) + "…" : txt;
};
const debounce = (fn, ms = 150) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

function setCount(el, n) { el.textContent = `${n.toLocaleString()} result${n===1?"":"s"}`; }

function makeCard({ title, meta, teaser, cite }) {
  const div = document.createElement("div"); div.className = "card";
  const h = document.createElement("h3"); h.textContent = title || "—"; div.appendChild(h);
  if (meta)   { const m = document.createElement("div"); m.className="meta";   m.textContent = meta;   div.appendChild(m); }
  if (teaser) { const p = document.createElement("p");   p.className="teaser"; p.textContent = teaser; div.appendChild(p); }
  if (cite)   { const c = document.createElement("div"); c.className="cite";   c.textContent = cite;   div.appendChild(c); }
  return div;
}

function errorCallout(where, msg) {
  const div = document.createElement("div"); div.className="card";
  const h=document.createElement("h3"); h.textContent="Load error";
  const p=document.createElement("p");  p.textContent=msg;
  div.append(h,p); where.innerHTML=""; where.appendChild(div);
}

// ---------- CSV load + parse ----------
async function fetchCSV(urlLocal, urlCDN) {
  try {
    const r = await fetch(urlLocal, { cache: "default" });
    if (!r.ok) throw new Error(`Local fetch failed (${r.status})`);
    return await r.text();
  } catch {
    const r2 = await fetch(urlCDN, { cache: "default" });
    if (!r2.ok) throw new Error(`CDN fetch failed (${r2.status})`);
    return await r2.text();
  }
}

// Quote-aware CSV parser
function parseCSV(text) {
  const out = [];
  if (!text) return out;
  const norm = text.replace(/\r\n/g, "\n");
  const lines = norm.split("\n");
  if (!lines.length) return out;

  const split = (line) => {
    const a=[]; let f="", q=false;
    for (let i=0;i<line.length;i++){
      const ch=line[i];
      if (ch === '"'){ if(q && line[i+1]==='"'){ f+='"'; i++; } else q=!q; }
      else if (ch === "," && !q){ a.push(f); f=""; }
      else f+=ch;
    }
    a.push(f); return a;
  };

  const headers = split(lines[0]).map(h=>h.trim());
  const Hlower = headers.map(h=>h.toLowerCase());
  const rows = [];

  let row=[], field="", q=false;
  const pushField = ()=>{ row.push(field); field=""; };
  const pushRow   = ()=>{ if(row.length){ const o={}; headers.forEach((h,i)=>o[h]=row[i]??""); rows.push(o); } row=[]; };

  for (let li=1; li<lines.length; li++){
    const line = lines[li];
    for (let i=0;i<line.length;i++){
      const ch=line[i];
      if (ch === '"'){ if(q && line[i+1]==='"'){ field+='"'; i++; } else q=!q; }
      else if (ch === "," && !q){ pushField(); }
      else field+=ch;
    }
    if (q) field+="\n"; else { pushField(); pushRow(); }
  }
  if (field || row.length){ pushField(); pushRow(); }

  // attach header helpers
  rows.headers = headers;
  rows.headersLower = Hlower;
  return rows;
}

// ---------- header inference: pick best column by synonyms/substrings ----------
function chooseColumn(headersLower, candidates) {
  // exact or substring match against lowercased headers
  const list = Array.isArray(candidates) ? candidates : [candidates];
  // exact first
  for (const c of list){
    const idx = headersLower.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  // substring pass
  for (const c of list){
    for (let i=0;i<headersLower.length;i++){
      if (headersLower[i].includes(c.toLowerCase())) return i;
    }
  }
  return -1;
}
function getterFor(rows, prefList) {
  const idx = chooseColumn(rows.headersLower, prefList);
  if (idx === -1) return () => "";
  const key = rows.headers[idx];
  return (r) => r[key] ?? "";
}

// ---------- tabs ----------
(function initTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = new Map(tabs.map(btn => [btn.id, document.getElementById(btn.getAttribute("aria-controls"))]));
  tabs.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      tabs.forEach(b=>b.setAttribute("aria-selected", String(b===btn)));
      panels.forEach(p=>p.setAttribute("aria-hidden","true"));
      const panel = panels.get(btn.id); if (panel) panel.setAttribute("aria-hidden","false");
      btn.focus();
    });
  });
})();

// ---------- Chronologies (Ussher) ----------
(async function initChron() {
  const list = document.getElementById("chron-list");
  const count = document.getElementById("chron-count");
  const q = document.getElementById("chron-q");
  const eraSel = document.getElementById("chron-era");

  try {
    const text = await fetchCSV(DATA.chron, GH_RAW.chron);
    const rows = parseCSV(text);

    // flexible getters
    const gEvent = getterFor(rows, ["event","narrative","text","description"]);
    const gYear  = getterFor(rows, ["gc_year","year","gregorian","date"]);
    const gEra   = getterFor(rows, ["gc_bc_ad","era"]);
    const gAM    = getterFor(rows, ["am_year","am"]);
    const gPara  = getterFor(rows, ["paragraph_nr","paragraph","para","§"]);

    const render = () => {
      const k = toLower(q.value);
      const era = eraSel.value; // all | BC | AD
      const filtered = rows.filter(r=>{
        const eraOk = era === "all" ? true : (toLower(gEra(r)) === toLower(era));
        const hay = `${gEvent(r)} ${gYear(r)} ${gAM(r)} ${gPara(r)}`.toLowerCase();
        return eraOk && (!k || hay.includes(k));
      });

      list.innerHTML = "";
      setCount(count, filtered.length);
      filtered.slice(0,300).forEach(r=>{
        const title = `${gEra(r)} ${gYear(r)} — AM ${gAM(r)}`.trim();
        const teaser = excerpt(gEvent(r), 220);
        const cite = `Ussher, Annals (AM ${gAM(r) || "?"}, §${gPara(r) || "?"}).`;
        list.appendChild(makeCard({ title: title || "—", meta: null, teaser, cite }));
      });
    };

    q.addEventListener("input", debounce(render, 120));
    eraSel.addEventListener("change", render);
    render();
  } catch (err) {
    errorCallout(list, `Chronology data could not be loaded. ${err.message || err}`);
    count.textContent = "0 results";
  }
})();

// ---------- Persons ----------
(async function initPersons() {
  const list = document.getElementById("person-list");
  const count = document.getElementById("person-count");
  const q = document.getElementById("person-q");
  const roleSel = document.getElementById("person-role");
  const epochSel = document.getElementById("person-epoch");

  try {
    const text = await fetchCSV(DATA.persons, GH_RAW.persons);
    const rows = parseCSV(text);

    const gName   = getterFor(rows, ["name","person","fullname","label"]);
    const gRole   = getterFor(rows, ["role","occupation","office","title","function"]);
    const gEpoch  = getterFor(rows, ["epoch","era","period","age"]);
    const gRefs   = getterFor(rows, ["refs","references","citations","sources","bibliography"]);
    const gSum    = getterFor(rows, ["summary","notes","description","abstract"]);

    // populate filters if present
    const roles = new Set(), epochs = new Set();
    rows.forEach(r=>{ const R=gRole(r); if(R) roles.add(R); const E=gEpoch(r); if(E) epochs.add(E); });
    Array.from(roles).sort().forEach(v=>{ const o=document.createElement("option"); o.value=o.textContent=v; roleSel.appendChild(o); });
    Array.from(epochs).sort().forEach(v=>{ const o=document.createElement("option"); o.value=o.textContent=v; epochSel.appendChild(o); });

    const render = () => {
      const k = toLower(q.value);
      const role = roleSel.value;
      const epoch = epochSel.value;

      const filtered = rows.filter(r=>{
        const hay = `${gName(r)} ${gRole(r)} ${gRefs(r)} ${gSum(r)}`.toLowerCase();
        const okK = !k || hay.includes(k);
        const okR = role === "all" || gRole(r) === role;
        const okE = epoch === "all" || gEpoch(r) === epoch;
        return okK && okR && okE;
      });

      list.innerHTML = "";
      setCount(count, filtered.length);
      filtered.slice(0,300).forEach(r=>{
        const title  = gName(r) || "Unnamed";
        const meta   = [gRole(r), gEpoch(r)].filter(Boolean).join(" • ");
        const teaser = excerpt(gSum(r), 220);
        const cite   = gRefs(r) ? `Refs: ${gRefs(r)}` : "";
        list.appendChild(makeCard({ title, meta, teaser, cite }));
      });
    };

    q.addEventListener("input", debounce(render, 120));
    roleSel.addEventListener("change", render);
    epochSel.addEventListener("change", render);
    render();
  } catch (err) {
    errorCallout(list, `Person index could not be loaded. ${err.message || err}`);
    count.textContent = "0 results";
  }
})();

// ---------- Events ----------
(async function initEvents() {
  const list = document.getElementById("event-list");
  const count = document.getElementById("event-count");
  const q = document.getElementById("event-q");
  const typeSel = document.getElementById("event-type");
  const eraSel = document.getElementById("event-era");

  try {
    const text = await fetchCSV(DATA.events, GH_RAW.events);
    const rows = parseCSV(text);

    const gTitle = getterFor(rows, ["title","event","name","label","heading"]);
    const gType  = getterFor(rows, ["type","category","class"]);
    const gDate  = getterFor(rows, ["date","year","gc_year","when"]);
    const gEra   = getterFor(rows, ["era","gc_bc_ad"]);
    const gLoc   = getterFor(rows, ["location","place","region","site"]);
    const gRefs  = getterFor(rows, ["refs","references","citations","sources"]);
    const gSum   = getterFor(rows, ["summary","notes","description","abstract"]);

    const types = new Set(); rows.forEach(r=>{ const t=gType(r); if(t) types.add(t); });
    Array.from(types).sort().forEach(t=>{ const o=document.createElement("option"); o.value=o.textContent=t; typeSel.appendChild(o); });

    const render = () => {
      const k = toLower(q.value);
      const typ = typeSel.value;
      const era = eraSel.value; // all | BC | AD

      const filtered = rows.filter(r=>{
        const hay = `${gTitle(r)} ${gSum(r)} ${gRefs(r)} ${gLoc(r)}`.toLowerCase();
        const okK = !k || hay.includes(k);
        const okT = typ === "all" || gType(r) === typ;
        const okE = era === "all" || toLower(gEra(r)) === toLower(era);
        return okK && okT && okE;
      });

      list.innerHTML = "";
      setCount(count, filtered.length);
      filtered.slice(0,300).forEach(r=>{
        const title  = gTitle(r) || "Untitled event";
        const meta   = [gDate(r), gLoc(r), gType(r)].filter(Boolean).join(" • ");
        const teaser = excerpt(gSum(r), 220);
        const cite   = gRefs(r) ? `Refs: ${gRefs(r)}` : "";
        list.appendChild(makeCard({ title, meta, teaser, cite }));
      });
    };

    q.addEventListener("input", debounce(render, 120));
    typeSel.addEventListener("change", render);
    eraSel.addEventListener("change", render);
    render();
  } catch (err) {
    errorCallout(list, `Events could not be loaded. ${err.message || err}`);
    count.textContent = "0 results";
  }
})();

// ---------- Epochs ----------
(async function initEpochs() {
  const list = document.getElementById("epoch-list");
  const count = document.getElementById("epoch-count");
  const q = document.getElementById("epoch-q");

  try {
    const text = await fetchCSV(DATA.epochs, GH_RAW.epochs);
    const rows = parseCSV(text);

    const gName = getterFor(rows, ["epoch","era","period","age","name","label","heading"]);
    const gSpan = getterFor(rows, ["range","datespan","years","span"]);
    const gSum  = getterFor(rows, ["summary","notes","description","abstract"]);
    const gRefs = getterFor(rows, ["refs","references","citations","sources"]);

    const render = () => {
      const k = toLower(q.value);
      const filtered = rows.filter(r=>{
        const hay = `${gName(r)} ${gSpan(r)} ${gSum(r)}`.toLowerCase();
        return !k || hay.includes(k);
      });

      list.innerHTML = "";
      setCount(count, filtered.length);
      filtered.slice(0,300).forEach(r=>{
        const title  = gName(r) || "Epoch";
        const meta   = gSpan(r) || "";
        const teaser = excerpt(gSum(r), 220);
        const cite   = gRefs(r) ? `Refs: ${gRefs(r)}` : "";
        list.appendChild(makeCard({ title, meta, teaser, cite }));
      });
    };

    q.addEventListener("input", debounce(render, 120));
    render();
  } catch (err) {
    errorCallout(list, `Epochs could not be loaded. ${err.message || err}`);
    count.textContent = "0 results";
  }
})();
