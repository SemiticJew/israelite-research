// Unified redesign: organization layouts (css/org.css) and research-library layouts (css/library.css).
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const OLOGIES = ['bibliology', 'elology', 'christology', 'pneumatology', 'anthropology', 'hamartiology', 'soteriology', 'israelology', 'ecclesiology', 'eschatology'];
const LIB = {
  'search.html': 'lb-search', 'ologies.html': 'lb-ologies', 'encyclopedia.html': 'lb-ency', 'study-guides.html': 'lb-guides',
  'biblical_references.html': 'lb-refs', 'dietary-laws.html': 'lb-dietary', 'israelite-catechism.html': 'lb-catechism',
  'bible-summaries.html': 'lb-summaries', 'extra-biblical-sources.html': 'lb-extra', 'black-history-biblical-identity.html': 'lb-identity',
  ...Object.fromEntries(OLOGIES.map(o => [`ologies/${o}.html`, 'lb-ology'])),
};

function selectors(css) {
  // the selector is the text before each rule's own "{" (also inside @media blocks)
  return css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(r => { const p = r.split('{'); return p.length > 1 ? p[p.length - 2].trim() : ''; })
    .filter(s => s && !s.startsWith('@') && !/^(from|to)$/.test(s));
}

test('org.css and library.css only style the pages that opt in', () => {
  for (const sel of selectors(read('css/org.css'))) assert.ok(/body\.sj-org/.test(sel), `org.css unscoped: ${sel}`);
  for (const sel of selectors(read('css/library.css'))) assert.ok(/body\.(sj-lib|lb-[a-z]+)/.test(sel), `library.css unscoped: ${sel}`);
  for (const f of ['index.html', 'articles.html', 'biblia.html', 'tanakh/chapter.html', 'books.html', 'imprint-studio.html'])
    assert.ok(!read(f).includes('/css/org.css') && !read(f).includes('/css/library.css'), f);
  const sw = read('sw.js');
  assert.ok(sw.includes("'/css/org.css',") && sw.includes("'/css/library.css',"), 'precached');
});

test('each research page opts into its own family layout after research.css, with one title', () => {
  for (const [f, cls] of Object.entries(LIB)) {
    const s = read(f);
    assert.match(s, new RegExp(`<body[^>]*class="[^"]*\\bsj-research\\b[^"]*\\bsj-lib\\b[^"]*\\b${cls}\\b`), f);
    assert.ok(s.indexOf('/css/library.css') > s.indexOf('/css/research.css'), `${f}: library.css after research.css`);
    assert.equal((s.match(/<h1\b/g) || []).length, 1, `${f}: one h1`);
    assert.equal((s.match(/<\/main>/g) || []).length, 1, `${f}: one </main>`);
    assert.ok(s.includes('class="lb-mast'), `${f}: masthead`);
  }
});

test('search keeps every control the search script drives', () => {
  const s = read('search.html');
  for (const id of ['sj-search', 'q', 'sr-filters', 'sr-canon', 'sr-status', 'sr-ref', 'sr-meta', 'sr-sort', 'sr-results', 'sr-empty', 'sr-pager', 'sr-scripture', 'sr-tags', 'sr-from', 'sr-to', 'sr-clear'])
    assert.ok(s.includes(`id="${id}"`), id);
  assert.ok(!/<main[^>]*\bsr-page\b/.test(s), 'main no longer shares the pager button class');
  assert.ok(s.indexOf('/js/reader-books.js') < s.indexOf('/js/research-search.js'));
});

test('Ologies: contents list every doctrine and each study outline matches its sections', () => {
  const hub = read('ologies.html');
  for (const o of OLOGIES) assert.ok(hub.includes(`<li><a href="/ologies/${o}.html"><span aria-hidden="true">`), `contents: ${o}`);
  for (const o of OLOGIES) {
    const s = read(`ologies/${o}.html`);
    const outline = [...s.matchAll(/<li><a href="#([^"]+)"><span aria-hidden="true">\d+<\/span>/g)].map(m => m[1]);
    const sections = [...s.matchAll(/<section class="section" id="([^"]+)">/g)].map(m => m[1]);
    assert.deepEqual(outline, sections, `${o}: outline`);
    assert.equal(sections.length, 7, o);
  }
});

test('Encyclopedia and Biblical References keep their script hooks; entries open from the keyboard', () => {
  for (const f of ['encyclopedia.html', 'biblical_references.html']) {
    const s = read(f);
    for (const hook of ['class="az"', 'id="results"', 'id="reader"', 'id="q"', 'id="clearQ"', 'class="panel panel-left"']) assert.ok(s.includes(hook), `${f}: ${hook}`);
  }
  assert.match(read('biblical_references.html'), /card\.tabIndex=0;[\s\S]*?keydown/);
  const app = read('js/encyclopedia.app.js');
  assert.match(app, /card\.tabIndex = 0;[\s\S]*?keydown/);
  assert.ok(app.includes("document.querySelectorAll('[data-ency-query]')") && app.includes("getElementById('encyCount')"), 'quick searches and entry count are wired');
  assert.ok(app.includes('openEntryFromHash'), 'deep links (#entry-id) still open entries');
});

test('Study Guides keeps the Stripe checkout, sample and cover hooks', () => {
  const s = read('study-guides.html');
  assert.ok(s.includes('href="https://donate.semiticjew.org/b/bJe9AN8Wq8s1biZ8oscbC01" data-study-guide-checkout data-checkout-context="storefront_featured">Buy Digital Guide - $9.99</a>'));
  assert.ok(s.includes('href="/study-guides/genesis-1-preview.html"') && s.includes('data-study-guide-cover'));
  assert.equal((s.match(/class="coming-card rs-tile"/g) || []).length, 5);
});
