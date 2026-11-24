/* reader-books.js — shared book catalogue for the Scripture reader.
   Biblical order, display names, groups and safe link targets for every canon.
   Data-only: chapter counts still come from /data/<canon>/books.json, and no
   canon mapping is changed here (books are only ordered and labelled). */
(function(){
  'use strict';

  // Each group: [label, [slugs…]] in the order the site already uses on its book pages.
  const GROUPS = {
    tanakh: [
      ['Law', ['genesis','exodus','leviticus','numbers','deuteronomy']],
      ['History', ['joshua','judges','ruth','1-samuel','2-samuel','1-kings','2-kings','1-chronicles','2-chronicles','ezra','nehemiah','esther']],
      ['Poetry & Wisdom', ['job','psalm','proverbs','ecclesiastes','song-of-solomon']],
      ['Major Prophets', ['isaiah','jeremiah','lamentations','ezekiel','daniel']],
      ['Minor Prophets', ['hosea','joel','amos','obadiah','jonah','micah','nahum','habakkuk','zephaniah','haggai','zechariah','malachi']],
      // Present in the Tanakh data today; shown separately and kept out of the
      // Genesis → Malachi reading sequence. Their canon placement is unchanged.
      ['Additional Texts', ['addesth','adddan','judit','manassse'], { outOfSequence: true }]
    ],
    newtestament: [
      ['Gospels & Acts', ['matthew','mark','luke','john','acts']],
      ['Letters of Paul', ['romans','1-corinthians','2-corinthians','galatians','ephesians','philippians','colossians','1-thessalonians','2-thessalonians','1-timothy','2-timothy','titus','philemon']],
      ['General Letters', ['hebrews','james','1-peter','2-peter','1-john','2-john','3-john','jude']],
      ['Prophecy', ['revelation']]
    ],
    apocrypha: [
      ['Apocrypha', ['tobit','wisdom','sirach','baruch','susanna','bel-and-the-dragon','1-maccabees','2-maccabees','1-esdras','2-esdras']]
    ]
  };

  const NAMES = {
    'psalm': 'Psalms', 'song-of-solomon': 'Song of Solomon', 'bel-and-the-dragon': 'Bel and the Dragon',
    'addesth': 'Additions to Esther', 'adddan': 'Additions to Daniel', 'judit': 'Judith', 'manassse': 'Prayer of Manasseh'
  };

  // A chapter heading reads "Psalm 23", not "Psalms 23".
  const CHAPTER_NAMES = { 'psalm': 'Psalm' };

  // Conventional abbreviations for the compact reader bar on small phones.
  const SHORT = {
    'deuteronomy': 'Deut', '1-chronicles': '1 Chron', '2-chronicles': '2 Chron', 'ecclesiastes': 'Eccl', 'song-of-solomon': 'Song',
    'lamentations': 'Lam', 'zephaniah': 'Zeph', 'zechariah': 'Zech', 'habakkuk': 'Hab', 'leviticus': 'Lev',
    '1-corinthians': '1 Cor', '2-corinthians': '2 Cor', 'galatians': 'Gal', 'ephesians': 'Eph', 'philippians': 'Phil', 'colossians': 'Col',
    '1-thessalonians': '1 Thess', '2-thessalonians': '2 Thess', '1-timothy': '1 Tim', '2-timothy': '2 Tim', 'philemon': 'Philem', 'revelation': 'Rev',
    '1-maccabees': '1 Macc', '2-maccabees': '2 Macc', 'bel-and-the-dragon': 'Bel', 'addesth': 'Add Esth', 'adddan': 'Add Dan', 'manassse': 'Pr Man'
  };
  function shortName(slug){ const s = canonical(slug); return SHORT[s] || chapterName(s); }

  const CANONS = {
    tanakh: { label: 'Tanakh', hub: '/tanakh.html', first: 'genesis' },
    newtestament: { label: 'New Testament', hub: '/newtestament.html', first: 'matthew' },
    apocrypha: { label: 'Apocrypha', hub: '/apocrypha.html', first: 'tobit' }
  };

  // Book overview pages that exist on the site (so breadcrumbs never 404).
  const LANDING = {
    tanakh: { psalm: 'psalms' },
    newtestament: {},
    apocrypha: {}
  };
  const NO_LANDING = new Set(['tanakh:addesth','tanakh:adddan','tanakh:judit','tanakh:manassse']);

  // Cross-reference files use "psalms" while chapter data uses "psalm".
  const XREF_DIR = { tanakh: { psalm: 'psalms' } };

  // Slugs people (and older links) use for the same book.
  const ALIASES = {
    'ps': 'psalm', 'psa': 'psalm', 'psal': 'psalm', 'psalms': 'psalm', 'book-of-psalms': 'psalm', 'the-psalms': 'psalm',
    'song-of-songs': 'song-of-solomon', 'canticles': 'song-of-solomon'
  };

  function titleCase(slug){
    return String(slug || '').split('-').filter(Boolean)
      .map(w => /^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function canonical(slug){
    const s = String(slug || '').trim().toLowerCase();
    return ALIASES[s] || s;
  }

  function name(slug){ const s = canonical(slug); return NAMES[s] || titleCase(s); }
  function chapterName(slug){ const s = canonical(slug); return CHAPTER_NAMES[s] || name(s); }

  /** Ordered books for a canon: [{slug, name, chapters, group, outOfSequence}] limited to books in books.json. */
  function ordered(canon, counts){
    const have = counts && typeof counts === 'object' ? counts : {};
    const out = []; const seen = new Set();
    (GROUPS[canon] || []).forEach(([group, slugs, opts]) => {
      slugs.forEach(slug => {
        if(!(slug in have)) return;
        seen.add(slug);
        out.push({ slug, name: name(slug), chapters: Number(have[slug]) || 1, group, outOfSequence: !!(opts && opts.outOfSequence) });
      });
    });
    // Anything new in books.json that this list does not know yet still appears (at the end).
    Object.keys(have).filter(s => !seen.has(s)).sort().forEach(slug => {
      out.push({ slug, name: name(slug), chapters: Number(have[slug]) || 1, group: 'Other', outOfSequence: true });
    });
    return out;
  }

  const knownCanon = c => Object.prototype.hasOwnProperty.call(CANONS, c);

  function chapterHref(canon, slug, ch, verse){
    if(!knownCanon(canon)) return '/biblia.html';
    const v = /^\d+$/.test(String(verse || '')) ? `#v${verse}` : '';
    return `/${canon}/chapter.html?book=${encodeURIComponent(slug)}&ch=${encodeURIComponent(ch)}${v}`;
  }

  function landingHref(canon, slug){
    if(!knownCanon(canon)) return '/biblia.html';
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || '')) || NO_LANDING.has(`${canon}:${slug}`)) return CANONS[canon].hub;
    const page = (LANDING[canon] && LANDING[canon][slug]) || slug;
    return `/${canon}/${encodeURIComponent(page)}.html`;
  }

  function xrefDir(canon, slug){ return (XREF_DIR[canon] && XREF_DIR[canon][slug]) || slug; }

  /** Canon that holds a cross-reference target (data says "psalms" in the tanakh). */
  function resolveRef(ref){
    const slug = canonical(ref && ref.slug);
    return { canon: ref && ref.canon, slug };
  }

  window.SJBooks = { GROUPS, CANONS, ordered, name, chapterName, shortName, canonical, chapterHref, landingHref, xrefDir, resolveRef, titleCase };
})();
