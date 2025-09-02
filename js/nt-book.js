/* nt-book.js
 * Wire chapter grid cards to chapter pages.
 * Expects chapter cards like: <a class="ch-card" data-ch="1">1</a>
 */
(function () {
  function getBookSlug() {
    const parts = location.pathname.split("/").filter(Boolean);
    const i = parts.findIndex(p => p.toLowerCase() === "newtestament");
    return (i >= 0 && parts[i + 1]) ? decodeURIComponent(parts[i + 1]).toLowerCase() : "";
  }
  function getSiteBase() {
    const path = location.pathname.replace(/\/+$/,'');
    const idx = path.toLowerCase().indexOf("/newtestament/");
    return idx > -1 ? path.slice(0, idx) : "";
  }
  const base = getSiteBase() || "/israelite-research";
  const book = getBookSlug();

  const cards = document.querySelectorAll('.ch-card[data-ch], [data-ch].ch-card, [data-ch].chapter-card');
  cards.forEach(card => {
    const ch = parseInt(card.getAttribute('data-ch'), 10);
    if (!Number.isFinite(ch) || ch < 1) return;
    const href = `${base}/newtestament/${book}/chapter.html?ch=${ch}`;
    if (card.tagName === 'A') {
      card.setAttribute('href', href);
    } else {
      card.addEventListener('click', () => { location.href = href; });
      card.style.cursor = 'pointer';
    }
  });

  // Optional: verify JSON exists, gray out missing chapters
  const verify = !!document.body.dataset.verifyChapters; // enable by setting <body data-verify-chapters>
  if (verify) {
    cards.forEach(async card => {
      const ch = parseInt(card.getAttribute('data-ch'), 10);
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
