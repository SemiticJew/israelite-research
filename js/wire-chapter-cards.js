(function () {
  const BOOKS = {
    tanakh: {
      "genesis": ["Genesis", 50],
      "exodus": ["Exodus", 40],
      "leviticus": ["Leviticus", 27],
      "numbers": ["Numbers", 36],
      "deuteronomy": ["Deuteronomy", 34],

      "joshua": ["Joshua", 24],
      "judges": ["Judges", 21],
      "ruth": ["Ruth", 4],
      "1-samuel": ["1 Samuel", 31],
      "2-samuel": ["2 Samuel", 24],
      "1-kings": ["1 Kings", 22],
      "2-kings": ["2 Kings", 25],
      "1-chronicles": ["1 Chronicles", 29],
      "2-chronicles": ["2 Chronicles", 36],
      "ezra": ["Ezra", 10],
      "nehemiah": ["Nehemiah", 13],
      "esther": ["Esther", 10],

      "job": ["Job", 42],
      "psalms": ["Psalms", 150],
      "proverbs": ["Proverbs", 31],
      "ecclesiastes": ["Ecclesiastes", 12],
      "song-of-solomon": ["Song of Solomon", 8],

      "isaiah": ["Isaiah", 66],
      "jeremiah": ["Jeremiah", 52],
      "lamentations": ["Lamentations", 5],
      "ezekiel": ["Ezekiel", 48],
      "daniel": ["Daniel", 12],

      "hosea": ["Hosea", 14],
      "joel": ["Joel", 3],
      "amos": ["Amos", 9],
      "obadiah": ["Obadiah", 1],
      "jonah": ["Jonah", 4],
      "micah": ["Micah", 7],
      "nahum": ["Nahum", 3],
      "habakkuk": ["Habakkuk", 3],
      "zephaniah": ["Zephaniah", 3],
      "haggai": ["Haggai", 2],
      "zechariah": ["Zechariah", 14],
      "malachi": ["Malachi", 4]
    },

    newtestament: {
      "matthew": ["Matthew", 28],
      "mark": ["Mark", 16],
      "luke": ["Luke", 24],
      "john": ["John", 21],
      "acts": ["Acts", 28],
      "romans": ["Romans", 16],
      "1-corinthians": ["1 Corinthians", 16],
      "2-corinthians": ["2 Corinthians", 13],
      "galatians": ["Galatians", 6],
      "ephesians": ["Ephesians", 6],
      "philippians": ["Philippians", 4],
      "colossians": ["Colossians", 4],
      "1-thessalonians": ["1 Thessalonians", 5],
      "2-thessalonians": ["2 Thessalonians", 3],
      "1-timothy": ["1 Timothy", 6],
      "2-timothy": ["2 Timothy", 4],
      "titus": ["Titus", 3],
      "philemon": ["Philemon", 1],
      "hebrews": ["Hebrews", 13],
      "james": ["James", 5],
      "1-peter": ["1 Peter", 5],
      "2-peter": ["2 Peter", 3],
      "1-john": ["1 John", 5],
      "2-john": ["2 John", 1],
      "3-john": ["3 John", 1],
      "jude": ["Jude", 1],
      "revelation": ["Revelation", 22]
    }
  };

  function getCanon() {
    const bodyCanon = document.body && document.body.dataset ? document.body.dataset.canon : "";
    if (bodyCanon) return bodyCanon.toLowerCase();

    const path = location.pathname.toLowerCase();
    if (path.includes("/newtestament/")) return "newtestament";
    if (path.includes("/tanakh/")) return "tanakh";

    return "tanakh";
  }

  function getBookSlug() {
    const fromBody = document.body && document.body.dataset ? document.body.dataset.book : "";
    if (fromBody) return fromBody.toLowerCase();

    const file = location.pathname.split("/").pop() || "";
    return file.replace(/\.html$/i, "").toLowerCase();
  }

  function buildGrid() {
    const grid = document.getElementById("chapGrid");
    if (!grid) return;

    const canon = getCanon();
    const slug = getBookSlug();
    const book = BOOKS[canon] && BOOKS[canon][slug];

    if (!book) {
      grid.innerHTML = '<p class="muted">Unable to determine chapter count for this book.</p>';
      return;
    }

    const name = book[0];
    const chapters = book[1];

    const title = document.querySelector(".page-title");
    if (title) title.textContent = name;

    const crumbs = document.querySelector(".crumbs");
    if (crumbs) crumbs.textContent = "Chapters";

    document.title = name + " — Chapters";

    grid.innerHTML = "";

    for (let i = 1; i <= chapters; i++) {
      const a = document.createElement("a");
      a.className = "ch";
      a.href = "/" + canon + "/chapter.html?book=" + encodeURIComponent(slug) + "&ch=" + i;
      a.textContent = i;
      a.setAttribute("aria-label", name + " chapter " + i);
      grid.appendChild(a);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildGrid);
  } else {
    buildGrid();
  }
})();
