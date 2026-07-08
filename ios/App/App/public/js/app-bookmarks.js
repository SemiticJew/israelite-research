/* Semitic Jew App: Local Scripture Bookmarks */
(function(){
  const STORAGE_KEY = "sj_scripture_bookmarks_v1";
  const MAX_BOOKMARKS = 50;

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

  function readBookmarks(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function writeBookmarks(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_BOOKMARKS)));
  }

  function currentChapterItem(){
    if(!/\/chapter\.html$/i.test(window.location.pathname)) return null;

    const params = new URLSearchParams(window.location.search);
    const canon = getCanonFromPath();
    const book = params.get("book") || "";
    const ch = params.get("ch") || "1";

    if(!canon || !book) return null;

    const bookTitle =
      document.querySelector(".page-title")?.textContent?.trim() ||
      titleCaseSlug(book);

    return {
      canon,
      canonLabel: canonLabel(canon),
      book,
      bookTitle,
      chapter: String(ch),
      title: `${bookTitle} ${ch}`,
      url: `${window.location.pathname}?book=${encodeURIComponent(book)}&ch=${encodeURIComponent(ch)}`,
      savedAt: new Date().toISOString()
    };
  }

  function isBookmarked(item){
    if(!item) return false;
    return readBookmarks().some(b => b.url === item.url);
  }

  function toggleBookmark(item){
    if(!item) return false;

    const bookmarks = readBookmarks();
    const exists = bookmarks.some(b => b.url === item.url);

    if(exists){
      writeBookmarks(bookmarks.filter(b => b.url !== item.url));
      return false;
    }

    writeBookmarks([{...item, savedAt:new Date().toISOString()}, ...bookmarks]);
    return true;
  }

  function addReaderButton(){
    const item = currentChapterItem();
    if(!item) return;

    if(document.querySelector(".sj-bookmark-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn sj-bookmark-btn";
    btn.textContent = isBookmarked(item) ? "bookmarked" : "bookmark";
    btn.title = "Save this chapter to your app bookmarks";
    btn.setAttribute("aria-pressed", String(isBookmarked(item)));

    btn.addEventListener("click", function(){
      const active = toggleBookmark(item);
      btn.textContent = active ? "bookmarked" : "bookmark";
      btn.setAttribute("aria-pressed", String(active));
      btn.classList.toggle("saved", active);
    });

    btn.classList.toggle("saved", isBookmarked(item));

    const target =
      document.querySelector(".reader-actions") ||
      document.querySelector(".chapter-tools") ||
      document.querySelector(".toolbar") ||
      document.querySelector(".page-header");

    if(target){
      target.appendChild(btn);
    }
  }

  function renderBookmarksDashboard(){
    const root = document.getElementById("app-bookmarks");
    if(!root) return;

    const bookmarks = readBookmarks();

    if(!bookmarks.length){
      root.innerHTML = `
        <section class="app-bookmarks-shell empty" aria-label="Saved Scripture">
          <div class="app-bookmarks-head">
            <span class="label">Saved Scripture</span>
            <h2>No bookmarks saved yet.</h2>
            <p>Open a Scripture chapter and tap “bookmark” to save it here.</p>
          </div>
          <a class="app-bookmark-main-btn" href="/biblia.html">Open Biblia</a>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="app-bookmarks-shell" aria-label="Saved Scripture">
        <div class="app-bookmarks-head">
          <span class="label">Saved Scripture</span>
          <h2>Your saved chapters</h2>
          <p>These bookmarks are stored locally on this device.</p>
        </div>

        <div class="app-bookmarks-grid">
          ${bookmarks.map(item => `
            <article class="app-bookmark-card">
              <a href="${item.url}">
                <strong>${escapeHTML(item.title)}</strong>
                <span>${escapeHTML(item.canonLabel)}</span>
              </a>
              <button type="button" data-remove-bookmark="${escapeHTML(item.url)}">Remove</button>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    root.querySelectorAll("[data-remove-bookmark]").forEach(btn => {
      btn.addEventListener("click", function(){
        const url = btn.getAttribute("data-remove-bookmark");
        writeBookmarks(readBookmarks().filter(item => item.url !== url));
        renderBookmarksDashboard();
      });
    });
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
    addReaderButton();
    renderBookmarksDashboard();
  });
})();
