(async function () {
  const $verses = document.getElementById('verses');
  const $lex    = document.getElementById('lexicon');     // may not exist
  const $hover  = document.getElementById('hovercard');   // optional
  const $sel    = document.getElementById('chSelect');
  const $prev   = document.getElementById('btnPrev');
  const $next   = document.getElementById('btnNext');

  const wantLex = !!$lex;

  const status = (msg) => { if ($verses) $verses.innerHTML = `<p class="muted">${msg}</p>`; };

  // -------- Context (canon/book/chapter) --------
  function getContext() {
    const parts = location.pathname.split('/').filter(Boolean);
    const CANONS = ['tanakh','newtestament','apocrypha'];
    const canon = CANONS.find(c => parts.includes(c)) || 'newtestament';
    const idx = parts.indexOf(canon);
    const book = (idx !== -1 && parts[idx+1]) ? parts[idx+1] : 'matthew';

    const q = new URLSearchParams(location.search);
    const qc = parseInt(q.get('c') || '0', 10);
    const last = parts[parts.length-1] || '';
    const m = last.match(/chapter-(\d+)\.html/i);
    const chapter = qc > 0 ? qc : (m ? parseInt(m[1],10) : 1);

    return { canon, book, chapter };
  }
  const ctx = getContext();

  function bookLabel(slug){
    return String(slug || '')
      .replace(/-/g,' ')
      .replace(/\biii\b/g,'III').replace(/\bii\b/g,'II').replace(/\bi\b/g,'I')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  const BOOK_LABEL = bookLabel(ctx.book);

  // -------- Data URLs --------
  const ROOT = '/israelite-research';
  const versePrimary = `${ROOT}/data/${ctx.canon}/${ctx.book}/${ctx.chapter}.json`;
  const verseFallback = `${ROOT}/data/bible/kjv/${ctx.book}/${ctx.chapter}.json`;
  const strongURL = `${ROOT}/data/lexicon/strongs/${ctx.book}/${ctx.chapter}.json`;

  async function fetchFirstOk(urls){
    for (const u of urls){
      try { const r = await fetch(u, {cache:'force-cache'}); if (r.ok) return r.json(); } catch {}
    }
    return null;
  }

  let LEX = { entries: {} };
  let TOTAL = 150;

  function clampChapter(n){ return Math.max(1, Math.min(TOTAL, n)); }

  // -------- Toolbar --------
  function buildToolbar(totalCh) {
    TOTAL = totalCh || TOTAL;

    if ($sel) {
      $sel.innerHTML = '';
      for (let i = 1; i <= TOTAL; i++) {
        const o = document.createElement('option');
        o.value = i; o.textContent = `Chapter ${i}`;
        if (i === ctx.chapter) o.selected = true;
        $sel.appendChild(o);
      }
      $sel.addEventListener('change', e => {
        const n = parseInt(e.target.value, 10);
        location.href = `${ROOT}/${ctx.canon}/${ctx.book}/chapter.html?c=${n}`;
      });
    }
    if ($prev) $prev.onclick = () => {
      const n = clampChapter(ctx.chapter - 1);
      location.href = `${ROOT}/${ctx.canon}/${ctx.book}/chapter.html?c=${n}`;
    };
    if ($next) $next.onclick = () => {
      const n = clampChapter(ctx.chapter + 1);
      location.href = `${ROOT}/${ctx.canon}/${ctx.book}/chapter.html?c=${n}`;
    };
  }

  // -------- Clipboard/share --------
  function copyText(txt){
    if (!navigator.clipboard) return Promise.reject(new Error('No clipboard'));
    return navigator.clipboard.writeText(txt);
  }
  function shareURL(url, text){
    if (navigator.share) return navigator.share({ url, text }).catch(()=>{});
    return copyText(url);
  }

  // -------- Hovercard --------
  function openHoverCard(html, x, y){
    if (!$hover) return;
    $hover.innerHTML = html;
    $hover.style.left = (x + 12) + 'px';
    $hover.style.top  = (y + 12) + 'px';
    $hover.classList.add('open');
    $hover.setAttribute('aria-hidden','false');
  }
  function closeHoverCard(){
    if (!$hover) return;
    $hover.classList.remove('open');
    $hover.setAttribute('aria-hidden','true');
  }
  document.addEventListener('scroll', closeHoverCard);
  document.addEventListener('click', (e) => {
    if ($hover && !$hover.contains(e.target) && !e.target.classList?.contains('badge')) closeHoverCard();
  });

  // -------- Lexicon --------
  function renderLexicon(data) {
    if (!$lex) return;
    const entries = data?.entries || data?.lexicon || {};
    LEX = { entries };
    if (!entries || Object.keys(entries).length === 0) {
      $lex.innerHTML = '<p class="muted">Strong’s entries coming soon.</p>'; return;
    }
    const items = Object.entries(entries).map(([num, info]) => {
      const head = (info.headword || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const translit = info.translit ? ` — <em>${info.translit}</em>` : '';
      const gloss = info.gloss ? ` — ${info.gloss}` : '';
      return `<li data-strong="${num}"><strong>${num}</strong> ${head}${translit}${gloss}</li>`;
    }).join('');
    $lex.innerHTML = `<ul class="lex">${items}</ul>`;
  }

  function strongCard(num){
    const e = LEX.entries?.[num];
    if (!e) return `<strong>${num}</strong><div class="muted">No entry</div>`;
    const head = (e.headword||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const tr = e.translit ? `<div><em>${e.translit}</em></div>` : '';
    const gl = e.gloss ? `<div>${e.gloss}</div>` : '';
    return `<div style="font-weight:700;margin-bottom:.25rem">${num} — ${head}</div>${tr}${gl}`;
  }

  // -------- Verses --------
  function renderVerses(chData) {
    const verses = Array.isArray(chData?.verses) ? chData.verses : [];
    if (!verses.length){ status('Verses coming soon.'); return; }

    const frag = document.createDocumentFragment();

    verses.forEach(v => {
      const art = document.createElement('article');
      art.className = 'verse';
      art.id = `v${v.v}`;
      art.setAttribute('data-verse', String(v.v));

      const num = document.createElement('span');
      num.className = 'vnum';
      num.textContent = v.v;

      const txt = document.createElement('span');
      txt.className = 'vtext';
      txt.textContent = v.t || '';

      const actions = document.createElement('div');
      actions.className = 'v-actions';

      const btnCopy = document.createElement('button');
      btnCopy.type = 'button';
      btnCopy.textContent = 'Copy';
      btnCopy.title = 'Copy verse text';
      btnCopy.onclick = () => {
        const payload = `${BOOK_LABEL} ${ctx.chapter}:${v.v} ${v.t || ''}`.trim();
        copyText(payload);
      };

      const btnShare = document.createElement('button');
      btnShare.type = 'button';
      btnShare.textContent = 'Link';
      btnShare.title = 'Share direct link';
      btnShare.onclick = () => {
        const url = `${location.origin}${location.pathname}?c=${ctx.chapter}#v${v.v}`;
        shareURL(url, `${BOOK_LABEL} ${ctx.chapter}:${v.v}`);
      };

      actions.appendChild(btnCopy);
      actions.appendChild(btnShare);

      art.appendChild(num);
      art.appendChild(txt);
      art.appendChild(actions);

      // Strong’s badges
      if (Array.isArray(v.s) && v.s.length){
        const seen = new Set();
        v.s.forEach(code => {
          if (!code || seen.has(code)) return; seen.add(code);
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'badge';
          b.dataset.strong = code;
          b.textContent = code;
          b.onclick = (ev) => {
            const el = $lex?.querySelector(`[data-strong="${code}"]`);
            if (el) { el.style.background = '#fff5e6'; setTimeout(()=>{ el.style.background=''; }, 900); }
            const rect = ev.target.getBoundingClientRect();
            openHoverCard(strongCard(code), rect.left + window.scrollX, rect.top + window.scrollY);
          };
          txt.appendChild(b);
        });
      }

      frag.appendChild(art);
    });

    $verses.innerHTML = '';
    $verses.appendChild(frag);

    if (location.hash && /^#v\d+$/.test(location.hash)){
      const anchor = document.getElementById(location.hash.slice(1));
      if (anchor) anchor.scrollIntoView({ behavior:'instant', block:'start' });
    }
  }

  // -------- New: use books.json --------
  async function getTotalFromBooksJson(ROOT, ctx) {
    try {
      const r = await fetch(`${ROOT}/data/${ctx.canon}/books.json`, {cache:'force-cache'});
      if (!r.ok) return null;
      const map = await r.json();
      const total = Number(map[ctx.book]);
      return Number.isFinite(total) && total > 0 ? total : null;
    } catch { return null; }
  }

  // -------- Load & init --------
  try {
    const loaders = [ fetchFirstOk([versePrimary, verseFallback]), getTotalFromBooksJson(ROOT, ctx) ];
    if (wantLex) loaders.push(fetch(strongURL).catch(() => null));
    const [vJson, totalFromBooks, sRes] = await Promise.all(loaders);

    if (sRes && sRes.ok) renderLexicon(await sRes.json());
    else renderLexicon({ entries:{} });

    if (vJson) {
      renderVerses(vJson);
      buildToolbar(totalFromBooks || vJson.total || undefined);
    } else {
      status('Verses coming soon.');
      buildToolbar(totalFromBooks || undefined);
    }
  } catch {
    status('Verses coming soon.');
    renderLexicon({ entries:{} });
    buildToolbar();
  }
})();
