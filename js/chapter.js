// js/chapter.js — match NT chapter UX for Tanakh (Genesis, etc.)
function getParam(name){ const u = new URL(location.href); return u.searchParams.get(name); }
async function j(path){ const r = await fetch(path); if(!r.ok) throw new Error(`Fail ${path}`); return r.json(); }

function buildChapterPicker(book, current, max) {
  const holder = document.getElementById('chap-picker');
  const sel = document.createElement('select'); sel.id = 'chap-select';
  for (let i=1;i<=max;i++){ const o=document.createElement('option'); o.value=i; o.textContent=`${i}`; if(i===current) o.selected=true; sel.appendChild(o); }
  sel.addEventListener('change', ()=>{ location.href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${sel.value}`; });
  holder.innerHTML=''; holder.appendChild(sel);
}

function buildVersePicker(maxVerses) {
  const sel = document.getElementById('verse-picker');
  sel.innerHTML = '';
  for (let i=1;i<=maxVerses;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; sel.appendChild(o); }
  document.getElementById('jump-btn').onclick = ()=>{
    const v = parseInt(sel.value,10)||1;
    const el = document.getElementById(`v${v}`);
    if (el) { el.scrollIntoView({behavior:'smooth', block:'start'}); location.hash = `v${v}`; }
  };
}

function openPanel(id, html) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));
  const p = document.getElementById(id);
  if (!p) return;
  const body = p.querySelector('.body');
  body.classList.toggle('empty', !html || html.trim()==='');
  body.innerHTML = html || '<em class="empty">No data.</em>';
  p.classList.add('open');
}

function verseHTML(v){
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

async function init() {
  const book = getParam('book') || 'Genesis';
  const chapter = parseInt(getParam('chapter') || '1', 10);

  // Breadcrumbs
  const crumbs = document.getElementById('crumbs');
  if (crumbs) crumbs.setAttribute('data-bc', JSON.stringify([
    {label:'Articles', href:'../articles.html'},
    {label:'Texts', href:'../texts.html'},
    {label:'The Tanakh', href:'../tanakh.html'},
    {label: book, href:`book.html?book=${encodeURIComponent(book)}`},
    {label: `Chapter ${chapter}`}
  ]));

  // Chapter counts (for prev/next & picker)
  let maxChap = 1;
  try {
    const counts = await j('../data/tanakh/books.json');
    maxChap = counts[book] || 1;
  } catch(_) {
    // Fallbacks for common books if counts file missing
    if (book === 'Genesis') maxChap = 50;
  }

  // Title
  document.getElementById('book-label').textContent = book;
  document.getElementById('title').textContent = `${book} ${chapter}`;

  // Prev/Next
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  prev.href = chapter > 1 ? `chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter-1}` : '#';
  next.href = chapter < maxChap ? `chapter.html?book=${encodeURIComponent(book)}&chapter=${chapter+1}` : '#';
  if (chapter === 1) prev.setAttribute('aria-disabled','true');
  if (chapter === maxChap) next.setAttribute('aria-disabled','true');

  buildChapterPicker(book, chapter, maxChap);

  // Load chapter data
  const dataPath = `../data/tanakh/${encodeURIComponent(book)}/${chapter}.json`;
  let data = { verses: [] };
  try { data = await j(dataPath); } catch(e){ /* show empty */ }

  // Verse stream
  const holder = document.getElementById('verses');
  holder.innerHTML = '';
  (data.verses || []).forEach(v => {
    const wrap = document.createElement('article');
    wrap.className = 'verse';
    wrap.id = `v${v.num}`;
    wrap.innerHTML = verseHTML(v);
    holder.appendChild(wrap);
  });

  // Verse picker (jump)
  buildVersePicker((data.verses || []).length || 1);

  // Tool events
  holder.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.tool-btn'); if(!btn) return;
    const tool = btn.dataset.tool; const vnum = parseInt(btn.dataset.v,10);
    const v = (data.verses||[]).find(x=>x.num===vnum) || {text:''};

    if (tool === 'xrefs') {
      const html = (v.crossRefs && v.crossRefs.length)
        ? `<strong>${book} ${chapter}:${vnum}</strong><ul>${v.crossRefs.map(cr=>`<li>${cr.ref}${cr.note?` — ${cr.note}`:''}</li>`).join('')}</ul>`
        : `<strong>${book} ${chapter}:${vnum}</strong><p class="empty">No cross references for this verse.</p>`;
      openPanel('panel-xrefs', html);
    }
    if (tool === 'notes') {
      openPanel('panel-notes',
        `<strong>${book} ${chapter}:${vnum}</strong>
         <div style="margin:.4rem 0 0">
           <textarea rows="6" style="width:100%;border:1px solid #DBE4EE;border-radius:8px;padding:.5rem" placeholder="Type your notes…"></textarea>
         </div>`);
    }
    if (tool === 'study') {
      openPanel('panel-study',
        `<strong>${book} ${chapter}:${vnum}</strong>
         <p class="empty">Study tools coming soon (lexicon, interlinear, compare).</p>`);
    }
    if (tool === 'copy') {
      try {
        await navigator.clipboard.writeText(`${book} ${chapter}:${vnum} ${v.text || ''}`);
        const ok = document.getElementById(`copied-${vnum}`); if (ok){ ok.style.display='inline'; setTimeout(()=>ok.style.display='none', 900); }
      } catch(_) {}
    }
  });

  // Support deep link to #vN
  if (location.hash && /^#v\d+/.test(location.hash)) {
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
  }
}

document.addEventListener('DOMContentLoaded', init);
