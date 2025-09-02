/* nt-chapter.js
 * Shared loader for NT and Tanakh.
 * Expects chapter JSON as: [{ v:number, t:string, c:string[], s:string[] }, ...]
 */

(function () {
  const LEX_ROOT  = "/israelite-research/data/lexicon";

  // ---- Canon / routing helpers ---------------------------------------------
  function getCanon() {
    const qp = new URLSearchParams(location.search).get("canon");
    if (qp) return qp.toLowerCase() === "tanakh" ? "tanakh" : "newtestament";
    const p = location.pathname.toLowerCase();
    if (p.includes("/tanakh/")) return "tanakh";
    return "newtestament";
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

  // ---- Fetch chapter (array of {v,t,c,s}) ----------------------------------
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
      } catch (e) {
        lastErr = e;
        console.warn("[chapter] failed:", url, e.message);
      }
    }
    throw new Error(`Could not load chapter JSON. Last error: ${lastErr?.message || "unknown"}`);
  }

  // ---- Hovercard / Strong's -------------------------------------------------
  const hovercard = document.getElementById("hovercard");
  let strongsCache = Object.create(null);
  async function lookupStrongs(code) {
    if (strongsCache[code]) return strongsCache[code];
    const isHeb = /^H\d+/i.test(code);
    const isGrk = /^G\d+/i.test(code);
    const file  = isHeb ? "strongs-hebrew.json" : (isGrk ? "strongs-greek.json" : null);
    if (!file) return (strongsCache[code] = { code, gloss: "", def: "" });
    try {
      if (!strongsCache["__" + file]) {
        const resp = await fetch(`${LEX_ROOT}/${file}`, { cache: "force-cache" });
        strongsCache["__" + file] = resp.ok ? await resp.json() : {};
      }
      const lex = strongsCache["__" + file] || {};
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

  // ---- Renderer -------------------------------------------------------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
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

  function renderChapter(chapterData) {
    const versesEl = document.getElementById("verses");
    if (!versesEl) return;

    if (!Array.isArray(chapterData) || !chapterData.length) {
      versesEl.innerHTML = '<p class="muted">No verses found for this chapter.</p>';
      return;
    }

    const html = chapterData.map(v => {
      const vnum = Number.isFinite(v.v) ? v.v : "";
      const text = escapeHtml(v.t || "");
      const strongs = Array.isArray(v.s) ? v.s : [];
      const xrefs = Array.isArray(v.c) ? v.c : [];

      const sBadges = strongs.map(tag =>
        `<span class="badge" data-strong="${escapeHtml(tag)}" title="Strong’s ${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
      ).join("");

      const xBtn = xrefs.length
        ? `<button class="xref-btn" data-xref="${escapeHtml(xrefs.join("|"))}" title="See cross references">xrefs</button>`
        : "";

      return `
        <div class="verse" data-verse="${vnum}">
          <span class="vnum">${vnum}</span>
          <span class="vtext">${text} ${sBadges}</span>
          <div class="v-actions">${xBtn}</div>
        </div>
      `;
    }).join("");

    versesEl.innerHTML = html;

    // Strong’s hover
    versesEl.querySelectorAll(".badge[data-strong]").forEach(badge => {
      badge.addEventListener("mouseenter", async () => {
        const code = badge.getAttribute("data-strong");
        const rect = badge.getBoundingClientRect();
        const info = await lookupStrongs(code);
        const body = `
          <div><strong>${escapeHtml(info.code || code)}</strong>${info.gloss ? ` — ${escapeHtml(info.gloss)}` : ""}</div>
          ${info.def ? `<div class="muted" style="margin-top:.25rem">${escapeHtml(info.def)}</div>` : ""}
        `;
        showHovercard(rect.left + rect.width / 2, rect.top + window.scrollY, body);
      });
      badge.addEventListener("mouseleave", hideHovercard);
    });

    // Cross-refs
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

    document.addEventListener("scroll", hideHovercard, { passive: true });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".badge,[data-xref],#hovercard")) hideHovercard();
    });

    // Populate lexicon panel with unique codes in chapter
    const lexEl = document.getElementById("lexicon");
    if (lexEl) {
      const codes = Array.from(new Set(
        chapterData.flatMap(v => Array.isArray(v.s) ? v.s : [])
      ));
      if (!codes.length) {
        lexEl.innerHTML = '<p class="muted">No Strong’s tags in this chapter.</p>';
      } else {
        lexEl.innerHTML = `<ul class="lex">${codes.map(c => `<li><a href="#" class="lex-link" data-strong="${escapeHtml(c)}">${escapeHtml(c)}</a></li>`).join("")}</ul>`;
        lexEl.querySelectorAll(".lex-link").forEach(a => {
          a.addEventListener("click", async (e) => {
            e.preventDefault();
            const code = a.getAttribute("data-strong");
            const info = await lookupStrongs(code);
            alert(`${info.code}\n${info.gloss || ""}\n${info.def || ""}`.trim());
          });
        });
      }
    }
  }

  // ---- Bootstrap ------------------------------------------------------------
  async function init() {
    setDynamicTitles();

    const prev = document.getElementById("btnPrev");
    const next = document.getElementById("btnNext");
    const sel  = document.getElementById("chSelect");
    if (prev) prev.onclick = () => setChapter(Math.max(1, getChapter() - 1));
    if (next) next.onclick = () => setChapter(getChapter() + 1);

    const book = getBookSlug();
    const ch   = getChapter();

    if (sel) {
      sel.value = String(ch);
      sel.onchange = () => setChapter(parseInt(sel.value, 10) || 1);
    }

    try {
      const data = await fetchChapter(book, ch);
      renderChapter(data);
      // Prefetch neighbors for snappier nav
      const canon = getCanon();
      const base = getSiteBase() || "/israelite-research";
      const nextUrl = `${base}/data/${canon}/${book}/${ch + 1}.json`;
      const prevUrl = ch > 1 ? `${base}/data/${canon}/${book}/${ch - 1}.json` : null;
      try { fetch(nextUrl, { cache: "force-cache" }); } catch {}
      if (prevUrl) try { fetch(prevUrl, { cache: "force-cache" }); } catch {}
    } catch (err) {
      const versesEl = document.getElementById("verses");
      if (versesEl) {
        versesEl.innerHTML = `<p class="muted">Could not load chapter data. ${escapeHtml(err.message)}</p>`;
      }
      console.error(err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  // Expose for debugging
  window.__chapter = { getCanon, getBookSlug, getChapter };
})();
