// Batch 4 research library: shared shell, related links, preserved content and purchase flow.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const exists = f => existsSync(new URL(f.replace(/^\//, ''), root));
const PAGES = ['ologies.html', 'encyclopedia.html', 'biblical_references.html', 'dietary-laws.html', 'israelite-catechism.html',
  'extra-biblical-sources.html', 'black-history-biblical-identity.html', 'bible-summaries.html', 'study-guides.html',
  ...['bibliology', 'elology', 'christology', 'pneumatology', 'anthropology', 'hamartiology', 'soteriology', 'israelology', 'ecclesiology', 'eschatology'].map(n => `ologies/${n}.html`)];

test('every research page is generated and up to date (tools/apply_research_shell.py --check)', () => {
  const out = execFileSync('python3', [new URL('tools/apply_research_shell.py', root).pathname, '--check'], { cwd: new URL('.', root).pathname }).toString();
  assert.match(out, /All research pages are up to date/);
});

test('each research page opts into the shared design after its own inline styles, with one page title', () => {
  for (const f of PAGES) {
    const s = read(f);
    assert.match(s, /<body[^>]*class="[^"]*\bsj-research\b/, f);
    const css = s.indexOf('/css/research.css');
    assert.ok(css > 0 && css > s.lastIndexOf('</style>', s.indexOf('</head>')) && css < s.indexOf('</head>'), `${f}: research.css after inline styles`);
    assert.equal((s.match(/\brs-title\b/g) || []).length, 1, `${f}: one rs-title`);
    assert.ok(/<nav class="breadcrumbs"/.test(s), `${f}: breadcrumbs`);
    assert.ok(s.includes('<nav class="rs-subnav"'), `${f}: research sub-navigation`);
  }
});

test('every related-resource and sub-navigation link points at something that exists', () => {
  const ency = new Set(JSON.parse(read('data/encyclopedia.json')).map(e => e.id));
  for (const f of [...PAGES, 'search.html']) {
    const s = read(f);
    const blocks = [...s.matchAll(/<!-- rs-related:start[\s\S]*?<!-- rs-related:end -->|<nav class="rs-subnav"[\s\S]*?<\/nav>|<nav class="sr-browse"[\s\S]*?<\/nav>/g)].map(m => m[0]).join('\n');
    for (const [, href] of blocks.matchAll(/href="([^"]+)"/g)) {
      const h = href.replace(/&amp;/g, '&');
      const m = /^\/(tanakh|newtestament|apocrypha)\/chapter\.html\?book=([a-z0-9-]+)&ch=(\d+)$/.exec(h);
      if (m) { assert.ok(exists(`data/${m[1]}/${m[2]}/${m[3]}.json`), `${f}: ${h}`); continue; }
      const [path, hash] = h.split('#');
      assert.ok(exists(path), `${f}: ${h} does not exist`);
      if (path === '/encyclopedia.html' && hash) assert.ok(ency.has(hash), `${f}: no encyclopedia entry ${hash}`);
    }
  }
  // Ologies pages link to their neighbours in the Ologies index order.
  assert.ok(read('ologies/christology.html').includes('href="/ologies/elology.html"') && read('ologies/christology.html').includes('href="/ologies/pneumatology.html"'));
});

test('study-guide purchase links, checkout hooks and fulfillment are unchanged', () => {
  const PAY = 'https://donate.semiticjew.org/b/bJe9AN8Wq8s1biZ8oscbC01';
  const store = read('study-guides.html'), product = read('study-guides/genesis-1.html');
  assert.ok(store.includes(`<a class="study-btn" href="${PAY}" data-study-guide-checkout data-checkout-context="storefront_featured">`), 'storefront Buy link');
  assert.ok(product.includes(`href="${PAY}" data-study-guide-checkout data-checkout-context="product_page_primary"`), 'product page Buy link');
  assert.ok(store.includes('<script src="/js/study-guides.js"></script>') || /src="\/js\/study-guides\.js/.test(store), 'storefront script still loaded');
  assert.ok(store.includes('href="/study-guides/genesis-1.html"') && store.includes('href="/study-guides/genesis-1-preview.html"'), 'guide and free sample links');
  assert.ok(!/research\.css|sj-research/.test(product), 'product page itself is not restyled');
  for (const f of ['js/study-guides.js', 'cloudflare/study-guide-fulfillment/src/core.js']) assert.ok(exists(f), f);
});

test('Bible Summaries keeps every video and links each upcoming summary to its book where a page exists', () => {
  const s = read('bible-summaries.html');
  const vids = [...s.matchAll(/<iframe loading="lazy" src="(https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]+)"/g)].map(m => m[1]);
  assert.equal(vids.length, 11, 'all 11 video summaries kept (lazy-loaded)');
  const tiles = [...s.matchAll(/<a class="card rs-tile" href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(tiles.length >= 15);
  for (const t of tiles) assert.ok(exists(t), t);
  for (const name of ['Genesis', 'The Twelve', 'Ezra–Nehemiah', 'Sirach', 'Colossians']) assert.ok(s.includes(`<p class="title">${name}</p>`), name);
});

test('the research stylesheet leaves the locked Articles cards, homepage and reader alone', () => {
  const css = read('css/research.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\.(featured-left|featured-right|article-card|recent-grid|reader-|sj-reader)\b/.test(css));
  const selectors = css.split('}').map(r => r.split('{')[0].trim()).filter(s => s && !s.startsWith('@') && !s.startsWith('from') && !s.startsWith('to'));
  for (const sel of selectors) {
    const scoped = /sj-research|^#sr-|^\.(rs-|sr-|pub-sr)|^:is\(\.sr-|^html\[data-theme="dark"\] (\.sr-|:is\(\.sr-)/.test(sel);
    assert.ok(scoped, `unscoped selector: ${sel}`);
  }
  for (const f of ['index.html', 'articles.html', 'tanakh/chapter.html', 'biblia.html']) assert.ok(!read(f).includes('/css/research.css'), f);
});

test('Catechism has one page-level h1; its section titles are h2s with the same class and text', () => {
  const s = read('israelite-catechism.html');
  assert.equal((s.match(/<h1\b/g) || []).length, 1);
  const secs = [...s.matchAll(/<h2 class="title">([^<]+)<\/h2>/g)].map(m => m[1]);
  assert.deepEqual(secs, ['Israelites', 'Biography', 'Purpose Statement', 'Doctrinal Statement', 'Copyright Policy']);
});

test('Study Guides title reads "Semitic Jew Study Guides"', () => {
  assert.ok(read('study-guides.html').includes('<h1 class="study-title rs-title">Semitic Jew Study Guides</h1>'));
});

test('search-index workflow rebuilds when Ologies, Study Guides or the Encyclopedia data change', () => {
  const wf = read('.github/workflows/search-index.yml');
  for (const p of ['"ologies/**"', '"study-guides/**"', '"data/encyclopedia.json"']) assert.ok(wf.includes(`- ${p}`), p);
});
