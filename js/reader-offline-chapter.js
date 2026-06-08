/* Semitic Jew Reader: save chapter offline */
(function(){
  const STORAGE_KEY = "sj_offline_chapters_v1";

  function getCanonSlug(){
    const path = location.pathname;
    if(path.includes("/tanakh/")) return "tanakh";
    if(path.includes("/newtestament/")) return "newtestament";
    if(path.includes("/apocrypha/")) return "apocrypha";
    return "biblia";
  }

  function getCanonTitle(canon){
    if(canon === "tanakh") return "Tanakh";
    if(canon === "newtestament") return "New Testament";
    if(canon === "apocrypha") return "Apocrypha";
    return "Biblia";
  }

  function titleCaseSlug(slug){
    return String(slug || "")
      .split("-")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getParams(){
    const params = new URLSearchParams(location.search);
    return {
      book: params.get("book") || "",
      chapter: params.get("ch") || "1"
    };
  }

  function getChapterKey(){
    const canon = getCanonSlug();
    const {book, chapter} = getParams();
    return `${canon}:${book}:${chapter}`;
  }

  function getChapterUrl(){
    return location.pathname + location.search;
  }

  function readStore(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function writeStore(items){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }catch(e){
      console.warn("Could not save offline chapters:", e);
    }
  }

  function getVersesText(){
    return Array.from(document.querySelectorAll(".verse")).map(verse => {
      const clone = verse.cloneNode(true);
      clone.querySelectorAll(".v-tools,.v-panel,.sj-bookmark-inline,.sj-highlight-inline,.sj-note-inline").forEach(el => el.remove());
      return clone.textContent.replace(/\s+/g, " ").trim();
    }).filter(Boolean);
  }

  function isSaved(){
    const key = getChapterKey();
    return readStore().some(item => item.key === key);
  }

  function saveChapter(){
    const canon = getCanonSlug();
    const {book, chapter} = getParams();
    const key = getChapterKey();
    const ref = `${titleCaseSlug(book)} ${chapter}`;
    const items = readStore().filter(item => item.key !== key);

    items.unshift({
      key,
      canon,
      canonTitle: getCanonTitle(canon),
      book,
      chapter,
      reference: ref,
      url: getChapterUrl(),
      savedAt: new Date().toISOString(),
      verses: getVersesText()
    });

    writeStore(items.slice(0, 80));
  }

  function removeChapter(){
    const key = getChapterKey();
    writeStore(readStore().filter(item => item.key !== key));
  }

  function createShell(){
    if(document.querySelector(".reader-offline-shell")) return;

    const shell = document.createElement("section");
    shell.className = "reader-offline-shell";
    shell.setAttribute("aria-label", "Offline chapter tools");

    const saved = isSaved();

    shell.innerHTML = `
      <div class="reader-offline-title">
        <span>Offline</span>
        <strong>${saved ? "This chapter is saved offline." : "Save this chapter offline."}</strong>
      </div>

      <div class="reader-offline-actions">
        <button type="button" id="reader-offline-toggle">${saved ? "Remove Offline" : "Save Offline"}</button>
        <a href="/app.html#offline-chapters">Saved Chapters</a>
      </div>

      <div class="reader-offline-status" aria-live="polite"></div>
    `;

    const jump = document.querySelector(".reader-verse-jump-shell");
    const shortcuts = document.querySelector(".reader-shortcuts-button");
    const share = document.querySelector(".reader-share-shell");

    if(jump){
      jump.insertAdjacentElement("afterend", shell);
    }else if(shortcuts){
      shortcuts.insertAdjacentElement("afterend", shell);
    }else if(share){
      share.insertAdjacentElement("afterend", shell);
    }else{
      document.querySelector("main")?.prepend(shell);
    }

    const button = shell.querySelector("#reader-offline-toggle");
    const title = shell.querySelector(".reader-offline-title strong");
    const status = shell.querySelector(".reader-offline-status");

    button.addEventListener("click", function(){
      if(isSaved()){
        removeChapter();
        button.textContent = "Save Offline";
        title.textContent = "Save this chapter offline.";
        status.textContent = "Removed.";
      }else{
        saveChapter();
        button.textContent = "Remove Offline";
        title.textContent = "This chapter is saved offline.";
        status.textContent = "Saved.";
      }

      setTimeout(() => {
        status.textContent = "";
      }, 1800);
    });
  }

  function init(){
    if(!document.body.classList.contains("reader-page")) return;

    let attempts = 0;

    const wait = setInterval(function(){
      attempts += 1;

      if(document.querySelectorAll(".verse").length || attempts > 80){
        clearInterval(wait);
        createShell();
      }
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
