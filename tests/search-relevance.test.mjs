// Regression tests for the inline site-search logic in /search.html, run against the real search-index.json.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('search.html', root), 'utf8');
const index = JSON.parse(readFileSync(new URL('search-index.json', root), 'utf8'));
// Collect inline <script> bodies by scanning tags case-insensitively (no regex HTML parsing):
// handles <SCRIPT>, attributes and "</script >"; scripts with a src attribute are skipped.
function inlineScripts(source){
  const lower = source.toLowerCase();
  const bodies = [];
  let at = 0;
  for(;;){
    const open = lower.indexOf('<script', at);
    if(open < 0) break;
    const openEnd = lower.indexOf('>', open);
    if(openEnd < 0) break;
    const close = lower.indexOf('</script', openEnd);
    if(close < 0) break;
    if(!/\ssrc\s*=/.test(lower.slice(open, openEnd))) bodies.push(source.slice(openEnd + 1, close));
    at = close + 8;
  }
  return bodies;
}
const inline = inlineScripts(html).find(s => s.includes('function tokenize'));
assert.ok(inline, 'search.html inline search script not found');

// Minimal DOM so the page script can boot; fetch never resolves so we drive state by hand.
function boot() {
  const el = () => ({ value: '', hidden: false, innerHTML: '', textContent: '', dataset: {}, addEventListener() {}, setAttribute() {}, appendChild() {} });
  const els = new Map();
  const get = sel => { if (!els.has(sel)) els.set(sel, el()); return els.get(sel); };
  const ctx = vm.createContext({
    document: { querySelector: get, querySelectorAll: () => [], getElementById: id => get('#' + id), addEventListener() {}, createElement: el, activeElement: null },
    location: { search: '', pathname: '/search.html' }, history: { replaceState() {} },
    fetch: () => new Promise(() => {}), URLSearchParams, Date, console,
  });
  vm.runInContext(inline, ctx);
  vm.runInContext(`state.all=${JSON.stringify(index)}.map(d=>({type:d.type||'Page',title:d.title||'',url:d.url||'#',image:d.image||'',date:d.date||'',excerpt:d.excerpt||'',tags:d.tags||[]}));`, ctx);
  return {
    search(q, sort = '') { vm.runInContext(`state.query=${JSON.stringify(q)};state.sort=${JSON.stringify(sort)};apply();`, ctx); return vm.runInContext('state.filtered', ctx); },
    run: code => vm.runInContext(code, ctx),
    sortValue: () => get('#sort').value,
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
