(function(){
  const params = new URLSearchParams(location.search);
  const book   = (params.get('book') || 'Genesis').trim();
  const chapter= parseInt(params.get('chapter') || '1', 10);

  // Title & subtitle
  const titleEl = document.getElementById('chapterTitle');
  const subEl   = document.getElementById('chapterSubtitle');
  if (titleEl) titleEl.textContent = `${book} ${chapter}`;
  if (subEl)   subEl.textContent   = `Chapter ${chapter}`;

  // Verses mount
  const versesRoot = document.getElementById('verses');

  // Data path (lowercase folder convention)
  const dataPath = `/israelite-research/data/tanakh/${book.toLowerCase()}/${chapter}.json`;

  fetch(dataPath)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(json => renderChapter(json))
    .catch(err => {
      console.error('Chapter load error:', err);
      if (versesRoot) versesRoot.textContent = 'Sorry—this chapter failed to load.';
    });

  function renderChapter(data){
    if (!versesRoot) return;
    versesRoot.innerHTML = '';

    (data.verses || []).forEach(v => {
      versesRoot.appendChild(renderVerse(v, data.book || book, data.chapter || chapter));
    });
  }

  function renderVerse(v, bookName, chNum){
    const wrap = el('div', 'verse');

    // header line: Tools button + verse number (copy removed from here)
    const head = el('div', 'verse-head');
    const toolsBtn = el('button', 'tools-btn');
    toolsBtn.type = 'button';
    toolsBtn.textContent = 'Tools';
    const vno = el('span', 'verse-number', v.num != null ? String(v.num) : '');
    head.appendChild(toolsBtn);
    head.appendChild(vno);

    // verse text
    const text = el('div', 'verse-text', v.text || '');

    // tools panel (hidden by default)
    const panel = el('div', 'tools-panel');

    // small toolbar inside panel (Copy lives here now)
    const toolbar = el('div', 'tools-toolbar');
    const copyBtn = el('button', 'copy-btn');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy verse';
    copyBtn.addEventListener('click', () => {
      const clip = `${bookName} ${chNum}:${v.num} — ${v.text}`;
      navigator.clipboard?.writeText(clip).catch(()=>{});
    });
    toolbar.appendChild(copyBtn);
    panel.appendChild(toolbar);

    // tabs
    const tabs = el('div', 'tool-tabs');
    const tabRefs = tabButton('Cross-refs', true);
    const tabComm = tabButton('Commentary');
    const tabLex  = tabButton('Lexicon');
    const tabStr  = tabButton('Strong’s');
    tabs.append(tabRefs, tabComm, tabLex, tabStr);

    // panes
    const paneRefs = el('div', 'tool-pane active');
    const paneComm = el('div', 'tool-pane');
    const paneLex  = el('div', 'tool-pane');
    const paneStr  = el('div', 'tool-pane');

    // Cross-refs list
    const refs = Array.isArray(v.crossRefs) ? v.crossRefs : [];
    if (refs.length){
      const ul = document.createElement('ul');
      refs.forEach(r => {
        const li = document.createElement('li');
        const ref = (r && r.ref) ? r.ref : '';
        const note= (r && r.note)? r.note : '';
        li.textContent = note ? `${ref} — ${note}` : ref;
        ul.appendChild(li);
      });
      paneRefs.appendChild(ul);
    } else {
      paneRefs.textContent = 'No cross-references yet.';
    }

    // Commentary box (for your notes)
    const commLabel = document.createElement('div');
    commLabel.style.marginBottom = '.25rem';
    commLabel.textContent = 'My commentary';
    const comm = el('textarea', 'commentary-box', v.commentary || '');
    comm.placeholder = 'Add your personal notes on this verse…';
    comm.addEventListener('change', () => {
      // local-only persistence hook (optional): key per verse
      try {
        const key = `commentary:${bookName}:${chNum}:${v.num}`;
        localStorage.setItem(key, comm.value);
      } catch {}
    });
    paneComm.append(commLabel, comm);

    // Lexicon / Strong’s placeholders
    paneLex.textContent = 'Lexicon coming soon.';
    paneStr.textContent = 'Strong’s concordance coming soon.';

    // tab wiring
    const panes = [paneRefs, paneComm, paneLex, paneStr];
    const buttons = [tabRefs, tabComm, tabLex, tabStr];
    buttons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        panes[idx].classList.add('active');
      });
    });

    panel.appendChild(tabs);
    panel.append(paneRefs, paneComm, paneLex, paneStr);

    // toggle panel
    toolsBtn.addEventListener('click', () => {
      panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
    });

    wrap.append(head, text, panel);
    return wrap;
  }

  // helpers
  function el(tag, cls, text){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function tabButton(label, active){
    const b = el('button','tool-tab',label);
    b.type='button';
    if (active) b.classList.add('active');
    return b;
  }
})();
