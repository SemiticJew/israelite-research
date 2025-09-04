/* nt-chapter.js
 * Shared loader for NT and Tanakh.
 * - Verse toolbar per verse: commentary / xrefs / lex
 * - Commentary saved per-verse to localStorage
 * - Optional right-panel dictionary (Zondervan JSON)
 * - Chapter selector sized to actual chapter count per book
 * - Strong’s integration (Hebrew + Greek): click lex to open inline panel
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
  const hovercard = document.getElementById("hovercard"); // legacy popover (kept but unused for lex/xrefs now)
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

  // Inline panels under each verse (lex / xrefs)
  function ensureInlinePanel(verseEl, kind/* 'lex' | 'xref' */){
    const id = kind === 'lex' ? 'lex-inline' : 'xref-inline';
    let panel = verseEl.querySelector(`.${id}`);
    if (!panel) {
      panel = document.createElement('div');
      panel.className = id;
      panel.style.margin = '0.35rem 0 0.1rem';
      panel.style.paddingLeft = '36px';
      verseEl.appendChild(panel);
    }
    return panel;
  }
  function renderInlinePanel(verseEl, kind, html){
    const panel = ensureInlinePanel(verseEl, kind);
    panel.innerHTML = html;
    panel.style.display = 'block';
  }
  function hideInlinePanels(){
    document.querySelectorAll('.lex-inline, .xref-inline').forEach(el => el.style.display = 'none');
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

  // ---------------- Strong’s lookup (H & G) ---------------------------------
  function normalizeStrongs(code){
    return String(code || "")
      .toUpperCase()
      .replace(/^([GH])0+(\d+)/, "$1$2")   // H0430 -> H430
      .replace(/^(\d+)$/, "G$1");         // bare number -> assume Greek
  }
  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  async function ensureLexicon(which){
    if (which === "H" && !window.strongsHebrewDictionary) {
      try { await loadScript("/israelite-research/js/lexicon/strongs-hebrew-dictionary.js"); } catch {}
    }
    if (which === "G" && !window.strongsGreekDictionary) {
      try { await loadScript("/israelite-research/js/lexicon/strongs-greek-dictionary.js"); } catch {}
    }
  }
  async function getLexEntry(strongsCode){
    const n = normalizeStrongs(strongsCode);
    await ensureLexicon(n[0]);
    const dict = n.startsWith("H") ? (window.strongsHebrewDictionary || {})
                                   : (window.strongsGreekDictionary  || {});
    return { code: n, entry: dict[n] || null };
  }

  // ---------------- Strong’s markers → strip from verse text ----------------
  // Removes inline markers like {H430}, {(H8804)}, [G5055], (H0430), etc.
  function stripStrongsMarkers(text){
    let t = String(text || "");
    t = t.replace(/\{[GH]\d{1,5}\}/gi, "");          // {H430}
    t = t.replace(/\{\([GH]\d{1,5}\)\}/gi, "");      // {(H8804)}
    t = t.replace(/\[[GH]\d{1,5}\]/gi, "");          // [G5055]
    t = t.replace(/\(([GH])\d{1,5}\)/gi, "");        // (H0430)
    t = t.replace(/\s{2,}/g, " ");                   // collapse doubles
    return t.trim();
  }

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
      const text = escapeHtml(stripStrongsMarkers(v.t || ""));
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

    // xrefs button → inline panel under this verse
    versesEl.querySelectorAll(".xref-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        hideHovercard();
        const verseEl = btn.closest(".verse");
        if (!verseEl) return;

        const x = (btn.getAttribute("data-xref") || "").split("|").filter(Boolean);
        if (!x.length) {
          renderInlinePanel(verseEl, 'xref', `<p class="muted">No cross references for this verse.</p>`);
          return;
        }
        const list = x.map(r => `<li>${escapeHtml(r)}</li>`).join("");
        renderInlinePanel(verseEl, 'xref', `<ul class="lex">${list}</ul>`);
      });
    });

    // lex button → inline panel under this verse
    versesEl.querySelectorAll(".lex-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        hideHovercard();
        const verseEl = btn.closest(".verse");
        if (!verseEl) return;

        const codes = (btn.getAttribute("data-strongs") || "").split("|").filter(Boolean);
        if (!codes.length) {
          renderInlinePanel(verseEl, 'lex', `<p class="muted">No lexical tags on this verse.</p>`);
          return;
        }

        const listHtml = `
          <ul class="lex">
            ${codes.map(c => `<li><button class="vc-btn" data-code="${escapeHtml(c)}">${escapeHtml(c)}</button></li>`).join("")}
          </ul>
          <div class="lex-detail muted" style="margin-top:.35rem">Select a code above…</div>`;
        renderInlinePanel(verseEl, 'lex', listHtml);

        const panel = verseEl.querySelector('.lex-inline');
        const detail = panel?.querySelector('.lex-detail');

        panel?.querySelectorAll('button[data-code]').forEach(b => {
          b.addEventListener('click', async () => {
            const raw = b.getAttribute('data-code') || '';
            const { code, entry } = await getLexEntry(raw);
            if (!detail) return;
            if (!entry) { detail.innerHTML = `<span style="color:#b91c1c">No entry for ${escapeHtml(code)}.</span>`; return; }
            detail.classList.remove('muted');
            detail.innerHTML = `
              <div><b>Strong’s:</b> ${escapeHtml(code)}</div>
              <div><b>Lemma:</b> ${escapeHtml(entry.lemma || entry.xlit || entry.translit || "—")}</div>
              <div><b>Translit:</b> ${escapeHtml(entry.translit || entry.xlit || "—")}</div>
              <div><b>Gloss (KJV):</b> ${escapeHtml(entry.kjv_def || entry.strongs_def || "—")}</div>
              <div><b>Definition:</b> ${escapeHtml(entry.strongs_def || "—")}</div>
              <div><b>Derivation:</b> ${escapeHtml(entry.derivation || entry.deriv || "—")}</div>
            `;
          });
        });
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

    // Close popovers/panels on outside click/scroll
    document.addEventListener("scroll", hideHovercard, { passive: true });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".lex-btn,.xref-btn,#hovercard,[data-strongs],.lex-inline,.xref-inline")) {
        hideHovercard();
        hideInlinePanels();
      }
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
