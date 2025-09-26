// /israelite-research/js/extra-biblical-sources.js
// Scholarly, neutral, and safe. No font overrides; inherits site styles.
// Retains: universal header/footer includes, safe CSV loader with fallback, textContent insertions.

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

// ---------- Utilities ----------
const toLower = (s) => (s ?? "").toString().toLowerCase();
const excerpt = (s, n = 220) => {
  const txt = (s ?? "").toString();
  return txt.length > n ? txt.slice(0, n) + "…" : txt;
};
const debounce = (fn, ms = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// Get first present, non-empty field from a list of possible keys
const get = (row, keys) => {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
    // also try case-insensitive match
    const found = Object.keys(row).find((kk) => kk.toLowerCase() === k.toLowerCase());
    if (found && row[found] !== "") return row[found];
  }
  return "";
};

function setCount(el, n) {
  el.textContent = `${n.toLocaleString()} result${n === 1 ? "" : "s"}`;
}

function makeCard({ title, meta, teaser, cite }) {
  const div = document.createElement("div");
  div.className = "card";

  const h = document.createElement("h3");
  h.textContent = title || "—";
  div.appendChild(h);

  if (meta) {
    const m = document.createElement("div");
    m.className = "meta";
    m.textContent = meta;
    div.appendChild(m);
  }

  if (teaser) {
    const p = document.createElement("p");
    p.className = "teaser";
    p.textContent = teaser;
    div.appendChild(p);
  }

  if (cite) {
    const c = document.createElement("div");
    c.className = "cite";
    c.textContent = cite;
    div.appendChild(c);
  }

  return div;
}

function errorCallout(where, msg) {
  const div = document.createElement("div");
  div.className = "card";
  const h = document.createElement("h3");
  h.textContent = "Load error";
  const p = document.createElement("p");
  p.textContent = msg;
  div.appendChild(h);
  div.appendChild(p);
  where.innerHTML = "";
  where.appendChild(div);
}

// ---------- CSV loader (local → GitHub Raw fallback) ----------
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

// Tiny CSV parser that handles quotes, commas, and embedded newlines
function parseCSV(text) {
  const out = [];
  if (!text) return out;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (!lines.length) return out;

  const splitHeader = (line) => {
    const arr = [];
    let field = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        arr.push(field);
        field = "";
      } else {
        field += ch;
      }
    }
    arr.push(field);
    return arr.map((h) => h.trim());
  };

  const headers = splitHeader(lines[0]);
  let row = [];
  let field = "";
  let inQ = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length) {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
      out.push(obj);
    }
    row = [];
  };

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        pushField();
      } else {
        field += ch;
      }
    }
    if (inQ) {
      field += "\n";
    } else {
      pushField();
      pushRow();
    }
  }
  // handle possible trailing line without newline
  if (field || row.length) {
    pushField();
    pushRow();
  }
  return out;
}

// ---------- Tabs ----------
(function initTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = new Map(
    tabs.map((btn) => [btn.id, document.getElementById(btn.getAttribute("aria-controls"))])
  );

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      panels.forEach((panel) => panel.setAttribute("aria-hidden", "true"));
      const panel = panels.get(btn.id);
      if (panel) panel.setAttribute("aria-hidden", "false");
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

    const render = () => {
      const k = toLower(q.value);
      const era = eraSel.value; // all | BC | AD
      const filtered = rows.filter((r) => {
        const eraOk = era === "all" ? true : (get(r, ["gc_bc_ad"]) === era);
        const hay = `${get(r, ["event"])} ${get(r, ["gc_year"])} ${get(r, ["am_year"])} ${get(r, ["paragraph_nr"])}`.toLowerCase();
        return eraOk && (!k || hay.includes(k));
      });

      list.innerHTML = "";
      setCount(count, filtered.length);
      filtered.slice(0, 300).forEach((r) => {
        const title = `${get(r, ["gc_bc_ad"])} ${get(r, ["gc_year"])} — AM ${get(r, ["am_year"])}`.trim();
        const teaser = excerpt(get(r, ["event"]), 220);
        const cite = `Ussher, Annals (AM ${get(r, ["am_year"]) || "?"}, §${get(r, ["paragraph_nr"]) || "?"}).`;
        list.appendChild(makeCard({ title, meta: null, teaser, cite }));
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

    // Derive unique roles/epochs when present (support various header casings)
    const roles = new Set();
    const epochs = new Set();
    rows.forEach((r) => {
      const role = get(r, ["role", "Role"]);
      const epoch = get(r, ["epoch", "Epoch", "era"]);
      if (role) roles.add(role);
      if (epoch) epochs.add(epoch);
    });

    Array.from(roles).sort().forEach((val) => {
      const o = document.createElement("option");
      o.value = o.textContent = val;
      roleSel.appendChild(o);
    });
    Array.from(epochs).sort().forEach((val) => {
      const o = document.createElement("option");
      o.value = o.textContent = val;
      epochSel.appendChild(o);
    });

    const render = () => {
      const k = toLower(q.value);
      const role = roleSel.value;
      const epoch = epochSel.value;

      const filtered = rows.filter((r) => {
        const hay = `${get(r, ["name", "Name"])} ${get(r, ["role", "Role"])} ${get(r, ["refs", "References"])} ${get(r, ["summary", "Summary"])}`.toLowerCase();
        const okK = !k || hay.includes(k);
        const okR = role === "all" || get(r, ["role", "Role"]) === role;
        const okE = epoch === "all" || get(r, ["epoch", "Epoch", "era"]) === epoch;
        return okK && okR && okE;
      });

      list.innerHTML = "";
      setCount(count, filtered.length);
      filtered.slice(0, 300).forEach((r) => {
        const title = get(r, ["name", "Name"]) || "Unnamed";
        const meta = [get(r, ["role", "Role"]), get(r, ["epoch", "Epoch", "era"])].filter(Boolean).join(" • ");
        const teaser = excerpt(get(r, ["summary", "Summary"]), 220);
        const cite = get(r, ["refs", "References"]) ? `Refs: ${get(r, ["refs", "References"])}` : "";
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

    const types = new Set();
    rows.forEach((r) => {
      const t = get(r, ["type", "Type"]);
      if (t) types.add(t);
    });
    Array.from(types).sort().forEach((t) => {
      const o = document.createElement("option");
      o.value = o.textContent = t;
      typeSel.appendChild(o);
    });

    const render = () => {
      const k = toLower(q.value);
      const typ = typeSel.value;
      const era = eraSel.value; // all | BC | AD

      const filtered = rows.filter((r) => {
        const hay = `${get(r, ["title", "Title"])} ${get(r, ["summary", "Summary"])} ${get(r, ["refs", "References"])} ${get(r, ["location", "Location"])}`.toLowerCase();
        const okK = !k || hay.includes(k);
        const okT = typ === "all" || get(r, ["type", "Type"]) === typ;
        const eraField = get(r, ["era", "Era", "gc_bc_ad"]);
        const okE = era === "all" || eraField === era;
        return okK && okT && okE;
      });

      list.innerHTML = "";
      setCount(count, filtered.length);
      filtered.slice(0, 300).forEach((r) => {
        const title = get(r, ["title", "Title"]) || "Untitled event";
        const meta = [get(r, ["date", "Date"]), get(r, ["location", "Location"]), get(r, ["type", "Type"])].filter(Boolean).join(" • ");
        const teaser = excerpt(get(r, ["summary", "Summary"]), 220);
        const cite = get(r, ["refs", "References"]) ? `Refs: ${get(r, ["refs", "References"])}` : "";
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

    const render = () => {
      const k = toLower(q.value);
      const filtered = rows.filter((r) => {
        const hay = `${get(r, ["epoch", "Epoch"])} ${get(r, ["range", "Range"])} ${get(r, ["summary", "Summary"])}`.toLowerCase();
        return !k || hay.includes(k);
      });

      list.innerHTML = "";
      setCount(count, filtered.length);
      filtered.slice(0, 300).forEach((r) => {
        const title = get(r, ["epoch", "Epoch"]) || "Epoch";
        const meta = get(r, ["range", "Range"]) || "";
        const teaser = excerpt(get(r, ["summary", "Summary"]), 220);
        const cite = get(r, ["refs", "References"]) ? `Refs: ${get(r, ["refs", "References"])}` : "";
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
