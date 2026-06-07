/* Semitic Jew App: Local Verse Notes */
(function(){
  const STORAGE_KEY = "sj_verse_notes_v1";
  const MAX_NOTES = 300;

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

  function readNotes(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function writeNotes(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_NOTES)));
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
    clone.querySelectorAll("button, textarea, select, .tools, .tool-btn, .v-tools, .v-panel, .panel, .sj-note-panel").forEach(el => el.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  }

  function keyFor(ctx, verse){
    return `${ctx.canon}:${ctx.book}:${ctx.chapter}:${verse}`;
  }

  function getNote(key){
    return readNotes().find(item => item.key === key) || null;
  }

  function saveNote(item){
    const existing = readNotes().filter(old => old.key !== item.key);
    writeNotes([{...item, updatedAt:new Date().toISOString()}, ...existing]);
  }

  function removeNote(key){
    writeNotes(readNotes().filter(item => item.key !== key));
  }

  function findVerseElements(){
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

    const found = [];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if(found.includes(el)) return;

        const id = (el.id || "").toLowerCase();
        const className = String(el.className || "").toLowerCase();

        if(id === "verses" || id === "verse-list" || id === "chapter" || id === "scripture") return;
        if(className.includes("verses") || className.includes("chapter-body") || className.includes("reader-body")) return;

        const verse = getVerseNumber(el);
        if(!verse) return;

        const nested = el.querySelectorAll("[data-v], [data-verse], .verse, .v");
        if(nested.length > 2) return;

        found.push(el);
      });
    });

    return found;
  }

  function closeOtherPanels(currentPanel){
    document.querySelectorAll(".sj-note-panel").forEach(panel => {
      if(panel !== currentPanel) panel.remove();
    });
  }

  function openNotePanel(verseEl, ctx, verse, btn){
    const key = keyFor(ctx, verse);
    const existing = getNote(key);
    const oldPanel = verseEl.querySelector(".sj-note-panel");

    if(oldPanel){
      oldPanel.remove();
      return;
    }

    const panel = document.createElement("div");
    panel.className = "sj-note-panel";

    panel.innerHTML = `
      <div class="sj-note-panel-head">
        <strong>${escapeHTML(ctx.bookTitle)} ${escapeHTML(ctx.chapter)}:${escapeHTML(verse)}</strong>
        <button type="button" class="sj-note-close" aria-label="Close note panel">×</button>
      </div>
      <textarea class="sj-note-textarea" placeholder="Write a personal note for this verse...">${escapeHTML(existing ? existing.note : "")}</textarea>
      <div class="sj-note-actions">
        <button type="button" class="sj-note-save">Save Note</button>
        <button type="button" class="sj-note-remove">Remove</button>
      </div>
    `;

    closeOtherPanels(panel);
    verseEl.appendChild(panel);

    const textarea = panel.querySelector(".sj-note-textarea");
    const save = panel.querySelector(".sj-note-save");
    const remove = panel.querySelector(".sj-note-remove");
    const close = panel.querySelector(".sj-note-close");

    textarea && textarea.focus();

    save && save.addEventListener("click", function(){
      const note = (textarea.value || "").trim();

      if(!note){
        removeNote(key);
        btn.classList.remove("saved");
        btn.textContent = "note";
        panel.remove();
        return;
      }

      saveNote({
        key,
        canon: ctx.canon,
        canonLabel: ctx.canonLabel,
        book: ctx.book,
        bookTitle: ctx.bookTitle,
        chapter: ctx.chapter,
        verse,
        title: `${ctx.bookTitle} ${ctx.chapter}:${verse}`,
        url: `${ctx.chapterUrl}#v${verse}`,
        text: getVerseText(verseEl),
        note
      });

      btn.classList.add("saved");
      btn.textContent = "noted";
      panel.remove();
    });

    remove && remove.addEventListener("click", function(){
      removeNote(key);
      btn.classList.remove("saved");
      btn.textContent = "note";
      panel.remove();
    });

    close && close.addEventListener("click", function(){
      panel.remove();
    });
  }

  function addNoteButtons(){
    const ctx = currentChapterContext();
    if(!ctx) return;

    const verses = findVerseElements();
    if(!verses.length) return;

    verses.forEach(verseEl => {
      const verse = getVerseNumber(verseEl);
      if(!verse) return;

      const key = keyFor(ctx, verse);
      const existing = getNote(key);

      verseEl.classList.add("sj-note-target");

      if(verseEl.querySelector(".sj-note-btn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tool-btn sj-note-btn";
      btn.textContent = existing ? "noted" : "note";
      btn.title = "Add or edit a personal note for this verse";
      btn.classList.toggle("saved", !!existing);

      btn.addEventListener("click", function(){
        openNotePanel(verseEl, ctx, verse, btn);
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
        wrap.className = "sj-note-inline";
        wrap.appendChild(btn);
        verseEl.appendChild(wrap);
      }
    });
  }

  function renderNotesDashboard(){
    const root = document.getElementById("app-verse-notes");
    if(!root) return;

    const notes = readNotes();

    if(!notes.length){
      root.innerHTML = `
        <section class="app-notes-shell empty" aria-label="Verse Notes">
          <div class="app-notes-head">
            <span class="label">Verse Notes</span>
            <h2>No verse notes yet.</h2>
            <p>Open a Scripture chapter and tap “note” beside a verse to save your personal observations here.</p>
          </div>
          <a class="app-note-main-btn" href="/biblia.html">Open Biblia</a>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="app-notes-shell" aria-label="Verse Notes">
        <div class="app-notes-head">
          <span class="label">Verse Notes</span>
          <h2>Your verse notes</h2>
          <p>These personal notes are stored locally on this device.</p>
        </div>

        <div class="app-notes-grid">
          ${notes.map(item => `
            <article class="app-note-card">
              <a href="${escapeHTML(item.url)}">
                <strong>${escapeHTML(item.title)}</strong>
                <span>${escapeHTML(item.canonLabel)}</span>
                <p>${escapeHTML(shorten(item.note, 220))}</p>
              </a>
              <button type="button" data-remove-note="${escapeHTML(item.key)}">Remove</button>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    root.querySelectorAll("[data-remove-note]").forEach(btn => {
      btn.addEventListener("click", function(){
        const key = btn.getAttribute("data-remove-note");
        removeNote(key);
        renderNotesDashboard();
      });
    });
  }

  function bootstrapNotes(){
    addNoteButtons();
    renderNotesDashboard();
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
    bootstrapNotes();

    const readerRoot = document.querySelector("main") || document.body;

    if(readerRoot && /\/chapter\.html$/i.test(window.location.pathname)){
      let tries = 0;
      const observer = new MutationObserver(function(){
        tries += 1;
        addNoteButtons();

        if(document.querySelector(".sj-note-btn") || tries > 40){
          observer.disconnect();
        }
      });

      observer.observe(readerRoot, {childList:true, subtree:true});

      setTimeout(function(){
        addNoteButtons();
        observer.disconnect();
      }, 4000);
    }
  });

  window.addEventListener("load", bootstrapNotes);

  window.SemJVerseNotes = {
    read: readNotes,
    write: writeNotes,
    refresh: bootstrapNotes
  };
})();
