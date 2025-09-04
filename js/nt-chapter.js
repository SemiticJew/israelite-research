/* nt-chapter.js
 * Adds: toggleable inline xrefs + verse-preview tooltip on hover (Tanakh + NT)
 * Also includes: per-verse anchors & copy-link, inline lex panel, notes, etc.
 */

(function () {
  const ZONDERVAN_PATH = "/israelite-research/data/dictionaries/zondervan.json"; // optional

  // ---------------- Chapter counts ------------------------------------------
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

  // ---------------- Roman/Arabic helpers ------------------------------------
  function toRoman(n){ return ({1:"I",2:"II",3:"III"})[n] || String(n); }
  function fromRomanToken(tok){
    const t = String(tok||"").toLowerCase();
    if (t === "i") return 1;
    if (t === "ii") return 2;
    if (t === "iii") return 3;
    return null;
  }
  function splitOrdinalSlug(slug){
    const s = String(slug||"").toLowerCase();
    const m = s.match(/^((?:[123])|(?:i{1,3}))-(.+)$/);
    if (!m) return { ord:null, base:s };
    const ord = /^[123]$/.test(m[1]) ? parseInt(m[1],10) : fromRomanToken(m[1]);
    return { ord: ord || null, base: m[2] };
  }
  function makeDisplayTitleFromSlug(slug){
    const { ord, base } = splitOrdinalSlug(slug);
    const titledBase = base.replace(/[_-]+/g," ").replace(/\b\w/g, c => c.toUpperCase());
    return ord ? `${toRoman(ord)} ${titledBase}` : titledBase;
  }
  function normalizeSlug(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/(^|\b)(1|2|3)[ ](?=[a-z])/g, "$1$2-")
      .replace(/[^a-z0-9\-]/g, "");
  }
  function getChapterCount(canon, bookSlug) {
    const raw = normalizeSlug(bookSlug);
    const { ord, base } = splitOrdinalSlug(raw);
    const normalized = ord ? `${ord}-${base}` : raw;
    const table = canon === "tanakh" ? OT : NT;
    return table[normalized] || table[normalized.replace(/-/g, "")] || 150;
  }

  // ---------------- Canon / routing -----------------------------------------
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

  // ---------------- Fetch chapter JSON --------------------------------------
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

  // Cache other chapters for tooltip previews
  const chapterCache = new Map();
  async function fetchChapterForPreview(canon, bookSlug, ch){
    const key = `${canon}:${bookSlug}:${ch}`;
    if (chapterCache.has(key)) return chapterCache.get(key);
    // Build absolute (site-base) candidate list similar to fetchChapter, but explicit canon
    const base  = getSiteBase() || "/israelite-research";
    const urls = [
      `${base}/data/${canon}/${bookSlug}/${ch}.json`,
      `/israelite-research/data/${canon}/${bookSlug}/${ch}.json`,
      `/data/${canon}/${bookSlug}/${ch}.json`
    ];
    let lastErr;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) { chapterCache.set(key, data); return data; }
      } catch (e) { lastErr = e; }
    }
    console.warn("[xref-preview] failed to load", canon, bookSlug, ch, lastErr?.message);
    chapterCache.set(key, null);
    return null;
  }

  // ---------------- UI helpers ----------------------------------------------
// --- Replace the old helpers ---
const hovercard = document.getElementById("hovercard");

function showHovercardAt(el, html) {
  if (!hovercard || !el) return;
  const rect = el.getBoundingClientRect();

  hovercard.innerHTML = html;
  hovercard.style.position = "fixed";
  hovercard.style.display = "block";
  hovercard.classList.add("open");
  hovercard.setAttribute("aria-hidden", "false");

  // Place below the link, clamped within viewport
  const pad = 8;
  let top  = rect.bottom + pad;          // no window.scrollY for fixed
  let left = rect.left + rect.width/2;   // center-ish

  // Clamp so it stays on screen
  const maxLeft = window.innerWidth - 16;
  const maxTop  = window.innerHeight - 16;
  if (left > maxLeft) left = maxLeft;
  if (top  > maxTop)  top  = Math.max(16, rect.top - hovercard.offsetHeight - pad);

  // Center align via transform
  hovercard.style.left = `${left}px`;
  hovercard.style.top  = `${top}px`;
  hovercard.style.transform = "translateX(-50%)"; // center under the link
}

function hideHovercard() {
  if (!hovercard) return;
  hovercard.classList.remove("open");
  hovercard.setAttribute("aria-hidden", "true");
  hovercard.style.display = "none";
  hovercard.style.transform = "";
}
  // Inline panels (lex / xref)
  function ensureInlinePanel(verseEl, kind){
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
  function isPanelOpen(verseEl, kind){
    const el = verseEl.querySelector(kind === 'lex' ? '.lex-inline' : '.xref-inline');
    return !!el && el.style.display !== 'none' && el.innerHTML.trim() !== '';
  }

  // Title / crumbs
  function setDynamicTitles() {
    const canon = getCanon();
    const canonTitle = canon === "tanakh" ? "Tanakh" : "New Testament";
    const bookSlug = getBookSlug();
    const bookTitle = (function(slug){
      const s = String(slug||"");
      const m = s.match(/^((?:[123])|(?:i{1,3}))-(.+)$/);
      if (!m) return s.replace(/[_-]+/g," ").replace(/\b\w/g, c => c.toUpperCase());
      const ord = /^[123]$/.test(m[1]) ? parseInt(m[1],10) : ({i:1,ii:2,iii:3})[m[1]];
      const base = m[2].replace(/[_-]+/g," ").replace(/\b\w/g, c => c.toUpperCase());
      const roman = ({1:"I",2:"II",3:"III"})[ord] || String(ord);
      return `${roman} ${base}`;
    })(bookSlug) || (canon === "tanakh" ? "Tanakh" : "New Testament");
    const ch = getChapter();
    const h1 = document.getElementById("pageTitle");
    const crumbs = document.getElementById("crumbs");
    if (h1) h1.textContent = `${bookTitle} (KJV) — Chapter ${ch}`;
    if (crumbs) crumbs.textContent = `${canon === "tanakh" ? "Tanakh" : "New Testament"} → ${bookTitle} → Chapter ${ch}`;
    document.title = `${bookTitle} — Chapter ${ch}`;
  }

  // Strong’s helpers (kept)
  function normalizeStrongs(code){
    return String(code || "")
      .toUpperCase()
      .replace(/^([GH])0+(\d+)/, "$1$2")
      .replace(/^(\d+)$/, "G$1");
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
  function stripStrongsMarkers(text){
    let t = String(text || "");
    t = t.replace(/\{[GH]\d{1,5}\}/gi, "");
    t = t.replace(/\{\([GH]\d{1,5}\)\}/gi, "");
    t = t.replace(/\[[GH]\d{1,5}\]/gi, "");
    t = t.replace(/\(([GH])\d{1,5}\)/gi, "");
    t = t.replace(/\s{2,}/g, " ");
    return t.trim();
  }

  // Permalinks
  function verseId(n){ return `v${n}`; }
  function buildVersePermalink(n){
    const url = new URL(location.href);
    url.hash = `#${verseId(n)}`;
    return url.toString();
  }
  async function copyToClipboard(text){
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      return true;
    } catch { return false; }
  }
  function flash(el){ if (!el) return; el.classList.add('active'); setTimeout(()=> el.classList.remove('active'), 600); }

  // --------- Build href + parsing helpers for xref strings ------------------
  // Accept "Genesis 1:1", "I Kings 3:9", "1 John 4:8" → {canon, slug, ch, v, href}
  function parseHumanRef(ref){
    const r = String(ref || "").trim();
    const m = r.match(/^((?:(?:[1-3])|(?:I{1,3}))\s+)?([A-Za-z][A-Za-z\s]+?)\s+(\d+):(\d+)$/i);
    if (!m) return null;
    const ordTok = (m[1] || "").trim();
    const base   = m[2].trim().replace(/\s+/g, " ");
    const ch     = parseInt(m[3],10);
    const v      = parseInt(m[4],10);

    let ordNum = null;
    if (ordTok) {
      const t = ordTok.toLowerCase();
      ordNum = /^\d+$/.test(t) ? parseInt(t,10) : ({i:1,ii:2,iii:3})[t] || null;
    }
    const display = (ordNum ? ({1:"I",2:"II",3:"III"})[ordNum] + " " : "") + base;

    // slug
    const baseSlug = base.toLowerCase().replace(/\s+/g, "-");
    const slug = ordNum ? `${({1:"i",2:"ii",3:"iii"})[ordNum]}-${baseSlug}` : baseSlug;

    // canon guess (mirrors server data layout)
    const flat = (display || "").toLowerCase();
    const isOT = /^(genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|[i1] ?samuel|[i1] ?kings|[i1] ?chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|song|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)\b/.test(flat);
    const canon = isOT ? "tanakh" : "newtestament";

    const basePath = getSiteBase() || "/israelite-research";
    const href = `${basePath}/${canon}/chapter.html?book=${slug}&ch=${ch}#v${v}`;
    return { canon, slug, ch, v, href, display };
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

    // notes
    function notesKey(){ return `notes:${canon}:${book}:${ch}`; }
    function loadNotes(){
      try { return JSON.parse(localStorage.getItem(notesKey()) || "{}"); }
      catch { return {}; }
    }
    function saveNotes(data){
      localStorage.setItem(notesKey(), JSON.stringify(data));
    }
    const notes = loadNotes();

    const html = chapterData.map(v => {
      const vnum = Number.isFinite(v.v) ? v.v : "";
      const text = escapeHtml(stripStrongsMarkers(v.t || ""));
      const xrefs = Array.isArray(v.c) ? v.c : [];
      const strongs = Array.isArray(v.s) ? v.s.filter(Boolean) : [];
      const saved = (notes[String(vnum)] || "").trim();

      const anchorId = `v${vnum}`;
      const copyBtn = `<button class="copy-link-btn" data-verse="${vnum}" title="Copy link to this verse">link</button>`;

      const xBtn = xrefs.length
        ? `<button class="xref-btn" data-xref="${escapeHtml(xrefs.join("|"))}" title="Cross references">xrefs</button>`
        : `<button class="xref-btn" data-xref="" disabled title="No cross references">xrefs</button>`;

      const lexBtn = strongs.length
        ? `<button class="lex-btn" data-strongs="${escapeHtml(strongs.join("|"))}" title="Lexical info for this verse">lex</button>`
        : `<button class="lex-btn" data-strongs="" disabled title="No lexical tags">lex</button>`;

      const commBtn = `<button class="commentary-btn" data-verse="${vnum}" aria-expanded="${saved ? "true" : "false"}" title="Add commentary">commentary</button>`;

      return `
        <div class="verse" data-verse="${vnum}" id="${anchorId}">
          <div class="vline">
            <span class="vnum">${vnum}</span>
            <span class="vtext">${text}</span>
          </div>
          <div class="v-toolbar">
            ${commBtn}
            ${xBtn}
            ${lexBtn}
            ${copyBtn}
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

    // ---------- XREFS: toggle inline + live hover preview ----------
    versesEl.querySelectorAll(".xref-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        hideHovercard();
        const verseEl = btn.closest(".verse");
        if (!verseEl) return;

        // toggle
        if (isPanelOpen(verseEl, 'xref')) {
          verseEl.querySelector('.xref-inline').style.display = 'none';
          return;
        }
        hideInlinePanels();

        const refsRaw = (btn.getAttribute("data-xref") || "").split("|").filter(Boolean);
        if (!refsRaw.length) {
          renderInlinePanel(verseEl, 'xref', `<p class="muted">No cross references for this verse.</p>`);
          return;
        }

        // Build a linked list; each link gets data-* attrs for preview fetch
        const links = refsRaw.map(r => {
          const p = parseHumanRef(r);
          if (!p) return `<span>${escapeHtml(r)}</span>`;
          return `<a class="xref-link" href="${escapeHtml(p.href)}"
                     data-ref="${escapeHtml(r)}"
                     data-canon="${escapeHtml(p.canon)}"
                     data-slug="${escapeHtml(p.slug)}"
                     data-ch="${p.ch}" data-v="${p.v}"
                     title="${escapeHtml(p.display)}">${escapeHtml(p.display)}</a>`;
        }).join(", ");

        renderInlinePanel(verseEl, 'xref', `<p>Cross references: ${links}.</p>`);
      });
    });

    // Hover preview for xrefs: fetch chapter JSON once, show verse text
    versesEl.addEventListener("mouseover", async (e) => {
      const a = e.target.closest(".xref-link");
      if (!a) return;
      const canon = a.getAttribute("data-canon");
      const slug  = a.getAttribute("data-slug");
      const ch    = parseInt(a.getAttribute("data-ch"),10);
      const v     = parseInt(a.getAttribute("data-v"),10);
      const data  = await fetchChapterForPreview(canon, slug, ch);
      const rect  = a.getBoundingClientRect();
      let html = `<div class="muted">Preview unavailable.</div>`;
      if (Array.isArray(data)) {
        const verse = data.find(x => x && typeof x === "object" && x.v === v);
        if (verse) {
          const text = escapeHtml(stripStrongsMarkers(verse.t || ""));
          html = `<div class="vc-head"><span class="vc-ref"><b>${escapeHtml(a.getAttribute("data-ref") || "")}</b></span></div><div class="vc-text">${text}</div>`;
        }
      }
      showHovercard(rect.left + rect.width/2, rect.top + window.scrollY, html);
    });
    versesEl.addEventListener("mouseout", (e) => {
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("#hovercard")) return;
      hideHovercard();
    });

    // ---------- LEX: inline toggle + sentence + code detail ----------
    function formatSentenceList(arr){
      const a = arr.slice();
      if (a.length <= 1) return a.join('');
      const last = a.pop();
      return a.join(', ') + ' and ' + last;
    }
    versesEl.querySelectorAll(".lex-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        hideHovercard();
        const verseEl = btn.closest(".verse");
        if (!verseEl) return;

        if (isPanelOpen(verseEl, 'lex')) {
          verseEl.querySelector('.lex-inline').style.display = 'none';
          return;
        }
        hideInlinePanels();

        const codes = (btn.getAttribute("data-strongs") || "").split("|").filter(Boolean).map(normalizeStrongs);
        if (!codes.length) {
          renderInlinePanel(verseEl, 'lex', `<p class="muted">No lexical tags on this verse.</p>`);
          return;
        }
        const buttons = codes.map(c => `<button class="vc-btn code-pill" data-code="${escapeHtml(c)}">${escapeHtml(c)}</button>`);
        const sentence = `Strong’s codes in this verse: ${formatSentenceList(buttons)}.`;
        const template = `<p>${sentence}</p><div class="lex-detail muted" style="margin-top:.35rem">Select a code above…</div>`;
        renderInlinePanel(verseEl, 'lex', template);

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

    // Copy-link buttons
    versesEl.querySelectorAll(".copy-link-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const verseEl = btn.closest(".verse");
        const v = btn.getAttribute("data-verse");
        if (!verseEl || !v) return;
        const url = buildVersePermalink(v);
        const ok = await copyToClipboard(url);
        flash(verseEl);
        btn.setAttribute("aria-label", ok ? "Link copied" : "Copy failed");
        setTimeout(() => btn.removeAttribute("aria-label"), 1200);
      });
    });

    // Commentary save/clear (unchanged)
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
        const key = `notes:${getCanon()}:${getBookSlug()}:${getChapter()}`;
        const cur = (()=>{ try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }})();
        if (val) cur[v] = val; else delete cur[v];
        localStorage.setItem(key, JSON.stringify(cur));
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
        const key = `notes:${getCanon()}:${getBookSlug()}:${getChapter()}`;
        const cur = (()=>{ try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }})();
        delete cur[v];
        localStorage.setItem(key, JSON.stringify(cur));
        const status = textarea.closest(".v-commentary")?.querySelector(".comm-status");
        if (status) status.textContent = "";
      });
    });

    // Outside click/scroll closes hovercard & panels
    document.addEventListener("scroll", hideHovercard, { passive: true });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".lex-btn,.xref-btn,#hovercard,[data-strongs],.lex-inline,.xref-inline,.copy-link-btn,.xref-link")) {
        hideHovercard();
        hideInlinePanels();
      }
    });

    // Hash scroll
    const hash = location.hash.replace(/^#/, "");
    if (hash && /^v\d+$/.test(hash)) {
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        flash(target);
      }
    }
  }

  // Zondervan mini-panel (unchanged)
  async function wireZondervanPanel(){
    const dictRoot = document.getElementById("dictPanel");
    const dictSearch = document.getElementById("dictSearch");
    if (!dictRoot) return;
    const ensureDict = async () => {
      try { const r = await fetch(ZONDERVAN_PATH, { cache: "force-cache" }); if (!r.ok) throw 0; return await r.json(); }
      catch { return null; }
    };
    const doSearch = async (q) => {
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
    };
    if (dictSearch) {
      dictSearch.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(dictSearch.value); });
      dictSearch.addEventListener("change", () => doSearch(dictSearch.value));
    }
  }

  // ---------------- Bootstrap -----------------------------------------------
  async function init() {
    setDynamicTitles();
    const sel = document.getElementById("chSelect");
    if (sel) {
      const count = getChapterCount(getCanon(), getBookSlug());
      sel.innerHTML = Array.from({length: count}, (_,i)=> `<option value="${i+1}">${i+1}</option>`).join("");
      sel.value = String(Math.min(getChapter(), count));
      sel.onchange = () => setChapter(parseInt(sel.value, 10) || 1);
    }

    const prev = document.getElementById("btnPrev");
    const next = document.getElementById("btnNext");
    if (prev) prev.onclick = () => setChapter(Math.max(1, getChapter() - 1));
    if (next) next.onclick = () => setChapter(getChapter() + 1);

    const book = getBookSlug();
    const ch   = getChapter();

    try {
      const data = await fetchChapter(book, ch);
      await renderChapter(data);
      await wireZondervanPanel();

      // Prefetch neighbors
      const base = getSiteBase() || "/israelite-research";
      const canon = getCanon();
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
