(function(){
  "use strict";

  const BOOK_ALIASES = new Map(Object.entries({
    "Gen":"Genesis",
    "Genesis":"Genesis",

    "Ex":"Exodus",
    "Exod":"Exodus",
    "Exodus":"Exodus",

    "Lev":"Leviticus",
    "Leviticus":"Leviticus",

    "Num":"Numbers",
    "Numbers":"Numbers",

    "Deut":"Deuteronomy",
    "Deuteronomy":"Deuteronomy",

    "Josh":"Joshua",
    "Joshua":"Joshua",

    "Judg":"Judges",
    "Judges":"Judges",

    "Ruth":"Ruth",

    "1 Sam":"1 Samuel",
    "2 Sam":"2 Samuel",
    "1 Samuel":"1 Samuel",
    "2 Samuel":"2 Samuel",

    "1 Kgs":"1 Kings",
    "2 Kgs":"2 Kings",
    "1 Kings":"1 Kings",
    "2 Kings":"2 Kings",

    "1 Chr":"1 Chronicles",
    "2 Chr":"2 Chronicles",
    "1 Chronicles":"1 Chronicles",
    "2 Chronicles":"2 Chronicles",

    "Ezra":"Ezra",
    "Neh":"Nehemiah",
    "Nehemiah":"Nehemiah",
    "Esth":"Esther",
    "Esther":"Esther",

    "Job":"Job",

    "Ps":"Psalm",
    "Psalm":"Psalm",
    "Psalms":"Psalm",

    "Prov":"Proverbs",
    "Proverbs":"Proverbs",

    "Eccl":"Ecclesiastes",
    "Ecc":"Ecclesiastes",
    "Ecclesiastes":"Ecclesiastes",

    "Song":"Song of Songs",
    "Song of Songs":"Song of Songs",
    "Song of Solomon":"Song of Songs",

    "Isa":"Isaiah",
    "Isaiah":"Isaiah",

    "Jer":"Jeremiah",
    "Jeremiah":"Jeremiah",

    "Lam":"Lamentations",
    "Lamentations":"Lamentations",

    "Ezek":"Ezekiel",
    "Ezekiel":"Ezekiel",

    "Dan":"Daniel",
    "Daniel":"Daniel",

    "Hos":"Hosea",
    "Hosea":"Hosea",

    "Joel":"Joel",
    "Amos":"Amos",
    "Obad":"Obadiah",
    "Obadiah":"Obadiah",
    "Jonah":"Jonah",
    "Mic":"Micah",
    "Micah":"Micah",
    "Nah":"Nahum",
    "Nahum":"Nahum",
    "Hab":"Habakkuk",
    "Habakkuk":"Habakkuk",
    "Zeph":"Zephaniah",
    "Zephaniah":"Zephaniah",
    "Hag":"Haggai",
    "Haggai":"Haggai",
    "Zech":"Zechariah",
    "Zechariah":"Zechariah",
    "Mal":"Malachi",
    "Malachi":"Malachi",

    "Matt":"Matthew",
    "Matthew":"Matthew",
    "Mark":"Mark",
    "Luke":"Luke",
    "John":"John",
    "Acts":"Acts",

    "Rom":"Romans",
    "Romans":"Romans",

    "1 Cor":"1 Corinthians",
    "2 Cor":"2 Corinthians",
    "1 Corinthians":"1 Corinthians",
    "2 Corinthians":"2 Corinthians",

    "Gal":"Galatians",
    "Galatians":"Galatians",

    "Eph":"Ephesians",
    "Ephesians":"Ephesians",

    "Phil":"Philippians",
    "Philippians":"Philippians",

    "Col":"Colossians",
    "Colossians":"Colossians",

    "1 Thess":"1 Thessalonians",
    "2 Thess":"2 Thessalonians",
    "1 Thessalonians":"1 Thessalonians",
    "2 Thessalonians":"2 Thessalonians",

    "1 Tim":"1 Timothy",
    "2 Tim":"2 Timothy",
    "1 Timothy":"1 Timothy",
    "2 Timothy":"2 Timothy",

    "Titus":"Titus",
    "Phlm":"Philemon",
    "Philemon":"Philemon",

    "Heb":"Hebrews",
    "Hebrews":"Hebrews",

    "Jas":"James",
    "James":"James",

    "1 Pet":"1 Peter",
    "2 Pet":"2 Peter",
    "1 Peter":"1 Peter",
    "2 Peter":"2 Peter",

    "1 Jn":"1 John",
    "2 Jn":"2 John",
    "3 Jn":"3 John",
    "1 John":"1 John",
    "2 John":"2 John",
    "3 John":"3 John",

    "Jude":"Jude",
    "Rev":"Revelation",
    "Revelation":"Revelation"
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
    const fullBook = BOOK_ALIASES.get(book) || book;
    const normalizedVerse = String(versePart || "").replace(/–/g, "-");
    return `${fullBook} ${chapter}:${normalizedVerse}`;
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

      const span = document.createElement("span");
      span.className = "xref";
      span.setAttribute("data-ref", normalizedRef);
      span.setAttribute("data-xref", normalizedRef);
      span.setAttribute("title", normalizedRef);
      span.textContent = visibleRef;

      frag.appendChild(span);
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
