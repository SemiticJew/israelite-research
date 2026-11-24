/* scripture-pages.js — progressive enhancements for the Biblia hub, collection hubs and book pages.
   Pages work fully without it (all links are static HTML). Reads, never writes, the reader's saved
   data: sj_reading_history_v1 (recent chapters) and sj_reader_position_v1 (per-chapter progress).
   Stored values are only ever used as text or as validated same-site reader URLs. */
(function(){
  'use strict';
  const readJSON = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch { return fallback; } };
  const READER_URL = /^\/(tanakh|newtestament|apocrypha)\/chapter\.html\?book=[a-z0-9-]+&ch=\d+(#v\d+)?$/;
  const ALIASES = { psalms: 'psalm', ps: 'psalm', psa: 'psalm', 'song-of-songs': 'song-of-solomon' };
  const norm = s => { const v = String(s || '').toLowerCase(); return ALIASES[v] || v; };
  const history = () => { const h = readJSON('sj_reading_history_v1', []); return Array.isArray(h) ? h.filter(i => i && READER_URL.test(String(i.url || ''))) : []; };

  // ---- Biblia: continue reading
  const cont = document.querySelector('[data-continue-reading]');
  if(cont){
    const last = history()[0];
    if(last){
      cont.querySelector('.sp-continue-link').href = last.url;
      cont.querySelector('[data-continue-title]').textContent = String(last.title || '').replace(/^Bible Reader\b/, '').trim() || 'Your last chapter';
      cont.querySelector('[data-continue-canon]').textContent = String(last.canonLabel || '');
      cont.hidden = false;
    }
  }

  // ---- Book page: continue + chapter progress
  const grid = document.getElementById('chapGrid');
  if(grid){
    const canon = grid.dataset.canon, book = norm(grid.dataset.book);
    const name = (document.querySelector('.sp-title') || {}).textContent || '';
    const mine = history().find(i => i.canon === canon && norm(i.book) === book);
    const btn = document.querySelector('[data-continue]');
    if(mine && btn){
      const ch = String(mine.chapter || '').replace(/\D/g, '');
      if(ch && ch !== '1'){
        btn.href = mine.url;
        btn.textContent = `Continue · ${name} ${ch}`;
        btn.hidden = false;
      }
    }
    const pos = readJSON('sj_reader_position_v1', {});
    if(pos && typeof pos === 'object'){
      grid.querySelectorAll('a[data-ch]').forEach(a => {
        const ch = a.dataset.ch;
        const item = pos[`${canon}:${book}:${ch}`] || pos[`${canon}:${grid.dataset.book}:${ch}`];
        if(!item) return;
        const pct = Number(item.percent) || 0;
        a.classList.add(pct >= 90 ? 'is-read' : 'is-started');
        a.setAttribute('aria-label', `${a.getAttribute('aria-label')} (${pct >= 90 ? 'read' : 'started'})`);
      });
    }
  }

  // ---- Collection hub: find a book
  const input = document.querySelector('[data-book-filter]');
  if(input){
    const items = Array.from(document.querySelectorAll('[data-book-item]'));
    const groups = Array.from(document.querySelectorAll('[data-book-group]'));
    const status = document.querySelector('[data-filter-status]');
    const empty = document.querySelector('[data-filter-empty]');
    const jump = document.querySelector('.sp-jump');
    const apply = () => {
      const q = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
      let shown = 0;
      const squash = v => v.replace(/\s+/g, '');
      // Match the book name anywhere ("sam" → 1 & 2 Samuel), spacing ignored ("1kings"), or the start of
      // its abbreviation, with or without the book number ("jn" → John and 1–3 John, "1jn" → 1 John). Name and abbreviation are matched separately, never glued together.
      const matches = li => !q || li.dataset.name.includes(q) || squash(li.dataset.name).includes(squash(q)) || squash(li.dataset.abbr).startsWith(squash(q)) || squash(li.dataset.abbr).replace(/^\d+/, '').startsWith(squash(q));
      items.forEach(li => { const hit = matches(li); li.hidden = !hit; if(hit) shown++; });
      groups.forEach(g => { g.hidden = !!q && !g.querySelector('[data-book-item]:not([hidden])'); });
      if(jump) jump.hidden = !!q;
      if(empty) empty.hidden = !q || shown > 0;
      if(status) status.textContent = q ? `${shown} book${shown === 1 ? '' : 's'} found` : '';
    };
    input.addEventListener('input', apply);
    input.addEventListener('keydown', ev => {
      if(ev.key === 'Enter'){
        const first = items.find(li => !li.hidden);
        if(first && input.value.trim()){ ev.preventDefault(); first.querySelector('a').click(); }
      }
      if(ev.key === 'Escape' && input.value){ input.value = ''; apply(); }
    });
  }
})();
