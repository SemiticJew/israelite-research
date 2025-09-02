/* nt-chapter.js
 * Shared loader for NT and Tanakh.
 * Expects chapter JSON as: [{ v:number, t:string, c:string[], s:string[] }, ...]
 * Right panel: Insight Bible Dictionary (search Strong's by code or gloss/def).
 * Per-verse note button opens an editor saved to localStorage.
 */

(function () {
  const LEX_ROOT  = "/israelite-research/data/lexicon";
  const DEFAULT_MAX_CH = 150;

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

  // ---------------- Strong's / Lexicon ----------------
  let strongsCache = Object.create(null);
  let lexiconCache = { "strongs-hebrew.json": null, "strongs-greek.json": null };

  async function loadLexicon(which /* "hebrew" | "greek" */) {
    const file = which === "hebrew" ? "strongs-hebrew.json" : "strongs-greek.json";
    if (lexiconCache[file]) return lexiconCache[file];
    const resp = await fetch(`${LEX_ROOT}/${file}`, { cache: "force-cache" });
    if (!resp.ok) return {};
    const json = await resp.json();
    lexiconCache[file] = json || {};
    return lexiconCache[file];
  }

  async function lookupStrongs(code) {
    if (strongsCache[code]) return strongsCache[code];
    const isHeb = /^H\d+/i.test(code);
    const isGrk = /^G\d+/i.test(code);
    if (!isHeb && !isGrk) return (strongsCache[code] = { code, gloss: "", def: "" });
    const file = isHeb ? "strongs-hebrew.json" : "strongs-greek.json";
    try {
      if (!lexiconCache[file]) {
        const resp = await fetch(`${LEX_ROOT}/${file}`, { cache: "force-cache" });
        lexiconCache[file] = resp.ok ? await resp.json() : {};
      }
      const lex = lexiconCache[file] || {};
      const entry = lex[code] || lex[String(code).toUpperCase()] || lex[String(code).toLowerCase()] || {};
      return (strongsCache[code] = {
        code,
        gloss: entry.gloss || entry.translation || "",
        def: entry.def || entry.definition || entry.meaning || ""
      });
    } catch {
      return (strongsCache[code] = { code, gloss: "", def: "" });
    }
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

  // ---------------- Renderer ----------------
  // per-verse notes (localStorage)
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

  function renderChapter(chapterData) {
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
        ? `<button class="xref-btn" data-xref="${escapeHtml(xrefs.join("|"))}" title="See cross references">xrefs</button>`
        : "";

      const lexBtn = strongs.length
        ? `<button class="lex-btn" data-strongs="${escapeHtml(strongs.join("|"))}" title="Strong’s for this verse">lex</button>`
        : `<button class="lex-btn" data-strongs="" disabled title="No Strong’s in this verse">lex</button>`;

      const noteBtn = `<button class="note-btn" data-verse="${vnum}" title="Add personal commentary">note</button>`;
      const hasNote = (notes[String(vnum)] || "").trim().length > 0;

      return `
        <div class="verse" data-verse="${vnum}">
          <span class="vnum">${vnum}</span>
          <span class="vtext">${text}</span>
          <div class="v-actions">
            ${xBtn}
            ${lexBtn}
            ${noteBtn}
          </div>
          ${hasNote ? `<div class="muted" style="font-size:.85rem;margin-top:.2rem">📝 note saved</div>` : ""}
        </div>
      `;
    }).join("");

    versesEl.innerHTML = html;

    // xrefs
    versesEl.querySelectorAll(".xref-btn[data-xref]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const refs = (btn.getAttribute("data-xref") || "").split("|").filter(Boolean);
        if (!refs.length) return;
        const list = refs.map(r => `<li>${escapeHtml(r)}</li>`).join("");
        const rect = btn.getBoundingClientRect();
        showHovercard(rect.left + rect.width / 2, rect.top + window.scrollY, `<ul class="lex">${list}</ul>`);
      });
    });

    // lex per-verse
    versesEl.querySelectorAll(".lex-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const codes = (btn.getAttribute("data-strongs") || "").split("|").filter(Boolean);
        if (!codes.length) return;
        const rect = btn.getBoundingClientRect();
        const listHtml = `<ul class="lex">${codes.map(c => `<li><a href="#" class="lex-code" data-code="${escapeHtml(c)}">${escapeHtml(c)}</a></li>`).join("")}</ul>`;
        showHovercard(rect.left + rect.width / 2, rect.top + window.scrollY, listHtml);

        const hc = document.getElementById("hovercard");
        if (hc) {
          hc.querySelectorAll('.lex-code[data-code]').forEach(a => {
            a.addEventListener('click', async (ev) => {
              ev.preventDefault();
              const code = a.getAttribute('data-code');
              const info = await lookupStrongs(code);
              const body = `
                <div><strong>${escapeHtml(info.code || code)}</strong>${info.gloss ? ` — ${escapeHtml(info.gloss)}` : ""}</div>
                ${info.def ? `<div class="muted" style="margin-top:.25rem">${escapeHtml(info.def)}</div>` : ""}
                <div style="margin-top:.4rem"><a href="#" id="hc-back">◀ back</a></div>
              `;
              showHovercard(rect.left + rect.width / 2, rect.top + window.scrollY, body);
              const back = document.getElementById('hc-back');
              if (back) back.addEventListener('click', (ee) => { ee.preventDefault(); showHovercard(rect.left + rect.width / 2, rect.top + window.scrollY, listHtml); });
            });
          });
        }
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
          // mark verse as saved
          const verseEl = btn.closest(".verse");
          if (verseEl) {
            let mark = verseEl.querySelector(".note-mark");
            if (!mark) {
              mark = document.createElement("div");
              mark.className = "note-mark muted";
              mark.style.cssText = "font-size:.85rem;margin-top:.2rem";
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

    // ----- Insight Bible Dictionary (right panel) -----
    const dictRoot = document.getElementById("dictPanel");
    const dictSearch = document.getElementById("dictSearch");
    if (dictRoot) {
      dictRoot.innerHTML = '<p class="muted">Type a Strong’s code (e.g., H7225, G3056) or an English term to search.</p>';
      const canon = getCanon();
      const which = canon === "tanakh" ? "hebrew" : "greek";
      let lex = null;

      async function ensureLex() { if (!lex) lex = await loadLexicon(which); return lex || {}; }

      async function doSearch(q) {
        q = (q || "").trim();
        if (!q) { dictRoot.innerHTML = '<p class="muted">Enter a query above.</p>'; return; }

        const L = await ensureLex();

        // If query looks like a code:
        if (/^[HG]\d{1,5}$/i.test(q)) {
          const code = q.toUpperCase();
          const hit = L[code];
          if (!hit) { dictRoot.innerHTML = `<p class="muted">No entry for ${escapeHtml(code)}.</p>`; return; }
          const gloss = hit.gloss || hit.translation || "";
          const def = hit.def || hit.definition || hit.meaning || "";
          dictRoot.innerHTML = `
            <div><strong>${escapeHtml(code)}</strong>${gloss ? ` — ${escapeHtml(gloss)}` : ""}</div>
            ${def ? `<div class="muted" style="margin-top:.35rem">${escapeHtml(def)}</div>` : ""}
          `;
          return;
        }

        // Term search over gloss/definition
        const term = q.toLowerCase();
        const results = [];
        for (const [code, entry] of Object.entries(L)) {
          const gloss = (entry.gloss || entry.translation || "").toString();
          const def = (entry.def || entry.definition || entry.meaning || "").toString();
          if (gloss.toLowerCase().includes(term) || def.toLowerCase().includes(term)) {
            results.push({ code, gloss, def });
            if (results.length >= 50) break; // cap results
          }
        }
        if (!results.length) { dictRoot.innerHTML = `<p class="muted">No results for “${escapeHtml(q)}”.</p>`; return; }
        dictRoot.innerHTML = `
          <ul class="lex">
            ${results.map(r => `<li><a href="#" class="dict-code" data-code="${escapeHtml(r.code)}"><strong>${escapeHtml(r.code)}</strong>${r.gloss ? ` — ${escapeHtml(r.gloss)}` : ""}</a></li>`).join("")}
          </ul>
        `;
        dictRoot.querySelectorAll(".dict-code").forEach(a => {
          a.addEventListener("click", async (e) => {
            e.preventDefault();
            const code = a.getAttribute("data-code");
            const entry = L[code] || {};
            const gloss = entry.gloss || entry.translation || "";
            const def = entry.def || entry.definition || entry.meaning || "";
            dictRoot.innerHTML = `
              <div style="margin-bottom:.5rem"><a href="#" id="dict-back">◀ back</a></div>
              <div><strong>${escapeHtml(code)}</strong>${gloss ? ` — ${escapeHtml(gloss)}` : ""}</div>
              ${def ? `<div class="muted" style="margin-top:.35rem">${escapeHtml(def)}</div>` : ""}
            `;
            const back = document.getElementById("dict-back");
            if (back) back.addEventListener("click", (ev) => { ev.preventDefault(); doSearch(q); });
          });
        });
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
      renderChapter(data);

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

    document.addEventListener("scroll", hideHovercard, { passive: true });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".lex-btn,.xref-btn,.note-btn,#hovercard")) hideHovercard();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
