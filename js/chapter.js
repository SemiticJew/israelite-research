// Robust Chapter loader for GitHub Pages
(function(){
  const BASE = '/israelite-research';

  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  // Folder strategy: lowercase, remove non-alphanumerics except hyphen.
  // Your current Tanakh folder for Genesis is "genesis" (lowercase).
  // Adjust here later if you introduce hyphenated folders (e.g., song-of-songs).
  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g,'');

  const titleEl = document.getElementById('chapterTitle');
  const descEl  = document.getElementById('chapterDesc');
  const versesEl= document.getElementById('verses');

  titleEl.textContent = `${book} ${chapter}`;
  descEl.textContent  = ''; // optional book/chapter blurb

  // Build breadcrumb path: Home > Texts > The Tanakh > {Book} > Chapter {n}
  try {
    const bc = document.getElementById('breadcrumbs');
    if (bc) {
      bc.innerHTML = `
        <ol>
          <li><a href="${BASE}/index.html">Home</a></li>
          <li><a href="${BASE}/texts.html">Texts</a></li>
          <li><a href="${BASE}/tanakh.html">The Tanakh</a></li>
          <li><a href="${BASE}/tanakh/book.html?book=${encodeURIComponent(book)}">${book}</a></li>
          <li>Chapter ${chapter}</li>
        </ol>`;
    }
  } catch(e){ /* non-blocking */ }

  const url = `${BASE}/data/tanakh/${folder}/${chapter}.json`;

  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(json => renderChapter(json))
    .catch(err => {
      versesEl.innerHTML =
        `<div class="muted">Could not load ${book} ${chapter}. Check the path
         <code>${url}</code> and that <code>${chapter}.json</code> exists.</div>`;
      console.error('Chapter load error:', err);
    });

  function renderChapter(data){
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }
    const frag = document.createDocumentFragment();

    data.verses.forEach(v => {
      const row = document.createElement('div');
      row.className = 'verse-row';
      row.id = `v${v.num}`;

      const num = document.createElement('div');
      num.className = 'vnum';
      num.textContent = v.num;

      const txt = document.createElement('div');
      txt.className = 'vtext';
      txt.textContent = v.text || '';

      const btn = document.createElement('button');
      btn.className = 'tools-btn';
      btn.type = 'button';
      btn.textContent = 'Tools ▾';

      const panel = document.createElement('div');
      panel.className = 'tools';
      panel.hidden = true;

      // Cross references
      const xh = document.createElement('h4');
      xh.textContent = 'Cross References';
      const xbody = document.createElement('div');
      if (Array.isArray(v.crossRefs) && v.crossRefs.length) {
        v.crossRefs.forEach(cr => {
          const a = document.createElement('a');
          a.className = 'xref';
          a.href = '#';
          a.textContent = cr.ref + (cr.note ? ` — ${cr.note}` : '');
          a.style.display = 'block';
          xbody.appendChild(a);
        });
      } else {
        xbody.innerHTML = `<div class="muted">—</div>`;
      }

      // Commentary
      const ch = document.createElement('h4');
      ch.textContent = 'Commentary';
      const cbody = document.createElement('div');
      cbody.className = 'muted';
      cbody.textContent = (v.commentary && v.commentary.trim()) ? v.commentary : '—';

      // Lexicon
      const lh = document.createElement('h4');
      lh.textContent = "Lexicon";
      const lbody = document.createElement('div');
      lbody.className = 'muted';
      lbody.textContent = 'Coming soon.';

      // Strong’s
      const sh = document.createElement('h4');
      sh.textContent = "Strong’s Concordance";
      const sbody = document.createElement('div');
      sbody.className = 'muted';
      sbody.textContent = 'Coming soon.';

      panel.append(xh, xbody, ch, cbody, lh, lbody, sh, sbody);

      btn.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        btn.textContent = panel.hidden ? 'Tools ▾' : 'Tools ▴';
      });

      row.append(num, txt, btn, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }
})();
