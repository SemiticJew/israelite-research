/* Semitic Jew App: Local Verse Highlights with Categories */
(function(){
  const STORAGE_KEY = "sj_verse_highlights_v1";
  const MAX_HIGHLIGHTS = 300;

  const CATEGORIES = [
    { key:"key", label:"Key Verse" },
    { key:"law", label:"Law / Command" },
    { key:"prophecy", label:"Prophecy" },
    { key:"question", label:"Question / Research" }
  ];

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

  function categoryLabel(category){
    return (CATEGORIES.find(c => c.key === category) || CATEGORIES[0]).label;
  }

  function nextCategory(current){
    if(!current) return CATEGORIES[0].key;
    const i = CATEGORIES.findIndex(c => c.key === current);
    return CATEGORIES[(i + 1) % CATEGORIES.length].key;
  }

  function getCanonFromPath(){
    const path = window.location.pathname.toLowerCase();
    if(path.includes("/tanakh/")) return "tanakh";
    if(path.includes("/newtestament/")) return "newtestament";
    if(path.includes("/apocrypha/")) return "apocrypha";
    return "";
  }

  function readHighlights(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function writeHighlights(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HIGHLIGHTS)));
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
    const candidates = [
      verseEl.dataset.v,
      verseEl.dataset.verse,
      verseEl.getAttribute("data-v"),
      verseEl.getAttribute("data-verse"),
      verseEl.id && verseEl.id.replace(/^v/i, "")
    ];

    for(const c of candidates){
      const n = String(c || "").match(/\d+/);
      if(n) return n[0];
    }

    const label = verseEl.querySelector(".vnum, .verse-num, .verse-number, sup")?.textContent || "";
    const n = String(label).match(/\d+/);
    return n ? n[0] : "";
  }

  function getVerseText(verseEl){
    const clone = verseEl.cloneNode(true);
    clone.querySelectorAll("button, select, .tools, .tool-btn, .v-tools, .v-panel, .panel").forEach(el => el.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  }

  function keyFor(ctx, verse){
    return `${ctx.canon}:${ctx.book}:${ctx.chapter}:${verse}`;
  }

  function getHighlight(key){
    return readHighlights().find(item => item.key === key) || null;
  }

  function removeHighlight(key){
    writeHighlights(readHighlights().filter(item => item.key !== key));
  }

  function saveHighlight(item){
    const existing = readHighlights().filter(old => old.key !== item.key);
    writeHighlights([{...item, savedAt:new Date().toISOString()}, ...existing]);
  }

  function clearHighlightClasses(verseEl){
    verseEl.classList.remove(
      "sj-verse-highlighted",
      "sj-highlight-key",
      "sj-highlight-law",
      "sj-highlight-prophecy",
      "sj-highlight-question"
    );
  }

  function applyHighlightState(verseEl, btn, item){
    clearHighlightClasses(verseEl);

    if(!item){
      btn.textContent = "highlight";
      btn.setAttribute("aria-pressed", "false");
      btn.removeAttribute("data-highlight-category");
      return;
    }

    verseEl.classList.add("sj-verse-highlighted", `sj-highlight-${item.category || "key"}`);
    btn.textContent = categoryLabel(item.category || "key");
    btn.setAttribute("aria-pressed", "true");
    btn.setAttribute("data-highlight-category", item.category || "key");
  }

  function findVerseElements(){
    const selectors = [
      ".verse",
      ".v",
      "[id^='v']",
      "[data-v]",
      "[data-verse]"
    ];

    const found = [];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if(found.includes(el)) return;
        const verse = getVerseNumber(el);
        if(verse) found.push(el);
      });
    });

    return found;
  }

  function addHighlightButtons(){
    const ctx = currentChapterContext();
    if(!ctx) return;

    const verses = findVerseElements();
    if(!verses.length) return;

    verses.forEach(verseEl => {
      const verse = getVerseNumber(verseEl);
      if(!verse) return;

      const key = keyFor(ctx, verse);
      const existing = getHighlight(key);

      verseEl.setAttribute("data-sj-highlight-key", key);

      if(verseEl.querySelector(".sj-highlight-btn")){
        const btn = verseEl.querySelector(".sj-highlight-btn");
        applyHighlightState(verseEl, btn, existing);
        return;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tool-btn sj-highlight-btn";
      btn.title = "Highlight this verse. Tap to cycle categories. Long press/right click to remove.";
      applyHighlightState(verseEl, btn, existing);

      btn.addEventListener("click", function(){
        const old = getHighlight(key);
        const category = nextCategory(old && old.category);

        const item = {
          key,
          category,
          categoryLabel: categoryLabel(category),
          canon: ctx.canon,
          canonLabel: ctx.canonLabel,
          book: ctx.book,
          bookTitle: ctx.bookTitle,
          chapter: ctx.chapter,
          verse,
          title: `${ctx.bookTitle} ${ctx.chapter}:${verse}`,
          url: `${ctx.chapterUrl}#v${verse}`,
          text: getVerseText(verseEl)
        };

        saveHighlight(item);
        applyHighlightState(verseEl, btn, item);
      });

      btn.addEventListener("contextmenu", function(e){
        e.preventDefault();
        removeHighlight(key);
        applyHighlightState(verseEl, btn, null);
      });

      btn.addEventListener("dblclick", function(e){
        e.preventDefault();
        removeHighlight(key);
        applyHighlightState(verseEl, btn, null);
      });

      const tools =
        verseEl.querySelector(".tools") ||
        verseEl.querySelector(".v-tools") ||
        verseEl.querySelector(".verse-tools") ||
        verseEl.querySelector(".toolbar");

      if(tools){
        tools.appendChild(btn);
      }else{
        const wrap = document.createElement("span");
        wrap.className = "sj-highlight-inline";
        wrap.appendChild(btn);
        verseEl.appendChild(wrap);
      }
    });
  }

  function renderHighlightsDashboard(){
    const root = document.getElementById("app-highlights");
    if(!root) return;

    const highlights = readHighlights();

    if(!highlights.length){
      root.innerHTML = `
        <section class="app-highlights-shell empty" aria-label="Highlighted Verses">
          <div class="app-highlights-head">
            <span class="label">Highlighted Verses</span>
            <h2>No highlighted verses yet.</h2>
            <p>Open a Scripture chapter and tap “highlight” beside a verse to save it here.</p>
          </div>
          <a class="app-highlight-main-btn" href="/biblia.html">Open Biblia</a>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="app-highlights-shell" aria-label="Highlighted Verses">
        <div class="app-highlights-head">
          <span class="label">Highlighted Verses</span>
          <h2>Your highlighted verses</h2>
          <p>These verse highlights are stored locally on this device. Tap a highlight button in the reader to cycle categories.</p>
        </div>

        <div class="app-highlights-grid">
          ${highlights.map(item => `
            <article class="app-highlight-card ${escapeHTML("highlight-card-" + (item.category || "key"))}">
              <a href="${escapeHTML(item.url)}">
                <strong>${escapeHTML(item.title)}</strong>
                <span>${escapeHTML(item.canonLabel)} · ${escapeHTML(item.categoryLabel || categoryLabel(item.category || "key"))}</span>
                <p>${escapeHTML(shorten(item.text, 180))}</p>
              </a>
              <button type="button" data-remove-highlight="${escapeHTML(item.key)}">Remove</button>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    root.querySelectorAll("[data-remove-highlight]").forEach(btn => {
      btn.addEventListener("click", function(){
        const key = btn.getAttribute("data-remove-highlight");
        writeHighlights(readHighlights().filter(item => item.key !== key));
        renderHighlightsDashboard();
      });
    });
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

  function bootstrapHighlights(){
    addHighlightButtons();
    renderHighlightsDashboard();
  }

  document.addEventListener("DOMContentLoaded", function(){
    bootstrapHighlights();

    // The Scripture reader often renders verses after DOMContentLoaded.
    // Observe the page briefly so highlight buttons are added once verses appear.
    const readerRoot =
      document.querySelector("main") ||
      document.querySelector("#verses") ||
      document.body;

    if(readerRoot && /\/chapter\.html$/i.test(window.location.pathname)){
      let tries = 0;
      const observer = new MutationObserver(function(){
        tries += 1;
        addHighlightButtons();

        if(document.querySelector(".sj-highlight-btn") || tries > 40){
          observer.disconnect();
        }
      });

      observer.observe(readerRoot, { childList:true, subtree:true });

      setTimeout(function(){
        addHighlightButtons();
        observer.disconnect();
      }, 4000);
    }
  });

  window.addEventListener("load", bootstrapHighlights);

  window.SemJHighlights = {
    read: readHighlights,
    write: writeHighlights,
    refresh: bootstrapHighlights
  };
})();
