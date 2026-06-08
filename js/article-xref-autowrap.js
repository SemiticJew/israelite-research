(function(){
  "use strict";

  const BOOKS = [
    "Genesis","Gen",
    "Exodus","Exod","Ex",
    "Leviticus","Lev",
    "Numbers","Num",
    "Deuteronomy","Deut",
    "Joshua","Josh",
    "Judges","Judg",
    "Ruth",
    "1 Samuel","2 Samuel","1 Sam","2 Sam",
    "1 Kings","2 Kings","1 Kgs","2 Kgs",
    "1 Chronicles","2 Chronicles","1 Chr","2 Chr",
    "Ezra","Nehemiah","Neh","Esther","Esth",
    "Job",
    "Psalm","Psalms","Ps",
    "Proverbs","Prov",
    "Ecclesiastes","Eccl","Ecc",
    "Song of Songs","Song of Solomon","Song",
    "Isaiah","Isa",
    "Jeremiah","Jer",
    "Lamentations","Lam",
    "Ezekiel","Ezek",
    "Daniel","Dan",
    "Hosea","Hos",
    "Joel","Amos","Obadiah","Obad","Jonah","Micah","Mic","Nahum","Nah",
    "Habakkuk","Hab","Zephaniah","Zeph","Haggai","Hag","Zechariah","Zech","Malachi","Mal",
    "Matthew","Matt",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans","Rom",
    "1 Corinthians","2 Corinthians","1 Cor","2 Cor",
    "Galatians","Gal",
    "Ephesians","Eph",
    "Philippians","Phil",
    "Colossians","Col",
    "1 Thessalonians","2 Thessalonians","1 Thess","2 Thess",
    "1 Timothy","2 Timothy","1 Tim","2 Tim",
    "Titus","Philemon","Phlm",
    "Hebrews","Heb",
    "James","Jas",
    "1 Peter","2 Peter","1 Pet","2 Pet",
    "1 John","2 John","3 John","1 Jn","2 Jn","3 Jn",
    "Jude","Revelation","Rev"
  ];

  const escapedBooks = BOOKS
    .sort((a,b) => b.length - a.length)
    .map(book => book.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const refRe = new RegExp(
    "\\b(" + escapedBooks.join("|") + ")\\s+" +
    "\\d{1,3}:\\d{1,3}" +
    "(?:[–-]\\d{1,3})?" +
    "(?:\\s*;\\s*(?:" + escapedBooks.join("|") + ")\\s+\\d{1,3}:\\d{1,3}(?:[–-]\\d{1,3})?)*",
    "g"
  );

  const skipTags = new Set([
    "A","SCRIPT","STYLE","TEXTAREA","INPUT","BUTTON","SELECT","OPTION",
    "SUP","CODE","PRE"
  ]);

  function shouldSkipNode(node){
    const parent = node.parentElement;
    if (!parent) return true;
    if (skipTags.has(parent.tagName)) return true;
    if (parent.closest("a, .xref, .xref-trigger, .footnote-ref, .footnotes, .share-min")) return true;
    return false;
  }

  function wrapTextNode(node){
    const text = node.nodeValue;
    if (!text || !refRe.test(text)) return;

    refRe.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = refRe.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) frag.appendChild(document.createTextNode(before));

      const ref = match[0];
      const span = document.createElement("span");
      span.className = "xref";
      span.setAttribute("data-ref", ref);
      span.textContent = ref;
      frag.appendChild(span);

      lastIndex = match.index + ref.length;
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
