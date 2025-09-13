// /israelite-research/js/nt-chapter.js
(function(){
  // --- Optional: real chapter counts (fill in as your JSON lands) ---
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
    apocrypha: {
      "1-esdras":9,"2-esdras":16,"tobit":14,"judith":16,"rest-of-esther":10,"wisdom-of-solomon":19,"sirach":51,"baruch":6,
      "letter-of-jeremiah":1,"prayer-of-manasseh":1,"1-maccabees":16,"2-maccabees":15,"susanna":1,"bel-and-the-dragon":1,
      "prayer-of-azariah":1,"psalm-151":1,"additions-to-esther":10,"3-maccabees":7,"4-maccabees":18,"laodiceans":1
    }
  };

  // --- URL params ---
  const qs = new URLSearchParams(location.search);
  const bookSlug = (qs.get('book') || '').trim();
  const ch = parseInt(qs.get('ch') || '1', 10);

  // --- DOM handles ---
  const versesEl = document.getElementById('verses');
  const bookTitleEl = document.getElementById('bookTitle');
  const textPanelTitleEl = document.getElementById('textPanelTitle');
  const crumbsEl = document.getElementById('crumbs');
  const chSelect = document.getElementById('chSelect');
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

  // Title Case from slug (with roman numeral normalization)
  function titleCaseFromSlug(slug){
    if(!slug) return '';
    const romans = { i:'I', ii:'II', iii:'III', iv:'IV', v:'V', vi:'VI', vii:'VII', viii:'VIII', ix:'IX', x:'X' };
    const parts = slug.split('-');
    if(parts.length && romans[parts[0]]) parts[0] = romans[parts[0]];
    return parts.map((p,i)=> (i===0 && romans[p]) ? romans[p] : p.charAt(0).toUpperCase()+p.slice(1)).join(' ');
  }

  // Page headings
  function setHead(){
    const title = titleCaseFromSlug(bookSlug) || 'Chapter';
    if(bookTitleEl) bookTitleEl.textContent = title;
    document.title = `${title} — Chapter`;
    if(textPanelTitleEl) textPanelTitleEl.textContent = `${title} ${Number.isFinite(ch) ? ch : ''}`;
    if(crumbsEl) crumbsEl.textContent = `${title}${Number.isFinite(ch) ? ' • Chapter ' + ch : ''}`;
  }

  // Data URL (expects: data/<canon>/<bookSlug>/<ch>.json)
  const dataURL = `/israelite-research/data/${canon}/${bookSlug}/${ch}.json`;

  // Chapter picker (+ prev/next) using real counts when available
  function getMaxCh(){
    const table = CHAPTER_COUNTS[canon] || {};
    return table[bookSlug] || 200; // fallback generous cap
  }
  function populateChapterPicker(){
    if(!chSelect) return;
    const max = getMaxCh();
    chSelect.innerHTML = '';
    for(let i=1;i<=max;i++){
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = 'Chapter ' + i;
      if(i===ch) opt.selected = true;
      chSelect.appendChild(opt);
    }
  }
  function goToChapter(n){
    const max = getMaxCh();
    const to = Math.max(1, Math.min(max, n));
    const q = new URLSearchParams(location.search);
    q.set('ch', String(to));
    location.search = q.toString();
  }
  if(prevBtn) prevBtn.addEventListener('click', ()=> goToChapter(ch-1));
  if(nextBtn) nextBtn.addEventListener('click', ()=> goToChapter(ch+1));
  if(chSelect) chSelect.addEventListener('change', e => goToChapter(parseInt(e.target.value,10)||1));

  // Escape HTML
  function esc(s){
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  // Load & render verses
  async function loadChapter(){
    if(versesEl) versesEl.innerHTML = '<p class="muted">Loading…</p>';
    try{
      const res = await fetch(dataURL, { cache:'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json(); // Expect: [{ v, t, c?, s? }, ...]

      if(!Array.isArray(data) || !data.length){
        versesEl.innerHTML = '<p class="muted">No verses found for this chapter.</p>';
        return;
      }

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
              <button type="button" class="btn-copy" data-copy="${esc(num)}">Copy</button>
            </div>
          </div>
        `;
      }).join('');
      versesEl.innerHTML = html;

      // Persistent copy handler
      versesEl.addEventListener('click', e => {
        const btn = e.target.closest('button[data-copy]');
        if(!btn) return;
        const n = btn.getAttribute('data-copy');
        const vRow = btn.closest('.verse');
        const vText = vRow?.querySelector('.vtext')?.textContent || '';
        const ref = `${titleCaseFromSlug(bookSlug)} ${ch}:${n}`;
        navigator.clipboard.writeText(`${ref} — ${vText}`);
        const old = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(()=> btn.textContent = old || 'Copy', 900);
      });
    }catch(err){
      console.error(err);
      versesEl.innerHTML = `<p class="muted">Failed to load chapter data.</p>`;
    }
  }

  // Bible Dictionary (Easton) right panel
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
        const json = await res.json();
        idx = json;
      }catch(e){
        idx = {};
      }
      return idx;
    }

    input.addEventListener('input', async () => {
      const q = (input.value || '').trim();
      if(!q){ panel.innerHTML = '<p class="muted">Type a term above (e.g., “Abraham”, “Passover”, “Covenant”).</p>'; return; }

      const dict = await ensureDict();
      // Support either array [{term,definitions[]}] or object {TERM: "body"}
      let html = '';
      if(Array.isArray(dict)){
        const needle = q.toLowerCase();
        const hits = dict.filter(e => (e.term||'').toLowerCase().includes(needle)).slice(0,6);
        if(!hits.length){ panel.innerHTML = '<p class="muted">No entries found.</p>'; return; }
        html = hits.map(e=>{
          const defs = (e.definitions||[]).map(d=>`<li>${esc(d)}</li>`).join('');
          return `<article style="margin:.5rem 0">
            <h4 style="margin:.1rem 0 .2rem; color:var(--ink)">${esc(e.term||'')}</h4>
            <ol style="margin:.25rem 0 0 1.1rem">${defs}</ol>
          </article>`;
        }).join('');
      }else if(dict && typeof dict === 'object'){
        const key = q.toUpperCase();
        const body = dict[key];
        html = body
          ? `<article style="margin:.5rem 0">
               <h4 style="margin:.1rem 0 .2rem; color:var(--ink)">${esc(q)}</h4>
               <div>${esc(String(body))}</div>
             </article>`
          : '<p class="muted">No entries found.</p>';
      }else{
        html = '<p class="muted">Dictionary not available.</p>';
      }
      panel.innerHTML = html;
    });
  })();

  // Boot
  setHead();
  populateChapterPicker();
  loadChapter();
})();
