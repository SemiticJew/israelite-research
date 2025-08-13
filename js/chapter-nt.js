// js/chapter-nt.js — New Testament chapter page logic (Matthew, etc.)

// ---------- helpers ----------
function getParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name);
}
async function j(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// Notes persistence (localStorage)
function noteKey(book, chap, v) { return `note:${book}:${chap}:${v}`; }
function loadNote(book, chap, v) { return localStorage.getItem(noteKey(book, chap, v)) || ""; }
function saveNote(book, chap, v, val) { localStorage.setItem(noteKey(book, chap, v), val); }

// ---------- UI builders ----------
function buildChapterPicker(book, current, max) {
  const holder = document.getElementById('chap-picker');
  if (!holder) return;
  const sel = document.createElement('select'); sel.id = 'chap-select';
  for (let i = 1; i <= max; i++) {
    const o = document.createElement('option');
    o.value = i; o.textContent = `${i}`;
    if (i === current) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    location.href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${sel.value}`;
  });
  holder.innerHTML = ''; holder.appendChild(sel);
}

function buildVersePicker(maxVerses) {
  const sel = document.getElementById('verse-picker');
  if (!sel) return;
  sel.innerHTML = '';
  for (let i = 1; i <= Math.max(1, maxVerses); i++) {
    const o = document.createElement('option');
    o.value = i; o.textContent = i;
    sel.appendChild(o);
  }
  const btn = document.getElementById('jump-btn');
  if (btn) {
    btn.onclick = () => {
      const v = parseInt(sel.value, 10) || 1;
      const el = document.getElementById(`v${v}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); location.hash = `v${v}`; }
    };
  }
}

function openPanel(id, html) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
  const p = document.getElementById(id);
  if (!p) return;
  const body = p.querySelector('.body');
  if (body) {
    const empty = !html || !String(html).trim();
    body.classList.toggle('empty', empty);
    body.innerHTML = empty ? '<em class="empty">No data.</em>' : html;
  }
  p.classList.add('open');
}

function verseHTML(v) {
  return `
    <div class="vrow">
      <div class="vnum"><a href="#v${v.num}" title="Link to verse ${v.num}">${v.num}</a></div>
      <div class="vtext">${v.text || ''}</div>
    </div>
    <div class="tools-row">
      <button class="tool-btn" data-tool="xrefs" data-v="${v.num}">Cross References</button>
      <button class="tool-btn" data-tool="notes" data-v="${v.num}">Notes</button>
      <button class="tool-btn" data-tool="study" data-v="${v.num}">Study</button>
      <button class="tool-btn" data-tool="copy" data-v="${v.num}">Copy</button>
      <span class="copy-ok" id="copied-${v.num}" style="display:none;">Copied!</span>
    </div>
  `;
}

// ---------- data loader (book.json first, then per-chapter) ----------
async function loadChapterData(book, chapter) {
  const base = '../data/newtestament';
  // Try one-file-per-book (book.json)
  try {
    const whole = await j(`${base}/${encodeURIComponent(book)}/book.json`);
    const node = (whole.chapters || []).find(c => +c.chapter === +chapter);
    if (node) return { book, chapter, verses: node.verses || [] };
  } catch (_) { /* ignore and fall back */ }
  // Fallback to per-chapter file
  const path = `${base}/${encodeURIComponent(book)}/${chapter}.json`;
  try {
    return await j(path);
  } catch (e) {
    console.error("Failed to load", path, e);
    return { book, chapter, verses: [] };
  }
}

// ---------- main ----------
document.addEventListener('DOMContentLoaded', async () => {
  const book = getParam('book') || 'Matthew';
  const chapter = parseInt(getParam('chapter') || '1', 10);

  // Breadcrumbs
  const crumbs = document.getElementById('crumbs');
  if (crumbs) {
    crumbs.setAttribute('data-bc', JSON.stringify([
      { label: 'Articles', href: '../articles.html' },
      { label: 'Texts', href: '../texts.html' },
      { label: 'The New Testament', href: '../newtestament.html' },
      { label: book, href: `book.html?book=${encodeURIComponent(book)}` },
      { label: `Chapter ${chapter}` }
    ]));
  }

  // Chapter count (for prev/next & picker)
  let maxChap = 1;
  try {
    const counts = await j('../data/newtestament/books.json');
    maxChap = counts[book] || 1;
  } catch (_) {}

  // Titles
  const lbl = document.getElementById('book-label');
  const ttl = document.getElementById('title');
  if (lbl) lbl.textContent = book;
  if (ttl) ttl.textContent = `${book} ${chapter}`;

  // Prev/Next
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  if (prev) {
    if (chapter > 1) prev.href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter - 1}`;
    else { prev.href = '#'; prev.setAttribute('aria-disabled', 'true'); }
  }
  if (next) {
    if (chapter < maxChap) next.href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter + 1}`;
    else { next.href = '#'; next.setAttribute('aria-disabled', 'true'); }
  }

  buildChapterPicker(book, chapter, maxChap);

  // Data
  const data = await loadChapterData(book, chapter);

  // Render verses
  const holder = document.getElementById('verses');
  if (holder) {
    holder.innerHTML = '';
    (data.verses || []).forEach(v => {
      const wrap = document.createElement('article');
      wrap.className = 'verse';
      wrap.id = `v${v.num}`;
      wrap.innerHTML = verseHTML(v);
      holder.appendChild(wrap);
    });

    // Tool events (xrefs / notes / study / copy)
    holder.addEventListener('click', async (e) => {
      const btn = e.target.closest('.tool-btn');
      if (!btn) return;
      const tool = btn.dataset.tool;
      const vnum = parseInt(btn.dataset.v, 10);
      const v = (data.verses || []).find(x => x.num === vnum) || { text: '', crossRefs: [] };

      if (tool === 'xrefs') {
        const html = (v.crossRefs && v.crossRefs.length)
          ? `<strong>${book} ${chapter}:${vnum}</strong><ul>${v.crossRefs.map(cr => `<li>${cr.ref}${cr.note ? ` — ${cr.note}` : ''}</li>`).join('')}</ul>`
          : `<strong>${book} ${chapter}:${vnum}</strong><p class="empty">No cross references for this verse.</p>`;
        openPanel('panel-xrefs', html);
      }

      if (tool === 'notes') {
        openPanel('panel-notes',
          `<strong>${book} ${chapter}:${vnum}</strong>
           <div style="margin:.4rem 0 0">
             <textarea id="note-${vnum}" rows="6" style="width:100%;border:1px solid #DBE4EE;border-radius:8px;padding:.5rem" placeholder="Type your notes…"></textarea>
           </div>`);
        const ta = document.getElementById(`note-${vnum}`);
        if (ta) {
          ta.value = loadNote(book, chapter, vnum);
          ta.addEventListener('input', () => saveNote(book, chapter, vnum, ta.value));
        }
      }

      if (tool === 'study') {
        openPanel('panel-study',
          `<strong>${book} ${chapter}:${vnum}</strong>
           <p class="empty">Study tools coming soon (lexicon, interlinear, compare).</p>`);
      }

      if (tool === 'copy') {
        try {
          await navigator.clipboard.writeText(`${book} ${chapter}:${vnum} ${v.text || ''}`);
          const ok = document.getElementById(`copied-${vnum}`);
          if (ok) { ok.style.display = 'inline'; setTimeout(() => ok.style.display = 'none', 900); }
        } catch (_) {}
      }
    });
  }

  // Verse picker
  buildVersePicker((data.verses || []).length || 1);

  // Deep link
  if (location.hash && /^#v\d+/.test(location.hash)) {
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
