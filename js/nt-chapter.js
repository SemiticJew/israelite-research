// /israelite-research/js/nt-chapter.js
(function(){
  // ----------- Catalogs (edit these to your slugs & counts) ------------------
  // Titles & slugs for each canon
  const BOOKS = {
    tanakh: [
      ["genesis","Genesis"],["exodus","Exodus"],["leviticus","Leviticus"],["numbers","Numbers"],
      ["deuteronomy","Deuteronomy"],["joshua","Joshua"],["judges","Judges"],["ruth","Ruth"],
      ["1-samuel","1 Samuel"],["2-samuel","2 Samuel"],["1-kings","1 Kings"],["2-kings","2 Kings"],
      ["1-chronicles","1 Chronicles"],["2-chronicles","2 Chronicles"],["ezra","Ezra"],["nehemiah","Nehemiah"],
      ["esther","Esther"],["job","Job"],["psalms","Psalms"],["proverbs","Proverbs"],["ecclesiastes","Ecclesiastes"],
      ["song-of-solomon","Song of Solomon"],["isaiah","Isaiah"],["jeremiah","Jeremiah"],["lamentations","Lamentations"],
      ["ezekiel","Ezekiel"],["daniel","Daniel"],["hosea","Hosea"],["joel","Joel"],["amos","Amos"],
      ["obadiah","Obadiah"],["jonah","Jonah"],["micah","Micah"],["nahum","Nahum"],["habakkuk","Habakkuk"],
      ["zephaniah","Zephaniah"],["haggai","Haggai"],["zechariah","Zechariah"],["malachi","Malachi"]
    ],
    newtestament: [
      ["matthew","Matthew"],["mark","Mark"],["luke","Luke"],["john","John"],["acts","Acts"],
      ["romans","Romans"],["1-corinthians","1 Corinthians"],["2-corinthians","2 Corinthians"],
      ["galatians","Galatians"],["ephesians","Ephesians"],["philippians","Philippians"],["colossians","Colossians"],
      ["1-thessalonians","1 Thessalonians"],["2-thessalonians","2 Thessalonians"],["1-timothy","1 Timothy"],
      ["2-timothy","2 Timothy"],["titus","Titus"],["philemon","Philemon"],["hebrews","Hebrews"],["james","James"],
      ["1-peter","1 Peter"],["2-peter","2 Peter"],["1-john","1 John"],["2-john","2 John"],["3-john","3 John"],
      ["jude","Jude"],["revelation","Revelation"]
    ],
    // Adjust to your Apocrypha set & slugs; counts below assume KJV Apocrypha
    apocrypha: [
      ["1-esdras","1 Esdras"],["2-esdras","2 Esdras"],["tobit","Tobit"],["judith","Judith"],
      ["rest-of-esther","Rest of Esther"],["wisdom","Wisdom of Solomon"],["sirach","Ecclesiasticus (Sirach)"],
      ["baruch","Baruch"],["letter-of-jeremiah","Letter of Jeremiah"],["prayer-of-manasseh","Prayer of Manasseh"],
      ["1-maccabees","1 Maccabees"],["2-maccabees","2 Maccabees"],["susanna","Susanna"],
      ["bel-and-the-dragon","Bel and the Dragon"],["song-of-three","Song of the Three"]
    ]
  };

  // Real chapter counts (edit here once; UI updates everywhere)
  const CHAPTER_COUNTS = {
    tanakh: {
      "genesis":50,"exodus":40,"leviticus":27,"numbers":36,"deuteronomy":34,"joshua":24,"judges":21,"ruth":4,
      "1-samuel":31,"2-samuel":24,"1-kings":22,"2-kings":25,"1-chronicles":29,"2-chronicles":36,"ezra":10,"nehemiah":13,
      "esther":10,"job":42,"psalms":150,"proverbs":31,"ecclesiastes":12,"song-of-solomon":8,"isaiah":66,"jeremiah":52,
      "lamentations":5,"ezekiel":48,"daniel":12,"hosea":14,"joel":3,"amos":9,"obadiah":1,"jonah":4,"micah":7,"nahum":3,
      "habakkuk":3,"zephaniah":3,"haggai":2,"zechariah":14,"malachi":4
    },
    newtestament: {
      "matthew":28,"mark":16,"luke":24,"john":21,"acts":28,"romans":16,"1-corinthians":16,"2-corinthians":13,
      "galatians":6,"ephesians":6,"philippians":4,"colossians":4,"1-thessalonians":5,"2-thessalonians":3,
      "1-timothy":6,"2-timothy":4,"titus":3,"philemon":1,"hebrews":13,"james":5,"1-peter":5,"2-peter":3,
      "1-john":5,"2-john":1,"3-john":1,"jude":1,"revelation":22
    },
    // These are common assignments; adjust to your JSON structure if combined/split differently
    apocrypha: {
      "1-esdras":9,"2-esdras":16,"tobit":14,"judith":16,"rest-of-esther":10,"wisdom":19,"sirach":51,"baruch":6,
      "letter-of-jeremiah":1,"prayer-of-manasseh":1,"1-maccabees":16,"2-maccabees":15,"susanna":1,"bel-and-the-dragon":1,"song-of-three":1
    }
  };

  // ----------------------- URL & DOM handles ---------------------------------
  const qs = new URLSearchParams(location.search);
  const bookSlug = (qs.get('book') || '').trim();
  const ch = parseInt(qs.get('ch') || '1', 10);

  const versesEl = document.getElementById('verses');
  const headEl   = document.getElementById('textHead');
  const bookSel  = document.getElementById('bookSelect');   // <-- add <select id="bookSelect"> in your HTML header
  const picker   = document.getElementById('chSelect');
  const prevBtn  = document.getElementById('btnPrev');
  const nextBtn  = document.getElementById('btnNext');

  if(!bookSlug || !Number.isFinite(ch)){
    if(versesEl) versesEl.innerHTML = '<p class="muted">Missing book/chapter in URL.</p>';
    return;
  }

  // Detect canon by path
  const path = location.pathname;
  const canon =
    path.includes('/tanakh/')       ? 'tanakh' :
    path.includes('/newtestament/') ? 'newtestament' :
    path.includes('/apocrypha/')    ? 'apocrypha' : 'tanakh';

  // Title Case for the heading from slug
  function titleCaseFromSlug(s){
    return s.split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
  }

  // Data URL (expects files like: data/<canon>/<bookSlug>/<ch>.json)
  const dataURL = `/israelite-research/data/${canon}/${bookSlug}/${ch}.json`;

  // ------------------------ Selectors & Nav ----------------------------------
  (function initBookSelect(){
    if(!bookSel) return;
    const list = BOOKS[canon] || [];
    bookSel.innerHTML = '';
    for(const [slug,title] of list){
      const opt = document.createElement('option');
      opt.value = slug;
      opt.textContent = title;
      if(slug === bookSlug) opt.selected = true;
      bookSel.appendChild(opt);
    }
    bookSel.addEventListener('change', ()=>{
      const toBook = bookSel.value;
      // When switching books, jump to chapter 1 (or clamp to available)
      const max = (CHAPTER_COUNTS[canon]||{})[toBook] || 1;
      location.href = `?book=${encodeURIComponent(toBook)}&ch=1`;
    });
  })();

  (function initChapterPicker(){
    if(!picker) return;
    const maxCh = (CHAPTER_COUNTS[canon]||{})[bookSlug] || 200; // falls back if missing
    picker.innerHTML = '';
    for(let i=1;i<=maxCh;i++){
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = i;
      if(i === ch) opt.selected = true;
      picker.appendChild(opt);
    }
    picker.addEventListener('change', () => {
      const to = parseInt(picker.value, 10);
      if(Number.isFinite(to)){
        location.href = `?book=${encodeURIComponent(bookSlug)}&ch=${to}`;
      }
    });
  })();

  if(prevBtn){
    prevBtn.addEventListener('click', () => {
      const maxCh = (CHAPTER_COUNTS[canon]||{})[bookSlug] || 200;
      const to = Math.max(1, Math.min(maxCh, ch - 1));
      location.href = `?book=${encodeURIComponent(bookSlug)}&ch=${to}`;
    });
  }
  if(nextBtn){
    nextBtn.addEventListener('click', () => {
      const maxCh = (CHAPTER_COUNTS[canon]||{})[bookSlug] || 200;
      const to = Math.max(1, Math.min(maxCh, ch + 1));
      location.href = `?book=${encodeURIComponent(bookSlug)}&ch=${to}`;
    });
  }

  // ---------------------------- Utils ---------------------------------------
  function esc(s){
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  // Helpers for sections
  function renderCrossRefs(row){
    const c = row.c;
    if(!c || (Array.isArray(c) && c.length === 0)) {
      return '<p class="muted">No cross references yet.</p>';
    }
    if(Array.isArray(c)){
      const items = c.map(x => {
        if(typeof x === 'string') return `<li>${esc(x)}</li>`;
        if(x && typeof x === 'object'){
          const ref = x.ref ? esc(x.ref) : '';
          const note = x.note ? ` — <span class="muted">${esc(x.note)}</span>` : '';
          return `<li>${ref}${note}</li>`;
        }
        return '';
      }).join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${esc(String(c))}</p>`;
  }

  function renderLex(row){
    const s = row.s;
    if(!s || (Array.isArray(s) && s.length === 0)){
      return '<p class="muted">Select a word or use the right-side dictionary.</p>';
    }
    if(Array.isArray(s)){
      const items = s.map(x => {
        if(typeof x === 'string') return `<li><code>${esc(x)}</code></li>`;
        if(x && typeof x === 'object'){
          const strong = x.strong ? `<code>${esc(x.strong)}</code>` : '';
          const lemma  = x.lemma ? ` — <strong>${esc(x.lemma)}</strong>` : '';
          const gloss  = x.gloss ? ` <span class="muted">(${esc(x.gloss)})</span>` : '';
          return `<li>${strong}${lemma}${gloss}</li>`;
        }
        return '';
      }).join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${esc(String(s))}</p>`;
  }

  // ---------------------------- Loader --------------------------------------
  async function loadChapter(){
    if(headEl){
      headEl.textContent = `${titleCaseFromSlug(bookSlug)} ${ch}`;
    }
    if(versesEl){
      versesEl.innerHTML = '<p class="muted">Loading…</p>';
    }

    try{
      const res = await fetch(dataURL, { cache:'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Expect: [{ v, t, c?, s? }, ...]
      if(!Array.isArray(data) || data.length === 0){
        versesEl.innerHTML = '<p class="muted">No verses found for this chapter.</p>';
        return;
      }

      // Render per-verse enclosures with modern controls
      const html = data.map(row => {
        const num = row.v ?? '';
        const txt = row.t ?? '';
        return `
          <div class="verse" id="v${esc(num)}">
            <div class="vline">
              <div class="vnum">${esc(num)}</div>
              <div class="vtext">${esc(txt)}</div>
            </div>

            <div class="v-toolbar">
              <button class="btn-copy" type="button" data-copy="${esc(num)}" title="Copy verse">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>
                <span>Copy</span>
              </button>
            </div>

            <div class="v-sections">
              <details class="v-sec" data-kind="xrefs">
                <summary>
                  <span>Cross References</span>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                </summary>
                <div class="content">
                  ${renderCrossRefs(row)}
                </div>
              </details>

              <details class="v-sec" data-kind="comm">
                <summary>
                  <span>Commentary</span>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                </summary>
                <div class="content">
                  <p class="muted">Your personal notes for this verse.</p>
                </div>
              </details>

              <details class="v-sec" data-kind="lex">
                <summary>
                  <span>Lexicon</span>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                </summary>
                <div class="content">
                  ${renderLex(row)}
                </div>
              </details>
            </div>
          </div>
        `;
      }).join('');

      versesEl.innerHTML = html;

      // Modern copy handler (persistent)
      versesEl.addEventListener('click', e => {
        const btn = e.target.closest('button[data-copy]');
        if(!btn) return;
        const n = btn.getAttribute('data-copy');
        const vRow = btn.closest('.verse');
        const vText = vRow?.querySelector('.vtext')?.textContent || '';
        const ref = `${titleCaseFromSlug(bookSlug)} ${ch}:${n}`;
        navigator.clipboard.writeText(`${ref} — ${vText}`);
        // quick visual feedback
        const label = btn.querySelector('span');
        const old = label ? label.textContent : '';
        if(label){ label.textContent = 'Copied!'; setTimeout(()=>{ label.textContent = old || 'Copy'; }, 900); }
      });

    }catch(err){
      console.error(err);
      if(versesEl){
        versesEl.innerHTML = `<p class="muted">Failed to load chapter data: ${esc(err.message)}</p>`;
      }
    }
  }

  // ---------------------- Right Column Dictionary ----------------------------
  (function wireDict(){
    const input = document.getElementById('dictSearch');
    const panel = document.getElementById('dictPanel');
    if(!input || !panel) return;

    let idx = null;
    async function ensureDict(){
      if(idx) return idx;
      const url = '/israelite-research/data/dictionaries/easton_dictionary.json';
      try{
        const res = await fetch(url, { cache:'force-cache' });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        idx = await res.json(); // { "EDEN": "..."} or [{head, body}, ...]
      }catch(e){
        idx = {};
      }
      return idx;
    }

    input.addEventListener('change', async () => {
      const q = (input.value || '').trim();
      if(!q){ panel.innerHTML = '<p class="muted">Type a term to search…</p>'; return; }
      const dict = await ensureDict();
      const key  = q.toUpperCase();
      let hit = null;

      if(Array.isArray(dict)){
        hit = dict.find(d => (d.head || '').toUpperCase() === key);
        panel.innerHTML = hit
          ? `<div><strong>${esc(hit.head)}</strong><div>${esc(hit.body || '')}</div></div>`
          : `<p class="muted">No entry for <strong>${esc(q)}</strong>.</p>`;
      }else{
        const val = dict[key];
        panel.innerHTML = val
          ? `<div><strong>${esc(q)}</strong><div>${esc(val)}</div></div>`
          : `<p class="muted">No entry for <strong>${esc(q)}</strong>.</p>`;
      }
    });
  })();

  // ------------------------------- Go ---------------------------------------
  loadChapter();
})();
