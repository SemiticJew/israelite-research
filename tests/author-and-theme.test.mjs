// Regression tests for the author-modal recent-article dates and the theme toggle double-load.
// Run: node --test tests/author-and-theme.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('author modal shows the authored day for date-only and full ISO timestamps; never "Invalid Date"', async () => {
  const items = [
    { title: 'A', href: '/articles/a.html', author: 'Semitic Jew', date: '2026-11-03T04:30:00Z' },
    { title: 'B', href: '/articles/b.html', author: 'Semitic Jew', date: '2026-10-28T01:28:50-04:00' },
    { title: 'C', href: '/articles/c.html', author: 'Semitic Jew', date: '2026-10-26T23:09:00-04:00' },
    { title: 'D', href: '/articles/d.html', author: 'Semitic Jew', date: '2026-10-26' },
    { title: 'E', href: '/articles/e.html', author: 'Semitic Jew', date: 'not a date' },
  ];
  const mk = (tag, text) => { const n = { tag, text, children: [], dataset: {}, append(...c) { this.children.push(...c); } }; return n; };
  let rendered;
  const root = { dataset: {}, replaceChildren(...c) { rendered = c; } };
  const ctx = vm.createContext({
    document: { querySelector: () => root, body: {} },
    MutationObserver: class { observe() {} disconnect() {} },
    window: { loadArticleCatalog: () => Promise.resolve(items) },
    articleElement: mk, Error, Date, isNaN,
  });
  vm.runInContext(src('js/author-recent.js'), ctx);
  await new Promise(r => setTimeout(r, 10));
  assert.equal(root.dataset.liveArticles, 'ready');
  const cards = rendered.slice(1);
  const times = cards.map(c => c.children[1].children.find(x => x && x.tag === 'time'));
  assert.deepEqual(times.slice(0, 4).map(t => t.text), ['Nov 3, 2026', 'Oct 28, 2026', 'Oct 26, 2026', 'Oct 26, 2026']);
  assert.deepEqual(times.slice(0, 4).map(t => t.dateTime), items.slice(0, 4).map(i => i.date), 'datetime attribute keeps the original value');
  assert.equal(times[4], undefined, 'an unparseable date is omitted rather than shown as "Invalid Date"');
  assert.ok(!JSON.stringify(rendered).includes('Invalid Date'));
});

test('theme-toggle.js can be loaded twice without error or duplicate click handlers', () => {
  const listeners = [];
  const store = { theme: 'dark' };
  const html = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const ctx = vm.createContext({
    document: { documentElement: html, getElementById: () => null, addEventListener: (t, fn) => listeners.push(t) },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
  });
  ctx.window = ctx;
  const code = src('js/theme-toggle.js');
  vm.runInContext(code, ctx);
  assert.doesNotThrow(() => vm.runInContext(code, ctx));
  assert.equal(listeners.length, 1);
  assert.equal(html.attrs['data-theme'], 'dark', 'saved theme still applied');
});

test('include.js will not inject theme-toggle.js when the page already has the script tag', () => {
  const s = src('js/include.js');
  assert.match(s, /querySelector\('script\[src\^="\/js\/theme-toggle\.js"\]'\)/);
});
