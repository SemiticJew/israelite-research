(function(){
  const params = new URLSearchParams(location.search);
  const book   = params.get('book') || 'Genesis';
  const chap   = params.get('chapter') || '1';

  // Hero title
  const heroTitle = document.getElementById('hero-title');
  if (heroTitle) heroTitle.textContent = `${book} ${chap}`;

  // Build data path (lowercase folder names as you noted)
  const dataPath = `/israelite-research/data/tanakh/${book.toLowerCase()}/${chap}.json`;

  fetch(dataPath)
    .then(r => r.json())
    .then(renderChapter)
    .catch(err => {
      console.error(err);
      const v = document.getElementById('verses');
      if (v) v.innerHTML = `<p style="color:#a00">Could not load ${book} ${chap}.</p>`;
    });

  function renderChapter(data){
    const container = document.getElementById('verses');
    if (!container){ return; }

    // Ensure we have verses array
    const verses = Array.isArray(data.verses) ? data.verses : [];

    // Render each verse row with left controls and right content
    container.innerHTML = verses.map(v => verseRowHTML(book, data.chapter || chap, v)).join('');

    // Wire up tools toggles
    container.querySelectorAll('.tools-btn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.preventDefault();
        const id = btn.getAttribute('data-target');
        const panel = document.getElementById(id);
        if (panel){
          panel.classList.toggle('active');
          // default tab = Cross References
          const firstTab = panel.querySelector('.tab-btn[data-panel="xrefs"]');
          const xrefsPanel = panel.querySelector('.tab-panel[data-panel="xrefs"]');
          if (firstTab && xrefsPanel){
            setActiveTab(panel, firstTab, xrefsPanel);
          }
        }
      });
    });

    // Wire up copy buttons
    container.querySelectorAll('.copy-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const text = btn.getAttribute('data-copy') || '';
        navigator.clipboard.writeText(text).catch(()=>{});
        btn.textContent = 'Copied';
        setTimeout(()=>btn.textContent='Copy',1000);
      });
    });

    // Tab switching inside each verse-tools
    container.querySelectorAll('.tabs').forEach(tabBar=>{
      tabBar.addEventListener('click', (e)=>{
        const btn = e.target.closest('.tab-btn');
        if(!btn) return;
        const parent = tabBar.closest('.verse-tools');
        const target = parent.querySelector(`.tab-panel[data-panel="${btn.dataset.panel}"]`);
        setActiveTab(parent, btn, target);
      });
    });
  }

  function setActiveTab(scope, btn, panel){
    // deactivate all
    scope.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    scope.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    // activate chosen
    if(btn) btn.classList.add('active');
    if(panel) panel.classList.add('active');
  }

  function verseRowHTML(book, chapter, verse){
    const idBase = `v-${chapter}-${verse.num}`;
    const copyPayload = `${book} ${chapter}:${verse.num} — ${verse.text}`;

    // Cross refs HTML (render if present; show “None yet” if not)
    let xrefsHTML = '';
    if (Array.isArray(verse.crossRefs) && verse.crossRefs.length){
      xrefsHTML = `<ul class="xref-list">` +
        verse.crossRefs.map(x => `<li><strong>${escapeHTML(x.ref)}:</strong> ${escapeHTML(x.note || '')}</li>`).join('') +
      `</ul>`;
    } else {
      xrefsHTML = `<p style="color:#555; margin:0;">No cross references yet.</p>`;
    }

    return `
    <div class="verse-card" id="${idBase}">
      <div class="verse-row">
        <div class="verse-actions">
          <button class="tools-btn" data-target="${idBase}-tools" aria-expanded="false">Tools</button>
          <button class="copy-btn" data-copy="${escapeHTML(copyPayload)}" aria-label="Copy verse">Copy</button>
          <span class="verse-num">${verse.num}</span>
        </div>
        <div class="verse-content">
          <div class="verse-text">${escapeHTML(verse.text)}</div>
          <div class="verse-tools" id="${idBase}-tools" aria-hidden="true">
            <div class="tabs" role="tablist">
              <button class="tab-btn" data-panel="xrefs" role="tab">Cross References</button>
              <button class="tab-btn" data-panel="notes" role="tab">My Commentary</button>
              <button class="tab-btn" data-panel="lex" role="tab">Lexicon</button>
              <button class="tab-btn" data-panel="strongs" role="tab">Strong’s</button>
            </div>
            <div class="tab-panel" data-panel="xrefs" role="tabpanel">
              ${xrefsHTML}
            </div>
            <div class="tab-panel" data-panel="notes" role="tabpanel">
              ${verse.commentary && verse.commentary.trim()
                 ? `<p>${escapeHTML(verse.commentary)}</p>`
                 : `<p style="color:#555; margin:0;">No notes yet.</p>`}
            </div>
            <div class="tab-panel" data-panel="lex" role="tabpanel">
              <p style="color:#555; margin:0;">Lexicon coming soon.</p>
            </div>
            <div class="tab-panel" data-panel="strongs" role="tabpanel">
              <p style="color:#555; margin:0;">Strong’s coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function escapeHTML(s){
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }
})();
