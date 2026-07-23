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

  if(name !== "bible"){
    closeReaderActionTray();
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

  if(name === "bible"){
    resumeHomeChapterTracker();
  }else{
    pauseHomeChapterTracker();
  }

  if(name === "home"){
    renderHomeStudyOnHomeEntry();
    refreshAppContentFeedIfNeeded();
  }

  if(name === "articles"){
    refreshAppContentFeedIfNeeded();
  }

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
    const screen = button.dataset.v3Nav;

    showScreen(screen);

    if(screen === "bible"){
      openDailyPreceptInBible();
    }
  });
});


window.addEventListener("hashchange", () => {
  const requested = location.hash.replace("#", "");

  showScreen(requested, {
    updateHash:false
  });
});


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


function updateHomeDaypartGreeting(){
  const target = document.querySelector(
    "[data-home-daypart]"
  );

  if(!target){
    return;
  }

  const hour = new Date().getHours();

  let greeting = "Good Evening.";

  if(hour < 12){
    greeting = "Good Morning.";
  }else if(hour < 17){
    greeting = "Good Afternoon.";
  }

  target.textContent = greeting;
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
        <svg
          class="sj-precept-books-icon"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <rect
            x="3.5"
            y="6"
            width="7"
            height="21"
            rx="2"
            fill="currentColor"
            stroke="none"
          ></rect>
          <rect
            x="12.5"
            y="3.5"
            width="7"
            height="23.5"
            rx="2"
            fill="currentColor"
            stroke="none"
          ></rect>
          <rect
            x="21.5"
            y="7.5"
            width="7"
            height="19.5"
            rx="2"
            fill="currentColor"
            stroke="none"
          ></rect>
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

        <span>Remind Me Daily</span>
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
   Home: Line Upon Line
   ========================================================= */

const HOME_SCRIPTURE_LESSONS = [
  {
    id:"001-precept-upon-precept",
    reference:"Isaiah 28:9–10",
    title:"What Does “Precept Upon Precept” Mean?",
    duration:"2–3 min",
    video:"/media/scripture-explained/001-precept-upon-precept.mp4",
    poster:"/images/app/scripture-explained/001-precept-upon-precept.jpg"
  },
  {
    id:"002-did-god-choose-every-nation",
    reference:"Amos 3:2",
    title:"Did God Choose Every Nation?",
    duration:"2–3 min",
    video:"/media/scripture-explained/002-did-god-choose-every-nation.mp4",
    poster:"/images/app/scripture-explained/002-did-god-choose-every-nation.jpg"
  },
  {
    id:"003-israel-lose-identity",
    reference:"Deuteronomy 28:64",
    title:"Did God Prophesy Israel Would Lose Their Identity?",
    duration:"2–3 min",
    video:"/media/scripture-explained/003-israel-lose-identity.mp4",
    poster:"/images/app/scripture-explained/003-israel-lose-identity.jpg"
  }
];

const HOME_STUDY_PROGRESS_KEY =
  "sj_home_daily_study_progress_v1";

const HOME_STUDY_STREAK_KEY =
  "sj_home_daily_study_streak_v1";

const HOME_STUDY_PENDING_ANIMATION_KEY =
  "sj_home_study_pending_animation_v1";

const APP_CONTENT_FEED_REMOTE_URL =
  "https://semiticjew.org/data/app/content-feed.json";

const APP_CONTENT_FEED_LOCAL_URL =
  "/data/app/content-feed.json";

const APP_CONTENT_FEED_CACHE_KEY =
  "sj_app_content_feed_cache_v1";

const APP_CONTENT_FEED_REFRESH_MS =
  15 * 60 * 1000;

const APP_CONTENT_FEED_TIMEOUT_MS =
  8000;

let homeChapterObserver = null;
let homeChapterTracker = null;
let appContentFeedState = null;
let appContentFeedLoadedAt = 0;
let appContentFeedRequest = null;


function localDateKey(date = new Date()){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1)
    .padStart(2, "0");
  const day = String(date.getDate())
    .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function localDayNumber(date = new Date()){
  return Math.floor(
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ).getTime() / 86400000
  );
}


function localContentPath(value){
  const path = String(value || "")
    .split("#")[0]
    .split("?")[0];

  return path.startsWith("/") &&
    !path.startsWith("//");
}


function validAppContentURL(value){
  const url = cleanText(value);

  if(!url){
    return "";
  }

  if(localContentPath(url)){
    return url;
  }

  try{
    const parsed = new URL(url);

    return parsed.protocol === "https:"
      ? parsed.href
      : "";
  }catch(error){
    return "";
  }
}


function appContentSortNewest(items){
  return [...items].sort((first, second) => {
    const firstTime = Date.parse(
      first.publishedAt || ""
    ) || 0;
    const secondTime = Date.parse(
      second.publishedAt || ""
    ) || 0;

    return secondTime - firstTime;
  });
}


function fallbackAppContentFeed(){
  return {
    schemaVersion:1,
    updatedAt:"",
    articles:[],
    podcasts:[],
    lessons:HOME_SCRIPTURE_LESSONS.map(lesson => ({
      id:lesson.id,
      reference:lesson.reference,
      title:lesson.title,
      description:"",
      publishedAt:"",
      duration:lesson.duration,
      posterUrl:lesson.poster,
      videoUrl:lesson.video,
      poster:lesson.poster,
      video:lesson.video
    }))
  };
}


function normalizeContentArticle(entry){
  const id = cleanText(entry?.id);
  const title = cleanText(entry?.title);
  const articleUrl = validAppContentURL(
    entry?.articleUrl
  );

  if(!id || !title || !articleUrl){
    return null;
  }

  const imageUrl = validAppContentURL(
    entry?.imageUrl
  );

  return {
    id,
    title,
    excerpt:cleanText(entry?.excerpt),
    author:cleanText(entry?.author) || "Semitic Jew",
    publishedAt:cleanText(entry?.publishedAt),
    imageUrl,
    articleUrl,
    href:articleUrl,
    image:imageUrl
  };
}


function normalizeContentPodcast(entry){
  const id = cleanText(entry?.id);
  const title = cleanText(entry?.title);

  if(!id || !title){
    return null;
  }

  const imageUrl = validAppContentURL(
    entry?.imageUrl
  );
  const audioUrl = validAppContentURL(
    entry?.audioUrl
  );
  const episodeUrl = validAppContentURL(
    entry?.episodeUrl
  );

  if(entry?.audioUrl && !audioUrl){
    return null;
  }

  if(entry?.episodeUrl && !episodeUrl){
    return null;
  }

  return {
    id,
    title,
    description:cleanText(entry?.description),
    publishedAt:cleanText(entry?.publishedAt),
    duration:cleanText(entry?.duration),
    imageUrl,
    audioUrl,
    episodeUrl
  };
}


function normalizeContentLesson(entry){
  const id = cleanText(entry?.id);
  const reference = cleanText(entry?.reference);
  const title = cleanText(entry?.title);
  const posterUrl = validAppContentURL(
    entry?.posterUrl
  );
  const videoUrl = validAppContentURL(
    entry?.videoUrl
  );

  if(
    !id ||
    !reference ||
    !title ||
    !posterUrl ||
    !videoUrl
  ){
    return null;
  }

  return {
    id,
    reference,
    title,
    description:cleanText(entry?.description),
    publishedAt:cleanText(entry?.publishedAt),
    duration:cleanText(entry?.duration),
    posterUrl,
    videoUrl,
    poster:posterUrl,
    video:videoUrl
  };
}


function validateContentCategory(entries, normalize){
  const valid = [];
  const seen = new Set();

  entries.forEach(entry => {
    const normalized = normalize(entry);

    if(!normalized || seen.has(normalized.id)){
      return;
    }

    seen.add(normalized.id);
    valid.push(normalized);
  });

  return valid;
}


function validateAppContentFeed(payload){
  if(
    !payload ||
    Number(payload.schemaVersion) !== 1 ||
    !Array.isArray(payload.articles) ||
    !Array.isArray(payload.podcasts) ||
    !Array.isArray(payload.lessons)
  ){
    throw new Error(
      "Unsupported app content feed schema."
    );
  }

  const fallback = fallbackAppContentFeed();
  const lessons = validateContentCategory(
    payload.lessons,
    normalizeContentLesson
  );

  return {
    schemaVersion:1,
    updatedAt:cleanText(payload.updatedAt),
    articles:appContentSortNewest(
      validateContentCategory(
        payload.articles,
        normalizeContentArticle
      )
    ),
    podcasts:appContentSortNewest(
      validateContentCategory(
        payload.podcasts,
        normalizeContentPodcast
      )
    ),
    lessons:lessons.length
      ? lessons
      : fallback.lessons
  };
}


function readCachedAppContentFeed(){
  try{
    const cached = JSON.parse(
      localStorage.getItem(
        APP_CONTENT_FEED_CACHE_KEY
      ) || "null"
    );

    if(
      !cached ||
      Number(cached.schemaVersion) !== 1 ||
      !cached.manifest
    ){
      return null;
    }

    return {
      manifest:validateAppContentFeed(
        cached.manifest
      ),
      fetchedAt:Number(cached.fetchedAt) || 0,
      sourceUrl:cleanText(cached.sourceUrl),
      schemaVersion:1
    };
  }catch(error){
    console.warn(
      "Could not read cached app content feed.",
      error
    );
    return null;
  }
}


function writeCachedAppContentFeed(
  manifest,
  sourceUrl
){
  try{
    localStorage.setItem(
      APP_CONTENT_FEED_CACHE_KEY,
      JSON.stringify({
        schemaVersion:1,
        fetchedAt:Date.now(),
        sourceUrl,
        manifest
      })
    );
  }catch(error){
    console.warn(
      "Could not cache app content feed.",
      error
    );
  }
}


async function fetchAppContentFeed(sourceUrl){
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, APP_CONTENT_FEED_TIMEOUT_MS);

  try{
    const response = await fetch(sourceUrl, {
      cache:"no-store",
      signal:controller.signal
    });

    if(!response.ok){
      throw new Error(
        `${sourceUrl} returned ${response.status}`
      );
    }

    return validateAppContentFeed(
      await response.json()
    );
  }finally{
    window.clearTimeout(timeout);
  }
}


function isLocalAppPreview(){
  return (
    ["http:", "https:"].includes(
      window.location.protocol
    ) &&
    [
      "localhost",
      "127.0.0.1",
      "::1"
    ].includes(window.location.hostname)
  );
}


function setAppContentFeedState(
  manifest,
  sourceUrl
){
  appContentFeedState = {
    manifest,
    sourceUrl,
    fetchedAt:Date.now()
  };
  appContentFeedLoadedAt = Date.now();

  return appContentFeedState;
}


async function loadAppContentFeed(options = {}){
  const forceRefresh = Boolean(options.forceRefresh);

  if(
    appContentFeedState &&
    !forceRefresh &&
    Date.now() - appContentFeedLoadedAt <
      APP_CONTENT_FEED_REFRESH_MS
  ){
    return appContentFeedState;
  }

  if(appContentFeedRequest){
    return appContentFeedRequest;
  }

  appContentFeedRequest = (async () => {
    const localPreview = isLocalAppPreview();

    if(localPreview){
      try{
        const manifest = await fetchAppContentFeed(
          APP_CONTENT_FEED_LOCAL_URL
        );

        return setAppContentFeedState(
          manifest,
          APP_CONTENT_FEED_LOCAL_URL
        );
      }catch(error){
        console.warn(
          "Local app content feed failed.",
          error
        );
      }
    }else{
      try{
        const manifest = await fetchAppContentFeed(
          APP_CONTENT_FEED_REMOTE_URL
        );

        writeCachedAppContentFeed(
          manifest,
          APP_CONTENT_FEED_REMOTE_URL
        );

        return setAppContentFeedState(
          manifest,
          APP_CONTENT_FEED_REMOTE_URL
        );
      }catch(error){
        console.warn(
          "Remote app content feed failed.",
          error
        );
      }
    }

    const cached = readCachedAppContentFeed();

    if(cached?.manifest){
      return setAppContentFeedState(
        cached.manifest,
        cached.sourceUrl || "cache"
      );
    }

    if(!localPreview){
      try{
        const manifest = await fetchAppContentFeed(
          APP_CONTENT_FEED_LOCAL_URL
        );

        return setAppContentFeedState(
          manifest,
          APP_CONTENT_FEED_LOCAL_URL
        );
      }catch(error){
        console.warn(
          "Bundled app content feed failed.",
          error
        );
      }
    }

    return setAppContentFeedState(
      fallbackAppContentFeed(),
      "emergency-fallback"
    );
  })();

  try{
    return await appContentFeedRequest;
  }finally{
    appContentFeedRequest = null;
  }
}


function currentAppContentFeed(){
  return appContentFeedState?.manifest ||
    fallbackAppContentFeed();
}


function currentHomeLessons(){
  const lessons = currentAppContentFeed().lessons;

  return lessons.length
    ? lessons
    : fallbackAppContentFeed().lessons;
}


function rerenderLiveContent(){
  renderHomeLineUponLine();
  loadLatestArticle();
  loadArticlesBrowser();
  loadLatestPodcast();
}


async function refreshAppContentFeedIfNeeded(){
  if(
    appContentFeedState &&
    Date.now() - appContentFeedLoadedAt <
      APP_CONTENT_FEED_REFRESH_MS
  ){
    return appContentFeedState;
  }

  const previousUpdatedAt =
    currentAppContentFeed().updatedAt;
  const previousSource =
    appContentFeedState?.sourceUrl || "";
  const state = await loadAppContentFeed({
    forceRefresh:true
  });

  if(
    state?.manifest &&
    (
      state.manifest.updatedAt !== previousUpdatedAt ||
      state.sourceUrl !== previousSource
    )
  ){
    rerenderLiveContent();
  }

  return state;
}


loadAppContentFeed()
  .then(() => {
    rerenderLiveContent();
  })
  .catch(error => {
    console.warn(
      "Initial app content feed load failed.",
      error
    );
  });


function readHomeStudyProgress(){
  return readObjectStorage(
    HOME_STUDY_PROGRESS_KEY
  );
}


function writeHomeStudyProgress(progress){
  writeObjectStorage(
    HOME_STUDY_PROGRESS_KEY,
    progress
  );
}


function readHomeStudyStreak(){
  const fallback = {
    currentStreak:0,
    lastCompletedDate:"",
    longestStreak:0
  };

  try{
    const value = JSON.parse(
      localStorage.getItem(HOME_STUDY_STREAK_KEY) || "{}"
    );

    return value && typeof value === "object"
      ? {
          currentStreak:Number(value.currentStreak) || 0,
          lastCompletedDate:String(value.lastCompletedDate || ""),
          longestStreak:Math.max(
            Number(value.longestStreak) || 0,
            Number(value.currentStreak) || 0
          )
        }
      : fallback;
  }catch(error){
    console.warn(
      "Could not read Home study streak.",
      error
    );
    return fallback;
  }
}


function writeHomeStudyStreak(streak){
  try{
    localStorage.setItem(
      HOME_STUDY_STREAK_KEY,
      JSON.stringify(streak)
    );
  }catch(error){
    console.warn(
      "Could not write Home study streak.",
      error
    );
  }
}


function todayHomeStudyRecord(){
  const progress = readHomeStudyProgress();
  const dateKey = localDateKey();
  const record =
    progress[dateKey] &&
    typeof progress[dateKey] === "object"
      ? progress[dateKey]
      : {};

  return {
    progress,
    dateKey,
    record:{
      lessonId:String(record.lessonId || ""),
      lessonCompleted:Boolean(record.lessonCompleted),
      chapters:Array.isArray(record.chapters)
        ? record.chapters.filter(Boolean)
        : [],
      completed:Boolean(record.completed)
    }
  };
}


function homeStudyChapterKey(canonSlug, bookSlug, chapter){
  return [
    canonSlug,
    bookSlug,
    Number(chapter)
  ].join(":");
}


function didCompleteHomeLessonToday(record){
  const lesson = homeLineUponLineLesson();

  return (
    record.lessonCompleted &&
    record.lessonId === lesson.id
  );
}


function homeStudyGoalCount(record){
  let count = 0;

  if(didCompleteHomeLessonToday(record)){
    count += 1;
  }

  if(record.chapters.length >= 4){
    count += 1;
  }

  return count;
}


function displayHomeStudyStreak(streak){
  const today = localDateKey();
  const yesterday = previousLocalDateKey(today);

  return (
    streak.lastCompletedDate === today ||
    streak.lastCompletedDate === yesterday
  )
    ? streak.currentStreak
    : 0;
}


function homeScreenIsActive(){
  const homeScreen = document.querySelector(
    '[data-v3-screen="home"]'
  );

  return Boolean(
    homeScreen?.classList.contains("is-active") &&
    !homeScreen.hidden &&
    !document.body.classList.contains(
      "sj-lesson-player-open"
    )
  );
}


function readHomeStudyPendingAnimation(){
  try{
    const value = JSON.parse(
      sessionStorage.getItem(
        HOME_STUDY_PENDING_ANIMATION_KEY
      ) || "null"
    );

    return value && typeof value === "object"
      ? value
      : null;
  }catch(error){
    console.warn(
      "Could not read pending Home study animation.",
      error
    );
    return null;
  }
}


function writeHomeStudyPendingAnimation(value){
  try{
    sessionStorage.setItem(
      HOME_STUDY_PENDING_ANIMATION_KEY,
      JSON.stringify(value)
    );
  }catch(error){
    console.warn(
      "Could not queue Home study animation.",
      error
    );
  }
}


function clearHomeStudyPendingAnimation(){
  try{
    sessionStorage.removeItem(
      HOME_STUDY_PENDING_ANIMATION_KEY
    );
  }catch(error){
    console.warn(
      "Could not clear pending Home study animation.",
      error
    );
  }
}


function validHomeStudyAnimationPayload(payload){
  if(!payload || payload.dateKey !== localDateKey()){
    return false;
  }

  const previousCompletedGoals =
    Number(payload.previousCompletedGoals) || 0;
  const newCompletedGoals =
    Number(payload.newCompletedGoals) || 0;
  const previousChapterCount =
    Number(payload.previousChapterCount) || 0;
  const newChapterCount =
    Number(payload.newChapterCount) || 0;

  return (
    newCompletedGoals > previousCompletedGoals ||
    newChapterCount > previousChapterCount ||
    Boolean(payload.lessonChanged)
  );
}


function mergeHomeStudyPendingAnimation(update){
  if(!validHomeStudyAnimationPayload(update)){
    return;
  }

  const existing = readHomeStudyPendingAnimation();

  if(
    !existing ||
    existing.dateKey !== update.dateKey ||
    !validHomeStudyAnimationPayload(existing)
  ){
    writeHomeStudyPendingAnimation(update);
    return;
  }

  writeHomeStudyPendingAnimation({
    dateKey:update.dateKey,
    previousCompletedGoals:Math.min(
      Number(existing.previousCompletedGoals) || 0,
      Number(update.previousCompletedGoals) || 0
    ),
    newCompletedGoals:Math.max(
      Number(existing.newCompletedGoals) || 0,
      Number(update.newCompletedGoals) || 0
    ),
    previousChapterCount:Math.min(
      Number(existing.previousChapterCount) || 0,
      Number(update.previousChapterCount) || 0
    ),
    newChapterCount:Math.max(
      Number(existing.newChapterCount) || 0,
      Number(update.newChapterCount) || 0
    ),
    chapterChanged:Boolean(
      existing.chapterChanged ||
      update.chapterChanged
    ),
    lessonChanged:Boolean(
      existing.lessonChanged ||
      update.lessonChanged
    )
  });
}


function playHomeStudyProgressAnimation(payload){
  if(!validHomeStudyAnimationPayload(payload)){
    return;
  }

  const card = document.querySelector(
    "[data-home-study-card]"
  );

  if(!card || !homeScreenIsActive()){
    return;
  }

  const progress = card.querySelector(
    ".sj-home-study-progress"
  );
  const shouldPop =
    Number(payload.newCompletedGoals) >
    Number(payload.previousCompletedGoals);

  card.classList.remove("is-progressing");

  if(progress){
    progress.classList.remove(
      "sj-home-study-progress-pop"
    );
  }

  requestAnimationFrame(() => {
    card.classList.add("is-progressing");

    if(shouldPop && progress){
      progress.classList.add(
        "sj-home-study-progress-pop"
      );
    }

    window.setTimeout(() => {
      card.classList.remove("is-progressing");

      if(progress){
        progress.classList.remove(
          "sj-home-study-progress-pop"
        );
      }
    }, 900);
  });
}


function queueOrPlayHomeStudyProgressAnimation(update){
  if(!validHomeStudyAnimationPayload(update)){
    return;
  }

  renderHomeStudyStreak();

  if(homeScreenIsActive()){
    requestAnimationFrame(() => {
      playHomeStudyProgressAnimation(update);
    });
    return;
  }

  mergeHomeStudyPendingAnimation(update);
}


function consumeHomeStudyPendingAnimation(){
  const pending = readHomeStudyPendingAnimation();

  if(!pending){
    return;
  }

  if(!validHomeStudyAnimationPayload(pending)){
    clearHomeStudyPendingAnimation();
    return;
  }

  clearHomeStudyPendingAnimation();
  playHomeStudyProgressAnimation(pending);
}


function renderHomeStudyOnHomeEntry(){
  renderHomeStudyStreak();

  requestAnimationFrame(() => {
    consumeHomeStudyPendingAnimation();
  });
}


function previousLocalDateKey(dateKey){
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  if(!year || !month || !day){
    return "";
  }

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);

  return localDateKey(date);
}


function completeHomeStudyIfReady(record, dateKey){
  if(record.completed || homeStudyGoalCount(record) < 2){
    return false;
  }

  const streak = readHomeStudyStreak();
  const previousDate = previousLocalDateKey(dateKey);
  const wasYesterday =
    streak.lastCompletedDate === previousDate;
  const nextStreak = wasYesterday
    ? streak.currentStreak + 1
    : 1;

  record.completed = true;

  writeHomeStudyStreak({
    currentStreak:nextStreak,
    lastCompletedDate:dateKey,
    longestStreak:Math.max(
      streak.longestStreak || 0,
      nextStreak
    )
  });

  return true;
}


function saveHomeStudyRecord(record, dateKey, progress){
  progress[dateKey] = record;
  writeHomeStudyProgress(progress);
}


function markHomeLessonComplete(lessonId){
  const lesson = homeLineUponLineLesson();

  if(lessonId !== lesson.id){
    return;
  }

  const {
    progress,
    dateKey,
    record
  } = todayHomeStudyRecord();

  if(record.lessonCompleted && record.lessonId === lesson.id){
    return;
  }

  const previousCompletedGoals =
    homeStudyGoalCount(record);
  const previousChapterCount = record.chapters.length;

  record.lessonId = lesson.id;
  record.lessonCompleted = true;

  completeHomeStudyIfReady(
    record,
    dateKey
  );

  saveHomeStudyRecord(record, dateKey, progress);
  queueOrPlayHomeStudyProgressAnimation({
    dateKey,
    previousCompletedGoals,
    newCompletedGoals:homeStudyGoalCount(record),
    previousChapterCount,
    newChapterCount:record.chapters.length,
    chapterChanged:false,
    lessonChanged:true
  });
}


function markHomeChapterComplete(canonSlug, bookSlug, chapter){
  const chapterKey = homeStudyChapterKey(
    canonSlug,
    bookSlug,
    chapter
  );

  const {
    progress,
    dateKey,
    record
  } = todayHomeStudyRecord();

  if(record.chapters.includes(chapterKey)){
    return;
  }

  const previousCompletedGoals =
    homeStudyGoalCount(record);
  const previousChapterCount = record.chapters.length;

  record.chapters.push(chapterKey);

  completeHomeStudyIfReady(
    record,
    dateKey
  );

  saveHomeStudyRecord(record, dateKey, progress);
  queueOrPlayHomeStudyProgressAnimation({
    dateKey,
    previousCompletedGoals,
    newCompletedGoals:homeStudyGoalCount(record),
    previousChapterCount,
    newChapterCount:record.chapters.length,
    chapterChanged:true,
    lessonChanged:false
  });
}


function renderHomeStudyStreak(){
  const root = document.querySelector(
    "[data-home-study-card]"
  );

  if(!root) return;

  const { record } = todayHomeStudyRecord();
  const streak = readHomeStudyStreak();
  const completedGoals = homeStudyGoalCount(record);
  const lessonComplete = didCompleteHomeLessonToday(record);
  const chaptersComplete = record.chapters.length >= 4;
  const isComplete = completedGoals >= 2;

  root.classList.toggle(
    "is-complete",
    isComplete
  );

  root.innerHTML = `
    <div class="sj-home-study-layout">
      <div
        class="sj-home-study-streak"
        aria-label="${displayHomeStudyStreak(streak)}-day study streak"
      >
        <button
          class="sj-home-study-flame"
          type="button"
          data-home-study-streak-open
          aria-label="Open study streak details."
        >
          <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path d="M16.4 29c-5 0-9-3.6-9-8.7 0-3.1 1.6-5.8 4.6-8.6 1.8-1.7 2.5-3.6 2.2-6.7 3.7 1.6 6.5 4.8 6.5 8.7 1.2-.9 2-2.3 2.2-4 1.8 1.8 2.8 4.6 2.8 7.6 0 6.7-4.4 11.7-9.3 11.7Z"></path>
            <path d="M16.2 25.4c-2.2 0-4-1.6-4-3.8 0-1.6.9-2.8 2.2-4 1-.9 1.5-1.8 1.4-3.2 2.1 1.1 3.6 2.9 3.6 5 1-.5 1.6-1.2 1.9-2.1.6 1 .9 2.1.9 3.4 0 2.8-2.5 4.7-6 4.7Z"></path>
          </svg>
        </button>

        <span class="sj-home-study-number">
          ${displayHomeStudyStreak(streak)}
        </span>
      </div>

      <div class="sj-home-study-goals">
        <p class="sj-home-study-kicker">
          ${isComplete ? "Study Complete" : "Today’s Study"}
        </p>

        <div class="sj-home-study-goal${lessonComplete ? " is-complete" : ""}">
          <span class="sj-home-study-check" aria-hidden="true">
            <svg viewBox="0 0 18 18" focusable="false">
              <path
                d="M5 9 L8 12 L14 6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
            </svg>
          </span>
          <span class="sj-visually-hidden">
            ${lessonComplete ? "Completed:" : "Not completed:"}
          </span>
          <span>Line Upon Line</span>
        </div>

        <div class="sj-home-study-goal${chaptersComplete ? " is-complete" : ""}">
          <span class="sj-home-study-check" aria-hidden="true">
            <svg viewBox="0 0 18 18" focusable="false">
              <path
                d="M5 9 L8 12 L14 6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
            </svg>
          </span>
          <span class="sj-visually-hidden">
            ${chaptersComplete ? "Completed:" : "Not completed:"}
          </span>
          <span>Read 4 Chapters</span>
        </div>
      </div>

      <div
        class="sj-home-study-progress"
        aria-label="${completedGoals} of 2 daily goals completed"
      >
        <strong>
          <span>${completedGoals}</span>
          <i aria-hidden="true"></i>
          <span>2</span>
        </strong>
      </div>
    </div>
  `;
}


function dateFromLocalKey(dateKey){
  const [year, month, day] = String(dateKey)
    .split("-")
    .map(Number);

  return year && month && day
    ? new Date(year, month - 1, day)
    : null;
}


function completedHomeStudyDatesThisWeek(progress){
  const today = new Date();
  const weekStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  weekStart.setDate(
    weekStart.getDate() - weekStart.getDay()
  );

  return Object.entries(progress)
    .filter(([dateKey, record]) => {
      if(!record?.completed){
        return false;
      }

      const date = dateFromLocalKey(dateKey);

      return date && date >= weekStart && date <= today;
    })
    .length;
}


function recentHomeStudyDays(progress){
  const today = new Date();

  return Array.from({ length:7 }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    date.setDate(date.getDate() - (6 - index));

    const dateKey = localDateKey(date);

    return {
      dateKey,
      label:date.toLocaleDateString(undefined, {
        weekday:"short"
      }),
      completed:Boolean(progress[dateKey]?.completed)
    };
  });
}


function homeStudyStreakShelfRoot(){
  let root = document.querySelector(
    "[data-home-study-streak-sheet]"
  );

  if(root){
    return root;
  }

  root = document.createElement("div");
  root.className = "sj-study-streak-sheet";
  root.dataset.homeStudyStreakSheet = "";
  root.hidden = true;

  document.body.append(root);

  return root;
}


function openHomeStudyStreakShelf(){
  const root = homeStudyStreakShelfRoot();
  const progress = readHomeStudyProgress();
  const streak = readHomeStudyStreak();
  const currentStreak = displayHomeStudyStreak(streak);
  const completedThisWeek =
    completedHomeStudyDatesThisWeek(progress);
  const recentDays = recentHomeStudyDays(progress);

  root.hidden = false;
  root.innerHTML = `
    <button
      class="sj-study-streak-backdrop"
      type="button"
      data-home-study-streak-close
      aria-label="Close Study Streaks"
    ></button>

    <section
      class="sj-study-streak-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sj-study-streak-title"
    >
      <header class="sj-study-streak-head">
        <h2 id="sj-study-streak-title">
          Study Streaks
        </h2>

        <button
          type="button"
          data-home-study-streak-close
        >
          Close
        </button>
      </header>

      <div class="sj-study-streak-stats">
        <div>
          <span>Current Streak</span>
          <strong>${currentStreak}</strong>
        </div>

        <div>
          <span>Longest Streak</span>
          <strong>${streak.longestStreak || 0}</strong>
        </div>

        <div>
          <span>Completed This Week</span>
          <strong>${completedThisWeek}</strong>
        </div>
      </div>

      <section
        class="sj-study-streak-recent"
        aria-labelledby="sj-study-streak-recent-title"
      >
        <h3 id="sj-study-streak-recent-title">
          Recent 7 Days
        </h3>

        <div class="sj-study-streak-days">
          ${recentDays.map(day => `
            <span
              class="sj-study-streak-day${day.completed ? " is-complete" : ""}"
              aria-label="${escapeHTML(day.label)} ${day.completed ? "completed" : "not completed"}"
            >
              <span aria-hidden="true"></span>
              <em>${escapeHTML(day.label)}</em>
            </span>
          `).join("")}
        </div>
      </section>
    </section>
  `;

  document.body.classList.add(
    "sj-study-streak-sheet-open"
  );
}


function closeHomeStudyStreakShelf(){
  const root = homeStudyStreakShelfRoot();

  root.hidden = true;
  root.innerHTML = "";

  document.body.classList.remove(
    "sj-study-streak-sheet-open"
  );
}


function homeLineUponLineLesson(){
  const today = new Date();
  const lessons = currentHomeLessons();

  const localDay = localDayNumber(today);
  const rotationStartDay = localDayNumber(
    new Date(2026, 6, 16)
  );

  const dayOffset = Math.max(
    0,
    localDay - rotationStartDay
  );

  return lessons[
    dayOffset % lessons.length
  ];
}


function renderHomeLineUponLine(){
  const root = document.getElementById(
    "sj-line-upon-line"
  );

  if(!root){
    return;
  }

  const lesson = homeLineUponLineLesson();

  root.innerHTML = `
    <button
      class="sj-scripture-lesson-card"
      type="button"
      data-scripture-lesson-open
      data-scripture-lesson-id="${escapeHTML(lesson.id)}"
      aria-label="Play ${escapeHTML(lesson.title)}"
    >
      <span class="sj-scripture-lesson-image">
        <img
          src="${escapeHTML(lesson.posterUrl || lesson.poster)}"
          alt=""
          loading="lazy"
        >
      </span>

      <span class="sj-scripture-lesson-copy">
        <span class="sj-scripture-lesson-reference">
          ${escapeHTML(lesson.reference)}
        </span>

        <span class="sj-scripture-lesson-title">
          ${escapeHTML(lesson.title)}
        </span>
      </span>

      <span class="sj-scripture-lesson-meta">
        <span
          class="sj-scripture-lesson-play"
          aria-hidden="true"
        >
          ▶
        </span>

        <span>${escapeHTML(lesson.duration)}</span>
      </span>
    </button>
  `;
}


renderHomeLineUponLine();
renderHomeStudyStreak();


function homeLessonById(lessonId){
  const lessons = currentHomeLessons();

  return lessons.find(
    lesson => lesson.id === lessonId
  ) || lessons[0];
}


function nextHomeLesson(lessonId){
  const lessons = currentHomeLessons();
  const index = lessons.findIndex(
    lesson => lesson.id === lessonId
  );

  return lessons[
    (Math.max(0, index) + 1) %
    lessons.length
  ];
}


function homeLessonPlayerRoot(){
  let root = document.querySelector(
    "[data-scripture-lesson-player]"
  );

  if(root){
    return root;
  }

  root = document.createElement("div");
  root.className = "sj-lesson-player";
  root.dataset.scriptureLessonPlayer = "";
  root.hidden = true;

  document.body.append(root);

  return root;
}


function openHomeLessonPlayer(lessonId){
  const lesson = homeLessonById(lessonId);
  const nextLesson = nextHomeLesson(lesson.id);
  const root = homeLessonPlayerRoot();

  root.hidden = false;
  root.innerHTML = `
    <button
      class="sj-lesson-player-backdrop"
      type="button"
      data-scripture-lesson-close
      aria-label="Close lesson player"
    ></button>

    <section
      class="sj-lesson-player-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sj-lesson-player-title"
    >
      <header class="sj-lesson-player-topbar">
        <button
          class="sj-lesson-player-close"
          type="button"
          data-scripture-lesson-close
        >
          Back
        </button>

        <button
          class="sj-lesson-player-share"
          type="button"
          data-scripture-lesson-share
          data-scripture-lesson-id="${escapeHTML(lesson.id)}"
        >
          Share
        </button>
      </header>

      <video
        class="sj-lesson-video"
        controls
        playsinline
        poster="${escapeHTML(lesson.posterUrl || lesson.poster)}"
        data-scripture-lesson-video
        data-scripture-lesson-id="${escapeHTML(lesson.id)}"
      >
        <source
          src="${escapeHTML(lesson.videoUrl || lesson.video)}"
          type="video/mp4"
        >
      </video>

      <div class="sj-lesson-player-copy">
        <p class="sj-lesson-player-reference">
          ${escapeHTML(lesson.reference)}
        </p>

        <h2 id="sj-lesson-player-title">
          ${escapeHTML(lesson.title)}
        </h2>

        <div class="sj-lesson-author-row">
          <div>
            <strong>Semitic Jew</strong>
            <span>Founder</span>
          </div>

          <button
            type="button"
            data-scripture-lesson-follow
          >
            Follow
          </button>
        </div>

        <p
          class="sj-lesson-player-status"
          data-scripture-lesson-status
          hidden
        ></p>

        <button
          class="sj-lesson-next"
          type="button"
          data-scripture-lesson-open
          data-scripture-lesson-id="${escapeHTML(nextLesson.id)}"
        >
          Continue Learning
        </button>
      </div>
    </section>
  `;

  document.body.classList.add("sj-lesson-player-open");
}


function openHomeLessonLibrary(){
  const root = homeLessonPlayerRoot();
  const lessons = currentHomeLessons();

  root.hidden = false;
  root.innerHTML = `
    <button
      class="sj-lesson-player-backdrop"
      type="button"
      data-scripture-lesson-close
      aria-label="Close lesson library"
    ></button>

    <section
      class="sj-lesson-player-sheet sj-lesson-library-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sj-lesson-library-title"
    >
      <header class="sj-lesson-player-topbar">
        <button
          class="sj-lesson-player-close"
          type="button"
          data-scripture-lesson-close
        >
          Back
        </button>
      </header>

      <div class="sj-lesson-player-copy">
        <p class="sj-lesson-player-reference">
          Scripture Explained
        </p>

        <h2 id="sj-lesson-library-title">
          Line Upon Line
        </h2>

        <div class="sj-lesson-library-list">
          ${lessons.map(lesson => `
            <button
              class="sj-lesson-library-card"
              type="button"
              data-scripture-lesson-open
              data-scripture-lesson-id="${escapeHTML(lesson.id)}"
            >
              <img
                src="${escapeHTML(lesson.posterUrl || lesson.poster)}"
                alt=""
                loading="lazy"
              >

              <span>
                <span class="sj-lesson-library-reference">
                  ${escapeHTML(lesson.reference)}
                </span>

                <strong>
                  ${escapeHTML(lesson.title)}
                </strong>

                <em>${escapeHTML(lesson.duration)}</em>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;

  document.body.classList.add("sj-lesson-player-open");
}


function closeHomeLessonPlayer(){
  const root = homeLessonPlayerRoot();
  const video = root.querySelector("video");

  if(video){
    video.pause();
  }

  root.hidden = true;
  root.innerHTML = "";
  document.body.classList.remove(
    "sj-lesson-player-open"
  );

  if(homeScreenIsActive()){
    renderHomeStudyOnHomeEntry();
  }
}


async function shareHomeLesson(lessonId){
  const lesson = homeLessonById(lessonId);
  const text = `${lesson.reference} — ${lesson.title}`;

  if(navigator.share){
    try{
      await navigator.share({
        title:lesson.title,
        text
      });
      return;
    }catch(error){
      if(error.name === "AbortError") return;
    }
  }

  try{
    await navigator.clipboard.writeText(text);
    window.alert("Lesson copied for sharing.");
  }catch(error){
    console.warn("Could not share lesson.", error);
  }
}


function updateHomeLessonWatchProgress(video){
  const lessonId = video.dataset.scriptureLessonId;
  const duration = Number(video.duration);

  if(
    !lessonId ||
    !Number.isFinite(duration) ||
    duration <= 0
  ){
    return;
  }

  const watched = video.ended
    ? 1
    : Number(video.currentTime) / duration;

  if(watched >= .85){
    markHomeLessonComplete(lessonId);
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
    await loadAppContentFeed();

    let [article] = currentAppContentFeed()
      .articles;

    if(!article){
      [article] = await loadBundledArticles();
    }

    if(!article){
      throw new Error(
        "No latest article is available."
      );
    }

    const href = article.href || article.articleUrl;
    let title = article.title;
    let excerpt = article.excerpt;
    let imageSrc = article.image || article.imageUrl;

    if(!href){
      throw new Error(
        "Latest article link is missing."
      );
    }

    try{
      const readerURL = new URL(
        href,
        window.location.origin
      );
      readerURL.searchParams.set(
        "homeLatest",
        String(Date.now())
      );

      const articleResponse = await fetch(
        readerURL.href
      );

      if(articleResponse.ok){
        const articleHTML =
          await articleResponse.text();

        const articleDoc =
          new DOMParser().parseFromString(
            articleHTML,
            "text/html"
          );

        const actualTitle =
          decodeHTMLEntities(
            cleanText(
              articleDoc.querySelector(
                ".article-title"
              )?.textContent
            )
          );

        const actualHero =
          articleDoc.querySelector(
            ".hero-image img, img.hero-image"
          );

        const actualExcerpt =
          decodeHTMLEntities(
            cleanText(
              articleDoc.querySelector(
                ".article-subtitle, .article-deck, .dek, .article-summary, .lead"
              )?.textContent
            )
          );

        if(actualTitle){
          title = actualTitle;
        }

        if(actualHero){
          imageSrc = normalizeArticleImageURL(
            actualHero.getAttribute("src")
          );
        }

        if(actualExcerpt){
          excerpt = actualExcerpt;
        }
      }
    }catch(error){
      console.warn(
        "Could not verify the latest Article card against its source article.",
        error
      );
    }

    if(!title){
      throw new Error(
        "Latest article title is missing."
      );
    }

    root.innerHTML = `
      <a
        class="sj-latest-article-card"
        href="${escapeHTML(href)}"
        data-app-article-link
      >
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
        : "Save a Question";
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
/* =========================================================
   Build 3H.3 — Actual Articles Browser
   ========================================================= */

let articleBrowserCache = [];
let activeArticleReaderURL = null;


function articleBrowserRoot(){
  return document.querySelector(
    "[data-articles-browser]"
  );
}


function normalizedAppArticleURL(value){
  const href = cleanText(value);

  if(!href){
    return "";
  }

  try{
    const resolved = new URL(
      href,
      window.location.origin
    );

    const isSemiticJewArticle =
      /^(?:www\.)?semiticjew\.org$/i.test(
        resolved.hostname
      ) &&
      resolved.pathname.startsWith(
        "/articles/"
      );

    const isLocalArticle =
      resolved.origin === window.location.origin &&
      resolved.pathname.startsWith(
        "/articles/"
      );

    if(isSemiticJewArticle || isLocalArticle){
      return resolved.pathname +
        resolved.search +
        resolved.hash;
    }
  }catch(error){
    if(href.startsWith("/articles/")){
      return href;
    }
  }

  return href;
}


function normalizeArticleImageURL(value){
  const image = cleanText(value);

  if(!image){
    return "";
  }

  return image
    .replace(
      /^https?:\/\/(?:www\.)?semiticjew\.org/i,
      ""
    )
    .replace(
      /^\/israelite-research\//,
      "/"
    );
}


function parseArticleCard(card){
  if(!card){
    return null;
  }

  const link = card.querySelector(
    'a[href*="/articles/"]'
  );

  const title = card.querySelector(
    ".card-body h3, h3"
  );

  const excerpt = card.querySelector(
    ".card-body p, p.muted"
  );

  const image = card.querySelector(
    ".image-block img, img"
  );

  const author = card.querySelector(
    ".author"
  );

  const href = cleanText(
    link?.getAttribute("href")
  );

  const titleText = decodeHTMLEntities(
    cleanText(title?.textContent)
  );

  const excerptText = decodeHTMLEntities(
    cleanText(excerpt?.textContent)
  );

  const imageURL = normalizeArticleImageURL(
    image?.getAttribute("src")
  );

  const authorText = decodeHTMLEntities(
    cleanText(author?.textContent)
  ) || "Semitic Jew";

  if(
    !href ||
    !titleText
  ){
    return null;
  }

  return {
    href,
    title:titleText,
    excerpt:excerptText,
    image:imageURL,
    author:authorText
  };
}


async function loadBundledArticles(){
  const response = await fetch(
    `/articles.html?appArticles=${Date.now()}`
  );

  if(!response.ok){
    throw new Error(
      `articles.html returned ${response.status}`
    );
  }

  const html = await response.text();

  const doc = new DOMParser().parseFromString(
    html,
    "text/html"
  );

  const cards = [
    doc.querySelector(".featured-left"),
    doc.querySelector(".featured-right"),
    ...Array.from(
      doc.querySelectorAll(
        ".recent-grid .article-card, .article-card"
      )
    )
  ].filter(Boolean);

  const articles = [];
  const seen = new Set();

  cards.forEach(card => {
    const article = parseArticleCard(card);

    if(
      !article ||
      seen.has(article.href)
    ){
      return;
    }

    seen.add(article.href);
    articles.push(article);
  });

  return articles;
}


function renderArticlesBrowserError(){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  root.innerHTML = `
    <section class="sj-articles-error">
      <span class="sj-article-label">
        Articles
      </span>

      <h2>
        Articles could not be loaded.
      </h2>

      <p>
        Please try again.
      </p>

      <button
        type="button"
        data-reload-articles
      >
        Reload
      </button>
    </section>
  `;
}


function renderArticlesBrowser(articles){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  if(!Array.isArray(articles) || !articles.length){
    renderArticlesBrowserError();
    return;
  }

  const [featured, ...remaining] = articles;

  root.innerHTML = `
    <section
      class="sj-articles-featured-section"
      aria-labelledby="sj-articles-latest-title"
    >
      <div class="sj-articles-section-head">
        <span class="sj-article-label">
          Latest
        </span>

        <h2 id="sj-articles-latest-title">
          Latest Article
        </h2>
      </div>

      <a
        class="sj-articles-featured-card"
        href="${escapeHTML(featured.href)}"
        data-app-article-link
      >
        ${
          featured.image
            ? `
              <div class="sj-articles-featured-image">
                <img
                  src="${escapeHTML(featured.image)}"
                  alt=""
                  loading="eager"
                >
              </div>
            `
            : ""
        }

        <div class="sj-articles-featured-copy">
          <h3>
            ${escapeHTML(featured.title)}
          </h3>

          ${
            featured.excerpt
              ? `
                <p>
                  ${escapeHTML(featured.excerpt)}
                </p>
              `
              : ""
          }

          <span class="sj-articles-author">
            By ${escapeHTML(featured.author)}
          </span>
        </div>
      </a>
    </section>

    <section
      class="sj-articles-library-section"
      aria-labelledby="sj-articles-library-title"
    >
      <div class="sj-articles-section-head">
        <span class="sj-article-label">
          Library
        </span>

        <h2 id="sj-articles-library-title">
          All Articles
        </h2>
      </div>

      <div class="sj-articles-list">
        ${remaining.map(article => `
          <a
            class="sj-articles-list-card"
            href="${escapeHTML(article.href)}"
            data-app-article-link
          >
            ${
              article.image
                ? `
                  <div class="sj-articles-list-image">
                    <img
                      src="${escapeHTML(article.image)}"
                      alt=""
                      loading="lazy"
                    >
                  </div>
                `
                : ""
            }

            <div class="sj-articles-list-copy">
              <h3>
                ${escapeHTML(article.title)}
              </h3>

              ${
                article.excerpt
                  ? `
                    <p>
                      ${escapeHTML(article.excerpt)}
                    </p>
                  `
                  : ""
              }

              <span>
                ${escapeHTML(article.author)}
              </span>
            </div>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}




/* =========================================================
   Build 3H.4.2 — Actual in-app Article reader
   ========================================================= */

function articleReaderTitle(doc){
  return decodeHTMLEntities(
    cleanText(
      doc.querySelector(
        ".article-title"
      )?.textContent
    )
  );
}


function articleReaderDate(doc){
  const date = doc.querySelector(
    ".article-date time, .article-date"
  );

  return decodeHTMLEntities(
    cleanText(
      date?.textContent
    )
  );
}


function articleReaderAuthor(doc){
  return decodeHTMLEntities(
    cleanText(
      doc.querySelector(
        ".byline-name"
      )?.textContent
    )
  ) || "Semitic Jew";
}


function articleReaderHero(doc){
  const image = doc.querySelector(
    ".hero-image img, img.hero-image"
  );

  if(!image){
    return null;
  }

  return {
    src:normalizeArticleImageURL(
      image.getAttribute("src")
    ),
    alt:decodeHTMLEntities(
      cleanText(
        image.getAttribute("alt")
      )
    )
  };
}


function prepareArticleReaderFragment(
  source,
  articleURL
){
  if(!source){
    return "";
  }

  const clone = source.cloneNode(true);

  clone.querySelectorAll(
    "script, style, iframe, form, object, embed"
  ).forEach(element => {
    element.remove();
  });

  const baseURL = new URL(
    articleURL,
    window.location.origin
  );

  clone.querySelectorAll(
    "*"
  ).forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      if(/^on/i.test(attribute.name)){
        element.removeAttribute(attribute.name);
      }
    });
  });

  clone.querySelectorAll(
    "[src]"
  ).forEach(element => {
    const value = cleanText(
      element.getAttribute("src")
    );

    if(!value){
      return;
    }

    try{
      const resolved = new URL(
        value,
        baseURL
      );

      if(
        !["http:", "https:"].includes(
          resolved.protocol
        )
      ){
        element.removeAttribute("src");
        return;
      }

      element.setAttribute(
        "src",
        resolved.origin === window.location.origin
          ? resolved.pathname +
            resolved.search +
            resolved.hash
          : resolved.href
      );
    }catch(error){
      console.warn(
        "Could not normalize article image URL.",
        value,
        error
      );
    }
  });

  clone.querySelectorAll(
    "a[href]"
  ).forEach(link => {
    const value = cleanText(
      link.getAttribute("href")
    );

    if(!value){
      return;
    }

    if(value.startsWith("#")){
      return;
    }

    try{
      const resolved = new URL(
        value,
        baseURL
      );

      if(
        !["http:", "https:"].includes(
          resolved.protocol
        )
      ){
        link.removeAttribute("href");
        return;
      }

      const isSemiticJewArticle =
        /^(?:www\.)?semiticjew\.org$/i.test(
          resolved.hostname
        ) &&
        resolved.pathname.startsWith(
          "/articles/"
        );

      const sameOrigin =
        resolved.origin ===
        window.location.origin;

      if(
        (sameOrigin || isSemiticJewArticle) &&
        resolved.pathname.startsWith(
          "/articles/"
        )
      ){
        link.setAttribute(
          "href",
          resolved.pathname +
            resolved.search +
            resolved.hash
        );

        link.setAttribute(
          "data-app-article-link",
          ""
        );

        return;
      }

      link.setAttribute(
        "href",
        resolved.href
      );

      if(!sameOrigin){
        link.setAttribute(
          "target",
          "_blank"
        );

        link.setAttribute(
          "rel",
          "noopener noreferrer"
        );
      }

    }catch(error){
      console.warn(
        "Could not normalize article link.",
        value,
        error
      );
    }
  });

  return clone.innerHTML;
}


function renderArticleReaderLoading(){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  root.innerHTML = `
    <section class="sj-app-article-reader">
      <button
        class="sj-app-article-back"
        type="button"
        data-app-article-back
      >
        <span aria-hidden="true">‹</span>
        <span>Articles</span>
      </button>

      <div class="sj-app-article-loading">
        <span
          class="sj-articles-loading-ring"
          aria-hidden="true"
        ></span>

        <p>Loading article...</p>
      </div>
    </section>
  `;
}


function renderArticleReaderError(){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  root.innerHTML = `
    <section class="sj-app-article-reader">
      <button
        class="sj-app-article-back"
        type="button"
        data-app-article-back
      >
        <span aria-hidden="true">‹</span>
        <span>Articles</span>
      </button>

      <div class="sj-app-article-error">
        <span class="sj-article-label">
          Article
        </span>

        <h2>
          This article could not be loaded.
        </h2>

        <p>
          Return to the Articles library and try again.
        </p>
      </div>
    </section>
  `;
}


function renderArticleReader(
  articleURL,
  doc
){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  const title = articleReaderTitle(doc);
  const date = articleReaderDate(doc);
  const author = articleReaderAuthor(doc);
  const hero = articleReaderHero(doc);

  const content = doc.querySelector(
    ".article-content"
  );

  const footnotes = doc.querySelector(
    ".footnotes"
  );

  if(
    !title ||
    !content
  ){
    throw new Error(
      "Article title or article content is missing."
    );
  }

  const contentHTML =
    prepareArticleReaderFragment(
      content,
      articleURL
    );

  const footnotesHTML =
    footnotes
      ? prepareArticleReaderFragment(
          footnotes,
          articleURL
        )
      : "";

  root.innerHTML = `
    <article
      class="sj-app-article-reader"
      data-app-article-reader
    >
      <div class="sj-app-article-reader-topbar">
        <button
          class="sj-app-article-back"
          type="button"
          data-app-article-back
        >
          <span aria-hidden="true">‹</span>
          <span>Articles</span>
        </button>

        <button
          class="sj-app-article-share"
          type="button"
          data-app-article-share
          aria-label="Share this article"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v6h14v-6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <span>Share</span>
        </button>
      </div>

      <header class="sj-app-article-head">
        <p class="sj-app-article-kicker">
          Semitic Jew Institute
        </p>

        <h2>
          ${escapeHTML(title)}
        </h2>

        <div class="sj-app-article-meta">
          <span>
            By ${escapeHTML(author)}
          </span>

          ${
            date
              ? `
                <span aria-hidden="true">•</span>
                <time>
                  ${escapeHTML(date)}
                </time>
              `
              : ""
          }
        </div>
      </header>

      ${
        hero?.src
          ? `
            <figure class="sj-app-article-hero">
              <img
                src="${escapeHTML(hero.src)}"
                alt="${escapeHTML(hero.alt || "")}"
              >
            </figure>
          `
          : ""
      }

      <div class="sj-app-article-body">
        ${contentHTML}
      </div>

      ${
        footnotesHTML
          ? `
            <hr class="sj-app-article-divider">

            <section
              class="sj-app-article-footnotes"
              aria-label="References and footnotes"
            >
              <p class="sj-app-article-reference-label">
                References
              </p>

              ${footnotesHTML}
            </section>
          `
          : ""
      }

      <div class="sj-app-article-end">
        <span aria-hidden="true"></span>

        <p>
          Scripture. Logic. Truth.
        </p>

        <button
          type="button"
          data-app-article-back
        >
          Back to Articles
        </button>
      </div>
    </article>
  `;

  window.scrollTo({
    top:0,
    behavior:"instant"
  });
}


async function openArticleReader(articleURL){
  const href = normalizedAppArticleURL(
    articleURL
  );

  if(!href){
    return;
  }

  activeArticleReaderURL = href;

  renderArticleReaderLoading();

  try{
    const response = await fetch(
      `${href}${
        href.includes("?")
          ? "&"
          : "?"
      }appReader=${Date.now()}`
    );

    if(!response.ok){
      throw new Error(
        `Article returned ${response.status}`
      );
    }

    const html = await response.text();

    const doc = new DOMParser().parseFromString(
      html,
      "text/html"
    );

    renderArticleReader(
      href,
      doc
    );

  }catch(error){
    console.warn(
      "In-app Article reader failed.",
      error
    );

    renderArticleReaderError();
  }
}


function closeArticleReader(){
  activeArticleReaderURL = null;

  if(articleBrowserCache.length){
    renderArticlesBrowser(
      articleBrowserCache
    );
  }else{
    loadArticlesBrowser();
  }

  window.scrollTo({
    top:0,
    behavior:"instant"
  });
}


async function shareActiveArticle(){
  if(!activeArticleReaderURL){
    return;
  }

  const title = cleanText(
    document.querySelector(
      ".sj-app-article-head h2"
    )?.textContent
  ) || "Semitic Jew Article";

  const shareURL = new URL(
    activeArticleReaderURL,
    "https://semiticjew.org"
  ).href;

  try{
    if(navigator.share){
      await navigator.share({
        title,
        url:shareURL
      });

      return;
    }

    await navigator.clipboard.writeText(
      shareURL
    );

    const button = document.querySelector(
      "[data-app-article-share]"
    );

    if(button){
      const label = button.querySelector(
        "span"
      );

      if(label){
        const original = label.textContent;

        label.textContent = "Copied";

        setTimeout(() => {
          label.textContent = original;
        }, 1600);
      }
    }

  }catch(error){
    if(error?.name === "AbortError"){
      return;
    }

    console.warn(
      "Article sharing failed.",
      error
    );
  }
}




async function loadArticlesBrowser(){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  try{
    await loadAppContentFeed();

    let articles = currentAppContentFeed()
      .articles
      .map(article => ({
        href:article.articleUrl || article.href,
        title:article.title,
        excerpt:article.excerpt,
        image:article.imageUrl || article.image,
        author:article.author || "Semitic Jew"
      }));

    if(!articles.length){
      articles = await loadBundledArticles();
    }

    if(!articles.length){
      throw new Error(
        "No article cards were found."
      );
    }

    articleBrowserCache = articles;

    renderArticlesBrowser(articles);

  }catch(error){
    console.warn(
      "Articles browser failed.",
      error
    );

    renderArticlesBrowserError();
  }
}


loadLatestArticle();

loadArticlesBrowser();


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
let bibleBrowserLoadPromise = null;

const READER_BOOKMARKS_KEY =
  "sj_scripture_bookmarks_v1";

const READER_HIGHLIGHTS_KEY =
  "sj_verse_highlights_v1";

const READER_NOTES_KEY =
  "sj_v3_verse_notes_v1";


let bibleBrowserStage = "canons";
let selectedBibleCanon = null;
let selectedBibleBook = null;
let selectedBibleChapter = null;
let selectedReaderVerse = null;
let readerHighlightPreviewOriginal = null;

let readerWordStudyOrderCache = null;
let readerHebrewLexiconCache = null;
let readerGreekLexiconCache = null;

let activeReaderWordStudyTerms = [];
let activeReaderWordStudyIndex = 0;


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
  stopHomeChapterTracker();

  setBibleNotice("");

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
  stopHomeChapterTracker();

  setBibleNotice("");

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
  stopHomeChapterTracker();

  setBibleNotice("");

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


function readReaderArray(key){
  try{
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value)
      ? value
      : [];
  }catch(error){
    console.warn(
      `Unable to read reader data: ${key}`,
      error
    );

    return [];
  }
}


function writeReaderArray(
  key,
  value
){
  try{
    localStorage.setItem(
      key,
      JSON.stringify(
        Array.isArray(value)
          ? value
          : []
      )
    );

    return true;
  }catch(error){
    console.warn(
      `Unable to save reader data: ${key}`,
      error
    );

    return false;
  }
}


function readReaderNotes(){
  try{
    const value = JSON.parse(
      localStorage.getItem(
        READER_NOTES_KEY
      ) || "{}"
    );

    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      ? value
      : {};
  }catch(error){
    console.warn(
      "Unable to read reader notes.",
      error
    );

    return {};
  }
}


function writeReaderNotes(value){
  try{
    localStorage.setItem(
      READER_NOTES_KEY,
      JSON.stringify(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
          ? value
          : {}
      )
    );

    return true;
  }catch(error){
    console.warn(
      "Unable to save reader notes.",
      error
    );

    return false;
  }
}


function readerVerseKey(
  canonSlug,
  bookSlug,
  chapter,
  verse
){
  return [
    canonSlug,
    bookSlug,
    chapter,
    verse
  ].join(":");
}


function getReaderBookmark(key){
  return readReaderArray(
    READER_BOOKMARKS_KEY
  ).find(item => (
    item?.key === key
  )) || null;
}


function getReaderHighlight(key){
  return readReaderArray(
    READER_HIGHLIGHTS_KEY
  ).find(item => (
    item?.key === key
  )) || null;
}


function readerHighlightClass(color){
  const allowed = new Set([
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet"
  ]);

  return allowed.has(color)
    ? `sj-reader-highlight-${color}`
    : "";
}


function clearReaderHighlightClasses(
  verseElement
){
  if(!verseElement) return;

  [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet"
  ].forEach(color => {
    verseElement.classList.remove(
      `sj-reader-highlight-${color}`
    );
  });
}


function closeReaderActionTray(){
  restoreReaderHighlightPreview();
  removeReaderInlineNoteEditor();

  selectedReaderVerse = null;

  document
    .querySelectorAll(".sj-reader-verse.is-selected")
    .forEach(verse => {
      verse.classList.remove("is-selected");
    });

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(tray){
    tray.hidden = true;
  }

  document.body.classList.remove(
    "sj-reader-tray-open"
  );
}


function updateReaderActionTray(){
  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(!tray || !selectedReaderVerse){
    return;
  }

  const reference = tray.querySelector(
    "[data-reader-action-reference]"
  );

  if(reference){
    reference.textContent =
      selectedReaderVerse.ref;
  }

  const saveButton = tray.querySelector(
    '[data-reader-tool="save"]'
  );

  const highlightButton = tray.querySelector(
    '[data-reader-tool="highlight"]'
  );

  const scholarNoteButton = tray.querySelector(
    '[data-reader-tool="scholar-note"]'
  );

  const bookmark = getReaderBookmark(
    selectedReaderVerse.key
  );

  const highlight = getReaderHighlight(
    selectedReaderVerse.key
  );

  const note = readReaderNotes()[
    selectedReaderVerse.key
  ]?.note || "";

  if(saveButton){
    saveButton.classList.toggle(
      "is-active",
      Boolean(bookmark)
    );

    saveButton.setAttribute(
      "aria-pressed",
      String(Boolean(bookmark))
    );

    const label = saveButton.querySelector(
      ".sj-reader-tool-label"
    );

    if(label){
      label.textContent = bookmark
        ? "Saved"
        : "Save";
    }
  }

  if(highlightButton){
    highlightButton.classList.toggle(
      "is-active",
      Boolean(highlight)
    );

    highlightButton.dataset.highlightColor =
      highlight?.category || "";
  }

  if(scholarNoteButton){
    const noteIsActive = Boolean(
      note.trim() ||
      readerInlineNoteEditor()
    );

    scholarNoteButton.classList.toggle(
      "is-active",
      noteIsActive
    );

    scholarNoteButton.setAttribute(
      "aria-pressed",
      String(noteIsActive)
    );
  }

  const palette = tray.querySelector(
    "[data-reader-highlight-palette]"
  );

  if(palette){
    palette.hidden = true;
    palette.classList.remove("is-open");
  }

  tray.classList.remove(
    "is-highlight-mode"
  );

  if(highlightButton){
    highlightButton.setAttribute(
      "aria-expanded",
      "false"
    );
  }
}


function selectReaderVerse(
  verseElement
){
  if(!verseElement) return;

  const book = getBibleBook(
    selectedBibleCanon,
    selectedBibleBook
  );

  if(
    !book ||
    !selectedBibleCanon ||
    !selectedBibleBook ||
    !selectedBibleChapter
  ){
    return;
  }

  const verseNumber = Number(
    verseElement.dataset.readerVerse
  );

  const text = (
    verseElement.querySelector(
      ".sj-reader-verse-text"
    )?.textContent || ""
  ).trim();

  const strongs = (
    verseElement.dataset.readerStrongs || ""
  )
    .split(",")
    .filter(Boolean);

  const key = readerVerseKey(
    selectedBibleCanon,
    selectedBibleBook,
    selectedBibleChapter,
    verseNumber
  );

  const ref =
    `${book.name} ${selectedBibleChapter}:${verseNumber}`;

  const isSameVerse =
    selectedReaderVerse?.key === key;

  if(isSameVerse){
    closeReaderActionTray();
    return;
  }

  removeReaderInlineNoteEditor();

  document
    .querySelectorAll(".sj-reader-verse.is-selected")
    .forEach(verse => {
      verse.classList.remove("is-selected");
    });

  verseElement.classList.add(
    "is-selected"
  );

  selectedReaderVerse = {
    key,
    ref,
    text,
    verse:verseNumber,
    chapter:selectedBibleChapter,
    canon:selectedBibleCanon,
    book:selectedBibleBook,
    strongs
  };

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(tray){
    tray.hidden = false;
  }

  document.body.classList.add(
    "sj-reader-tray-open"
  );

  updateReaderActionTray();

  positionReaderVerseIntelligently(
    verseElement
  );
}


function toggleReaderBookmark(){
  if(!selectedReaderVerse) return;

  const bookmarks = readReaderArray(
    READER_BOOKMARKS_KEY
  );

  const exists = bookmarks.some(
    item => (
      item?.key === selectedReaderVerse.key
    )
  );

  const next = exists
    ? bookmarks.filter(
        item => (
          item?.key !== selectedReaderVerse.key
        )
      )
    : [
        {
          key:selectedReaderVerse.key,
          ref:selectedReaderVerse.ref,
          text:selectedReaderVerse.text,
          canon:selectedReaderVerse.canon,
          book:selectedReaderVerse.book,
          chapter:selectedReaderVerse.chapter,
          verse:selectedReaderVerse.verse,
          url:
            `/app.html?canon=${
              encodeURIComponent(
                selectedReaderVerse.canon
              )
            }&book=${
              encodeURIComponent(
                selectedReaderVerse.book
              )
            }&chapter=${
              selectedReaderVerse.chapter
            }&verse=${
              selectedReaderVerse.verse
            }#bible`,
          savedAt:new Date().toISOString()
        },
        ...bookmarks.filter(
          item => (
            item?.key !== selectedReaderVerse.key
          )
        )
      ];

  writeReaderArray(
    READER_BOOKMARKS_KEY,
    next.slice(0, 300)
  );

  updateReaderActionTray();
}


/* Batch 3A — Inline Scripture notes */

function readerInlineNoteEditor(){
  return document.querySelector(
    "[data-reader-inline-note]"
  );
}


function removeReaderInlineNoteEditor(){
  document
    .querySelectorAll(
      ".sj-reader-verse.has-inline-note-open"
    )
    .forEach(verse => {
      verse.classList.remove(
        "has-inline-note-open"
      );
    });

  document
    .querySelector(
      "[data-reader-action-tray]"
    )
    ?.classList.remove(
      "is-scholar-note-mode"
    );

  readerInlineNoteEditor()?.remove();
}


/* Batch 3A.1 — Native annotation refinements */

function readerNoteIndicatorMarkup(){
  return `
    <span
      class="sj-reader-note-indicator"
      data-reader-note-indicator
      aria-label="This verse has a saved scholar note"
      title="Scholar note saved"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v5a2.5 2.5 0 0 1-2.5 2.5H11l-5 3v-3.3A2.5 2.5 0 0 1 4 12.5v-5A2.5 2.5 0 0 1 6.5 5Z"></path>
        <circle cx="8" cy="10" r=".7"></circle>
        <circle cx="12" cy="10" r=".7"></circle>
        <circle cx="16" cy="10" r=".7"></circle>
      </svg>
    </span>
  `;
}


function updateReaderVerseNoteIndicator(key){
  if(!key) return;

  const verse = document.querySelector(
    `[data-reader-key="${CSS.escape(key)}"]`
  );

  if(!verse) return;

  const existing = verse.querySelector(
    "[data-reader-note-indicator]"
  );

  const note = readReaderNotes()[key]?.note || "";

  if(note.trim()){
    if(!existing){
      verse.insertAdjacentHTML(
        "beforeend",
        readerNoteIndicatorMarkup()
      );
    }

    return;
  }

  existing?.remove();
}


function readerAnnotationViewportBounds(){
  const stickyControls = document.querySelector(
    "#bible .sj-biblia-top"
  );

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  const stickyRect =
    stickyControls?.getBoundingClientRect();

  const trayRect = (
    tray &&
    !tray.hidden
  )
    ? tray.getBoundingClientRect()
    : null;

  return {
    top:
      stickyRect
        ? stickyRect.bottom + 14
        : 14,

    bottom:
      trayRect
        ? trayRect.top - 14
        : window.innerHeight - 24
  };
}


function positionReaderVerseIntelligently(
  verseElement
){
  if(!verseElement) return;

  requestAnimationFrame(() => {
    const bounds =
      readerAnnotationViewportBounds();

    const rect =
      verseElement.getBoundingClientRect();

    const availableHeight =
      bounds.bottom - bounds.top;

    let scrollDelta = 0;

    if(rect.height > availableHeight){
      scrollDelta =
        rect.top -
        bounds.top;
    }else if(rect.bottom > bounds.bottom){
      scrollDelta =
        rect.bottom -
        bounds.bottom +
        16;
    }else if(rect.top < bounds.top){
      scrollDelta =
        rect.top -
        bounds.top -
        10;
    }

    if(Math.abs(scrollDelta) > 1){
      window.scrollBy({
        top:scrollDelta,
        behavior:"smooth"
      });
    }
  });
}


function positionReaderNoteIntelligently(
  verseElement,
  editor,
  targetHeight
){
  if(
    !verseElement ||
    !editor
  ){
    return;
  }

  requestAnimationFrame(() => {
    const bounds =
      readerAnnotationViewportBounds();

    const verseRect =
      verseElement.getBoundingClientRect();

    const editorRect =
      editor.getBoundingClientRect();

    const projectedBottom =
      editorRect.top +
      targetHeight;

    let scrollDelta = 0;

    if(verseRect.top < bounds.top){
      scrollDelta =
        verseRect.top -
        bounds.top -
        8;
    }else if(projectedBottom > bounds.bottom){
      const needed =
        projectedBottom -
        bounds.bottom +
        18;

      const maximumSafeScroll =
        Math.max(
          0,
          verseRect.top -
          bounds.top -
          8
        );

      scrollDelta =
        Math.min(
          needed,
          maximumSafeScroll
        );
    }

    if(Math.abs(scrollDelta) > 1){
      window.scrollBy({
        top:scrollDelta,
        behavior:"smooth"
      });
    }
  });
}


function renderReaderInlineNoteEditor(
  verseElement
){
  removeReaderInlineNoteEditor();

  if(
    !verseElement ||
    !selectedReaderVerse
  ){
    return;
  }

  const notes = readReaderNotes();

  const existing = notes[
    selectedReaderVerse.key
  ]?.note || "";

  const editor = document.createElement("section");

  editor.className = "sj-reader-inline-note";
  editor.dataset.readerInlineNote = "";
  editor.dataset.readerInlineNoteKey =
    selectedReaderVerse.key;

  editor.innerHTML = `
    <header class="sj-reader-inline-note-head">
      <div class="sj-reader-inline-note-heading">
        <span class="sj-reader-inline-note-kicker">
          Scholar Note
        </span>

        <div class="sj-reader-inline-note-reference-row">
          <strong>
            ${escapeHTML(selectedReaderVerse.ref)}
          </strong>

          <button
            type="button"
            class="sj-reader-inline-note-save sj-reader-inline-note-save-compact"
            data-reader-inline-note-save
          >
            Save Note
          </button>
        </div>
      </div>
    </header>

    <textarea
      data-reader-inline-note-input
      rows="4"
      maxlength="5000"
      placeholder="Write your note, observation, precept, or research connection..."
      aria-label="Note for ${escapeHTML(selectedReaderVerse.ref)}"
    >${escapeHTML(existing)}</textarea>

    <footer
      class="sj-reader-inline-note-footer"
      data-reader-inline-note-footer
      ${
        existing.trim()
          ? ""
          : "hidden"
      }
    >
      <button
        type="button"
        class="sj-reader-inline-note-delete"
        data-reader-inline-note-delete
      >
        Delete
      </button>
    </footer>
  `;

  verseElement.classList.add(
    "has-inline-note-open"
  );

  verseElement.insertAdjacentElement(
    "afterend",
    editor
  );

  document
    .querySelector(
      "[data-reader-action-tray]"
    )
    ?.classList.add(
      "is-scholar-note-mode"
    );

  editor.style.maxHeight = "0px";

  const targetHeight = editor.scrollHeight;

  const handleTransitionEnd = event => {
    if(
      event.propertyName !== "max-height" ||
      !editor.classList.contains("is-open")
    ){
      return;
    }

    editor.style.maxHeight = "none";
    editor.style.overflow = "visible";

    editor.removeEventListener(
      "transitionend",
      handleTransitionEnd
    );
  };

  editor.addEventListener(
    "transitionend",
    handleTransitionEnd
  );

  requestAnimationFrame(() => {
    editor.style.maxHeight =
      `${targetHeight}px`;

    editor.classList.add(
      "is-open"
    );

    positionReaderNoteIntelligently(
      verseElement,
      editor,
      targetHeight
    );
  });
}


function openReaderScholarNote(){
  if(!selectedReaderVerse) return;

  const existingEditor =
    readerInlineNoteEditor();

  if(existingEditor){
    removeReaderInlineNoteEditor();
    updateReaderActionTray();
    return;
  }

  const verseElement = document.querySelector(
    `[data-reader-key="${
      CSS.escape(selectedReaderVerse.key)
    }"]`
  );

  if(!verseElement) return;

  renderReaderInlineNoteEditor(
    verseElement
  );

  updateReaderActionTray();
}


function saveReaderInlineNote(){
  if(!selectedReaderVerse) return;

  const editor = readerInlineNoteEditor();

  const input = editor?.querySelector(
    "[data-reader-inline-note-input]"
  );

  if(!editor || !input) return;

  const notes = readReaderNotes();

  const trimmed = input.value.trim();

  if(trimmed){
    notes[selectedReaderVerse.key] = {
      key:selectedReaderVerse.key,
      ref:selectedReaderVerse.ref,
      text:selectedReaderVerse.text,
      note:trimmed,
      savedAt:new Date().toISOString()
    };
  }else{
    delete notes[selectedReaderVerse.key];
  }

  if(!writeReaderNotes(notes)){
    return;
  }

  updateReaderVerseNoteIndicator(
    selectedReaderVerse.key
  );

  const status = editor.querySelector(
    "[data-reader-inline-note-status]"
  );

  if(status){
    status.textContent = trimmed
      ? "Note saved"
      : "Empty note removed";
  }

  const deleteButton = editor.querySelector(
    "[data-reader-inline-note-delete]"
  );

  if(deleteButton){
    deleteButton.hidden = !trimmed;
  }

  const footer = editor.querySelector(
    "[data-reader-inline-note-footer]"
  );

  if(footer){
    footer.hidden = !trimmed;
  }
}


function deleteReaderInlineNote(){
  if(!selectedReaderVerse) return;

  const notes = readReaderNotes();

  delete notes[selectedReaderVerse.key];

  if(!writeReaderNotes(notes)){
    return;
  }

  updateReaderVerseNoteIndicator(
    selectedReaderVerse.key
  );

  const editor = readerInlineNoteEditor();

  const input = editor?.querySelector(
    "[data-reader-inline-note-input]"
  );

  const status = editor?.querySelector(
    "[data-reader-inline-note-status]"
  );

  const deleteButton = editor?.querySelector(
    "[data-reader-inline-note-delete]"
  );

  if(input){
    input.value = "";
  }

  if(status){
    status.textContent = "Note deleted";
  }

  if(deleteButton){
    deleteButton.hidden = true;
  }

  const footer = editor?.querySelector(
    "[data-reader-inline-note-footer]"
  );

  if(footer){
    footer.hidden = true;
  }
}


async function copySelectedReaderVerse(){
  if(!selectedReaderVerse) return;

  const value =
    `${selectedReaderVerse.ref} — ${
      selectedReaderVerse.text
    }`;

  try{
    await navigator.clipboard.writeText(
      value
    );

    setBibleNotice(
      `${selectedReaderVerse.ref} copied.`
    );
  }catch(error){
    console.warn(
      "Unable to copy selected verse.",
      error
    );

    window.prompt(
      "Copy this verse:",
      value
    );
  }
}


async function shareSelectedReaderVerse(){
  if(!selectedReaderVerse) return;

  const value =
    `${selectedReaderVerse.ref}\n\n${
      selectedReaderVerse.text
    }\n\nSemitic Jew Institute`;

  if(navigator.share){
    try{
      await navigator.share({
        title:selectedReaderVerse.ref,
        text:value
      });

      return;
    }catch(error){
      if(error?.name === "AbortError"){
        return;
      }

      console.warn(
        "Native verse share failed.",
        error
      );
    }
  }

  try{
    await navigator.clipboard.writeText(
      value
    );

    setBibleNotice(
      `${selectedReaderVerse.ref} copied for sharing.`
    );
  }catch(error){
    console.warn(
      "Verse share fallback failed.",
      error
    );
  }
}


function saveReaderHighlight(color){
  if(!selectedReaderVerse) return;

  const highlights = readReaderArray(
    READER_HIGHLIGHTS_KEY
  );

  const withoutCurrent = highlights.filter(
    item => (
      item?.key !== selectedReaderVerse.key
    )
  );

  const allowed = new Set([
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet"
  ]);

  const next = allowed.has(color)
    ? [
        {
          key:selectedReaderVerse.key,
          ref:selectedReaderVerse.ref,
          text:selectedReaderVerse.text,
          canon:selectedReaderVerse.canon,
          book:selectedReaderVerse.book,
          chapter:selectedReaderVerse.chapter,
          verse:selectedReaderVerse.verse,
          category:color,
          savedAt:new Date().toISOString()
        },
        ...withoutCurrent
      ]
    : withoutCurrent;

  writeReaderArray(
    READER_HIGHLIGHTS_KEY,
    next.slice(0, 300)
  );

  const selectedElement = document.querySelector(
    `[data-reader-key="${
      CSS.escape(selectedReaderVerse.key)
    }"]`
  );

  clearReaderHighlightClasses(
    selectedElement
  );

  applyReaderTransparentVerseText(
    selectedElement,
    !allowed.has(color)
  );

  if(selectedElement){
    selectedElement.classList.remove(
      "sj-reader-highlight-cleared",
      "sj-reader-highlight-preview-live"
    );

    delete selectedElement.dataset.readerPreviewColor;

    if(allowed.has(color)){
      selectedElement.classList.add(
        `sj-reader-highlight-${color}`
      );
    }else{
      selectedElement.classList.add(
        "sj-reader-highlight-cleared"
      );
    }
  }

  updateReaderActionTray();
}


function selectedReaderHighlightVerseElement(){
  if(!selectedReaderVerse){
    return null;
  }

  return document.querySelector(
    `[data-reader-key="${
      CSS.escape(selectedReaderVerse.key)
    }"]`
  );
}


function applyReaderTransparentVerseText(
  verse,
  isTransparent
){
  if(!verse){
    return;
  }

  const text = verse.querySelector(
    ".sj-reader-verse-text"
  );

  const number = verse.querySelector(
    ".sj-reader-verse-number"
  );

  if(isTransparent){
    verse.style.setProperty(
      "background",
      "transparent",
      "important"
    );

    verse.style.setProperty(
      "color",
      "#fff",
      "important"
    );

    text?.style.setProperty(
      "color",
      "#fff",
      "important"
    );

    number?.style.setProperty(
      "color",
      "var(--sj-orange)",
      "important"
    );

    return;
  }

  verse.style.removeProperty(
    "background"
  );

  verse.style.removeProperty(
    "color"
  );

  text?.style.removeProperty(
    "color"
  );

  number?.style.removeProperty(
    "color"
  );
}


function previewReaderHighlight(color){
  const verse =
    selectedReaderHighlightVerseElement();

  if(!verse){
    return;
  }

  const allowed = new Set([
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet"
  ]);

  const requested = String(
    color || ""
  ).trim();

  const normalized =
    requested === "clear"
      ? ""
      : requested;

  if(
    normalized &&
    !allowed.has(normalized)
  ){
    return;
  }

  clearReaderHighlightClasses(
    verse
  );

  applyReaderTransparentVerseText(
    verse,
    !normalized
  );

  if(normalized){
    verse.classList.add(
      `sj-reader-highlight-${normalized}`
    );
  }

  verse.dataset.readerPreviewColor =
    normalized;

  verse.classList.add(
    "sj-reader-highlight-preview-live"
  );

  document
    .querySelectorAll(
      "[data-reader-highlight-color]"
    )
    .forEach(button => {
      button.classList.toggle(
        "is-previewing",
        button.dataset.readerHighlightColor ===
          requested
      );
    });
}


function restoreReaderHighlightPreview(){
  if(
    readerHighlightPreviewOriginal === null
  ){
    return;
  }

  previewReaderHighlight(
    readerHighlightPreviewOriginal ||
    "clear"
  );

  readerHighlightPreviewOriginal = null;
}


function previewReaderHighlightFromEvent(
  event
){
  const colorButton = event.target.closest(
    "[data-reader-highlight-color]"
  );

  if(!colorButton){
    return;
  }

  const tray = colorButton.closest(
    "[data-reader-action-tray]"
  );

  if(
    !tray?.classList.contains(
      "is-highlight-mode"
    )
  ){
    return;
  }

  previewReaderHighlight(
    colorButton.dataset.readerHighlightColor
  );
}



function previewReaderHighlightFromPoint(
  clientX,
  clientY
){
  const target = document.elementFromPoint(
    clientX,
    clientY
  );

  const colorButton = target?.closest(
    "[data-reader-highlight-color]"
  );

  if(!colorButton){
    return;
  }

  const tray = colorButton.closest(
    "[data-reader-action-tray]"
  );

  if(
    !tray?.classList.contains(
      "is-highlight-mode"
    )
  ){
    return;
  }

  previewReaderHighlight(
    colorButton.dataset.readerHighlightColor
  );
}


function setReaderHighlightMode(isOpen){
  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  const palette = document.querySelector(
    "[data-reader-highlight-palette]"
  );

  const button = document.querySelector(
    '[data-reader-tool="highlight"]'
  );

  if(
    !tray ||
    !palette
  ){
    return;
  }

  if(
    isOpen &&
    selectedReaderVerse
  ){
    readerHighlightPreviewOriginal =
      getReaderHighlight(
        selectedReaderVerse.key
      )?.category || "";
  }

  if(
    !isOpen &&
    readerHighlightPreviewOriginal !== null
  ){
    restoreReaderHighlightPreview();
  }

  palette.hidden = !isOpen;

  palette.classList.toggle(
    "is-open",
    isOpen
  );

  tray.classList.toggle(
    "is-highlight-mode",
    isOpen
  );

  if(button){
    button.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  }
}


function toggleReaderHighlightPalette(){
  const palette = document.querySelector(
    "[data-reader-highlight-palette]"
  );

  if(!palette) return;

  setReaderHighlightMode(
    palette.hidden
  );
}


function readerWordStudyModal(){
  return document.querySelector(
    "[data-reader-word-study-modal]"
  );
}


function readerWordStudyContent(){
  return document.querySelector(
    "[data-reader-word-study-content]"
  );
}


function readerWordStudyWordStrip(){
  return document.querySelector(
    "[data-reader-word-study-words]"
  );
}


function readerWordStudyStatus(){
  return document.querySelector(
    "[data-reader-word-study-status]"
  );
}


function readerWordStudyReference(){
  return document.querySelector(
    "[data-reader-word-study-reference]"
  );
}


async function loadReaderWordStudyOrder(){
  if(readerWordStudyOrderCache){
    return readerWordStudyOrderCache;
  }

  readerWordStudyOrderCache = await fetchJSON(
    "/data/lexicon/verse-strongs-order.json"
  );

  return readerWordStudyOrderCache;
}


async function loadReaderHebrewLexicon(){
  if(readerHebrewLexiconCache){
    return readerHebrewLexiconCache;
  }

  readerHebrewLexiconCache = await fetchJSON(
    "/data/lexicon/strongs-hebrew.json"
  );

  return readerHebrewLexiconCache;
}


async function loadReaderGreekLexicon(){
  if(readerGreekLexiconCache){
    return readerGreekLexiconCache;
  }

  readerGreekLexiconCache = await fetchJSON(
    "/data/lexicon/strongs-greek.json"
  );

  return readerGreekLexiconCache;
}


function cleanWordStudyText(value){
  return typeof value === "string"
    ? value.trim()
    : "";
}


function usefulWordStudyText(value){
  const text = cleanWordStudyText(value);

  if(!text){
    return "";
  }

  const rejected = new Set([
    "or",
    "n.",
    "vb.",
    "adj.",
    "adv.",
    "prep.",
    "conj.",
    "pron."
  ]);

  return rejected.has(text.toLowerCase())
    ? ""
    : text;
}


function usefulWordStudyList(value){
  if(!Array.isArray(value)){
    return [];
  }

  return value
    .map(usefulWordStudyText)
    .filter(Boolean);
}


function wordStudyLexiconForCode(code){
  if(
    code.startsWith("H") &&
    readerHebrewLexiconCache
  ){
    return readerHebrewLexiconCache[code] || null;
  }

  if(
    code.startsWith("G") &&
    readerGreekLexiconCache
  ){
    return readerGreekLexiconCache[code] || null;
  }

  return null;
}


function wordStudyOrderKey(verse){
  if(!verse){
    return "";
  }

  return [
    verse.canon,
    verse.book,
    verse.chapter,
    verse.verse
  ].join("/");
}


function renderReaderWordStudyLoading(){
  const content = readerWordStudyContent();
  const strip = readerWordStudyWordStrip();
  const status = readerWordStudyStatus();

  if(strip){
    strip.innerHTML = "";
    strip.hidden = true;
  }

  if(status){
    status.hidden = false;
    status.textContent =
      "Loading original-language study data...";
  }

  if(content){
    content.innerHTML = `
      <div class="sj-word-study-loading">
        <span
          class="sj-word-study-spinner"
          aria-hidden="true"
        ></span>

        <p>
          Loading Word Study...
        </p>
      </div>
    `;
  }
}


function renderReaderWordStudyEmpty(message){
  const content = readerWordStudyContent();
  const strip = readerWordStudyWordStrip();
  const status = readerWordStudyStatus();

  activeReaderWordStudyTerms = [];
  activeReaderWordStudyIndex = 0;

  if(strip){
    strip.innerHTML = "";
    strip.hidden = true;
  }

  if(status){
    status.hidden = true;
  }

  if(content){
    content.innerHTML = `
      <div class="sj-word-study-empty">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"></path>
          <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"></path>
        </svg>

        <h3>Word Study unavailable</h3>

        <p>
          ${escapeHTML(message)}
        </p>
      </div>
    `;
  }
}


function renderReaderWordStudyWords(){
  const strip = readerWordStudyWordStrip();

  if(!strip){
    return;
  }

  strip.hidden = false;

  strip.innerHTML = activeReaderWordStudyTerms
    .map((term, index) => {
      const word = usefulWordStudyText(term.word);

      const label = word || term.code;

      return `
        <button
          type="button"
          class="sj-word-study-word${
            index === activeReaderWordStudyIndex
              ? " is-active"
              : ""
          }"
          data-reader-word-study-word="${index}"
          aria-pressed="${
            index === activeReaderWordStudyIndex
              ? "true"
              : "false"
          }"
        >
          <span>
            ${escapeHTML(label)}
          </span>

          <small>
            ${escapeHTML(term.code)}
          </small>
        </button>
      `;
    })
    .join("");
}


function renderReaderWordStudyDetail(index){
  const content = readerWordStudyContent();

  if(!content){
    return;
  }

  const term = activeReaderWordStudyTerms[index];

  if(!term){
    renderReaderWordStudyEmpty(
      "No original-language entry was found for this term."
    );

    return;
  }

  activeReaderWordStudyIndex = index;

  renderReaderWordStudyWords();

  const entry = term.lexicon || {};

  const word = usefulWordStudyText(term.word);
  const lemma = usefulWordStudyText(entry.lemma);
  const translit = usefulWordStudyText(entry.translit);
  const gloss = usefulWordStudyText(entry.gloss);

  const definitions = usefulWordStudyList(
    entry.defs
  );

  const refs = usefulWordStudyList(
    entry.refs
  );

  const strongsDefinition = usefulWordStudyText(
    entry.strongs_def
  );

  const kjvDefinition = usefulWordStudyText(
    entry.kjv_def
  );

  const derivation = usefulWordStudyText(
    entry.derivation
  );

  const isHebrew = term.code.startsWith("H");

  const hasLexiconContent = Boolean(
    lemma ||
    translit ||
    gloss ||
    definitions.length ||
    strongsDefinition ||
    kjvDefinition ||
    derivation ||
    refs.length
  );

  if(!hasLexiconContent){
    content.innerHTML = `
      <div class="sj-word-study-empty">
        <h3>
          ${escapeHTML(word || term.code)}
        </h3>

        <p>
          ${escapeHTML(term.code)} is attached to this verse,
          but no usable lexicon entry is currently available.
        </p>
      </div>
    `;

    return;
  }

  content.innerHTML = `
    <article class="sj-word-study-detail">
      <header class="sj-word-study-term-head">
        <div>
          ${
            word
              ? `
                <p class="sj-word-study-english-word">
                  ${escapeHTML(word)}
                </p>
              `
              : ""
          }

          <span class="sj-word-study-code">
            ${escapeHTML(term.code)}
          </span>
        </div>

        ${
          lemma
            ? `
              <h2
                class="sj-word-study-lemma"
                ${
                  isHebrew
                    ? 'dir="rtl" lang="he"'
                    : 'lang="grc"'
                }
              >
                ${escapeHTML(lemma)}
              </h2>
            `
            : ""
        }

        ${
          translit
            ? `
              <p class="sj-word-study-translit">
                ${escapeHTML(translit)}
              </p>
            `
            : ""
        }

        ${
          gloss
            ? `
              <p class="sj-word-study-gloss">
                ${escapeHTML(gloss)}
              </p>
            `
            : ""
        }
      </header>

      ${
        definitions.length
          ? `
            <section class="sj-word-study-section">
              <h3>Definitions</h3>

              <ul>
                ${definitions.map(definition => `
                  <li>
                    ${escapeHTML(definition)}
                  </li>
                `).join("")}
              </ul>
            </section>
          `
          : ""
      }

      ${
        strongsDefinition
          ? `
            <section class="sj-word-study-section">
              <h3>Strong's Definition</h3>

              <p>
                ${escapeHTML(strongsDefinition)}
              </p>
            </section>
          `
          : ""
      }

      ${
        kjvDefinition
          ? `
            <section class="sj-word-study-section">
              <h3>KJV Usage</h3>

              <p>
                ${escapeHTML(kjvDefinition)}
              </p>
            </section>
          `
          : ""
      }

      ${
        derivation
          ? `
            <section class="sj-word-study-section">
              <h3>Derivation</h3>

              <p>
                ${escapeHTML(derivation)}
              </p>
            </section>
          `
          : ""
      }

      ${
        refs.length
          ? `
            <section class="sj-word-study-section">
              <h3>Reference Examples</h3>

              <div class="sj-word-study-reference-list">
                ${refs.map(ref => `
                  <span>
                    ${escapeHTML(ref)}
                  </span>
                `).join("")}
              </div>
            </section>
          `
          : ""
      }
    </article>
  `;
}


async function openReaderWordStudy(){
  if(!selectedReaderVerse){
    return;
  }

  const modal = readerWordStudyModal();

  if(!modal){
    return;
  }

  const selectedKey = selectedReaderVerse.key;

  const reference = readerWordStudyReference();

  if(reference){
    reference.textContent =
      selectedReaderVerse.ref;
  }

  modal.hidden = false;

  document.body.classList.add(
    "sj-word-study-open"
  );

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(tray){
    tray.hidden = true;
  }

  document.body.classList.remove(
    "sj-reader-tray-open"
  );

  renderReaderWordStudyLoading();

  try{
    const orderData =
      await loadReaderWordStudyOrder();

    if(
      !selectedReaderVerse ||
      selectedReaderVerse.key !== selectedKey
    ){
      return;
    }

    const orderKey = wordStudyOrderKey(
      selectedReaderVerse
    );

    const orderedTerms = Array.isArray(
      orderData?.entries?.[orderKey]
    )
      ? orderData.entries[orderKey]
      : [];

    const fallbackCodes = Array.from(
      new Set(
        Array.isArray(selectedReaderVerse.strongs)
          ? selectedReaderVerse.strongs
          : []
      )
    )
      .filter(code => (
        typeof code === "string" &&
        /^[HG]\d+$/.test(code)
      ));

    const rawTerms = orderedTerms.length
      ? orderedTerms
      : fallbackCodes.map(code => ({
          word:"",
          code
        }));

    if(!rawTerms.length){
      renderReaderWordStudyEmpty(
        selectedReaderVerse.canon === "apocrypha"
          ? "No verified word-level Strong's alignment is currently available for this Apocrypha verse."
          : "No Strong's data is currently attached to this verse."
      );

      return;
    }

    const needsHebrew = rawTerms.some(
      term => term?.code?.startsWith("H")
    );

    const needsGreek = rawTerms.some(
      term => term?.code?.startsWith("G")
    );

    const loads = [];

    if(needsHebrew){
      loads.push(loadReaderHebrewLexicon());
    }

    if(needsGreek){
      loads.push(loadReaderGreekLexicon());
    }

    await Promise.all(loads);

    if(
      !selectedReaderVerse ||
      selectedReaderVerse.key !== selectedKey
    ){
      return;
    }

    activeReaderWordStudyTerms = rawTerms
      .filter(term => (
        term &&
        typeof term.code === "string"
      ))
      .map(term => ({
        word:cleanWordStudyText(term.word),
        code:term.code,
        lexicon:wordStudyLexiconForCode(
          term.code
        )
      }));

    activeReaderWordStudyIndex = 0;

    const status = readerWordStudyStatus();

    if(status){
      if(orderedTerms.length){
        status.hidden = true;
      }else{
        status.hidden = false;
        status.textContent =
          "Exact word-order alignment is unavailable for this verse. Showing attached Strong's entries without claiming word-by-word alignment.";
      }
    }

    if(!activeReaderWordStudyTerms.length){
      renderReaderWordStudyEmpty(
        "No usable Strong's entries were found for this verse."
      );

      return;
    }

    renderReaderWordStudyWords();
    renderReaderWordStudyDetail(0);

  }catch(error){
    console.warn(
      "Unable to load Word Study data.",
      error
    );

    renderReaderWordStudyEmpty(
      "Word Study data could not be loaded. Please try again."
    );
  }
}


function closeReaderWordStudy(){
  const modal = readerWordStudyModal();

  if(modal){
    modal.hidden = true;
  }

  document.body.classList.remove(
    "sj-word-study-open"
  );

  if(!selectedReaderVerse){
    return;
  }

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(tray){
    tray.hidden = false;
  }

  document.body.classList.add(
    "sj-reader-tray-open"
  );

  updateReaderActionTray();
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

  const readerNotes = readReaderNotes();

  const verseHTML = verses.map(verse => {
    const verseNumber = Number(verse.v);

    const strongs = Array.isArray(verse.s)
      ? verse.s
      : [];

    const key = readerVerseKey(
      canon.slug,
      book.slug,
      chapter,
      verseNumber
    );

    const highlight = getReaderHighlight(
      key
    );

    const highlightClass =
      readerHighlightClass(
        highlight?.category || ""
      );

    const hasNote = Boolean(
      readerNotes[key]?.note?.trim()
    );

    return `
      <p
        class="sj-reader-verse${
          highlightClass
            ? ` ${highlightClass}`
            : ""
        }"
        id="verse-${verseNumber}"
        data-reader-verse="${verseNumber}"
        data-reader-key="${escapeHTML(key)}"
        data-reader-strongs="${escapeHTML(
          strongs.join(",")
        )}"
        tabindex="0"
        role="button"
        aria-label="${
          escapeHTML(
            `${book.name} ${chapter}:${verseNumber}`
          )
        }"
      >
        <sup class="sj-reader-verse-number">
          ${verseNumber}
        </sup>

        <span class="sj-reader-verse-text">
          ${escapeHTML(verse.t || "")}
        </span>

        ${
          hasNote
            ? readerNoteIndicatorMarkup()
            : ""
        }
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

    <aside
      class="sj-reader-action-tray"
      data-reader-action-tray
      aria-label="Selected verse tools"
      hidden
    >
      <div class="sj-reader-action-tray-head">
      </div>

      <div class="sj-reader-tool-row">
        <button
          type="button"
          data-reader-tool="highlight"
          aria-label="Choose highlight color"
          aria-expanded="false"
        >
          <span
            class="sj-reader-color-stack"
            aria-hidden="true"
          >
            <span
              class="sj-reader-color-dot sj-reader-color-dot-yellow"
            ></span>
            <span
              class="sj-reader-color-dot sj-reader-color-dot-blue"
            ></span>
            <span
              class="sj-reader-color-dot sj-reader-color-dot-orange"
            ></span>
          </span>

          <span class="sj-reader-tool-label">
            Highlight
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="scholar-note"
          aria-label="Open Scholar Note for selected verse"
          aria-pressed="false"
        >
                    <svg
            class="sj-reader-scholar-note-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5.2 18.8 6.6 14l9.5-9.5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L10 17.4Z"></path>
            <path d="m14.7 5.9 3.4 3.4"></path>
            <path d="M5.2 18.8 10 17.4"></path>
            <path d="M3.5 21c3.2-1.3 6.4-1.4 9.6-.2"></path>
          </svg>

          <span class="sj-reader-tool-label">
            Note
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="save"
          aria-label="Save selected verse"
          aria-pressed="false"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h12v18l-6-4-6 4Z"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Save
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="copy"
          aria-label="Copy selected verse"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="8" y="8" width="11" height="12" rx="2"></rect>
            <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Copy
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="share"
          aria-label="Share selected verse"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V3"></path>
            <path d="m7 8 5-5 5 5"></path>
            <path d="M5 12v9h14v-9"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Share
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="word-study"
          aria-label="Open Logos word study for selected verse"
        >
                    <svg
            class="sj-reader-logos-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8.4 14.8C7.5 13.8 7 12.5 7 11a5 5 0 1 1 10 0c0 1.5-.5 2.8-1.4 3.8-.9.9-1.4 1.7-1.6 2.7h-4c-.2-1-.7-1.8-1.6-2.7Z"></path>
            <path d="M9.5 18.5h5"></path>
            <path d="M10.5 21h3"></path>
            <path d="M12 2V1"></path>
            <path d="m5.6 4.6-.8-.8"></path>
            <path d="m18.4 4.6.8-.8"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Logos
          </span>
        </button>
      </div>

      <div
        class="sj-reader-highlight-palette"
        data-reader-highlight-palette
        hidden
      >
        <button
          type="button"
          data-reader-highlight-color="red"
          aria-label="Red highlight"
          title="Red"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="orange"
          aria-label="Orange highlight"
          title="Orange"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="yellow"
          aria-label="Yellow highlight"
          title="Yellow"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="green"
          aria-label="Green highlight"
          title="Green"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="blue"
          aria-label="Blue highlight"
          title="Blue"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="indigo"
          aria-label="Indigo highlight"
          title="Indigo"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="violet"
          aria-label="Violet highlight"
          title="Violet"
        ></button>

        <button
          class="sj-reader-highlight-clear sj-reader-highlight-transparent"
          type="button"
          data-reader-highlight-color="clear"
          aria-label="Remove highlight and return verse to normal background"
          title="No highlight"
        >
          <span class="sj-reader-transparent-checker" aria-hidden="true"></span>
        </button>

        <button
          class="sj-reader-highlight-tools"
          type="button"
          data-reader-highlight-tools
          aria-label="Show other verse tools"
          title="More verse tools"
        >
          <span aria-hidden="true">
            •••
          </span>
        </button>
      </div>
    </aside>

    <div
      class="sj-word-study-modal"
      data-reader-word-study-modal
      hidden
    >
      <button
        class="sj-word-study-backdrop"
        type="button"
        data-reader-word-study-backdrop
        aria-label="Close Word Study"
      ></button>

      <section
        class="sj-word-study-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sj-word-study-title"
      >
        <div
          class="sj-word-study-handle"
          aria-hidden="true"
        ></div>

        <header class="sj-word-study-sheet-head">
          <div>
            <p
              class="sj-word-study-reference"
              data-reader-word-study-reference
            >
              Selected verse
            </p>

            <h2 id="sj-word-study-title">
              Word Study
            </h2>
          </div>

          <button
            class="sj-word-study-close"
            type="button"
            data-reader-word-study-close
            aria-label="Close Word Study"
          >
            ×
          </button>
        </header>

        <p
          class="sj-word-study-status"
          data-reader-word-study-status
          hidden
        ></p>

        <div
          class="sj-word-study-words"
          data-reader-word-study-words
          hidden
        ></div>

        <div
          class="sj-word-study-content"
          data-reader-word-study-content
          aria-live="polite"
        ></div>
      </section>
    </div>
  `;
}


function normalizedDailyPreceptBookName(value = ""){
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return normalized === "psalm"
    ? "psalms"
    : normalized;
}


function dailyPreceptReaderTarget(precept){
  const reference = String(
    precept?.reference || ""
  ).trim();

  const match = reference.match(
    /^(.+?)\s+(\d+):(\d+)$/
  );

  if(!match || !scriptureCanonData){
    return null;
  }

  const bookName =
    normalizedDailyPreceptBookName(match[1]);

  const chapter = Number(match[2]);
  const verse = Number(match[3]);

  if(
    !bookName ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    !Number.isInteger(verse) ||
    verse < 1
  ){
    return null;
  }

  for(const canon of scriptureCanonData.canons || []){
    const book = (canon.books || []).find(
      candidate => (
        normalizedDailyPreceptBookName(
          candidate.name
        ) === bookName
      )
    );

    if(!book){
      continue;
    }

    if(chapter > Number(book.chapters)){
      return null;
    }

    return {
      canon:canon.slug,
      book:book.slug,
      chapter,
      verse
    };
  }

  return null;
}


function scrollBibleReaderToVerse(verseNumber){
  const number = Number(verseNumber);

  if(
    !Number.isInteger(number) ||
    number < 1
  ){
    return false;
  }

  const verse = document.getElementById(
    `verse-${number}`
  );

  if(!verse){
    return false;
  }

  verse.scrollIntoView({
    block:"center",
    behavior:"auto"
  });

  return true;
}


function homeChapterMinimumSeconds(verseCount){
  return Math.min(
    90,
    Math.max(20, Number(verseCount) * 2)
  );
}


function homeBibleScreenIsActive(){
  const bibleScreen = document.querySelector(
    '[data-v3-screen="bible"]'
  );

  return Boolean(
    bibleScreen?.classList.contains("is-active") &&
    bibleBrowserStage === "reader"
  );
}


function homeChapterTrackerMatchesRenderedReader(
  tracker = homeChapterTracker
){
  if(!tracker){
    return false;
  }

  if(
    selectedBibleCanon !== tracker.canonSlug ||
    selectedBibleBook !== tracker.bookSlug ||
    selectedBibleChapter !== tracker.chapter
  ){
    return false;
  }

  const verses = Array.from(
    document.querySelectorAll(
      ".sj-reader-verse[data-reader-verse]"
    )
  );

  if(verses.length !== tracker.totalVerseCount){
    return false;
  }

  const finalVerse = verses.at(-1);

  return Boolean(
    finalVerse &&
    finalVerse.isConnected &&
    finalVerse.dataset.readerVerse ===
      String(tracker.finalVerseNumber)
  );
}


function homeChapterCanAccumulateTime(){
  return Boolean(
    homeChapterTracker &&
    !homeChapterTracker.completed &&
    homeChapterTracker.dateKey === localDateKey() &&
    document.visibilityState === "visible" &&
    homeBibleScreenIsActive() &&
    homeChapterTrackerMatchesRenderedReader()
  );
}


function homeChapterCurrentActiveMs(){
  if(!homeChapterTracker){
    return 0;
  }

  const runningMs =
    homeChapterTracker.activeStartedAt === null
      ? 0
      : performance.now() -
        homeChapterTracker.activeStartedAt;

  return homeChapterTracker.activeMs + runningMs;
}


function pauseHomeChapterTracker(){
  if(
    !homeChapterTracker ||
    homeChapterTracker.activeStartedAt === null
  ){
    return;
  }

  homeChapterTracker.activeMs +=
    performance.now() -
    homeChapterTracker.activeStartedAt;

  homeChapterTracker.activeStartedAt = null;
}


function resumeHomeChapterTracker(){
  if(!homeChapterTracker || homeChapterTracker.completed){
    return;
  }

  if(!homeChapterCanAccumulateTime()){
    pauseHomeChapterTracker();
    return;
  }

  if(homeChapterTracker.activeStartedAt === null){
    homeChapterTracker.activeStartedAt = performance.now();
  }
}


function stopHomeChapterTracker(){
  pauseHomeChapterTracker();

  if(homeChapterObserver){
    homeChapterObserver.disconnect();
    homeChapterObserver = null;
  }

  if(homeChapterTracker?.onScroll){
    window.removeEventListener(
      "scroll",
      homeChapterTracker.onScroll
    );
  }

  if(homeChapterTracker?.progressTimer){
    window.clearInterval(
      homeChapterTracker.progressTimer
    );
  }

  homeChapterTracker = null;
}


function stopHomeChapterTracking(){
  stopHomeChapterTracker();
}


function homeChapterVisibleRatio(element){
  if(!element?.isConnected){
    return 0;
  }

  const rect = element.getBoundingClientRect();
  const viewportHeight =
    window.innerHeight ||
    document.documentElement.clientHeight;
  const viewportWidth =
    window.innerWidth ||
    document.documentElement.clientWidth;

  if(
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.bottom <= 0 ||
    rect.top >= viewportHeight ||
    rect.right <= 0 ||
    rect.left >= viewportWidth
  ){
    return 0;
  }

  const visibleHeight =
    Math.min(rect.bottom, viewportHeight) -
    Math.max(rect.top, 0);
  const visibleWidth =
    Math.min(rect.right, viewportWidth) -
    Math.max(rect.left, 0);

  return Math.max(
    0,
    Math.min(
      1,
      (visibleHeight * visibleWidth) /
      (rect.height * rect.width)
    )
  );
}


function recordVisibleHomeVerse(verse){
  if(
    !homeChapterTracker ||
    homeChapterTracker.completed ||
    !verse?.matches?.(".sj-reader-verse[data-reader-verse]") ||
    !verse.isConnected
  ){
    return;
  }

  if(!homeChapterTrackerMatchesRenderedReader()){
    pauseHomeChapterTracker();
    return;
  }

  const verseNumber = Number(verse.dataset.readerVerse);

  if(!Number.isInteger(verseNumber)){
    return;
  }

  if(homeChapterVisibleRatio(verse) < .45){
    return;
  }

  homeChapterTracker.seenVerses.add(verseNumber);

  if(verseNumber === homeChapterTracker.finalVerseNumber){
    homeChapterTracker.finalVerseReached = true;
  }

  completeTrackedHomeChapter();
}


function recordCurrentlyVisibleHomeVerses(){
  if(!homeChapterTracker || homeChapterTracker.completed){
    return;
  }

  homeChapterTracker.verseElements.forEach(verse => {
    recordVisibleHomeVerse(verse);
  });
}


function homeChapterAlreadyCompletedToday(chapterKey){
  const { record } = todayHomeStudyRecord();

  return record.chapters.includes(chapterKey);
}


function homeChapterReadingQualified(){
  if(
    !homeChapterTracker ||
    homeChapterTracker.completed ||
    homeChapterTracker.dateKey !== localDateKey() ||
    !homeChapterTrackerMatchesRenderedReader() ||
    homeChapterAlreadyCompletedToday(
      homeChapterTracker.chapterKey
    )
  ){
    return false;
  }

  const activeSeconds =
    homeChapterCurrentActiveMs() / 1000;
  const traversalRatio =
    homeChapterTracker.totalVerseCount > 0
      ? homeChapterTracker.seenVerses.size /
        homeChapterTracker.totalVerseCount
      : 0;

  return (
    activeSeconds >= homeChapterTracker.minimumSeconds &&
    traversalRatio >= .6 &&
    homeChapterTracker.finalVerseReached
  );
}


function completeTrackedHomeChapter(){
  if(
    !homeChapterTracker ||
    homeChapterTracker.completed ||
    !homeChapterReadingQualified()
  ){
    return;
  }

  const {
    canonSlug,
    bookSlug,
    chapter
  } = homeChapterTracker;

  pauseHomeChapterTracker();

  markHomeChapterComplete(
    canonSlug,
    bookSlug,
    chapter
  );

  homeChapterTracker.completed = true;
  stopHomeChapterTracker();
}


function checkTrackedHomeChapterProgress(){
  if(!homeChapterTracker){
    return;
  }

  if(homeChapterTracker.dateKey !== localDateKey()){
    stopHomeChapterTracker();
    return;
  }

  if(!homeChapterTrackerMatchesRenderedReader()){
    stopHomeChapterTracker();
    return;
  }

  if(homeChapterCanAccumulateTime()){
    resumeHomeChapterTracker();
  }else{
    pauseHomeChapterTracker();
  }

  recordCurrentlyVisibleHomeVerses();
  completeTrackedHomeChapter();
}


function startHomeChapterTracker(
  canon,
  book,
  chapter
){
  stopHomeChapterTracker();

  const verses = Array.from(
    document.querySelectorAll(
      ".sj-reader-verse[data-reader-verse]"
    )
  );

  const finalVerse = verses.at(-1);
  const chapterNumber = Number(chapter);

  if(
    !canon?.slug ||
    !book?.slug ||
    !Number.isInteger(chapterNumber) ||
    !finalVerse
  ){
    return;
  }

  const finalVerseNumber = Number(
    finalVerse.dataset.readerVerse
  );
  const chapterKey = homeStudyChapterKey(
    canon.slug,
    book.slug,
    chapterNumber
  );

  if(
    !Number.isInteger(finalVerseNumber) ||
    homeChapterAlreadyCompletedToday(chapterKey)
  ){
    return;
  }

  homeChapterTracker = {
    canonSlug:canon.slug,
    bookSlug:book.slug,
    chapter:chapterNumber,
    chapterKey,
    dateKey:localDateKey(),
    verseElements:verses,
    totalVerseCount:verses.length,
    finalVerseNumber,
    seenVerses:new Set(),
    finalVerseReached:false,
    minimumSeconds:homeChapterMinimumSeconds(verses.length),
    activeMs:0,
    activeStartedAt:null,
    completed:false,
    onScroll:null,
    progressTimer:null
  };

  if("IntersectionObserver" in window){
    homeChapterObserver =
      new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(
            entry.isIntersecting &&
            entry.intersectionRatio >= .5
          ){
            recordVisibleHomeVerse(entry.target);
          }
        });
      }, {
        threshold:[0, .45, .5, .75, 1]
      });

    verses.forEach(verse => {
      homeChapterObserver.observe(verse);
    });
  }

  homeChapterTracker.onScroll = () => {
    recordCurrentlyVisibleHomeVerses();
    completeTrackedHomeChapter();
  };

  window.addEventListener(
    "scroll",
    homeChapterTracker.onScroll,
    { passive:true }
  );

  homeChapterTracker.progressTimer = window.setInterval(
    checkTrackedHomeChapterProgress,
    1000
  );

  resumeHomeChapterTracker();

  window.requestAnimationFrame(() => {
    checkTrackedHomeChapterProgress();
  });
}


function trackHomeChapterReading(
  canon,
  book,
  chapter
){
  startHomeChapterTracker(canon, book, chapter);
}


document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible"){
    resumeHomeChapterTracker();
  }else{
    pauseHomeChapterTracker();
  }
});


async function openDailyPreceptInBible(){
  try{
    if(!currentPrecept){
      await loadDailyPrecept();
    }

    if(!currentPrecept){
      setBibleNotice(
        "Verse of the Day is unavailable."
      );

      return;
    }

    if(!scriptureCanonData){
      await loadBibleBrowser();
    }

    const target = dailyPreceptReaderTarget(
      currentPrecept
    );

    if(!target){
      setBibleNotice(
        `${
          currentPrecept.reference ||
          "Verse of the Day"
        } is unavailable in the local reader.`
      );

      return;
    }

    await openBibleReader(
      target.canon,
      target.book,
      target.chapter,
      {
        focusVerse:target.verse,
        saveLocation:false
      }
    );
  }catch(error){
    console.warn(
      "Could not open the Verse of the Day in the Bible reader.",
      error
    );

    setBibleNotice(
      "Verse of the Day could not be opened right now."
    );
  }
}


async function openBibleReader(
  canonSlug,
  bookSlug,
  chapter,
  options = {}
){
  const canon = getBibleCanon(canonSlug);

  const book = getBibleBook(
    canonSlug,
    bookSlug
  );

  const chapterNumber = Number(chapter);

  const focusVerse = Number(
    options.focusVerse
  );

  const shouldSaveLocation =
    options.saveLocation !== false;

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
  stopHomeChapterTracker();

  selectedReaderVerse = null;
  closeReaderActionTray();

  selectedBibleCanon = canon.slug;
  selectedBibleBook = book.slug;
  selectedBibleChapter = chapterNumber;

  updateBibliaWritingsPill();

  if(shouldSaveLocation){
    saveBibleLocation();
  }

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

    trackHomeChapterReading(
      canon,
      book,
      chapterNumber
    );

    const focusedVerse =
      scrollBibleReaderToVerse(focusVerse);

    setBibleNotice(
      focusedVerse
        ? `${book.name} ${chapterNumber}:${focusVerse}`
        : `${book.name} ${chapterNumber}`
    );

    if(!focusedVerse){
      window.scrollTo({
        top:0,
        behavior:"smooth"
      });
    }
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


function readerFontLabel(size){
  return {
    base:"Standard",
    large:"Large",
    xlarge:"Extra Large"
  }[size] || "Standard";
}


function updateReaderFontMenuLabel(){
  const status = document.querySelector(
    "[data-bible-font] small"
  );

  if(!status) return;

  const current =
    document.documentElement.dataset.sjReaderFont ||
    "base";

  status.textContent =
    `${readerFontLabel(current)} Scripture text`;
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

  updateReaderFontMenuLabel();
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

  updateReaderFontMenuLabel();

  setBibleNotice(
    `Reader text size: ${readerFontLabel(next)}.`
  );
}


async function loadBibleBrowser(){
  const root = bibleBrowserContent();

  if(!root) return null;

  if(scriptureCanonData){
    return scriptureCanonData;
  }

  if(bibleBrowserLoadPromise){
    return bibleBrowserLoadPromise;
  }

  bibleBrowserLoadPromise = (async () => {
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

      return scriptureCanonData;
    }catch(error){
      scriptureCanonData = null;

      console.warn(
        "Bible navigation failed.",
        error
      );

      root.innerHTML = `
        <p class="sj-home-loading">
          Israelite Writings are temporarily unavailable.
        </p>
      `;

      return null;
    }
  })();

  const result = await bibleBrowserLoadPromise;

  bibleBrowserLoadPromise = null;

  return result;
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


function contentDisplayDate(value = ""){
  const time = Date.parse(value);

  if(!time){
    return "";
  }

  return new Date(time).toLocaleDateString(
    undefined,
    {
      month:"short",
      day:"numeric",
      year:"numeric"
    }
  );
}


function updateBibliaWritingsPill(){
  const control = document.querySelector(
    "[data-bible-open-canons]"
  );

  if(!control) return;

  const book =
    selectedBibleCanon &&
    selectedBibleBook
      ? getBibleBook(
          selectedBibleCanon,
          selectedBibleBook
        )
      : null;

  const label = book?.name || "Israelite Writings";

  control.textContent = label;

  control.setAttribute(
    "aria-label",
    book
      ? `Open Israelite Writings menu. Current book: ${book.name}.`
      : "Open Israelite Writings menu."
  );
}


function updateBibliaPath(){
  updateBibliaWritingsPill();

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
    await loadAppContentFeed();

    const episode = currentAppContentFeed()
      .podcasts[0];

    if(!episode){
      root.innerHTML = `
        <p class="sj-home-loading">
          The latest podcast episode will appear here
          when it is available.
        </p>
      `;

      return;
    }

    const title = cleanText(episode.title)
      .replace(/^EP\s*/i, "EP ");
    const publishedAt =
      contentDisplayDate(episode.publishedAt);

    root.innerHTML = `
      <article class="sj-podcast-card">
        ${
          episode.imageUrl
            ? `
              <div class="sj-podcast-art">
                <img
                  src="${escapeHTML(episode.imageUrl)}"
                  alt=""
                  loading="lazy"
                >
              </div>
            `
            : ""
        }

        <div class="sj-podcast-copy">
          <span class="sj-podcast-label">
            Latest Episode
          </span>

          <h3>${escapeHTML(title)}</h3>

          ${
            publishedAt || episode.duration
              ? `
                <p>
                  ${[
                    publishedAt,
                    episode.duration
                  ].filter(Boolean).map(escapeHTML).join(" · ")}
                </p>
              `
              : ""
          }

          ${
            episode.description
              ? `<p>${escapeHTML(episode.description)}</p>`
              : ""
          }

          <div class="sj-podcast-actions">
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

          ${
            episode.audioUrl
              ? `
                <div
                  class="sj-podcast-player"
                  data-podcast-player
                >
                  <audio
                    controls
                    preload="none"
                    src="${escapeHTML(episode.audioUrl)}"
                  ></audio>
                </div>
              `
              : ""
          }
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
  if(event.target.closest("[data-home-study-streak-open]")){
    event.preventDefault();

    openHomeStudyStreakShelf();

    return;
  }


  if(event.target.closest("[data-home-study-streak-close]")){
    event.preventDefault();

    closeHomeStudyStreakShelf();

    return;
  }


  const lessonOpen = event.target.closest(
    "[data-scripture-lesson-open]"
  );

  if(lessonOpen){
    event.preventDefault();

    openHomeLessonPlayer(
      lessonOpen.dataset.scriptureLessonId
    );

    return;
  }


  if(event.target.closest("[data-scripture-lesson-close]")){
    event.preventDefault();

    closeHomeLessonPlayer();

    return;
  }


  const lessonShare = event.target.closest(
    "[data-scripture-lesson-share]"
  );

  if(lessonShare){
    event.preventDefault();

    shareHomeLesson(
      lessonShare.dataset.scriptureLessonId
    );

    return;
  }


  if(event.target.closest("[data-scripture-lesson-follow]")){
    const status = document.querySelector(
      "[data-scripture-lesson-status]"
    );

    if(status){
      status.hidden = false;
      status.textContent =
        "Profiles and following are coming soon.";
    }

    return;
  }


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


  if(event.target.closest("[data-precept-see-all]")){
    event.preventDefault();

    openHomeLessonLibrary();
  }
});


document.addEventListener(
  "timeupdate",
  event => {
    const video = event.target.closest(
      "[data-scripture-lesson-video]"
    );

    if(video){
      updateHomeLessonWatchProgress(video);
    }
  },
  true
);


document.addEventListener(
  "ended",
  event => {
    const video = event.target.closest(
      "[data-scripture-lesson-video]"
    );

    if(video){
      updateHomeLessonWatchProgress(video);
    }
  },
  true
);


document
  .querySelector("[data-bible-search]")
  ?.addEventListener("click", () => {
    setBibleNotice(
      "Scripture search will be connected in a later reader batch."
    );
  });


function positionBibleMoreMenu(){
  const menu = document.querySelector(
    "[data-bible-more-menu]"
  );

  const trigger = document.querySelector(
    "[data-bible-more]"
  );

  if(
    !menu ||
    !trigger
  ){
    return;
  }

  const rect = trigger.getBoundingClientRect();

  const menuWidth = Math.min(
    286,
    window.innerWidth - 28
  );

  menu.style.width =
    `${menuWidth}px`;

  menu.style.top =
    `${Math.round(rect.bottom + 8)}px`;

  menu.style.right =
    `${
      Math.max(
        14,
        Math.round(
          window.innerWidth - rect.right
        )
      )
    }px`;

  menu.style.left = "auto";
}


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

    const willOpen = menu.hidden;

    menu.hidden = !willOpen;

    if(willOpen){
      positionBibleMoreMenu();
    }
  });


window.addEventListener("resize", () => {
  const menu = document.querySelector(
    "[data-bible-more-menu]"
  );

  if(
    menu &&
    !menu.hidden
  ){
    positionBibleMoreMenu();
  }
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



document.addEventListener(
  "pointerover",
  previewReaderHighlightFromEvent
);

document.addEventListener(
  "pointerdown",
  previewReaderHighlightFromEvent
);

document.addEventListener(
  "pointermove",
  event => {
    if(
      event.pointerType === "mouse" &&
      event.buttons === 0
    ){
      previewReaderHighlightFromEvent(
        event
      );

      return;
    }

    previewReaderHighlightFromPoint(
      event.clientX,
      event.clientY
    );
  }
);

document.addEventListener(
  "touchmove",
  event => {
    const touch = event.touches?.[0];

    if(!touch){
      return;
    }

    previewReaderHighlightFromPoint(
      touch.clientX,
      touch.clientY
    );
  },
  {
    passive:true
  }
);

document.addEventListener(
  "focusin",
  previewReaderHighlightFromEvent
);


/* =========================================================
   Build 3F.2 — Verse selection and real reader tools
   ========================================================= */

document.addEventListener("click", event => {
  const verse = event.target.closest(
    ".sj-reader-verse[data-reader-verse]"
  );

  if(verse){
    selectReaderVerse(verse);
    return;
  }


  if(
    event.target.closest(
      "[data-reader-action-close]"
    )
  ){
    closeReaderActionTray();
    return;
  }


  const colorButton = event.target.closest(
    "[data-reader-highlight-color]"
  );

  if(colorButton){
    const color =
      colorButton.dataset.readerHighlightColor;

    previewReaderHighlight(
      color
    );

    saveReaderHighlight(
      color
    );

    readerHighlightPreviewOriginal =
      color === "clear"
        ? ""
        : color;

    requestAnimationFrame(() => {
      setReaderHighlightMode(true);

      previewReaderHighlight(
        color
      );
    });

    return;
  }


  if(
    event.target.closest(
      "[data-reader-word-study-close]"
    ) ||
    event.target.closest(
      "[data-reader-word-study-backdrop]"
    )
  ){
    closeReaderWordStudy();
    return;
  }


  const wordStudyWord = event.target.closest(
    "[data-reader-word-study-word]"
  );

  if(wordStudyWord){
    const index = Number(
      wordStudyWord.dataset.readerWordStudyWord
    );

    if(Number.isInteger(index)){
      renderReaderWordStudyDetail(index);
    }

    return;
  }


  if(
    event.target.closest(
      "[data-reader-inline-note-close]"
    )
  ){
    removeReaderInlineNoteEditor();
    updateReaderActionTray();
    return;
  }

  if(
    event.target.closest(
      "[data-reader-inline-note-save]"
    )
  ){
    saveReaderInlineNote();
    return;
  }

  if(
    event.target.closest(
      "[data-reader-inline-note-delete]"
    )
  ){
    deleteReaderInlineNote();
    return;
  }

  if(
    event.target.closest(
      "[data-reader-highlight-tools]"
    )
  ){
    setReaderHighlightMode(false);
    return;
  }

  const toolButton = event.target.closest(
    "[data-reader-tool]"
  );

  if(!toolButton) return;

  const tool = toolButton.dataset.readerTool;

  if(tool === "highlight"){
    toggleReaderHighlightPalette();
    return;
  }

  if(tool === "scholar-note"){
    openReaderScholarNote();
    return;
  }

  if(tool === "save"){
    toggleReaderBookmark();
    return;
  }

  if(tool === "copy"){
    copySelectedReaderVerse();
    return;
  }

  if(tool === "share"){
    shareSelectedReaderVerse();
    return;
  }

  if(tool === "word-study"){
    openReaderWordStudy();
  }
});


document.addEventListener("keydown", event => {
  if(
    event.key !== "Enter" &&
    event.key !== " "
  ){
    return;
  }

  const verse = event.target.closest(
    ".sj-reader-verse[data-reader-verse]"
  );

  if(!verse) return;

  event.preventDefault();

  selectReaderVerse(verse);
});



/* =========================================================
   Build 3G.3 — Word Study keyboard controls
   ========================================================= */

document.addEventListener("keydown", event => {
  if(event.key !== "Escape"){
    return;
  }

  const modal = readerWordStudyModal();

  if(modal && !modal.hidden){
    closeReaderWordStudy();
  }
});



/* =========================================================
   Build 3H.3 — Articles browser events
   ========================================================= */

document.addEventListener("click", event => {
  const reload = event.target.closest(
    "[data-reload-articles]"
  );

  if(!reload){
    return;
  }

  const root = articleBrowserRoot();

  if(root){
    root.innerHTML = `
      <div class="sj-articles-loading">
        <span
          class="sj-articles-loading-ring"
          aria-hidden="true"
        ></span>

        <p>Loading articles...</p>
      </div>
    `;
  }

  loadArticlesBrowser();
});


/* =========================================================
   Build 3H.4.2 — In-app Article reader events
   ========================================================= */

document.addEventListener("click", event => {
  const articleLink = event.target.closest(
    "[data-app-article-link]"
  );

  if(articleLink){
    const href = normalizedAppArticleURL(
      articleLink.getAttribute("href")
    );

    if(href){
      event.preventDefault();

      openArticleReader(
        href
      );
    }

    return;
  }


  const back = event.target.closest(
    "[data-app-article-back]"
  );

  if(back){
    event.preventDefault();

    closeArticleReader();

    return;
  }


  const share = event.target.closest(
    "[data-app-article-share]"
  );

  if(share){
    event.preventDefault();

    shareActiveArticle();
  }
});


/* =========================================================
   Build 3I.3 — Native Research browser
   ========================================================= */

let researchEntries = [];
let researchSearchTerm = "";
let researchActiveLetter = "";
let researchVisibleCount = 24;
let researchLoaded = false;


function researchBrowserRoot(){
  return document.querySelector(
    "[data-research-browser]"
  );
}


function normalizeResearchSearchText(value){
  return String(
    value ?? ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[’‘]/g,
      "'"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function researchEntryCompletenessScore(entry){
  if(
    !entry ||
    typeof entry !== "object"
  ){
    return 0;
  }

  let score = 0;

  const textFields = [
    "headword",
    "pos",
    "definition",
    "usage_notes",
    "syllables",
    "etymology"
  ];

  textFields.forEach(field => {
    const value = cleanText(
      entry[field]
    );

    if(value){
      score += 1;

      score += Math.min(
        value.length / 120,
        4
      );
    }
  });

  const listFields = [
    "variants",
    "see_also",
    "bible_refs"
  ];

  listFields.forEach(field => {
    const values = Array.isArray(
      entry[field]
    )
      ? entry[field]
      : [];

    score += Math.min(
      values.length,
      8
    );
  });

  return score;
}


function dedupeResearchEntries(rawEntries){
  const byId = new Map();

  rawEntries.forEach(
    (
      entry,
      index
    ) => {
      if(
        !entry ||
        typeof entry !== "object"
      ){
        return;
      }

      const id = cleanText(
        entry.id
      );

      const headword = cleanText(
        entry.headword
      );

      if(
        !id ||
        !headword
      ){
        return;
      }

      const normalized = {
        ...entry,
        id,
        headword,
        letter:cleanText(
          entry.letter
        ).toUpperCase(),
        pos:cleanText(
          entry.pos
        ),
        definition:cleanText(
          entry.definition
        ),
        usage_notes:cleanText(
          entry.usage_notes
        ),
        syllables:cleanText(
          entry.syllables
        ),
        etymology:cleanText(
          entry.etymology
        ),
        variants:Array.isArray(
          entry.variants
        )
          ? entry.variants.filter(Boolean)
          : [],
        see_also:Array.isArray(
          entry.see_also
        )
          ? entry.see_also.filter(Boolean)
          : [],
        bible_refs:Array.isArray(
          entry.bible_refs
        )
          ? entry.bible_refs.filter(Boolean)
          : [],
        _sourceIndex:index
      };

      const existing = byId.get(
        id
      );

      if(!existing){
        byId.set(
          id,
          normalized
        );

        return;
      }

      if(
        researchEntryCompletenessScore(
          normalized
        ) >
        researchEntryCompletenessScore(
          existing
        )
      ){
        byId.set(
          id,
          normalized
        );
      }
    }
  );

  return Array.from(
    byId.values()
  ).sort(
    (
      a,
      b
    ) => {
      return a.headword.localeCompare(
        b.headword,
        undefined,
        {
          sensitivity:"base"
        }
      );
    }
  );
}


function researchEntryReferences(entry){
  return (
    Array.isArray(
      entry?.bible_refs
    )
      ? entry.bible_refs
      : []
  ).filter(ref => {
    return cleanText(
      ref?.label
    );
  });
}


function researchEntryHaystack(entry){
  const variants = Array.isArray(
    entry?.variants
  )
    ? entry.variants.join(" ")
    : "";

  const related = Array.isArray(
    entry?.see_also
  )
    ? entry.see_also.join(" ")
    : "";

  const references = researchEntryReferences(
    entry
  )
    .map(
      ref => ref.label
    )
    .join(" ");

  return normalizeResearchSearchText(
    [
      entry?.id,
      entry?.headword,
      entry?.pos,
      entry?.definition,
      entry?.usage_notes,
      entry?.syllables,
      entry?.etymology,
      variants,
      related,
      references
    ].join(" ")
  );
}


function researchSearchRank(
  entry,
  query
){
  const headword =
    normalizeResearchSearchText(
      entry.headword
    );

  const variants =
    normalizeResearchSearchText(
      (
        entry.variants || []
      ).join(" ")
    );

  const definition =
    normalizeResearchSearchText(
      entry.definition
    );

  if(headword === query){
    return 0;
  }

  if(
    headword.startsWith(
      query
    )
  ){
    return 1;
  }

  if(
    headword.includes(
      query
    )
  ){
    return 2;
  }

  if(
    variants.includes(
      query
    )
  ){
    return 3;
  }

  if(
    definition.includes(
      query
    )
  ){
    return 4;
  }

  return 5;
}


function filteredResearchEntries(){
  const query =
    normalizeResearchSearchText(
      researchSearchTerm
    );

  const terms = query
    ? query.split(/\s+/)
    : [];

  let entries = researchEntries.filter(
    entry => {
      if(
        researchActiveLetter &&
        entry.letter !==
          researchActiveLetter
      ){
        return false;
      }

      if(!terms.length){
        return true;
      }

      const haystack =
        researchEntryHaystack(
          entry
        );

      return terms.every(
        term => {
          return haystack.includes(
            term
          );
        }
      );
    }
  );

  if(query){
    entries = entries.sort(
      (
        a,
        b
      ) => {
        const rankDifference =
          researchSearchRank(
            a,
            query
          ) -
          researchSearchRank(
            b,
            query
          );

        if(rankDifference){
          return rankDifference;
        }

        return a.headword.localeCompare(
          b.headword,
          undefined,
          {
            sensitivity:"base"
          }
        );
      }
    );
  }

  return entries;
}


function availableResearchLetters(){
  return Array.from(
    new Set(
      researchEntries
        .map(
          entry => entry.letter
        )
        .filter(Boolean)
    )
  ).sort();
}


function findResearchEntryById(id){
  const needle =
    normalizeResearchSearchText(
      id
    );

  if(!needle){
    return null;
  }

  return (
    researchEntries.find(
      entry => {
        return (
          normalizeResearchSearchText(
            entry.id
          ) === needle ||
          normalizeResearchSearchText(
            entry.headword
          ) === needle
        );
      }
    ) || null
  );
}


function featuredResearchEntry(){
  const preferred = [
    "israelites",
    "gentiles",
    "logic",
    "abraham",
    "jacob-israel"
  ];

  for(
    const id
    of preferred
  ){
    const entry =
      findResearchEntryById(
        id
      );

    if(entry){
      return entry;
    }
  }

  return (
    researchEntries.find(
      entry => {
        return (
          entry.definition &&
          entry.bible_refs.length
        );
      }
    ) ||
    researchEntries[0] ||
    null
  );
}


function researchReferenceChipsHTML(
  entry,
  limit = 3
){
  const references =
    researchEntryReferences(
      entry
    ).slice(
      0,
      limit
    );

  if(!references.length){
    return "";
  }

  return `
    <div class="sj-research-reference-chips">
      ${
        references.map(
          ref => {
            return `
              <span>
                ${escapeHTML(
                  ref.label
                )}
              </span>
            `;
          }
        ).join("")
      }
    </div>
  `;
}


function researchEntryCardHTML(entry){
  const references =
    researchReferenceChipsHTML(
      entry,
      2
    );

  return `
    <a
      class="sj-research-entry-card"
      href="/encyclopedia.html#${encodeURIComponent(
        entry.id
      )}"
      data-research-entry-link
      data-research-entry-id="${escapeHTML(
        entry.id
      )}"
    >
      <div class="sj-research-entry-card-top">
        <span class="sj-research-entry-letter">
          ${escapeHTML(
            entry.letter || "•"
          )}
        </span>

        <span
          class="sj-research-entry-arrow"
          aria-hidden="true"
        >
          ›
        </span>
      </div>

      <div class="sj-research-entry-heading">
        <h3>
          ${escapeHTML(
            entry.headword
          )}
        </h3>

        ${
          entry.pos
            ? `
              <span>
                ${escapeHTML(
                  entry.pos
                )}
              </span>
            `
            : ""
        }
      </div>

      <p>
        ${escapeHTML(
          entry.definition
        )}
      </p>

      ${references}
    </a>
  `;
}


function renderResearchBrowserLoading(){
  const root =
    researchBrowserRoot();

  if(!root){
    return;
  }

  root.innerHTML = `
    <div class="sj-research-loading">
      <span
        class="sj-articles-loading-ring"
        aria-hidden="true"
      ></span>

      <p>
        Loading the encyclopedia...
      </p>
    </div>
  `;
}


function renderResearchBrowserError(){
  const root =
    researchBrowserRoot();

  if(!root){
    return;
  }

  root.innerHTML = `
    <section class="sj-research-error">
      <span class="sj-placeholder-label">
        Research
      </span>

      <h2>
        The encyclopedia could not be loaded.
      </h2>

      <p>
        Please reload the Research tab and try again.
      </p>

      <button
        type="button"
        data-research-reload
      >
        Reload Encyclopedia
      </button>
    </section>
  `;
}


function renderResearchBrowserShell(){
  const root =
    researchBrowserRoot();

  if(!root){
    return;
  }

  const featured =
    featuredResearchEntry();

  const letters =
    availableResearchLetters();

  root.innerHTML = `
    <section class="sj-research-intro">
      <p class="sj-research-kicker">
        Semitic Jew Institute
      </p>

      <h2>
        Search the Institute.
      </h2>

      <p class="sj-research-intro-copy">
        Explore Scripture, history, logic, people,
        nations, places, prophecy, and Israelite subjects.
      </p>

      <div class="sj-research-search-shell">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="10.5"
            cy="10.5"
            r="6.5"
          ></circle>

          <path
            d="m16 16 5 5"
          ></path>
        </svg>

        <input
          type="search"
          placeholder="Abraham, Gentiles, Logic, Edom..."
          aria-label="Search the Israelite Encyclopedia"
          autocomplete="off"
          spellcheck="false"
          value="${escapeHTML(
            researchSearchTerm
          )}"
          data-research-search
        >

        <button
          type="button"
          aria-label="Clear research search"
          data-research-clear
          hidden
        >
          ×
        </button>
      </div>

      <div class="sj-research-stats">
        <span>
          <strong>
            ${researchEntries.length}
          </strong>
          unique entries
        </span>

        <span aria-hidden="true">•</span>

        <span>
          <strong>
            ${letters.length}
          </strong>
          indexed letters
        </span>
      </div>
    </section>

    ${
      featured
        ? `
          <section class="sj-research-featured">
            <p class="sj-section-kicker">
              Featured Research
            </p>

            <a
              class="sj-research-featured-card"
              href="/encyclopedia.html#${encodeURIComponent(
                featured.id
              )}"
              data-research-entry-link
              data-research-entry-id="${escapeHTML(
                featured.id
              )}"
            >
              <div class="sj-research-featured-top">
                <span>
                  ${escapeHTML(
                    featured.letter || "•"
                  )}
                </span>

                ${
                  featured.pos
                    ? `
                      <small>
                        ${escapeHTML(
                          featured.pos
                        )}
                      </small>
                    `
                    : ""
                }
              </div>

              <h3>
                ${escapeHTML(
                  featured.headword
                )}
              </h3>

              <p>
                ${escapeHTML(
                  featured.definition
                )}
              </p>

              ${researchReferenceChipsHTML(
                featured,
                3
              )}

              <strong class="sj-research-open-label">
                Open entry
                <span aria-hidden="true">›</span>
              </strong>
            </a>
          </section>
        `
        : ""
    }

    <section class="sj-research-library">
      <div class="sj-research-library-heading">
        <div>
          <p class="sj-section-kicker">
            Research Library
          </p>

          <h2>
            Browse the Encyclopedia
          </h2>
        </div>

        <span
          class="sj-research-results-summary"
          data-research-results-summary
        ></span>
      </div>

      <div
        class="sj-research-alphabet"
        aria-label="Filter research entries by letter"
      >
        <button
          class="is-active"
          type="button"
          data-research-letter=""
        >
          All
        </button>

        ${
          letters.map(
            letter => {
              return `
                <button
                  type="button"
                  data-research-letter="${escapeHTML(
                    letter
                  )}"
                >
                  ${escapeHTML(
                    letter
                  )}
                </button>
              `;
            }
          ).join("")
        }
      </div>

      <div
        class="sj-research-results"
        data-research-results
      ></div>
    </section>
  `;

  renderResearchResults();
}


function renderResearchResults(){
  const root =
    researchBrowserRoot();

  if(!root){
    return;
  }

  const resultsRoot =
    root.querySelector(
      "[data-research-results]"
    );

  const summary =
    root.querySelector(
      "[data-research-results-summary]"
    );

  const clearButton =
    root.querySelector(
      "[data-research-clear]"
    );

  if(!resultsRoot){
    return;
  }

  const filtered =
    filteredResearchEntries();

  const visible =
    filtered.slice(
      0,
      researchVisibleCount
    );

  if(summary){
    summary.textContent = `${
      filtered.length
    } ${
      filtered.length === 1
        ? "entry"
        : "entries"
    }`;
  }

  if(clearButton){
    clearButton.hidden =
      !researchSearchTerm;
  }

  root.querySelectorAll(
    "[data-research-letter]"
  ).forEach(button => {
    const letter =
      cleanText(
        button.dataset.researchLetter
      );

    button.classList.toggle(
      "is-active",
      letter ===
        researchActiveLetter
    );
  });

  if(!filtered.length){
    resultsRoot.innerHTML = `
      <div class="sj-research-empty">
        <span aria-hidden="true">
          ?
        </span>

        <h3>
          No entries found.
        </h3>

        <p>
          Try another word, related term,
          Scripture reference, or letter.
        </p>
      </div>
    `;

    return;
  }

  resultsRoot.innerHTML = `
    <div class="sj-research-entry-list">
      ${
        visible.map(
          researchEntryCardHTML
        ).join("")
      }
    </div>

    ${
      visible.length <
      filtered.length
        ? `
          <button
            class="sj-research-load-more"
            type="button"
            data-research-load-more
          >
            Load More

            <span>
              ${
                filtered.length -
                visible.length
              } remaining
            </span>
          </button>
        `
        : `
          <p class="sj-research-list-end">
            Showing all ${
              filtered.length
            } ${
              filtered.length === 1
                ? "entry"
                : "entries"
            }.
          </p>
        `
    }
  `;
}


async function loadResearchBrowser(){
  const root =
    researchBrowserRoot();

  if(!root){
    return;
  }

  if(
    researchLoaded &&
    researchEntries.length
  ){
    renderResearchBrowserShell();

    return;
  }

  renderResearchBrowserLoading();

  try{
    const payload = await fetchJSON(
      "/data/israelite_dictionary.json"
    );

    const rawEntries =
      Array.isArray(
        payload?.entries
      )
        ? payload.entries
        : [];

    if(!rawEntries.length){
      throw new Error(
        "No Israelite encyclopedia entries were found."
      );
    }

    researchEntries =
      dedupeResearchEntries(
        rawEntries
      );

    if(!researchEntries.length){
      throw new Error(
        "No usable Israelite encyclopedia entries were found."
      );
    }

    researchLoaded = true;

    console.info(
      "[Build 3I] Research entries:",
      {
        raw:rawEntries.length,
        unique:researchEntries.length
      }
    );

    renderResearchBrowserShell();

  }catch(error){
    console.warn(
      "Native Research browser failed.",
      error
    );

    renderResearchBrowserError();
  }
}


document.addEventListener(
  "input",
  event => {
    const input =
      event.target.closest(
        "[data-research-search]"
      );

    if(!input){
      return;
    }

    researchSearchTerm =
      input.value;

    researchVisibleCount = 24;

    renderResearchResults();
  }
);


document.addEventListener(
  "click",
  event => {
    const letterButton =
      event.target.closest(
        "[data-research-letter]"
      );

    if(letterButton){
      event.preventDefault();

      researchActiveLetter =
        cleanText(
          letterButton.dataset
            .researchLetter
        );

      researchVisibleCount = 24;

      renderResearchResults();

      return;
    }


    const clearButton =
      event.target.closest(
        "[data-research-clear]"
      );

    if(clearButton){
      event.preventDefault();

      researchSearchTerm = "";

      researchVisibleCount = 24;

      const input =
        researchBrowserRoot()
          ?.querySelector(
            "[data-research-search]"
          );

      if(input){
        input.value = "";
        input.focus();
      }

      renderResearchResults();

      return;
    }


    const loadMoreButton =
      event.target.closest(
        "[data-research-load-more]"
      );

    if(loadMoreButton){
      event.preventDefault();

      researchVisibleCount += 24;

      renderResearchResults();

      return;
    }


    const reloadButton =
      event.target.closest(
        "[data-research-reload]"
      );

    if(reloadButton){
      event.preventDefault();

      researchLoaded = false;

      researchEntries = [];

      loadResearchBrowser();
    }
  }
);


loadResearchBrowser();


/* =========================================================
   Build 3I.4 — Native in-app Research reader
   ========================================================= */

let activeResearchEntryId = null;


function researchRelatedDisplayLabel(value){
  const clean = cleanText(
    value
  );

  if(!clean){
    return "";
  }

  const entry =
    findResearchEntryById(
      clean
    );

  if(entry){
    return entry.headword;
  }

  return clean
    .replace(
      /[-_]+/g,
      " "
    )
    .replace(
      /\b\w/g,
      character => {
        return character.toUpperCase();
      }
    );
}


function researchCanonLabel(canon){
  const value = cleanText(
    canon
  ).toLowerCase();

  if(value === "tanakh"){
    return "Tanakh";
  }

  if(value === "newtestament"){
    return "New Testament";
  }

  if(value === "apocrypha"){
    return "Apocrypha";
  }

  return "";
}


function researchReaderTextSection(
  label,
  value,
  className = ""
){
  const text = cleanText(
    value
  );

  if(!text){
    return "";
  }

  return `
    <section
      class="sj-research-reader-section ${
        className
      }"
    >
      <p class="sj-research-reader-label">
        ${escapeHTML(label)}
      </p>

      <p class="sj-research-reader-copy">
        ${escapeHTML(text)}
      </p>
    </section>
  `;
}


function researchReaderVariantsHTML(entry){
  const variants = Array.isArray(
    entry?.variants
  )
    ? entry.variants
        .map(cleanText)
        .filter(Boolean)
    : [];

  if(!variants.length){
    return "";
  }

  return `
    <section class="sj-research-reader-section">
      <p class="sj-research-reader-label">
        Variants
      </p>

      <div class="sj-research-reader-inline-list">
        ${
          variants.map(
            value => {
              return `
                <span>
                  ${escapeHTML(value)}
                </span>
              `;
            }
          ).join("")
        }
      </div>
    </section>
  `;
}


function researchReaderReferencesHTML(entry){
  const references =
    researchEntryReferences(
      entry
    );

  if(!references.length){
    return "";
  }

  return `
    <section class="sj-research-reader-section">
      <p class="sj-research-reader-label">
        Bible References
      </p>

      <div class="sj-research-reader-references">
        ${
          references.map(
            ref => {
              const canonLabel =
                researchCanonLabel(
                  ref.canon
                );

              return `
                <div class="sj-research-reader-reference">
                  <span>
                    ${escapeHTML(
                      cleanText(
                        ref.label
                      )
                    )}
                  </span>

                  ${
                    canonLabel
                      ? `
                        <small>
                          ${escapeHTML(
                            canonLabel
                          )}
                        </small>
                      `
                      : ""
                  }
                </div>
              `;
            }
          ).join("")
        }
      </div>
    </section>
  `;
}


function researchReaderRelatedHTML(entry){
  const rawRelated = Array.isArray(
    entry?.see_also
  )
    ? entry.see_also
    : [];

  const seen = new Set();

  const related = rawRelated
    .map(value => {
      const clean = cleanText(
        value
      );

      if(!clean){
        return null;
      }

      const key =
        normalizeResearchSearchText(
          clean
        );

      if(
        !key ||
        seen.has(key)
      ){
        return null;
      }

      seen.add(key);

      const target =
        findResearchEntryById(
          clean
        );

      return {
        value:clean,
        target,
        label:target?.headword ||
          researchRelatedDisplayLabel(
            clean
          )
      };
    })
    .filter(Boolean);

  if(!related.length){
    return "";
  }

  return `
    <section class="sj-research-reader-section">
      <p class="sj-research-reader-label">
        See Also
      </p>

      <div class="sj-research-reader-related">
        ${
          related.map(
            item => {
              if(item.target){
                return `
                  <button
                    type="button"
                    data-research-related-entry="${escapeHTML(
                      item.target.id
                    )}"
                  >
                    <span>
                      ${escapeHTML(
                        item.label
                      )}
                    </span>

                    <span aria-hidden="true">
                      ›
                    </span>
                  </button>
                `;
              }

              return `
                <span class="sj-research-reader-related-missing">
                  ${escapeHTML(
                    item.label
                  )}
                </span>
              `;
            }
          ).join("")
        }
      </div>
    </section>
  `;
}


function renderResearchReader(entry){
  const root =
    researchBrowserRoot();

  if(
    !root ||
    !entry
  ){
    return;
  }

  activeResearchEntryId =
    entry.id;

  const definition =
    cleanText(
      entry.definition
    );

  root.innerHTML = `
    <article
      class="sj-research-reader"
      data-research-reader
    >
      <div class="sj-research-reader-topbar">
        <button
          class="sj-research-reader-back"
          type="button"
          data-research-reader-back
        >
          <span aria-hidden="true">
            ‹
          </span>

          <span>
            Research
          </span>
        </button>
      </div>

      <header class="sj-research-reader-head">
        <p class="sj-research-reader-kicker">
          Semitic Jew Institute
        </p>

        <div class="sj-research-reader-title-row">
          <h2>
            ${escapeHTML(
              entry.headword
            )}
          </h2>

          ${
            entry.pos
              ? `
                <span>
                  ${escapeHTML(
                    entry.pos
                  )}
                </span>
              `
              : ""
          }
        </div>
      </header>

      ${
        definition
          ? `
            <p class="sj-research-reader-definition">
              ${escapeHTML(
                definition
              )}
            </p>
          `
          : ""
      }

      <div class="sj-research-reader-details">
        ${researchReaderVariantsHTML(
          entry
        )}

        ${researchReaderTextSection(
          "Syllables",
          entry.syllables
        )}

        ${researchReaderTextSection(
          "Etymology",
          entry.etymology
        )}

        ${researchReaderTextSection(
          "Usage",
          entry.usage_notes,
          "sj-research-reader-usage"
        )}

        ${researchReaderReferencesHTML(
          entry
        )}

        ${researchReaderRelatedHTML(
          entry
        )}
      </div>

      <footer class="sj-research-reader-end">
        <span aria-hidden="true"></span>

        <p>
          Scripture. Logic. Truth.
        </p>

        <button
          type="button"
          data-research-reader-back
        >
          Back to Research
        </button>
      </footer>
    </article>
  `;

  window.scrollTo({
    top:0,
    behavior:"instant"
  });
}


function openResearchEntry(entryId){
  const entry =
    findResearchEntryById(
      entryId
    );

  if(!entry){
    console.warn(
      "Research entry could not be found.",
      entryId
    );

    return;
  }

  renderResearchReader(
    entry
  );
}


function closeResearchReader(){
  activeResearchEntryId = null;

  renderResearchBrowserShell();

  window.scrollTo({
    top:0,
    behavior:"instant"
  });
}


document.addEventListener(
  "click",
  event => {
    const entryLink =
      event.target.closest(
        "[data-research-entry-link]"
      );

    if(entryLink){
      const entryId =
        cleanText(
          entryLink.dataset
            .researchEntryId
        );

      if(entryId){
        event.preventDefault();

        openResearchEntry(
          entryId
        );
      }

      return;
    }


    const relatedEntry =
      event.target.closest(
        "[data-research-related-entry]"
      );

    if(relatedEntry){
      const entryId =
        cleanText(
          relatedEntry.dataset
            .researchRelatedEntry
        );

      if(entryId){
        event.preventDefault();

        openResearchEntry(
          entryId
        );
      }

      return;
    }


    const backButton =
      event.target.closest(
        "[data-research-reader-back]"
      );

    if(backButton){
      event.preventDefault();

      closeResearchReader();
    }
  }
);


function profileShell(){
  return document.querySelector(
    "[data-profile-shell]"
  );
}


function profileDisplayBookName(value){
  return cleanText(
    value
  )
    .replace(
      /[-_]+/g,
      " "
    )
    .replace(
      /\b\w/g,
      character => {
        return character.toUpperCase();
      }
    );
}


function profileStudyData(){
  const bookmarks = readReaderArray(
    READER_BOOKMARKS_KEY
  );

  const highlights = readReaderArray(
    READER_HIGHLIGHTS_KEY
  );

  const noteMap = readReaderNotes();

  const notes = Object.values(
    noteMap
  ).filter(
    item => {
      return Boolean(
        cleanText(
          item?.note
        )
      );
    }
  );

  const location = readBibleLocation();

  return {
    bookmarks,
    highlights,
    notes,
    location
  };
}


function profileContinueReadingHTML(location){
  if(
    !location ||
    !location.book ||
    !location.chapter
  ){
    return "";
  }

  const bookName =
    profileDisplayBookName(
      location.book
    );

  return `
    <section class="sj-profile-continue">
      <p class="sj-section-kicker">
        Continue Reading
      </p>

      <button
        type="button"
        data-profile-continue-reading
      >
        <span class="sj-profile-continue-icon">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v17H6.5A3.5 3.5 0 0 0 3 22Z"
            ></path>

            <path
              d="M21 5.5A3.5 3.5 0 0 0 17.5 2H13v17h4.5A3.5 3.5 0 0 1 21 22Z"
            ></path>
          </svg>
        </span>

        <span class="sj-profile-continue-copy">
          <strong>
            ${escapeHTML(
              bookName
            )} ${
              Number(
                location.chapter
              )
            }
          </strong>

          <small>
            Return to your latest Scripture location
          </small>
        </span>

        <span
          class="sj-profile-continue-arrow"
          aria-hidden="true"
        >
          ›
        </span>
      </button>
    </section>
  `;
}


function renderProfileScreen(){
  const root = profileShell();

  if(!root){
    return;
  }

  const study = profileStudyData();

  root.innerHTML = `
    <section class="sj-profile-hero">
      <div
        class="sj-profile-brand-stack"
        aria-hidden="true"
      >
        <div class="sj-profile-brand-card is-scripture">
          <svg viewBox="0 0 24 24">
            <path
              d="M3.5 5.5A3.5 3.5 0 0 1 7 2h4v17H7a3.5 3.5 0 0 0-3.5 3Z"
            ></path>

            <path
              d="M20.5 5.5A3.5 3.5 0 0 0 17 2h-4v17h4a3.5 3.5 0 0 1 3.5 3Z"
            ></path>

            <path
              d="M7 6h2"
            ></path>

            <path
              d="M15 6h2"
            ></path>
          </svg>

          <strong>
            Scripture
          </strong>

          <span>
            Know what is written.
          </span>
        </div>

        <div class="sj-profile-brand-card is-logic">
          <svg viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="3"
            ></circle>

            <path
              d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"
            ></path>
          </svg>

          <strong>
            Logic
          </strong>

          <span>
            Learn how to reason.
          </span>
        </div>

        <div class="sj-profile-brand-card is-truth">
          <svg viewBox="0 0 24 24">
            <path
              d="M3 10h18"
            ></path>

            <path
              d="M5 10v9"
            ></path>

            <path
              d="M10 10v9"
            ></path>

            <path
              d="M14 10v9"
            ></path>

            <path
              d="M19 10v9"
            ></path>

            <path
              d="M2 19h20"
            ></path>

            <path
              d="m12 3 9 5H3Z"
            ></path>
          </svg>

          <strong>
            Truth
          </strong>

          <span>
            Build what can endure.
          </span>
        </div>
      </div>

      <p class="sj-profile-institute-label">
        Semitic Jew Institute
      </p>

      <h2>
        Your Study
        <span>Starts Here</span>
      </h2>

      <p class="sj-profile-hero-copy">
        Study Scripture. Train your reasoning.
        Build institutions rooted in truth.
        Your study data stays on this device for now.
        Account sync is coming soon.
      </p>

      <div class="sj-profile-account-actions">
        <button
          class="sj-profile-account-primary"
          type="button"
          data-profile-account-action="create"
        >
          <span>Create Account</span>
          <small>Coming Soon</small>
        </button>

        <button
          class="sj-profile-account-secondary"
          type="button"
          data-profile-account-action="signin"
        >
          <span>Sign In</span>
          <small>Coming Soon</small>
        </button>
      </div>

      <p
        class="sj-profile-account-notice"
        data-profile-account-notice
        hidden
      >
        Account creation and cross-device sync are
        coming soon. Your current Scripture study data
        remains stored on this device.
      </p>
    </section>

    <section class="sj-profile-study-summary">
      <div class="sj-profile-section-heading">
        <p class="sj-section-kicker">
          Your Study
        </p>

        <h2>
          Your personal Scripture library
        </h2>
      </div>

      <div class="sj-profile-study-stats">
        <div>
          <strong>
            ${study.bookmarks.length}
          </strong>

          <span>
            Saved Verses
          </span>
        </div>

        <div>
          <strong>
            ${study.highlights.length}
          </strong>

          <span>
            Highlights
          </span>
        </div>

        <div>
          <strong>
            ${study.notes.length}
          </strong>

          <span>
            Notes
          </span>
        </div>
      </div>
    </section>

    ${profileContinueReadingHTML(
      study.location
    )}
  `;
}


function showProfileAccountNotice(){
  const notice = document.querySelector(
    "[data-profile-account-notice]"
  );

  if(!notice){
    return;
  }

  notice.hidden = false;

  notice.scrollIntoView({
    block:"nearest",
    behavior:"smooth"
  });
}


document.addEventListener(
  "click",
  event => {
    const profileNav =
      event.target.closest(
        '[data-v3-nav="profile"]'
      );

    if(profileNav){
      requestAnimationFrame(
        renderProfileScreen
      );

      return;
    }


    const accountAction =
      event.target.closest(
        "[data-profile-account-action]"
      );

    if(accountAction){
      event.preventDefault();

      showProfileAccountNotice();

      return;
    }


    const continueButton =
      event.target.closest(
        "[data-profile-continue-reading]"
      );

    if(continueButton){
      event.preventDefault();

      const location =
        readBibleLocation();

      if(
        !location ||
        !location.canon ||
        !location.book ||
        !location.chapter
      ){
        return;
      }

      const bibleNav =
        document.querySelector(
          '[data-v3-nav="bible"]'
        );

      if(bibleNav){
        bibleNav.click();
      }

      openBibleReader(
        location.canon,
        location.book,
        Number(
          location.chapter
        )
      );
    }
  }
);


window.addEventListener(
  "storage",
  event => {
    if(
      [
        READER_BOOKMARKS_KEY,
        READER_HIGHLIGHTS_KEY,
        READER_NOTES_KEY,
        READER_LOCATION_KEY
      ].includes(
        event.key
      )
    ){
      renderProfileScreen();
    }
  }
);


renderProfileScreen();


const initialScreen = location.hash.replace("#", "");

showScreen(
  validScreens.has(initialScreen)
    ? initialScreen
    : "home",
  { updateHash:false }
);

updateHomeDaypartGreeting();
