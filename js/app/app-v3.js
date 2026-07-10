const screens = Array.from(
  document.querySelectorAll("[data-v3-screen]")
);

const navButtons = Array.from(
  document.querySelectorAll("[data-v3-nav]")
);

const validScreens = new Set(
  screens.map(screen => screen.dataset.v3Screen)
);


function escapeHTML(value = ""){
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


async function fetchJSON(url){
  const response = await fetch(url);

  if(!response.ok){
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}


function showScreen(name, options = {}){
  const { updateHash = true } = options;

  if(!validScreens.has(name)){
    name = "home";
  }

  screens.forEach(screen => {
    const isActive = screen.dataset.v3Screen === name;

    screen.hidden = !isActive;
    screen.classList.toggle("is-active", isActive);
  });

  navButtons.forEach(button => {
    const isActive = button.dataset.v3Nav === name;

    button.classList.toggle("is-active", isActive);

    if(isActive){
      button.setAttribute("aria-current", "page");
    }else{
      button.removeAttribute("aria-current");
    }
  });

  if(updateHash){
    history.replaceState(null, "", `#${name}`);
  }

  window.scrollTo({
    top:0,
    left:0,
    behavior:"instant"
  });
}


navButtons.forEach(button => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.v3Nav);
  });
});


window.addEventListener("hashchange", () => {
  const requested = location.hash.replace("#", "");

  showScreen(requested, {
    updateHash:false
  });
});


const initialScreen = location.hash.replace("#", "");

showScreen(
  validScreens.has(initialScreen)
    ? initialScreen
    : "home",
  { updateHash:false }
);


/* =========================================================
   Home: Precept Verse
   ========================================================= */

const PRECEPT_LIKES_KEY = "sj_v3_precept_likes_v1";
const PRECEPT_NOTES_KEY = "sj_v3_precept_notes_v1";

let currentPrecept = null;


function readObjectStorage(key){
  try{
    const value = JSON.parse(localStorage.getItem(key) || "{}");

    return value && typeof value === "object"
      ? value
      : {};
  }catch(error){
    console.warn(`Could not read ${key}.`, error);
    return {};
  }
}


function writeObjectStorage(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
  }catch(error){
    console.warn(`Could not write ${key}.`, error);
  }
}


function preceptKey(precept){
  return String(precept?.reference || "daily-precept")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}


function renderPrecept(precept){
  const root = document.getElementById("sj-home-precept");

  if(!root) return;

  currentPrecept = precept;

  const key = preceptKey(precept);
  const likes = readObjectStorage(PRECEPT_LIKES_KEY);
  const notes = readObjectStorage(PRECEPT_NOTES_KEY);

  root.innerHTML = `
    <div class="sj-precept-content">
      <p class="sj-precept-label">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v17H6.5A3.5 3.5 0 0 0 3 22Z"></path>
          <path d="M21 5.5A3.5 3.5 0 0 0 17.5 2H13v17h4.5A3.5 3.5 0 0 1 21 22Z"></path>
        </svg>

        <span>Verse of the Day</span>
      </p>

      <span class="sj-precept-reference">
        ${escapeHTML(precept.reference || "")}
      </span>

      <blockquote class="sj-precept-text">
        ${escapeHTML(precept.text || "")}
      </blockquote>

      ${precept.prompt ? `
        <p class="sj-precept-prompt">
          ${escapeHTML(precept.prompt)}
        </p>
      ` : ""}
    </div>

    <div class="sj-precept-actions" aria-label="Verse actions">
      <button
        type="button"
        data-precept-action="like"
        class="${likes[key] ? "is-active" : ""}"
        aria-pressed="${likes[key] ? "true" : "false"}"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"></path>
        </svg>
        <span>Like</span>
      </button>

      <button
        type="button"
        data-precept-action="note"
        class="${notes[key] ? "is-active" : ""}"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h9l4 4v14H6Z"></path>
          <path d="M14 3v5h5"></path>
          <path d="M9 12h6"></path>
          <path d="M9 16h6"></path>
        </svg>
        <span>Note</span>
      </button>

      <button
        type="button"
        data-precept-action="comment"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path>
        </svg>
        <span>Comment</span>
      </button>

      <button
        type="button"
        data-precept-action="share"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16V3"></path>
          <path d="m7 8 5-5 5 5"></path>
          <path d="M5 12v9h14v-9"></path>
        </svg>
        <span>Share</span>
      </button>
    </div>

    <div class="sj-precept-daily">
      <button
        type="button"
        data-precept-action="daily"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
          <path d="M10 21h4"></path>
        </svg>

        <span>Send Me This Daily</span>
      </button>
    </div>
  `;
}


async function loadDailyPrecept(){
  const root = document.getElementById("sj-home-precept");

  if(!root) return;

  try{
    const precepts = await fetchJSON("/data/app/daily-precepts.json");

    if(!Array.isArray(precepts) || !precepts.length){
      throw new Error("No daily precepts found");
    }

    const today = new Date();

    const dayNumber = Math.floor(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime() / 86400000
    );

    const precept = precepts[
      Math.abs(dayNumber) % precepts.length
    ];

    renderPrecept(precept);
  }catch(error){
    console.warn("Daily precept failed.", error);

    root.innerHTML = `
      <div class="sj-precept-content">
        <p class="sj-precept-theme">Scripture</p>
        <blockquote class="sj-precept-text">
          “For precept must be upon precept, precept upon precept;
          line upon line, line upon line; here a little, and there a little.”
        </blockquote>
        <span class="sj-precept-reference">Isaiah 28:10</span>
      </div>
    `;
  }
}


document
  .getElementById("sj-home-precept")
  ?.addEventListener("click", async event => {
    const button = event.target.closest("[data-precept-action]");

    if(!button || !currentPrecept) return;

    const action = button.dataset.preceptAction;
    const key = preceptKey(currentPrecept);

    if(action === "like"){
      const likes = readObjectStorage(PRECEPT_LIKES_KEY);
      const nextState = !likes[key];

      if(nextState){
        likes[key] = true;
      }else{
        delete likes[key];
      }

      writeObjectStorage(PRECEPT_LIKES_KEY, likes);

      button.classList.toggle("is-active", nextState);
      button.setAttribute("aria-pressed", String(nextState));

      return;
    }

    if(action === "note"){
      const notes = readObjectStorage(PRECEPT_NOTES_KEY);
      const existing = notes[key] || "";

      const note = window.prompt(
        `Your note for ${currentPrecept.reference}`,
        existing
      );

      if(note === null) return;

      const cleaned = note.trim();

      if(cleaned){
        notes[key] = cleaned;
      }else{
        delete notes[key];
      }

      writeObjectStorage(PRECEPT_NOTES_KEY, notes);
      button.classList.toggle("is-active", Boolean(cleaned));

      return;
    }

    if(action === "comment"){
      window.alert(
        "Community comments are coming soon. No public comment was posted."
      );

      return;
    }

    if(action === "daily"){
      window.alert(
        "Daily verse reminders are coming soon. No notification was scheduled yet."
      );

      return;
    }

    if(action === "share"){
      const text =
        `${currentPrecept.reference} — ${currentPrecept.text}`;

      const shareData = {
        title:`${currentPrecept.reference} | Semitic Jew Institute`,
        text
      };

      if(navigator.share){
        try{
          await navigator.share(shareData);
          return;
        }catch(error){
          if(error.name === "AbortError") return;
        }
      }

      try{
        await navigator.clipboard.writeText(text);
        window.alert("Precept copied to clipboard.");
      }catch(error){
        console.warn("Could not share precept.", error);
      }
    }
  });


/* =========================================================
   Home: Precept Upon Precept
   ========================================================= */

const SCRIPTURE_VIDEO_TERMS = [
  "bible",
  "scripture",
  "deuteronomy",
  "genesis",
  "exodus",
  "leviticus",
  "jesus",
  "christ",
  "messiah",
  "israelite",
  "israelites",
  "covenant",
  "ham",
  "psalm",
  "jeremiah",
  "isaiah",
  "god"
];


function isScriptureTeachingVideo(video){
  const title = String(video?.title || "").toLowerCase();

  return SCRIPTURE_VIDEO_TERMS.some(term =>
    title.includes(term)
  );
}


async function loadPreceptVideos(){
  const root = document.getElementById("sj-precept-videos");

  if(!root) return;

  try{
    const payload = await fetchJSON("/data/youtube-videos.json");

    const videos = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.videos)
        ? payload.videos
        : [];

    const scriptureVideos = videos
      .filter(isScriptureTeachingVideo)
      .slice(0, 5);

    if(!scriptureVideos.length){
      throw new Error("No Scripture teaching videos found");
    }

    root.innerHTML = scriptureVideos.map(video => `
      <a
        class="sj-video-card"
        href="${escapeHTML(video.url || "#")}"
        target="_blank"
        rel="noopener"
      >
        <div class="sj-video-frame">
          <img
            src="${escapeHTML(video.thumbnail || "")}"
            alt=""
            loading="lazy"
          >

          <span class="sj-video-play" aria-hidden="true">
            ▶
          </span>
        </div>

        <div class="sj-video-copy">
          <h3>${escapeHTML(video.title || "Scripture teaching")}</h3>
        </div>
      </a>
    `).join("");
  }catch(error){
    console.warn("Precept Upon Precept videos failed.", error);

    root.innerHTML = `
      <p class="sj-home-loading">
        Scripture teachings are temporarily unavailable.
      </p>
    `;
  }
}


/* =========================================================
   Home: Latest Article
   ========================================================= */

function cleanText(value = ""){
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}


async function loadLatestArticle(){
  const root = document.getElementById("sj-latest-article");

  if(!root) return;

  try{
    const response = await fetch("/articles.html");

    if(!response.ok){
      throw new Error(`articles.html returned ${response.status}`);
    }

    const html = await response.text();

    const doc = new DOMParser()
      .parseFromString(html, "text/html");

    const card = doc.querySelector(
      ".recent-grid .article-card"
    );

    if(!card){
      throw new Error("No recent article card found");
    }

    const link = card.querySelector('a[href*="/articles/"]');
    const image = card.querySelector("img");
    const title = decodeHTMLEntities(
      cleanText(
        card.querySelector("h2, h3")?.textContent
      )
    );

    const excerpt = decodeHTMLEntities(
      cleanText(
        card.querySelector("p.muted, p")?.textContent
      )
    );

    const href = link?.getAttribute("href");
    const imageSrc = image?.getAttribute("src");

    if(!href || !title){
      throw new Error("Incomplete latest article data");
    }

    root.innerHTML = `
      <a class="sj-latest-article-card" href="${escapeHTML(href)}">
        ${imageSrc ? `
          <div class="sj-latest-article-image">
            <img
              src="${escapeHTML(imageSrc)}"
              alt=""
              loading="lazy"
            >
          </div>
        ` : ""}

        <div class="sj-latest-article-copy">
          <span class="sj-article-label">Latest Article</span>
          <h3>${escapeHTML(title)}</h3>
          ${excerpt ? `<p>${escapeHTML(excerpt)}</p>` : ""}
        </div>
      </a>
    `;
  }catch(error){
    console.warn("Latest article failed.", error);

    root.innerHTML = `
      <a class="sj-latest-article-card" href="/articles.html">
        <div class="sj-latest-article-copy">
          <span class="sj-article-label">Articles</span>
          <h3>Read the latest from Semitic Jew.</h3>
        </div>
      </a>
    `;
  }
}


/* =========================================================
   Home: Ask composer
   ========================================================= */

const QUESTION_DRAFTS_KEY = "sj_v3_question_drafts_v1";

document
  .querySelector("[data-home-ask-open]")
  ?.addEventListener("click", event => {
    const button = event.currentTarget;

    const composer = document.querySelector(
      "[data-home-ask-compose]"
    );

    const label = button.querySelector(
      "[data-home-ask-toggle-label]"
    );

    if(!composer) return;

    const willOpen = composer.hidden;

    composer.hidden = !willOpen;

    button.classList.toggle(
      "is-open",
      willOpen
    );

    button.setAttribute(
      "aria-expanded",
      String(willOpen)
    );

    if(label){
      label.textContent = willOpen
        ? "Close Question"
        : "Write a Question";
    }

    if(willOpen){
      document
        .getElementById("sj-home-ask-input")
        ?.focus();
    }
  });


document
  .querySelector("[data-home-ask-save]")
  ?.addEventListener("click", () => {
    const input = document.getElementById(
      "sj-home-ask-input"
    );

    const status = document.querySelector(
      "[data-home-ask-status]"
    );

    const question = input?.value.trim() || "";

    if(!question){
      if(status){
        status.textContent = "Write a question first.";
      }

      return;
    }

    try{
      const drafts = JSON.parse(
        localStorage.getItem(QUESTION_DRAFTS_KEY) || "[]"
      );

      const safeDrafts = Array.isArray(drafts)
        ? drafts
        : [];

      safeDrafts.unshift({
        question,
        savedAt:new Date().toISOString()
      });

      localStorage.setItem(
        QUESTION_DRAFTS_KEY,
        JSON.stringify(safeDrafts.slice(0, 25))
      );

      if(status){
        status.textContent = "Question saved on this device.";
      }

      input.value = "";
    }catch(error){
      console.warn("Could not save question.", error);

      if(status){
        status.textContent = "Could not save this question.";
      }
    }
  });


/* =========================================================
   Initialize Home
   ========================================================= */

loadDailyPrecept();
loadLatestArticle();


/* =========================================================
   Build 3D — Bible canon / book / chapter navigation
   ========================================================= */

const SCRIPTURE_CANON_URL =
  "/data/app/scripture-canon.json";

const READER_LOCATION_KEY =
  "sj_v3_reader_location_v1";

const READER_FONT_KEY =
  "sj_v3_reader_font_size_v1";

const READER_FONT_SIZES = [
  "base",
  "large",
  "xlarge"
];

let scriptureCanonData = null;

let bibleBrowserStage = "canons";
let selectedBibleCanon = null;
let selectedBibleBook = null;
let selectedBibleChapter = null;


function bibleCanonMenu(){
  return document.querySelector(
    "[data-biblia-canon-menu]"
  );
}


function bibleBrowserShell(){
  return document.querySelector(
    "[data-bible-browser]"
  );
}


function hideBibleCanonMenu(){
  const menu = bibleCanonMenu();

  if(menu){
    menu.hidden = true;
  }
}


function bibleBrowserContent(){
  return document.querySelector(
    "[data-bible-browser-content]"
  );
}


function bibleStageTitle(){
  return document.querySelector(
    "[data-bible-stage-title]"
  );
}


function bibleStageKicker(){
  return document.querySelector(
    "[data-bible-stage-kicker]"
  );
}


function bibleBackButton(){
  return document.querySelector(
    "[data-bible-back]"
  );
}


function setBibleNotice(message = ""){
  const notice = document.querySelector(
    "[data-bible-notice]"
  );

  if(notice){
    notice.textContent = message;
  }
}


function getBibleCanon(slug){
  return scriptureCanonData?.canons?.find(
    canon => canon.slug === slug
  ) || null;
}


function getBibleBook(canonSlug, bookSlug){
  const canon = getBibleCanon(canonSlug);

  return canon?.books?.find(
    book => book.slug === bookSlug
  ) || null;
}


function saveBibleLocation(){
  if(
    !selectedBibleCanon ||
    !selectedBibleBook ||
    !selectedBibleChapter
  ){
    return;
  }

  try{
    localStorage.setItem(
      READER_LOCATION_KEY,
      JSON.stringify({
        canon:selectedBibleCanon,
        book:selectedBibleBook,
        chapter:selectedBibleChapter,
        savedAt:new Date().toISOString()
      })
    );
  }catch(error){
    console.warn(
      "Could not save Bible location.",
      error
    );
  }
}


function readBibleLocation(){
  try{
    const stored = JSON.parse(
      localStorage.getItem(
        READER_LOCATION_KEY
      ) || "null"
    );

    if(
      stored &&
      typeof stored === "object"
    ){
      return stored;
    }
  }catch(error){
    console.warn(
      "Could not restore Bible location.",
      error
    );
  }

  return null;
}


function renderBibleCanons(){
  const menu = bibleCanonMenu();

  if(!menu || !scriptureCanonData) return;

  bibleBrowserStage = "canons";

  selectedBibleCanon = null;
  selectedBibleBook = null;
  selectedBibleChapter = null;

  const browser = bibleBrowserShell();

  if(browser){
    browser.hidden = true;
  }

  updateBibliaPath();

  menu.innerHTML = `
    <div class="sj-canon-menu-list">
      ${scriptureCanonData.canons.map(
        canon => `
          <button
            class="sj-canon-menu-option"
            type="button"
            data-bible-canon="${escapeHTML(canon.slug)}"
          >
            <span>
              <strong>
                ${escapeHTML(canon.name)}
              </strong>
            </span>

            <span>
              ${canon.books.length} books
            </span>

            <span
              class="sj-canon-menu-option-arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;

  menu.hidden = false;
}


function renderBibleBooks(canonSlug){
  const root = bibleBrowserContent();
  const canon = getBibleCanon(canonSlug);

  if(!root || !canon) return;

  bibleBrowserStage = "books";

  selectedBibleCanon = canon.slug;
  selectedBibleBook = null;
  selectedBibleChapter = null;

  hideBibleCanonMenu();

  const browser = bibleBrowserShell();

  if(browser){
    browser.hidden = false;
  }

  updateBibliaPath();

  const title = bibleStageTitle();
  const kicker = bibleStageKicker();
  const back = bibleBackButton();

  if(title){
    title.textContent = canon.name;
  }

  if(kicker){
    kicker.textContent = "Select a book";
  }

  if(back){
    back.hidden = false;
  }

  root.innerHTML = `
    <div class="sj-book-list">
      ${canon.books.map(
        book => `
          <button
            class="sj-book-row"
            type="button"
            data-bible-book="${escapeHTML(book.slug)}"
          >
            <strong>
              ${escapeHTML(book.name)}
            </strong>

            <span class="sj-book-row-meta">
              <span>
                ${book.chapters}
                ${book.chapters === 1 ? "chapter" : "chapters"}
              </span>

              <span
                class="sj-book-row-arrow"
                aria-hidden="true"
              >
                ›
              </span>
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;
}


function renderBibleChapters(
  canonSlug,
  bookSlug
){
  const root = bibleBrowserContent();

  const canon = getBibleCanon(canonSlug);

  const book = getBibleBook(
    canonSlug,
    bookSlug
  );

  if(!root || !canon || !book) return;

  bibleBrowserStage = "chapters";

  selectedBibleCanon = canon.slug;
  selectedBibleBook = book.slug;

  hideBibleCanonMenu();

  const browser = bibleBrowserShell();

  if(browser){
    browser.hidden = false;
  }

  updateBibliaPath();

  const savedLocation = readBibleLocation();

  selectedBibleChapter =
    savedLocation?.canon === canon.slug &&
    savedLocation?.book === book.slug
      ? Number(savedLocation.chapter)
      : null;

  const title = bibleStageTitle();
  const kicker = bibleStageKicker();
  const back = bibleBackButton();

  if(title){
    title.textContent = book.name;
  }

  if(kicker){
    kicker.textContent =
      `${canon.name} · Select a chapter`;
  }

  if(back){
    back.hidden = false;
  }

  const chapterButtons = Array.from(
    { length:book.chapters },
    (_, index) => index + 1
  ).map(chapter => `
    <button
      class="sj-chapter-button${
        selectedBibleChapter === chapter
          ? " is-selected"
          : ""
      }"
      type="button"
      data-bible-chapter="${chapter}"
      aria-label="${
        escapeHTML(book.name)
      } chapter ${chapter}"
    >
      ${chapter}
    </button>
  `).join("");

  root.innerHTML = `
    <div class="sj-chapter-grid">
      ${chapterButtons}
    </div>

    <p
      class="sj-chapter-selection-status"
      data-bible-chapter-status
    >
      ${
        selectedBibleChapter
          ? `${escapeHTML(book.name)} ${selectedBibleChapter} selected.`
          : "Select a chapter."
      }
    </p>
  `;
}


function bibleChapterDataURL(
  book,
  chapter
){
  return [
    "",
    "data",
    book.dataCanon,
    book.dataSlug,
    `${chapter}.json`
  ].join("/");
}


function renderBibleReaderLoading(
  book,
  chapter
){
  const root = bibleBrowserContent();

  if(!root) return;

  root.innerHTML = `
    <section
      class="sj-scripture-reader sj-scripture-reader-loading"
      aria-live="polite"
    >
      <div class="sj-reader-loading-mark" aria-hidden="true"></div>

      <p>
        Loading
        ${escapeHTML(book.name)}
        ${chapter}...
      </p>
    </section>
  `;
}


function renderBibleReaderError(
  book,
  chapter
){
  const root = bibleBrowserContent();

  if(!root) return;

  root.innerHTML = `
    <section
      class="sj-scripture-reader sj-scripture-reader-error"
      role="alert"
    >
      <h2>
        Unable to load
        ${escapeHTML(book.name)}
        ${chapter}
      </h2>

      <p>
        This chapter could not be loaded right now.
      </p>

      <button
        class="sj-reader-retry-button"
        type="button"
        data-reader-chapter="${chapter}"
      >
        Try Again
      </button>
    </section>
  `;
}


function renderBibleReader(
  canon,
  book,
  chapter,
  payload
){
  const root = bibleBrowserContent();

  if(!root) return;

  const verses = Array.isArray(payload?.verses)
    ? payload.verses
    : [];

  const previousChapter =
    chapter > 1
      ? chapter - 1
      : null;

  const nextChapter =
    chapter < book.chapters
      ? chapter + 1
      : null;

  const verseHTML = verses.map(verse => {
    const verseNumber = Number(verse.v);

    const strongs = Array.isArray(verse.s)
      ? verse.s
      : [];

    return `
      <p
        class="sj-reader-verse"
        id="verse-${verseNumber}"
        data-reader-verse="${verseNumber}"
        data-reader-strongs="${escapeHTML(
          strongs.join(",")
        )}"
        tabindex="0"
      >
        <sup class="sj-reader-verse-number">
          ${verseNumber}
        </sup>

        <span class="sj-reader-verse-text">
          ${escapeHTML(verse.t || "")}
        </span>
      </p>
    `;
  }).join("");

  root.innerHTML = `
    <article
      class="sj-scripture-reader"
      aria-labelledby="sj-bible-stage-title"
    >
      <nav
        class="sj-reader-chapter-nav sj-reader-chapter-nav-top"
        aria-label="Chapter navigation"
      >
        ${
          previousChapter
            ? `
              <button
                type="button"
                data-reader-chapter="${previousChapter}"
                aria-label="Read ${escapeHTML(book.name)} chapter ${previousChapter}"
              >
                <span aria-hidden="true">‹</span>
                <span>Chapter ${previousChapter}</span>
              </button>
            `
            : `
              <span
                class="sj-reader-nav-spacer"
                aria-hidden="true"
              ></span>
            `
        }

        <button
          class="sj-reader-chapter-picker"
          type="button"
          data-reader-show-chapters
          aria-label="Choose another chapter"
        >
          ${chapter}
        </button>

        ${
          nextChapter
            ? `
              <button
                type="button"
                data-reader-chapter="${nextChapter}"
                aria-label="Read ${escapeHTML(book.name)} chapter ${nextChapter}"
              >
                <span>Chapter ${nextChapter}</span>
                <span aria-hidden="true">›</span>
              </button>
            `
            : `
              <span
                class="sj-reader-nav-spacer"
                aria-hidden="true"
              ></span>
            `
        }
      </nav>

      <div class="sj-reader-verses">
        ${
          verseHTML || `
            <p class="sj-reader-empty">
              No verse text was found for this chapter.
            </p>
          `
        }
      </div>

      <nav
        class="sj-reader-chapter-nav sj-reader-chapter-nav-bottom"
        aria-label="Chapter navigation"
      >
        ${
          previousChapter
            ? `
              <button
                type="button"
                data-reader-chapter="${previousChapter}"
              >
                <span aria-hidden="true">‹</span>
                <span>Previous</span>
              </button>
            `
            : `
              <span
                class="sj-reader-nav-spacer"
                aria-hidden="true"
              ></span>
            `
        }

        <button
          class="sj-reader-chapter-picker"
          type="button"
          data-reader-show-chapters
        >
          ${escapeHTML(book.name)} ${chapter}
        </button>

        ${
          nextChapter
            ? `
              <button
                type="button"
                data-reader-chapter="${nextChapter}"
              >
                <span>Next</span>
                <span aria-hidden="true">›</span>
              </button>
            `
            : `
              <span
                class="sj-reader-nav-spacer"
                aria-hidden="true"
              ></span>
            `
        }
      </nav>
    </article>
  `;
}


async function openBibleReader(
  canonSlug,
  bookSlug,
  chapter
){
  const canon = getBibleCanon(canonSlug);

  const book = getBibleBook(
    canonSlug,
    bookSlug
  );

  const chapterNumber = Number(chapter);

  if(
    !canon ||
    !book ||
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > book.chapters
  ){
    return;
  }

  bibleBrowserStage = "reader";

  selectedBibleCanon = canon.slug;
  selectedBibleBook = book.slug;
  selectedBibleChapter = chapterNumber;

  saveBibleLocation();
  hideBibleCanonMenu();

  const browser = bibleBrowserShell();

  if(browser){
    browser.hidden = false;
  }

  const title = bibleStageTitle();
  const kicker = bibleStageKicker();
  const back = bibleBackButton();

  if(title){
    title.textContent = book.name;
  }

  if(kicker){
    kicker.textContent = canon.name;
  }

  if(back){
    back.hidden = false;
  }

  updateBibliaPath();

  renderBibleReaderLoading(
    book,
    chapterNumber
  );

  try{
    const payload = await fetchJSON(
      bibleChapterDataURL(
        book,
        chapterNumber
      )
    );

    if(
      selectedBibleCanon !== canon.slug ||
      selectedBibleBook !== book.slug ||
      selectedBibleChapter !== chapterNumber
    ){
      return;
    }

    renderBibleReader(
      canon,
      book,
      chapterNumber,
      payload
    );

    setBibleNotice(
      `${book.name} ${chapterNumber}`
    );

    window.scrollTo({
      top:0,
      behavior:"smooth"
    });
  }catch(error){
    console.warn(
      "Scripture chapter failed to load.",
      error
    );

    renderBibleReaderError(
      book,
      chapterNumber
    );
  }
}


function handleBibleBrowserClick(event){
  const canonButton = event.target.closest(
    "[data-bible-canon]"
  );

  if(canonButton){
    renderBibleBooks(
      canonButton.dataset.bibleCanon
    );

    return;
  }


  const bookButton = event.target.closest(
    "[data-bible-book]"
  );

  if(bookButton && selectedBibleCanon){
    renderBibleChapters(
      selectedBibleCanon,
      bookButton.dataset.bibleBook
    );

    return;
  }


  const chapterButton = event.target.closest(
    "[data-bible-chapter]"
  );

  if(
    chapterButton &&
    selectedBibleCanon &&
    selectedBibleBook
  ){
    openBibleReader(
      selectedBibleCanon,
      selectedBibleBook,
      Number(chapterButton.dataset.bibleChapter)
    );

    return;
  }


  const readerChapterButton = event.target.closest(
    "[data-reader-chapter]"
  );

  if(
    readerChapterButton &&
    selectedBibleCanon &&
    selectedBibleBook
  ){
    openBibleReader(
      selectedBibleCanon,
      selectedBibleBook,
      Number(readerChapterButton.dataset.readerChapter)
    );

    return;
  }
}


function goBackInBibleBrowser(){
  if(
    bibleBrowserStage === "reader" &&
    selectedBibleCanon &&
    selectedBibleBook
  ){
    renderBibleChapters(
      selectedBibleCanon,
      selectedBibleBook
    );

    return;
  }


  if(bibleBrowserStage === "chapters"){
    renderBibleBooks(
      selectedBibleCanon
    );

    return;
  }

  if(bibleBrowserStage === "books"){
    const browser = bibleBrowserShell();
    const menu = bibleCanonMenu();

    if(browser){
      browser.hidden = true;
    }

    if(menu){
      menu.hidden = true;
    }

    updateBibliaPath();
  }
}


function restoreReaderFontPreference(){
  let savedSize = "base";

  try{
    const stored = localStorage.getItem(
      READER_FONT_KEY
    );

    if(
      READER_FONT_SIZES.includes(stored)
    ){
      savedSize = stored;
    }
  }catch(error){
    console.warn(
      "Could not restore reader font size.",
      error
    );
  }

  document.documentElement.dataset.sjReaderFont =
    savedSize;
}


function cycleReaderFontPreference(){
  const current =
    document.documentElement.dataset.sjReaderFont ||
    "base";

  const currentIndex =
    READER_FONT_SIZES.indexOf(current);

  const next =
    READER_FONT_SIZES[
      (currentIndex + 1) %
      READER_FONT_SIZES.length
    ];

  document.documentElement.dataset.sjReaderFont =
    next;

  try{
    localStorage.setItem(
      READER_FONT_KEY,
      next
    );
  }catch(error){
    console.warn(
      "Could not save reader font size.",
      error
    );
  }

  const label = {
    base:"Standard",
    large:"Large",
    xlarge:"Extra large"
  }[next];

  setBibleNotice(
    `Reader text size: ${label}.`
  );
}


async function loadBibleBrowser(){
  const root = bibleBrowserContent();

  if(!root) return;

  try{
    scriptureCanonData = await fetchJSON(
      SCRIPTURE_CANON_URL
    );

    if(
      !Array.isArray(
        scriptureCanonData?.canons
      )
    ){
      throw new Error(
        "Invalid Scripture canon metadata."
      );
    }

    renderBibleCanons();
  }catch(error){
    console.warn(
      "Bible navigation failed.",
      error
    );

    root.innerHTML = `
      <p class="sj-home-loading">
        Israelite Writings are temporarily unavailable.
      </p>
    `;
  }
}


document
  .querySelector("[data-bible-browser-content]")
  ?.addEventListener(
    "click",
    event => {
      const chapterPicker = event.target.closest(
        "[data-reader-show-chapters]"
      );

      if(
        chapterPicker &&
        selectedBibleCanon &&
        selectedBibleBook
      ){
        renderBibleChapters(
          selectedBibleCanon,
          selectedBibleBook
        );

        return;
      }

      handleBibleBrowserClick(event);
    }
  );


document
  .querySelector("[data-biblia-canon-menu]")
  ?.addEventListener(
    "click",
    handleBibleBrowserClick
  );




document
  .querySelector("[data-bible-back]")
  ?.addEventListener(
    "click",
    goBackInBibleBrowser
  );


document
  .querySelector("[data-bible-open-canons]")
  ?.addEventListener("click", () => {
    const menu = bibleCanonMenu();

    const moreMenu = document.querySelector(
      "[data-bible-more-menu]"
    );

    if(!menu || !scriptureCanonData) return;

    if(moreMenu){
      moreMenu.hidden = true;
    }

    if(menu.hidden){
      renderBibleCanons();
    }else{
      hideBibleCanonMenu();
    }
  });


document
  .querySelector("[data-bible-version]")
  ?.addEventListener("click", () => {
    setBibleNotice(
      "KJV is the available Scripture version in this build."
    );
  });


document
  .querySelector("[data-bible-font]")
  ?.addEventListener(
    "click",
    cycleReaderFontPreference
  );


restoreReaderFontPreference();
loadBibleBrowser();


/* =========================================================
   Build 3D.1 — Home greeting, podcast, refined actions
   ========================================================= */

const PODCAST_DATA_URL =
  "/data/youtube-podcast-videos.json";

const APPLE_PODCASTS_URL =
  "https://podcasts.apple.com/us/podcast/semitic-jew/id1693178004";

const SPOTIFY_PODCAST_URL =
  "https://open.spotify.com/show/0GvSSHiBeVAmvHMIXP6lOi";


function setHomeDaypart(){
  const target = document.querySelector(
    "[data-home-daypart]"
  );

  if(!target) return;

  const hour = new Date().getHours();

  let daypart = "Evening";

  if(hour >= 5 && hour < 12){
    daypart = "Morning";
  }else if(hour >= 12 && hour < 17){
    daypart = "Afternoon";
  }

  target.textContent = daypart;
}


function decodeHTMLEntities(value = ""){
  const textarea = document.createElement("textarea");

  textarea.innerHTML = value;

  return textarea.value;
}


function updateBibliaPath(){
  const root = document.querySelector(
    "[data-biblia-path]"
  );

  if(!root) return;

  const canon = selectedBibleCanon
    ? getBibleCanon(selectedBibleCanon)
    : null;

  const book =
    selectedBibleCanon && selectedBibleBook
      ? getBibleBook(
          selectedBibleCanon,
          selectedBibleBook
        )
      : null;

  if(book && canon){
    root.innerHTML = `
      <span class="is-accent">
        ${escapeHTML(canon.name)}
      </span>

      <span aria-hidden="true">›</span>

      <span>
        ${escapeHTML(book.name)}
      </span>
    `;

    return;
  }

  if(canon){
    root.innerHTML = `
      <span class="is-accent">
        ${escapeHTML(canon.name)}
      </span>
    `;

    return;
  }

  root.innerHTML = `
    <span>Israelite Writings</span>
  `;
}


async function loadLatestPodcast(){
  const root = document.getElementById(
    "sj-latest-podcast"
  );

  if(!root) return;

  try{
    const payload = await fetchJSON(
      PODCAST_DATA_URL
    );

    const videos = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.videos)
        ? payload.videos
        : [];

    const episode = videos[0];

    if(!episode){
      throw new Error(
        "No podcast episodes found."
      );
    }

    const title = String(episode.title || "")
      .replace(/^EP\s*/i, "EP ")
      .trim();

    root.innerHTML = `
      <article class="sj-podcast-card">
        <div class="sj-podcast-art">
          <img
            src="${escapeHTML(episode.thumbnail || "")}"
            alt=""
            loading="lazy"
          >
        </div>

        <div class="sj-podcast-copy">
          <span class="sj-podcast-label">
            Latest Episode
          </span>

          <h3>${escapeHTML(title)}</h3>

          <div class="sj-podcast-actions">
            <button
              type="button"
              data-podcast-play
              data-podcast-embed="${escapeHTML(
                episode.embed || ""
              )}"
            >
              <span aria-hidden="true">▶</span>
              Play
            </button>

            <a
              href="${APPLE_PODCASTS_URL}"
              target="_blank"
              rel="noopener"
            >
              Apple
            </a>

            <a
              href="${SPOTIFY_PODCAST_URL}"
              target="_blank"
              rel="noopener"
            >
              Spotify
            </a>
          </div>

          <div
            class="sj-podcast-player"
            data-podcast-player
            hidden
          ></div>
        </div>
      </article>
    `;
  }catch(error){
    console.warn(
      "Latest podcast failed.",
      error
    );

    root.innerHTML = `
      <p class="sj-home-loading">
        The latest podcast episode is temporarily unavailable.
      </p>
    `;
  }
}


document.addEventListener("click", event => {
  const podcastButton = event.target.closest(
    "[data-podcast-play]"
  );

  if(podcastButton){
    const player = document.querySelector(
      "[data-podcast-player]"
    );

    const embed = podcastButton.dataset.podcastEmbed;

    if(!player || !embed) return;

    if(player.hidden){
      const joiner = embed.includes("?")
        ? "&"
        : "?";

      player.innerHTML = `
        <iframe
          src="${escapeHTML(
            `${embed}${joiner}autoplay=1`
          )}"
          title="Semitic Jew Podcast"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;

      player.hidden = false;

      podcastButton.innerHTML = `
        <span aria-hidden="true">■</span>
        Close
      `;
    }else{
      player.hidden = true;
      player.innerHTML = "";

      podcastButton.innerHTML = `
        <span aria-hidden="true">▶</span>
        Play
      `;
    }

    return;
  }


  const placeholderReel = event.target.closest(
    "[data-placeholder-reel]"
  );

  if(placeholderReel){
    const status = document.querySelector(
      "[data-precept-placeholder-status]"
    );

    if(status){
      status.textContent =
        "Precept Upon Precept reel teachings are coming soon.";
    }

    return;
  }


  if(event.target.closest("[data-precept-see-all]")){
    const status = document.querySelector(
      "[data-precept-placeholder-status]"
    );

    if(status){
      status.textContent =
        "The complete Precept Upon Precept library is coming soon.";
    }
  }
});


document
  .querySelector("[data-bible-search]")
  ?.addEventListener("click", () => {
    setBibleNotice(
      "Scripture search will be connected in a later reader batch."
    );
  });


document
  .querySelector("[data-bible-more]")
  ?.addEventListener("click", event => {
    event.stopPropagation();

    const menu = document.querySelector(
      "[data-bible-more-menu]"
    );

    const canonMenu = bibleCanonMenu();

    if(!menu) return;

    if(canonMenu){
      canonMenu.hidden = true;
    }

    menu.hidden = !menu.hidden;
  });


setHomeDaypart();
loadLatestPodcast();
updateBibliaPath();


document.addEventListener("click", event => {
  const moreMenu = document.querySelector(
    "[data-bible-more-menu]"
  );

  if(
    !moreMenu ||
    moreMenu.hidden ||
    event.target.closest("[data-bible-more]") ||
    event.target.closest("[data-bible-more-menu]")
  ){
    return;
  }

  moreMenu.hidden = true;
});
