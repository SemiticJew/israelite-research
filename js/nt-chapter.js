/* nt-chapter.js
 * Shared loader for NT and Tanakh.
 * - Verse toolbar per verse: commentary / xrefs / lex
 * - Commentary saved per-verse to localStorage
 * - Optional right-panel dictionary (Zondervan JSON)
 * - Chapter selector sized to actual chapter count per book
 * - Strong’s Greek integration: click [data-strongs] to open panel
 * Expects chapter JSON: [{ v:number, t:string, c:string[], s:string[] }, ...]
 */

(function () {
  const ZONDERVAN_PATH = "/israelite-research/data/dictionaries/zondervan.json"; // optional local data

  // ---------------- Chapter counts (common slug variants included) ----------
  const NT = {
    "matthew":28, "mark":16, "luke":24, "john":21, "acts":28, "romans":16,
    "1-corinthians":16, "2-corinthians":13,
    "galatians":6, "ephesians":6, "philippians":4, "colossians":4,
    "1-thessalonians":5, "2-thessalonians":3,
    "1-timothy":6, "2-timothy":4,
    "titus":3, "philemon":1, "hebrews":13, "james":5,
    "1-peter":5, "2-peter":3,
    "1-john":5, "2-john":1, "3-john":1,
    "jude":1, "revelation":22,

    // aliases (dashless)
    "1corinthians":16, "2corinthians":13,
    "1thessalonians":5, "2thessalonians":3,
    "1timothy":6, "2timothy":4,
    "1peter":5, "2peter":3,
    "1john":5, "2john":1, "3john":1
  };

  const OT = {
    "genesis":50, "exodus":40, "leviticus":27, "numbers":36, "deuteronomy":34,
    "joshua":24, "judges":21, "ruth":4,
    "1-samuel":31, "2-samuel":24, "1-kings":22, "2-kings":25,
    "1-chronicles":29, "2-chronicles":36,
    "ezra":10, "nehemiah":13, "esther":10, "job":42, "psalms":150, "proverbs":31,
    "ecclesiastes":12, "song-of-solomon":8, "song-of-songs":8,
    "isaiah":66, "jeremiah":52, "lamentations":5, "ezekiel":48, "daniel":12,
    "hosea":14, "joel":3, "amos":9, "obadiah":1, "jonah":4, "micah":7,
    "nahum":3, "habakkuk":3, "zephaniah":3, "haggai":2, "zechariah":14, "malachi":4,

    // aliases (dashless + common)
    "1samuel":31, "2samuel":24, "1kings":22, "2kings":25,
    "1chronicles":29, "2chronicles":36, "psalm":150, "songofsongs":8, "songofsolomon":8
  };

  // ---------------- Roman/Arabic helpers (multi-book support) ---------------
  function toRoman(n){ return ({1:"I",2:"II",3:"III"})[n] || String(n); }
  function fromRomanToken(tok){
    const t = String(tok||"").toLowerCase();
    if (t === "i") return 1;
    if (t === "ii") return 2;
    if (t === "iii") return 3;
    return null;
  }
  // Split slug into optional leading ordinal + base (e.g., "1-samuel", "i-samuel")
  function splitOrdinalSlug(slug){
    const s = String(slug||"").toLowerCase();
    const m = s.match(/^((?:[123])|(?:i{1,3}))-(.+)$/);
    if (!m) return { ord:null, base:s };
    const ord = /^[123]$/.test(m[1]) ? parseInt(m[1],10) : fromRomanToken(m[1]);
    return { ord: ord || null, base: m[2] };
  }
  // Human-readable book title (Roman numerals for multi-book series)
  function makeDisplayTitleFromSlug(slug){
    const { ord, base } = splitOrdinalSlug(slug);
    const titledBase = base.replace(/[_-]+/g," ").replace(/\b\w/g, c => c.toUpperCase());
    return ord ? `${toRoman(ord)} ${titledBase}` : titledBase;
  }

  function normalizeSlug(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/(^|\b)(1|2|3)[ ](?=[a-z])/g, "$1$2-") // "1 john" -> "1-john"
      .replace(/[^a-z0-9\-]/g, "");
  }

  // Accept numeric or Roman slug; lookup normalized to numeric for tables
  function getChapterCount(canon, bookSlug) {
    const raw = normalizeSlug(bookSlug);
    const { ord, base } = splitOrdinalSlug(raw);
    const normalized = ord ? `${ord}-${base}` : raw;
    const table = canon === "tanakh" ? OT : NT;
    return table[normalized] || table[normalized.replace(/-/g, "")] || 150; // fallback
  }

  // ---------------- Canon / routing ----------------
  function getCanon() {
    const qp = new URLSearchParams(location.search).get("canon");
    if (qp) return qp.toLowerCase() === "tanakh" ? "tanakh" : "newtestament";
    return location.pathname.toLowerCase().includes("/tanakh/") ? "tanakh" : "newtestament";
  }
  function getBookSlug() {
    const qp = new URLSearchParams(location.search).get("book");
    if (qp) return qp.toLowerCase();
    const parts = location.pathname.split("/").filter(Boolean);
    const canon = getCanon();
    const i = parts.findIndex(p => p.toLowerCase() === canon);
    return (i >= 0 && parts[i + 1]) ? decodeURIComponent(parts[i + 1]).toLowerCase() : "";
  }
  function getChapter() {
    const m = new URLSearchParams(location.search).get("ch");
    const n = parseInt(m, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  function setChapter(n) {
    const url = new URL(location.href);
    url.searchParams.set("ch", String(n));
    location.href = url.toString();
  }
  function getSiteBase() {
    const canon = getCanon();
    const path = location.pathname.replace(/\/+$/,'');
    const idx = path.toLowerCase().indexOf(`/${canon}/`);
    return idx > -1 ? path.slice(0, idx) : "";
  }

  // ---------------- Fetch chapter ----------------
  async function fetchChapter(book, ch) {
    const canon = getCanon();
    const rel1  = new URL(`../data/${canon}/${book}/${ch}.json`, location.href).pathname;
    const rel2  = new URL(`../../data/${canon}/${book}/${ch}.json`, location.href).pathname;
    const base  = getSiteBase() || "/israelite-research";
    const abs1  = `${base}/data/${canon}/${book}/${ch}.json`;
    const abs2  = `/israelite-research/data/${canon}/${book}/${ch}.json`;
    const abs3  = `/data/${canon}/${book}/${ch}.json`;
    const candidates = [rel1, rel2, abs1, abs2, abs3];

    let lastErr;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Chapter JSON must be an array of {v,t,c,s}");
        console.info("[chapter] loaded:", url);
        return data;
      } catch (e) { lastErr = e; console.warn("[chapter] failed:", url, e.message); }
    }
    throw new Error(`Could not load chapter JSON. Last error: ${lastErr?.message || "unknown"}`);
  }

  // ---------------- UI helpers ----------------
  const hovercard = document.getElementById("hovercard"); // used for xrefs/lex quick popovers
  function showHovercard(x, y, html) {
    if (!hovercard) return;
    hovercard.innerHTML = html;
    hovercard.style.left = Math.max(8, x + 12) + "px";
    hovercard.style.top  = Math.max(8, y + 12) + "px";
    hovercard.classList.add("open");
    hovercard.setAttribute("aria-hidden", "false");
  }
  function hideHovercard() {
    if (!hovercard) return;
    hovercard.classList.remove("open");
    hovercard.setAttribute("aria-hidden", "true");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }
  function titleCaseFromSlug(slug){
    if(!slug) return "";
    return slug.replace(/[_-]+/g, " ")
               .split(" ")
               .map(w => /^\d+$/.test(w) ? w : (w.charAt(0).toUpperCase() + w.slice(1)))
               .join(" ");
  }

  // Use Roman numerals in UI titles/crumbs for multi-book series
  function setDynamicTitles() {
    const canon = getCanon();
    const canonTitle = canon === "tanakh" ? "Tanakh" : "New Testament";
    const bookSlug = getBookSlug();
    const bookTitle = makeDisplayTitleFromSlug(bookSlug) || canonTitle;
    const ch = getChapter();
    const h1 = document.getElementById("pageTitle");
    const crumbs = document.getElementById("crumbs");
    if (h1) h1.textContent = `${bookTitle} (KJV) — Chapter ${ch}`;
    if (crumbs) crumbs.textContent = `${canonTitle} → ${bookTitle} → Chapter ${ch}`;
    document.title = `${bookTitle} — Chapter ${ch}`;
  }

  // ---------------- Strong’s (A) helper: safe lookup ------------------------
  function getGreekEntry(strongsCode) {
    // strongs-greek-dictionary.js declares: var strongsGreekDictionary = { "G3056": {...} }
    const dict = (typeof window !== "undefined" && (window.strongsGreekDictionary || window.strongsGreekDictionary))
                 || (typeof strongsGreekDictionary !== "undefined" && strongsGreekDictionary)
                 || null;
    if (!dict) return null;
    const code = String(strongsCode || "").toUpperCase().replace(/^G?(\d+)$/, "G$1");
    return dict[code] || null;
  }

  // ---------------- Strong’s (C) minimal info panel -------------------------
  let _lexPanel;
  function ensureLexPanel() {
    if (_lexPanel) return _lexPanel;
    _lexPanel = document.createElement("aside");
    _lexPanel.id = "lexicon-panel";
    _lexPanel.style.position = "fixed";
    _lexPanel.style.right = "12px";
    _lexPanel.style.bottom = "12px";
    _lexPanel.style.maxWidth = "420px";
    _lexPanel.style.background = "var(--white, #fff)";
    _lexPanel.style.border = "1px solid var(--sky, #DBE4EE)";
    _lexPanel.style.boxShadow = "0 6px 24px rgba(0,0,0,.12)";
    _lexPanel.style.padding = "12px 14px";
    _lexPanel.style.borderRadius = "10px";
    _lexPanel.style.fontSize = "14px";
    _lexPanel.style.zIndex = "9999";
    document.body.appendChild(_lexPanel);
    return _lexPanel;
  }
  function showLexiconPanel({ code, lemma, translit, gloss, def, deriv, error }) {
    const panel = ensureLexPanel();
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px">
        <strong style="font-size:16px">Strong’s ${escapeHtml(code || "")}</strong>
        <button aria-label="Close" style="border:0;background:transparent;font-size:18px;cursor:pointer">&times;</button>
      </div>
      ${
        error
          ? `<div style="color:#b91c1c">${escapeHtml(error)}</div>`
          : `
            <div><b>Lemma:</b> ${escapeHtml(lemma ?? "—")}</div>
            <div><b>Translit:</b> ${escapeHtml(translit ?? "—")}</div>
            <div><b>Gloss (KJV):</b> ${escapeHtml(gloss ?? "—")}</div>
            <div><b>Definition:</b> ${escapeHtml(def ?? "—")}</div>
            <div><b>Derivation:</b> ${escapeHtml(deriv ?? "—")}</div>
          `
      }
    `;
    panel.querySelector("button")?.addEventListener("click", () => panel.remove(), { once:true });
  }

  // ---------------- Strong’s (B) event delegation ---------------------------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-strongs]");
    if (!el) return;
    const raw = el.getAttribute("data-strongs") || "";
    const code = raw.split("|")[0]; // if multiple, show the first
    const entry = getGreekEntry(code);
    if (!entry) {
      showLexiconPanel({ code, error: "No entry found." });
      return;
    }
    showLexiconPanel({
      code: code.toUpperCase().replace(/^G?(\d+)$/, "G$1"),
      lemma: entry.lemma,
      translit: entry.translit,
      gloss: entry.kjv_def,
      def: entry.strongs_def,
      deriv: entry.derivation
    });
  });

  // ---------------- Chapter select (exact sizing) ---------------------------
  function populateChapterSelect(current) {
    const sel = document.getElementById("chSelect");
    if (!sel) return;
    const count = getChapterCount(getCanon(), getBookSlug());
    sel.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= count; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      frag.appendChild(opt);
    }
    sel.appendChild(frag);
    sel.value = String(Math.min(current, count));
    sel.onchange = () => setChapter(parseInt(sel.value, 10) || 1);
  }

  // ---------------- Per-verse commentary storage ----------------------------
  function notesKey(canon, book, ch) {
    return `notes:${canon}:${book}:${ch}`; // keep backward-compatible key
  }
  function loadNotes(canon, book, ch) {
    try { return JSON.parse(localStorage.getItem(notesKey(canon, book, ch)) || "{}"); }
    catch { return {}; }
  }
  function saveNotes(canon, book, ch, data) {
    localStorage.setItem(notesKey(canon, book, ch), JSON.stringify(data));
  }

  // ---------------- Renderer -------------------------------------------------
  async function renderChapter(chapterData) {
    const versesEl = document.getElementById("verses");
    if (!versesEl) return;

    if (!Array.isArray(chapterData) || !chapterData.length) {
      versesEl.innerHTML = '<p class="muted">No verses found for this chapter.</p>';
      return;
    }

    const canon = getCanon();
    const book = getBookSlug();
    const ch   = getChapter();
    const notes = loadNotes(canon, book, ch);

    const html = chapterData.map(v => {
      const vnum = Number.isFinite(v.v) ? v.v : "";
      const text = escapeHtml(v.t || "");
      const xrefs = Array.isArray(v.c) ? v.c : [];
      const strongs = Array.isArray(v.s) ? v.s.filter(Boolean) : [];
      const saved = (notes[String(vnum)] || "").trim();

      const xBtn = xrefs.length
        ? `<button class="xref-btn" data-xref="${escapeHtml(xrefs.join("|"))}" title="Cross references">xrefs</button>`
        : `<button class="xref-btn" data-xref="" disabled title="No cross references">xrefs</button>`;

      const lexBtn = strongs.length
        ? `<button class="lex-btn" data-strongs="${escapeHtml(strongs.join("|"))}" title="Lexical info for this verse">lex</button>`
        : `<button class="lex-btn" data-strongs="" disabled title="No lexical tags">lex</button>`;

      const commBtn = `<button class="commentary-btn" data-verse="${vnum}" aria-expanded="${saved ? "true" : "false"}" title="Add commentary">commentary</button>`;

      return `
        <div class="verse" data-verse="${vnum}">
          <div class="vline">
            <span class="vnum">${vnum}</span>
            <span class="vtext">${text}</span>
          </div>
          <div class="v-toolbar">
            ${commBtn}
            ${xBtn}
            ${lexBtn}
          </div>
          <div class="v-commentary" id="comm-${vnum}" style="display:${saved ? "block" : "none"}; padding-left:36px; margin:.35rem 0 .1rem;">
            <textarea class="comm-text" data-verse="${vnum}" style="width:100%; min-height:120px; border:1px solid #DBE4EE; border-radius:10px; padding:.6rem;">${escapeHtml(saved)}</textarea>
            <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:.4rem;">
              <button class="comm-save vc-btn" data-verse="${vnum}">Save</button>
              <button class="comm-clear vc-btn" data-verse="${vnum}">Clear</button>
            </div>
            <div class="comm-status muted" style="margin-top:.2rem; font-size:.85rem;">${saved ? "📝 commentary saved" : ""}</div>
          </div>
        </div>
      `;
    }).join("");

    versesEl.innerHTML = html;

    // xrefs hover
    versesEl.querySelectorAll(".xref-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const x = (btn.getAttribute("data-xref") || "").split("|").filter(Boolean);
        if (!x.length) return;
        const rect = btn.getBoundingClientRect();
        const list = x.map(r => `<li>${escapeHtml(r)}</li>`).join("");
        showHovercard(rect.left + rect.width / 2, rect.top + window.scrollY, `<ul class="lex">${list}</ul>`);
      });
    });

    // lex list hover (lightweight)
    versesEl.querySelectorAll(".lex-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const codes = (btn.getAttribute("data-strongs") || "").split("|").filter(Boolean);
        if (!codes.length) return;
        const rect = btn.getBoundingClientRect();
        const listHtml = `<ul class="lex">${codes.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`;
        showHovercard(rect.left + rect.width / 2, rect.top + window.scrollY, listHtml);
      });
    });

    // commentary toggle + save/clear
    versesEl.querySelectorAll(".commentary-btn[data-verse]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = String(btn.getAttribute("data-verse") || "").trim();
        const panel = document.getElementById(`comm-${v}`);
        if (!panel) return;
        const open = panel.style.display !== "none";
        const willOpen = !open;
        panel.style.display = willOpen ? "block" : "none";
        btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    });

    versesEl.querySelectorAll(".comm-save").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = String(btn.getAttribute("data-verse") || "").trim();
        const textarea = versesEl.querySelector(`.comm-text[data-verse="${CSS.escape(v)}"]`);
        if (!textarea) return;
        const val = (textarea.value || "").trim();
        const canon = getCanon(), book = getBookSlug(), ch = getChapter();
        const notes = loadNotes(canon, book, ch);
        if (val) notes[v] = val; else delete notes[v];
        saveNotes(canon, book, ch, notes);
        const status = textarea.closest(".v-commentary")?.querySelector(".comm-status");
        if (status) status.textContent = val ? "📝 commentary saved" : "";
      });
    });

    versesEl.querySelectorAll(".comm-clear").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = String(btn.getAttribute("data-verse") || "").trim();
        const textarea = versesEl.querySelector(`.comm-text[data-verse="${CSS.escape(v)}"]`);
        if (!textarea) return;
        textarea.value = "";
        const canon = getCanon(), book = getBookSlug(), ch = getChapter();
        const notes = loadNotes(canon, book, ch);
        delete notes[v];
        saveNotes(canon, book, ch, notes);
        const status = textarea.closest(".v-commentary")?.querySelector(".comm-status");
        if (status) status.textContent = "";
      });
    });

    document.addEventListener("scroll", hideHovercard, { passive: true });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".lex-btn,.xref-btn,#hovercard")) hideHovercard();
    });

    // ---------- Zondervan dictionary (right panel) ----------
    const dictRoot = document.getElementById("dictPanel");
    const dictSearch = document.getElementById("dictSearch");
    if (dictRoot) {
      let dict = null;
      async function ensureDict(){
        if (dict) return dict;
        try {
          const r = await fetch(ZONDERVAN_PATH, { cache: "force-cache" });
          if (!r.ok) throw 0;
          dict = await r.json();
        } catch { dict = null; }
        return dict;
      }
      async function doSearch(q){
        q = (q || "").trim();
        const data = await ensureDict();
        if (!data) { dictRoot.innerHTML = '<p class="muted">Dictionary data not found. Add <code>data/dictionaries/zondervan.json</code>.</p>'; return; }
        if (!q) { dictRoot.innerHTML = '<p class="muted">Enter a term above.</p>'; return; }
        const term = q.toLowerCase();
        const hits = [];
        for (const item of data) {
          const t = String(item.term || "").toLowerCase();
          const d = String(item.def || "").toLowerCase();
          if (t.includes(term) || d.includes(term)) { hits.push(item); if (hits.length >= 50) break; }
        }
        if (!hits.length) { dictRoot.innerHTML = `<p class="muted">No results for “${escapeHtml(q)}”.</p>`; return; }
        dictRoot.innerHTML = `
          <ul class="lex">
            ${hits.map(h => `<li><strong>${escapeHtml(h.term || "")}</strong>${h.def ? ` — ${escapeHtml(h.def)}` : ""}</li>`).join("")}
          </ul>
        `;
      }
      if (dictSearch) {
        dictSearch.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(dictSearch.value); });
        dictSearch.addEventListener("change", () => doSearch(dictSearch.value));
      }
    }
  }

  // ---------------- Bootstrap ----------------
  async function init() {
    setDynamicTitles();
    populateChapterSelect(getChapter());

    const prev = document.getElementById("btnPrev");
    const next = document.getElementById("btnNext");
    if (prev) prev.onclick = () => setChapter(Math.max(1, getChapter() - 1));
    if (next) next.onclick = () => setChapter(getChapter() + 1);

    const book = getBookSlug();
    const ch   = getChapter();

    try {
      const data = await fetchChapter(book, ch);
      await renderChapter(data);

      // Prefetch neighbors
      const canon = getCanon();
      const base = getSiteBase() || "/israelite-research";
      const nextUrl = `${base}/data/${canon}/${book}/${ch + 1}.json`;
      const prevUrl = ch > 1 ? `${base}/data/${canon}/${book}/${ch - 1}.json` : null;
      try { fetch(nextUrl, { cache: "force-cache" }); } catch {}
      if (prevUrl) try { fetch(prevUrl, { cache: "force-cache" }); } catch {}
    } catch (err) {
      const versesEl = document.getElementById("verses");
      if (versesEl) versesEl.innerHTML = `<p class="muted">Could not load chapter data. ${escapeHtml(err.message)}</p>`;
      console.error(err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
