(function () {
  const BASE = '/israelite-research';

  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Revelation';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');

  // Breadcrumbs
  try {
    const bc = document.getElementById('breadcrumbs');
    if (bc) {
      bc.innerHTML = `
        <ol>
          <li><a href="${BASE}/index.html">Home</a></li>
          <li><a href="${BASE}/texts.html">Texts</a></li>
          <li><a href="${BASE}/newtestament.html">New Testament</a></li>
          <li><a href="${BASE}/newtestament/book.html?book=${encodeURIComponent(book)}">${book}</a></li>
          <li>Chapter ${chapter}</li>
        </ol>`;
    }
  } catch {}

  const titleEl  = document.getElementById('chapterTitle');
  const descEl   = document.getElementById('chapterDesc');
  const versesEl = document.getElementById('verses');

  if (titleEl) titleEl.textContent = `${book} ${chapter}`;
  if (descEl)  descEl.textContent  = '';

  const url = `${BASE}/data/newtestament/${folder}/${chapter}.json`;

  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(renderChapter)
    .catch(err => {
      if (versesEl) {
        versesEl.innerHTML =
          `<div class="muted">Could not load ${book} ${chapter}. Check <code>${url}</code>.</div>`;
      }
      console.error('NT chapter load error:', err);
    });

  function renderChapter(data) {
    if (!versesEl) return;
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    data.verses.forEach(v => {
      const row = document.createElement('div');
      row.className = 'verse-row';
      row.style.display = 'grid';
      row.style.gridTemplateColumns = 'auto auto 44px 1fr'; // [Tools] [Copy] [#] [Text]
      row.style.gap = '0.6rem';
      row.style.alignItems = 'start';
      row.id = `v${v.num}`;

      const toolsBtn = document.createElement('button');
      toolsBtn.className = 'tools-btn';
      toolsBtn.type = 'button';
      toolsBtn.textContent = 'Tools ▾';
      toolsBtn.setAttribute('aria-expanded', 'false');
      toolsBtn.style.background = '#054A91';
      toolsBtn.style.color = '#fff';
      toolsBtn.style.border = '1px solid #054A91';
      toolsBtn.style.borderRadius = '8px';
      toolsBtn.style.padding = '.25rem .6rem';
      toolsBtn.style.cursor = 'pointer';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.type = 'button';
      copyBtn.title = 'Copy verse';
      copyBtn.setAttribute('aria-label', 'Copy verse');
      copyBtn.style.display = 'inline-flex';
      copyBtn.style.alignItems = 'center';
      copyBtn.style.justifyContent = 'center';
      copyBtn.style.width = '36px';
      copyBtn.style.height = '28px';
      copyBtn.style.border = '1px solid #e6ebf2';
      copyBtn.style.background = '#fff';
      copyBtn.style.borderRadius = '8px';
      copyBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="#054A91" d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16h-9V7h9v14z"/>' +
        '</svg>';

      const num = document.createElement('div');
      num.className = 'vnum';
      num.textContent = String(v.num);

      const txt = document.createElement('div');
      txt.className = 'vtext';
      txt.textContent = v.text || '';

      const panel = buildToolsPanel(v, { book, chapter });
      panel.hidden = true;
      panel.style.gridColumn = '1 / -1';
      panel.style.marginTop = '.5rem';
      panel.style.borderTop = '1px dashed #e0e6ef';
      panel.style.paddingTop = '.5rem';

      toolsBtn.addEventListener('click', () => {
        const open = panel.hidden;
        panel.hidden = !open;
        toolsBtn.textContent = open ? 'Tools ▴' : 'Tools ▾';
        toolsBtn.setAttribute('aria-expanded', String(open));
      });
      copyBtn.addEventListener('click', async () => {
        const payload = `${book} ${chapter}:${v.num} ${v.text || ''}`.trim();
        try { await navigator.clipboard.writeText(payload); copyBtn.innerHTML = '<span style="font-size:12px;color:#054A91;">✓</span>'; }
        catch { copyBtn.innerHTML = '<span style="font-size:12px;color:#054A91;">⌘/Ctrl+C</span>'; }
        setTimeout(()=>copyBtn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#054A91" d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16h-9V7h9v14z"/></svg>',
        900);
      });

      row.append(toolsBtn, copyBtn, num, txt, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }

  function buildToolsPanel(v, ctx) {
    const wrap = document.createElement('div'); wrap.className = 'tools';
    const tabsBar = document.createElement('div'); tabsBar.style.display='flex'; tabsBar.style.gap='.4rem'; tabsBar.style.marginBottom='.5rem';
    const contentWrap = document.createElement('div');

    const sections = [
      ['Cross-Refs', buildCrossRefs(v)],
      ['Commentary', buildCommentary(v, ctx)],
      ['Lexicon', buildLexicon(v)],
      ['Strong’s', buildStrongsSentence(v)],
    ];

    const btns = sections.map(([label, content], i) => {
      const b = document.createElement('button');
      b.type='button'; b.textContent=label;
      b.style.border='1px solid #e6ebf2'; b.style.background='#f8fafc'; b.style.borderRadius='8px';
      b.style.padding='.25rem .6rem'; b.style.cursor='pointer';
      b.addEventListener('click', () => activate(i));
      tabsBar.appendChild(b);
      content.style.display='none'; contentWrap.appendChild(content);
      return b;
    });

    function activate(idx){
      sections.forEach(([,node],i)=> node.style.display = (i===idx?'block':'none'));
      btns.forEach((b,i)=> b.style.background = (i===idx?'#fff':'#f8fafc'));
    }
    activate(0);
    wrap.append(tabsBar, contentWrap);
    return wrap;
  }

  function buildCrossRefs(v){
    const box = document.createElement('div');
    if (Array.isArray(v.crossRefs) && v.crossRefs.length){
      v.crossRefs.forEach(cr=>{
        const a = document.createElement('a');
        a.className='xref'; a.href='#';
        a.textContent = cr.ref + (cr.note?` — ${cr.note}`:'');
        a.style.display='block'; a.style.margin='.15rem 0';
        box.appendChild(a);
      });
    } else {
      box.innerHTML = `<div class="muted">—</div>`;
    }
    return box;
  }

  function buildCommentary(v, {book,chapter}){
    const key = `commentary:${book}:${chapter}:${v.num}`;
    const box = document.createElement('div');
    const ta = document.createElement('textarea'); ta.rows=4; ta.style.width='100%';
    ta.style.border='1px solid #e6ebf2'; ta.style.borderRadius='8px'; ta.style.padding='.5rem';
    ta.placeholder='Write personal commentary… (saved locally)';
    ta.value = (localStorage.getItem(key) || v.commentary || '').trim();
    const save = document.createElement('button'); save.type='button'; save.textContent='Save';
    save.style.marginTop='.4rem'; save.style.border='1px solid #e6ebf2'; save.style.background='#fff';
    save.style.borderRadius='8px'; save.style.padding='.25rem .6rem';
    save.addEventListener('click', ()=>{ localStorage.setItem(key, ta.value.trim()); save.textContent='Saved'; setTimeout(()=>save.textContent='Save',900); });
    box.append(ta, save); return box;
  }

  function buildLexicon(v){
    const box = document.createElement('div');
    const arr = Array.isArray(v.strongs) ? v.strongs : [];
    if (!arr.length){ box.innerHTML = `<div class="muted">—</div>`; return box; }
    const ul = document.createElement('ul'); ul.style.margin='0'; ul.style.paddingLeft='1rem';
    arr.forEach(s=>{
      const li=document.createElement('li');
      li.textContent = `${s.num||''} — ${(s.lemma||'')}${s.gloss?`: ${s.gloss}`:''}`;
      ul.appendChild(li);
    });
    box.appendChild(ul); return box;
  }

  function buildStrongsSentence(v){
    const box = document.createElement('div');
    const arr = Array.isArray(v.strongs) ? v.strongs : [];
    if (!arr.length){ box.innerHTML = `<div class="muted">—</div>`; return box; }
    const p = document.createElement('p'); p.style.margin='0'; p.style.lineHeight='1.6';
    arr.forEach((s,i)=>{
      const span=document.createElement('span');
      span.style.whiteSpace='nowrap'; span.style.borderBottom='1px dotted #c9d4e5'; span.style.cursor='help';
      const num=s.num||'', lemma=s.lemma||'', gloss=s.gloss||'';
      span.title = `${num} — ${lemma}${gloss?`: ${gloss}`:''}`;
      span.textContent = `${num}${lemma?` (${lemma}`:''}${gloss?` — ${gloss}`:''}${lemma?`)`:''}`;
      p.appendChild(span); if(i!==arr.length-1) p.appendChild(document.createTextNode('; '));
    });
    box.appendChild(p); return box;
  }
})();
