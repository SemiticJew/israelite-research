(function () {
  const params = new URLSearchParams(location.search);
  const bookParam = params.get("book") || "Genesis";
  const chapterParam = params.get("chapter") || "1";

  // Slug: lower-case, strip spaces/punct so "1 Samuel" => "1samuel"
  const bookSlug = bookParam.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const chapterNum = String(chapterParam).replace(/[^0-9]/g, "") || "1";

  const dataUrl = `/israelite-research/data/tanakh/${bookSlug}/${chapterNum}.json`; // ABSOLUTE + lowercase
  const versesEl = document.getElementById("verses");
  const titleEl  = document.getElementById("chapter-title");
  const crumbsEl = document.getElementById("breadcrumbs");

  // Title + breadcrumbs
  if (titleEl) titleEl.textContent = `${bookParam} ${chapterNum}`;
  if (crumbsEl) {
    crumbsEl.innerHTML =
      `<a href="/israelite-research/index.html">Home</a> › ` +
      `<a href="/israelite-research/texts.html">Texts</a> › ` +
      `<a href="/israelite-research/tanakh.html">Tanakh</a> › ` +
      `<a href="/israelite-research/tanakh/book.html?book=${encodeURIComponent(bookParam)}">${bookParam}</a> › ` +
      `Chapter ${chapterNum}`;
  }

  // Fetch JSON
  if (versesEl) versesEl.textContent = "Loading…";
  fetch(dataUrl, { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${dataUrl}`);
      return r.json();
    })
    .then(data => {
      if (!data || !Array.isArray(data.verses)) {
        throw new Error(`Invalid JSON format (missing "verses") at ${dataUrl}`);
      }
      const frag = document.createDocumentFragment();

      data.verses.forEach(v => {
        const sec = document.createElement("section");
        sec.className = "verse-row";
        sec.id = `v${v.num}`;

        sec.innerHTML = `
          <div class="verse-num">${v.num}</div>
          <div>
            <div class="verse-text">${escapeHtml(v.text || "")}</div>
            <div class="verse-tools">
              ${
                Array.isArray(v.crossRefs) && v.crossRefs.length
                  ? `<details><summary>Cross-references (${v.crossRefs.length})</summary>
                       <ul>${v.crossRefs
                         .map(cr => `<li>${escapeHtml(cr.ref || "")}${cr.note ? ` — ${escapeHtml(cr.note)}` : ""}</li>`)
                         .join("")}</ul>
                     </details>`
                  : ""
              }
              ${v.commentary ? `<details><summary>Notes</summary><div class="commentary">${escapeHtml(v.commentary)}</div></details>` : ""}
            </div>
          </div>
        `;
        frag.appendChild(sec);
      });

      versesEl.innerHTML = "";
      versesEl.appendChild(frag);
    })
    .catch(err => {
      if (versesEl) {
        versesEl.innerHTML = `<div class="error">
          Could not load chapter data.<br>
          <code>${dataUrl}</code><br>
          ${escapeHtml(err.message)}
        </div>`;
      }
      console.error(err);
    });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
})();
