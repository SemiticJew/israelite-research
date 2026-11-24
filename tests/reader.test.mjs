// Regression tests for the reading-first Scripture reader (Batch 1).
// Run: node --test tests/reader.test.mjs   (also part of `npm test`)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const json = p => JSON.parse(read(p));

const ctx = vm.createContext({ window: {} });
vm.runInContext(read('js/reader-books.js'), ctx);
const B0 = ctx.window.SJBooks;
// Copy results into this realm so deepEqual compares plain local arrays.
const B = { ...B0, ordered: (c, n) => Array.from(B0.ordered(c, n), b => ({ ...b })) };
const counts = { tanakh: json('data/tanakh/books.json'), newtestament: json('data/newtestament/books.json'), apocrypha: json('data/apocrypha/books.json') };

test('books are listed in biblical order (not alphabetical) and every data book appears once', () => {
  const t = B.ordered('tanakh', counts.tanakh).map(b => b.slug);
  assert.deepEqual(t.slice(0, 6), ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua']);
  assert.equal(t[38], 'malachi');
  assert.deepEqual(t.slice(39), ['addesth', 'adddan', 'judit', 'manassse'], 'extra Tanakh-data texts kept, after Malachi');
  const nt = B.ordered('newtestament', counts.newtestament).map(b => b.slug);
  assert.deepEqual([nt[0], nt[3], nt[4], nt[5], nt.at(-1)], ['matthew', 'john', 'acts', 'romans', 'revelation']);
  for (const canon of Object.keys(counts)) {
    const slugs = B.ordered(canon, counts[canon]).map(b => b.slug);
    assert.deepEqual([...slugs].sort(), Object.keys(counts[canon]).sort(), `${canon}: same books as books.json`);
  }
});

test('Apocrypha canon mapping is untouched: only the books in apocrypha/books.json are offered', () => {
  assert.deepEqual(B.ordered('apocrypha', counts.apocrypha).map(b => b.slug),
    ['tobit', 'wisdom', 'sirach', 'baruch', 'susanna', 'bel-and-the-dragon', '1-maccabees', '2-maccabees', '1-esdras', '2-esdras']);
});

test('Psalms: aliases, headings, book page and cross-reference folder', () => {
  for (const a of ['ps', 'psa', 'psalms', 'Psalms', 'the-psalms']) assert.equal(B.canonical(a), 'psalm');
  assert.equal(B.name('psalm'), 'Psalms');
  assert.equal(B.chapterName('psalm'), 'Psalm');
  assert.equal(B.landingHref('tanakh', 'psalm'), '/tanakh/psalms.html');
  assert.ok(existsSync(new URL('tanakh/psalms.html', root)), 'Psalms book page exists');
  assert.equal(B.xrefDir('tanakh', 'psalm'), 'psalms');
  assert.ok(existsSync(new URL('data/crossrefs/tanakh/psalms/23.json', root)), 'Psalms cross-references live under psalms/');
  assert.ok(existsSync(new URL('data/tanakh/psalm/23.json', root)), 'Psalms chapters live under psalm/');
});

test('every book link in the reader points at a page that exists', () => {
  for (const canon of Object.keys(counts)) {
    for (const b of B.ordered(canon, counts[canon])) {
      const href = B.landingHref(canon, b.slug);
      assert.ok(existsSync(new URL(href.slice(1), root)), `${canon}/${b.slug} → ${href}`);
    }
  }
});

test('the three reader pages are generated from one template and are current', () => {
  execFileSync('python3', [new URL('tools/build_reader_pages.py', root).pathname, '--check']);
});

test('reader pages keep their URLs, anchors and enhancer scripts; nt-chapter.js is fully replaced', () => {
  for (const canon of ['tanakh', 'newtestament', 'apocrypha']) {
    const html = read(`${canon}/chapter.html`);
    assert.match(html, /id="verses"/);
    assert.match(html, /<nav class="breadcrumbs[^"]*" aria-label="Breadcrumb"/, 'breadcrumb schema still finds the breadcrumbs');
    for (const s of ['reader-books', 'reader-core', 'canon-strongs', 'xref-hover', 'theme-toggle', 'include', 'app-reading-history', 'reader-progress',
      'reader-preferences', 'reader-chapter-search', 'reader-share-tools', 'reader-shortcuts', 'app-data-schema', 'reader-offline-chapter',
      'reader-verse-jump', 'app-bookmarks', 'app-highlights', 'reader-deep-link']) {
      assert.ok(html.includes(`src="/js/${s}.js"`), `${canon}: loads ${s}.js`);
    }
    assert.ok(!html.includes('nt-chapter.js'), `${canon}: nt-chapter.js replaced by reader-core.js`);
    assert.ok(html.indexOf('reader-core.js') < html.indexOf('app-reading-history.js'), 'core sets the title before history/bookmarks read it');
  }
});

test('reader-core covers every capability nt-chapter.js had', () => {
  const core = read('js/reader-core.js');
  const features = {
    'chapter data path': '/data/${canon}/${book}/${chapter}.json',
    'books manifest': '/data/${canon}/books.json',
    'cross-reference path (with Psalms folder fix)': '/data/crossrefs/${canon}/${B.xrefDir(canon, book)}/${chapter}.json',
    'Easton dictionary lookup': '/data/dictionaries/easton_dictionary.json',
    'legacy per-chapter notes key': 'notes:${canon}/${book}/${chapter}',
    'verse anchors': "span.id = `v${n}`",
    'data-verse attribute': 'span.dataset.verse = n',
    'copy verse': 'navigator.clipboard.writeText',
    'Strong\'s word study': 'S.renderOrderedRows',
    'word-order alignment': 'S.orderedTerms',
    'breadcrumbs': 'readerBreadcrumbs',
    '#vN scroll': "goToVerse(location.hash.slice(2)",
    'prev/next chapter': 'btnPrev'
  };
  for (const [name, needle] of Object.entries(features)) assert.ok(core.includes(needle), `missing: ${name}`);
  assert.ok(!/await\s+loadStrongLexicons|strongs-hebrew\.json|strongs-greek\.json/.test(core), 'lexicon is never fetched up front by the core');
});

test('storage keys written by the reader are the existing ones (no new keys)', () => {
  const core = read('js/reader-core.js');
  const keys = [...core.matchAll(/'(sj_[a-z_]+_v\d)'/g)].map(m => m[1]);
  const known = new Set(Object.values(JSON.parse(JSON.stringify(
    (() => { const c = vm.createContext({ window: {}, localStorage: { getItem: () => null } }); vm.runInContext(read('js/app-data-schema.js'), c); return c.window.SemJDataSchema.keys; })()
  ))));
  for (const k of new Set(keys)) assert.ok(known.has(k), `${k} is a known app data key`);
});
