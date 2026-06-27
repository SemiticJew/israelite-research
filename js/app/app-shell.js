import { getStudyCompanionResponse, MODE_LABELS } from "./ai-mock.js";

const DATA = {
  courses: "/data/app/courses.json",
  precepts: "/data/app/daily-precepts.json",
  practice: "/data/app/practice-plans.json",
  watchFallback: "/data/app/watch-feed.json",
  youtube: "/data/youtube-videos.json"
};

const CANON_LABELS = {
  tanakh: "Tanakh",
  newtestament: "New Testament",
  apocrypha: "Apocrypha"
};

const PROGRESS_KEY = "semiticJewAppProgress";
const SETTINGS_KEY = "sj_institute_app_settings_v1";
const READER_MARKS_KEY = "sj_institute_app_reader_marks_v1";
const READER_HISTORY_KEY = "sj_institute_app_last_read_v1";
const LEGACY_KEYS = {
  reading: "sj_reading_history_v1",
  bookmarks: "sj_scripture_bookmarks_v1",
  highlights: "sj_verse_highlights_v1",
  notes: "sj_no_private_interpretation_v1"
};

let courseData = [];
let watchData = [];
let bookMaps = {};
let readerRequestId = 0;

function $(selector, root = document){
  return root.querySelector(selector);
}

function $$(selector, root = document){
  return Array.from(root.querySelectorAll(selector));
}

function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

async function getJSON(url){
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${url}`);
  return response.json();
}

function loadingError(message){
  return `<div class="app-error">${escapeHTML(message)}</div>`;
}

function todayKey(){
  return new Date().toISOString().slice(0, 10);
}

function readJSONStorage(key, fallback){
  try{
    const data = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return data && typeof data === "object" ? data : fallback;
  }catch(error){
    return fallback;
  }
}

function writeJSONStorage(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function readProgress(){
  return readJSONStorage(PROGRESS_KEY, {});
}

function writeProgress(progress){
  writeJSONStorage(PROGRESS_KEY, progress);
}

function readSettings(){
  return {
    canon: "tanakh",
    book: "genesis",
    chapter: "1",
    fontSize: "base",
    spacing: "comfortable",
    ...readJSONStorage(SETTINGS_KEY, {})
  };
}

function writeSettings(settings){
  writeJSONStorage(SETTINGS_KEY, { ...readSettings(), ...settings });
}

function readLastRead(){
  const saved = readJSONStorage(READER_HISTORY_KEY, {});
  return {
    canon: saved.canon || "tanakh",
    book: saved.book || "genesis",
    chapter: String(saved.chapter || "1")
  };
}

function writeLastRead(location){
  const lastRead = {
    canon: location.canon,
    book: location.book,
    chapter: String(location.chapter || "1"),
    updatedAt: new Date().toISOString()
  };
  writeJSONStorage(READER_HISTORY_KEY, lastRead);
  renderContinueReading();
}

function readReaderMarks(){
  return readJSONStorage(READER_MARKS_KEY, { bookmarks: [], highlights: [], notes: [] });
}

function writeReaderMarks(marks){
  writeJSONStorage(READER_MARKS_KEY, {
    bookmarks: Array.isArray(marks.bookmarks) ? marks.bookmarks : [],
    highlights: Array.isArray(marks.highlights) ? marks.highlights : [],
    notes: Array.isArray(marks.notes) ? marks.notes : []
  });
  renderProfile();
}

function markKey(canon, book, chapter, verseNumber){
  return `${canon}:${book}:${chapter}:${verseNumber}`;
}

function hasMark(items, key){
  return Array.isArray(items) && items.some(item => item.key === key || item.ref === key);
}

function getNote(marks, key){
  return (marks.notes || []).find(item => item.key === key);
}

function storageArrayLength(key){
  const value = readJSONStorage(key, []);
  return Array.isArray(value) ? value.length : 0;
}

function formatDate(value){
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function titleFromSlug(slug){
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map(part => part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncate(value, max = 150){
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function lessonKey(courseId, lessonId){
  return `${courseId}:${lessonId}`;
}

function completedPracticeIds(){
  const progress = readProgress();
  const today = todayKey();
  return Array.isArray(progress[today]) ? progress[today] : [];
}

function setCompletedPractice(ids){
  const progress = readProgress();
  progress[todayKey()] = ids;
  writeProgress(progress);
}

function completedLessonMap(){
  const progress = readProgress();
  return progress.lessons && typeof progress.lessons === "object" ? progress.lessons : {};
}

function activeTabFromHash(){
  const id = window.location.hash.replace("#", "");
  return ["home", "bible", "study", "ask", "media", "profile"].includes(id) ? id : "home";
}

function setActiveTab(tab, updateHash = true){
  $$("[data-app-panel]").forEach(panel => {
    const active = panel.dataset.appPanel === tab;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });

  $$("[data-app-tab-link]").forEach(link => {
    const active = link.dataset.appTabLink === tab;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  if (updateHash && window.location.hash !== `#${tab}`){
    history.pushState(null, "", `#${tab}`);
  }
}

function wireTabs(){
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-app-tab-link]");
    if (!link) return;
    const tab = link.dataset.appTabLink;
    if (!tab) return;
    event.preventDefault();
    setActiveTab(tab);
    $(`[data-app-panel="${tab}"]`)?.focus({ preventScroll: true });
  });

  window.addEventListener("hashchange", () => setActiveTab(activeTabFromHash(), false));
  setActiveTab(activeTabFromHash(), false);
}

async function renderDailyPrecept(){
  const root = $("#daily-precept");
  if (!root) return;

  try{
    const precepts = await getJSON(DATA.precepts);
    const list = Array.isArray(precepts) ? precepts : [];
    const item = list.length ? list[new Date().getDay() % list.length] : null;
    if (!item){
      root.innerHTML = loadingError("No daily precepts are available yet.");
      return;
    }

    root.innerHTML = `
      <div class="app-precept">
        <span class="app-label">Daily Precept</span>
        <h3>${escapeHTML(item.reference)}</h3>
        <blockquote>${escapeHTML(item.text)}</blockquote>
        <div class="app-precept-meta">
          <span class="app-pill">${escapeHTML(item.theme)}</span>
        </div>
        <p>${escapeHTML(item.prompt)}</p>
        <div class="app-button-row">
          <button class="app-btn" type="button" data-explain-precept data-reference="${escapeHTML(item.reference)}" data-question="${escapeHTML(item.prompt)}">Explain this</button>
        </div>
      </div>
    `;
  }catch(error){
    root.innerHTML = loadingError("Today's precept could not be loaded.");
  }
}

function renderCourseHome(){
  const root = $("#continue-course-card");
  if (!root || !courseData.length) return;

  const progress = readProgress();
  const completed = completedLessonMap();
  const last = progress.lastLesson;
  const fallbackCourse = courseData[0];
  const fallbackLesson = fallbackCourse?.lessons?.[0];
  const course = courseData.find(item => item.id === last?.courseId) || fallbackCourse;
  const lesson = course?.lessons?.find(item => item.id === last?.lessonId) || fallbackLesson;
  const total = course?.lessons?.length || 0;
  const done = course?.lessons?.filter(item => completed[lessonKey(course.id, item.id)]).length || 0;

  root.innerHTML = `
    <span class="app-label">Continue Course</span>
    <h3>${escapeHTML(course?.title || "Study Plans")}</h3>
    <p>${lesson ? escapeHTML(lesson.title) : "Choose a course to begin."}</p>
    <div class="course-progress" aria-label="${done} of ${total} lessons complete"><span style="width:${total ? Math.round((done / total) * 100) : 0}%"></span></div>
    <div class="app-button-row">
      <a class="app-btn primary" href="#study" data-app-tab-link="study">Continue</a>
    </div>
  `;
}

function renderWatchHome(){
  const root = $("#latest-lesson-card");
  if (!root || !watchData.length) return;
  const item = watchData[0];
  root.innerHTML = `
    <span class="app-label">Latest Lesson</span>
    <h3>${escapeHTML(item.title)}</h3>
    <p>${escapeHTML(truncate(item.description, 110))}</p>
    <div class="app-button-row">
      <a class="app-btn primary" href="#media" data-app-tab-link="media">Open Media</a>
      <a class="app-btn" href="${escapeHTML(item.link || "/media.html")}" target="${String(item.link || "").startsWith("http") ? "_blank" : "_self"}" rel="noopener">Lesson</a>
    </div>
  `;
}

function renderContinueReading(){
  const root = $("#continue-reading-card");
  if (!root) return;

  const lastRead = readLastRead();
  root.innerHTML = `
    <span class="app-label">Continue Reading</span>
    <h3>${escapeHTML(titleFromSlug(lastRead.book))} ${escapeHTML(lastRead.chapter)}</h3>
    <p>${escapeHTML(CANON_LABELS[lastRead.canon] || "Scripture")} reader saved on this device.</p>
    <div class="app-button-row">
      <a class="app-btn primary" href="#bible" data-continue-reading>Continue</a>
      <a class="app-btn" href="/biblia.html">Biblia</a>
    </div>
  `;
}

function renderLessonDetail(course, lesson){
  const root = $("#lesson-detail");
  if (!root) return;

  const key = lessonKey(course.id, lesson.id);
  const isComplete = Boolean(completedLessonMap()[key]);
  const progress = readProgress();
  progress.lastLesson = { courseId: course.id, lessonId: lesson.id, updatedAt: new Date().toISOString() };
  writeProgress(progress);
  renderCourseHome();

  root.innerHTML = `
    <article class="lesson-detail-card">
      <span class="app-label">${escapeHTML(course.title)}</span>
      <h3>${escapeHTML(lesson.title)}</h3>
      <dl>
        <div>
          <dt>Objective</dt>
          <dd>${escapeHTML(lesson.objective)}</dd>
        </div>
        <div>
          <dt>Key scriptures</dt>
          <dd>${(lesson.scriptures || []).map(ref => `<span class="app-tag">${escapeHTML(ref)}</span>`).join(" ")}</dd>
        </div>
        <div>
          <dt>Explanation</dt>
          <dd>${escapeHTML(lesson.body)}</dd>
        </div>
        <div>
          <dt>Reflection</dt>
          <dd>${escapeHTML(lesson.reflection)}</dd>
        </div>
      </dl>
      <button class="app-btn primary" type="button" data-complete-lesson="${escapeHTML(key)}"${isComplete ? " disabled" : ""}>${isComplete ? "Completed" : "Mark lesson complete"}</button>
    </article>
  `;
  root.focus({ preventScroll: true });
  root.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderCourseGrid(){
  const root = $("#course-grid");
  if (!root) return;

  if (!courseData.length){
    root.innerHTML = loadingError("Courses are not available yet.");
    return;
  }

  const completed = completedLessonMap();
  root.innerHTML = courseData.map(course => {
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    const done = lessons.filter(lesson => completed[lessonKey(course.id, lesson.id)]).length;
    const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

    return `
      <article class="course-card">
        <div>
          <div class="course-meta">
            <span class="app-pill">${escapeHTML(course.level || "study")}</span>
            <span class="app-pill">${done}/${lessons.length} complete</span>
          </div>
          <h3>${escapeHTML(course.title)}</h3>
          <p>${escapeHTML(course.description)}</p>
        </div>
        <div class="course-progress" aria-label="${percent}% complete"><span style="width:${percent}%"></span></div>
        <div class="lesson-list" aria-label="${escapeHTML(course.title)} lessons">
          ${lessons.map(lesson => {
            const key = lessonKey(course.id, lesson.id);
            return `<button class="${completed[key] ? "is-complete" : ""}" type="button" data-course="${escapeHTML(course.id)}" data-lesson="${escapeHTML(lesson.id)}">${completed[key] ? "Done: " : ""}${escapeHTML(lesson.title)}</button>`;
          }).join("")}
        </div>
      </article>
    `;
  }).join("");
}

async function renderCourses(){
  const root = $("#course-grid");
  if (!root) return;

  try{
    const courses = await getJSON(DATA.courses);
    courseData = Array.isArray(courses) ? courses : [];
    renderCourseGrid();
    renderCourseHome();
  }catch(error){
    root.innerHTML = loadingError("Courses could not be loaded.");
  }
}

function wireCourses(){
  $("#course-grid")?.addEventListener("click", event => {
    const button = event.target.closest("[data-course][data-lesson]");
    if (!button) return;
    const course = courseData.find(item => item.id === button.dataset.course);
    const lesson = course?.lessons?.find(item => item.id === button.dataset.lesson);
    if (course && lesson) renderLessonDetail(course, lesson);
  });

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-complete-lesson]");
    if (!button) return;
    const progress = readProgress();
    progress.lessons = progress.lessons || {};
    progress.lessons[button.dataset.completeLesson] = true;
    writeProgress(progress);
    button.textContent = "Completed";
    button.disabled = true;
    renderCourseGrid();
    renderCourseHome();
    renderProfile();
  });
}

function renderAiResponse(response){
  const root = $("#ai-response");
  if (!root) return;

  root.innerHTML = `
    <article class="ai-response-card">
      <span class="app-label">Study Aid</span>
      <h3>${escapeHTML(response.title || "Study Aid")}</h3>
      ${(response.sections || []).map(([heading, content]) => `
        <section class="ai-response-section">
          <h4>${escapeHTML(heading)}</h4>
          ${Array.isArray(content)
            ? `<ul>${content.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`
            : `<p>${escapeHTML(content)}</p>`}
        </section>
      `).join("")}
    </article>
  `;
}

function wireAsk(){
  const form = $("#ask-form");
  const textarea = $("#ask-question");
  const mode = $("#ask-mode");
  if (!form || !textarea || !mode) return;

  document.addEventListener("click", event => {
    const preceptButton = event.target.closest("[data-explain-precept]");
    if (preceptButton){
      mode.value = "verse-explainer";
      textarea.value = `${preceptButton.dataset.reference}: ${preceptButton.dataset.question}`;
      setActiveTab("ask");
      textarea.focus();
      return;
    }

    const promptButton = event.target.closest("[data-prompt]");
    if (!promptButton) return;
    mode.value = promptButton.dataset.mode || "verse-explainer";
    textarea.value = promptButton.dataset.prompt || "";
    textarea.focus();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const question = textarea.value.trim();
    const root = $("#ai-response");
    if (!question){
      root.innerHTML = loadingError("Enter a Scripture-first question before generating a study aid.");
      textarea.focus();
      return;
    }

    root.innerHTML = `<div class="app-loading">Building ${escapeHTML(MODE_LABELS[mode.value] || "study")} response...</div>`;
    const response = await getStudyCompanionResponse({ mode: mode.value, question });
    renderAiResponse(response);
  });
}

function normalizeYoutubeVideo(video){
  return {
    title: video.title || "Semitic Jew Teaching",
    type: video.url?.includes("/shorts/") ? "Short" : "Bible Study",
    description: truncate(video.description || "A Semitic Jew teaching focused on Scripture, logic, and truth."),
    link: video.url || "/media.html",
    duration: video.url?.includes("/shorts/") ? "Short" : "Watch",
    tags: ["Semitic Jew", "Scripture"],
    published: video.published
  };
}

async function renderWatch(){
  const root = $("#watch-grid");
  if (!root) return;

  try{
    try{
      const youtube = await getJSON(DATA.youtube);
      watchData = Array.isArray(youtube.videos) ? youtube.videos.slice(0, 8).map(normalizeYoutubeVideo) : [];
    }catch(error){
      const fallback = await getJSON(DATA.watchFallback);
      watchData = Array.isArray(fallback) ? fallback : [];
    }

    if (!watchData.length){
      root.innerHTML = loadingError("Watch lessons are not available yet.");
      return;
    }

    root.innerHTML = watchData.map(item => `
      <article class="watch-card">
        <div class="watch-meta">
          <span class="app-pill">${escapeHTML(item.type || "Lesson")}</span>
          ${item.duration ? `<span class="watch-duration">${escapeHTML(item.duration)}</span>` : ""}
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        ${item.published ? `<time datetime="${escapeHTML(item.published)}">${escapeHTML(formatDate(item.published))}</time>` : ""}
        <p>${escapeHTML(item.description)}</p>
        <div class="course-meta">${(item.tags || []).slice(0, 3).map(tag => `<span class="app-tag">${escapeHTML(tag)}</span>`).join("")}</div>
        <a href="${escapeHTML(item.link || "/media.html")}" target="${String(item.link || "").startsWith("http") ? "_blank" : "_self"}" rel="noopener">Open lesson</a>
      </article>
    `).join("");
    renderWatchHome();
  }catch(error){
    root.innerHTML = loadingError("Watch lessons could not be loaded.");
  }
}

function updatePracticeProgress(total){
  const ids = completedPracticeIds();
  const percent = total ? Math.round((ids.length / total) * 100) : 0;
  const root = $("#practice-progress");
  if (root) root.textContent = `${percent}%`;
  renderProfile();
}

async function renderPractice(){
  const root = $("#practice-grid");
  const reset = $("#practice-reset");
  if (!root) return;

  try{
    const items = await getJSON(DATA.practice);
    if (!Array.isArray(items) || !items.length){
      root.innerHTML = loadingError("Practice modules are not available yet.");
      return;
    }

    function render(){
      const completed = completedPracticeIds();
      root.innerHTML = items.map(item => {
        const done = completed.includes(item.id);
        return `
          <article class="practice-card${done ? " complete" : ""}">
            <span class="app-label">Practice</span>
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.description)}</p>
            <button class="app-btn practice-action${done ? "" : " primary"}" type="button" data-practice="${escapeHTML(item.id)}">
              ${done ? "Completed" : escapeHTML(item.action || "Mark complete")}
            </button>
          </article>
        `;
      }).join("");
      updatePracticeProgress(items.length);
    }

    root.addEventListener("click", event => {
      const button = event.target.closest("[data-practice]");
      if (!button) return;
      const id = button.dataset.practice;
      const completed = completedPracticeIds();
      const next = completed.includes(id) ? completed.filter(item => item !== id) : completed.concat(id);
      setCompletedPractice(next);
      render();
    });

    reset?.addEventListener("click", () => {
      setCompletedPractice([]);
      render();
    });

    render();
  }catch(error){
    root.innerHTML = loadingError("Practice modules could not be loaded.");
  }
}

function buildChapterOptions(total, selected){
  return Array.from({ length: Number(total) || 1 }, (_, index) => {
    const value = String(index + 1);
    return `<option value="${value}"${value === String(selected) ? " selected" : ""}>${value}</option>`;
  }).join("");
}

function orderedBookSlugs(books, canon){
  const available = Object.keys(books || {});
  if (!available.length) return [];
  if (canon === "tanakh" && available.includes("genesis")){
    return ["genesis", ...available.filter(slug => slug !== "genesis").sort()];
  }
  if (canon === "newtestament" && available.includes("matthew")){
    return ["matthew", ...available.filter(slug => slug !== "matthew").sort()];
  }
  if (canon === "apocrypha" && available.includes("1-esdras")){
    return ["1-esdras", ...available.filter(slug => slug !== "1-esdras").sort()];
  }
  return available.sort();
}

async function loadBookMap(canon){
  if (bookMaps[canon]) return bookMaps[canon];
  const map = await getJSON(`/data/${canon}/books.json`);
  bookMaps[canon] = map && typeof map === "object" ? map : {};
  return bookMaps[canon];
}

async function populateBooks(canon, selectedBook){
  const bookSelect = $("#reader-book");
  const chapterSelect = $("#reader-chapter");
  if (!bookSelect || !chapterSelect) return "";

  const books = await loadBookMap(canon);
  const slugs = orderedBookSlugs(books, canon);
  const preferred = slugs.includes(selectedBook) ? selectedBook : slugs[0];
  bookSelect.innerHTML = slugs.map(slug => `<option value="${escapeHTML(slug)}"${slug === preferred ? " selected" : ""}>${escapeHTML(titleFromSlug(slug))}</option>`).join("");
  chapterSelect.innerHTML = buildChapterOptions(books[preferred], readSettings().chapter);
  return preferred;
}

async function setReaderLocation({ canon, book, chapter, fontSize, spacing } = {}){
  const settings = readSettings();
  const nextCanon = canon || settings.canon;
  const books = await loadBookMap(nextCanon);
  const slugs = orderedBookSlugs(books, nextCanon);
  const nextBook = slugs.includes(book || settings.book) ? (book || settings.book) : slugs[0];
  const total = Number(books[nextBook]) || 1;
  const requestedChapter = Number(chapter || settings.chapter) || 1;
  const nextChapter = String(Math.min(Math.max(requestedChapter, 1), total));

  const canonSelect = $("#reader-canon");
  const bookSelect = $("#reader-book");
  const chapterSelect = $("#reader-chapter");
  const fontSelect = $("#reader-font-size");
  const spacingSelect = $("#reader-spacing");

  if (canonSelect) canonSelect.value = nextCanon;
  await populateBooks(nextCanon, nextBook);
  if (bookSelect) bookSelect.value = nextBook;
  if (chapterSelect) chapterSelect.innerHTML = buildChapterOptions(total, nextChapter);
  if (fontSelect) fontSelect.value = fontSize || settings.fontSize;
  if (spacingSelect) spacingSelect.value = spacing || settings.spacing;

  writeSettings({
    canon: nextCanon,
    book: nextBook,
    chapter: nextChapter,
    fontSize: fontSize || settings.fontSize,
    spacing: spacing || settings.spacing
  });

  await renderReader();
}

async function getAdjacentReaderLocation(direction){
  const settings = readSettings();
  const books = await loadBookMap(settings.canon);
  const slugs = orderedBookSlugs(books, settings.canon);
  const currentIndex = slugs.indexOf(settings.book);
  const chapter = Number(settings.chapter) || 1;
  const total = Number(books[settings.book]) || 1;

  if (direction === "previous"){
    if (chapter > 1) return { ...settings, chapter: String(chapter - 1) };
    if (currentIndex > 0){
      const previousBook = slugs[currentIndex - 1];
      return { ...settings, book: previousBook, chapter: String(books[previousBook] || 1) };
    }
    return null;
  }

  if (chapter < total) return { ...settings, chapter: String(chapter + 1) };
  if (currentIndex !== -1 && currentIndex < slugs.length - 1){
    return { ...settings, book: slugs[currentIndex + 1], chapter: "1" };
  }
  return null;
}

async function updateReaderNav(){
  const previous = await getAdjacentReaderLocation("previous");
  const next = await getAdjacentReaderLocation("next");
  const previousButton = $("#reader-prev");
  const nextButton = $("#reader-next");
  if (previousButton) previousButton.disabled = !previous;
  if (nextButton) nextButton.disabled = !next;
}

async function renderReader(){
  const requestId = ++readerRequestId;
  const output = $("#reader-output");
  const canonSelect = $("#reader-canon");
  const bookSelect = $("#reader-book");
  const chapterSelect = $("#reader-chapter");
  const fontSelect = $("#reader-font-size");
  const spacingSelect = $("#reader-spacing");
  if (!output || !canonSelect || !bookSelect || !chapterSelect) return;

  const settings = readSettings();
  const canon = canonSelect.value || settings.canon;
  const book = bookSelect.value || settings.book;
  const chapter = chapterSelect.value || settings.chapter;
  const fontSize = fontSelect?.value || settings.fontSize;
  const spacing = spacingSelect?.value || settings.spacing;

  writeSettings({ canon, book, chapter, fontSize, spacing });
  syncProfileSettings();
  output.innerHTML = `<div class="app-loading">Loading ${escapeHTML(titleFromSlug(book))} ${escapeHTML(chapter)}...</div>`;

  try{
    const verses = await getJSON(`/data/${canon}/${book}/${chapter}.json`);
    if (requestId !== readerRequestId) return;
    if (!Array.isArray(verses) || !verses.length){
      output.innerHTML = `${loadingError("This chapter is not available in the local reader yet.")}<p><a class="app-btn primary" href="/biblia.html">Open Biblia</a></p>`;
      return;
    }

    const marks = readReaderMarks();
    writeLastRead({ canon, book, chapter });
    await updateReaderNav();

    output.innerHTML = `
      <div class="reader-head">
        <div>
          <span class="app-label">${escapeHTML(CANON_LABELS[canon] || "Scripture")}</span>
          <h3>${escapeHTML(titleFromSlug(book))} ${escapeHTML(chapter)}</h3>
        </div>
        <span class="reader-badge">Local reader</span>
      </div>
      <div class="reader-verses ${escapeHTML(fontSize)} ${spacing === "compact" ? "compact" : ""}">
        ${verses.map(verse => {
          const verseNumber = verse.v ?? "";
          const text = verse.t ?? verse.text ?? "";
          const ref = `${titleFromSlug(book)} ${chapter}:${verseNumber}`;
          const key = markKey(canon, book, chapter, verseNumber);
          const bookmarked = hasMark(marks.bookmarks, key);
          const highlighted = hasMark(marks.highlights, key);
          const note = getNote(marks, key);
          return `
            <section class="reader-verse${highlighted ? " is-highlighted" : ""}" data-key="${escapeHTML(key)}" data-ref="${escapeHTML(ref)}" data-text="${escapeHTML(text)}">
              <p class="reader-verse-text"><span class="reader-verse-num">${escapeHTML(verseNumber)}</span> ${escapeHTML(text)}</p>
              ${note ? `<p class="reader-note"><strong>Note:</strong> ${escapeHTML(note.note)}</p>` : ""}
              <div class="reader-actions" aria-label="${escapeHTML(ref)} actions">
                <button type="button" data-reader-action="copy">Copy</button>
                <button type="button" data-reader-action="bookmark">${bookmarked ? "Bookmarked" : "Bookmark"}</button>
                <button type="button" data-reader-action="highlight">${highlighted ? "Highlighted" : "Highlight"}</button>
                <button type="button" data-reader-action="note">${note ? "Edit note" : "Note"}</button>
              </div>
            </section>
          `;
        }).join("")}
      </div>
    `;
  }catch(error){
    if (requestId !== readerRequestId) return;
    await updateReaderNav();
    output.innerHTML = `${loadingError("The local reader could not load this chapter.")}<p><a class="app-btn primary" href="/biblia.html">Open Biblia</a></p>`;
  }
}

async function syncReaderControls(){
  const settings = readSettings();
  const canonSelect = $("#reader-canon");
  const fontSelect = $("#reader-font-size");
  const spacingSelect = $("#reader-spacing");
  const profileCanon = $("#profile-canon");
  const profileFont = $("#profile-font-size");
  const profileSpacing = $("#profile-spacing");
  if (!canonSelect) return;

  canonSelect.value = settings.canon;
  if (fontSelect) fontSelect.value = settings.fontSize;
  if (spacingSelect) spacingSelect.value = settings.spacing;
  if (profileCanon) profileCanon.value = settings.canon;
  if (profileFont) profileFont.value = settings.fontSize;
  if (profileSpacing) profileSpacing.value = settings.spacing;

  await setReaderLocation(settings);
}

function wireReader(){
  $("#reader-canon")?.addEventListener("change", async event => {
    await setReaderLocation({ canon: event.target.value, chapter: "1" });
  });

  $("#reader-book")?.addEventListener("change", async event => {
    await setReaderLocation({ canon: $("#reader-canon").value, book: event.target.value, chapter: "1" });
  });

  ["#reader-chapter", "#reader-font-size", "#reader-spacing"].forEach(selector => {
    $(selector)?.addEventListener("change", renderReader);
  });

  $("#reader-prev")?.addEventListener("click", async () => {
    const location = await getAdjacentReaderLocation("previous");
    if (location) await setReaderLocation(location);
  });

  $("#reader-next")?.addEventListener("click", async () => {
    const location = await getAdjacentReaderLocation("next");
    if (location) await setReaderLocation(location);
  });

  document.addEventListener("click", async event => {
    const link = event.target.closest("[data-continue-reading]");
    if (!link) return;
    event.preventDefault();
    const lastRead = readLastRead();
    setActiveTab("bible");
    await setReaderLocation(lastRead);
    $("#reader-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#reader-output")?.addEventListener("click", async event => {
    const button = event.target.closest("[data-reader-action]");
    const verse = event.target.closest(".reader-verse");
    if (!button || !verse) return;
    const key = verse.dataset.key;
    const ref = verse.dataset.ref;
    const text = verse.dataset.text;
    const marks = readReaderMarks();

    if (button.dataset.readerAction === "copy"){
      try{
        await navigator.clipboard.writeText(`${ref} ${text}`);
        button.textContent = "Copied";
      }catch(error){
        button.textContent = "Copy unavailable";
      }
      return;
    }

    if (button.dataset.readerAction === "bookmark"){
      const exists = hasMark(marks.bookmarks, key);
      marks.bookmarks = marks.bookmarks.filter(item => item.key !== key && item.ref !== key && item.ref !== ref);
      if (!exists){
        marks.bookmarks.unshift({ key, ref, text, savedAt: new Date().toISOString() });
      }
      button.textContent = exists ? "Bookmark" : "Bookmarked";
    }

    if (button.dataset.readerAction === "highlight"){
      const exists = hasMark(marks.highlights, key);
      marks.highlights = marks.highlights.filter(item => item.key !== key && item.ref !== key && item.ref !== ref);
      if (!exists){
        marks.highlights.unshift({ key, ref, text, category: "key", savedAt: new Date().toISOString() });
      }
      verse.classList.toggle("is-highlighted", !exists);
      button.textContent = exists ? "Highlight" : "Highlighted";
    }

    if (button.dataset.readerAction === "note"){
      const existing = getNote(marks, key);
      const note = window.prompt(`Note for ${ref}`, existing?.note || "");
      if (note === null) return;
      marks.notes = marks.notes.filter(item => item.key !== key && item.ref !== key && item.ref !== ref);
      if (note.trim()){
        marks.notes.unshift({ key, ref, text, note: note.trim(), savedAt: new Date().toISOString() });
        button.textContent = "Edit note";
      }else{
        button.textContent = "Note";
      }
      writeReaderMarks(marks);
      await renderReader();
      return;
    }

    writeReaderMarks(marks);
  });
}

function syncProfileSettings(){
  const settings = readSettings();
  const profileCanon = $("#profile-canon");
  const profileFont = $("#profile-font-size");
  const profileSpacing = $("#profile-spacing");
  if (profileCanon) profileCanon.value = settings.canon;
  if (profileFont) profileFont.value = settings.fontSize;
  if (profileSpacing) profileSpacing.value = settings.spacing;
}

function wireProfileSettings(){
  $("#profile-settings-form")?.addEventListener("change", async event => {
    const form = event.currentTarget;
    const settings = {
      canon: form.canon.value,
      fontSize: form.fontSize.value,
      spacing: form.spacing.value
    };
    writeSettings(settings);
    const readerCanon = $("#reader-canon");
    const readerFont = $("#reader-font-size");
    const readerSpacing = $("#reader-spacing");
    if (readerCanon) readerCanon.value = settings.canon;
    if (readerFont) readerFont.value = settings.fontSize;
    if (readerSpacing) readerSpacing.value = settings.spacing;
    await setReaderLocation(settings);
  });
}

function renderProfile(){
  const marks = readReaderMarks();
  const practiceCount = completedPracticeIds().length;
  const setText = (selector, value) => {
    const node = $(selector);
    if (node) node.textContent = String(value);
  };

  setText("#profile-reading-count", storageArrayLength(LEGACY_KEYS.reading));
  setText("#profile-bookmark-count", storageArrayLength(LEGACY_KEYS.bookmarks) + marks.bookmarks.length);
  setText("#profile-highlight-count", storageArrayLength(LEGACY_KEYS.highlights) + marks.highlights.length);
  setText("#profile-note-count", storageArrayLength(LEGACY_KEYS.notes) + marks.notes.length);
  setText("#profile-practice-count", practiceCount);
  syncProfileSettings();
}

async function init(){
  wireTabs();
  wireAsk();
  wireCourses();
  wireReader();
  wireProfileSettings();
  await Promise.all([
    renderDailyPrecept(),
    renderCourses(),
    renderWatch(),
    renderPractice(),
    syncReaderControls()
  ]);
  renderContinueReading();
  renderProfile();
}

if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
