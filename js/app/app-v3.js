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
      <div class="sj-precept-meta">
        <p class="sj-precept-theme">
          ${escapeHTML(precept.theme || "Scripture")}
        </p>

        <span class="sj-precept-reference">
          ${escapeHTML(precept.reference || "")}
        </span>
      </div>

      <blockquote class="sj-precept-text">
        “${escapeHTML(precept.text || "")}”
      </blockquote>

      ${precept.prompt ? `
        <p class="sj-precept-prompt">
          ${escapeHTML(precept.prompt)}
        </p>
      ` : ""}
    </div>

    <div class="sj-precept-actions" aria-label="Precept actions">
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
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path>
        </svg>
        <span>Note</span>
      </button>

      <button
        type="button"
        data-precept-action="share"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <path d="m8.6 10.5 6.8-4"></path>
          <path d="m8.6 13.5 6.8 4"></path>
        </svg>
        <span>Share</span>
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
    const title = cleanText(
      card.querySelector("h2, h3")?.textContent
    );

    const excerpt = cleanText(
      card.querySelector("p.muted, p")?.textContent
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
  ?.addEventListener("click", () => {
    const composer = document.querySelector(
      "[data-home-ask-compose]"
    );

    if(!composer) return;

    composer.hidden = false;

    document
      .getElementById("sj-home-ask-input")
      ?.focus();
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
loadPreceptVideos();
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
  const root = bibleBrowserContent();

  if(!root || !scriptureCanonData) return;

  bibleBrowserStage = "canons";

  selectedBibleCanon = null;
  selectedBibleBook = null;

  const title = bibleStageTitle();
  const kicker = bibleStageKicker();
  const back = bibleBackButton();

  if(title){
    title.textContent = "Select a canon";
  }

  if(kicker){
    kicker.textContent = "Israelite Writings";
  }

  if(back){
    back.hidden = true;
  }

  root.innerHTML = `
    <div class="sj-canon-list">
      ${scriptureCanonData.canons.map(
        canon => `
          <button
            class="sj-canon-card"
            type="button"
            data-bible-canon="${escapeHTML(canon.slug)}"
          >
            <span class="sj-canon-card-copy">
              <strong>
                ${escapeHTML(canon.name)}
              </strong>

              <small>
                ${canon.books.length} books
              </small>
            </span>

            <span
              class="sj-canon-card-arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;
}


function renderBibleBooks(canonSlug){
  const root = bibleBrowserContent();
  const canon = getBibleCanon(canonSlug);

  if(!root || !canon) return;

  bibleBrowserStage = "books";
  selectedBibleCanon = canon.slug;
  selectedBibleBook = null;

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
    kicker.textContent = `${canon.name} · Select a chapter`;
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
    selectedBibleChapter = Number(
      chapterButton.dataset.bibleChapter
    );

    saveBibleLocation();

    document
      .querySelectorAll(
        "[data-bible-chapter]"
      )
      .forEach(button => {
        button.classList.toggle(
          "is-selected",
          Number(
            button.dataset.bibleChapter
          ) === selectedBibleChapter
        );
      });

    const book = getBibleBook(
      selectedBibleCanon,
      selectedBibleBook
    );

    const status = document.querySelector(
      "[data-bible-chapter-status]"
    );

    if(status && book){
      status.textContent =
        `${book.name} ${selectedBibleChapter} selected.`;
    }

    setBibleNotice(
      book
        ? `${book.name} ${selectedBibleChapter}`
        : ""
    );
  }
}


function goBackInBibleBrowser(){
  if(bibleBrowserStage === "chapters"){
    renderBibleBooks(
      selectedBibleCanon
    );

    return;
  }

  if(bibleBrowserStage === "books"){
    renderBibleCanons();
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
  ?.addEventListener(
    "click",
    renderBibleCanons
  );


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
