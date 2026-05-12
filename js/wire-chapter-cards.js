(function () {
  const BOOKS = {
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
  };

  function getBookSlug() {
    const fromBody = document.body && document.body.dataset ? document.body.dataset.book : "";
    if (fromBody) return fromBody;

    const file = location.pathname.split("/").pop() || "";
    return file.replace(/\.html$/i, "").toLowerCase();
  }

  function buildGrid() {
    const grid = document.getElementById("chapGrid");
    if (!grid) return;

    const slug = getBookSlug();
    const book = BOOKS[slug];

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
      a.href = "/tanakh/chapter.html?book=" + encodeURIComponent(slug) + "&ch=" + i;
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
