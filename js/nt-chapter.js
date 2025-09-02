<script>
(async function () {
  const $verses = document.getElementById('verses');
  const $lex = document.getElementById('lexicon');
  const status = (msg) => { if ($verses) $verses.innerHTML = `<p class="muted">${msg}</p>`; };

  function getContext() {
    const parts = location.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('newtestament');
    const book = (idx !== -1 && parts[idx+1]) ? parts[idx+1] : 'matthew'; // default safety
    // Prefer query (?c=) for chapter
    const q = new URLSearchParams(location.search);
    const qc = parseInt(q.get('c') || '0', 10);
    if (qc > 0) return { book, chapter: qc };

    // Fallback: parse /chapter-<n>.html
    const last = parts[parts.length-1] || '';
    const m = last.match(/chapter-(\d+)\.html/i);
    return { book, chapter: m ? parseInt(m[1],10) : 1 };
  }

  const ctx = getContext();

  const verseURL  = `/israelite-research/data/bible/kjv/${ctx.book}/${ctx.chapter}.json`;
  const strongURL = `/israelite-research/data/lexicon/strongs/${ctx.book}/${ctx.chapter}.json`;

  function renderVerses(data) {
    if (!data || !Array.isArray(data.verses) || data.verses.length === 0) {
      status('Verses coming soon.'); return;
    }
    $verses.innerHTML = data.verses.map(v =>
      `<article class="verse" id="v${v.v}">
         <span class="vnum">${v.v}</span>
         <span class="vtext">${v.t || ''}</span>
       </article>`
    ).join('');
    // Optional: load/commentary default if present in chapter JSON
    const cmt = (data.commentary || '').trim();
    if (cmt && document.getElementById('commentaryBox')) {
      document.getElementById('commentaryBox').value = cmt;
    }
  }

  function renderLexicon(data) {
    if (!$lex) return;
    if (!data || !data.entries || Object.keys(data.entries).length === 0) {
      $lex.innerHTML = '<p class="muted">Strong’s entries coming soon.</p>'; return;
    }
    const items = Object.entries(data.entries).map(([num, info]) => {
      const head = (info.headword || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const translit = info.translit ? ` — <em>${info.translit}</em>` : '';
      const gloss = info.gloss ? ` — ${info.gloss}` : '';
      return `<li><strong>${num}</strong> ${head}${translit}${gloss}</li>`;
    }).join('');
    $lex.innerHTML = `<ul class="lex">${items}</ul>`;
  }

  try {
    const [vRes, sRes] = await Promise.allSettled([ fetch(verseURL), fetch(strongURL) ]);
    if (vRes.status === 'fulfilled' && vRes.value.ok) {
      renderVerses(await vRes.value.json());
    } else {
      status('Verses coming soon.');
    }
    if (sRes.status === 'fulfilled' && sRes.value.ok) {
      const sj = await sRes.value.json();
      // support both shapes: entries{} or top-level lexicon{}
      renderLexicon(sj.entries ? sj : { entries: sj.lexicon || {} });
    } else {
      renderLexicon(null);
    }
  } catch {
    status('Verses coming soon.');
    renderLexicon(null);
  }
})();
</script>
