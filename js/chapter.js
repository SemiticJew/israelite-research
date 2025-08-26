(function () {
  const qs = new URLSearchParams(location.search);
  const bookParam = qs.get("book") || "Genesis";
  const chapterParam = parseInt(qs.get("chapter") || "1", 10);

  // Title + subtitle
  const titleEl = document.getElementById("chapter-title");
  const subEl = document.getElementById("chapter-subtitle");
  if (titleEl) titleEl.textContent = `${bookParam} ${chapterParam}`;
  if (subEl) subEl.textContent = `Line upon line · Precept upon precept`;

  // Build breadcrumb path (Home > Texts > Tanakh > Book > Chapter)
  const bc = document.getElementById("breadcrumbs");
  if (bc) {
    bc.innerHTML = `
      <ol>
        <li><a href="/israelite-research/index.html">Home</a></li>
        <li><a href="/israelite-research/texts.html">Texts</a></li>
        <li><a href="/israelite-research/tanakh.html">Tanakh</a></li>
        <li><a href="/israelite-research/tanakh/book.html?book=${encodeURIComponent(bookParam)}">${bookParam}</a></li>
        <li>Chapter ${chapterParam}</li>
      </ol>`;
  }

  // Resolve data path (support either /Genesis/1.json or /genesis/1.json)
  const bookFolderA = `data/tanakh/${bookParam}/`;
  const bookFolderB = `data/tanakh/${bookParam.toLowerCase()}/`;
  const dataPaths = [
    `${bookFolderA}${chapterParam}.json`,
    `${bookFolderB}${chapterParam}.json`,
  ];

  async function fetchFirst(paths) {
    for (const p of paths) {
      try {
        const r = await fetch(p, { cache: "no-store" });
        if (r.ok) return r.json();
      } catch (e) {}
    }
    throw new Error("Chapter data not found");
  }

  function logosHref(ref) {
    // Expect "Book chap:verse" or "Book chap:verse-verse"
    const safe = encodeURIComponent(ref.replace(/\s+/g, " "));
    return `https://biblia.com/bible/kjv1900/${safe}`;
  }

  function noteKey(book, chap, v) {
    return `notes:${book}:${chap}:${v}`;
  }

  function render(data) {
    const wrap = document.getElementById("verses");
    if (!wrap) return;

    if (!data || !Array.isArray(data.verses)) {
      wrap.textContent = "No data.";
      return;
    }

    const frag = document.createDocumentFragment();

    data.verses.forEach((v) => {
      const card = document.createElement("article");
      card.className = "verse-card";
      card.id = `v${v.num}`;

      // header row
      const head = document.createElement("div");
      head.className = "verse-head";

      const num = document.createElement("span");
      num.className = "verse-num";
      num.textContent = v.num;

      const text = document.createElement("div");
      text.className = "verse-text";
      text.textContent = v.text || "";

      const tools = document.createElement("div");
      tools.className = "tool-bar";
      const mkBtn = (label, targetId) => {
        const b = document.createElement("button");
        b.className = "tool-btn";
        b.type = "button";
        b.textContent = label;
        b.dataset.target = targetId;
        return b;
      };
      const refsId = `refs-${v.num}`;
      const notesId = `notes-${v.num}`;
      const studyId = `study-${v.num}`;
      tools.append(mkBtn("Cross-refs", refsId), mkBtn("Notes", notesId), mkBtn("Study", studyId));

      head.append(num, text, tools);

      // panels
      const panels = document.createElement("div");
      panels.className = "panels";

      // Cross refs
      const pRefs = document.createElement("div");
      pRefs.className = "panel";
      pRefs.id = refsId;
      if (Array.isArray(v.crossRefs) && v.crossRefs.length) {
        const ul = document.createElement("ul");
        ul.className = "ref-list";
        v.crossRefs.forEach((r) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = logosHref(r.ref || "");
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = r.ref || "";
          li.append(a);
          if (r.note) {
            li.append(document.createTextNode(` — ${r.note}`));
          }
          ul.append(li);
        });
        pRefs.append(ul);
      } else {
        pRefs.textContent = "No cross references.";
      }

      // Notes (personal, saved to localStorage)
      const pNotes = document.createElement("div");
      pNotes.className = "panel";
      pNotes.id = notesId;
      const nWrap = document.createElement("div");
      nWrap.className = "note-wrap";
      const lab = document.createElement("label");
      lab.setAttribute("for", `ta-${v.num}`);
      lab.textContent = "My notes";
      const ta = document.createElement("textarea");
      ta.className = "note-area";
      ta.id = `ta-${v.num}`;
      ta.placeholder = "Type your notes for this verse… (saved locally on this device)";
      // load saved
      const saved = localStorage.getItem(noteKey(bookParam, chapterParam, v.num));
      if (saved) ta.value = saved;
      ta.addEventListener("input", () => {
        localStorage.setItem(noteKey(bookParam, chapterParam, v.num), ta.value);
      });
      nWrap.append(lab, ta);
      pNotes.append(nWrap);

      // Study (your commentary from JSON)
      const pStudy = document.createElement("div");
      pStudy.className = "panel";
      pStudy.id = studyId;
      const s = document.createElement("div");
      s.className = "study-text";
      s.textContent = (v.commentary && v.commentary.trim()) ? v.commentary : "No commentary yet.";
      pStudy.append(s);

      panels.append(pRefs, pNotes, pStudy);

      card.append(head, panels);
      frag.append(card);
    });

    wrap.innerHTML = "";
    wrap.append(frag);

    // Toggle handlers: open/close panels per verse
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".tool-btn");
      if (!btn) return;
      const id = btn.dataset.target;
      const card = btn.closest(".verse-card");
      if (!card) return;
      const panels = card.querySelectorAll(".panel");
      panels.forEach((p) => {
        if (p.id === id) {
          p.classList.toggle("show");
        } else {
          p.classList.remove("show");
        }
      });
    });
  }

  fetchFirst(dataPaths)
    .then(render)
    .catch(() => {
      const wrap = document.getElementById("verses");
      if (wrap) wrap.textContent = "Chapter data not found.";
    });
})();
