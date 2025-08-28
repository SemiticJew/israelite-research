// Chapter loader with left-side Tools button, tabs, editable commentary, and Strong's support
(function(){
  const BASE = '/israelite-research';
  const STRONGS_HEB_URL = `${BASE}/data/lexicon/strongs-hebrew.json`;
let STRONGS_HEB = null;
fetch(STRONGS_HEB_URL).then(r=>r.json()).then(d=>{ STRONGS_HEB = d; }).catch(()=>{ STRONGS_HEB = {}; });

function strongsLabel(code){
  const d = STRONGS_HEB && STRONGS_HEB[code];
  return d ? `${code} — ${d.translit} (${d.lemma}) — ${d.gloss}` : code;
}

  const qs = new URLSearchParams(location.search);
  const book = qs.get('book') || 'Genesis';
  const chapter = parseInt(qs.get('chapter') || '1', 10) || 1;

  const folder = book.trim().toLowerCase().replace(/[^a-z0-9-]+/g,'');
  const titleEl = document.getElementById('chapterTitle');
  const descEl  = document.getElementById('chapterDesc');
  const versesEl= document.getElementById('verses');

  titleEl.textContent = `${book} ${chapter}`;
  descEl.textContent  = '';

  // Breadcrumbs
  try {
    const bc = document.getElementById('breadcrumbs');
    if (bc) {
      bc.innerHTML = `
        <ol>
          <li><a href="${BASE}/index.html">Home</a></li>
          <li><a href="${BASE}/texts.html">Texts</a></li>
          <li><a href="${BASE}/tanakh.html">The Tanakh</a></li>
          <li><a href="${BASE}/tanakh/book.html?book=${encodeURIComponent(book)}">${book}</a></li>
          <li>Chapter ${chapter}</li>
        </ol>`;
    }
  } catch(e){}

  const url = `${BASE}/data/tanakh/${folder}/${chapter}.json`;
  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(json => render(json))
    .catch(err => {
      versesEl.innerHTML =
        `<div class="muted">Could not load ${book} ${chapter}. Check <code>${url}</code>.</div>`;
      console.error('Chapter load error:', err);
    });

  function render(data){
    if (!data || !Array.isArray(data.verses)) {
      versesEl.innerHTML = `<div class="muted">No verses found.</div>`;
      return;
    }
    const frag = document.createDocumentFragment();

    data.verses.forEach(v => {
      const row = el('div','verse-row'); row.id = `v${v.num}`;
      const btn = el('button','tools-btn','Tools ▾'); btn.type='button';
      const num = el('div','vnum', String(v.num));
      const txt = el('div','vtext', v.text || '');

      const panel = buildToolsPanel(v);
      panel.hidden = true;

      btn.addEventListener('click', () => {
        const open = panel.hidden;
        // close any other open panels
        document.querySelectorAll('.tools').forEach(p => p.hidden = true);
        document.querySelectorAll('.tools-btn').forEach(b => b.textContent='Tools ▾');
        panel.hidden = !open;
        btn.textContent = open ? 'Tools ▴' : 'Tools ▾';
      });

      row.append(btn, num, txt, panel);
      frag.appendChild(row);
    });

    versesEl.innerHTML = '';
    versesEl.appendChild(frag);
  }

  function buildToolsPanel(v){
    const panel = el('div','tools');

    // Tabs
    const tabs = el('div','tool-tabs');
    const tabX = tabButton('Cross-refs','xref',true);
    const tabC = tabButton('Commentary','comm',false);
    const tabL = tabButton('Lexicon','lex',false);
    const tabS = tabButton("Strong's",'str',false);

    tabs.append(tabX, tabC, tabL, tabS);

    // Sections
    const secX = el('div','tool-section active');  // Cross refs
    const secC = el('div','tool-section');         // Commentary
    const secL = el('div','tool-section');         // Lexicon
    const secS = el('div','tool-section');         // Strong's

    // Cross refs
    if (Array.isArray(v.crossRefs) && v.crossRefs.length){
      v.crossRefs.forEach(cr => {
        const a = el('a','xref-link', cr.ref + (cr.note ? ` — ${cr.note}` : ''));
        a.href = '#';
        secX.appendChild(a);
      });
    } else {
      secX.appendChild(el('div','muted','—'));
    }

    // Commentary (editable per verse via localStorage)
    const cKey = `commentary:${book}:${chapter}:${v.num}`;
    const wrap = el('div','comment-wrap');
    const ta = document.createElement('textarea');
    ta.value = localStorage.getItem(cKey) || (v.commentary || '');
    const actions = el('div','comment-actions');
    const saveBtn = el('button','btn','Save');
    const clearBtn = el('button','btn','Clear');
    saveBtn.type='button'; clearBtn.type='button';
    saveBtn.addEventListener('click', () => {
      localStorage.setItem(cKey, ta.value.trim());
      saveBtn.textContent='Saved';
      setTimeout(()=>saveBtn.textContent='Save',800);
    });
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem(cKey);
      ta.value='';
    });
    actions.append(saveBtn, clearBtn);
    wrap.append(ta, actions);
    secC.appendChild(wrap);

    // Lexicon (placeholder)
    secL.appendChild(el('div','muted','Coming soon.'));

    // Strong’s
    if (Array.isArray(v.strongs) && v.strongs.length){
      const list = el('div');
      list.textContent = v.strongs.join(', ');
      secS.appendChild(list);
    } else {
      // Try to detect H/G numbers in text as a fallback (non-destructive)
      const found = (v.text || '').match(/\b[HG]\d{1,5}\b/g);
      secS.appendChild(el('div','muted', found ? found.join(', ') : '—'));
    }

    // Tab wiring
    const sections = { xref:secX, comm:secC, lex:secL, str:secS };
    tabs.querySelectorAll('.tool-tab').forEach(b=>{
      b.addEventListener('click', ()=>{
        tabs.querySelectorAll('.tool-tab').forEach(t=>t.classList.remove('active'));
        Object.values(sections).forEach(s=>s.classList.remove('active'));
        b.classList.add('active');
        sections[b.dataset.tab].classList.add('active');
      });
    });

    panel.append(tabs, secX, secC, secL, secS);
    return panel;
  }

  function el(tag, cls, text){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function tabButton(label, key, active){
    const b = el('button','tool-tab'+(active?' active':''),label);
    b.type='button'; b.dataset.tab = key; return b;
  }
})();
