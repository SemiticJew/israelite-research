(function(){
  const ACCENT = '#F17300';

  // Parse ?book=Genesis&chapter=1
  const params = new URLSearchParams(location.search);
  const book = params.get('book') || 'Genesis';
  const chapter = parseInt(params.get('chapter') || '1', 10);

  // Slugs (your data folders are lowercase)
  const bookSlug = (book || '').toLowerCase();
  const dataUrl = `/israelite-research/data/tanakh/${bookSlug}/${chapter}.json`;

  // Title/hero
  const titleEl = document.getElementById('chapterTitle');
  const subEl   = document.getElementById('chapterSubtitle');
  if (titleEl) titleEl.textContent = `${book} ${chapter}`;
  if (subEl)   subEl.textContent   = `King James Version (KJV) — ${book} ${chapter}`;

  // Breadcrumbs scope hint (if your breadcrumbs.js uses it)
  const bc = document.getElementById('breadcrumbs');
  if (bc) bc.setAttribute('data-scope', 'texts'); // Home > Texts > Tanakh > Book > Chapter

  // Fetch chapter JSON
  fetch(dataUrl, {cache:'no-store'})
    .then(r => {
      if(!r.ok) throw new Error('Failed to load chapter JSON');
      return r.json();
    })
    .then(renderChapter)
    .catch(err => {
      const v = document.getElementById('verses');
      if (v) v.textContent = 'Sorry—this chapter could not be loaded.';
      console.error(err);
    });

  function renderChapter(ch) {
    document.title = `${book} ${chapter} — Semitic Jew`;
    if(!ch || !Array.isArray(ch.verses)) {
      document.getElementById('verses').textContent = 'No verses available.';
      return;
    }

    const versesRoot = document.getElementById('verses');
    versesRoot.innerHTML = ch.verses.map(v => verseHtml(v)).join('');

    // Wire up toggles, tabs, copy, and notes
    versesRoot.querySelectorAll('.btn-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-vid');
        togglePanels(id);
      });
    });

    versesRoot.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-vid');
        const ref = `${book} ${chapter}:${id}`;
        const text = versesRoot.querySelector(`#vtext-${id}`)?.textContent?.trim() || '';
        const payload = `${ref} — ${text}`;
        try {
          await navigator.clipboard.writeText(payload);
          flash(btn, 'Copied');
        } catch {
          flash(btn, 'Copy failed');
        }
      });
    });

    versesRoot.querySelectorAll('.tab-btn').forEach(tb => {
      tb.addEventListener('click', () => {
        const target = tb.getAttribute('data-target');
        const wrap = tb.closest('.verse-panels');
        // Set active tab
        wrap.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        tb.classList.add('active');
        // Show panel
        wrap.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        wrap.querySelector(`#${target}`)?.classList.add('active');
      });
    });

    // Restore any saved notes
    ch.verses.forEach(v => {
      const ta = document.querySelector(`textarea[data-note-for="${v.num}"]`);
      if (ta) ta.value = loadNote(book, chapter, v.num);
    });

    // Save note handlers
    versesRoot.querySelectorAll('.btn-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-vid'), 10);
        const ta = document.querySelector(`textarea[data-note-for="${id}"]`);
        saveNote(book, chapter, id, (ta?.value || '').trim());
        flash(btn, 'Saved');
      });
    });
  }

  function verseHtml(v){
    const refId = v.num;
    const crossRefs = Array.isArray(v.crossRefs) ? v.crossRefs : [];
    return `
      <div class="verse-row" id="v${refId}">
        <div class="verse-controls">
          <button class="btn-tool" data-vid="${refId}" title="Open tools">Tools</button>
          <button class="btn-copy" data-vid="${refId}" title="Copy verse">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          </button>
          <span class="verse-num">${refId}</span>
        </div>
        <div class="verse-body">
          <p class="verse-text" id="vtext-${refId}">${escapeHtml(v.text || '')}</p>

          <div class="verse-panels" id="panels-${refId}" hidden>
            <div class="tab-bar">
              <button class="tab-btn active" data-target="xrefs-${refId}">Cross References</button>
              <button class="tab-btn" data-target="notes-${refId}">My Commentary</button>
              <button class="tab-btn" data-target="lex-${refId}">Lexicon</button>
              <button class="tab-btn" data-target="strongs-${refId}">Strong’s</button>
            </div>

            <div class="panel active" id="xrefs-${refId}">
              ${crossRefs.length
                ? `<ul class="xrefs-list">` + crossRefs.map(x => `
                    <li><strong>${escapeHtml(x.ref || '')}</strong> — ${escapeHtml(x.note || '')}</li>
                  `).join('') + `</ul>`
                : `<em>No cross references yet.</em>`}
            </div>

            <div class="panel" id="notes-${refId}">
              <div class="note-wrap">
                <textarea class="note-area" data-note-for="${refId}" placeholder="Write your personal commentary for ${refId}…"></textarea>
                <div class="note-actions">
                  <button class="btn-save" data-vid="${refId}">Save</button>
                </div>
              </div>
            </div>

            <div class="panel" id="lex-${refId}">
              <em>Lexicon integrations coming soon.</em>
            </div>

            <div class="panel" id="strongs-${refId}">
              <em>Strong’s Concordance coming soon.</em>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function togglePanels(id){
    const el = document.getElementById(`panels-${id}`);
    if (!el) return;
    const isHidden = el.hasAttribute('hidden');
    if (isHidden) el.removeAttribute('hidden'); else el.setAttribute('hidden','');
  }

  function flash(node, msg){
    const prev = node.textContent;
    node.textContent = msg;
    setTimeout(()=>{ node.textContent = prev; }, 900);
  }

  function saveNote(book, ch, num, text){
    try {
      localStorage.setItem(noteKey(book, ch, num), text || '');
    } catch {}
  }
  function loadNote(book, ch, num){
    try {
      return localStorage.getItem(noteKey(book, ch, num)) || '';
    } catch { return ''; }
  }
  function noteKey(book, ch, num){ return `note:${book}:${ch}:${num}`; }

  function escapeHtml(s){
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
})();
