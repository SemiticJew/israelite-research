/* js/nt-book.js
 * Turns chapter-number cards into links to a single shared chapter page.
 * Works with <a class="ch-card" data-ch="1">1</a> OR plain elements whose text is the number.
 */
(function () {
  function getSiteBase() {
    const path = location.pathname.replace(/\/+$/,'');
    const idx = path.toLowerCase().indexOf("/newtestament/");
    return idx > -1 ? path.slice(0, idx) : "";
  }
  function getBookSlug() {
    // Prefer explicit ?book=… if present
    const qp = new URLSearchParams(location.search).get("book");
    if (qp) return qp.toLowerCase();

    // Derive from path after /newtestament/
    const parts = location.pathname.split("/").filter(Boolean);
    const i = parts.findIndex(p => p.toLowerCase() === "newtestament");
    if (i >= 0 && parts[i+1]) {
      // handle .../newtestament/matthew.html OR .../newtestament/matthew/index.html
      const seg = parts[i+1].toLowerCase();
      if (seg.endsWith(".html")) return seg.replace(/\.html$/,'');
      if (seg !== "chapter.html") return seg; // folder case uses /matthew/index.html
    }
    return "matthew"; // safe fallback
  }

  const base = getSiteBase() || "/israelite-research";
  const book = getBookSlug();

  const cards = document.querySelectorAll('.ch-card,[data-ch]');
  cards.forEach(card => {
    const raw = card.getAttribute('data-ch') || card.textContent;
    const ch = parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(ch) || ch < 1) return;

    // Link to ONE shared reader: /newtestament/chapter.html?book=<book>&ch=<n>
    const href = `${base}/newtestament/chapter.html?book=${encodeURIComponent(book)}&ch=${ch}`;

    if (card.tagName === 'A') {
      card.setAttribute('href', href);
    } else {
      card.addEventListener('click', () => { location.href = href; });
      card.style.cursor = 'pointer';
    }
  });

  // Optional: gray out cards if JSON missing (enable by: <body data-verify-chapters>)
  if (document.body.hasAttribute('data-verify-chapters')) {
    cards.forEach(async card => {
      const raw = card.getAttribute('data-ch') || card.textContent;
      const ch = parseInt(String(raw).trim(), 10);
      if (!Number.isFinite(ch)) return;
      const url = `${base}/data/newtestament/${book}/${ch}.json`;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw 0;
      } catch {
        card.classList.add('ch-missing');
        card.removeAttribute('href');
        card.style.pointerEvents = 'none';
        card.title = 'Chapter data not found';
      }
    });
  }
})();
