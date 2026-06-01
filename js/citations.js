(function(w){if(typeof w.__isArticlePage!=="function"){w.__isArticlePage=function(){return (typeof w.isArticlePage==="function")?!!w.isArticlePage():!!w.isArticlePage;};}})(window);
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
      "1 maccabees":"1-maccabees","1 macc":"1-maccabees","1 macc.":"1-maccabees","1macc":"1-maccabees","i macc":"1-maccabees","2 maccabees":"2-maccabees","2 macc":"2-maccabees","2 macc.":"2-maccabees","2macc":"2-maccabees","ii macc":"2-maccabees",
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
      var href = "/"+canon+"/chapter.html?book=" + encodeURIComponent(slug)
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


document.addEventListener("DOMContentLoaded", function articleFootnoteXrefs(){
  if(!document.body || !document.body.classList.contains("article-doc")) return;

  const scopes = document.querySelectorAll(".footnotes, .biblio-list");
  if(!scopes.length) return;

  const bookMap = {
    "gen":"genesis","genesis":"genesis",
    "ex":"exodus","exo":"exodus","exod":"exodus","exodus":"exodus",
    "lev":"leviticus","leviticus":"leviticus",
    "num":"numbers","numbers":"numbers",
    "deut":"deuteronomy","deuteronomy":"deuteronomy",
    "josh":"joshua","joshua":"joshua",
    "judg":"judges","judges":"judges",
    "ruth":"ruth",
    "1 sam":"1-samuel","1 samuel":"1-samuel",
    "2 sam":"2-samuel","2 samuel":"2-samuel",
    "1 kgs":"1-kings","1 kings":"1-kings",
    "2 kgs":"2-kings","2 kings":"2-kings",
    "1 chr":"1-chronicles","1 chronicles":"1-chronicles",
    "2 chr":"2-chronicles","2 chronicles":"2-chronicles",
    "ezra":"ezra","neh":"nehemiah","nehemiah":"nehemiah",
    "esth":"esther","esther":"esther",
    "job":"job",
    "ps":"psalms","psalm":"psalms","psalms":"psalms",
    "prov":"proverbs","proverbs":"proverbs",
    "eccl":"ecclesiastes","ecclesiastes":"ecclesiastes",
    "song":"song-of-songs",
    "isa":"isaiah","isaiah":"isaiah",
    "jer":"jeremiah","jeremiah":"jeremiah",
    "lam":"lamentations","lamentations":"lamentations",
    "ezek":"ezekiel","ezekiel":"ezekiel",
    "dan":"daniel","daniel":"daniel",
    "hos":"hosea","hosea":"hosea",
    "joel":"joel","amos":"amos","obad":"obadiah","obadiah":"obadiah",
    "jonah":"jonah","mic":"micah","micah":"micah","nah":"nahum","nahum":"nahum",
    "hab":"habakkuk","habakkuk":"habakkuk","zeph":"zephaniah","zephaniah":"zephaniah",
    "hag":"haggai","haggai":"haggai","zech":"zechariah","zechariah":"zechariah",
    "mal":"malachi","malachi":"malachi",

    "matt":"matthew","matthew":"matthew",
    "mark":"mark",
    "luke":"luke","lk":"luke",
    "john":"john","jn":"john",
    "acts":"acts","ac":"acts",
    "rom":"romans","ro":"romans","romans":"romans",
    "1 cor":"1-corinthians","1 corinthians":"1-corinthians",
    "2 cor":"2-corinthians","2 corinthians":"2-corinthians",
    "gal":"galatians","ga":"galatians","galatians":"galatians",
    "eph":"ephesians","ephesians":"ephesians",
    "phil":"philippians","philippians":"philippians",
    "col":"colossians","colossians":"colossians",
    "1 thess":"1-thessalonians","1 thessalonians":"1-thessalonians",
    "2 thess":"2-thessalonians","2 thessalonians":"2-thessalonians",
    "1 tim":"1-timothy","1 timothy":"1-timothy",
    "2 tim":"2-timothy","2 timothy":"2-timothy",
    "titus":"titus","tit":"titus",
    "phlm":"philemon","philemon":"philemon",
    "heb":"hebrews","hebrews":"hebrews",
    "jas":"james","james":"james",
    "1 pet":"1-peter","1 pe":"1-peter","1 peter":"1-peter",
    "2 pet":"2-peter","2 pe":"2-peter","2 peter":"2-peter",
    "1 jn":"1-john","1 john":"1-john",
    "2 jn":"2-john","2 john":"2-john",
    "3 jn":"3-john","3 john":"3-john",
    "jude":"jude",
    "rev":"revelation","re":"revelation","revelation":"revelation"
  };

  const tanakh = new Set([
    "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth",
    "1-samuel","2-samuel","1-kings","2-kings","1-chronicles","2-chronicles",
    "ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song-of-songs",
    "isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos","obadiah",
    "jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi"
  ]);

  const books = Object.keys(bookMap)
    .sort((a,b)=>b.length-a.length)
    .map(x=>x.replace(/\s+/g,"\\s+"))
    .join("|");

  const re = new RegExp("\\b(" + books + ")[\\s\\u00a0]+(\\d{1,3}):(\\d{1,3})(?:[–-](\\d{1,3})(?::\\d{1,3})?)?", "gi");

  function normalizeBook(book){
    return String(book || "").toLowerCase().replace(/\s+/g," ").trim();
  }

  function hrefFor(slug, chapter, verse){
    const canon = tanakh.has(slug) ? "tanakh" : "newtestament";
    return "/" + canon + "/chapter.html?book=" + encodeURIComponent(slug) + "&ch=" + encodeURIComponent(chapter) + "#v" + encodeURIComponent(verse);
  }

  function eligible(node){
    const parent = node.parentElement;
    if(!parent) return false;
    if(parent.closest("a, script, style, textarea, .xref, .xref-trigger")) return false;
    re.lastIndex = 0;
    return re.test(node.nodeValue || "");
  }

  function wrapNode(node){
    const text = node.nodeValue;
    const frag = document.createDocumentFragment();
    let last = 0;
    re.lastIndex = 0;

    text.replace(re, function(match, book, chapter, verse, endVerse, offset){
      frag.appendChild(document.createTextNode(text.slice(last, offset)));

      const slug = bookMap[normalizeBook(book)];
      if(!slug){
        frag.appendChild(document.createTextNode(match));
      }else{
        const a = document.createElement("a");
        a.className = "xref-trigger";
        a.href = hrefFor(slug, chapter, verse);
        a.dataset.xref = match.replace(/\u00a0/g, " ");
        a.textContent = match;
        frag.appendChild(a);
      }

      last = offset + match.length;
      return match;
    });

    frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  scopes.forEach(function(scope){
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node){
        return eligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(wrapNode);
  });
});

