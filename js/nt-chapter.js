// /israelite-research/js/nt-chapter.js

(function(){
  const qs = new URLSearchParams(location.search);
  const bookSlug = (qs.get('book') || '').trim();
  const ch = parseInt(qs.get('ch') || '1', 10);

  const versesEl = document.getElementById('verses');
  const headEl   = document.getElementById('textHead');
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
    path.includes('/tanakh/')      ? 'tanakh' :
    path.includes('/newtestament/')? 'newtestament' :
    path.includes('/apocrypha/')   ? 'apocrypha' : 'tanakh';

  // Title Case for the heading from slug
  function titleCaseFromSlug(s){
    return s.split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
  }

  // Data URL (expects files like: data/<canon>/<bookSlug>/<ch>.json)
  const dataURL = `/israelite-research/data/${canon}/${bookSlug}/${ch}.json`;

  // Basic chapter picker (1..200 safety; replace with real counts if you have them)
  (function initPicker(){
    if(!picker) return;
    const maxCh = 200; // fallback upper bound
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

  // Prev/Next
  if(prevBtn){
    prevBtn.addEventListener('click', () => {
      const to = Math.max(1, ch - 1);
      location.href = `?book=${encodeURIComponent(bookSlug)}&ch=${to}`;
    });
  }
  if(nextBtn){
    nextBtn.addEventListener('click', () => {
      const to = ch + 1;
      location.href = `?book=${encodeURIComponent(bookSlug)}&ch=${to}`;
    });
  }

  // Escape HTML (if your JSON text is plain)
  function esc(s){
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

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

      // data is expected to be an array: [{ v, t, c, s }, ...]
      if(!Array.isArray(data) || data.length === 0){
        versesEl.innerHTML = '<p class="muted">No verses found for this chapter.</p>';
        return;
      }

      // Render one wrapper per verse (this is what creates visual separation)
      const html = data.map(row => {
        const num = row.v ?? '';
        const txt = row.t ?? '';
        return `
          <div class="verse" id="v${num}">
            <div class="vline">
              <div class="vnum">${esc(num)}</div>
              <div class="vtext">${esc(txt)}</div>
            </div>
            <div class="v-toolbar">
              <button type="button" data-copy="${esc(num)}">Copy</button>
            </div>
          </div>
        `;
      }).join('');

      versesEl.innerHTML = html;

      // Copy handler (once per render)
      versesEl.addEventListener('click', e => {
        const btn = e.target.closest('button[data-copy]');
        if(!btn) return;
        const n = btn.getAttribute('data-copy');
        const vRow = btn.closest('.verse');
        const vText = vRow?.querySelector('.vtext')?.textContent || '';
        const ref = `${titleCaseFromSlug(bookSlug)} ${ch}:${n}`;
        navigator.clipboard.writeText(`${ref} — ${vText}`);
        btn.textContent = 'Copied!';
        setTimeout(()=> btn.textContent = 'Copy', 1000);
      }, { once:true });

    }catch(err){
      console.error(err);
      if(versesEl){
        versesEl.innerHTML = `<p class="muted">Failed to load chapter data: ${esc(err.message)}</p>`;
      }
    }
  }

  // Dictionary: Easton’s (optional)
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
        idx = json; // expected { "EDEN": "entry text", ... } or [{head, body}, ...]
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

  loadChapter();
})();
