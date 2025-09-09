/* chapter-view.js — verse-per-line with wrappers + actions (copy), robust mount */
(function(){
  'use strict';

  const ROOT = '/israelite-research/data';
  const PREF_KEYS = ['KJV','Text','text','Darby'];

  // ---------- Find the correct mount ----------
  function findHost(){
    let host = document.getElementById('chapter-root') || document.querySelector('[data-chapter-root]');
    if (host) return host;

    const heads = Array.from(document.querySelectorAll('h2, h3'));
    const textHead = heads.find(h => h.textContent.trim().toLowerCase() === 'text');
    if (textHead) {
      let next = textHead.nextElementSibling;
      if (!next || next.tagName.toLowerCase() === 'script') {
        next = document.createElement('div');
        textHead.insertAdjacentElement('afterend', next);
      }
      next.id = next.id || 'chapter-root';
      return next;
    }

    const fresh = document.createElement('div');
    fresh.id = 'chapter-root';
    (document.querySelector('main') || document.body).appendChild(fresh);
    return fresh;
  }

  const host = findHost();
  if (!host) return;

  // ---------- Utilities ----------
  function stripArtifacts(text){
    if (!text) return '';
    return String(text)
      .replace(/\{[^}]*\}/g, '')                 // {...}
      .replace(/\[(?:H|G)\d{1,5}\]/gi,'')        // [H####]/[G####]
      .replace(/<(?:H|G)\d{1,5}>/gi,'')          // <H####>/<G####>
      .replace(/\b(?:H|G)\d{3,5}\b/gi,'')        // H####/G####
      .replace(/<\s*\/?\s*strongs[^>]*>/gi,'')   // <strongs>
      .replace(/<\s*w[^>]*>(.*?)<\s*\/\s*w\s*>/gi,'$1') // <w>...</w>
      .replace(/<[^>]+>/g,'')                    // leftover html
      .replace(/\s{2,}/g,' ')
      .trim();
  }
  function normVerseVal(v){
    if (Array.isArray(v))  return v.map(tok => (typeof tok==='string' ? tok : (tok?.t||tok?.text||tok?.w||''))).join(' ');
    if (v && typeof v==='object') return normVerseVal(v.t || v.text || '');
    return String(v||'');
  }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  // ---------- Params & canon ----------
  const url = new URL(location.href);
  const rawBook = (url.searchParams.get('book') || '').trim();
  const chParam = parseInt(url.searchParams.get('ch') || url.searchParams.get('chapter') || '1', 10);
  if (!rawBook || !chParam || Number.isNaN(chParam)) return;

  const path = location.pathname.toLowerCase();
  const CANON =
    path.includes('/tanakh/') ? 'tanakh' :
    path.includes('/newtestament/') ? 'newtestament' :
    path.includes('/apocrypha/') ? 'apocrypha' : 'tanakh';

  function normalizeBookSlug(raw){
    let s = String(raw).toLowerCase().replace(/\s+/g,'-');
    s = s
      .replace(/^psalm$/, 'psalms')
      .replace(/^song-of-songs$/, 'song-of-solomon')
      .replace(/^canticles$/, 'song-of-solomon')
      .replace(/^ecclesiasticus$/, 'sirach')
      .replace(/^wis$/, 'wisdom')
      .replace(/^sir$/, 'sirach')
      .replace(/^judg$/, 'judges')
      .replace(/^deut$/, 'deuteronomy')
      .replace(/^1-/, 'i-').replace(/^2-/, 'ii-').replace(/^3-/, 'iii-');
    return s;
  }
  const bookSlug = normalizeBookSlug(rawBook);

  // nice label for header and for copy string
  const bookLabel = rawBook
    .replace(/-/g,' ')
    .replace(/\b(i{1,3})\b/gi, m => m.toUpperCase())
    .replace(/\b\w/g, c => c.toUpperCase());

  // ---------- Data ----------
  async function fetchChapter(canon, slug, ch){
    const endpoint = `${ROOT}/${canon}/${slug}/${ch}.json`;
    const res = await fetch(endpoint, {cache:'force-cache'});
    if (!res.ok) throw new Error(`Missing chapter JSON: ${endpoint}`);
    return res.json();
  }
  function pickTranslation(json){
    for (const k of PREF_KEYS){ if (json && json[k]) return json[k]; }
    if (Array.isArray(json?.verses)) return json.verses;
    return json || {};
  }

  // ---------- Render ----------
  function renderHeader(label, ch){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<h1 class="chapter-title">${escapeHtml(label)} ${ch}</h1>`;
    return wrap;
  }

  function makeVerseWrap(vNum, rawText){
    const wrap = document.createElement('div');
    wrap.className = 'verse-wrap';
    wrap.dataset.v = vNum;

    const head = document.createElement('div');
    head.className = 'verse-head';

    const num = document.createElement('sup');
    num.className = 'verse-num';
    num.textContent = vNum;
    head.appendChild(num);

    const body = document.createElement('div');
    body.className = 'verse-body';

    const text = document.createElement('span');
    text.className = 'verse-text';
    const clean = stripArtifacts(normVerseVal(rawText));
    text.textContent = clean;

    const actions = document.createElement('div');
    actions.className = 'verse-actions';
    actions.innerHTML = `
      <button class="btn-ghost btn-copy" type="button" title="Copy verse">Copy</button>
      <button class="btn-ghost btn-note" type="button" title="Add note (coming soon)" disabled>Note</button>
    `;

    body.appendChild(text);
    body.appendChild(actions);

    wrap.appendChild(head);
    wrap.appendChild(body);
    return wrap;
  }

  function renderVerses(trans){
    const list = document.createElement('div');
    list.className = 'verselist';

    if (trans && typeof trans === 'object' && !Array.isArray(trans)) {
      Object.keys(trans)
        .map(n=>parseInt(n,10))
        .filter(n=>!Number.isNaN(n))
        .sort((a,b)=>a-b)
        .forEach(n=>{
          list.appendChild(makeVerseWrap(n, trans[n]));
        });
      return list;
    }

    if (Array.isArray(trans)) {
      trans.forEach(item=>{
        const vNum = item?.v ?? item?.verse ?? '';
        list.appendChild(makeVerseWrap(vNum, item?.t ?? item?.text ?? item));
      });
      return list;
    }

    const empty = document.createElement('p');
    empty.textContent = 'No verses found.';
    return empty;
  }

  // Copy action (event delegation)
  function wireActions(container){
    container.addEventListener('click', async (e)=>{
      const btn = e.target.closest('.btn-copy');
      if (!btn) return;
      const row = e.target.closest('.verse-wrap');
      if (!row) return;
      const v = row.dataset.v;
      const text = row.querySelector('.verse-text')?.textContent || '';
      const payload = `${bookLabel} ${chParam}:${v} — ${text}`;
      try{
        await navigator.clipboard.writeText(payload);
        btn.textContent = 'Copied!';
        setTimeout(()=>{ btn.textContent = 'Copy'; }, 900);
      }catch{
        btn.textContent = 'Copy failed';
        setTimeout(()=>{ btn.textContent = 'Copy'; }, 1200);
      }
    });
  }

  (async function main(){
    try{
      const json = await fetchChapter(CANON, bookSlug, chParam);
      const trans = pickTranslation(json);

      host.textContent = '';
      host.appendChild(renderHeader(bookLabel, chParam));

      const verses = renderVerses(trans);
      host.appendChild(verses);
      wireActions(host);
    } catch {
      host.textContent = 'Could not load chapter.';
    }
  })();

})();
