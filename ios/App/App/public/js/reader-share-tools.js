/* Semitic Jew Reader: share/copy tools */
(function(){
  const BOOKMARK_KEY = "sj_scripture_bookmarks_v1";
  const HIGHLIGHT_KEY = "sj_verse_highlights_v1";

  function getCanon(){
    const path = location.pathname;
    if(path.includes("/tanakh/")) return "Tanakh";
    if(path.includes("/newtestament/")) return "New Testament";
    if(path.includes("/apocrypha/")) return "Apocrypha";
    return "Biblia";
  }

  function getParams(){
    const params = new URLSearchParams(location.search);
    return {
      book: params.get("book") || "",
      chapter: params.get("ch") || "1"
    };
  }

  function titleCaseSlug(slug){
    return String(slug || "")
      .split("-")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getReference(){
    const {book, chapter} = getParams();
    return `${titleCaseSlug(book)} ${chapter}`;
  }

  function getVerseNumber(verse){
    const raw =
      verse.dataset.verse ||
      verse.dataset.v ||
      verse.getAttribute("data-verse") ||
      verse.querySelector(".vnum")?.textContent ||
      "";
    const match = String(raw).match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  function getVerseText(verse){
    const clone = verse.cloneNode(true);
    clone.querySelectorAll(".v-tools,.v-panel,.sj-bookmark-inline,.sj-highlight-inline,.sj-note-inline").forEach(el => el.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  }

  function getVerses(){
    return Array.from(document.querySelectorAll(".verse"));
  }

  function readArray(key){
    try{
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function currentKeyPrefix(){
    const canon = location.pathname.includes("/tanakh/") ? "tanakh" :
      location.pathname.includes("/newtestament/") ? "newtestament" :
      location.pathname.includes("/apocrypha/") ? "apocrypha" : "biblia";

    const {book, chapter} = getParams();
    return `${canon}:${book}:${chapter}:`;
  }

  function isSavedInLocalArray(items, verseNumber){
    const prefix = currentKeyPrefix();
    return items.some(item => {
      const key = item.key || item.id || item.verseKey || "";
      const v = item.verse || item.v || item.verseNumber;
      return key === `${prefix}${verseNumber}` || String(key).endsWith(`:${verseNumber}`) || Number(v) === Number(verseNumber);
    });
  }

  async function copyText(text, status){
    try{
      await navigator.clipboard.writeText(text);
      status.textContent = "Copied.";
    }catch(e){
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      status.textContent = "Copied.";
    }

    setTimeout(() => {
      status.textContent = "";
    }, 1800);
  }

  function formatVerses(verses){
    const ref = getReference();

    return verses.map(verse => {
      const num = getVerseNumber(verse);
      const text = getVerseText(verse);
      return `${ref}:${num} ${text}`;
    }).join("\n");
  }

  function createShell(){
    if(document.querySelector(".reader-share-shell")) return document.querySelector(".reader-share-shell");

    const shell = document.createElement("section");
    shell.className = "reader-share-shell";
    shell.setAttribute("aria-label", "Reader copy and share tools");

    shell.innerHTML = `
      <div class="reader-share-title">
        <span>Share Tools</span>
        <strong>Copy chapter resources</strong>
      </div>

      <div class="reader-share-actions">
        <button type="button" data-copy="link">Chapter Link</button>
        <button type="button" data-copy="citation">Citation</button>
        <button type="button" data-copy="matches">Search Matches</button>
        <button type="button" data-copy="highlights">Highlights</button>
        <button type="button" data-copy="bookmarks">Bookmarks</button>
      </div>

      <div class="reader-share-status" aria-live="polite"></div>
    `;

    const search = document.querySelector(".reader-search-shell");
    const prefs = document.querySelector(".reader-preferences-shell");
    const progress = document.querySelector(".reader-progress-shell");

    if(search){
      search.insertAdjacentElement("afterend", shell);
    }else if(prefs){
      prefs.insertAdjacentElement("afterend", shell);
    }else if(progress){
      progress.insertAdjacentElement("afterend", shell);
    }else{
      document.querySelector("main")?.prepend(shell);
    }

    return shell;
  }

  function bind(shell){
    const status = shell.querySelector(".reader-share-status");

    shell.addEventListener("click", function(event){
      const button = event.target.closest("button[data-copy]");
      if(!button) return;

      const type = button.dataset.copy;
      const verses = getVerses();
      const ref = getReference();
      const canon = getCanon();
      const url = location.href;

      let text = "";

      if(type === "link"){
        text = url;
      }

      if(type === "citation"){
        text = `${ref} — ${canon}\n${url}`;
      }

      if(type === "matches"){
        const matched = Array.from(document.querySelectorAll(".verse.reader-search-match"));
        text = matched.length ? formatVerses(matched) : "No chapter search matches selected.";
      }

      if(type === "highlights"){
        const highlighted = verses.filter(v => v.className.includes("sj-highlight"));
        const local = readArray(HIGHLIGHT_KEY);

        const combined = highlighted.length ? highlighted : verses.filter(v => isSavedInLocalArray(local, getVerseNumber(v)));

        text = combined.length ? formatVerses(combined) : "No highlighted verses found in this chapter.";
      }

      if(type === "bookmarks"){
        const bookmarked = verses.filter(v => v.querySelector(".sj-bookmark-btn.saved,[aria-pressed='true'].sj-bookmark-btn"));
        const local = readArray(BOOKMARK_KEY);

        const combined = bookmarked.length ? bookmarked : verses.filter(v => isSavedInLocalArray(local, getVerseNumber(v)));

        text = combined.length ? formatVerses(combined) : "No bookmarked verses found in this chapter.";
      }

      copyText(text, status);
    });
  }

  function init(){
    if(!document.body.classList.contains("reader-page")) return;

    let attempts = 0;

    const wait = setInterval(function(){
      attempts += 1;

      if(document.querySelector(".reader-search-shell") || document.querySelector(".reader-preferences-shell") || attempts > 80){
        clearInterval(wait);
        const shell = createShell();
        bind(shell);
      }
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
