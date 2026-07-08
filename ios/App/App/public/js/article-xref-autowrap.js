(function(){
  "use strict";

  const BOOK_ALIASES = new Map(Object.entries({
    "Gen":["Genesis","tanakh","genesis"],
    "Genesis":["Genesis","tanakh","genesis"],

    "Ex":["Exodus","tanakh","exodus"],
    "Exod":["Exodus","tanakh","exodus"],
    "Exodus":["Exodus","tanakh","exodus"],

    "Lev":["Leviticus","tanakh","leviticus"],
    "Leviticus":["Leviticus","tanakh","leviticus"],

    "Num":["Numbers","tanakh","numbers"],
    "Numbers":["Numbers","tanakh","numbers"],

    "Deut":["Deuteronomy","tanakh","deuteronomy"],
    "Deuteronomy":["Deuteronomy","tanakh","deuteronomy"],

    "Josh":["Joshua","tanakh","joshua"],
    "Joshua":["Joshua","tanakh","joshua"],

    "Judg":["Judges","tanakh","judges"],
    "Judges":["Judges","tanakh","judges"],

    "Ruth":["Ruth","tanakh","ruth"],

    "1 Sam":["1 Samuel","tanakh","1-samuel"],
    "2 Sam":["2 Samuel","tanakh","2-samuel"],
    "1 Samuel":["1 Samuel","tanakh","1-samuel"],
    "2 Samuel":["2 Samuel","tanakh","2-samuel"],

    "1 Kgs":["1 Kings","tanakh","1-kings"],
    "2 Kgs":["2 Kings","tanakh","2-kings"],
    "1 Kings":["1 Kings","tanakh","1-kings"],
    "2 Kings":["2 Kings","tanakh","2-kings"],

    "1 Chr":["1 Chronicles","tanakh","1-chronicles"],
    "2 Chr":["2 Chronicles","tanakh","2-chronicles"],
    "1 Chronicles":["1 Chronicles","tanakh","1-chronicles"],
    "2 Chronicles":["2 Chronicles","tanakh","2-chronicles"],

    "Ezra":["Ezra","tanakh","ezra"],
    "Neh":["Nehemiah","tanakh","nehemiah"],
    "Nehemiah":["Nehemiah","tanakh","nehemiah"],
    "Esth":["Esther","tanakh","esther"],
    "Esther":["Esther","tanakh","esther"],

    "Job":["Job","tanakh","job"],

    "Ps":["Psalm","tanakh","psalm"],
    "Psalm":["Psalm","tanakh","psalm"],
    "Psalms":["Psalm","tanakh","psalm"],

    "Prov":["Proverbs","tanakh","proverbs"],
    "Proverbs":["Proverbs","tanakh","proverbs"],

    "Eccl":["Ecclesiastes","tanakh","ecclesiastes"],
    "Ecc":["Ecclesiastes","tanakh","ecclesiastes"],
    "Ecclesiastes":["Ecclesiastes","tanakh","ecclesiastes"],

    "Song":["Song of Songs","tanakh","song-of-songs"],
    "Song of Songs":["Song of Songs","tanakh","song-of-songs"],
    "Song of Solomon":["Song of Songs","tanakh","song-of-songs"],

    "Isa":["Isaiah","tanakh","isaiah"],
    "Isaiah":["Isaiah","tanakh","isaiah"],

    "Jer":["Jeremiah","tanakh","jeremiah"],
    "Jeremiah":["Jeremiah","tanakh","jeremiah"],

    "Lam":["Lamentations","tanakh","lamentations"],
    "Lamentations":["Lamentations","tanakh","lamentations"],

    "Ezek":["Ezekiel","tanakh","ezekiel"],
    "Ezekiel":["Ezekiel","tanakh","ezekiel"],

    "Dan":["Daniel","tanakh","daniel"],
    "Daniel":["Daniel","tanakh","daniel"],

    "Hos":["Hosea","tanakh","hosea"],
    "Hosea":["Hosea","tanakh","hosea"],
    "Joel":["Joel","tanakh","joel"],
    "Amos":["Amos","tanakh","amos"],
    "Obad":["Obadiah","tanakh","obadiah"],
    "Obadiah":["Obadiah","tanakh","obadiah"],
    "Jonah":["Jonah","tanakh","jonah"],
    "Mic":["Micah","tanakh","micah"],
    "Micah":["Micah","tanakh","micah"],
    "Nah":["Nahum","tanakh","nahum"],
    "Nahum":["Nahum","tanakh","nahum"],
    "Hab":["Habakkuk","tanakh","habakkuk"],
    "Habakkuk":["Habakkuk","tanakh","habakkuk"],
    "Zeph":["Zephaniah","tanakh","zephaniah"],
    "Zephaniah":["Zephaniah","tanakh","zephaniah"],
    "Hag":["Haggai","tanakh","haggai"],
    "Haggai":["Haggai","tanakh","haggai"],
    "Zech":["Zechariah","tanakh","zechariah"],
    "Zechariah":["Zechariah","tanakh","zechariah"],
    "Mal":["Malachi","tanakh","malachi"],
    "Malachi":["Malachi","tanakh","malachi"],

    "Matt":["Matthew","newtestament","matthew"],
    "Matthew":["Matthew","newtestament","matthew"],
    "Mark":["Mark","newtestament","mark"],
    "Luke":["Luke","newtestament","luke"],
    "John":["John","newtestament","john"],
    "Acts":["Acts","newtestament","acts"],

    "Rom":["Romans","newtestament","romans"],
    "Romans":["Romans","newtestament","romans"],

    "1 Cor":["1 Corinthians","newtestament","1-corinthians"],
    "2 Cor":["2 Corinthians","newtestament","2-corinthians"],
    "1 Corinthians":["1 Corinthians","newtestament","1-corinthians"],
    "2 Corinthians":["2 Corinthians","newtestament","2-corinthians"],

    "Gal":["Galatians","newtestament","galatians"],
    "Galatians":["Galatians","newtestament","galatians"],

    "Eph":["Ephesians","newtestament","ephesians"],
    "Ephesians":["Ephesians","newtestament","ephesians"],

    "Phil":["Philippians","newtestament","philippians"],
    "Philippians":["Philippians","newtestament","philippians"],

    "Col":["Colossians","newtestament","colossians"],
    "Colossians":["Colossians","newtestament","colossians"],

    "1 Thess":["1 Thessalonians","newtestament","1-thessalonians"],
    "2 Thess":["2 Thessalonians","newtestament","2-thessalonians"],
    "1 Thessalonians":["1 Thessalonians","newtestament","1-thessalonians"],
    "2 Thessalonians":["2 Thessalonians","newtestament","2-thessalonians"],

    "1 Tim":["1 Timothy","newtestament","1-timothy"],
    "2 Tim":["2 Timothy","newtestament","2-timothy"],
    "1 Timothy":["1 Timothy","newtestament","1-timothy"],
    "2 Timothy":["2 Timothy","newtestament","2-timothy"],

    "Titus":["Titus","newtestament","titus"],
    "Phlm":["Philemon","newtestament","philemon"],
    "Philemon":["Philemon","newtestament","philemon"],

    "Heb":["Hebrews","newtestament","hebrews"],
    "Hebrews":["Hebrews","newtestament","hebrews"],

    "Jas":["James","newtestament","james"],
    "James":["James","newtestament","james"],

    "1 Pet":["1 Peter","newtestament","1-peter"],
    "2 Pet":["2 Peter","newtestament","2-peter"],
    "1 Peter":["1 Peter","newtestament","1-peter"],
    "2 Peter":["2 Peter","newtestament","2-peter"],

    "1 Jn":["1 John","newtestament","1-john"],
    "2 Jn":["2 John","newtestament","2-john"],
    "3 Jn":["3 John","newtestament","3-john"],
    "1 John":["1 John","newtestament","1-john"],
    "2 John":["2 John","newtestament","2-john"],
    "3 John":["3 John","newtestament","3-john"],

    "Jude":["Jude","newtestament","jude"],
    "Rev":["Revelation","newtestament","revelation"],
    "Revelation":["Revelation","newtestament","revelation"]
  }));

  const books = Array.from(BOOK_ALIASES.keys())
    .sort((a,b) => b.length - a.length)
    .map(book => book.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const refRe = new RegExp(
    "\\b(" + books.join("|") + ")\\s+" +
    "(\\d{1,3}):(\\d{1,3}(?:[–-]\\d{1,3})?)",
    "g"
  );

  const skipTags = new Set([
    "A","SCRIPT","STYLE","TEXTAREA","INPUT","BUTTON","SELECT","OPTION",
    "SUP","CODE","PRE"
  ]);

  function normalizeRef(book, chapter, versePart){
    const entry = BOOK_ALIASES.get(book);
    const fullBook = entry ? entry[0] : book;
    const normalizedVerse = String(versePart || "").replace(/–/g, "-");
    return `${fullBook} ${chapter}:${normalizedVerse}`;
  }

  function hrefForRef(book, chapter, versePart){
    const entry = BOOK_ALIASES.get(book);
    if (!entry) return "#";
    const canon = entry[1];
    const slug = entry[2];
    const firstVerse = String(versePart || "").replace(/–/g, "-").split("-")[0];
    return `/${canon}/chapter.html?book=${encodeURIComponent(slug)}&ch=${encodeURIComponent(chapter)}#v${encodeURIComponent(firstVerse)}`;
  }

  function shouldSkipNode(node){
    const parent = node.parentElement;
    if (!parent) return true;
    if (skipTags.has(parent.tagName)) return true;
    if (parent.closest("a, .xref, .xref-trigger, .footnote-ref, .footnotes, .share-min")) return true;
    return false;
  }

  function wrapTextNode(node){
    const text = node.nodeValue;
    if (!text || !text.includes(":")) return;

    refRe.lastIndex = 0;
    if (!refRe.test(text)) return;

    refRe.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = refRe.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) frag.appendChild(document.createTextNode(before));

      const visibleRef = match[0];
      const normalizedRef = normalizeRef(match[1], match[2], match[3]);
      const href = hrefForRef(match[1], match[2], match[3]);

      const a = document.createElement("a");
      a.className = "xref-trigger xref";
      a.setAttribute("data-ref", normalizedRef);
      a.setAttribute("data-xref", normalizedRef);
      a.setAttribute("href", href);
      a.setAttribute("title", normalizedRef);
      a.textContent = visibleRef;

      frag.appendChild(a);
      lastIndex = match.index + visibleRef.length;
    }

    const after = text.slice(lastIndex);
    if (after) frag.appendChild(document.createTextNode(after));

    node.parentNode.replaceChild(frag, node);
  }

  function walk(root){
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node){
          if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue || !node.nodeValue.includes(":")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(wrapTextNode);
  }

  function init(){
    document.querySelectorAll(".article-content").forEach(walk);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
