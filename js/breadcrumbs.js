<script>
/**
 * Breadcrumbs — sitewide, domain-aware, "Home-first" and Title-Cased.
 * Works for:
 *  - Home
 *  - /articles.html and /articles/<slug>.html
 *  - /texts.html
 *  - /tanakh.html, /tanakh/book.html?book=Genesis, /tanakh/chapter.html?book=Genesis&chapter=1[&verse=1]
 *  - /newtestament.html, /newtestament/book.html?book=Matthew, /newtestament/chapter.html?book=Matthew&chapter=1[&verse=1]
 *  - /apologetics.html[?view=topics][&topic=Theology]
 *  - /events.html, /podcast.html, /donate.html
 *
 * Usage on each page (already standard on your site):
 *   <nav id="breadcrumbs" class="breadcrumb" aria-label="Breadcrumb" data-scope="auto"></nav>
 */

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const BASE = '/israelite-research';
    const bcEl = document.getElementById('breadcrumbs');
    if (!bcEl) return;

    // --------- Utilities ----------
    const toTitle = (s) =>
      s.replace(/[-_]/g, ' ')
       .replace(/\s+/g, ' ')
       .trim()
       .replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());

    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.replace(/\/+$/,''); // trim trailing slash
    const here = path.toLowerCase();

    const make = (name, href) => ({ name, href });
    const render = (items) => {
      // Ensure first letter uppercase on every crumb label
      const html = `
        <ol>
          ${items.map((it, i) => {
            const label = toTitle(it.name);
            return it.href && i < items.length - 1
              ? `<li><a href="${it.href}">${label}</a></li>`
              : `<li aria-current="page">${label}</li>`;
          }).join('')}
        </ol>`;
      bcEl.innerHTML = html;
    };

    // Known books (so we only create links for valid targets)
    const TANAKH_BOOKS = new Set([
      'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
      'Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings',
      '1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther',
      'Job','Psalms','Proverbs','Ecclesiastes','Song of Songs',
      'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
      'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum',
      'Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'
    ]);
    const NT_BOOKS = new Set([
      'Matthew','Mark','Luke','John','Acts',
      'Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
      'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus',
      'Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
    ]);

    // --------- Builders ----------
    const homeOnly = () => render([ make('Home') ]);

    const simplePage = (label, href = null) =>
      render([ make('Home', BASE + '/'), make(label, href) ]);

    const articlesList = () =>
      render([ make('Home', BASE + '/'), make('Articles') ]);

    const articleDetail = (slug) => {
      const title = toTitle(slug.replace(/\.html$/,''));
      render([
        make('Home', BASE + '/'),
        make('Articles', BASE + '/articles.html'),
        make(title)
      ]);
    };

    const tanakhIndex = () => render([
      make('Home', BASE + '/'),
      make('Texts', BASE + '/texts.html'),
      make('The Tanakh')
    ]);

    const tanakhBook = () => {
      const book = params.get('book') || '';
      const valid = TANAKH_BOOKS.has(book);
      render([
        make('Home', BASE + '/'),
        make('Texts', BASE + '/texts.html'),
        make('The Tanakh', BASE + '/tanakh.html'),
        valid ? make(book) : make(book || 'Book')
      ]);
    };

    const tanakhChapter = () => {
      const book = params.get('book') || '';
      const chap = params.get('chapter');
      const verse = params.get('verse');
      const validBook = TANAKH_BOOKS.has(book);
      const bookHref = validBook ? `${BASE}/tanakh/book.html?book=${encodeURIComponent(book)}` : null;
      const chapHref = chap ? `${BASE}/tanakh/chapter.html?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chap)}` : null;

      const crumbs = [
        make('Home', BASE + '/'),
        make('Texts', BASE + '/texts.html'),
        make('The Tanakh', BASE + '/tanakh.html'),
        make(book, bookHref),
      ];
      if (chap) crumbs.push(make(`Chapter ${chap}`, chapHref));
      if (verse) crumbs.push(make(`v${verse}`));
      render(crumbs);
    };

    const ntIndex = () => render([
      make('Home', BASE + '/'),
      make('Texts', BASE + '/texts.html'),
      make('The New Testament')
    ]);

    const ntBook = () => {
      const book = params.get('book') || '';
      const valid = NT_BOOKS.has(book);
      render([
        make('Home', BASE + '/'),
        make('Texts', BASE + '/texts.html'),
        make('The New Testament', BASE + '/newtestament.html'),
        valid ? make(book) : make(book || 'Book')
      ]);
    };

    const ntChapter = () => {
      const book = params.get('book') || '';
      const chap = params.get('chapter');
      const verse = params.get('verse');
      const validBook = NT_BOOKS.has(book);
      const bookHref = validBook ? `${BASE}/newtestament/book.html?book=${encodeURIComponent(book)}` : null;
      const chapHref = chap ? `${BASE}/newtestament/chapter.html?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chap)}` : null;

      const crumbs = [
        make('Home', BASE + '/'),
        make('Texts', BASE + '/texts.html'),
        make('The New Testament', BASE + '/newtestament.html'),
        make(book, bookHref),
      ];
      if (chap) crumbs.push(make(`Chapter ${chap}`, chapHref));
      if (verse) crumbs.push(make(`v${verse}`));
      render(crumbs);
    };

    const apocryphaIndex = () => render([
      make('Home', BASE + '/'),
      make('Texts', BASE + '/texts.html'),
      make('Apocrypha')
    ]);

    const apologetics = () => {
      // ?view=topics to show "Browse Topics", &topic=Something to add a final crumb
      const view = params.get('view');         // "topics"
      const topic = params.get('topic');       // "Theology" etc.
      const crumbs = [ make('Home', BASE + '/'), make('Apologetics') ];
      if (view === 'topics') crumbs.push(make('Browse Topics'));
      if (topic) crumbs.push(make(topic));
      render(crumbs);
    };

    // --------- Router ----------
    // Home (root or /index.html)
    if (here === `${BASE}` || here === `${BASE}/` || here.endsWith('/index.html')) {
      return homeOnly();
    }

    // Articles
    if (here.endsWith('/articles.html')) return articlesList();
    if (here.includes('/articles/')) {
      const slug = here.split('/articles/')[1] || '';
      return articleDetail(slug);
    }

    // Texts hub
    if (here.endsWith('/texts.html')) return simplePage('Texts');

    // Tanakh
    if (here.endsWith('/tanakh.html')) return tanakhIndex();
    if (here.endsWith('/tanakh/book.html')) return tanakhBook();
    if (here.endsWith('/tanakh/chapter.html')) return tanakhChapter();

    // New Testament
    if (here.endsWith('/newtestament.html')) return ntIndex();
    if (here.endsWith('/newtestament/book.html')) return ntBook();
    if (here.endsWith('/newtestament/chapter.html')) return ntChapter();

    // Apocrypha index
    if (here.endsWith('/apocrypha.html')) return apocryphaIndex();

    // Apologetics
    if (here.endsWith('/apologetics.html')) return apologetics();

    // Events / Podcast / Donate
    if (here.endsWith('/events.html'))   return simplePage('Events');
    if (here.endsWith('/podcast.html'))  return simplePage('Podcast');
    if (here.endsWith('/donate.html'))   return simplePage('Donations');

    // Fallback: just Home > Current filename
    const file = here.split('/').pop() || 'Page';
    return render([ make('Home', BASE + '/'), make(file.replace('.html','')) ]);
  });
})();
</script>
