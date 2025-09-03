(function () {
  const TITLE = (document.querySelector('.page-title')?.textContent || '').trim();
  if (!TITLE) return;
  const CHAPTERS = {
    "Genesis":50,"Exodus":40,"Leviticus":27,"Numbers":36,"Deuteronomy":34,
    "Joshua":24,"Judges":21,"Ruth":4,"1 Samuel":31,"2 Samuel":24,"1 Kings":22,"2 Kings":25,
    "1 Chronicles":29,"2 Chronicles":36,"Ezra":10,"Nehemiah":13,"Esther":10,"Job":42,
    "Psalms":150,"Proverbs":31,"Ecclesiastes":12,"Song of Solomon":8,"Isaiah":66,"Jeremiah":52,
    "Lamentations":5,"Ezekiel":48,"Daniel":12,"Hosea":14,"Joel":3,"Amos":9,"Obadiah":1,"Jonah":4,
    "Micah":7,"Nahum":3,"Habakkuk":3,"Zephaniah":3,"Haggai":2,"Zechariah":14,"Malachi":4
  };
  const SLUG = TITLE.toLowerCase().replace(/\s+/g, '-')
    .replace(/^1-/, '1-').replace(/^2-/, '2-').replace(/^3-/, '3-');
  const TOTAL = CHAPTERS[TITLE];
  if (!TOTAL) return;
  const grid = document.getElementById('chapGrid') || document.querySelector('.grid');
  if (!grid) return;
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
  const base = `/israelite-research/tanakh/chapter.html?book=${SLUG}&ch=`;
  cards.forEach((a, idx) => {
    const ch = idx + 1;
    if (ch <= TOTAL) a.href = base + ch;
  });
})();
