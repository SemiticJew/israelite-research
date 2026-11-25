// Regression tests for the site search (js/research-search.js), run against the real search-index.json
// and the real Scripture data. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const html = read('search.html');
const index = JSON.parse(read('search-index.json'));
const books = { tanakh: JSON.parse(read('data/tanakh/books.json')), newtestament: JSON.parse(read('data/newtestament/books.json')), apocrypha: JSON.parse(read('data/apocrypha/books.json')) };

// Load the reader's book catalogue and the search script into a sandbox (no DOM, so the page part stays idle).
const ctx = vm.createContext({ console, URLSearchParams, Date });
ctx.window = ctx;
vm.runInContext(read('js/reader-books.js'), ctx);
vm.runInContext(read('js/research-search.js'), ctx);
const S = ctx.SJSearch, B = ctx.SJBooks;
assert.ok(S && B, 'SJSearch / SJBooks not exposed');
const lookup = S.buildBookLookup(books, B);
const plain = v => JSON.parse(JSON.stringify(v));

function boot() {
  let last = { sort: '' };
  return {
    search(q, sort = '', extra = {}) { last = S.rank(index, Object.assign({ query: q, sort }, extra)); return last.items; },
    run: code => vm.runInContext(code.replace(/\btokenize\(/g, 'SJSearch.tokenize('), ctx),
    sortValue: () => last.sort,
  };
}

test('tokenizer keeps whole words, phrases and exclusions (old regex split "moses" into "mo","e")', () => {
  const s = boot();
  assert.deepEqual(JSON.parse(JSON.stringify(s.run('tokenize("Moses law")'))), ['moses', 'law']);
  assert.deepEqual(JSON.parse(JSON.stringify(s.run('tokenize(\'"three laws" -fallacy\')'))), ['"three laws"', '-fallacy']);
  assert.deepEqual(JSON.parse(JSON.stringify(s.run('tokenize("“law of logic”")'))), ['"law of logic"']);
  assert.deepEqual(JSON.parse(JSON.stringify(s.run('tokenize("-\\"lost cause\\" sins")'))), ['-"lost cause"', 'sins']);
});

test('nonsense queries return no results', () => {
  const s = boot();
  for (const q of ['xqzvbt', 'flurbgastic zzkq', 'qwrtpsdf', '"zzq vvx"', 'the xqzvbt']) {
    assert.equal(s.search(q).length, 0, `expected no results for "${q}"`);
  }
});

test('real queries return relevant results, best match first, nothing irrelevant', () => {
  const s = boot();
  const cases = {
    'three laws of logic': '/articles/three-laws-of-logic.html',
    'halloween': '/articles/halloween-is-not-harmless-tradition.html',
    'pharmakeia': '/articles/pharmakeia-how-nations-are-deceived.html',
    'lost cause': '/articles/manufacturing-innocence.html',
    'Adam pale': '/articles/adam-was-not-pale.html',
  };
  for (const [q, url] of Object.entries(cases)) {
    const r = s.search(q);
    assert.ok(r.length > 0 && r.length < index.length, `"${q}" should narrow results (got ${r.length})`);
    assert.equal(r[0].url, url, `"${q}" top result`);
    assert.ok(r.every(d => d._score > 0), `"${q}" contains zero-score results`);
  }
});

test('filler words alone still search literally (not browse-all), and never pad other queries', () => {
  const s = boot();
  const r = s.search('the');
  assert.equal(s.sortValue(), 'relevance');
  assert.ok(r.every(d => d._score > 0));
  assert.deepEqual(Array.from(s.search('the halloween'), d => d.url), Array.from(s.search('halloween'), d => d.url));
});

test('typo tolerance still works for longer words', () => {
  const s = boot();
  assert.equal(s.search('halloweem')[0]?.url, '/articles/halloween-is-not-harmless-tradition.html');
});

test('exact phrases and exclusions', () => {
  const s = boot();
  const phrase = s.search('"three laws"');
  assert.equal(phrase[0].url, '/articles/three-laws-of-logic.html');
  const withEx = s.search('logic -three');
  assert.ok(withEx.length > 0);
  assert.ok(!withEx.some(d => d.url === '/articles/three-laws-of-logic.html'));
  // A query of only exclusions still browses everything else.
  assert.equal(s.search('-xqzvbt').length, index.length);
});

test('relevance is the default sort for searches; explicit ?sort= is still honoured', () => {
  const s = boot();
  const r = s.search('logic');
  assert.equal(s.sortValue(), 'relevance');
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1]._score >= r[i]._score, 'not sorted by score');
  const newest = s.search('logic', 'newest');
  assert.equal(s.sortValue(), 'newest');
  assert.equal(newest.length, r.length, 'sort must not change which results match');
  for (let i = 1; i < newest.length; i++) assert.ok((Date.parse(newest[i - 1].date) || 0) >= (Date.parse(newest[i].date) || 0));
  const az = s.search('logic', 'az');
  const titles = Array.from(az, d => d.title);
  assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b)));
});

test('empty query browses everything, newest first (unchanged behaviour)', () => {
  const s = boot();
  const r = s.search('');
  assert.equal(r.length, index.length);
  assert.equal(s.sortValue(), 'newest');
});

test('the page loads the search script and keeps the URL parameters people already share', () => {
  assert.ok(html.includes('<script src="/js/research-search.js"></script>') && html.includes('<script src="/js/reader-books.js"></script>'));
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(read('js/research-search.js')), 'results are built with DOM APIs');
  const js = read('js/research-search.js');
  for (const p of ['q', 'type', 'sort', 'page', 'pp', 'types', 'tags', 'from', 'to']) assert.ok(js.includes(`p.get('${p}')`) && js.includes(`p.set('${p}'`), `?${p}= is read and written`);
  assert.ok(html.includes('id="q"') && html.includes('name="q"'), 'the header search can still send ?q=');
});

test('filters cover the content that is actually indexed', () => {
  const types = new Set(index.map(d => d.type));
  for (const t of ['Article', 'Ology', 'Encyclopedia', 'Study Guide', 'Resource']) assert.ok(types.has(t), `index has ${t}`);
  const s = boot();
  const ency = s.search('', '', { type: 'Encyclopedia' });
  assert.ok(ency.length > 100 && ency.every(d => d.type === 'Encyclopedia'));
  assert.ok(s.search('christology', '', { type: 'Ology' })[0].url === '/ologies/christology.html');
  assert.equal(s.search('kushites')[0].type, 'Encyclopedia');
  assert.equal(s.search('genesis 1 study guide', '', { type: 'Study Guide' })[0].url, '/study-guides/genesis-1.html');
  assert.equal(s.search('dietary laws')[0].url, '/dietary-laws.html');
  // legacy ?type=Article still narrows exactly as before
  assert.ok(s.search('logic', '', { type: 'Article' }).every(d => d.type === 'Article'));
});

test('Bible references are recognised in common forms and validated against the chapter counts', () => {
  const ref = q => { const r = S.parseReference(q, lookup, B); return r && plain({ slug: r.slug, canon: r.canon, ch: r.chapter, v: r.verse, end: r.verseEnd, label: r.label }); };
  assert.deepEqual(ref('Genesis 1:1'), { slug: 'genesis', canon: 'tanakh', ch: 1, v: 1, end: null, label: 'Genesis 1:1' });
  assert.deepEqual(ref('John 3:16'), { slug: 'john', canon: 'newtestament', ch: 3, v: 16, end: null, label: 'John 3:16' });
  assert.equal(ref('jn 3:16').slug, 'john');
  assert.equal(ref('1 John 4:8').slug, '1-john');
  assert.equal(ref('1john 4:8').slug, '1-john');
  assert.equal(ref('I Corinthians 13').slug, '1-corinthians');
  assert.equal(ref('first kings 18').slug, '1-kings');
  assert.deepEqual([ref('Ps 23').slug, ref('Psalms 23').label, ref('psalm 119:105').label], ['psalm', 'Psalm 23', 'Psalm 119:105']);
  assert.equal(ref('Rom. 8:28-30').label, 'Romans 8:28–30');
  assert.equal(ref('Song of Songs 1').slug, 'song-of-solomon');
  assert.deepEqual([ref('Tobit 1:1').canon, ref('1 Macc 1').slug, ref('Sirach 1:1').canon], ['apocrypha', '1-maccabees', 'apocrypha']);
  assert.equal(ref('Deuteronomy 28').label, 'Deuteronomy 28');
  assert.equal(ref('Genesis').ch, null, 'book name alone opens the book');
  assert.equal(ref('Genesis 51'), null, 'Genesis has 50 chapters');
  assert.equal(ref('Jude 2'), null, 'Jude has one chapter');
  for (const q of ['logic', 'three laws of logic', 'adam was not pale', 'john smith', 'acts of the apostles 2', 'the 12']) assert.equal(ref(q), null, q);
  const r = S.parseReference('John 3:16', lookup, B);
  assert.equal(B.chapterHref(r.canon, r.slug, r.chapter, r.verse), '/newtestament/chapter.html?book=john&ch=3#v16');
});

test('Scripture search finds verses across all three collections, phrase matches first, in canon order', () => {
  const entries = JSON.parse(read('data/scripture-search-index.json')).entries;
  const order = {}; for (const c of Object.keys(books)) B.ordered(c, books[c]).forEach((b, i) => { order[c + ':' + b.slug] = i; });
  const find = (q, canon = '') => S.searchScripture(entries, q, { canon, bookOrder: order });
  const love = find('"God so loved the world"');
  assert.equal(love.length, 1); assert.deepEqual([love[0].slug, love[0].chapter, love[0].verse], ['john', 3, 16]);
  const beginning = find('in the beginning');
  assert.deepEqual([beginning[0].slug, beginning[0].chapter, beginning[0].verse], ['genesis', 1, 1], 'phrase match ranks first, Genesis before John');
  const swine = find('swine');
  assert.ok(new Set(swine.map(e => e.canon)).size === 3, 'swine appears in Tanakh, NT and Apocrypha');
  assert.ok(swine.every((e, i) => !i || ['tanakh', 'newtestament', 'apocrypha'].indexOf(swine[i - 1].canon) <= ['tanakh', 'newtestament', 'apocrypha'].indexOf(e.canon)));
  assert.ok(find('swine', 'apocrypha').every(e => e.canon === 'apocrypha') && find('swine', 'apocrypha').length > 0);
  assert.ok(find('maccabeus').length > 0, 'Apocrypha text is searchable');
  assert.equal(find('xqzvbt').length, 0);
  assert.equal(find('the').length > 0, true, 'filler-only queries still search literally');
  const ex = find('swine -devils');
  assert.ok(ex.length > 0 && ex.every(e => !/devils/i.test(e.text)));
  // Whole-word prefix matching: "law" must not match "outlaw".
  assert.ok(find('law').every(e => /(^|\s)law/.test(e.normalizedText)));
});

test('the large Scripture index loads only when Scripture is searched', () => {
  const js = read('js/research-search.js');
  const loads = js.match(/getJSON\('\/data\/scripture-search-index\.json'\)/g) || [];
  assert.equal(loads.length, 1);
  const fn = js.slice(js.indexOf('function loadScripture'), js.indexOf('function verseRow'));
  assert.ok(fn.includes('scripture-search-index'), 'only loadScripture() fetches the index');
  const renderS = js.slice(js.indexOf('async function renderScripture'), js.indexOf('// ---------- site results'));
  assert.ok(renderS.indexOf('if (!wantResults)') < renderS.indexOf('loadScripture()'), 'the All view offers Scripture search without downloading the index');
});

test('repeated encyclopedia ids stay in the source but give one search result per destination', () => {
  const src = JSON.parse(read('data/encyclopedia.json'));
  const dupIds = [...new Set(src.map(e => e.id).filter((id, i, a) => a.indexOf(id) !== i))];
  assert.ok(dupIds.length > 0, 'source duplicates are preserved (not edited away)');
  const urls = index.map(d => d.url);
  assert.equal(new Set(urls).size, urls.length, 'search-index.json has no repeated URLs');
  assert.equal(index.filter(d => d.url.startsWith('/encyclopedia.html#')).length, new Set(src.map(e => e.id)).size, 'one record per encyclopedia id');
  const egypt = index.find(d => d.url === '/encyclopedia.html#egyptians-mizraim');
  assert.match(egypt.excerpt, /Genesis 10:6/, 'references from the repeated entry are kept in the record');
  for (const q of ['ruddy', 'kushites', 'egyptians']) {
    const hits = boot().search(q).map(d => d.url);
    assert.equal(new Set(hits).size, hits.length, `${q}: no duplicate results`);
  }
  // Even if an index ever repeats a URL, ranking still returns it once.
  const doubled = S.rank([...index, ...index], { query: 'ruddy' }).items.map(d => d.url);
  assert.equal(new Set(doubled).size, doubled.length);
});
