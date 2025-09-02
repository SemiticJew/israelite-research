/* nt-chapter.js — minimal renderer: just verses (v + t) */

(function () {
  // --- Routing helpers ---
  function getBookSlug() {
    const qp = new URLSearchParams(location.search).get("book");
    if (qp) return qp.toLowerCase();
    const parts = location.pathname.split("/").filter(Boolean);
    const i = parts.findIndex(p => p.toLowerCase() === "newtestament");
    return (i >= 0 && parts[i + 1]) ? decodeURIComponent(parts[i + 1]).toLowerCase() : "";
  }
  function getChapter() {
    const m = new URLSearchParams(location.search).get("ch");
    const n = parseInt(m, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  // --- Robust fetch (tries relative + absolute project paths) ---
  async function fetchChapter(book, ch) {
    const rel1  = new URL(`../data/newtestament/${book}/${ch}.json`, location.href).pathname;
    const rel2  = new URL(`../../data/newtestament/${book}/${ch}.json`, location.href).pathname;
    const base  = (() => {
      const p = location.pathname.replace(/\/+$/,'');
      const i = p.toLowerCase().indexOf("/newtestament/");
      return i > -1 ? p.slice(0, i) : "";
    })() || "/israelite-research";
    const abs1  = `${base}/data/newtestament/${book}/${ch}.json`;
    const abs2  = `/israelite-research/data/newtestament/${book}/${ch}.json`;
    const abs3  = `/data/newtestament/${book}/${ch}.json`;
    const candidates = [rel1, rel2, abs1, abs2, abs3];

    let lastErr;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Chapter JSON must be an array of {v,t,c,s}");
        return data;
      } catch (e) { lastErr = e; }
    }
    throw new Error(`Could not load chapter JSON. Last error: ${lastErr?.message || "unknown"}`);
  }

  // --- Minimal renderer (verses only) ---
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }
  function renderChapter(chapterData) {
    const versesEl = document.getElementById("verses");
    if (!versesEl) return;
    if (!Array.isArray(chapterData) || !chapterData.length) {
      versesEl.innerHTML = '<p class="muted">No verses found for this chapter.</p>';
      return;
    }
    versesEl.innerHTML = chapterData.map(v => `
      <div class="verse" data-verse="${Number.isFinite(v.v) ? v.v : ''}">
        <span class="vnum">${escapeHtml(String(v.v))}</span>
        <span class="vtext">${escapeHtml(v.t || "")}</span>
      </div>
    `).join("");
  }

  // --- Dynamic title/crumbs (book + chapter) ---
  function setTitles() {
    const qp = new URLSearchParams(location.search);
    const bookSlug = (qp.get('book') || '').toLowerCase();
    const ch = parseInt(qp.get('ch') || '1', 10) || 1;
    const toTitle = (slug) => slug
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map(w => /^\d+$/.test(w) ? w : (w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
    const bookTitle = bookSlug ? toTitle(bookSlug) : "New Testament";
    const h1 = document.getElementById('pageTitle');
    const crumbs = document.getElementById('crumbs');
    if (h1) h1.textContent = `${bookTitle} (KJV) — Chapter ${ch}`;
    if (crumbs) crumbs.textContent = `New Testament → ${bookTitle} → Chapter ${ch}`;
    document.title = `${bookTitle} — Chapter ${ch}`;
  }

  // --- Boot ---
  async function init() {
    setTitles();
    const book = getBookSlug();
    const ch = getChapter();
    try {
      const data = await fetchChapter(book, ch);
      renderChapter(data);
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
})();
