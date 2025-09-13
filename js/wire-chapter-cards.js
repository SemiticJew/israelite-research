(function () {
  const TITLE = (document.querySelector('.page-title')?.textContent || '').trim();
  if (!TITLE) return;

  const CHAPTERS = {
    "Genesis":50,"Exodus":40,"Leviticus":27,"Numbers":36,"Deuteronomy":34,
    "Joshua":24,"Judges":21,"Ruth":4,"1 Samuel":31,"2 Samuel":24,"1 Kings":22,"2 Kings":25,
    "1 Chronicles":29,"2 Chronicles":36,"Ezra":10,"Nehemiah":13,"Esther":10,"Job":42,
    "Psalms":150,"Proverbs":31,"Ecclesiastes":12,"Song of Solomon":8,"Isaiah":66,"Jeremiah":52,
    "Lamentations":5,"Ezekiel":48,"Daniel":12,"Hosea":14,"Joel":3,"Amos":9,"Obadiah":1,"Jonah":4,
    "Micah":7,"Nahum":3,"Habakkuk":3,"Zephaniah":3,"Haggai":2,"Zechariah":14,"Malachi":4,
    "Matthew":28,"Mark":16,"Luke":24,"John":21,"Acts":28,"Romans":16,
    "1 Corinthians":16,"2 Corinthians":13,"Galatians":6,"Ephesians":6,"Philippians":4,"Colossians":4,
    "1 Thessalonians":5,"2 Thessalonians":3,"1 Timothy":6,"2 Timothy":4,"Titus":3,"Philemon":1,"Hebrews":13,
    "James":5,"1 Peter":5,"2 Peter":3,"1 John":5,"2 John":1,"3 John":1,"Jude":1,"Revelation":22,
    "Tobit":14,"Judith":16,"Additions to Esther":10,"Wisdom":19,"Sirach":51,"Baruch":6,"Letter of Jeremiah":1,
    "Prayer of Azariah":1,"Susanna":1,"Bel and the Dragon":1,"1 Maccabees":16,"2 Maccabees":15,
    "1 Esdras":9,"2 Esdras":16,"Prayer of Manasseh":1
  };

  const TITLE_TO_SLUG = {
    "1 Samuel":"1-samuel","2 Samuel":"2-samuel","1 Kings":"1-kings","2 Kings":"2-kings",
    "1 Chronicles":"1-chronicles","2 Chronicles":"2-chronicles",
    "1 Corinthians":"1-corinthians","2 Corinthians":"2-corinthians",
    "1 Thessalonians":"1-thessalonians","2 Thessalonians":"2-thessalonians",
    "1 Timothy":"1-timothy","2 Timothy":"2-timothy",
    "1 Peter":"1-peter","2 Peter":"2-peter",
    "1 John":"1-john","2 John":"2-john","3 John":"3-john",
    "Song of Solomon":"song-of-solomon",
    "Additions to Esther":"additions-to-esther",
    "Letter of Jeremiah":"letter-of-jeremiah",
    "Prayer of Azariah":"prayer-of-azariah",
    "Bel and the Dragon":"bel-and-the-dragon",
    "1 Maccabees":"1-maccabees","2 Maccabees":"2-maccabees",
    "1 Esdras":"1-esdras","2 Esdras":"2-esdras",
    "Prayer of Manasseh":"prayer-of-manasseh"
  };

  function toSlug(name){
    return TITLE_TO_SLUG[name] || name.toLowerCase().replace(/\s+/g,'-');
  }

  function inferCanonBase() {
    if (location.pathname.includes('/newtestament/')) return '/israelite-research/newtestament';
    if (location.pathname.includes('/tanakh/')) return '/israelite-research/tanakh';
    if (location.pathname.includes('/apocrypha/')) return '/israelite-research/apocrypha';
    const NT = new Set(["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"]);
    const APO = new Set(["Tobit","Judith","Additions to Esther","Wisdom","Sirach","Baruch","Letter of Jeremiah","Prayer of Azariah","Susanna","Bel and the Dragon","1 Maccabees","2 Maccabees","1 Esdras","2 Esdras","Prayer of Manasseh"]);
    if (APO.has(TITLE)) return '/israelite-research/apocrypha';
    return NT.has(TITLE) ? '/israelite-research/newtestament' : '/israelite-research/tanakh';
  }

  const TOTAL = CHAPTERS[TITLE];
  if (!TOTAL) return;

  const grid = document.getElementById('chapGrid') || document.querySelector('.grid');
  if (!grid) return;

  let cards = grid.querySelectorAll('.ch');
  if (!cards.length) {
    for (let i=1; i<=TOTAL; i++){
      const a = document.createElement('a');
      a.className = 'ch';
      a.textContent = i;
      grid.appendChild(a);
    }
    cards = grid.querySelectorAll('.ch');
  }

  const base = inferCanonBase();
  const slug = toSlug(TITLE);
  const hrefBase = `${base}/chapter.html?book=${slug}&ch=`;
  cards.forEach((a, idx) => {
    const ch = idx + 1;
    if (ch <= TOTAL) a.href = hrefBase + ch;
  });
})();
