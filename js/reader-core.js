/* reader-core.js — reading-first Scripture reader for /tanakh/, /newtestament/ and /apocrypha/ chapter.html.
   Replaces nt-chapter.js on the reader pages.

   Principles
   - Scripture first: the chapter text is fetched and painted before anything else; cross-references
     load afterwards and the Strong's lexicon only loads when someone asks for a word study.
   - Same URLs, anchors and saved data: ?book=&ch=, #v<N>, and every localStorage key/shape the
     app already uses (notes, highlights, expositions, bookmarks, progress, preferences, offline).
   - The existing enhancer scripts keep working: verses are still .verse[id=v<N>][data-verse] with
     .vnum + .vtext, and enhancers mount their panels via window.SJReader.mount(slot, el).

   Storage written here (formats unchanged):
     notes:<canon>/<book>/<ch>        {"<verse>": "note"}         (legacy per-chapter notes)
     sj_no_private_interpretation_v1  [{key,canon,…,exposition}]  (study-notes index for the app)
     sj_verse_highlights_v1           [{key,category,…,text}]     (via window.SemJHighlights when present)
   Read only: sj_reader_preferences_v1, sj_offline_chapters_v1. */
(function(){
  'use strict';
  const B = window.SJBooks;
  if(!B || !document.body.classList.contains('sj-reader')) return;

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const readJSON = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch { return fallback; } };
  const writeJSON = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const ICON = {
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    xref: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>',
    lex: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    offline: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 8.5a15 15 0 0 1 5-2.6M22 8.5A15 15 0 0 0 10.5 5M5 12a10 10 0 0 1 4-2M19 12a10 10 0 0 0-2.3-1.4M8.5 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18"/></svg>'
  };

  // ---------- context ----------
  const canon = location.pathname.includes('/tanakh/') ? 'tanakh'
    : location.pathname.includes('/apocrypha/') ? 'apocrypha' : 'newtestament';
  const CANON = B.CANONS[canon];
  const params = new URLSearchParams(location.search);
  const book = B.canonical(params.get('book') || CANON.first);
  const chRaw = params.get('ch') || '1';                   // legacy key part used by every enhancer
  let chapter = parseInt(params.get('ch') || params.get('c') || '1', 10);
  if(!Number.isFinite(chapter) || chapter < 1) chapter = 1;
  const keyPrefix = `${canon}:${params.get('book') || ''}:${chRaw}:`;   // highlight/exposition key prefix
  const notesKey = `notes:${canon}/${book}/${chapter}`;
  const chapterUrl = `${location.pathname}?book=${encodeURIComponent(params.get('book') || book)}&ch=${encodeURIComponent(chRaw)}`;
  const bookName = B.name(book);
  const headName = B.chapterName(book);                     // "Psalm" in a Psalms chapter
  const refName = `${headName} ${chapter}`;
  const POETRY = new Set(['psalm', 'proverbs', 'song-of-solomon', 'lamentations']);
  const isPoetry = POETRY.has(book) || (book === 'job' && chapter >= 3 && chapter <= 41);

  const groupOf = (() => { for(const [label, slugs] of (B.GROUPS[canon] || [])) if(slugs.includes(book)) return label; return ''; })();

  // ---------- DOM ----------
  const el = {
    text: $('#verses'), notice: $('#rdNotice'), pager: $('#rdPager'), title: $('#pageTitle'), titleCh: $('#rdTitleCh'),
    eyebrow: $('#rdEyebrow'), crumbs: $('#readerBreadcrumbs'), ref: $('#rdRefLabel'), prev: $('#btnPrev'), next: $('#btnNext'),
    bar: $('#readerToolbar'), navBtn: $('#rdNavOpen'), nav: $('#rdNavigator'), studyBtn: $('#rdStudyOpen'), study: $('#rdStudy'),
    displayBtn: $('#rdDisplayOpen'), display: $('#rdDisplay'), searchBtn: $('#rdSearchOpen'), searchRow: $('#rdSearchRow'),
    scrim: $('#rdScrim'), vbar: $('#rdVerseBar'), toast: $('#rdToast')
  };

  // ---------- titles (synchronous, before other scripts read .page-title) ----------
  document.title = `${refName} · ${CANON.label} — Semitic Jew`;
  if(el.title) el.title.textContent = headName;
  if(el.titleCh) el.titleCh.textContent = String(chapter);
  if(el.ref){
    el.ref.textContent = refName;
    const short = `${B.shortName(book)} ${chapter}`;
    if(short !== refName) el.ref.dataset.short = short;   // shown by CSS on small phones; text stays full for screen readers
  }
  if(el.eyebrow) el.eyebrow.innerHTML = `<a href="${CANON.hub}">${esc(CANON.label)}</a>${groupOf && groupOf !== CANON.label ? ` · ${esc(groupOf)}` : ''}`;
  if(el.crumbs){
    el.crumbs.innerHTML = `<a href="/index.html">Home</a><span class="sep" aria-hidden="true">›</span><a href="/biblia.html">Biblia</a><span class="sep" aria-hidden="true">›</span><a href="${CANON.hub}">${esc(CANON.label)}</a><span class="sep" aria-hidden="true">›</span><a href="${B.landingHref(canon, book)}">${esc(bookName)}</a><span class="sep" aria-hidden="true">›</span><span class="current">Chapter ${chapter}</span>`;
  }
  el.text?.setAttribute('aria-label', `${refName} text`);

  // ---------- state ----------
  let BOOKS = null;            // {slug: chapters}
  let ORDER = [];
  let VERSES = [];             // [{v, t, s}]
  let XREFS = null;
  let selected = null;         // selected verse number (string)
  let lastFocus = null;

  // ---------- slots for enhancer panels ----------
  const SLOT_FOR = { progress: '#rdProgressSlot', display: '#rdDisplaySlot', search: '#rdSearchSlot', share: '#rdShareSlot', jump: '#rdJumpSlot', offline: '#rdOfflineSlot', shortcuts: '#rdShortcutsSlot' };
  function mount(name, node){
    const slot = $(SLOT_FOR[name] || '');
    if(!slot || !node) return false;
    slot.appendChild(node);
    return true;
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg){
    if(!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-on'), 1900);
  }

  // ---------- fetch ----------
  async function getJSON(url){
    try{
      const r = await fetch(url);
      if(!r.ok) return { ok: false, status: r.status };
      return { ok: true, status: r.status, data: await r.json() };
    }catch(error){
      return { ok: false, status: 0, network: true };
    }
  }

  // ---------- navigation model ----------
  function sequenceFor(slug){
    const current = ORDER.find(b => b.slug === slug);
    return ORDER.filter(b => current && current.outOfSequence ? b.outOfSequence : !b.outOfSequence);
  }
  function neighbours(){
    const seq = sequenceFor(book);
    const i = seq.findIndex(b => b.slug === book);
    const total = BOOKS && BOOKS[book] ? Number(BOOKS[book]) : null;
    let prev = null, next = null;
    if(chapter > 1) prev = { canon, slug: book, ch: Math.min(chapter - 1, total || chapter - 1) };
    else if(i > 0) prev = { canon, slug: seq[i - 1].slug, ch: seq[i - 1].chapters };
    else if(canon === 'newtestament' && book === 'matthew') prev = { canon: 'tanakh', slug: 'malachi', ch: 4 };  // Malachi has 4 chapters (KJV)
    if(total && chapter < total) next = { canon, slug: book, ch: chapter + 1 };
    else if(total && i >= 0 && i < seq.length - 1) next = { canon, slug: seq[i + 1].slug, ch: 1 };
    else if(total && canon === 'tanakh' && book === 'malachi') next = { canon: 'newtestament', slug: 'matthew', ch: 1 };
    return { prev, next };
  }
  const hrefOf = n => B.chapterHref(n.canon, n.slug, n.ch);
  const labelOf = n => `${B.chapterName(n.slug)} ${n.ch}`;

  function paintNavigation(){
    const { prev, next } = neighbours();
    [[el.prev, prev, 'Previous chapter'], [el.next, next, 'Next chapter']].forEach(([a, n, word]) => {
      if(!a) return;
      if(n){ a.href = hrefOf(n); a.removeAttribute('aria-disabled'); a.setAttribute('aria-label', `${word}: ${labelOf(n)}`); a.removeAttribute('tabindex'); }
      else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.setAttribute('aria-label', `${word} (none)`); a.setAttribute('tabindex', '-1'); }
    });
    if(el.pager){
      el.pager.innerHTML = `
        ${prev ? `<a class="prev" href="${hrefOf(prev)}" rel="prev"><small>Previous</small><strong>${esc(labelOf(prev))}</strong></a>` : ''}
        ${next ? `<a class="next" href="${hrefOf(next)}" rel="next"><small>Next</small><strong>${esc(labelOf(next))}</strong></a>` : ''}
        <div class="rd-pager-foot"><a href="${B.landingHref(canon, book)}">${esc(bookName)} overview</a><a href="#" data-open-nav>All books</a></div>`;
      el.pager.hidden = false;
    }
  }

  // ---------- status / states ----------
  function setBusy(on){ el.text?.setAttribute('aria-busy', on ? 'true' : 'false'); }
  function showNotice(html, icon = 'info'){
    if(!el.notice) return;
    el.notice.innerHTML = `${ICON[icon] || ''}<div>${html}</div>`;
    el.notice.hidden = false;
  }
  function showState(title, body, actions = ''){
    setBusy(false);
    el.text.innerHTML = `<div class="rd-state" role="status"><h2>${title}</h2><p>${body}</p>${actions ? `<div class="rd-state-actions">${actions}</div>` : ''}</div>`;
    el.text.removeAttribute('tabindex');
  }
  const browseBtn = (label = `Browse ${esc(CANON.label)} books`, primary = true) => `<button type="button" class="rd-btn${primary ? ' is-primary' : ''}" data-open-nav>${label}</button>`;

  function stateNoBook(){
    document.title = `Not found · ${CANON.label} — Semitic Jew`;
    showState(`“${esc(B.titleCase(params.get('book') || book))}” isn’t in the ${esc(CANON.label)} reader`,
      `We couldn’t find a book with that name here. It may be spelled differently or belong to another collection.`,
      `${browseBtn()}<a class="rd-btn" href="${CANON.hub}">${esc(CANON.label)} overview</a>`);
    if(el.pager) el.pager.hidden = true;
  }
  function stateNoChapter(total){
    showState(`${esc(bookName)} has ${total} chapter${total === 1 ? '' : 's'}`,
      `There is no chapter ${chapter} in ${esc(bookName)}.`,
      `<a class="rd-btn is-primary" href="${B.chapterHref(canon, book, total)}">Read ${esc(B.chapterName(book))} ${total}</a><a class="rd-btn" href="${B.chapterHref(canon, book, 1)}">Start at chapter 1</a>${browseBtn('Choose a chapter', false)}`);
  }
  function stateMissing(){
    showState(`${esc(refName)} isn’t available yet`,
      `The text of this chapter hasn’t been added to the reader. Other chapters of ${esc(bookName)} may still be available.`,
      `${browseBtn('Choose a chapter')}<a class="rd-btn" href="${B.landingHref(canon, book)}">${esc(bookName)} overview</a>`);
  }
  function stateOffline(){
    showState(`You’re offline`,
      `${esc(refName)} hasn’t been saved on this device yet, so it can’t be opened without a connection. Reconnect to read it, or open a chapter you’ve saved for offline reading.`,
      `<button type="button" class="rd-btn is-primary" data-retry>Try again</button><a class="rd-btn" href="/app.html#offline-chapters">Saved chapters</a>`);
  }
  function stateError(){
    showState(`We couldn’t load ${esc(refName)}`,
      `Something went wrong while loading this chapter. Please check your connection and try again.`,
      `<button type="button" class="rd-btn is-primary" data-retry>Try again</button>${browseBtn('Choose another chapter', false)}`);
  }

  // ---------- offline copy (written by reader-offline-chapter.js) ----------
  function savedOfflineCopy(){
    const key = `${canon}:${params.get('book') || ''}:${chRaw}`;
    const items = readJSON('sj_offline_chapters_v1', []);
    const item = Array.isArray(items) ? items.find(i => i && i.key === key) : null;
    if(!item || !Array.isArray(item.verses) || !item.verses.length) return null;
    const verses = item.verses.map(line => {
      const m = /^(\d+)\s*([\s\S]*)$/.exec(String(line).trim());
      return m ? { v: m[1], t: m[2], s: [] } : null;
    }).filter(Boolean);
    return verses.length ? { verses, savedAt: item.savedAt } : null;
  }

  // ---------- Scripture rendering ----------
  const STANZAS_119 = ['Aleph','Beth','Gimel','Daleth','He','Vau','Zain','Cheth','Teth','Jod','Caph','Lamed','Mem','Nun','Samech','Ain','Pe','Tzaddi','Koph','Resh','Schin','Tau'];

  function prefs(){ const p = readJSON('sj_reader_preferences_v1', {}); return p && typeof p === 'object' ? p : {}; }
  function applyLayout(){
    const layout = prefs().layout === 'verses' ? 'verses' : 'paragraph';
    el.text.dataset.layout = layout;
    el.text.dataset.poetry = String(isPoetry && layout === 'paragraph');
  }

  const isBlank = t => { const s = String(t ?? '').trim(); return !s || s === '[]'; };
  function verseNode(v){
    const n = String(v.v);
    const span = document.createElement('span');
    span.className = 'verse';
    span.id = `v${n}`;
    span.dataset.verse = n;
    span.tabIndex = -1;
    const num = document.createElement('span');
    num.className = 'vnum';
    num.textContent = n;
    const txt = document.createElement('span');
    txt.className = 'vtext';
    if(isBlank(v.t)){
      // Some verse slots in the dataset have no text (e.g. Revelation 22:21 is stored as "[]").
      // Say so plainly instead of printing "[]"; the dataset itself is not changed here.
      const miss = document.createElement('span');
      miss.className = 'rd-missing';
      miss.textContent = 'Verse text unavailable';
      txt.appendChild(miss);
    }else{
      txt.textContent = v.t;
    }
    span.append(num, ' ', txt);
    return span;
  }

  function renderVerses(list){
    VERSES = list.map(v => ({ v: String(v.v), t: v.t || '', s: v.s }));
    const frag = document.createDocumentFragment();
    let block = document.createElement('p');
    VERSES.forEach((v, i) => {
      if(book === 'psalm' && chapter === 119 && i % 8 === 0){
        if(block.childNodes.length) frag.appendChild(block);
        const h = document.createElement('h2');
        h.className = 'rd-stanza';
        h.textContent = STANZAS_119[i / 8] || '';
        frag.appendChild(h);
        block = document.createElement('p');
      }
      block.append(verseNode(v), ' ');
    });
    frag.appendChild(block);
    el.text.replaceChildren(frag);
    applyLayout();
    setBusy(false);
    const first = el.text.querySelector('.verse');
    if(first) first.tabIndex = 0;
    paintMarks();
    const copy = document.createElement('p');
    copy.className = 'rd-copyright';
    copy.textContent = 'King James Version · Public domain';
    el.text.after(copy);
    document.dispatchEvent(new CustomEvent('sj:reader-rendered', { detail: { canon, book, chapter, verses: VERSES.length } }));
    if(/^#v\d+$/.test(location.hash)) goToVerse(location.hash.slice(2), { instant: true });
  }

  function goToVerse(n, { instant = false } = {}){
    const target = document.getElementById(`v${n}`);
    if(!target) return;
    target.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'center' });
    target.classList.add('reader-verse-target');
    setTimeout(() => target.classList.remove('reader-verse-target'), 2400);
  }

  // ---------- highlights / notes marks ----------
  const HL = [
    { key: 'key', label: 'Key Verse' }, { key: 'law', label: 'Law / Command' },
    { key: 'prophecy', label: 'Prophecy' }, { key: 'question', label: 'Question / Research' }
  ];
  const hlStore = {
    read(){ try { return window.SemJHighlights?.read?.() ?? readJSON('sj_verse_highlights_v1', []); } catch { return []; } },
    write(items){ if(window.SemJHighlights?.write) window.SemJHighlights.write(items); else writeJSON('sj_verse_highlights_v1', items.slice(0, 300)); }
  };
  const APP_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];   // written by the app's own reader
  const hlKey = n => `${keyPrefix}${n}`;
  function highlightFor(n){ const items = hlStore.read(); return Array.isArray(items) ? items.find(i => i && i.key === hlKey(n)) || null : null; }
  function readNotes(){ const n = readJSON(notesKey, {}); return n && typeof n === 'object' ? n : {}; }

  function paintMarks(){
    const items = hlStore.read();
    const byKey = new Map((Array.isArray(items) ? items : []).map(i => [i && i.key, i]));
    const notes = readNotes();
    $$('#verses .verse').forEach(node => {
      const n = node.dataset.verse;
      const item = byKey.get(hlKey(n));
      node.classList.remove('sj-verse-highlighted', ...HL.map(h => `sj-highlight-${h.key}`), ...APP_COLORS.map(c => `sj-highlight-${c}`));
      if(item){ node.classList.add('sj-verse-highlighted', `sj-highlight-${item.category || 'key'}`); node.dataset.sjHighlightKey = item.key; }
      node.classList.toggle('has-note', !!(notes[n] && String(notes[n]).trim()));
    });
  }

  function verseText(n){ const t = (VERSES.find(v => v.v === String(n)) || {}).t; return isBlank(t) ? '' : t; }
  const verseRef = n => `${headName} ${chapter}:${n}`;

  function setHighlight(n, category){
    const items = (hlStore.read() || []).filter(i => i && i.key !== hlKey(n));
    if(category){
      const label = (HL.find(h => h.key === category) || HL[0]).label;
      items.unshift({
        key: hlKey(n), category, categoryLabel: label,
        canon, canonLabel: CANON.label, book: params.get('book') || book, bookTitle: headName, chapter: chRaw, verse: String(n),
        title: verseRef(n), url: `${chapterUrl}#v${n}`, text: `${n} ${verseText(n)}`.trim(),
        savedAt: new Date().toISOString()
      });
    }
    hlStore.write(items.slice(0, 300));
    paintMarks();
    syncVerseBar();
    toast(category ? `Highlighted as ${(HL.find(h => h.key === category) || HL[0]).label}` : 'Highlight removed');
  }

  // ---------- notes (legacy per-chapter store + exposition index) ----------
  function saveNote(n, value){
    const text = String(value || '').trim();
    const notes = readNotes();
    if(text) notes[n] = text; else delete notes[n];
    writeJSON(notesKey, notes);
    const KEY = 'sj_no_private_interpretation_v1';
    const key = `${canon}:${params.get('book') || book}:${chRaw}:${n}`;
    const items = (readJSON(KEY, []) || []).filter(i => i && i.key !== key);
    if(text){
      items.unshift({
        key, canon, canonLabel: CANON.label, book: params.get('book') || book, bookTitle: headName, chapter: chRaw, verse: String(n),
        title: verseRef(n), url: `${chapterUrl}#v${n}`, exposition: text, updatedAt: new Date().toISOString()
      });
    }
    writeJSON(KEY, items.slice(0, 300));
    paintMarks();
  }

  // ---------- selection + verse action bar ----------
  function verseEls(){ return $$('#verses .verse'); }
  function setRoving(node){ verseEls().forEach(v => { v.tabIndex = v === node ? 0 : -1; }); }

  function select(n, { focusBar = false } = {}){
    verseEls().forEach(v => v.classList.toggle('is-selected', v.dataset.verse === String(n)));
    selected = n == null ? null : String(n);
    if(selected == null){ el.vbar.hidden = true; return; }
    const node = document.getElementById(`v${selected}`);
    if(node) setRoving(node);
    syncVerseBar();
    el.vbar.hidden = false;
    if(focusBar) $('button', el.vbar)?.focus();
  }
  function closeVerseBar({ restoreFocus = false } = {}){
    const n = selected;
    select(null);
    if(restoreFocus && n) document.getElementById(`v${n}`)?.focus();
  }
  function syncVerseBar(){
    if(!selected) return;
    $('#rdVerseRef').textContent = verseRef(selected);
    const item = highlightFor(selected);
    $$('[data-hl]', el.vbar).forEach(b => b.setAttribute('aria-pressed', String(item ? b.dataset.hl === (item.category || 'key') : b.dataset.hl === 'none')));
    const appColor = item && APP_COLORS.includes(item.category);
    $('#rdHlLabel').textContent = !item ? 'No highlight'
      : appColor ? `Highlighted in the app (${item.category})`
      : (item.categoryLabel || (HL.find(h => h.key === item.category) || HL[0]).label);
  }

  async function copyVerse(n){
    const text = `${verseRef(n)} ${verseText(n)}`.trim();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove();
    }
    toast(`Copied ${verseRef(n)}`);
  }
  async function shareVerse(n){
    const url = `${location.origin}/v/${book}-${chapter}-${n}/`;
    const data = { title: `${verseRef(n)} — Semitic Jew`, text: `“${verseText(n)}” — ${verseRef(n)}`, url };
    if(navigator.share){ try { await navigator.share(data); return; } catch(e){ if(e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast('Verse link copied'); } catch { toast(url); }
  }

  function wireText(){
    el.text.addEventListener('click', e => {
      const node = e.target.closest('.verse');
      if(!node || !el.text.contains(node)) return;
      const sel = window.getSelection && String(window.getSelection());
      if(sel && sel.trim().length > 1) return;               // let people select text to copy
      if(selected === node.dataset.verse){ closeVerseBar(); return; }
      select(node.dataset.verse);
    });
    el.text.addEventListener('keydown', e => {
      const node = e.target.closest && e.target.closest('.verse');
      if(!node) return;
      const all = verseEls(); const i = all.indexOf(node);
      let to = null;
      if(e.key === 'ArrowDown' || e.key === 'ArrowRight') to = all[Math.min(all.length - 1, i + 1)];
      else if(e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = all[Math.max(0, i - 1)];
      else if(e.key === 'Home') to = all[0];
      else if(e.key === 'End') to = all[all.length - 1];
      else if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); select(node.dataset.verse, { focusBar: true }); return; }
      else if(e.key === 'Escape' && selected){ e.preventDefault(); closeVerseBar(); return; }
      if(to){ e.preventDefault(); setRoving(to); to.focus(); if(selected) select(to.dataset.verse); }
    });
  }

  function wireVerseBar(){
    el.vbar.addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b || !selected) return;
      if(b.dataset.hl) return setHighlight(selected, b.dataset.hl === 'none' ? null : b.dataset.hl);
      const act = b.dataset.act;
      if(act === 'close') return closeVerseBar({ restoreFocus: true });
      if(act === 'copy') return copyVerse(selected);
      if(act === 'share') return shareVerse(selected);
      if(act === 'note' || act === 'xref' || act === 'lexicon') return openStudy('verse', act);
    });
    el.vbar.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); closeVerseBar({ restoreFocus: true }); } });
  }

  // ---------- overlays (drawer, display popover, navigator) ----------
  // Where to send focus back to: the control that opened an overlay, unless that was nothing
  // in particular (body) or it has since been hidden/removed — then the overlay's own button.
  const focusable = n => !!(n && n !== document.body && document.contains(n) && n.offsetParent !== null && !n.closest('[hidden]'));
  function trapFocus(container, e){
    if(e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])', container).filter(n => n.tabIndex >= 0 && n.offsetParent !== null && !n.closest('[hidden]'));
    if(!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  function openStudy(tab = 'verse', focus){
    lastFocus = document.activeElement;
    el.vbar.hidden = true;
    el.study.hidden = false; el.scrim.hidden = false;
    el.studyBtn?.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    showTab(tab);
    if(tab === 'verse') renderVersePanel(focus);
    else $(`#rdTab-${tab}`)?.focus();
  }
  function closeStudy(){
    if(el.study.hidden) return;
    el.study.hidden = true; el.scrim.hidden = true;
    el.studyBtn?.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    if(selected) el.vbar.hidden = false;
    const back = focusable(lastFocus) ? lastFocus : el.studyBtn;
    back?.focus?.();
  }
  function showTab(name){
    $$('[role="tab"]', el.study).forEach(t => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $$('.rd-panel', el.study).forEach(p => { p.hidden = p.dataset.panel !== name; });
  }

  function openDisplay(){
    closeSearch(false);
    el.display.hidden = false; el.displayBtn.setAttribute('aria-expanded', 'true');
    syncThemeButtons(); syncLayoutButtons();
    $('button', el.display)?.focus();
  }
  function closeDisplay(focusBtn = true){
    if(el.display.hidden) return;
    el.display.hidden = true; el.displayBtn.setAttribute('aria-expanded', 'false');
    if(focusBtn) el.displayBtn.focus();
  }

  function openSearch(){
    el.searchRow.hidden = false; el.searchBtn.setAttribute('aria-expanded', 'true');
    const input = $('#reader-chapter-search'); input?.focus(); input?.select?.();
  }
  function closeSearch(focusBtn = true){
    if(el.searchRow.hidden) return;
    el.searchRow.hidden = true; el.searchBtn.setAttribute('aria-expanded', 'false');
    $('#reader-search-clear')?.click();
    if(focusBtn) el.searchBtn.focus();
  }

  // ---------- verse study panel ----------
  function parseCodes(s){
    if(Array.isArray(s)) return s.map(c => String(c).toUpperCase()).filter(c => /^[HG]\d+$/.test(c));
    return String(s || '').toUpperCase().match(/[HG]\d+/g) || [];
  }

  function renderVersePanel(focus){
    const panel = $('#rdPanelVerse');
    if(!selected){
      panel.innerHTML = `<p class="rd-hint">Tap or click any verse in the chapter to write a note, see cross-references or open a word study for it.</p>`;
      $('#rdTab-verse')?.focus();
      return;
    }
    const n = selected;
    const v = VERSES.find(x => x.v === n) || { s: [] };
    const all = verseEls(); const i = all.findIndex(x => x.dataset.verse === n);
    const codes = parseCodes(v.s);
    panel.innerHTML = `
      <section class="rd-section" aria-labelledby="rdQuoteRef">
        <p class="rd-quote-ref" id="rdQuoteRef">${esc(verseRef(n))}</p>
        <p class="rd-quote">${esc(verseText(n))}</p>
        <div class="rd-verse-nav">
          <button type="button" data-step="-1" ${i <= 0 ? 'disabled' : ''}>‹ Verse ${i > 0 ? esc(all[i - 1].dataset.verse) : ''}</button>
          <button type="button" data-step="1" ${i >= all.length - 1 ? 'disabled' : ''}>Verse ${i < all.length - 1 ? esc(all[i + 1].dataset.verse) : ''} ›</button>
        </div>
      </section>
      <section class="rd-section" id="rdSecNote" aria-labelledby="rdNoteH">
        <h3 id="rdNoteH"><label for="rdNote">Your note</label></h3>
        <textarea class="rd-note" id="rdNote" placeholder="Write your exposition, observations or study notes for ${esc(verseRef(n))}…"></textarea>
        <p class="rd-note-status" id="rdNoteStatus" aria-live="polite">Saved only on this device.</p>
      </section>
      <section class="rd-section" id="rdSecXref" aria-labelledby="rdXrefH">
        <h3 id="rdXrefH">Cross-references</h3>
        <div id="rdXrefBody">${xrefHTML(n)}</div>
      </section>
      <section class="rd-section" id="rdSecLex" aria-labelledby="rdLexH">
        <h3 id="rdLexH">Word study</h3>
        <div id="rdLexBody" class="rd-lexicon">${codes.length
          ? `<p class="rd-hint">${codes.length} Hebrew/Greek word${codes.length === 1 ? '' : 's'} with Strong’s numbers.</p><p style="margin-top:.75rem"><button type="button" class="rd-btn" data-load-lexicon>Show word study</button></p>`
          : `<p class="rd-hint">${canon === 'apocrypha' ? 'Strong’s numbers aren’t available for the Apocrypha text.' : 'No Strong’s numbers are attached to this verse.'}</p>`}</div>
      </section>`;
    const ta = $('#rdNote');
    ta.value = readNotes()[n] || '';
    const status = $('#rdNoteStatus');
    const save = debounce(() => { saveNote(n, ta.value); status.textContent = ta.value.trim() ? 'Saved on this device.' : 'Note cleared.'; }, 350);
    ta.addEventListener('input', () => { status.textContent = 'Saving…'; save(); });
    ta.addEventListener('blur', () => saveNote(n, ta.value));
    panel.onclick = e => {
      const step = e.target.closest('[data-step]');
      if(step){ const to = all[i + Number(step.dataset.step)]; if(to){ select(to.dataset.verse); el.vbar.hidden = true; renderVersePanel(); to.scrollIntoView({ block: 'center', behavior: 'smooth' }); } return; }
      if(e.target.closest('[data-load-lexicon]')) loadWordStudy(n);
      const showAll = e.target.closest('[data-xref-all]');
      if(showAll){
        $$('#rdXrefBody li[hidden]').forEach(li => { li.hidden = false; });
        showAll.setAttribute('aria-expanded', 'true');
        showAll.closest('.rd-xref-more').hidden = true;
        $('#rdXrefBody li:nth-child(13) a')?.focus();
        try { window.XRefHover?.scan?.(); } catch {}
      }
    };
    panel.dataset.focus = focus || '';
    try { window.XRefHover?.scan?.(); } catch {}
    const target = focus === 'xref' ? $('#rdSecXref') : focus === 'lexicon' ? $('#rdSecLex') : null;
    if(focus === 'lexicon' && codes.length) loadWordStudy(n);
    if(focus === 'note' || !focus) ta.focus({ preventScroll: true });
    const scroller = panel.closest('.rd-panels');
    if(target){
      const h = $('h3', target); h?.setAttribute('tabindex', '-1'); h?.focus({ preventScroll: true });
      requestAnimationFrame(() => { scroller.scrollTop = target.offsetTop - 8; });
    }else scroller.scrollTop = 0;
  }

  function xrefHTML(n){
    if(XREFS === 'loading') return '<p class="rd-hint">Loading cross-references…</p>';
    const refs = XREFS && typeof XREFS === 'object' ? XREFS[String(n)] || [] : [];
    if(!refs.length) return `<p class="rd-hint">${canon === 'apocrypha' ? 'Cross-references aren’t available for the Apocrypha yet.' : 'No cross-references for this verse.'}</p>`;
    const LIMIT = 12;
    const items = refs.map((r, k) => {
      const { slug } = B.resolveRef(r);
      const target = slug === 'psalm' ? 'tanakh' : r.canon;
      const label = `${B.chapterName(slug)} ${r.c}:${r.v}`;
      return `<li${k >= LIMIT ? ' hidden' : ''}><a class="xref-trigger" data-xref="${esc(label)}" href="${B.chapterHref(target, slug, r.c, r.v)}">${esc(label)}</a></li>`;
    }).join('');
    const more = refs.length > LIMIT ? `<p class="rd-xref-more" style="margin-top:.75rem"><button type="button" class="rd-btn" data-xref-all aria-expanded="false">Show all ${refs.length}</button></p>` : '';
    return `<ul class="rd-xrefs">${items}</ul>${more}`;
  }

  async function loadWordStudy(n){
    const body = $('#rdLexBody'); if(!body) return;
    const v = VERSES.find(x => x.v === n) || {};
    const codes = [...new Set(parseCodes(v.s))];
    const S = window.Strongs;
    if(!codes.length || !S){ body.innerHTML = '<p class="rd-hint">Word study isn’t available for this verse.</p>'; return; }
    body.setAttribute('aria-busy', 'true');
    body.innerHTML = '<p class="rd-hint" role="status">Loading the Strong’s lexicon…</p>';
    try{
      await Promise.all([codes.some(c => c[0] === 'H') && S.load('he'), codes.some(c => c[0] === 'G') && S.load('gr')].filter(Boolean));
      if(selected !== n) return;
      body.innerHTML = S.renderOrderedRows(codes.map(code => ({ code, word: '' })));
      // Upgrade to English word-order alignment when that (larger) index is available.
      S.orderedTerms({ canon, book, chapter, verse: n }, codes).then(terms => {
        if(selected !== n || !document.contains(body) || !terms.some(t => t.word)) return;
        body.innerHTML = `<p class="rd-hint" style="margin-bottom:.75rem">In English word order.</p>${S.renderOrderedRows(terms)}`;
      }).catch(() => {});
    }catch{
      body.innerHTML = `<p class="rd-hint">The lexicon couldn’t be loaded${navigator.onLine === false ? ' while offline' : ''}. Please try again.</p><p style="margin-top:.75rem"><button type="button" class="rd-btn" data-load-lexicon>Try again</button></p>`;
    }finally{ body.removeAttribute('aria-busy'); }
  }

  // ---------- lexicon / dictionary lookup tab ----------
  let EASTON = null;
  function wireLookup(){
    const form = $('#rdLookupForm'); const input = $('#dictQuery'); const out = $('#dictBody');
    if(!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const term = input.value.trim();
      if(!term){ out.innerHTML = '<p class="rd-hint">Type a word, or a Strong’s number such as H7225 or G3056.</p>'; return; }
      out.setAttribute('aria-busy', 'true');
      out.innerHTML = '<p class="rd-hint" role="status">Looking up…</p>';
      try{
        const code = /^\s*([HG])\s*0*(\d{1,5})\s*$/i.exec(term);
        if(code && window.Strongs){
          const c = code[1].toUpperCase() + code[2];
          await window.Strongs.load(c[0] === 'H' ? 'he' : 'gr');
          out.innerHTML = `<div class="rd-lexicon">${window.Strongs.renderRow(c).replace('<details class="strongs-item', '<details open class="strongs-item')}</div>`;
          return;
        }
        if(!EASTON){ const r = await getJSON('/data/dictionaries/easton_dictionary.json'); EASTON = r.ok && Array.isArray(r.data) ? r.data : null; }
        if(!EASTON){ out.innerHTML = `<p class="rd-hint">The dictionary couldn’t be loaded${navigator.onLine === false ? ' while offline' : ''}.</p>`; return; }
        const t = term.toLowerCase();
        const hit = EASTON.find(x => (x.term || '').toLowerCase() === t) || EASTON.find(x => (x.term || '').toLowerCase().startsWith(t));
        if(!hit){ out.innerHTML = `<p class="rd-hint">No entry for “${esc(term)}” in Easton’s Bible Dictionary.</p>`; return; }
        const defs = Array.isArray(hit.definitions) ? hit.definitions : [];
        out.innerHTML = `<h4>${esc(hit.term)}</h4>${defs.length ? `<ol>${defs.map(d => `<li>${esc(d)}</li>`).join('')}</ol>` : '<p class="rd-hint">No definition text.</p>'}<p class="rd-hint" style="margin-top:1rem">Easton’s Bible Dictionary</p>`;
      }catch{
        out.innerHTML = '<p class="rd-hint">Lookup failed. Please try again.</p>';
      }finally{ out.removeAttribute('aria-busy'); }
    });
  }

  // ---------- display popover: layout + theme ----------
  function syncLayoutButtons(){
    const layout = prefs().layout === 'verses' ? 'verses' : 'paragraph';
    $$('[data-reader-layout]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.readerLayout === layout)));
  }
  function syncThemeButtons(){
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    $$('.rd-theme-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setTheme === theme)));
  }

  // ---------- navigator ----------
  const booksCache = {};
  async function booksFor(c){
    if(c === canon && BOOKS) return BOOKS;
    if(!booksCache[c]){ const r = await getJSON(`/data/${c}/books.json`); booksCache[c] = r.ok && r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : {}; }
    return booksCache[c];
  }
  const navState = { canon, book, view: 'chapters' };
  async function renderNavigator(){
    const body = $('#rdNavBody');
    $$('[data-nav-canon]', el.nav).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.navCanon === navState.canon)));
    const counts = await booksFor(navState.canon);
    const list = B.ordered(navState.canon, counts);
    if(!list.length){ body.innerHTML = `<p class="rd-hint">Books couldn’t be loaded${navigator.onLine === false ? ' while offline' : ''}.</p>`; return; }
    const current = list.find(b => b.slug === navState.book);
    if(navState.view === 'chapters' && current){
      const cur = navState.canon === canon && current.slug === book ? chapter : 0;
      body.innerHTML = `
        <div class="rd-ch-head"><h3 id="rdNavBook">${esc(current.name)}</h3><button type="button" class="rd-btn" data-nav-books>All books</button></div>
        <ul class="rd-ch-grid" aria-labelledby="rdNavBook">${Array.from({ length: current.chapters }, (_, k) => k + 1).map(c =>
          `<li><a href="${B.chapterHref(navState.canon, current.slug, c)}" ${c === cur ? 'aria-current="page"' : ''} aria-label="${esc(B.chapterName(current.slug))} ${c}">${c}</a></li>`).join('')}</ul>
        <div class="rd-nav-foot"><a href="${B.landingHref(navState.canon, current.slug)}">${esc(current.name)} overview</a><a href="${B.CANONS[navState.canon].hub}">${esc(B.CANONS[navState.canon].label)} overview</a></div>`;
      ($('a[aria-current="page"]', body) || $('a', body))?.focus();
      return;
    }
    const groups = [];
    list.forEach(b => { let g = groups.find(x => x.label === b.group); if(!g) groups.push(g = { label: b.group, books: [] }); g.books.push(b); });
    body.innerHTML = groups.map((g, gi) => `
      <section class="rd-nav-group" aria-labelledby="rdNavG${gi}">
        ${groups.length > 1 || g.label !== B.CANONS[navState.canon].label ? `<h3 id="rdNavG${gi}">${esc(g.label)}</h3>` : `<h3 id="rdNavG${gi}" class="rd-sr">${esc(g.label)}</h3>`}
        <ul class="rd-book-grid">${g.books.map(b => `<li><button type="button" data-nav-book="${esc(b.slug)}" ${b.slug === book && navState.canon === canon ? 'aria-current="true"' : ''}>${esc(b.name)}</button></li>`).join('')}</ul>
      </section>`).join('');
    ($('button[aria-current="true"]', body) || $('button', body))?.focus();
  }
  function openNavigator(view){
    lastFocus = document.activeElement;
    navState.canon = canon; navState.book = book; navState.view = view || (BOOKS && !BOOKS[book] ? 'books' : 'chapters');
    if(typeof el.nav.showModal === 'function') el.nav.showModal(); else el.nav.setAttribute('open', '');
    el.navBtn.setAttribute('aria-expanded', 'true');
    renderNavigator();
  }
  function wireNavigator(){
    el.nav.addEventListener('click', e => {
      if(e.target === el.nav){ el.nav.close(); return; }       // backdrop click
      const c = e.target.closest('[data-nav-canon]');
      if(c){ navState.canon = c.dataset.navCanon; navState.view = 'books'; renderNavigator(); return; }
      const b = e.target.closest('[data-nav-book]');
      if(b){ navState.book = b.dataset.navBook; navState.view = 'chapters'; renderNavigator(); return; }
      if(e.target.closest('[data-nav-books]')){ navState.view = 'books'; renderNavigator(); return; }
      if(e.target.closest('[data-nav-close]')) el.nav.close();
    });
    el.nav.addEventListener('close', () => { el.navBtn.setAttribute('aria-expanded', 'false'); (focusable(lastFocus) ? lastFocus : el.navBtn).focus?.(); });
  }

  // ---------- bar auto-hide while reading down ----------
  function wireBarAutoHide(){
    let lastY = window.scrollY;
    const busy = () => !el.study.hidden || !el.display.hidden || !el.searchRow.hidden || el.nav.open || el.bar.contains(document.activeElement);
    window.addEventListener('scroll', () => {
      const y = window.scrollY; const dy = y - lastY; lastY = y;
      if(busy() || y < 240){ el.bar.classList.remove('is-hidden'); return; }
      if(dy > 6) el.bar.classList.add('is-hidden');
      else if(dy < -6) el.bar.classList.remove('is-hidden');
    }, { passive: true });
    el.bar.addEventListener('focusin', () => el.bar.classList.remove('is-hidden'));
  }

  // ---------- global wiring ----------
  function wireUI(){
    el.navBtn.addEventListener('click', () => openNavigator());
    el.studyBtn.addEventListener('click', () => el.study.hidden ? openStudy(selected ? 'verse' : 'verse') : closeStudy());
    el.displayBtn.addEventListener('click', () => el.display.hidden ? openDisplay() : closeDisplay());
    el.searchBtn.addEventListener('click', () => el.searchRow.hidden ? openSearch() : closeSearch());
    el.scrim.addEventListener('click', closeStudy);
    $('[data-close-study]', el.study).addEventListener('click', closeStudy);
    el.study.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); closeStudy(); } trapFocus(el.study, e); });
    $('[role="tablist"]', el.study).addEventListener('click', e => {
      const t = e.target.closest('[role="tab"]'); if(!t) return;
      showTab(t.dataset.tab); if(t.dataset.tab === 'verse') renderVersePanel('tab');
    });
    $('[role="tablist"]', el.study).addEventListener('keydown', e => {
      const tabs = $$('[role="tab"]', el.study); const i = tabs.indexOf(document.activeElement);
      if(i < 0) return;
      let to = null;
      if(e.key === 'ArrowRight') to = tabs[(i + 1) % tabs.length];
      if(e.key === 'ArrowLeft') to = tabs[(i - 1 + tabs.length) % tabs.length];
      if(to){ e.preventDefault(); to.focus(); to.click(); }
    });
    el.display.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); closeDisplay(); } });
    el.display.addEventListener('click', e => {
      const b = e.target.closest('[data-reader-layout]');
      if(b){
        const p = prefs(); p.layout = b.dataset.readerLayout === 'verses' ? 'verses' : 'paragraph';
        writeJSON('sj_reader_preferences_v1', p); applyLayout(); syncLayoutButtons();
      }
      const t = e.target.closest('[data-set-theme]');
      if(t){
        // Same behaviour and storage as the site header's Light/Dark buttons (/js/theme-toggle.js).
        if(typeof window.applyTheme === 'function') window.applyTheme(t.dataset.setTheme);
        else { document.documentElement.setAttribute('data-theme', t.dataset.setTheme); try { localStorage.setItem('theme', t.dataset.setTheme); } catch {} }
        syncThemeButtons();
      }
      if(e.target.closest('[data-close-display]')) closeDisplay();
    });
    el.searchRow.addEventListener('keydown', e => { if(e.key === 'Escape' && !$('#reader-chapter-search')?.value){ e.preventDefault(); closeSearch(); } });
    document.addEventListener('click', e => {
      if(!el.display.hidden && !el.display.contains(e.target) && !el.displayBtn.contains(e.target)) closeDisplay(false);
      if(e.target.closest('[data-open-nav]')){ e.preventDefault(); openNavigator(BOOKS && BOOKS[book] ? 'chapters' : 'books'); }
      if(e.target.closest('[data-retry]')) location.reload();
    });
    new MutationObserver(syncThemeButtons).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('keydown', e => {
      const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
      if(typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if(e.key === '[' && el.prev?.href){ location.href = el.prev.href; }
      if(e.key === ']' && el.next?.href){ location.href = el.next.href; }
      if(e.key === 'Escape' && selected && el.study.hidden) closeVerseBar({ restoreFocus: true });
    });
    wireText(); wireVerseBar(); wireNavigator(); wireLookup(); wireBarAutoHide();
  }

  // ---------- load ----------
  async function loadXrefs(){
    if(canon === 'apocrypha'){ XREFS = null; return; }
    XREFS = 'loading';
    const r = await getJSON(`/data/crossrefs/${canon}/${B.xrefDir(canon, book)}/${chapter}.json`);
    XREFS = r.ok && r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : null;
    if(selected && !el.study.hidden && $('#rdXrefBody')){
      $('#rdXrefBody').innerHTML = xrefHTML(selected);
      try { window.XRefHover?.scan?.(); } catch {}
      // Content above may have grown: keep the section the reader asked for in view.
      if($('#rdPanelVerse').dataset.focus === 'lexicon') $('#rdSecLex')?.scrollIntoView({ block: 'start' });
    }
  }

  async function load(){
    setBusy(true);
    const [booksRes, chapterRes] = await Promise.all([
      getJSON(`/data/${canon}/books.json`),
      getJSON(`/data/${canon}/${book}/${chapter}.json`)
    ]);
    BOOKS = booksRes.ok && booksRes.data && typeof booksRes.data === 'object' && !Array.isArray(booksRes.data) && Object.keys(booksRes.data).length ? booksRes.data : null;
    ORDER = BOOKS ? B.ordered(canon, BOOKS) : [];
    const chData = chapterRes.ok ? chapterRes.data : null;
    const verses = chData && Array.isArray(chData.verses) ? chData.verses : null;

    if(BOOKS && !(book in BOOKS)) return stateNoBook();
    paintNavigation();
    if(BOOKS && chapter > Number(BOOKS[book])) return stateNoChapter(Number(BOOKS[book]));
    if(verses && verses.length){ renderVerses(verses); loadXrefs(); return; }

    // No text from the network. A JSON array/object without verses means the service worker answered
    // with its offline placeholder; status 0 means the request itself failed.
    const unreachable = chapterRes.network || (chapterRes.ok && !verses) || navigator.onLine === false;
    if(unreachable){
      const saved = savedOfflineCopy();
      if(saved){
        renderVerses(saved.verses);
        const when = saved.savedAt ? new Date(saved.savedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        showNotice(`${navigator.onLine === false ? 'You’re offline.' : 'The site couldn’t be reached.'} Showing the copy of ${esc(refName)} saved on this device${when ? ` on ${esc(when)}` : ''}. Word study and cross-references need a connection.`, 'offline');
        return;
      }
      return navigator.onLine === false || chapterRes.network ? stateOffline() : stateError();
    }
    if(chapterRes.status === 404) return stateMissing();
    if(chData && Array.isArray(chData.verses) && !chData.verses.length) return stateMissing();
    return stateError();
  }

  window.SJReader = {
    mount, openStudy, closeStudy, openSearch, openNavigator, select, goToVerse,
    context: { canon, book, chapter, chRaw, refName, headName }
  };

  wireUI();
  load();
  window.addEventListener('hashchange', () => { if(/^#v\d+$/.test(location.hash)) goToVerse(location.hash.slice(2)); });
  window.addEventListener('online', () => { if(!VERSES.length || !el.notice.hidden) showNotice(`You’re back online. <a href="${esc(location.href)}">Reload ${esc(refName)}</a> for word study and cross-references.`); });
})();
