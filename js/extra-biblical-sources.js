// /israelite-research/js/extra-biblical-sources.js
// Scholarly module for Extra-Biblical Sources page

const DATA = {
  chron: "/israelite-research/data/extra-biblical/Ussher-AnnalsOfTheWorld.csv",
  persons: "/israelite-research/data/extra-biblical/BibleData-Person.csv",
  personLabels: "/israelite-research/data/extra-biblical/BibleData-PersonLabel.csv",
  events: "/israelite-research/data/extra-biblical/BibleData-Event.csv",
  epochs: "/israelite-research/data/extra-biblical/BibleData-Epoch.csv",
};

const GH_RAW = {
  chron: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/Ussher-AnnalsOfTheWorld.csv",
  persons: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/BibleData-Person.csv",
  personLabels: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/BibleData-PersonLabel.csv",
  events: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/BibleData-Event.csv",
  epochs: "https://raw.githubusercontent.com/semiticjew/israelite-research/main/data/extra-biblical/BibleData-Epoch.csv",
};

// ---------- utils ----------
const toLower = (s) => (s ?? "").toString().toLowerCase();
const excerpt = (s, n = 220) => {
  const txt = (s ?? "").toString().trim();
  return txt.length > n ? txt.slice(0, n) + "…" : txt;
};
const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function setCount(el, n) { el.textContent = `${n.toLocaleString()} result${n === 1 ? "" : "s"}`; }

function makeCard({ title, meta, teaser, citeHTML }) {
  const div = document.createElement("div"); div.className = "card";
  const h = document.createElement("h3"); h.textContent = title || "—"; div.appendChild(h);
  if (meta)   { const m = document.createElement("div"); m.className = "meta";   m.textContent = meta;   div.appendChild(m); }
  if (teaser) { const p = document.createElement("p");   p.className = "teaser"; p.textContent = teaser; div.appendChild(p); }
  if (citeHTML) { const c = document.createElement("div"); c.className = "cite"; c.innerHTML = citeHTML; div.appendChild(c); }
  return div;
}
function errorCallout(where, msg) {
  const div = document.createElement("div"); div.className = "card";
  const h=document.createElement("h3"); h.textContent="Load error";
  const p=document.createElement("p");  p.textContent=msg;
  div.append(h,p); where.innerHTML=""; where.appendChild(div);
}

// Normalize person IDs so labels still match after YHVH→YHWH edits
function normalizeId(id){
  return (id ?? "").toString().trim().replace(/YHVH/gi, "YHWH");
}

// ---------- CSV loader ----------
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
function parseCSV(text) {
  if (!text) return [];
  const norm = text.replace(/\r\n/g, "\n");
  const lines = norm.split("\n");
  if (!lines.length) return [];

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
    for (let i=0; i<line.length; i++){
      const ch=line[i];
      if (ch === '"'){ if(q && line[i+1]==='"'){ field+='"'; i++; } else q=!q; }
      else if (ch === "," && !q){ pushField(); }
      else field+=ch;
    }
    if (q) field+="\n"; else { pushField(); pushRow(); }
  }
  if (field || row.length){ pushField(); pushRow(); }

  rows.headers = headers; rows.headersLower = Hlower;
  return rows;
}
function chooseColumn(headersLower, candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const c of list){
    const idx = headersLower.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
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

// ---------- Bible hover helpers ----------
const BOOK_MAP = { gen:"Genesis", exo:"Exodus", lev:"Leviticus", num:"Numbers", deu:"Deuteronomy",
  jos:"Joshua", jdg:"Judges", rut:"Ruth", "1sa":"1 Samuel","2sa":"2 Samuel","1ki":"1 Kings","2ki":"2 Kings",
  "1ch":"1 Chronicles","2ch":"2 Chronicles", ezr:"Ezra", neh:"Nehemiah", est:"Esther", job:"Job",
  psa:"Psalms", pro:"Proverbs", ecc:"Ecclesiastes", sng:"Song of Solomon", isa:"Isaiah", jer:"Jeremiah",
  lam:"Lamentations", ezk:"Ezekiel", dan:"Daniel", hos:"Hosea", jol:"Joel", amo:"Amos", oba:"Obadiah",
  jon:"Jonah", mic:"Micah", nam:"Nahum", hab:"Habakkuk", zep:"Zephaniah", hag:"Haggai", zec:"Zechariah", mal:"Malachi",
  mat:"Matthew", mrk:"Mark", luk:"Luke", jhn:"John", act:"Acts", rom:"Romans","1co":"1 Corinthians","2co":"2 Corinthians",
  gal:"Galatians", eph:"Ephesians", php:"Philippians", col:"Colossians","1th":"1 Thessalonians","2th":"2 Thessalonians",
  "1ti":"1 Timothy","2ti":"2 Timothy", tit:"Titus", phm:"Philemon", heb:"Hebrews", jas:"James",
  "1pe":"1 Peter","2pe":"2 Peter","1jn":"1 John","2jn":"2 John","3jn":"3 John", jud:"Jude", rev:"Revelation" };
function normalizeBook(token) {
  const t = token.replace(/\./g,"").toLowerCase();
  if (BOOK_MAP[t]) return BOOK_MAP[t];
  const key = t.slice(0,3);
  return BOOK_MAP[key] || token;
}
function linkifyRefs(refString) {
  if (!refString) return "";
  const parts = refString.split(/;|,/).map(p=>p.trim()).filter(Boolean);
  const anchors = parts.map(part=>{
    const m = part.match(/^([1-3]?[A-Za-z\.]{2,})\s+([\d:–\-]+.*)$/);
    if (!m) return part;
    const bookFull = normalizeBook(m[1]);
    const verse = m[2];
    const fullRef = `${bookFull} ${verse}`;
    return `<a class="xref" data-ref="${fullRef}">${fullRef}</a>`;
  });
  return anchors.join("; ");
}
function rescanXRefs() {
  try { window.citations?.scan?.(); } catch {}
  try { window.XRefHover?.scan?.(); } catch {}
}

// ---------- Pipe-separated labels with de-dup + merged refs ----------
function renderLabelsPipe(labs, langFilter, typeFilter){
  const wrap = document.createElement("div");
  wrap.className = "label-lines";

  const header = document.createElement("div");
  header.className = "label-line header";
  header.textContent = "Lng. | Label(s) | Transliteration | Meaning | Strongs | Type | Given | Ref";
  wrap.appendChild(header);

  const langOf = (L) =>
    (L.hebrew_label || L.hebrew_label_transliterated) ? "HE" :
    (L.greek_label  || L.greek_label_transliterated)  ? "GR" : "EN";

  const canonKey = (L) => {
    const lang = langOf(L);
    const he   = (L.hebrew_label || "").trim();
    const gr   = (L.greek_label  || "").trim();
    const tr   = (L.hebrew_label_transliterated || L.greek_label_transliterated || "").trim();
    const mea  = (L.hebrew_label_meaning || L.greek_label_meaning || "").trim();
    const str  = (L.hebrew_strongs_number || L.greek_strongs_number || "").trim().toUpperCase();
    const typ  = (L.label_type || "").trim();
    const giv  = ((L["label-given_by_god"] || "").toString().toUpperCase() === "Y") ? "Y" : "";
    return [lang, he, gr, tr, mea, str, typ, giv].join("||");
  };
  const splitRefs = (s) => (s||"").split(/[,;]+/).map(x => x.trim()).filter(Boolean);

  const groups = new Map();
  labs.forEach(L=>{
    const langOK = langFilter==="all" ? true :
      (langFilter==="en" ? !!L.english_label :
       langFilter==="he" ? !!(L.hebrew_label || L.hebrew_label_transliterated) :
       langFilter==="gr" ? !!(L.greek_label  || L.greek_label_transliterated) : true);
    const typeOK = typeFilter==="all" ? true : (L.label_type===typeFilter);
    if (!langOK || !typeOK) return;

    const key = canonKey(L);
    const entry = groups.get(key) || { rep: L, refs: new Set() };
    splitRefs(L.label_reference_id).forEach(r => entry.refs.add(r));
    groups.set(key, entry);
  });

  const langRank = { HE:0, GR:1, EN:2 };
  const ordered = [...groups.values()].sort((a,b)=>{
    const la = (a.rep && (a.rep.hebrew_label || a.rep.hebrew_label_transliterated)) ? "HE"
             : (a.rep && (a.rep.greek_label  || a.rep.greek_label_transliterated))  ? "GR" : "EN";
    const lb = (b.rep && (b.rep.hebrew_label || b.rep.hebrew_label_transliterated)) ? "HE"
             : (b.rep && (b.rep.greek_label  || b.rep.greek_label_transliterated))  ? "GR" : "EN";
    return (langRank[la] ?? 9) - (langRank[lb] ?? 9);
  });

  ordered.forEach(({rep, refs})=>{
    const lang = (rep.hebrew_label || rep.hebrew_label_transliterated) ? "HE"
               : (rep.greek_label  || rep.greek_label_transliterated)  ? "GR" : "EN";
    const labelStr = [rep.english_label, rep.hebrew_label, rep.greek_label].filter(Boolean).join(" · ");
    const translit = rep.hebrew_label_transliterated || rep.greek_label_transliterated || "";
    const meaning  = rep.hebrew_label_meaning || rep.greek_label_meaning || "";
    const strongs  = rep.hebrew_strongs_number || rep.greek_strongs_number || "";
    const typ      = rep.label_type || "";
    const given    = ((rep["label-given_by_god"] || "").toString().toUpperCase() === "Y") ? "Y" : "";

    const refsJoined = Array.from(refs).join("; ");
    const refsHTML   = refsJoined ? linkifyRefs(refsJoined) : "";

    const line = document.createElement("div");
    line.className = "label-line";
    const left = `${lang} | ${labelStr} | ${translit} | ${meaning} | ${strongs} | ${typ} | ${given} | `;
    line.appendChild(document.createTextNode(left));
    const refSpan = document.createElement("span");
    refSpan.className = "ref-html"; refSpan.innerHTML = refsHTML;
    line.appendChild(refSpan);
    wrap.appendChild(line);
  });

  return wrap;
}

// ---------- Tabs ----------
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

// ---------- Chronologies ----------
(async function initChron() {
  const list=document.getElementById("chron-list");
  const count=document.getElementById("chron-count");
  const q=document.getElementById("chron-q");
  const eraSel=document.getElementById("chron-era");
  try {
    const text = await fetchCSV(DATA.chron, GH_RAW.chron);
    const rows = parseCSV(text);
    const gEvent=getterFor(rows,["event","narrative","text"]);
    const gYear=getterFor(rows,["gc_year","year"]);
    const gEra=getterFor(rows,["gc_bc_ad","era"]);
    const gAM=getterFor(rows,["am_year"]);
    const gPara=getterFor(rows,["paragraph_nr"]);
    const render=()=>{
      const k=toLower(q.value); const era=eraSel.value;
      const filtered=rows.filter(r=>{
        const eraOk=era==="all"?true:(toLower(gEra(r))===toLower(era));
        const hay=`${gEvent(r)} ${gYear(r)} ${gAM(r)} ${gPara(r)}`.toLowerCase();
        return eraOk && (!k||hay.includes(k));
      });
      list.innerHTML=""; setCount(count,filtered.length);
      filtered.slice(0,200).forEach(r=>{
        const title=`${gEra(r)} ${gYear(r)} — AM ${gAM(r)}`.trim();
        const teaser=excerpt(gEvent(r),220);
        const citeHTML=linkifyRefs(`Ussher, Annals (AM ${gAM(r)||"?"}, §${gPara(r)||"?"})`);
        list.appendChild(makeCard({title, meta:null, teaser, citeHTML}));
      });
      rescanXRefs();
    };
    q.addEventListener("input", debounce(render,120));
    eraSel.addEventListener("change", render);
    render();
  } catch(err){ errorCallout(list,`Chronology data could not be loaded. ${err}`); count.textContent="0 results"; }
})();

// ---------- Persons ----------
(async function initPersons() {
  const list=document.getElementById("person-list");
  const count=document.getElementById("person-count");
  const q=document.getElementById("person-q");
  const roleSel=document.getElementById("person-role");
  const epochSel=document.getElementById("person-epoch");
  const langSel=document.getElementById("person-label-lang");
  const typeSel=document.getElementById("person-label-type");

  try {
    const text = await fetchCSV(DATA.persons, GH_RAW.persons);
    const rows = parseCSV(text);
    const text2 = await fetchCSV(DATA.personLabels, GH_RAW.personLabels);
    const labelRows = parseCSV(text2);

    const gId    = getterFor(rows,["person_id","id"]);
    const gName  = getterFor(rows,["name"]);
    const gRole  = getterFor(rows,["role"]);
    const gEpoch = getterFor(rows,["epoch","era"]);
    const gRefs  = getterFor(rows,["refs","references"]);
    const gSum   = getterFor(rows,["summary","notes"]);

    const labelsById=new Map(); const labelTypes=new Set();
    labelRows.forEach(L=>{
      const pid=normalizeId(L["person_id"]);
      if(!pid) return;
      if(!labelsById.has(pid)) labelsById.set(pid,[]);
      labelsById.get(pid).push(L);
      if(L["label_type"]) labelTypes.add(L["label_type"]);
    });
    Array.from(labelTypes).sort().forEach(t=>{
      const o=document.createElement("option"); o.value=o.textContent=t; typeSel.appendChild(o);
    });

    const render=()=>{
      const k=toLower(q.value), role=roleSel.value, epoch=epochSel.value, lang=langSel.value, type=typeSel.value;
      const filtered=rows.filter(r=>{
        const hay=`${gName(r)} ${gRole(r)} ${gRefs(r)} ${gSum(r)}`.toLowerCase();
        const pid=normalizeId(gId(r)); const labs=labelsById.get(pid)||[];
        const labelHay=labs.map(L=>`${L.english_label||""} ${L.hebrew_label||""} ${L.greek_label||""}`).join(" ").toLowerCase();
        const okK=!k||(hay.includes(k)||labelHay.includes(k));
        const okR=role==="all"||gRole(r)===role;
        const okE=epoch==="all"||gEpoch(r)===epoch;
        const okT=type==="all"||labs.some(L=>L.label_type===type);
        const okL=lang==="all"||labs.some(L=>{
          if(lang==="en") return L.english_label;
          if(lang==="he") return L.hebrew_label||L.hebrew_label_transliterated;
          if(lang==="gr") return L.greek_label||L.greek_label_transliterated;
        });
        return okK&&okR&&okE&&okT&&okL;
      });

      list.innerHTML=""; setCount(count,filtered.length);
      filtered.slice(0,200).forEach(r=>{
        const pid=normalizeId(gId(r)); const labs=labelsById.get(pid)||[];
        const title=gName(r)||"Unnamed";
        const meta=[gRole(r),gEpoch(r)].filter(Boolean).join(" • ");
        const teaser=excerpt(gSum(r),220);
        const card=makeCard({title, meta, teaser, citeHTML:null});
        if(gRefs(r)){
          const c=document.createElement("div"); c.className="cite";
          c.innerHTML=`Refs: ${linkifyRefs(gRefs(r))}`; card.appendChild(c);
        }
        if(labs.length){
          card.appendChild(renderLabelsPipe(labs, langSel.value, typeSel.value));
        }
        list.appendChild(card);
      });
      rescanXRefs();
    };

    q.addEventListener("input", debounce(render,120));
    roleSel.addEventListener("change", render);
    epochSel.addEventListener("change", render);
    langSel.addEventListener("change", render);
    typeSel.addEventListener("change", render);
    render();
  } catch(err){ errorCallout(list,`Persons could not be loaded. ${err}`); count.textContent="0 results"; }
})();

// ---------- Events ----------
(async function initEvents() {
  const list=document.getElementById("event-list");
  const count=document.getElementById("event-count");
  const q=document.getElementById("event-q");
  const typeSel=document.getElementById("event-type");
  const eraSel=document.getElementById("event-era");
  try {
    const text = await fetchCSV(DATA.events, GH_RAW.events);
    const rows = parseCSV(text);
    const gTitle=getterFor(rows,["title","event","name"]);
    const gType=getterFor(rows,["type"]);
    const gDate=getterFor(rows,["date","year"]);
    const gEra=getterFor(rows,["era","gc_bc_ad"]);
    const gLoc=getterFor(rows,["location","place"]);
    const gRefs=getterFor(rows,["refs","references"]);
    const gSum=getterFor(rows,["summary","notes"]);
    const types=new Set(); rows.forEach(r=>{const t=gType(r); if(t) types.add(t);});
    Array.from(types).sort().forEach(t=>{const o=document.createElement("option"); o.value=o.textContent=t; typeSel.appendChild(o);});
    const render=()=>{
      const k=toLower(q.value), typ=typeSel.value, era=eraSel.value;
      const filtered=rows.filter(r=>{
        const hay=`${gTitle(r)} ${gSum(r)} ${gRefs(r)} ${gLoc(r)}`.toLowerCase();
        const okK=!k||hay.includes(k);
        const okT=typ==="all"||gType(r)===typ;
        const okE=era==="all"||toLower(gEra(r))===toLower(era);
        return okK&&okT&&okE;
      });
      list.innerHTML=""; setCount(count,filtered.length);
      filtered.slice(0,200).forEach(r=>{
        const title=gTitle(r)||"Untitled event";
        const meta=[gDate(r),gLoc(r),gType(r)].filter(Boolean).join(" • ");
        const teaser=excerpt(gSum(r),220);
        const cite= gRefs(r) ? `Refs: ${linkifyRefs(gRefs(r))}` : "";
        list.appendChild(makeCard({title, meta, teaser, citeHTML:cite}));
      });
      rescanXRefs();
    };
    q.addEventListener("input", debounce(render,120));
    typeSel.addEventListener("change", render);
    eraSel.addEventListener("change", render);
    render();
  } catch(err){ errorCallout(list,`Events could not be loaded. ${err}`); count.textContent="0 results"; }
})();

// ---------- Epochs (Numerical Timeline — AH-aware with BC/AD fallback) ----------
(async function initEpochs() {
  const list = document.getElementById("epoch-list"); // kept for a11y/print
  const count = document.getElementById("epoch-count");
  const q = document.getElementById("epoch-q");
  const timelineEl = document.getElementById("epoch-timeline");
  const zoom = document.getElementById("epoch-zoom");
  const focusSel = document.getElementById("epoch-focus");

  // Comfortable default zoom (less scrunch)
  if (zoom) zoom.value = "30";

  // Fallback BC/AD parser (for any textual rows)
  function parseYearToken(tok) {
    if (!tok) return null;
    let t = tok.trim().toUpperCase().replace(/\s+/g, " ");
    let ad = /(^AD\s*\d+|\d+\s*AD$)/.test(t);
    let bc = /(^\d+\s*BC$|^BC\s*\d+)/.test(t);
    let m = t.match(/(\d+)/); if (!m) return null;
    let y = parseInt(m[1], 10);
    if (bc) y = -y;
    return ad || bc ? y : y; // default AD positive
  }
  function parseSpan(spanRaw) {
    if (!spanRaw) return null;
    let s = spanRaw.replace(/\u2013|\u2014/g, "–");
    const endEra = (s.match(/\b(BC|AD)\b/i) || [])[1];
    let parts = s.split(/–|-/).map(p => p.trim());
    if (!parts.length) return null;
    const qualify = (p, era) => (/\b(BC|AD)\b/i.test(p) ? p : (era ? `${p} ${era}` : p));
    if (parts.length === 1) {
      const y = parseYearToken(qualify(parts[0], endEra)); if (y == null) return null;
      return { start: y, end: y };
    }
    const p1 = qualify(parts[0], endEra), p2 = qualify(parts[1], endEra);
    const y1 = parseYearToken(p1), y2 = parseYearToken(p2);
    if (y1 == null || y2 == null) return null;
    const start = Math.min(y1, y2), end = Math.max(y1, y2);
    return { start, end };
  }
  const yearToLabelBCAD = (y) => (y < 0 ? `${Math.abs(y)} BC` : y > 0 ? `AD ${y}` : "0");

  try {
    const text = await fetchCSV(DATA.epochs, GH_RAW.epochs);
    const rows = parseCSV(text);

    // Your actual headers:
    const gName    = getterFor(rows, ["epoch_name","epoch","era","period","age","name","label"]);
    const gDesc    = getterFor(rows, ["epoch_description","summary","notes","description","abstract"]);
    const gStartAH = getterFor(rows, ["start_year_ah","start_ah","start_year_am","start_am"]);
    const gEndAH   = getterFor(rows, ["end_year_ah","end_ah","end_year_am","end_am"]);
    const gLen     = getterFor(rows, ["period_length","length_years"]);
    const gRefs    = getterFor(rows, ["refs","references","start_year_reference_id","end_year_reference_id"]);
    const gSpanTxt = getterFor(rows, ["range","datespan","years","span"]);

    const epochs = [];
    rows.forEach(r => {
      const name = gName(r) || "Epoch";
      const desc = gDesc(r);
      const refs = gRefs(r);

      let startAH = parseInt((gStartAH(r) || "").toString().trim(), 10);
      let endAH   = parseInt((gEndAH(r)   || "").toString().trim(), 10);
      let len     = parseInt((gLen(r)     || "").toString().trim(), 10);

      if (!isNaN(startAH)) {
        if (isNaN(endAH)) endAH = !isNaN(len) ? (startAH + Math.max(1, len)) : (startAH + 1);
        epochs.push({ name, summary: desc, refs, mode: "AH", start: startAH, end: endAH, rawSpan: `${startAH}–${endAH} AH` });
        return;
      }

      const spanParsed = parseSpan(gSpanTxt(r));
      if (spanParsed) {
        epochs.push({ name, summary: desc, refs, mode: "BCAD", start: spanParsed.start, end: spanParsed.end, rawSpan: gSpanTxt(r) || "" });
      }
    });

    if (!epochs.length) {
      errorCallout(timelineEl, "No epoch rows contained usable AH or BC/AD dates.");
      if (count) count.textContent = "0 results";
      return;
    }

    // AH vs BC/AD mode (majority wins)
    const ahCount = epochs.filter(e => e.mode === "AH").length;
    const useAH = ahCount >= (epochs.length - ahCount);

    // Widen a single-point "Creation"
    const creationIdx = epochs.findIndex(e => /creation/i.test(e.name));
    if (creationIdx >= 0) {
      const c = epochs[creationIdx];
      if (c.start === c.end) c.end = c.start + 1;
    }

    const minYear = Math.min(...epochs.map(e => e.start));
    const maxYear = Math.max(...epochs.map(e => e.end));

    // state & helpers
    let viewMin = minYear, viewMax = maxYear;

    const recalcView = () => {
      const mode = focusSel?.value || "auto";
      if (useAH) {
        if (mode === "full") { viewMin = Math.min(minYear, 1); viewMax = Math.max(maxYear, minYear + 100); }
        else { viewMin = minYear; viewMax = maxYear; }
      } else {
        if (mode === "full") { viewMin = Math.min(minYear, -4000); viewMax = Math.max(maxYear, 2025); }
        else if (mode === "bc") { viewMin = Math.min(minYear, -4000); viewMax = -1; }
        else if (mode === "ad") { viewMin = 1; viewMax = Math.max(maxYear, 2025); }
        else { viewMin = minYear; viewMax = maxYear; }
      }
      const z = Number(zoom?.value || 0) / 100; // 0..1
      const factor = 1 / (1 + 3*z); // zoom in
      const mid = (viewMin + viewMax) / 2;
      const half = (viewMax - viewMin) / 2 * factor;
      viewMin = Math.floor(mid - half);
      viewMax = Math.ceil(mid + half);
    };

    const xOf = (year) => (((year - viewMin) / ((viewMax - viewMin) || 1)) * 100);

    function renderTimeline(filtered) {
      timelineEl.innerHTML = "";

      // Era band + ticks
      const ticks = document.createElement("div"); ticks.className = "ticks";
      const eraBand = document.createElement("div"); eraBand.className = "era-band";
      timelineEl.appendChild(eraBand); timelineEl.appendChild(ticks);

      // Softer tick density
      const span = Math.abs(viewMax - viewMin);
      let step;
      if (span > 6000) step = 1000;
      else if (span > 3000) step = 500;
      else if (span > 1500) step = 250;
      else if (span > 700)  step = 100;
      else if (span > 300)  step = 50;
      else if (span > 120)  step = 25;
      else if (span > 60)   step = 10;
      else if (span > 25)   step = 5;
      else step = 1;

      const firstTick = Math.ceil(viewMin / step) * step;
      for (let y = firstTick; y <= viewMax; y += step) {
        const x = xOf(y);
        const t = document.createElement("div");
        t.className = "tick";
        t.style.left = `${x}%`;
        t.style.height = (useAH ? "22px" : (y === 0 ? "28px" : "22px"));
        ticks.appendChild(t);

        const lbl = document.createElement("div");
        lbl.className = "tick-label";
        lbl.style.left = `${x}%`;
        lbl.textContent = useAH ? `${y} AH` : (y === 0 ? "0" : yearToLabelBCAD(y));
        timelineEl.appendChild(lbl);
      }

      // Bars with lane packing
      const laneHeight = 40;  // more vertical breathing room
      let laneEnds = [];      // track last X-end for each lane
      filtered.forEach(ep => {
        const startX = xOf(ep.start), endX = xOf(ep.end);
        const left = Math.max(0, Math.min(100, startX));
        const width = Math.max(0.7, Math.min(100 - left, endX - startX));

        let lane = 0; while (laneEnds[lane] != null && laneEnds[lane] > left) lane++;
        laneEnds[lane] = left + width;

        const top = 40 + lane * laneHeight;
        const bar = document.createElement("div");
        bar.className = "epoch-bar";
        bar.style.left = `${left}%`;
        bar.style.width = `${width}%`;
        bar.style.top = `${top}px`;

        const name = document.createElement("span");
        name.className = "name"; name.textContent = ep.name;
        const spanEl = document.createElement("span");
        spanEl.className = "span";
        spanEl.textContent = useAH
          ? ` ${ep.start}–${ep.end} AH`
          : ` ${yearToLabelBCAD(ep.start)} – ${yearToLabelBCAD(ep.end)}`;

        bar.appendChild(name); bar.appendChild(spanEl);
        bar.title = ep.summary ? ep.summary : (ep.rawSpan || "");
        timelineEl.appendChild(bar);
      });

      // Dynamic container height based on lanes used
      const lanesUsed = (filtered.length ? (laneEnds.length || 1) : 1);
      const topPadding = 40;
      const bottomPadding = 24;
      timelineEl.style.height = `${topPadding + lanesUsed * laneHeight + bottomPadding}px`;
    }

    const doRender = () => {
      recalcView();
      const k = toLower(q?.value || "");
      const filtered = epochs.filter(e => {
        if (!k) return true;
        const hay = `${e.name} ${e.rawSpan || ""} ${e.summary || ""}`.toLowerCase();
        return hay.includes(k);
      });
      if (count) count.textContent = `${filtered.length.toLocaleString()} epoch${filtered.length===1?"":"s"}` + (useAH ? " (AH)" : "");
      renderTimeline(filtered);

      // (Optional) also populate hidden list
      if (list) {
        list.innerHTML = "";
        filtered.forEach(e=>{
          list.appendChild(makeCard({
            title: e.name,
            meta: useAH ? `${e.start}–${e.end} AH` : `${yearToLabelBCAD(e.start)} – ${yearToLabelBCAD(e.end)}`,
            teaser: excerpt(e.summary, 200),
            citeHTML: e.refs ? `Refs: ${linkifyRefs(e.refs)}` : ""
          }));
        });
        rescanXRefs();
      }
    };

    // Wire controls
    q?.addEventListener("input", debounce(doRender, 120));
    zoom?.addEventListener("input", doRender);
    focusSel?.addEventListener("change", doRender);

    doRender();
  } catch (err) {
    errorCallout(timelineEl, `Epochs could not be loaded. ${err}`);
    if (count) count.textContent = "0 results";
  }
})();
