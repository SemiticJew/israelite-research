// Regression tests for Batch 3 (Publications & Media).
// Run: node --test tests/publications.test.mjs   (also part of `npm test`)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

const SPOTIFY = 'https://open.spotify.com/show/0GvSSHiBeVAmvHMIXP6lOi';
const APPLE = 'https://podcasts.apple.com/us/podcast/semitic-jew/id1693178004';
const YT = 'https://www.youtube.com/@blksemitic';

test('the approved Articles-page card design is locked: no new stylesheet targets its classes', () => {
  // The one allowed rule hides recent cards after the 8th (two desktop rows); it changes no card styling.
  const allowed = 'body.articles-page #recent-articles .recent-grid > .article-card:nth-child(n+9)';
  const locked = /\.(featured-left|featured-right|article-card|image-block|card-body|card-footer|resource-label|resource-in-image|resource-in-excerpt|meta-date|more-btn|recent-grid|featured-split|discovery-card|discovery-region)\b|#(featured-articles|recent-articles)\b/;
  for (const f of ['css/publications.css', 'css/article.css']) {
    const rules = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(allowed + '{ display: none !important; }', '');
    const hit = rules.split('}').find(r => locked.test(r.split('{')[0] || ''));
    assert.equal(hit, undefined, `${f} targets a locked card selector: ${hit}`);
  }
  const articles = read('articles.html');
  assert.ok(!/<body[^>]*\bsj-pub\b/.test(articles), 'articles.html must not opt into the sj-pub restyle');
});

test('articles.html keeps every marker the publishing automation relies on', () => {
  const s = read('articles.html');
  for (const m of ['<!-- Left Featured -->', '<article class="featured-left boxed">', '<article class="featured-right boxed">', '<div class="recent-grid">', 'class="card-footer"', 'class="meta-date"']) {
    assert.ok(s.includes(m), m);
  }
  assert.equal((s.match(/<h1[\s>]/g) || []).length, 1, 'exactly one h1');
});

test('every article (and the template) loads the reading stylesheet and still passes the standardizer', () => {
  for (const f of readdirSync(new URL('articles/', root)).filter(f => f.endsWith('.html'))) {
    const s = read(`articles/${f}`);
    assert.ok(s.includes('<link rel="stylesheet" href="/css/article.css"/>'), f);
    assert.ok(s.indexOf('/css/article.css') > s.lastIndexOf('</style>', s.indexOf('</head>')), `${f}: article.css must load after the inline styles`);
  }
  const out = execFileSync('python3', [new URL('tools/standardize-articles.py', root).pathname, '--dry-run', '--include-template'], { cwd: new URL('.', root).pathname }).toString();
  assert.match(out, /No article standardization changes needed/);
});

test('podcast and channel links are the verified destinations (never generic platform home pages)', () => {
  for (const f of ['media.html', 'publications.html']) {
    const s = read(f);
    assert.ok(s.includes(SPOTIFY) && s.includes(APPLE) && s.includes(YT), f);
    assert.ok(!/href="https:\/\/open\.spotify\.com\/"/.test(s) && !/href="https:\/\/podcasts\.apple\.com\/"/.test(s), `${f}: generic platform link`);
    for (const m of s.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) assert.match(m[0], /rel="noopener"/, `${f}: ${m[0]}`);
  }
  const media = read('media.html');
  for (const id of ['podcast-teachings', 'latest-videos', 'platforms', 'media-podcast-grid', 'media-latest-grid']) assert.ok(media.includes(`id="${id}"`), `media.html keeps #${id}`);
});

test('media/publications script builds DOM only and loads players on request', () => {
  const js = read('js/media-page.js');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(js));
  assert.ok(js.includes('/data/podcast-episodes.json') && js.includes('/data/youtube-videos.json'));
  assert.match(js, /preload: 'none'/, 'audio streams only when the visitor presses play');
  assert.ok(js.includes("!/\\/shorts\\//.test(v.url)"), 'YouTube Shorts are filtered out of video teachings');
  assert.ok(!/<iframe/.test(read('media.html')), 'no player iframe in the page before the visitor asks');
});

test('Publications hub and Books are in the site search index sources', () => {
  const py = read('tools/build_search_index.py');
  assert.ok(py.includes('"publications.html"') && py.includes('"books.html"'));
  assert.ok(read('partials/header.html').includes('href="/publications.html"'));
});

test('website keeps Semitic Jew branding: no embedded platform player that shows another show name', () => {
  for (const f of ['media.html', 'publications.html']) {
    const s = read(f);
    assert.ok(!/embed\/show|data-load-spotify|<iframe/.test(s), f);
    assert.ok(!/Israel Restored|\bA Jew\b/.test(s), `${f} must not display the platform show title`);
  }
  assert.ok(!/open\.spotify\.com\/embed/.test(read('js/media-page.js')));
});

test('Authors pages derive article counts from the live catalog (static fallback is current)', () => {
  const total = (read('articles.html').match(/<article class="(featured-left|featured-right|article-card) boxed">/g) || []).length;
  const a = read('authors.html'), p = read('authors/semitic-jew.html');
  for (const s of [a, p]) {
    assert.ok(s.includes('<script src="/js/article-catalog.js"></script>') && s.includes('<script src="/js/author-counts.js"></script>'));
    for (const m of s.matchAll(/data-article-count[^>]*>(\d+)/g)) assert.equal(Number(m[1]), total, `static fallback ${m[1]} ≠ ${total}`);
  }
  assert.ok(p.includes('data-author-articles="Semitic Jew"'));
  assert.ok(!/innerHTML|insertAdjacentHTML/.test(read('js/author-counts.js')));
});

test('gentiles.html no longer carries the broken inline reference-wrapping script', () => {
  const s = read('articles/gentiles.html');
  assert.ok(!s.includes('var re = /\\b(Gen(?:esis)?'), 'broken regex script removed');
  assert.ok(s.includes('<script src="/js/article-xref-autowrap.js" defer></script>'), 'standard reference wrapping still loaded');
});

test('podcast episodes come only from the verified RSS cache, newest first', () => {
  const d = JSON.parse(read('data/podcast-episodes.json'));
  assert.equal(d.source, 'https://anchor.fm/s/d92a4020/podcast/rss');
  assert.ok(d.episodes.length > 0);
  for (const e of d.episodes) assert.match(e.audio, /^https:\/\/(anchor\.fm|[a-z0-9.-]+\.cloudfront\.net)\//);
  const dates = d.episodes.map(e => e.published);
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.ok(read('.github/workflows/youtube-feed.yml').includes('python scripts/fetch_podcast_rss.py'));
});
