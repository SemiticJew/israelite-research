/* Semitic Jew App: Continue Reading + Recent Chapters */
(function(){
  const STORAGE_KEY = "sj_reading_history_v1";
  const MAX_RECENTS = 8;

  function titleCaseSlug(slug){
    return String(slug || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function canonLabel(canon){
    const map = {
      tanakh: "Tanakh",
      newtestament: "New Testament",
      apocrypha: "Apocrypha"
    };
    return map[canon] || titleCaseSlug(canon);
  }

  function getCanonFromPath(){
    const path = window.location.pathname.toLowerCase();
    if(path.includes("/tanakh/")) return "tanakh";
    if(path.includes("/newtestament/")) return "newtestament";
    if(path.includes("/apocrypha/")) return "apocrypha";
    return "";
  }

  function readHistory(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function writeHistory(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  }

  function saveCurrentChapter(){
    if(!/\/chapter\.html$/i.test(window.location.pathname)) return;

    const params = new URLSearchParams(window.location.search);
    const canon = getCanonFromPath();
    const book = params.get("book") || "";
    const ch = params.get("ch") || "1";

    if(!canon || !book) return;

    const bookTitle =
      document.querySelector(".page-title")?.textContent?.trim() ||
      titleCaseSlug(book);

    const item = {
      canon,
      canonLabel: canonLabel(canon),
      book,
      bookTitle,
      chapter: String(ch),
      title: `${bookTitle} ${ch}`,
      url: `${window.location.pathname}?book=${encodeURIComponent(book)}&ch=${encodeURIComponent(ch)}`,
      savedAt: new Date().toISOString()
    };

    const existing = readHistory().filter(old => old.url !== item.url);
    writeHistory([item, ...existing]);
  }

  function renderDashboard(){
    const root = document.getElementById("app-reading-history");
    if(!root) return;

    const history = readHistory();

    if(!history.length){
      root.innerHTML = `
        <section class="app-reading-shell empty" aria-label="Continue reading">
          <div class="app-reading-head">
            <span class="label">Continue Reading</span>
            <h2>Start reading Scripture in Biblia.</h2>
            <p>Open a chapter from the Tanakh, New Testament, or Apocrypha, and your recent reading will appear here automatically.</p>
          </div>
          <a class="app-reading-btn primary" href="/biblia.html">Open Biblia</a>
        </section>
      `;
      return;
    }

    const latest = history[0];
    const recents = history.slice(1, MAX_RECENTS);

    root.innerHTML = `
      <section class="app-reading-shell" aria-label="Continue reading">
        <div class="app-reading-head">
          <span class="label">Continue Reading</span>
          <h2>${escapeHTML(latest.title)}</h2>
          <p>${escapeHTML(latest.canonLabel)} · Resume your latest Scripture reading location.</p>
        </div>
        <a class="app-reading-btn primary" href="${latest.url}">Resume Chapter</a>

        ${recents.length ? `
          <div class="app-recents">
            <div class="app-recents-title">Recent Chapters</div>
            <div class="app-recents-grid">
              ${recents.map(item => `
                <a class="app-recent-card" href="${item.url}">
                  <strong>${escapeHTML(item.title)}</strong>
                  <span>${escapeHTML(item.canonLabel)}</span>
                </a>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </section>
    `;
  }

  function escapeHTML(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("DOMContentLoaded", function(){
    saveCurrentChapter();
    renderDashboard();
  });
})();
