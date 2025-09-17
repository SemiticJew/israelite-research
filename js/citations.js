document.addEventListener('DOMContentLoaded', function(){
  (function(){
    var BOOK_SLUG = {
      genesis:"genesis", exodus:"exodus", leviticus:"leviticus", numbers:"numbers", deuteronomy:"deuteronomy",
      joshua:"joshua", judges:"judges", ruth:"ruth",
      "1 samuel":"1-samuel","2 samuel":"2-samuel",
      "1 kings":"1-kings","2 kings":"2-kings",
      "1 chronicles":"1-chronicles","2 chronicles":"2-chronicles",
      ezra:"ezra", nehemiah:"nehemiah", esther:"esther", job:"job",
      psalm:"psalms", psalms:"psalms",
      proverbs:"proverbs", ecclesiastes:"ecclesiastes", "song of songs":"song-of-songs",
      isaiah:"isaiah", jeremiah:"jeremiah", lamentations:"lamentations", ezekiel:"ezekiel", daniel:"daniel",
      hosea:"hosea", joel:"joel", amos:"amos", obadiah:"obadiah", jonah:"jonah", micah:"micah",
      nahum:"nahum", habakkuk:"habakkuk", zephaniah:"zephaniah", haggai:"haggai", zechariah:"zechariah", malachi:"malachi",
      matthew:"matthew", mark:"mark", luke:"luke", john:"john", acts:"acts", romans:"romans",
      "1 corinthians":"1-corinthians","2 corinthians":"2-corinthians",
      galatians:"galatians", ephesians:"ephesians", philippians:"philippians", colossians:"colossians",
      "1 thessalonians":"1-thessalonians","2 thessalonians":"2-thessalonians",
      "1 timothy":"1-timothy","2 timothy":"2-timothy",
      titus:"titus", philemon:"philemon", hebrews:"hebrews", james:"james",
      "1 peter":"1-peter","2 peter":"2-peter",
      "1 john":"1-john","2 john":"2-john","3 john":"3-john",
      jude:"jude", revelation:"revelation",
      tobit:"tobit", judith:"judith",
      "wisdom":"wisdom-of-solomon","wisdom of solomon":"wisdom-of-solomon",
      sirach:"sirach","ecclesiasticus":"sirach","ecclus":"sirach",
      baruch:"baruch","letter of jeremiah":"letter-of-jeremiah",
      "1 maccabees":"1-maccabees","2 maccabees":"2-maccabees",
      "1 esdras":"1-esdras","2 esdras":"2-esdras",
      "prayer of manasseh":"prayer-of-manasseh","pr of manasseh":"prayer-of-manasseh","manasseh":"prayer-of-manasseh",
      "song of three":"song-of-three","song of the three":"song-of-three","song of three holy children":"song-of-three",
      susanna:"susanna","bel and the dragon":"bel-and-the-dragon"
    };
    var OT_SET = new Set([
      "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","1-samuel","2-samuel",
      "1-kings","2-kings","1-chronicles","2-chronicles","ezra","nehemiah","esther","job","psalms","proverbs",
      "ecclesiastes","song-of-songs","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos",
      "obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi"
    ]);
    var APO_SET = new Set([
      "tobit","judith","wisdom-of-solomon","sirach","baruch","letter-of-jeremiah",
      "1-maccabees","2-maccabees","1-esdras","2-esdras","prayer-of-manasseh","song-of-three","susanna","bel-and-the-dragon"
    ]);
    function canonFor(slug){ if (APO_SET.has(slug)) return 'apocrypha'; if (OT_SET.has(slug)) return 'tanakh'; return 'newtestament'; }
    function normalizeBook(raw){
      var s = raw.replace(/\./g,'').trim().toLowerCase().replace(/\s+/g,' ');
      return BOOK_SLUG[s] || null;
    }
    var ems = document.querySelectorAll('.article-content em');
  console.log('citations: found ' + ems.length + ' candidate refs');
    var refRe = /^([1-3]?\s?[A-Za-z. ]+)\s+(\d+):(\d+(?:[–-]\d+)?)$/;

    ems.forEach(function(em){
      var txt = (em.textContent || '').replace(/\u00A0/g,' ').trim();
      var m = refRe.exec(txt);
      if(!m) return;
      var bookName = m[1], chap = m[2], verse = m[3];
      var slug = normalizeBook(bookName); if(!slug) return;
      var canon = canonFor(slug);
      var firstVerse = String(verse).split(/[–-]/)[0];
      var href = "/israelite-research/"+canon+"/chapter.html?book=" + encodeURIComponent(slug)
               + "&ch=" + encodeURIComponent(chap) + "#v" + encodeURIComponent(firstVerse);
      var a = document.createElement('a');
      a.className = 'xref-trigger';
      a.setAttribute('data-xref', bookName.trim() + " " + chap + ":" + verse);
      a.href = href;
      a.textContent = em.textContent;
      em.replaceWith(a);
    });
  })();
});
