<script>
(async function () {
  const $verses = document.getElementById('verses');
  const $lex = document.getElementById('lexicon');
  const status = (msg) => { if ($verses) $verses.innerHTML = `<p class="muted">${msg}</p>`; };

  function getContext() {
    const parts = location.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('newtestament');
    const book = (idx !== -1 && parts[idx+1]) ? parts[idx+1] : 'matthew';
    const q = new URLSearchParams(location.search);
    const qc = parseInt(q.get('c') || '0', 10);
    if (qc > 0) return { book, chapter: qc };
    const last = parts[parts.length-1] || '';
    const m = last.match(/chapter-(\d+)\.html/i);
    return { book, chapter: m ? parseInt(m[1],10) : 1 };
  }

  const ctx = getContext();

  // NEW primary path (data-driven NT JSON)
  const versePrimary = `/israelite-research/data/newtestament/${ctx.book}/${ctx.chapter}.json`;
  // Fallback (older location, kept for resilience)
  const verseFallback = `/israelite-research/data/bible/kjv/${ctx.book}/${ctx.chapter}.json`;

  // Lexicon path unchanged (adjust later if you move it)
  const strongURL = `/israelite-research/data/lexicon/strongs/${ctx.book}/${ctx.chapter}.json`;

  async function fetchFirstOk(urls){
    for(const u of urls){
      try { const r = await fetch(u); if (r.ok) return r.json(); } catch {}
    }
    return null;
  }

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
    const cmt = (data.commentary || '').trim?.() || '';
    const box = document.getElementById('commentaryBox');
    if (cmt && box) box.value = cmt;
  }

  function renderLexicon(data) {
    if (!$lex) return;
    if (!data || !(data.entries || data.lexicon) || Object.keys(data.entries || data.lexicon).length === 0) {
      $lex.innerHTML = '<p class="muted">Strong’s entries coming soon.</p>'; return;
    }
    const entries = data.entries || data.lexicon;
    const items = Object.entries(entries).map(([num, info]) => {
      const head = (info.headword || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const translit = info.translit ? ` — <em>${info.translit}</em>` : '';
      const gloss = info.gloss ? ` — ${info.gloss}` : '';
      return `<li><strong>${num}</strong> ${head}${translit}${gloss}</li>`;
    }).join('');
    $lex.innerHTML = `<ul class="lex">${items}</ul>`;
  }

  try {
    const [vJson, sRes] = await Promise.all([
      fetchFirstOk([versePrimary, verseFallback]),
      fetch(strongURL).catch(() => null)
    ]);

    if (vJson) renderVerses(vJson); else status('Verses coming soon.');

    if (sRes && sRes.ok) {
      const sj = await sRes.json();
      renderLexicon(sj);
    } else {
      renderLexicon(null);
    }
  } catch {
    status('Verses coming soon.');
    renderLexicon(null);
  }
})();
</script>
