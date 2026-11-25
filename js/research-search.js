/* research-search.js — the Semitic Jew research search (/search.html).

   Sources
   - /search-index.json                 site records (articles, Ologies, encyclopedia entries, study guides,
                                        research resources, pages), rebuilt by .github/workflows/search-index.yml
   - /data/<canon>/books.json           chapter counts (small; used to recognise references like John 3:16)
   - /data/<canon>/<book>/<ch>.json     one chapter, fetched only to show a recognised verse
   - /data/scripture-search-index.json  36,720 verses (large); fetched only when the visitor searches Scripture

   URL parameters (unchanged from the previous page, plus canon):
   q, type, sort (relevance|newest|az), page, pp, types, tags, from, to, canon (tanakh|newtestament|apocrypha).

   The pure functions (tokenize, rank, parseReference, searchScripture…) are exposed as window.SJSearch for tests.
   The page is built with DOM APIs only (no HTML strings from data). */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- site search (ranking kept from the old page)
  const normalize = s => (s || '').toString().toLowerCase();
  // Tokens: "quoted phrases", -exclusions (incl. -"phrases") and plain words. Curly quotes count as straight quotes.
  const tokenize = str => normalize(str).replace(/[“”„‟″]/g, '"').match(/-?"[^"]+"|[^\s"]+/g) || [];
  const stripQuotes = s => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s);
  // Filler words match nearly every record, so they never earn a score on their own.
  const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'was', 'with']);
  function positiveTerms(terms) {
    const all = terms.filter(t => !t.startsWith('-')).map(stripQuotes).map(t => t.trim()).filter(Boolean);
    const content = all.filter(t => !STOPWORDS.has(t));
    return content.length ? content : all;
  }
  function levenshtein(a, b) {
    const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  // Typo tolerance (one edit) only for words of 5+ letters, so short nonsense cannot fuzzy-match real words.
  function fuzzy(term, word) {
    if (term.length < 5) return word.includes(term);
    return word === term || word.includes(term) || (Math.abs(term.length - word.length) <= 1 && levenshtein(term, word) <= 1);
  }
  function score(doc, terms) {
    let s = 0;
    const title = normalize(doc.title), ex = normalize(doc.excerpt), tg = (doc.tags || []).map(normalize);
    const joined = terms.filter(t => t.startsWith('"') && t.endsWith('"')).map(stripQuotes);
    const words = new Set((title + ' ' + ex + ' ' + tg.join(' ')).split(/[^a-z0-9]+/).filter(Boolean));
    for (const term of positiveTerms(terms)) {
      if (title.includes(term)) s += 12;
      if (tg.some(x => x.includes(term))) s += 7;
      if (ex.includes(term)) s += 3;
      if (!term.includes(' ')) { for (const w of words) { if (fuzzy(term, w)) { s += 1; break; } } }
    }
    for (const p of joined) { if (title.includes(p)) s += 10; if (ex.includes(p)) s += 6; }
    // A title that is exactly the query (e.g. an encyclopedia headword) is the best possible match.
    const whole = positiveTerms(terms).join(' ');
    if (s && whole && title === whole) s += 8;
    return s;
  }
  const byDate = (a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0);

  /** Filter, score and sort site records. opts: {query, type, types:Set, tags:Set, from, to, sort}. */
  function rank(all, opts) {
    const o = opts || {};
    const terms = tokenize(o.query || '');
    const excludes = new Set(terms.filter(t => t.startsWith('-')).map(t => stripQuotes(t.slice(1))).filter(Boolean));
    const types = o.types || new Set(), tags = o.tags || new Set();
    // One result per destination: records sharing a URL (e.g. repeated encyclopedia ids) collapse to the first.
    const seenUrls = new Set();
    let pool = all.filter(d => {
      if (d.url && d.url !== '#') { if (seenUrls.has(d.url)) return false; seenUrls.add(d.url); }
      if (o.type && d.type !== o.type) return false;
      if (types.size && !types.has(d.type)) return false;
      if (tags.size) { const set = new Set((d.tags || []).map(normalize)); for (const t of tags) if (!set.has(t)) return false; }
      if (o.from) { const ts = Date.parse(d.date || ''); if (ts && ts < Date.parse(o.from)) return false; }
      if (o.to) { const ts = Date.parse(d.date || ''); if (ts && ts > Date.parse(o.to)) return false; }
      if (excludes.size) { const hay = normalize(d.title) + ' ' + normalize(d.excerpt) + ' ' + (d.tags || []).map(normalize).join(' '); for (const x of excludes) if (hay.includes(x)) return false; }
      return true;
    });
    const searching = positiveTerms(terms).length > 0;
    // With real search words, keep only records that actually match (score > 0).
    if (searching) pool = pool.map(d => Object.assign({}, d, { _score: score(d, terms) })).filter(d => d._score > 0);
    // An explicit sort wins; otherwise a search defaults to relevance and browsing to newest.
    const sort = o.sort || (searching ? 'relevance' : 'newest');
    if (sort === 'az') pool.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'relevance') pool.sort((a, b) => ((b._score || 0) - (a._score || 0)) || byDate(a, b) || a.title.localeCompare(b.title));
    else pool.sort(byDate);
    return { items: pool, sort, terms: positiveTerms(terms) };
  }

  // ---------------------------------------------------------------- Bible references (Genesis 1:1, Jn 3:16, 1 Cor 13)
  const CANON_LABEL = { tanakh: 'Tanakh', newtestament: 'New Testament', apocrypha: 'Apocrypha' };
  // Common abbreviations → book slug. Full names and the reader's own names/abbreviations are added from SJBooks.
  const ABBR = {
    gen: 'genesis', ge: 'genesis', gn: 'genesis', ex: 'exodus', exo: 'exodus', exod: 'exodus', lev: 'leviticus', lv: 'leviticus',
    num: 'numbers', nu: 'numbers', nm: 'numbers', deut: 'deuteronomy', dt: 'deuteronomy', deu: 'deuteronomy', josh: 'joshua', jos: 'joshua',
    judg: 'judges', jdg: 'judges', jg: 'judges', rth: 'ruth', ru: 'ruth', '1 sam': '1-samuel', '2 sam': '2-samuel', '1 sa': '1-samuel', '2 sa': '2-samuel',
    '1 kgs': '1-kings', '2 kgs': '2-kings', '1 ki': '1-kings', '2 ki': '2-kings', '1 chr': '1-chronicles', '2 chr': '2-chronicles', '1 chron': '1-chronicles', '2 chron': '2-chronicles',
    ezr: 'ezra', neh: 'nehemiah', ne: 'nehemiah', est: 'esther', esth: 'esther', jb: 'job', ps: 'psalm', psa: 'psalm', psalms: 'psalm', pss: 'psalm',
    prov: 'proverbs', pro: 'proverbs', prv: 'proverbs', pr: 'proverbs', eccl: 'ecclesiastes', ecc: 'ecclesiastes', eccles: 'ecclesiastes', qoh: 'ecclesiastes',
    song: 'song-of-solomon', 'song of songs': 'song-of-solomon', sos: 'song-of-solomon', canticles: 'song-of-solomon', isa: 'isaiah', is: 'isaiah',
    jer: 'jeremiah', je: 'jeremiah', lam: 'lamentations', la: 'lamentations', ezek: 'ezekiel', eze: 'ezekiel', ezk: 'ezekiel', dan: 'daniel', da: 'daniel', dn: 'daniel',
    hos: 'hosea', ho: 'hosea', joe: 'joel', jl: 'joel', am: 'amos', obad: 'obadiah', ob: 'obadiah', jon: 'jonah', jnh: 'jonah', mic: 'micah', mi: 'micah',
    nah: 'nahum', na: 'nahum', hab: 'habakkuk', zeph: 'zephaniah', zep: 'zephaniah', hag: 'haggai', hg: 'haggai', zech: 'zechariah', zec: 'zechariah', mal: 'malachi',
    mt: 'matthew', matt: 'matthew', mat: 'matthew', mk: 'mark', mrk: 'mark', mar: 'mark', lk: 'luke', luk: 'luke', jn: 'john', jhn: 'john', joh: 'john',
    ac: 'acts', act: 'acts', rom: 'romans', ro: 'romans', rm: 'romans', '1 cor': '1-corinthians', '2 cor': '2-corinthians', '1 co': '1-corinthians', '2 co': '2-corinthians',
    gal: 'galatians', ga: 'galatians', eph: 'ephesians', phil: 'philippians', php: 'philippians', col: 'colossians',
    '1 thess': '1-thessalonians', '2 thess': '2-thessalonians', '1 th': '1-thessalonians', '2 th': '2-thessalonians',
    '1 tim': '1-timothy', '2 tim': '2-timothy', '1 ti': '1-timothy', '2 ti': '2-timothy', tit: 'titus', phlm: 'philemon', philem: 'philemon', phm: 'philemon',
    heb: 'hebrews', jas: 'james', jam: 'james', '1 pet': '1-peter', '2 pet': '2-peter', '1 pe': '1-peter', '2 pe': '2-peter',
    '1 jn': '1-john', '2 jn': '2-john', '3 jn': '3-john', '1 jo': '1-john', '2 jo': '2-john', '3 jo': '3-john', jud: 'jude', rev: 'revelation', re: 'revelation', revelations: 'revelation',
    tob: 'tobit', tb: 'tobit', wis: 'wisdom', 'wisdom of solomon': 'wisdom', sir: 'sirach', ecclus: 'sirach', ecclesiasticus: 'sirach', bar: 'baruch',
    sus: 'susanna', bel: 'bel-and-the-dragon', '1 macc': '1-maccabees', '2 macc': '2-maccabees', '1 mac': '1-maccabees', '2 mac': '2-maccabees',
    '1 esd': '1-esdras', '2 esd': '2-esdras', jdt: 'judit', judith: 'judit', 'prayer of manasseh': 'manassse', 'pr man': 'manassse', manasseh: 'manassse',
    'additions to esther': 'addesth', 'add esth': 'addesth', 'additions to daniel': 'adddan', 'add dan': 'adddan'
  };
  const ORDINAL = { first: '1', second: '2', third: '3', i: '1', ii: '2', iii: '3', '1st': '1', '2nd': '2', '3rd': '3' };
  const cleanRef = s => normalize(s).replace(/[’'.]/g, '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
    .replace(/^(first|second|third|iii|ii|i|1st|2nd|3rd)\s+(?=[a-z])/, (m, w) => ORDINAL[w] + ' ')
    .replace(/^([123])(?=[a-z])/, '$1 ');

  /** books: {canon: {slug: chapters}}. Returns a lookup used by parseReference. */
  function buildBookLookup(books, SJBooks) {
    const map = new Map(); const where = {};
    for (const canon of Object.keys(books || {})) for (const slug of Object.keys(books[canon] || {})) {
      if (!where[slug]) where[slug] = { canon, chapters: Number(books[canon][slug]) || 1 };
      const names = [slug.replace(/-/g, ' ')];
      if (SJBooks) names.push(SJBooks.name(slug), SJBooks.chapterName(slug), SJBooks.shortName(slug));
      for (const n of names) { const k = cleanRef(n); if (k && !map.has(k)) map.set(k, slug); }
    }
    for (const [k, slug] of Object.entries(ABBR)) if (where[slug] && !map.has(k)) map.set(k, slug);
    return { map, where, keys: [...map.keys()].sort((a, b) => b.length - a.length) };
  }

  /** "John 3:16" → {canon, slug, book, chapter, verse, verseEnd, label}; null when it isn't a real reference. */
  function parseReference(query, lookup, SJBooks) {
    if (!lookup) return null;
    const q = cleanRef(query);
    const m = /^(.+?)\s*(\d{1,3})(?:\s*[:.v]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?)?$/.exec(q);
    const bookOnly = !m;
    const bookKey = bookOnly ? q : m[1].trim();
    const slug = lookup.map.get(bookKey);
    if (!slug) return null;
    const info = lookup.where[slug];
    const chapter = bookOnly ? null : Number(m[2]);
    if (chapter !== null && (chapter < 1 || chapter > info.chapters)) return null;
    const verse = !bookOnly && m[3] ? Number(m[3]) : null;
    const verseEnd = verse && m[4] && Number(m[4]) > verse ? Number(m[4]) : null;
    if (verse === 0) return null;
    const book = SJBooks ? (chapter ? SJBooks.chapterName(slug) : SJBooks.name(slug)) : slug;
    const label = chapter ? `${book} ${chapter}${verse ? ':' + verse + (verseEnd ? '–' + verseEnd : '') : ''}` : book;
    return { canon: info.canon, canonLabel: CANON_LABEL[info.canon], slug, book, chapter, verse, verseEnd, chapters: info.chapters, label };
  }

  // ---------------------------------------------------------------- Scripture text search
  const CANON_ORDER = { tanakh: 0, newtestament: 1, apocrypha: 2 };
  const normText = s => normalize(s).replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  /** entries: scripture-search-index entries; returns matches ranked phrase-first, then canon and book order. */
  function searchScripture(entries, query, opts) {
    const o = opts || {};
    const terms = tokenize(query);
    const phrases = terms.filter(t => t.startsWith('"')).map(t => normText(stripQuotes(t))).filter(Boolean);
    const excludes = terms.filter(t => t.startsWith('-')).map(t => normText(stripQuotes(t.slice(1)))).filter(Boolean);
    const words = positiveTerms(terms.filter(t => !t.startsWith('"') && !t.startsWith('-'))).map(normText).filter(Boolean);
    const whole = normText(terms.filter(t => !t.startsWith('-')).map(stripQuotes).join(' '));
    if (!words.length && !phrases.length) return [];
    const wordRes = words.map(w => new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    const order = o.bookOrder || {};
    const out = [];
    for (const e of entries) {
      if (o.canon && e.canon !== o.canon) continue;
      const t = e.normalizedText || normText(e.text);
      if (!wordRes.every(r => r.test(t))) continue;
      if (!phrases.every(p => t.includes(p))) continue;
      if (excludes.some(x => t.includes(x))) continue;
      out.push({ e, s: (whole && t.includes(whole) ? 2 : 0) + (phrases.length ? 1 : 0) });
    }
    out.sort((a, b) => (b.s - a.s) || (CANON_ORDER[a.e.canon] - CANON_ORDER[b.e.canon]) ||
      ((order[a.e.canon + ':' + a.e.slug] ?? 999) - (order[b.e.canon + ':' + b.e.slug] ?? 999)) ||
      (a.e.chapter - b.e.chapter) || (a.e.verse - b.e.verse));
    return out.map(x => x.e);
  }

  const api = { tokenize, positiveTerms, score, rank, normalize, buildBookLookup, parseReference, searchScripture, cleanRef };
  root.SJSearch = api;
  if (typeof document === 'undefined' || !document.getElementById || !document.getElementById('sj-search')) return;

  // ================================================================ page
  const $ = id => document.getElementById(id);
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== '') n.append(c);
    return n;
  }
  // Text with the search words wrapped in <mark> (built as nodes, never HTML).
  function highlight(text, words) {
    const src = String(text || '');
    const ws = (words || []).filter(w => w && w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!ws.length) return [document.createTextNode(src)];
    // split() with one capture group puts the matches at odd indices.
    return src.split(new RegExp(`(${ws.join('|')})`, 'i')).map((part, i) => (i % 2 ? el('mark', { text: part }) : document.createTextNode(part))).filter(n => n.textContent);
  }
  const safeUrl = u => (/^\/(?!\/)[^\s]*$/.test(u || '') ? u : '#');
  const safeImg = u => (/^\/images\/[\w./-]+$/.test(u || '') ? u : '');
  const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); if (!m) return ''; const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)); return t.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }); };

  const TYPES = [
    ['', 'All'], ['Article', 'Articles'], ['Scripture', 'Scripture'], ['Ology', 'Ologies'], ['Encyclopedia', 'Encyclopedia'],
    ['Study Guide', 'Study Guides'], ['Resource', 'Research Resources'], ['Page', 'Pages']
  ];
  const TYPE_LABEL = { Article: 'Article', Ology: 'Ology', Encyclopedia: 'Encyclopedia', 'Study Guide': 'Study Guide', Resource: 'Research Resource', Page: 'Page', Region: 'Region' };
  const SCRIPTURE_PAGE = 25;

  const state = { all: [], query: '', type: '', sort: '', page: 1, perPage: 20, types: new Set(), tags: new Set(), from: '', to: '', canon: '', scripture: null, scriptureLoading: null, lookup: null, bookOrder: {}, verseShown: 0 };
  const input = $('q'), form = $('sj-search'), filters = $('sr-filters'), results = $('sr-results'), meta = $('sr-meta'), pager = $('sr-pager');
  const sortEl = $('sr-sort'), refBox = $('sr-ref'), scriptBox = $('sr-scripture'), empty = $('sr-empty'), status = $('sr-status'), canonBox = $('sr-canon');
  const tagBox = $('sr-tags'), fromEl = $('sr-from'), toEl = $('sr-to'), clearBtn = $('sr-clear');

  function readURL() {
    const p = new URLSearchParams(location.search);
    state.query = p.get('q') || '';
    state.type = TYPES.some(([v]) => v === (p.get('type') || '')) || p.get('type') === 'Region' ? (p.get('type') || '') : '';
    const s = p.get('sort') || ''; state.sort = ['newest', 'relevance', 'az'].includes(s) ? s : '';
    state.perPage = Math.min(100, Math.max(5, parseInt(p.get('pp') || '20', 10) || 20));
    state.page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1);
    state.from = p.get('from') || ''; state.to = p.get('to') || '';
    state.tags = new Set((p.get('tags') || '').split(',').filter(Boolean).map(normalize));
    state.types = new Set((p.get('types') || '').split(',').filter(Boolean));
    state.canon = ['tanakh', 'newtestament', 'apocrypha'].includes(p.get('canon')) ? p.get('canon') : '';
    input.value = state.query; fromEl.value = state.from; toEl.value = state.to;
  }
  function syncURL() {
    const p = new URLSearchParams();
    if (state.query) p.set('q', state.query);
    if (state.type) p.set('type', state.type);
    if (state.sort) p.set('sort', state.sort);
    if (state.page > 1) p.set('page', String(state.page));
    if (state.perPage !== 20) p.set('pp', String(state.perPage));
    if (state.types.size) p.set('types', [...state.types].join(','));
    if (state.tags.size) p.set('tags', [...state.tags].join(','));
    if (state.from) p.set('from', state.from);
    if (state.to) p.set('to', state.to);
    if (state.canon && state.type === 'Scripture') p.set('canon', state.canon);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  const getJSON = (u, opts) => fetch(u, opts).then(r => { if (!r.ok) throw new Error(u); return r.json(); });

  // ---------- filters
  function renderFilters() {
    const counts = new Map(); for (const d of state.all) counts.set(d.type, (counts.get(d.type) || 0) + 1);
    filters.replaceChildren(...TYPES.filter(([v]) => !v || v === 'Scripture' || counts.get(v)).map(([v, label]) => {
      const n = v === '' ? state.all.length : v === 'Scripture' ? null : counts.get(v);
      const b = el('button', { type: 'button', class: 'sr-filter', 'data-type': v, 'aria-pressed': String(state.type === v) },
        label, n != null ? el('span', { class: 'sr-count', text: String(n), 'aria-hidden': 'true' }) : '');
      if (n != null) b.setAttribute('aria-label', `${label} (${n})`);
      return b;
    }));
    const tagCounts = new Map(); for (const d of state.all) for (const t of d.tags || []) { const k = normalize(t); tagCounts.set(k, (tagCounts.get(k) || 0) + 1); }
    tagBox.replaceChildren(...[...tagCounts.entries()].filter(([, c]) => c > 1).sort((a, b) => a[0].localeCompare(b[0])).map(([t, c]) =>
      el('label', { class: 'sr-tag' }, el('input', { type: 'checkbox', value: t, checked: state.tags.has(t) }), el('span', { text: `${t} (${c})` }))));
  }

  // ---------- reference card (Genesis 1:1, John 3:16 …)
  async function renderReference() {
    const ref = parseReference(state.query, state.lookup, root.SJBooks);
    refBox.replaceChildren(); refBox.hidden = !ref;
    if (!ref) return null;
    const href = ref.chapter ? root.SJBooks.chapterHref(ref.canon, ref.slug, ref.chapter, ref.verse || '') : root.SJBooks.landingHref(ref.canon, ref.slug);
    const body = el('div', { class: 'sr-ref-body' });
    const card = el('article', { class: 'sr-ref', 'aria-label': `Scripture reference ${ref.label}` },
      el('p', { class: 'sr-kicker', text: `Bible reference · ${ref.canonLabel}` }),
      el('h2', { class: 'sr-ref-title' }, el('a', { href, class: 'sr-link', text: ref.label })), body,
      el('p', { class: 'sr-ref-actions' },
        el('a', { class: 'sr-btn', href, text: ref.chapter ? (ref.verse ? 'Read in context' : `Read ${ref.label}`) : `Open ${ref.book}` }),
        ref.chapter ? el('a', { class: 'sr-btn is-quiet', href: root.SJBooks.landingHref(ref.canon, ref.slug), text: `About ${root.SJBooks.name(ref.slug)}` }) : ''));
    refBox.append(card);
    if (ref.chapter && ref.verse) {
      try {
        const data = await getJSON(`/data/${ref.canon}/${encodeURIComponent(ref.slug)}/${ref.chapter}.json`);
        const end = ref.verseEnd || ref.verse;
        const vs = (data.verses || []).filter(v => v.v >= ref.verse && v.v <= Math.min(end, ref.verse + 9));
        if (vs.length) body.append(el('blockquote', { class: 'sr-verse' }, ...vs.map(v => el('p', null, el('sup', { text: String(v.v) }), ' ', v.t))));
        else body.append(el('p', { class: 'sr-note', text: `${ref.book} ${ref.chapter} has ${(data.verses || []).length} verses in this edition.` }));
      } catch (e) { /* the link still works without the preview */ }
    }
    return ref;
  }

  // ---------- Scripture text results (index loads on demand)
  function loadScripture() {
    if (state.scripture) return Promise.resolve(state.scripture);
    if (!state.scriptureLoading) {
      state.scriptureLoading = getJSON('/data/scripture-search-index.json').then(d => (state.scripture = Array.isArray(d.entries) ? d.entries : []))
        .catch(e => { state.scriptureLoading = null; throw e; });
    }
    return state.scriptureLoading;
  }
  function verseRow(e, words) {
    const ref = `${root.SJBooks.chapterName(e.slug)} ${e.chapter}:${e.verse}`;
    const href = root.SJBooks.chapterHref(e.canon, e.slug, e.chapter, e.verse);
    return el('li', { class: 'sr-verse-row' },
      el('a', { class: 'sr-link sr-verse-ref', href, text: ref }),
      el('span', { class: 'sr-verse-canon', text: CANON_LABEL[e.canon] || '' }),
      el('p', { class: 'sr-verse-text' }, ...highlight(e.text, words)));
  }
  async function renderScripture(wantResults) {
    scriptBox.replaceChildren();
    const words = state.query ? positiveTerms(tokenize(state.query)).map(stripQuotes) : [];
    if (!words.length) { scriptBox.hidden = state.type !== 'Scripture'; if (state.type === 'Scripture') scriptBox.append(el('p', { class: 'sr-hint', text: 'Type a word, a phrase in quotes, or a reference such as Isaiah 43:1.' })); return; }
    scriptBox.hidden = false;
    if (!wantResults) {
      // "All" view: offer Scripture search without downloading the verse index up front.
      scriptBox.append(el('div', { class: 'sr-scripture-offer' },
        el('div', null, el('p', { class: 'sr-kicker', text: 'Scripture' }), el('p', { class: 'sr-offer-text' }, 'Search the text of the Tanakh, New Testament and Apocrypha for ', el('strong', { text: `“${state.query}”` }), '.')),
        el('button', { type: 'button', class: 'sr-btn', 'data-action': 'scripture', text: 'Search Scripture' })));
      return;
    }
    const loading = el('p', { class: 'sr-hint', role: 'status', text: 'Loading 36,720 verses…' });
    scriptBox.append(loading);
    let entries;
    try { entries = await loadScripture(); } catch (e) { loading.textContent = 'Scripture search is unavailable right now. Please try again.'; return; }
    const hits = searchScripture(entries, state.query, { canon: state.canon, bookOrder: state.bookOrder });
    const shown = Math.min(hits.length, state.verseShown || SCRIPTURE_PAGE);
    const canonCounts = { '': 0, tanakh: 0, newtestament: 0, apocrypha: 0 };
    if (!state.canon) for (const h of hits) { canonCounts[h.canon]++; canonCounts['']++; }
    const head = el('div', { class: 'sr-scripture-head' },
      el('h2', { class: 'sr-section-title', tabindex: '-1', text: hits.length ? `${hits.length.toLocaleString()} verse${hits.length === 1 ? '' : 's'}` : 'No verses found' }));
    const list = el('ol', { class: 'sr-verse-list' }, ...hits.slice(0, shown).map(e => verseRow(e, words)));
    scriptBox.replaceChildren(head, hits.length ? list : el('p', { class: 'sr-hint', text: 'No verse contains every word. Try fewer words, or check the spelling (the text is KJV English).' }));
    if (shown < hits.length) scriptBox.append(el('button', { type: 'button', class: 'sr-btn is-quiet sr-more', 'data-action': 'more-verses', text: `Show more verses (${(hits.length - shown).toLocaleString()} more)` }));
    status.textContent = `${hits.length} verses found for ${state.query}.`;
  }

  // ---------- site results
  function card(d, words) {
    const img = safeImg(d.image);
    const metaBits = [fmtDate(d.date), ...(d.tags || []).filter(t => t !== 'articles').slice(0, 3)].filter(Boolean);
    return el('li', { class: 'sr-result' },
      el('article', { class: `sr-card${img ? ' has-img' : ''}` },
        el('div', { class: 'sr-card-body' },
          el('p', { class: 'sr-type', text: TYPE_LABEL[d.type] || d.type }),
          el('h3', { class: 'sr-title' }, el('a', { class: 'sr-link', href: safeUrl(d.url) }, ...highlight(d.title, words))),
          d.excerpt ? el('p', { class: 'sr-excerpt' }, ...highlight(d.excerpt, words)) : '',
          metaBits.length ? el('p', { class: 'sr-meta-line', text: metaBits.join(' · ') }) : ''),
        img ? el('img', { class: 'sr-thumb', src: img, alt: '', loading: 'lazy', width: '160', height: '90' }) : ''));
  }
  function renderPager(total) {
    pager.replaceChildren();
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    if (pages <= 1) return;
    const btn = (label, page, current, aria) => el('button', { type: 'button', class: 'sr-page', 'data-page': String(page), 'aria-current': current ? 'page' : null, 'aria-label': aria || `Page ${page}`, text: label });
    if (state.page > 1) pager.append(btn('Previous', state.page - 1, false, 'Previous page'));
    const nums = new Set([1, pages, state.page - 1, state.page, state.page + 1].filter(p => p >= 1 && p <= pages));
    let last = 0;
    for (const p of [...nums].sort((a, b) => a - b)) { if (p - last > 1) pager.append(el('span', { class: 'sr-gap', text: '…', 'aria-hidden': 'true' })); pager.append(btn(String(p), p, p === state.page)); last = p; }
    if (state.page < pages) pager.append(btn('Next', state.page + 1, false, 'Next page'));
  }

  async function run(opts) {
    const o = opts || {};
    for (const b of filters.querySelectorAll('.sr-filter')) b.setAttribute('aria-pressed', String((b.dataset.type || '') === state.type));
    const scriptureMode = state.type === 'Scripture';
    document.body.classList.toggle('sr-mode-scripture', scriptureMode);
    canonBox.hidden = !scriptureMode;
    for (const b of canonBox.querySelectorAll('button')) b.setAttribute('aria-pressed', String((b.dataset.canon || '') === state.canon));
    const ref = await renderReference();

    if (scriptureMode) {
      results.replaceChildren(); pager.replaceChildren(); meta.textContent = ''; empty.hidden = true;
      if (!o.keepVerses) state.verseShown = SCRIPTURE_PAGE;
      await renderScripture(true);
      return;
    }
    const r = rank(state.all, { query: state.query, type: state.type, types: state.types, tags: state.tags, from: state.from, to: state.to, sort: state.sort });
    sortEl.value = r.sort;
    const total = r.items.length;
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    if (state.page > pages) state.page = pages;
    const chunk = r.items.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    results.replaceChildren(...chunk.map(d => card(d, r.terms)));
    meta.textContent = total ? `${total} result${total === 1 ? '' : 's'}${state.query ? ` for “${state.query}”` : ''}` : '';
    status.textContent = state.query ? `${total} result${total === 1 ? '' : 's'} for ${state.query}.` : '';
    empty.hidden = total > 0 || !!ref;
    renderPager(total);
    await renderScripture(false);
  }

  function update(changes, opts) { Object.assign(state, changes); syncURL(); return run(opts); }

  // ---------- events
  form.addEventListener('submit', e => { e.preventDefault(); update({ query: input.value.trim(), page: 1 }); });
  filters.addEventListener('click', e => { const b = e.target.closest('.sr-filter'); if (b) update({ type: b.dataset.type || '', page: 1 }); });
  canonBox.addEventListener('click', e => { const b = e.target.closest('button'); if (b) update({ canon: b.dataset.canon || '' }); });
  sortEl.addEventListener('change', () => update({ sort: sortEl.value, page: 1 }));
  pager.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (!b) return; update({ page: Number(b.dataset.page) }).then(() => { $('sr-meta').scrollIntoView({ block: 'start' }); const f = results.querySelector('.sr-link'); if (f) f.focus({ preventScroll: true }); }); });
  scriptBox.addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    if (b.dataset.action === 'scripture') { update({ type: 'Scripture', page: 1 }).then(() => { const f = scriptBox.querySelector('.sr-link') || scriptBox.querySelector('.sr-section-title'); if (f) f.focus(); }); }
    if (b.dataset.action === 'more-verses') { const at = state.verseShown; state.verseShown += SCRIPTURE_PAGE * 2; run({ keepVerses: true }).then(() => { const links = scriptBox.querySelectorAll('.sr-link'); if (links[at]) links[at].focus(); }); }
  });
  tagBox.addEventListener('change', e => { const v = normalize(e.target.value); const tags = new Set(state.tags); e.target.checked ? tags.add(v) : tags.delete(v); update({ tags, page: 1 }); });
  fromEl.addEventListener('change', () => update({ from: fromEl.value, page: 1 }));
  toEl.addEventListener('change', () => update({ to: toEl.value, page: 1 }));
  clearBtn.addEventListener('click', () => {
    input.value = ''; fromEl.value = ''; toEl.value = '';
    for (const c of tagBox.querySelectorAll('input')) c.checked = false;
    update({ query: '', type: '', sort: '', page: 1, from: '', to: '', tags: new Set(), types: new Set(), canon: '' }); input.focus();
  });
  for (const chip of document.querySelectorAll('[data-query]')) chip.addEventListener('click', () => { input.value = chip.dataset.query; update({ query: chip.dataset.query, page: 1 }); });

  // Keyboard: "/" focuses search; ↓ from the box enters the results; ↑/↓ move between result links; Esc returns to the box.
  document.addEventListener('keydown', e => {
    const t = e.target, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
    if (e.key === '/' && !typing) { e.preventDefault(); input.focus(); input.select(); return; }
    const links = [...document.querySelectorAll('#sr-ref .sr-link, #sr-results .sr-link, #sr-scripture .sr-link')];
    if (!links.length) return;
    if (t === input && e.key === 'ArrowDown') { e.preventDefault(); links[0].focus(); return; }
    const i = links.indexOf(t);
    if (i < 0) return;
    if (e.key === 'ArrowDown' && links[i + 1]) { e.preventDefault(); links[i + 1].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (links[i - 1] || input).focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); input.focus(); }
  });

  // ---------- boot
  readURL();
  Promise.all([
    getJSON('/search-index.json', { cache: 'no-cache' }).catch(() => []),
    Promise.all(['tanakh', 'newtestament', 'apocrypha'].map(c => getJSON(`/data/${c}/books.json`).catch(() => ({})))),
  ]).then(([index, [t, n, a]]) => {
    state.all = (Array.isArray(index) ? index : []).map(d => ({ type: d.type || 'Page', title: d.title || '', url: d.url || '#', image: d.image || '', date: d.date || '', excerpt: d.excerpt || '', tags: d.tags || [] }));
    const loadedUrls = new Set();
    state.all = state.all.filter(d => d.url === '#' || (!loadedUrls.has(d.url) && loadedUrls.add(d.url)));
    const books = { tanakh: t, newtestament: n, apocrypha: a };
    if (root.SJBooks) {
      state.lookup = buildBookLookup(books, root.SJBooks);
      for (const c of Object.keys(books)) root.SJBooks.ordered(c, books[c]).forEach((b, i) => { state.bookOrder[c + ':' + b.slug] = i; });
    }
    renderFilters();
    if (!state.all.length) { empty.hidden = false; empty.querySelector('p').textContent = 'Search is unavailable right now. Please try again shortly.'; }
    return run();
  });
})(typeof window !== 'undefined' ? window : globalThis);
