<script>
/*
  Generic NT chapter renderer
  Expects URL like: /israelite-research/newtestament/matthew/chapter-1.html
  Loads:
    /israelite-research/data/bible/kjv/matthew/1.json
    /israelite-research/data/lexicon/strongs/matthew/1.json
*/

(async function () {
  const container = document.getElementById('verses');
  const lexiconBox = document.getElementById('lexicon');
  const status = (msg) => { if (container) container.innerHTML = `<p class="muted">${msg}</p>`; };

  function parsePath() {
    const parts = location.pathname.split('/').filter(Boolean);
    // [..., "newtestament", "<book>", "chapter-<n>.html"]
    const idx = parts.indexOf('newtestament');
    if (idx === -1 || idx + 2 >= parts.length) return null;
    const book = parts[idx + 1];
    const chapterFile = parts[idx + 2] || '';
    const m = chapterFile.match(/chapter-(\d+)\.html/i);
    const chapter = m ? parseInt(m[1], 10) : 1;
    return { book, chapter };
  }

  const ctx = parsePath();
  if (!ctx) { status('Invalid chapter URL'); return; }

  // Paths to data
  const verseURL  = `/israelite-research/data/bible/kjv/${ctx.book}/${ctx.chapter}.json`;
  const strongURL = `/israelite-research/data/lexicon/strongs/${ctx.book}/${ctx.chapter}.json`;

  // Render helpers
  function renderVerses(data) {
    if (!data || !Array.isArray(data.verses) || data.verses.length === 0) {
      status('Verses coming soon.'); return;
    }
    container.innerHTML = data.verses.map(v =>
      `<article class="verse" id="v${v.v}">
         <span class="vnum">${v.v}</span>
         <span class="vtext">${v.t}</span>
       </article>`
    ).join('');
  }

  function renderLexicon(data) {
    if (!lexiconBox) return;
    if (!data || !data.entries || Object.keys(data.entries).length === 0) {
      lexiconBox.innerHTML = '<p class="muted">Strong’s entries coming soon.</p>'; return;
    }
    const items = Object.entries(data.entries).map(([num, info]) => {
      const head = (info.headword || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const translit = info.translit ? ` — <em>${info.translit}</em>` : '';
      const gloss = info.gloss ? ` — ${info.gloss}` : '';
      return `<li><strong>${num}</strong> ${head}${translit}${gloss}</li>`;
    }).join('');
    lexiconBox.innerHTML = `<ul class="lex">${items}</ul>`;
  }

  // Load both in parallel (resilient)
  try {
    const [vRes, sRes] = await Promise.allSettled([
      fetch(verseURL), fetch(strongURL)
    ]);

    if (vRes.status === 'fulfilled' && vRes.value.ok) {
      const vJson = await vRes.value.json();
      renderVerses(vJson);
    } else {
      status('Verses coming soon.');
    }

    if (sRes.status === 'fulfilled' && sRes.value.ok) {
      const sJson = await sRes.value.json();
      renderLexicon(sJson);
    } else {
      renderLexicon(null);
    }
  } catch {
    status('Verses coming soon.');
    renderLexicon(null);
  }
})();
</script>
