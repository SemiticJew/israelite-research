// /israelite-research/js/extra-biblical-sources.js
// Robust scholarly module for Extra-Biblical Sources page

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
const debounce = (fn, ms = 150) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
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
  const h = document.createElement("h3"); h.textContent = "Load error";
  const p = document.createElement("p");  p.textContent = msg;
  div.append(h, p); where.innerHTML = ""; where.appendChild(div);
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
  const out = [];
  if (!text) return out;
  const norm = text.replace(/\r\n/g, "\n");
  const lines = norm.split("\n");
  if (!lines.length) return out;

  const split = (line) => {
    const a = []; let f = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { f += '"'; i++; } else q = !q; }
      else if (ch === "," && !q) { a.push(f); f = ""; }
      else f += ch;
    }
    a.push(f); return a;
  };

  const headers = split(lines[0]).map(h => h.trim());
  const Hlower = headers.map(h => h.toLowerCase());
  const rows = [];
  let row = [], field = "", q = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow   = () => { if (row.length) { const o = {}; headers.forEach((h, i) => o[h] = row[i] ?? ""); rows.push(o); } row = []; };

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { field += '"'; i++; } else q = !q; }
      else if (ch === "," && !q) { pushField(); }
      else field += ch;
    }
    if (q) field += "\n"; else { pushField(); pushRow(); }
  }
  if (field || row.length) { pushField(); pushRow(); }

  rows.headers = headers; rows.headersLower = Hlower;
  return rows;
}
function chooseColumn(headersLower, candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const c of list) {
    const idx = headersLower.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  for (const c of list) {
    for (let i = 0; i < headersLower.length; i++) {
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
const BOOK_MAP = {
  gen:"Genesis", exo:"Exodus", lev:"Leviticus", num:"Numbers", deu:"Deuteronomy",
  jos:"Joshua", jdg:"Judges", rut:"Ruth", "1sa":"1 Samuel", "2sa":"2 Samuel",
  "1ki":"1 Kings", "2ki":"2 Kings", "1ch":"1 Chronicles", "2ch":"2 Chronicles",
  ezr:"Ezra", neh:"Nehemiah", est:"Esther", job:"Job", psa:"Psalms", pro:"Proverbs",
  ecc:"Ecclesiastes", sng:"Song of Solomon", isa:"Isaiah", jer:"Jeremiah",
  lam:"Lamentations", ezk:"Ezekiel", dan:"Daniel", hos:"Hosea", jol:"Joel", amo:"Amos",
  oba:"Obadiah", jon:"Jonah", mic:"Micah", nam:"Nahum", hab:"Habakkuk", zep:"Zephaniah",
  hag:"Haggai", zec:"Zechariah", mal:"Malachi", mat:"Matthew", mrk:"Mark", luk:"Luke",
  jhn:"John", act:"Acts", rom:"Romans", "1co":"1 Corinthians", "2co":"2 Corinthians",
  gal:"Galatians", eph:"Ephesians", php:"Philippians", col:"Colossians",
  "1th":"1 Thessalonians", "2th":"2 Thessalonians", "1ti":"1 Timothy", "2ti":"2 Timothy",
  tit:"Titus", phm:"Philemon", heb:"Hebrews", jas:"James", "1pe":"1 Peter", "2pe":"2 Peter",
  "1jn":"1 John", "2jn":"2 John", "3jn":"3 John", jud:"Jude", rev:"Revelation"
};
function normalizeBook(token) {
  const t = token.replace(/\./g, "").toLowerCase();
  if (BOOK_MAP[t]) return BOOK_MAP[t];
  const key = t.slice(0, 3);
  return BOOK_MAP[key] || token;
}
function linkifyRefs(refString) {
  if (!refString) return "";
  const parts = refString.split(/;|,/).map(p => p.trim()).filter(Boolean);
  const anchors = parts.map(part => {
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

// ---------- Tabs ----------
(function initTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = new Map(tabs.map(btn => [btn.id, document.getElementById(btn.getAttribute("aria-controls"))]));
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.setAttribute("aria-selected", String(b === btn)));
      panels.forEach(p => p.setAttribute("aria-hidden", "true"));
      const panel = panels.get(btn.id); if (panel) panel.setAttribute("aria-hidden", "false");
      btn.focus();
    });
  });
})();

// ---------- Chronologies ----------
(async function initChron() {
  const list = document.getElementById("chron-list");
  const count = document.getElementById("chron-count");
  const q = document.getElementById("chron-q");
  const eraSel = document.getElementById("chron-era");
  try {
    const text = await fetchCSV(DATA.chron, GH_RAW.chron);
    const rows = parseCSV(text);
    const gEvent = getterFor(rows, ["event", "narrative", "text", "description"]);
    const gYear  = getterFor(rows, ["gc_year", "year"]);
    const gEra   = getterFor(rows, ["gc_bc_ad", "era"]);
    const gAM    = getterFor(rows, ["am_year", "am"]);
    const gPara  = getterFor(rows, ["paragraph_nr", "paragraph", "para"]);

    const render = () => {
      const k = toLower(q.value); const era = eraSel.value;
      const filtered = rows.filter(r => {
        const eraOk = era === "all" ? true : (toLower(gEra(r)) === toLower(era));
        const hay = `${gEvent(r)} ${gYear(r)} ${gAM(r)} ${gPara(r)}`.toLowerCase();
        return eraOk && (!k || hay.includes(k));
      });
      list.innerHTML = ""; setCount(count, filtered.length);
      filtered.slice(0, 200).forEach(r => {
        const title = `${gEra(r)} ${gYear(r)} — AM ${gAM(r)}`.trim();
        const teaser = excerpt(gEvent(r), 220);
        const citeHTML = linkifyRefs(`Ussher, Annals (AM ${gAM(r) || "?"}, §${gPara(r) || "?"})`);
        list.appendChild(makeCard({ title, meta: null, teaser, citeHTML }));
      });
      rescanXRefs();
    };

    q.addEventListener("input", debounce(render, 120));
    eraSel.addEventListener("change", render);
    render();
  } catch (err) {
    errorCallout(list, `Chronology data could not be loaded. ${err}`);
    count.textContent = "0 results";
  }
})();

// ---------- Persons (with Labels) ----------
(async function initPersons() {
  const list = document.getElementById("person-list");
  const count = document.getElementById("person-count");
  const q = document.getElementById("person-q");
  const roleSel = document.getElementById("person-role");
  const epochSel = document.getElementById("person-epoch");
  const langSel = document.getElementById("person-label-lang");
  const typeSel = document.getElementById("person-label-type");

  try {
    const text = await fetchCSV(DATA.persons, GH_RAW.persons);
    const rows = parseCSV(text);
    const text2 = await fetchCSV(DATA.personLabels, GH_RAW.personLabels);
    const labelRows = parseCSV(text2);

    const gId    = getterFor(rows, ["person_id", "id"]);
    const gName  = getterFor(rows, ["name", "person", "fullname", "label"]);
    const gRole  = getterFor(rows, ["role", "occupation", "office", "title", "function"]);
    const gEpoch = getterFor(rows, ["epoch", "era", "period"]);
    const gRefs  = getterFor(rows, ["refs", "references", "citations", "sources"]);
    const gSum   = getterFor(rows, ["summary", "notes", "description", "abstract"]);

    const labelsById = new Map(); const labelTypes = new Set();
    labelRows.forEach(L => {
      const pid = L["person_id"];
      if (!pid) return;
      if (!labelsById.has(pid)) labelsById.set(pid, []);
      labelsById.get(pid).push(L);
      if (L["label_type"]) labelTypes.add(L["label_type"]);
    });
    Array.from(labelTypes).sort().forEach(t => {
      const o = document.createElement("option"); o.value = o.textContent = t; typeSel.appendChild(o);
    });

    const render = () => {
      const k = toLower(q.value), role = roleSel.value, epoch = epochSel.value, lang = langSel.value, type = typeSel.value;

      const filtered = rows.filter(r => {
        const hay = `${gName(r)} ${gRole(r)} ${gRefs(r)} ${gSum(r)}`.toLowerCase();
        const pid = gId(r); const labs = labelsById.get(pid) || [];
        const labelHay = labs.map(L => `${L.english_label || ""} ${L.hebrew_label || ""} ${L.greek_label || ""} ${L.hebrew_label_transliterated || ""} ${L.greek_label_transliterated || ""}`).join(" ").toLowerCase();

        const okK = !k || hay.includes(k) || labelHay.includes(k);
        const okR = role === "all" || gRole(r) === role;
        const okE = epoch === "all" || gEpoch(r) === epoch;
        const okT = type === "all" || labs.some(L => L.label_type === type);
        const okL = lang === "all" || labs.some(L => {
          if (lang === "en") return !!L.english_label;
          if (lang === "he") return !!(L.hebrew_label || L.hebrew_label_transliterated);
          if (lang === "gr") return !!(L.greek_label || L.greek_label_transliterated);
        });

        return okK && okR && okE && okT && okL;
      });

      list.innerHTML = ""; setCount(count, filtered.length);
      filtered.slice(0, 200).forEach(r => {
        const pid = gId(r); const labs = labelsById.get(pid) || [];
        const title = gName(r) || "Unnamed";
        const meta = [gRole(r), gEpoch(r)].filter(Boolean).join(" • ");
        const teaser = excerpt(gSum(r), 220);
        const card = makeCard({ title, meta, teaser, citeHTML: null });

        if (gRefs(r)) {
          const c = document.createElement("div"); c.className = "cite";
          c.innerHTML = `Refs: ${linkifyRefs(gRefs(r))}`; card.appendChild(c);
        }

        if (labs.length) {
          const bar = document.createElement("div"); bar.className = "meta";
          const chips = labs.slice(0, 2).map(L =>
            L.english_label || L.hebrew_label || L.greek_label || L.hebrew_label_transliterated || L.greek_label_transliterated
          ).filter(Boolean);
          if (chips.length) bar.textContent = `Labels: ${chips.join(" | ")}${labs.length > 2 ? ` (+${labs.length - 2} more)` : ``}`;
          card.appendChild(bar);

          const firstRef = labs.find(L => L.label_reference_id);
          if (firstRef) {
            const c = document.createElement("div"); c.className = "cite";
            c.innerHTML = `Label ref: ${linkifyRefs(firstRef.label_reference_id)}`; card.appendChild(c);
          }
        }

        list.appendChild(card);
      });
      rescanXRefs();
    };

    q.addEventListener("input", debounce(render, 120));
    roleSel.addEventListener("change", render);
    epochSel.addEventListener("change", render);
    langSel.addEventListener("change", render);
    typeSel.addEventListener("change", render);
    render();
  } catch (err) {
    errorCallout(list, `Persons could not be loaded. ${err}`);
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

    const gTitle = getterFor(rows, ["title", "event", "name", "label"]);
    const gType  = getterFor(rows, ["type", "category", "class"]);
    const gDate  = getterFor(rows, ["date", "year", "gc_year"]);
    const gEra   = getterFor(rows, ["era", "gc_bc_ad"]);
    const gLoc   = getterFor(rows, ["location", "place", "region", "site"]);
    const gRefs  = getterFor(rows, ["refs", "references", "citations", "sources"]);
    const gSum   = getterFor(rows, ["summary", "notes", "description", "abstract"]);

    const types = new Set(); rows.forEach(r => { const t = gType(r); if (t) types.add(t); });
    Array.from(types).sort().forEach(t => { const o = document.createElement("option"); o.value = o.textContent = t; typeSel.appendChild(o); });

    const render = () => {
      const k = toLower(q.value), typ = typeSel.value, era = eraSel.value;
      const filtered = rows.filter(r => {
        const hay = `${gTitle(r)} ${gSum(r)} ${gRefs(r)} ${gLoc(r)}`.toLowerCase();
        const okK = !k || hay.includes(k);
        const okT = typ === "all" || gType(r) === typ;
        const okE = era === "all" || toLower(gEra(r)) === toLower(era);
        return okK && okT && okE;
      });

      list.innerHTML = ""; setCount(count, filtered.length);
      filtered.slice(0, 200).forEach(r => {
        const title  = gTitle(r) || "Untitled event";
        const meta   = [gDate(r), gLoc(r), gType(r)].filter(Boolean).join(" • ");
        const teaser = excerpt(gSum(r), 220);
        const cite   = gRefs(r) ? `Refs: ${linkifyRefs(gRefs(r))}` : "";
        list.appendChild(makeCard({ title, meta, teaser, citeHTML: cite }));
      });
      rescanXRefs();
    };

    q.addEventListener("input", debounce(render, 120));
    typeSel.addEventListener("change", render);
    eraSel.addEventListener("change", render);
    render();
  } catch (err) {
    errorCallout(list, `Events could not be loaded. ${err}`);
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

    const gName = getterFor(rows, ["epoch", "era", "period", "age", "name", "label"]);
    const gSpan = getterFor(rows, ["range", "datespan", "years", "span"]);
    const gRefs = getterFor(rows, ["refs", "references", "citations", "sources"]);
    const gSum  = getterFor(rows, ["summary", "notes", "description", "abstract"]);

    const render = () => {
      const k = toLower(q.value);
      const filtered = rows.filter(r => {
        const hay = `${gName(r)} ${gSpan(r)} ${gSum(r)}`.toLowerCase();
        return !k || hay.includes(k);
      });

      list.innerHTML = ""; setCount(count, filtered.length);
      filtered.slice(0, 200).forEach(r => {
        const title  = gName(r) || "Epoch";
        const meta   = gSpan(r) || "";
        const teaser = excerpt(gSum(r), 220);
        const cite   = gRefs(r) ? `Refs: ${linkifyRefs(gRefs(r))}` : "";
        list.appendChild(makeCard({ title, meta, teaser, citeHTML: cite }));
      });
      rescanXRefs();
    };

    q.addEventListener("input", debounce(render, 120));
    render();
  } catch (err) {
    errorCallout(list, `Epochs could not be loaded. ${err}`);
    count.textContent = "0 results";
  }
})();
