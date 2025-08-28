// /israelite-research/js/chapter.js
(function () {
  const qs = new URLSearchParams(location.search);
  const book = (qs.get("book") || "Genesis").trim();
  const chapterNum = parseInt(qs.get("chapter") || "1", 10);

  // Paths
  const base = "/israelite-research";
  const dataPath = `${base}/data/tanakh/${book.toLowerCase()}/${chapterNum}.json`;
  const descPath = `${base}/data/tanakh/descriptions.json`;

  const elTitle = document.getElementById("chapter-title");
  const elSub   = document.getElementById("chapter-subtitle");
  const elRoot  = document.getElementById("chapter");

  // Page title
  document.title = `${book} ${chapterNum} — Semitic Jew`;

  // Load book description for hero subtitle
  fetch(descPath)
    .then(r => r.ok ? r.json() : {})
    .then(descs => {
      const d = (descs && (descs[book] || descs[book.toUpperCase()] || descs[book.toLowerCase()])) || "";
      elTitle.textContent = `${book} ${chapterNum}`;
      elSub.textContent = d || `Reading ${book} ${chapterNum} (KJV)`;
    })
    .catch(() => {
      elTitle.textContent = `${book} ${chapterNum}`;
      elSub.textContent = `Reading ${book} ${chapterNum} (KJV)`;
    });

  // Render helpers
  function makeEl(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function commentaryKey(num) {
    return `commentary:${book}:${chapterNum}:${num}`;
  }

  function renderVerse(v) {
    // Card
    const card = makeEl("article", "verse-card");
    card.id = `v-${v.num}`;

    // Header row: Tools button, Verse Number, Text
    const head = makeEl("div", "verse-head");
    const btnTools = makeEl("button", "btn-tools", "Tools");
    btnTools.setAttribute("data-verse", v.num);

    const num = makeEl("span", "verse-num", String(v.num));
    const text = makeEl("div", "verse-text", v.text);

    head.appendChild(btnTools);
    head.appendChild(num);
    head.appendChild(text);
    card.appendChild(head);

    // Tools panel (collapsed by default)
    const panel = makeEl("div", "tools-panel");
    panel.id = `panel-${v.num}`;

    // Tabs
    const tabs = makeEl("div", "tools-tabs");
    const tabX = makeEl("button", "tools-tab active", "Cross-Refs");
    tabX.dataset.tab = "xref";
    const tabC = makeEl("button", "tools-tab", "My Commentary");
    tabC.dataset.tab = "commentary";
    const tabL = makeEl("button", "tools-tab", "Lexicon");
    tabL.dataset.tab = "lexicon";
    const tabS = makeEl("button", "tools-tab", "Strong’s");
    tabS.dataset.tab = "strongs";
    tabs.append(tabX, tabC, tabL, tabS);

    // Content panes
    const content = makeEl("div", "tools-content");

    // Cross-refs
    const paneX = makeEl("div", "pane active");
    if (Array.isArray(v.crossRefs) && v.crossRefs.length) {
      const ul = makeEl("ul", "xref-list");
      v.crossRefs.forEach(x => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `https://biblia.com/bible/kjv1900/${encodeURIComponent(x.ref)}`;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = x.ref;
        li.appendChild(a);
        if (x.note) {
          li.appendChild(document.createTextNode(` — ${x.note}`));
        }
        ul.appendChild(li);
      });
      paneX.appendChild(ul);
    } else {
      paneX.textContent = "No cross-references yet.";
    }

    // Commentary (saved to localStorage)
    const paneC = makeEl("div", "pane");
    const commWrap = makeEl("div", "commentary-wrap");
    const ta = document.createElement("textarea");
    ta.value = localStorage.getItem(commentaryKey(v.num)) || "";
    const actions = makeEl("div", "commentary-actions");
    const btnSave = makeEl("button", "btn-save", "Save");
    const ok = makeEl("span", "save-ok");
    actions.append(btnSave, ok);
    commWrap.append(ta, actions);
    paneC.appendChild(commWrap);

    btnSave.addEventListener("click", () => {
      localStorage.setItem(commentaryKey(v.num), ta.value.trim());
      ok.textContent = "Saved";
      setTimeout(() => ok.textContent = "", 1200);
    });

    // Lexicon placeholder
    const paneL = makeEl("div", "pane");
    paneL.innerHTML = `<p class="soon">Lexicon view coming soon.</p>`;

    // Strong’s placeholder
    const paneS = makeEl("div", "pane");
    paneS.innerHTML = `<p class="soon">Strong’s Concordance view coming soon.</p>`;

    content.append(paneX, paneC, paneL, paneS);

    // Panel actions (Copy)
    const actionsBar = makeEl("div", "panel-actions");
    const btnCopy = makeEl("button", "btn-copy", "Copy verse");
    const copied = makeEl("span", "copied-flag");
    actionsBar.append(btnCopy, copied);

    panel.append(tabs, content, actionsBar);
    card.appendChild(panel);

    // Toggle panel open/close
    btnTools.addEventListener("click", () => {
      const isOpen = panel.classList.contains("open");
      document.querySelectorAll(".tools-panel.open").forEach(p => p.classList.remove("open"));
      if (!isOpen) panel.classList.add("open");
    });

    // Tabs switching
    tabs.addEventListener("click", (e) => {
      const b = e.target.closest(".tools-tab");
      if (!b) return;
      tabs.querySelectorAll(".tools-tab").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      const sel = b.dataset.tab;
      content.querySelectorAll(".pane").forEach(p => p.classList.remove("active"));
      if (sel === "xref") paneX.classList.add("active");
      if (sel === "commentary") paneC.classList.add("active");
      if (sel === "lexicon") paneL.classList.add("active");
      if (sel === "strongs") paneS.classList.add("active");
    });

    // Copy verse
    btnCopy.addEventListener("click", async () => {
      const clip = `${book} ${chapterNum}:${v.num} — ${v.text}`;
      try {
        await navigator.clipboard.writeText(clip);
        copied.textContent = "Copied!";
        setTimeout(() => copied.textContent = "", 1200);
      } catch {
        copied.textContent = "Copy failed";
        setTimeout(() => copied.textContent = "", 1200);
      }
    });

    return card;
  }

  // Load the chapter JSON and render
  fetch(dataPath)
    .then(r => {
      if (!r.ok) throw new Error("Missing chapter data");
      return r.json();
    })
    .then(data => {
      elRoot.innerHTML = ""; // clear
      if (!data || !Array.isArray(data.verses)) {
        elRoot.textContent = "No data available for this chapter.";
        return;
      }
      // Render each verse
      data.verses.forEach(v => elRoot.appendChild(renderVerse(v)));
    })
    .catch(() => {
      elRoot.textContent = "Unable to load this chapter. Please check your data path.";
    });
})();
