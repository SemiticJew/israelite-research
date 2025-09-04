/* apoc-chapter.js
 * Shared reader for all Apocrypha books via /apocrypha/chapter.html?book=<slug>&ch=<n>
 * Data path: /data/apocrypha/<book>/<chapter>.json  (schema: [{v,t,c,s}])
 * Also reads:  /data/apocrypha/<book>/_meta.json   ({"chapters":N, "book":"Display"})
 * Reuses your same UI patterns (lex, xrefs, commentary, hovercards).
 */

(function () {
  const CANON = "apocrypha";
  const BASE_FALLBACK = "/israelite-research";

  // --- tiny helpers copied from your loader ---
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
  function normalizeSlug(s){return String(s||"").toLowerCase().trim().replace(/\s+/g,"-").replace(/[^a-z0-9\-]/g,"");}
  function verseId(n){ return `v${n}`; }
  function stripStrongsMarkers(text){
    let t = String(text || "");
    t = t.replace(/\{[GH]\d{1,5}\}/gi, "").replace(/\{\([GH]\d{1,5}\)\}/gi, "");
    t = t.replace(/\[[GH]\d{1,5}\]/gi, "").replace(/\(([GH])\d{1,5}\)/gi, "");
    t = t.replace(/\s{2,}/g, " ");
    return t.trim();
  }

  // --- hovercard (your improved version) ---
  const hovercard = document.getElementById("hovercard");
  function showHovercardAt(el, html) {
    if (!hovercard || !el) return;
    const rect = el.getBoundingClientRect();
    hovercard.innerHTML = html;
    hovercard.style.position = "fixed";
    hovercard.style.display = "block";
    hovercard.classList.add("open");
    hovercard.setAttribute("aria-hidden", "false");
    const pad = 8;
    let top  = rect.bottom + pad;
    let left = rect.left + rect.width / 2;
    const maxLeft = window.innerWidth - 16;
    const maxTop  = window.innerHeight - 16;
    if (left > maxLeft) left = maxLeft;
    if (top  > maxTop)  top  = Math.max(16, rect.top - hovercard.offsetHeight - pad);
    hovercard.style.left = `${left}px`;
    hovercard.style.top  = `${top}px`;
    hovercard.style.transform = "translateX(-50%)";
  }
  function hideHovercard() {
    if (!hovercard) return;
    hovercard.classList.remove("open");
    hovercard.setAttribute("aria-hidden", "true");
    hovercard.style.display = "none";
    hovercard.style.transform = "";
  }

  // --- routing ---
  function getBase(){ return (location.pathname.includes("/israelite-research/") ? "/israelite-research" : BASE_FALLBACK); }
  function getBookSlug(){
    const qp = new URLSearchParams(location.search);
    return normalizeSlug(qp.get("book") || "");
  }
  function getChapter(){
    const n = parseInt(new URLSearchParams(location.search).get("ch"), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  function setChapter(n){
    const url = new URL(location.href);
    url.searchParams.set("ch", String(n));
    location.href = url.toString();
  }

  // --- data fetch ---
  async function fetchJSON(url, cacheMode="no-store"){
    const r = await fetch(url, { cache: cacheMode });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  async function fetchChapter(book, ch){
    const base = getBase();
    const urls = [
      `${base}/data/${CANON}/${book}/${ch}.json`,
      `/data/${CANON}/${book}/${ch}.json`
    ];
    let lastErr;
    for (const u of urls){
      try{
        const data = await fetchJSON(u, "no-store");
        if (!Array.isArray(data)) throw new Error("Bad chapter format");
        return data;
      }catch(e){ lastErr = e; }
    }
    throw new Error(`Could not load chapter JSON. ${lastErr?.message||"unknown"}`);
  }
  async function fetchMeta(book){
    const base = getBase();
    const urls = [
      `${base}/data/${CANON}/${book}/_meta.json`,
      `/data/${CANON}/${book}/_meta.json`
    ];
    for (const u of urls){
      try{
        const meta = await fetchJSON(u, "force-cache");
        return (meta && typeof meta==="object") ? meta : null;
      }catch{ /* continue */ }
    }
    return null;
  }

  // --- UI titles / crumbs ---
  function setDynamicTitles(meta){
    const book = getBookSlug();
    const ch = getChapter();
    const bookTitle = (meta?.book || book.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()));
    const h1 = document.getElementById("pageTitle");
    const crumbs = document.getElementById("crumbs");
    if (h1) h1.textContent = `${bookTitle} (KJV) — Chapter ${ch}`;
    if (crumbs) crumbs.textContent = `Apocrypha → ${bookTitle} → Chapter ${ch}`;
    document.title = `${bookTitle} — Chapter ${ch}`;
  }

  // --- chapter select (sized by _meta.json if present) ---
  async function populateChapterSelect(){
    const sel = document.getElementById("chSelect");
    if (!sel) return;
    const book = getBookSlug();
    const ch = getChapter();
    const meta = await fetchMeta(book);
    const count = Math.max(1, parseInt(meta?.chapters,10) || ch); // fall back to current if meta missing
    sel.innerHTML = Array.from({length: count}, (_,i)=> `<option value="${i+1}">${i+1}</option>`).join("");
    sel.value = String(Math.min(ch, count));
    sel.onchange = () => setChapter(parseInt(sel.value, 10) || 1);
  }

  // --- render ---
  async function render(){
    const versesEl = document.getElementById("verses");
    const book = getBookSlug();
    const ch   = getChapter();

    // meta → titles
    const meta = await fetchMeta(book);
    setDynamicTitles(meta);
    await populateChapterSelect();

    try {
      const data = await fetchChapter(book, ch);
      if (!Array.isArray(data) || !data.length){
        versesEl.innerHTML = '<p class="muted">No verses found for this chapter.</p>';
        return;
      }
      // render
      versesEl.innerHTML = data.map(v=>{
        const vnum = v.v, text = escapeHtml(stripStrongsMarkers(v.t||""));
        const xrefs = Array.isArray(v.c) ? v.c : [];
        const strongs = Array.isArray(v.s) ? v.s.filter(Boolean) : [];
        const xBtn = xrefs.length
          ? `<button class="xref-btn" data-xref="${escapeHtml(xrefs.join("|"))}">xrefs</button>`
          : `<button class="xref-btn" data-xref="" disabled>xrefs</button>`;
        const lexBtn = strongs.length
          ? `<button class="lex-btn" data-strongs="${escapeHtml(strongs.join("|"))}">lex</button>`
          : `<button class="lex-btn" data-strongs="" disabled>lex</button>`;
        return `
          <div class="verse" data-verse="${vnum}" id="${verseId(vnum)}">
            <div class="vline">
              <span class="vnum">${vnum}</span>
              <span class="vtext">${text}</span>
            </div>
            <div class="v-toolbar">
              ${xBtn}${lexBtn}
              <button class="copy-link-btn" data-verse="${vnum}">link</button>
            </div>
            <div class="lex-inline" style="display:none; padding-left:36px"></div>
            <div class="xref-inline" style="display:none; padding-left:36px"></div>
          </div>
        `;
      }).join("");

      // minimal wiring: copy-link + basic xref open/close + hover preview text-only
      versesEl.querySelectorAll(".copy-link-btn").forEach(b=>{
        b.addEventListener("click",async()=>{
          const url = new URL(location.href); url.hash = `#${verseId(b.getAttribute("data-verse"))}`;
          try{ await navigator.clipboard.writeText(url.toString()); }catch{}
        });
      });

      function hideInline(){ document.querySelectorAll('.lex-inline,.xref-inline').forEach(d=>d.style.display="none"); }

      versesEl.querySelectorAll(".xref-btn").forEach(btn=>{
        btn.addEventListener("click",(e)=>{
          e.stopPropagation(); hideHovercard();
          const verseEl = btn.closest(".verse"); if (!verseEl) return;
          const panel = verseEl.querySelector(".xref-inline");
          if (panel.style.display!=="none"){ panel.style.display="none"; return; }
          hideInline();
          const refs = (btn.getAttribute("data-xref")||"").split("|").filter(Boolean);
          if (!refs.length){ panel.innerHTML = `<p class="muted">No cross references.</p>`; panel.style.display="block"; return; }
          panel.innerHTML = `<p>Cross references: ${refs.map(r=>`<span class="xref-item">${escapeHtml(r)}</span>`).join(", ")}.</p>`;
          panel.style.display="block";
        });
      });

      versesEl.addEventListener("mouseover",(e)=>{
        const el = e.target.closest(".xref-item"); if (!el) return;
        const html = `<div class="vc-head"><span class="vc-ref"><b>${escapeHtml(el.textContent||"")}</b></span></div><div class="vc-text">Preview…</div>`;
        showHovercardAt(el, html);
      });
      versesEl.addEventListener("mouseout",(e)=>{
        if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("#hovercard")) return;
        hideHovercard();
      });

      // prefetch neighbors if meta known
      const base = getBase();
      const next = (meta?.chapters && ch < meta.chapters) ? `${base}/data/${CANON}/${book}/${ch+1}.json` : null;
      const prev = (ch > 1) ? `${base}/data/${CANON}/${book}/${ch-1}.json` : null;
      if (next) fetch(next, { cache: "force-cache" }).catch(()=>{});
      if (prev) fetch(prev, { cache: "force-cache" }).catch(()=>{});

    } catch (err) {
      versesEl.innerHTML = `<p class="muted">Could not load chapter data. ${escapeHtml(err.message)}</p>`;
      console.error(err);
    }
  }

  // nav buttons
  function wireNav(){
    const prev = document.getElementById("btnPrev");
    const next = document.getElementById("btnNext");
    if (prev) prev.onclick = () => setChapter(Math.max(1, getChapter() - 1));
    if (next) next.onclick = () => setChapter(getChapter() + 1);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=>{ wireNav(); render(); }, { once:true });
  } else {
    wireNav(); render();
  }
})();
