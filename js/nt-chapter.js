/* nt-chapter.js
 * Shared loader for NT and Tanakh.
 * Renders verse toolbar (note / xrefs / lex) UNDER each verse line.
 * Right panel = Zondervan Dictionary search (optional local JSON).
 * Chapter select fixed and populated.
 * Expects chapter JSON: [{ v:number, t:string, c:string[], s:string[] }, ...]
 */

(function () {
  const DEFAULT_MAX_CH = 150;
  const ZONDERVAN_PATH = "/israelite-research/data/dictionaries/zondervan.json"; // optional local data

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
  const hovercard = document.getElementById("hovercard");
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
  function setDynamicTitles() {
    const canon = getCanon();
    const canonTitle = canon === "tanakh" ? "Tanakh" : "New Testament";
    const bookSlug = getBookSlug();
    const bookTitle = titleCaseFromSlug(bookSlug) || canonTitle;
    const ch = getChapter();
    const h1 = document.getElementById("pageTitle");
    const crumbs = document.getElementById("crumbs");
    if (h1) h1.textContent = `${bookTitle} (KJV) — Chapter ${ch}`;
    if (crumbs) crumbs.textContent = `${canonTitle} → ${bookTitle} → Chapter ${ch}`;
    document.title = `${bookTitle} — Chapter ${ch}`;
  }
  function populateChapterSelect(current) {
    const sel = document.getElementById("chSelect");
    if (!sel) return;
    const bodyMax = parseInt(document.body.getAttribute("data-max-chapters") || "", 10);
    const globalMax = (typeof window !== "undefined" && Number.isFinite(window.CHAPTER_COUNT)) ? window.CHAPTER_COUNT : null;
    const max = Number.isFinite(bodyMax) && bodyMax > 0 ? bodyMax
             : (Number.isFinite(globalMax) && globalMax > 0 ? globalMax : DEFAULT_MAX_CH);
    if (!sel.options.length) {
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= max; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = String(i);
        frag.appendChild(opt);
      }
      sel.appendChild(frag);
    }
    sel.value = String(current);
    sel.onchange = () => setChapter(parseInt(sel.value, 10) || 1);
  }

  // ---------------- Per-verse notes storage ----------------
  function notesKey(canon, book, ch) {
    return `notes:${canon}:${book}:${ch}`;
  }
  function loadNotes(canon, book, ch) {
    try { return JSON.parse(localStorage.getItem(notesKey(canon, book, ch)) || "{}"); }
    catch { return {}; }
  }
  function saveNotes(canon, book, ch, data) {
    localStorage.setItem(notesKey(canon, book, ch), JSON.stringify(data));
  }

  // ---------------- Renderer ----------------
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

      const xBtn = xrefs.length
        ? `<button class="xref-btn" data-xref="${escapeHtml(xrefs.join("|"))}" title="Cross references">xrefs</button>`
        : `<button class="xref-btn" data-xref="" disabled title="No cross references">xrefs</button>`;

      const lexBtn = strongs.length
        ? `<button class="lex-btn" data-strongs="${escapeHtml(strongs.join("|"))}" title="Lexical info for this verse">lex</button>`
        : `<button class="lex-btn" data-strongs="" disabled title="No lexical tags">lex</button>`;

      const noteBtn = `<button class="note-btn" data-verse="${vnum}" title="Add personal commentary">note</button>`;
      const hasNote = (notes[String(vnum)] || "").trim().length > 0;

      return `
        <div class="verse" data-verse="${vnum}">
          <div class="vline">
            <span class="vnum">${vnum}</span>
            <span class="vtext">${text}</span>
          </div>
          <div class="v-toolbar">
            ${noteBtn}
            ${xBtn}
            ${lexBtn}
          </div>
          ${hasNote ? `<div class="muted" style="font-size:.85rem; padding-left:36px">📝 note saved</div>` : ""}
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

    // lex list hover (no right-panel Strong's; lightweight inline)
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

    // per-verse note editor
    versesEl.querySelectorAll(".note-btn[data-verse]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = String(btn.getAttribute("data-verse") || "").trim();
        const rect = btn.getBoundingClientRect();
        const existing = notes[v] || "";
        const editor = `
          <div style="width:min(420px,90vw)">
            <div style="font-weight:700;margin-bottom:.35rem">Commentary — v${escapeHtml(v)}</div>
            <textarea id="hc-note" style="width:100%;min-height:140px;border:1px solid #DBE4EE;border-radius:10px;padding:.6rem">${escapeHtml(existing)}</textarea>
            <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem">
              <button id="hc-save" class="vc-btn">Save</button>
              <button id="hc-clear" class="vc-btn">Clear</button>
              <button id="hc-close" class="vc-btn">Close</button>
            </div>
          </div>
        `;
        showHovercard(rect.left + rect.width / 2, rect.top + window.scrollY, editor);

        const hc = document.getElementById("hovercard");
        if (!hc) return;
        hc.querySelector("#hc-save").addEventListener("click", () => {
          const val = (hc.querySelector("#hc-note").value || "").trim();
          if (val) notes[v] = val; else delete notes[v];
          saveNotes(canon, book, ch, notes);
          hideHovercard();
          const verseEl = btn.closest(".verse");
          if (verseEl) {
            let mark = verseEl.querySelector(".note-mark");
            if (!mark) {
              mark = document.createElement("div");
              mark.className = "note-mark muted";
              mark.style.cssText = "font-size:.85rem; padding-left:36px";
              verseEl.appendChild(mark);
            }
            mark.textContent = val ? "📝 note saved" : "";
          }
        });
        hc.querySelector("#hc-clear").addEventListener("click", () => {
          delete notes[v];
          saveNotes(canon, book, ch, notes);
          const ta = hc.querySelector("#hc-note"); if (ta) ta.value = "";
        });
        hc.querySelector("#hc-close").addEventListener("click", hideHovercard);
      });
    });

    document.addEventListener("scroll", hideHovercard, { passive: true });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".lex-btn,.xref-btn,.note-btn,#hovercard")) hideHovercard();
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
