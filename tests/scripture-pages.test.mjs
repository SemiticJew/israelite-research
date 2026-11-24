// Regression tests for the Biblia hub, collection hubs and the 81 book pages (Batch 2).
// Run: node --test tests/scripture-pages.test.mjs   (also part of `npm test`)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const C = JSON.parse(read('tools/scripture_pages_content.json'));
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
const textOf = html => decode(html.replace(/<script[\s\S]*?<\/script\s*>/gi, ' ').replace(/<style[\s\S]*?<\/style\s*>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const hrefs = html => [...html.matchAll(/href="([^"]+)"/g)].map(m => decode(m[1]));

test('all 85 pages are generated from the content file and are current', () => {
  execFileSync('python3', [new URL('tools/build_scripture_pages.py', root).pathname, '--check']);
});

test('every book page exists, is linked from its collection hub, and every hub link has a page', () => {
  for (const canon of ['tanakh', 'newtestament', 'apocrypha']) {
    const files = readdirSync(new URL(`${canon}/`, root)).filter(f => f.endsWith('.html') && f !== 'chapter.html').map(f => `/${canon}/${f}`).sort();
    const hub = hrefs(read(`${canon}.html`)).filter(h => h.startsWith(`/${canon}/`) && !h.includes('chapter.html'));
    assert.deepEqual([...new Set(hub)].sort(), files, canon);
  }
  assert.equal(Object.keys(C.books).length, 81);
});

test('all existing book information is on each book page', () => {
  for (const [key, b] of Object.entries(C.books)) {
    const html = read(`${key}.html`); const text = textOf(html);
    for (const s of [b.h1, b.kicker, b.subtitle, b.panel_h2, b.panel_p, b.chapter_count_label, ...b.identity.flatMap(i => [i.label, i.value])]) {
      assert.ok(text.includes(s), `${key}: missing “${s}”`);
    }
    assert.ok(html.includes(`<title>${b.title.replace(/&/g, '&amp;')}</title>`), `${key}: title`);
    assert.ok(html.includes(`content="${b.description.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`), `${key}: description`);
    for (const c of b.crumbs) assert.ok(text.includes(c.label) && (!c.href || hrefs(html).includes(c.href)), `${key}: breadcrumb ${c.label}`);
  }
});

test('chapter links: one per chapter, in the same URL format as before, never fewer than the old grid had', () => {
  const legacy = { 'apocrypha/baruch': 6 };
  for (const [key, b] of Object.entries(C.books)) {
    const total = Math.max(Number(b.identity.find(i => i.label === 'Chapters').value), legacy[key] || 0);
    const html = read(`${key}.html`);
    const grid = html.slice(html.indexOf('<ol class="sp-ch-grid"'), html.indexOf('</ol>', html.indexOf('<ol class="sp-ch-grid"')));
    const expect = Array.from({ length: total }, (_, i) => `/${b.canon}/chapter.html?book=${b.slug}&ch=${i + 1}`);
    assert.deepEqual(hrefs(grid), expect, key);
  }
});

test('chapters without reader text are marked, never silently dropped', () => {
  const g = read('tanakh/hosea.html');
  assert.match(g, /ch=14" class="is-unavailable"/, 'Hosea 14 is missing from data/tanakh/hosea and must be marked');
  assert.ok(!existsSync(new URL('data/tanakh/hosea/14.json', root)));
  assert.match(read('apocrypha/judith.html'), /isn’t in the Apocrypha reader yet/);
  assert.equal((read('apocrypha/wisdom.html').match(/class="is-unavailable"/g) || []).length, 0, 'Wisdom has data for all 19 chapters');
});

test('collection hubs keep every group description, era and abbreviation in canon order', () => {
  for (const canon of ['tanakh', 'newtestament', 'apocrypha']) {
    const hub = C.hubs[canon]; const html = read(`${canon}.html`); const text = textOf(html);
    for (const s of [hub.kicker, hub.h1, hub.subtitle, ...hub.guide.flatMap(g => [g.count, g.h2, g.p])]) assert.ok(text.includes(s), `${canon}: “${s}”`);
    const cards = hub.columns.flat();
    let at = -1;
    for (const c of cards) {
      const i = html.indexOf(`href="${c.href}"`, at + 1);
      assert.ok(i > at, `${canon}: ${c.name} out of order or missing`);
      at = i;
      assert.ok(text.includes(c.era) && text.includes(c.name), `${canon}: ${c.name} era/name`);
    }
  }
});

test('Biblia hub keeps every card, stat and description', () => {
  const hub = C.hubs.biblia; const html = read('biblia.html'); const text = textOf(html);
  for (const c of hub.cards) {
    assert.ok(hrefs(html).includes(c.href), c.href);
    for (const s of [c.thumb, c.kicker, c.title, c.desc]) assert.ok(text.includes(s), `Biblia card “${s}”`);
  }
  for (const s of hub.stats) assert.ok(text.includes(s.value) && text.includes(s.label));
  for (const s of [hub.kicker, hub.h1, hub.subtitle, hub.note.label, hub.note.h2, hub.note.p]) assert.ok(text.includes(s), s);
});

test('security: the page script never builds HTML and only follows same-site reader URLs', async () => {
  const js = read('js/scripture-pages.js');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(js));
  const re = new RegExp(js.match(/const READER_URL = (\/.+\/);/)[1].slice(1, -1));
  assert.ok(re.test('/tanakh/chapter.html?book=genesis&ch=3'));
  for (const bad of ['javascript:alert(1)', '//evil.example/tanakh/chapter.html?book=a&ch=1', '/tanakh/chapter.html?book=a"><x&ch=1', 'https://evil.example/'])
    assert.ok(!re.test(bad), bad);
});
