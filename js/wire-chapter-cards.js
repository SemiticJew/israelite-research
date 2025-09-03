// wire-chapter-cards.js
(function () {
  // Get book display title from the page
  const TITLE = (document.querySelector('.page-title')?.textContent || '').trim();
  if (!TITLE) return;

  // Full chapter counts (Tanakh + NT)
  const CHAPTERS = {
    // Tanakh / OT
    "Genesis":50,"Exodus":40,"Leviticus":27,"Numbers":36,"Deuteronomy":34,
    "Joshua":24,"Judges":21,"Ruth":4,"I Samuel":31,"II Samuel":24,"I Kings":22,"II Kings":25,
    "I Chronicles":29,"II Chronicles":36,"Ezra":10,"Nehemiah":13,"Esther":10,"Job":42,
    "Psalms":150,"Proverbs":31,"Ecclesiastes":12,"Songs of Solomon":8,"Isaiah":66,"Jeremiah":52,
    "Lamentations":5,"Ezekiel":48,"Daniel":12,"Hosea":14,"Joel":3,"Amos":9,"Obadiah":1,"Jonah":4,
    "Micah":7,"Nahum":3,"Habakkuk":3,"Zephaniah":3,"Haggai":2,"Zechariah":14,"Malachi":4,

    // New Testament
    "Matthew":28,"Mark":16,"Luke":24,"John":21,"Acts":28,"Romans":16,
    "I Corinthians":16,"II Corinthians":13,"Galatians":6,"Ephesians":6,"Philippians":4,"Colossians":4,
    "I Thessalonians":5,"II Thessalonians":3,"I Timothy":6,"II Timothy":4,"Titus":3,"Philemon":1,"Hebrews":13,
    "James":5,"I Peter":5,"II Peter":3,"I John":5,"II John":1,"III John":1,"Jude":1,"Revelation":22
  };

  // Helpers
  const toSlug = (name) => {
    // Map display names to URL slugs used in your data folder structure
    const map = {
      // Numerals
      "I Samuel":"i-samuel","II Samuel":"ii-samuel","I Kings":"i-kings","II Kings":"ii-kings",
      "I Chronicles":"i-chronicles","II Chronicles":"ii-chronicles",
      "I Corinthians":"i-corinthians","II Corinthians":"ii-corinthians",
      "I Thessalonians":"i-thessalonians","II Thessalonians":"ii-thessalonians",
      "I Timothy":"i-timothy","II Timothy":"ii-timothy",
      "I Peter":"i-peter","II Peter":"ii-peter",
      "I John":"i-john","II John":"ii-john","III John":"iii-john",

      // Special titles
      "Songs of Solomon":"songs-of-solomon"
    };
    if (map[name]) return map[name];
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  const inferCanonBase = () => {
    // Decide base path by current location; fallback to TITLE membership
    if (location.pathname.includes('/newtestament/')) return '/israelite-research/newtestament';
    if (location.pathname.includes('/tanakh/')) return '/israelite-research/tanakh';
    // Fallback by book set
    const NT_TITLES = new Set([
      "Matthew","Mark","Luke","John","Acts","Romans","I Corinthians","II Corinthians","Galatians","Ephesians",
      "Philippians","Colossians","I Thessalonians","II Thessalonians","I Timothy","II Timothy","Titus",
      "Philemon","Hebrews","James","I Peter","II Peter","I John","II John","III John","Jude","Revelation"
    ]);
    return NT_TITLES.has(TITLE) ? '/israelite-research/newtestament' : '/israelite-research/tanakh';
  };

  const TOTAL = CHAPTERS[TITLE];
  if (!TOTAL) return;

  const grid = document.getElementById('chapGrid') || document.querySelector('.grid');
  if (!grid) return;

  // Build cards if none exist (preserve appearance: class="ch")
  let cards = grid.querySelectorAll('.ch');
  if (!cards.length) {
    for (let i = 1; i <= TOTAL; i++) {
      const a = document.createElement('a');
      a.className = 'ch';
      a.textContent = i;
      grid.appendChild(a);
    }
    cards = grid.querySelectorAll('.ch');
  }

  // Wire HREFs to shared chapter.html with query params
  const base = inferCanonBase();
  const slug = toSlug(TITLE);
  const hrefBase = `${base}/chapter.html?book=${slug}&ch=`;

  cards.forEach((a, idx) => {
    const ch = idx + 1;
    if (ch <= TOTAL) a.href = hrefBase + ch;
  });
})();
