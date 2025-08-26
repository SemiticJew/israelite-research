// js/chapter.js
(function () {
  const BASE = '/israelite-research'; // required on GitHub Pages

  const qs = new URLSearchParams(location.search);
  const rawBook = (qs.get('book') || 'Genesis').trim();
  const chapter = (qs.get('chapter') || '1').trim();

  // "Genesis" -> "genesis" (matches data/tanakh/genesis/1.json)
  const slug = rawBook.toLowerCase().replace(/\s+/g, '');

  const versesEl = document.getElementById('verses');
  const headingEl = document.getElementById('chapterHeading');

  if (headingEl) headingEl.textContent = `${rawBook} ${chapter}`;
  if (versesEl) versesEl.textContent = 'Loading…';

  const url = `${BASE}/data/tanakh/${slug}/${chapter}.json`;

  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (!data || !Array.isArray(data.verses)) throw new Error('Bad JSON shape');
      versesEl.innerHTML = data.verses.map(v => `
        <div class="verse-row">
          <div class="vnum">${v.num}</div>
          <div class="vtext">${v.text}</div>
          ${renderXrefs(v.crossRefs)}${renderNotes(v.commentary)}
        </div>
      `).join('');
    })
    .catch(err => {
      versesEl.innerHTML = `
        <div class="error">Couldn’t load chapter data. (${err.message})</div>
        <div class="hint">Looked for: <code>${url}</code></div>
      `;
    });

  function renderXrefs(list) {
    if (!list || !list.length) return '';
    return `<details class="xref"><summary>Cross References (${list.length})</summary>
      <ul>${list.map(r => `
        <li>
          <a href="https://biblia.com/bible/kjv1900/${encodeURIComponent(r.ref)}" target="_blank" rel="noopener">${r.ref}</a>${r.note ? ` — ${r.note}` : ''}
        </li>`).join('')}
      </ul>
    </details>`;
  }

  function renderNotes(txt) {
    if (!txt) return '';
    return `<details class="notes"><summary>Notes</summary><div>${txt}</div></details>`;
  }
})();
