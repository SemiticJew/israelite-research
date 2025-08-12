// js/chapter.js — Tanakh chapter (Genesis) page behavior

function getParam(name){ const u = new URL(location.href); return u.searchParams.get(name); }
async function j(path){ const r = await fetch(path); if(!r.ok) throw new Error(`Fail ${path}`); return r.json(); }

function togglePanels() {
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = btn.getAttribute('data-target');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
      const p = document.querySelector(sel);
      if (p) p.classList.add('open');
    });
  });
}

function buildPicker(book, current, max) {
  const wrap = document.getElementById('chap-picker');
  const sel = document.createElement('select');
  for (let i = 1; i <= max; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Chapter ${i}`;
    if (i === current) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => {
    location.href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${sel.value}`;
  });
  wrap.innerHTML = '';
  wrap.appendChild(sel);
}

document.addEventListener('DOMContentLoaded', async () => {
  const book = getParam('book') || 'Genesis';
  const chapter = parseInt(getParam('chapter') || '1', 10);

  // breadcrumbs
  const crumbs = document.getElementById('crumbs');
  if (crumbs) {
    crumbs.setAttribute('data-bc', JSON.stringify([
      {label:'Articles', href:'../articles.html'},
      {label:'Texts', href:'../texts.html'},
      {label:'The Tanakh', href:'../tanakh.html'},
      {label: book, href:`book.html?book=${encodeURIComponent(book)}`},
      {label: `Chapter ${chapter}`}
    ]));
  }

  // chapter counts for prev/next & picker
  const counts = await j('../data/tanakh/books.json');
  const max = counts[book] || 50; // Genesis defaults to 50 if file missing

  // title + path labels
  document.getElementById('book-label').textContent = book;
  document.getElementById('title').textContent = `${book} ${chapter}`;

  // prev/next
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  prev.href = chapter > 1 ? `chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter-1}` : '#';
  next.href = chapter < max ? `chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter+1}` : '#';
  if (chapter === 1) prev.setAttribute('aria-disabled','true');
  if (chapter === max) next.setAttribute('aria-disabled','true');

  // picker
  buildPicker(book, chapter, max);

  // load data for this chapter (same JSON shape you used before)
  const dataPath = `../data/tanakh/${encodeURIComponent(book)}/${chapter}.json`;
  let data = { verses: [] };
  try { data = await j(dataPath); } catch(e) { /* leave empty if missing */ }

  // render verses
  const holder = document.getElementById('verses');
  holder.innerHTML = '';
  (data.verses || []).forEach(v => {
    const row = document.createElement('div');
    row.className = 'verse';
    row.innerHTML = `<div class="vnum">${v.num}</div><div class="vtext">${v.text || ''}</div>`;
    row.addEventListener('click', () => {
      const xr = document.getElementById('xrefs');
      xr.classList.add('open');
      xr.innerHTML = `<strong>${book} ${chapter}:${v.num}</strong><ul>` +
        (v.crossRefs||[]).map(cr => `<li>${cr.ref}${cr.note?` — ${cr.note}`:''}</li>`).join('') +
        `</ul>`;
    });
    holder.appendChild(row);
  });

  togglePanels();
});

