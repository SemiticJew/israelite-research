document.addEventListener('DOMContentLoaded', function(){
  (function(){
    var BOOK_SLUG = {
      genesis:"genesis", gen:"genesis",
      exodus:"exodus", exod:"exodus", ex:"exodus",
      leviticus:"leviticus", lev:"leviticus",
      numbers:"numbers", num:"numbers", nb:"numbers",
      deuteronomy:"deuteronomy", deut:"deuteronomy", dt:"deuteronomy",
      joshua:"joshua", josh:"joshua",
      judges:"judges", judg:"judges", jdg:"judges",
      ruth:"ruth",
      "1 samuel":"1-samuel","1samuel":"1-samuel","1 sam":"1-samuel","1sam":"1-samuel",
      "2 samuel":"2-samuel","2samuel":"2-samuel","2 sam":"2-samuel","2sam":"2-samuel",
      "1 kings":"1-kings","1kings":"1-kings","1 kgs":"1-kings","1kgs":"1-kings",
      "2 kings":"2-kings","2kings":"2-kings","2 kgs":"2-kings","2kgs":"2-kings",
      "1 chronicles":"1-chronicles","1chronicles":"1-chronicles","1 chr":"1-chronicles","1chr":"1-chronicles",
      "2 chronicles":"2-chronicles","2chronicles":"2-chronicles","2 chr":"2-chronicles","2chr":"2-chronicles",
      ezra:"ezra",
      nehemiah:"nehemiah", neh:"nehemiah",
      esther:"esther", esth:"esther",
      job:"job",
      psalms:"psalms", psalm:"psalms", ps:"psalms", psa:"psalms",
      proverbs:"proverbs", prov:"proverbs", pr:"proverbs",
      ecclesiastes:"ecclesiastes", eccl:"ecclesiastes", ecc:"ecclesiastes", qoh:"ecclesiastes",
      "song of songs":"song-of-songs","song":"song-of-songs","song of solomon":"song-of-songs","sos":"song-of-songs",
      isaiah:"isaiah", isa:"isaiah",
      jeremiah:"jeremiah", jer:"jeremiah",
      lamentations:"lamentations", lam:"lamentations",
      ezekiel:"ezekiel", ezek:"ezekiel", ezk:"ezekiel",
      daniel:"daniel", dan:"daniel",
      hosea:"hosea", hos:"hosea",
      joel:"joel",
      amos:"amos",
      obadiah:"obadiah", obad:"obadiah",
      jonah:"jonah", jon:"jonah",
      micah:"micah", mic:"micah",
      nahum:"nahum", nah:"nahum",
      habakkuk:"habakkuk", hab:"habakkuk",
      zephaniah:"zephaniah", zeph:"zephaniah",
      haggai:"haggai", hag:"haggai",
      zechariah:"zechariah", zech:"zechariah", zec:"zechariah",
      malachi:"malachi", mal:"malachi",
      matthew:"matthew", matt:"matthew", mt:"matthew",
      mark:"mark", mk:"mark", mrk:"mark",
      luke:"luke", lk:"luke", luk:"luke",
      john:"john", jn:"john", joh:"john",
      acts:"acts", ac:"acts",
      romans:"romans", rom:"romans", rm:"romans",
      "1 corinthians":"1-corinthians","1 cor":"1-corinthians","1cor":"1-corinthians",
      "2 corinthians":"2-corinthians","2 cor":"2-corinthians","2cor":"2-corinthians",
      galatians:"galatians", gal:"galatians",
      ephesians:"ephesians", eph:"ephesians",
      philippians:"philippians", phil:"philippians", php:"philippians",
      colossians:"colossians", col:"colossians",
      "1 thessalonians":"1-thessalonians","1 thess":"1-thessalonians","1thess":"1-thessalonians","1 thes":"1-thessalonians",
      "2 thessalonians":"2-thessalonians","2 thess":"2-thessalonians","2thess":"2-thessalonians","2 thes":"2-thessalonians",
      "1 timothy":"1-timothy","1 tim":"1-timothy","1tim":"1-timothy",
      "2 timothy":"2-timothy","2 tim":"2-timothy","2tim":"2-timothy",
      titus:"titus", tit:"titus",
      philemon:"philemon", phlm:"philemon",
      hebrews:"hebrews", heb:"hebrews",
      james:"james", jas:"james",
      "1 peter":"1-peter","1 pet":"1-peter","1pet":"1-peter",
      "2 peter":"2-peter","2 pet":"2-peter","2pet":"2-peter",
      "1 john":"1-john","1 jn":"1-john","1jn":"1-john",
      "2 john":"2-john","2 jn":"2-john","2jn":"2-john",
      "3 john":"3-john","3 jn":"3-john","3jn":"3-john",
      jude:"jude", jud:"jude",
      revelation:"revelation", rev:"revelation", rv:"revelation",
      tobit:"tobit", judith:"judith",
      "wisdom of solomon":"wisdom-of-solomon","wisdom":"wisdom-of-solomon",
      sirach:"sirach","ecclesiasticus":"sirach","ecclus":"sirach",
      baruch:"baruch","letter of jeremiah":"letter-of-jeremiah",
      "1 maccabees":"1-maccabees","2 maccabees":"2-maccabees",
      "1 esdras":"1-esdras","2 esdras":"2-esdras",
      "prayer of manasseh":"prayer-of-manasseh",
      "song of three":"song-of-three","song of the three":"song-of-three",
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
      var s = raw.replace(/\./g,'').replace(/\u00A0/g,' ').trim().toLowerCase().replace(/\s+/g,' ');
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
