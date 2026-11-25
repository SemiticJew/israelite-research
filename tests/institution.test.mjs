// Batch 5: organization pages, site metadata, sitemap, performance fixes and workflow reliability.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const exists = f => existsSync(new URL(f.replace(/^\//, ''), root));
const py = (script, ...args) => execFileSync('python3', [new URL(script, root).pathname, ...args], { cwd: root.pathname }).toString();

const ORG = ['about.html', 'mission.html', 'programs.html', 'donate.html', 'newsletter.html', 'contact.html'];
const INST = [...ORG, 'events.html', 'privacy.html', 'terms.html', 'researcher-welcome.html', 'offline.html'];

test('generated pages are up to date (institution shell, page metadata, Scripture pages)', () => {
  assert.match(py('tools/apply_institution_shell.py', '--check'), /up to date/);
  assert.match(py('tools/apply_page_meta.py', '--check'), /All pages have canonical/);
  assert.match(py('tools/build_scripture_pages.py', '--check'), /85 pages up to date/);
});

test('organization pages have their own layouts (org.css) with one title and the Organization strip', () => {
  for (const f of ORG) {
    const s = read(f);
    assert.match(s, /<body[^>]*class="[^"]*\bsj-org\b/, f);
    assert.ok(s.includes('/css/org.css') && !s.includes('/css/institution.css'), `${f}: org.css only`);
    assert.equal((s.match(/<h1\b/g) || []).length, 1, `${f}: one h1`);
    assert.ok(s.includes('class="breadcrumbs"'), `${f}: breadcrumbs`);
    assert.ok(s.includes('<nav class="og-strip" aria-label="Organization">'), `${f}: Organization strip`);
    assert.ok(new RegExp(`<a href="/${f}" aria-current="page">`).test(s), `${f}: current page marked`);
    assert.ok(!/<style>/.test(s), `${f}: no leftover page styles`);
  }
  assert.ok(read('about.html').includes('id="organization-verification"'), 'verification anchor kept for /about.html#organization-verification');
});

test('the remaining institution pages share the institutional design after their own styles', () => {
  for (const f of INST.filter(f => !ORG.includes(f))) {
    const s = read(f);
    assert.match(s, /<body[^>]*class="[^"]*\bsj-inst\b/, f);
    const css = s.indexOf('/css/institution.css');
    assert.ok(css > s.lastIndexOf('</style>', s.indexOf('</head>')) && css < s.indexOf('</head>'), `${f}: institution.css after inline styles`);
    assert.equal((s.match(/<h1\b/g) || []).length, 1, `${f}: one h1`);
    assert.equal((s.match(/\bin-title\b/g) || []).length, 1, `${f}: one in-title`);
    if (f !== 'offline.html') assert.ok(s.includes('class="breadcrumbs"'), `${f}: breadcrumbs`);
    assert.ok(!s.includes('og-strip') && !s.includes('in-orgnav'), `${f}: no Organization navigation`);
  }
});

test('donation, verification and newsletter integrations are unchanged', () => {
  const donate = read('donate.html'), about = read('about.html'), news = read('newsletter.html');
  assert.ok(donate.includes('href="https://www.zeffy.com/en-US/donation-form/expand-educational-media-and-production-capacity" target="_blank" rel="noopener" data-google-ads-conversion="donate">Give Now</a>'), 'Zeffy Give Now link and Ads conversion hook');
  assert.ok(donate.includes('https://app.candid.org/profile/16555230/semitic-jew-inc-93-4076422/') && donate.includes('https://widgets.guidestar.org/prod/v1/pdp/transparency-seal/16555230/svg'), 'Candid seal');
  for (const s of [donate, about]) assert.ok(s.includes('93-4076422'), 'EIN shown');
  assert.ok(about.includes('161 Rushton Drive, Chapin, SC 29036-9843'), 'registered address');
  assert.ok(news.includes('data-form-url="/en-US/embed/newsletter-form/subscribe-to-get-notified-about-new-events-92942"') && news.includes('src="https://www.zeffy.com/embed/v2/zeffy-embed.js"'), 'Zeffy newsletter embed');
  // Structured data repeats only facts the About page states.
  const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(about)[1]);
  assert.equal(ld.taxID, '93-4076422'); assert.equal(ld.address.streetAddress, '161 Rushton Drive'); assert.equal(ld.nonprofitStatus, 'Nonprofit501c3');
  for (const s of ld.sameAs) assert.ok(read('partials/footer.html').includes(s), `sameAs ${s} is linked in the footer`);
});

test('no form posts to a placeholder, and the old email-subscribe URL sends people to the real newsletter', () => {
  for (const f of readdirSync(root).filter(f => f.endsWith('.html'))) assert.ok(!/<form[^>]*action="#"/.test(read(f)), f);
  const sub = read('subscribe-email.html');
  assert.ok(sub.includes('url=/newsletter.html') && sub.includes('rel="canonical" href="https://semiticjew.org/newsletter.html"'));
  const rw = read('researcher-welcome.html');
  assert.ok(rw.includes('action="mailto:contact@semiticjew.org'), 'researcher application opens an email');
  for (const name of ['name', 'email', 'focus', 'motivation']) assert.match(rw, new RegExp(`name="${name}"[^>]*aria-label=`), `${name} has an accessible name`);
});

test('every public page has a canonical URL, description and sharing card; the sitemap lists real pages only', () => {
  const sm = read('sitemap.xml');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(locs).size, locs.length, 'no duplicate sitemap URLs');
  for (const u of locs) {
    let p = u.replace('https://semiticjew.org/', '') || 'index.html';
    if (p.endsWith('/')) p += 'index.html';
    assert.ok(exists(p), `sitemap: ${u}`);
  }
  for (const f of ['about.html', 'mission.html', 'programs.html', 'newsletter.html', 'ologies.html', 'encyclopedia.html', 'search.html', 'tanakh/genesis.html', 'apocrypha/sirach.html', 'articles/god-loves-black-people.html'])
    assert.ok(locs.includes(`https://semiticjew.org/${f}`), `sitemap lists ${f}`);
  for (const f of ['tanakh/genesis.html', 'biblia.html', 'about.html', 'events.html', 'articles/three-laws-of-logic.html']) {
    const s = read(f);
    assert.ok(s.includes(`rel="canonical" href="https://semiticjew.org/${f}"`), `${f}: canonical`);
    assert.match(s, /<meta name="description" content="[^"]{20,}"/, `${f}: description`);
    assert.ok(s.includes('property="og:title"') && s.includes('name="twitter:card"'), `${f}: sharing card`);
  }
  assert.ok(read('index.html').includes('rel="canonical" href="https://semiticjew.org/"'));
  assert.ok(!read('study-guides/order-complete.html').includes('apply_page_meta'), 'noindex order page left alone');
});

test('search thumbnails use card-sized images, and the book cover is served as WebP', () => {
  const index = JSON.parse(read('search-index.json'));
  for (const d of index) {
    assert.ok(!/-social(-1200x630)?\.(png|jpe?g)$/.test(d.image || ''), `${d.url}: social card used as thumbnail`);
    assert.notEqual(d.image, '/images/social-preview.png', `${d.url}: generic preview used as thumbnail`);
    if (d.image) assert.ok(exists(d.image), `${d.url}: ${d.image}`);
  }
  for (const f of ['books.html', 'christian-marxism.html']) {
    const s = read(f);
    assert.ok(s.includes('srcset="/assets/home/christian-marxism-cover-360.webp 360w, /assets/home/christian-marxism-cover-720.webp 720w"'), f);
    assert.ok(s.includes('src="/book-assets/christian-marxism-cover.png"'), `${f}: PNG fallback kept`);
  }
  // Below-the-fold article images load lazily; the featured cards (first images) do not.
  const imgs = [...read('articles.html').matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  assert.ok(imgs.slice(0, 6).every(t => !t.includes('loading="lazy"')) && imgs.slice(6).every(t => t.includes('loading="lazy"')));
  // The featured-rotation tool still recognises the card images.
  assert.ok(imgs.filter(t => /^<img alt="[^"]*" src="[^"]+"/.test(t)).length >= 20);
});

test('workflows: generated-content pushes rebase and retry, and Pages publishes only the website', () => {
  for (const f of ['youtube-feed.yml', 'update-app-content-feed.yml', 'search-index.yml']) {
    const s = read(`.github/workflows/${f}`);
    assert.ok(s.includes('git pull --rebase origin main && git push origin HEAD:main'), `${f}: rebase + retry push`);
    assert.ok(!/^\s*git push\s*$/m.test(s), `${f}: no bare git push`);
    assert.match(s, /concurrency:/, `${f}: concurrency group`);
  }
  const pages = read('.github/workflows/pages.yml');
  assert.match(pages, /cancel-in-progress: false/);
  for (const d of ['/ios/', '/tests/', '/tools/', '/automation/']) assert.ok(pages.includes(`--exclude='${d}'`), d);
  assert.ok(pages.includes('path: ${{ runner.temp }}/site') && pages.includes('CNAME') && pages.includes('.nojekyll'));
  assert.ok(pages.includes('actions/upload-pages-artifact@v3'), 'v3 keeps dotfiles such as .nojekyll');
});

test('institution.css is scoped to the organization pages and loaded nowhere else', () => {
  const css = read('css/institution.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = css.split('}').map(r => r.split('{')[0].trim()).filter(s => s && !s.startsWith('@') && !/^(from|to)$/.test(s));
  for (const sel of selectors) assert.ok(/sj-inst|^\.in-/.test(sel), `unscoped selector: ${sel}`);
  for (const f of ['index.html', 'articles.html', 'tanakh/chapter.html', 'biblia.html', 'search.html', 'shop.html', 'imprint-studio.html', ...ORG]) assert.ok(!read(f).includes('/css/institution.css'), f);
  assert.ok(read('sw.js').includes("'/css/institution.css',"), 'precached for the 404 and offline pages');
});
