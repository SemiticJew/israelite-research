(function () {
  const params = new URLSearchParams(location.search);
  const book = params.get('book') || 'Genesis';
  const chapter = params.get('chapter') || '1';

  const titleEl = document.getElementById('chapter-title');
  const versesEl = document.getElementById('verses');

  titleEl.textContent = `${book} ${chapter}`;

  // Build path to your JSON (matches your repo structure)
  const url = `/israelite-research/data/tanakh/${encodeURIComponent(book)}/${encodeURIComponent(chapter)}.json`;

  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`Missing data for ${book} ${chapter}`);
      return r.json();
    })
    .then(data => {
      // optional: trust JSON’s own book/chapter if present
      titleEl.textContent = `${data.book || book} ${data.chapter || chapter}`;

      versesEl.innerHTML = (data.verses || []).map(v => `
        <section class="verse" id="v${v.num}">
          <div class="verse-head">
            <span class="num">${v.num}</span>
            <div class="actions">
              <button class="btn-ref" data-v="${v.num}">Cross-Refs</button>
              <button class="btn-notes" data-v="${v.num}">Notes</button>
            </div>
          </div>
          <p class="text">${v.text}</p>

          <div class="panel refs" id="refs-${v.num}" hidden>
            ${(v.crossRefs && v.crossRefs.length)
              ? `<ul>` + v.crossRefs.map(cr => `<li><strong>${cr.ref}</strong>${cr.note ? ` — ${cr.note}`:''}</li>`).join('') + `</ul>`
              : `<em>No cross-references.</em>`}
          </div>

          <div class="panel notes" id="notes-${v.num}" hidden>
            ${v.commentary ? v.commentary : `<em>No notes yet.</em>`}
          </div>
        </section>
      `).join('');

      // Toggle handlers
      versesEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-ref')) {
          const n = e.target.dataset.v;
          document.getElementById(`refs-${n}`).toggleAttribute('hidden');
        }
        if (e.target.classList.contains('btn-notes')) {
          const n = e.target.dataset.v;
          document.getElementById(`notes-${n}`).toggleAttribute('hidden');
        }
      });
    })
    .catch(err => {
      versesEl.innerHTML = `<p style="color:#b00">Error: ${err.message}</p>`;
    });
})();
