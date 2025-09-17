(function(){
  // Map common book names/abbrev to slugs used in your chapter.html
  var BOOK_SLUG = {
    genesis:"genesis", exodus:"exodus", leviticus:"leviticus", numbers:"numbers", deuteronomy:"deuteronomy",
    joshua:"joshua", judges:"judges", ruth:"ruth", "1 samuel":"1-samuel", "2 samuel":"2-samuel",
    "1 kings":"1-kings","2 kings":"2-kings","1 chronicles":"1-chronicles","2 chronicles":"2-chronicles",
    ezra:"ezra", nehemiah:"nehemiah", esther:"esther", job:"job", psalms:"psalms", psalm:"psalms",
    proverbs:"proverbs", ecclesiastes:"ecclesiastes", "song of songs":"song-of-songs", isaiah:"isaiah",
    jeremiah:"jeremiah", lamentations:"lamentations", ezekiel:"ezekiel", daniel:"daniel",
    hosea:"hosea", joel:"joel", amos:"amos", obadiah:"obadiah", jonah:"jonah", micah:"micah",
    nahum:"nahum", habakkuk:"habakkuk", zephaniah:"zephaniah", haggai:"haggai", zechariah:"zechariah", malachi:"malachi",
    matthew:"matthew", mark:"mark", luke:"luke", john:"john", acts:"acts", romans:"romans",
    "1 corinthians":"1-corinthians","2 corinthians":"2-corinthians", galatians:"galatians",
    ephesians:"ephesians", philippians:"philippians", colossians:"colossians",
    "1 thessalonians":"1-thessalonians","2 thessalonians":"2-thessalonians",
    "1 timothy":"1-timothy","2 timothy":"2-timothy", titus:"titus", philemon:"philemon",
    hebrews:"hebrews", james:"james", "1 peter":"1-peter","2 peter":"2-peter",
    "1 john":"1-john","2 john":"2-john","3 john":"3-john", jude:"jude", revelation:"revelation"
  };

  function normalizeBook(raw){
    var s = raw.replace(/\./g,'').trim().toLowerCase(); // strip periods in "Deut."
    // collapse extra spaces (e.g., "1   Samuel")
    s = s.replace(/\s+/g,' ');
    return BOOK_SLUG[s] || null;
  }

  // Find <em>…</em> that look like Bible refs, e.g. "Deut 32:4", "Isa 44:14–17"
  var ems = document.querySelectorAll('.article-content em');
  var refRe = /^([1-3]?\s?[A-Za-z. ]+)\s+(\d+):(\d+(?:[–-]\d+)?)$/; // book chap:verse or range

  ems.forEach(function(em){
    var txt = (em.textContent || '').replace(/\u00A0/g,' ').trim(); // normalize NBSP to space
    var m = refRe.exec(txt);
    if(!m) return;

    var bookName = m[1]; var chap = m[2]; var verse = m[3];
    var slug = normalizeBook(bookName);
    if(!slug) return;

    // Build URL to your chapter page with anchor to first verse in the ref
    var firstVerse = String(verse).split(/[–-]/)[0];
    var href = "/israelite-research/tanakh/chapter.html?book=" + encodeURIComponent(slug) + "&ch=" + encodeURIComponent(chap) + "#v" + encodeURIComponent(firstVerse);

    // Create anchor that your existing xref hover system can bind to
    var a = document.createElement('a');
    a.className = 'xref-trigger';
    a.setAttribute('data-xref', bookName.trim() + " " + chap + ":" + verse);
    a.href = href;
    a.textContent = em.textContent; // preserve original display

    // Replace <em> with anchor (keeping italics via CSS if desired)
    em.replaceWith(a);
  });

  // Optional: if the Bible reader’s cross-ref initializer exists, call it
  if (window.XRef && typeof window.XRef.init === 'function') {
    try { window.XRef.init(); } catch(e){}
  }
})();
