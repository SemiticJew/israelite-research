/* Semitic Jew App: No Private Interpretation / Study Notes Index */
(function(){
  const STORAGE_KEY = "sj_no_private_interpretation_v1";
  const MAX_ITEMS = 300;

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

  function readItems(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function writeItems(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  }

  function saveItem(item){
    const existing = readItems().filter(old => old.key !== item.key);
    writeItems([{...item, updatedAt:new Date().toISOString()}, ...existing]);
  }

  function removeItem(key){
    writeItems(readItems().filter(item => item.key !== key));
  }

  function currentChapterContext(){
    if(!/\/chapter\.html$/i.test(window.location.pathname)) return null;

    const params = new URLSearchParams(window.location.search);
    const canon = getCanonFromPath();
    const book = params.get("book") || "";
    const ch = params.get("ch") || "1";

    if(!canon || !book) return null;

    const pageTitle =
      document.querySelector(".page-title")?.textContent?.trim() ||
      titleCaseSlug(book);

    return {
      canon,
      canonLabel: canonLabel(canon),
      book,
      bookTitle: pageTitle,
      chapter: String(ch),
      chapterUrl: `${window.location.pathname}?book=${encodeURIComponent(book)}&ch=${encodeURIComponent(ch)}`
    };
  }

  function getVerseNumber(verseEl){
    if(!verseEl) return "";

    const candidates = [
      verseEl.dataset && verseEl.dataset.v,
      verseEl.dataset && verseEl.dataset.verse,
      verseEl.getAttribute && verseEl.getAttribute("data-v"),
      verseEl.getAttribute && verseEl.getAttribute("data-verse"),
      verseEl.id && verseEl.id.replace(/^v/i, "")
    ];

    for(const c of candidates){
      const n = String(c || "").match(/\d+/);
      if(n) return n[0];
    }

    const label = verseEl.querySelector?.(".vnum, .verse-num, .verse-number, sup")?.textContent || "";
    const n = String(label).match(/\d+/);
    return n ? n[0] : "";
  }

  function findVerseElement(from){
    if(!from) return null;

    const selectors = [
      ".verse[data-v]",
      ".verse[data-verse]",
      ".v[data-v]",
      ".v[data-verse]",
      "[data-v]",
      "[data-verse]",
      ".verse",
      ".v"
    ];

    let el = from;

    while(el && el !== document.body){
      if(el.matches && selectors.some(sel => el.matches(sel))){
        const id = (el.id || "").toLowerCase();
        const className = String(el.className || "").toLowerCase();

        if(id !== "verses" && id !== "verse-list" && id !== "chapter" && id !== "scripture" &&
           !className.includes("verses") &&
           !className.includes("chapter-body") &&
           !className.includes("reader-body") &&
           getVerseNumber(el)){
          return el;
        }
      }

      el = el.parentElement;
    }

    return null;
  }

  function keyFor(ctx, verse){
    return `${ctx.canon}:${ctx.book}:${ctx.chapter}:${verse}`;
  }

  function bindStudyNoteTextareas(){
    const ctx = currentChapterContext();
    if(!ctx) return;

    const textareas = document.querySelectorAll(".v-panel.cm textarea, .v-panel.cm .exposition-text, textarea.exposition-text");

    textareas.forEach(textarea => {
      if(textarea.dataset.npiBound === "true") return;

      const panel = textarea.closest(".v-panel.cm") || textarea.closest(".v-panel") || textarea.parentElement;
      const verseEl = findVerseElement(panel || textarea);
      const verse = getVerseNumber(verseEl);

      if(!verse) return;

      textarea.dataset.npiBound = "true";

      const key = keyFor(ctx, verse);

      function sync(){
        const value = (textarea.value || textarea.textContent || "").trim();

        if(!value){
          removeItem(key);
          return;
        }

        saveItem({
          key,
          canon: ctx.canon,
          canonLabel: ctx.canonLabel,
          book: ctx.book,
          bookTitle: ctx.bookTitle,
          chapter: ctx.chapter,
          verse,
          title: `${ctx.bookTitle} ${ctx.chapter}:${verse}`,
          url: `${ctx.chapterUrl}#v${verse}`,
          exposition: value
        });
      }

      textarea.addEventListener("input", debounce(sync, 400));
      textarea.addEventListener("change", sync);
      textarea.addEventListener("blur", sync);

      sync();
    });
  }

  function debounce(fn, wait){
    let t;
    return function(){
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  function renderDashboard(){
    const root = document.getElementById("app-expositions");
    if(!root) return;

    const items = readItems();

    if(!items.length){
      root.innerHTML = `
        <section class="app-expositions-shell empty" aria-label="No Private Interpretation">
          <div class="app-expositions-head">
            <span class="label">No Private Interpretation</span>
            <h2>No saved study notes yet.</h2>
            <p>Open a Scripture chapter, tap “study notes,” and write your personal exposition. Saved expositions will appear here.</p>
          </div>
          <a class="app-exposition-main-btn" href="/biblia.html">Open Biblia</a>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="app-expositions-shell" aria-label="No Private Interpretation">
        <div class="app-expositions-head">
          <span class="label">No Private Interpretation</span>
          <h2>Your personal expositions</h2>
          <p>These study notes are stored locally on this device from the reader’s “study notes” panel.</p>
        </div>

        <div class="app-expositions-grid">
          ${items.map(item => `
            <article class="app-exposition-card">
              <a href="${escapeHTML(item.url)}">
                <strong>${escapeHTML(item.title)}</strong>
                <span>${escapeHTML(item.canonLabel)}</span>
                <p>${escapeHTML(shorten(item.exposition, 240))}</p>
              </a>
              <button type="button" data-remove-exposition="${escapeHTML(item.key)}">Remove</button>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    root.querySelectorAll("[data-remove-exposition]").forEach(btn => {
      btn.addEventListener("click", function(){
        const key = btn.getAttribute("data-remove-exposition");
        removeItem(key);
        renderDashboard();
      });
    });
  }

  function bootstrap(){
    bindStudyNoteTextareas();
    renderDashboard();
  }

  function shorten(value, length){
    const text = String(value || "").trim();
    if(text.length <= length) return text;
    return text.slice(0, length).trim() + "…";
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
    bootstrap();

    const readerRoot = document.querySelector("main") || document.body;

    if(readerRoot && /\/chapter\.html$/i.test(window.location.pathname)){
      let tries = 0;
      const observer = new MutationObserver(function(){
        tries += 1;
        bindStudyNoteTextareas();

        if(tries > 80){
          observer.disconnect();
        }
      });

      observer.observe(readerRoot, { childList:true, subtree:true });

      setTimeout(function(){
        bindStudyNoteTextareas();
        observer.disconnect();
      }, 8000);
    }
  });

  window.addEventListener("load", bootstrap);

  window.SemJExpositions = {
    read: readItems,
    write: writeItems,
    refresh: bootstrap
  };
})();
