<script>
// js/chapter.js
(function () {
  const qs = new URLSearchParams(location.search);
  const bookRaw = qs.get("book") || "Genesis";     // e.g., "Genesis"
  const chapter = (qs.get("chapter") || "1").trim();

  // Build several safe path candidates (handles spaces/case)
  const clean = s => s.replace(/\s+/g, "").replace(/[^\w-]/g, "");
  const base = "/israelite-research/data/tanakh";
  const candidates = [
    `${base}/${bookRaw}/${chapter}.json`,
    `${base}/${bookRaw.toLowerCase()}/${chapter}.json`,
    `${base}/${clean(bookRaw)}/${chapter}.json`,
    `${base}/${clean(bookRaw).toLowerCase()}/${chapter}.json`,
  ];

  const statusEl = document.getElementById("status");   // optional “Loading…” element
  const versesEl = document.getElementById("verses");   // required list/container
  const titleEl  = document.querySelector("[data-book-title]"); // optional title hook

  let i = 0;
  function tryNext() {
    if (i >= candidates.length) {
      if (statusEl) statusEl.textContent = "Chapter not found.";
      console.error("Tried paths:", candidates);
      return;
    }
    const url = candidates[i++];
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (statusEl) statusEl.remove();
        if (titleEl) titleEl.textContent = `${data.book} ${data.chapter}`;
        render(data);
      })
      .catch(tryNext);
  }

  function render(data) {
    if (!versesEl) { console.error("#verses missing in chapter.html"); return; }
    versesEl.innerHTML = "";
    (data.verses || []).forEach(v => {
      const li = document.createElement("li");
      li.className = "verse-row";
      li.innerHTML = `
        <div class="verse-num">${v.num}</div>
        <div class="verse-text">${v.text}</div>
        <div class="verse-actions">
          <button class="btn-xref" data-num="${v.num}">Cross-Refs ${(v.crossRefs||[]).length}</button>
          <button class="btn-notes" data-num="${v.num}">Notes</button>
        </div>`;
      versesEl.appendChild(li);
    });
  }

  tryNext();
})();
</script>
