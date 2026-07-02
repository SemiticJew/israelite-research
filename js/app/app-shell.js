import { getStudyCompanionResponse, MODE_LABELS } from "./ai-mock.js";

const DATA = {
  courses: "/data/app/courses.json",
  precepts: "/data/app/daily-precepts.json",
  practice: "/data/app/practice-plans.json",
  watchFallback: "/data/app/watch-feed.json",
  youtube: "/data/youtube-videos.json"
};

const ONBOARDING_KEY = "sj_institute_app_onboarding_v1";

const CANON_LABELS = {
  tanakh: "Tanakh",
  newtestament: "New Testament",
  apocrypha: "Apocrypha"
};

const CANON_LANDING_URLS = {
  tanakh: "/tanakh.html",
  newtestament: "/newtestament.html",
  apocrypha: "/apocrypha.html"
};

const BOOK_PAGE_OVERRIDES = {
  tanakh: {
    psalm: "psalms"
  },
  apocrypha: {
    judit: "judith",
    manassse: "prayer-of-manasseh",
    addesth: "additions-to-esther",
    adddan: ""
  }
};

const CANON_CONTEXT = {
  tanakh: {
    categories: [
      ["genesis exodus leviticus numbers deuteronomy", "Law / covenant foundation"],
      ["joshua judges ruth 1-samuel 2-samuel 1-kings 2-kings 1-chronicles 2-chronicles ezra nehemiah esther", "History / kingdom / exile"],
      ["job psalm proverbs ecclesiastes song-of-solomon", "Wisdom / worship / discipline"],
      ["isaiah jeremiah lamentations ezekiel daniel hosea joel amos obadiah jonah micah nahum habakkuk zephaniah haggai zechariah malachi", "Prophets / judgment / restoration"]
    ],
    fallback: "Law, history, wisdom, prophets, and restoration",
    framing: "Read the Tanakh as covenant record: creation, law, kingdom, exile, correction, and the promised restoration of Israel."
  },
  newtestament: {
    categories: [
      ["matthew mark luke john", "Messiah / gospel witness"],
      ["acts", "Apostolic witness / scattered assemblies"],
      ["romans 1-corinthians 2-corinthians galatians ephesians philippians colossians 1-thessalonians 2-thessalonians 1-timothy 2-timothy titus philemon hebrews james 1-peter 2-peter 1-john 2-john 3-john jude", "Letters / doctrine / assemblies"],
      ["revelation", "Revelation / judgment / kingdom"]
    ],
    fallback: "Messiah, apostolic witness, assemblies, scattered elect, and Revelation",
    framing: "Read the New Testament as Israel's Messiah, apostolic correction, covenant faithfulness, and witness to the scattered elect."
  },
  apocrypha: {
    categories: [
      ["1-esdras 2-esdras baruch", "Exile / remembrance / restoration"],
      ["tobit judit wisdom sirach", "Wisdom / family / discipline"],
      ["1-maccabees 2-maccabees", "Resistance / Second Temple history"],
      ["bel-and-the-dragon susanna", "Captivity witness / righteous judgment"]
    ],
    fallback: "Second Temple history, wisdom, resistance, and restoration",
    framing: "Read the Apocrypha for captivity-era memory, wisdom, resistance, and historical context without replacing the authority of Scripture."
  }
};

const STUDY_PATHS = [
  {
    id: "who-are-israelites",
    title: "Who Are Israelites?",
    description: "Trace covenant identity from promise to scattering and restoration.",
    level: "Foundation",
    category: "Identity",
    resource: { label: "Open biblical references", href: "/biblical_references.html" },
    steps: [
      {
        id: "who-are-israelites-promise",
        title: "Promise to the fathers",
        description: "Start with the covenant promise, the chosen line, and the land oath.",
        references: [
          { canon: "tanakh", book: "genesis", chapter: "12", verse: "1", verseEnd: "3" },
          { canon: "tanakh", book: "genesis", chapter: "15", verse: "5", verseEnd: "6" },
          { canon: "tanakh", book: "genesis", chapter: "17", verse: "7", verseEnd: "8" }
        ]
      },
      {
        id: "who-are-israelites-chosen",
        title: "Israel chosen for covenant witness",
        description: "Read how the Most High set Israel apart to keep covenant testimony in the earth.",
        references: [
          { canon: "tanakh", book: "deuteronomy", chapter: "7", verse: "6", verseEnd: "8" },
          { canon: "tanakh", book: "deuteronomy", chapter: "14", verse: "2" }
        ]
      },
      {
        id: "who-are-israelites-scattered",
        title: "Scattered among the nations",
        description: "See how covenant disobedience brought dispersion, while identity was not erased.",
        references: [
          { canon: "tanakh", book: "deuteronomy", chapter: "28", verse: "64", verseEnd: "68" },
          { canon: "tanakh", book: "leviticus", chapter: "26", verse: "33", verseEnd: "39" }
        ],
        resource: { label: "Open Scripture search", href: "/biblia.html" }
      },
      {
        id: "who-are-israelites-restoration",
        title: "Restoration and regathering",
        description: "Follow the promise that the dispersed would be gathered again in the last days.",
        references: [
          { canon: "tanakh", book: "hosea", chapter: "1", verse: "10", verseEnd: "11" },
          { canon: "tanakh", book: "isaiah", chapter: "11", verse: "11", verseEnd: "12" }
        ]
      }
    ]
  },
  {
    id: "law-and-obedience",
    title: "Law and Obedience",
    description: "Build a covenant reading of commandment, hearing, and doing.",
    level: "Foundational",
    category: "Commandments",
    resource: { label: "Open Tanakh hub", href: "/tanakh.html" },
    steps: [
      {
        id: "law-and-obedience-sinai",
        title: "The law at Sinai",
        description: "See the commandments given directly to Israel before the nations.",
        references: [
          { canon: "tanakh", book: "exodus", chapter: "20", verse: "1", verseEnd: "17" },
          { canon: "tanakh", book: "deuteronomy", chapter: "4", verse: "5", verseEnd: "8" }
        ]
      },
      {
        id: "law-and-obedience-hear",
        title: "Hear and do",
        description: "Learn the covenant rhythm of hearing, keeping, and teaching.",
        references: [
          { canon: "tanakh", book: "deuteronomy", chapter: "6", verse: "4", verseEnd: "9" },
          { canon: "tanakh", book: "deuteronomy", chapter: "30", verse: "11", verseEnd: "14" }
        ]
      },
      {
        id: "law-and-obedience-blessing",
        title: "Blessing and curse",
        description: "Study the covenant outcomes attached to obedience and rebellion.",
        references: [
          { canon: "tanakh", book: "deuteronomy", chapter: "28", verse: "1", verseEnd: "14" },
          { canon: "tanakh", book: "deuteronomy", chapter: "28", verse: "15", verseEnd: "68" }
        ]
      },
      {
        id: "law-and-obedience-messiah",
        title: "Messiah and the law",
        description: "Read the Messiah’s own words about law, righteousness, and fulfillment.",
        references: [
          { canon: "newtestament", book: "matthew", chapter: "5", verse: "17", verseEnd: "19" },
          { canon: "newtestament", book: "1-john", chapter: "5", verse: "2", verseEnd: "3" }
        ]
      }
    ]
  },
  {
    id: "christ-and-the-covenant",
    title: "Christ and the Covenant",
    description: "Read the Messiah through the promises made to Israel and Judah.",
    level: "Intermediate",
    category: "Messiah",
    resource: { label: "Open New Testament hub", href: "/newtestament.html" },
    steps: [
      {
        id: "christ-and-the-covenant-promise",
        title: "The promised king",
        description: "Start where the Scriptures speak of the child, the throne, and the kingdom.",
        references: [
          { canon: "tanakh", book: "isaiah", chapter: "9", verse: "6", verseEnd: "7" },
          { canon: "newtestament", book: "luke", chapter: "1", verse: "68", verseEnd: "75" }
        ]
      },
      {
        id: "christ-and-the-covenant-new-covenant",
        title: "New covenant with Israel and Judah",
        description: "See the covenant promise that explicitly names the house of Israel and Judah.",
        references: [
          { canon: "tanakh", book: "jeremiah", chapter: "31", verse: "31", verseEnd: "34" },
          { canon: "newtestament", book: "hebrews", chapter: "8", verse: "8", verseEnd: "12" }
        ]
      },
      {
        id: "christ-and-the-covenant-blood",
        title: "Blood of the covenant",
        description: "Read the covenant meal and the kingdom promise together.",
        references: [
          { canon: "newtestament", book: "matthew", chapter: "26", verse: "27", verseEnd: "28" },
          { canon: "newtestament", book: "acts", chapter: "3", verse: "19", verseEnd: "21" }
        ]
      },
      {
        id: "christ-and-the-covenant-remnant",
        title: "Remnant and restoration",
        description: "Track restoration language through the apostles and the prophets.",
        references: [
          { canon: "newtestament", book: "romans", chapter: "11", verse: "25", verseEnd: "29" },
          { canon: "tanakh", book: "ezekiel", chapter: "36", verse: "24", verseEnd: "28" }
        ]
      }
    ]
  },
  {
    id: "captivity-and-scattering",
    title: "Captivity and Scattering",
    description: "Follow exile, dispersion, and the promise of a remnant remembered.",
    level: "Intermediate",
    category: "Restoration",
    resource: { label: "Open biblical references", href: "/biblical_references.html" },
    steps: [
      {
        id: "captivity-and-scattering-curses",
        title: "Covenant curses",
        description: "Read the warning passages that describe discipline and dispersion.",
        references: [
          { canon: "tanakh", book: "leviticus", chapter: "26", verse: "33", verseEnd: "39" },
          { canon: "tanakh", book: "deuteronomy", chapter: "28", verse: "15", verseEnd: "37" }
        ]
      },
      {
        id: "captivity-and-scattering-nations",
        title: "Scattered among the nations",
        description: "See how the covenant language describes life among foreign nations.",
        references: [
          { canon: "tanakh", book: "deuteronomy", chapter: "28", verse: "64", verseEnd: "68" },
          { canon: "tanakh", book: "hosea", chapter: "3", verse: "4", verseEnd: "5" }
        ]
      },
      {
        id: "captivity-and-scattering-remembered",
        title: "Remembered in captivity",
        description: "Connect the remnant language to hope while the people are still dispersed.",
        references: [
          { canon: "tanakh", book: "ezekiel", chapter: "11", verse: "16", verseEnd: "17" },
          { canon: "tanakh", book: "jeremiah", chapter: "29", verse: "11", verseEnd: "14" }
        ]
      },
      {
        id: "captivity-and-scattering-regathered",
        title: "Regathered and restored",
        description: "Finish with the promise that the scattered would be gathered again.",
        references: [
          { canon: "tanakh", book: "isaiah", chapter: "56", verse: "8" },
          { canon: "tanakh", book: "ezekiel", chapter: "37", verse: "21", verseEnd: "28" }
        ]
      }
    ]
  },
  {
    id: "clean-and-unclean",
    title: "Clean and Unclean",
    description: "Study holiness through distinction, discipline, and covenant order.",
    level: "Foundational",
    category: "Holiness",
    resource: { label: "Open encyclopedia", href: "/encyclopedia.html" },
    steps: [
      {
        id: "clean-and-unclean-leviticus",
        title: "Distinctions in Torah",
        description: "Start where clean and unclean are named and ordered for the people.",
        references: [
          { canon: "tanakh", book: "leviticus", chapter: "11", verse: "1", verseEnd: "47" }
        ]
      },
      {
        id: "clean-and-unclean-holy-common",
        title: "Holy and common",
        description: "Read how priests were told to teach the difference between holy and profane.",
        references: [
          { canon: "tanakh", book: "leviticus", chapter: "10", verse: "10", verseEnd: "11" },
          { canon: "tanakh", book: "deuteronomy", chapter: "14", verse: "1", verseEnd: "21" }
        ]
      },
      {
        id: "clean-and-unclean-witness",
        title: "Witness in conduct",
        description: "Connect holiness to daily behavior and the public witness of the nation.",
        references: [
          { canon: "tanakh", book: "isaiah", chapter: "52", verse: "11" },
          { canon: "newtestament", book: "1-peter", chapter: "1", verse: "15", verseEnd: "16" }
        ]
      },
      {
        id: "clean-and-unclean-discernment",
        title: "Discernment in the assemblies",
        description: "Test modern claims by the covenant pattern of discernment and obedience.",
        references: [
          { canon: "newtestament", book: "acts", chapter: "10", verse: "14" },
          { canon: "newtestament", book: "1-corinthians", chapter: "6", verse: "19", verseEnd: "20" }
        ]
      }
    ]
  },
  {
    id: "replacement-theology",
    title: "Replacement Theology",
    description: "Test the doctrine that claims Israel’s covenant role was replaced.",
    level: "Advanced",
    category: "Doctrine correction",
    resource: { label: "Open biblical references", href: "/biblical_references.html" },
    steps: [
      {
        id: "replacement-theology-not-cast-away",
        title: "Israel not cast away",
        description: "Begin with the apostolic denial that God rejected His people.",
        references: [
          { canon: "newtestament", book: "romans", chapter: "11", verse: "1", verseEnd: "5" }
        ]
      },
      {
        id: "replacement-theology-blindness",
        title: "Blindness in part",
        description: "Read the mystery of partial blindness and the fullness of the nations.",
        references: [
          { canon: "newtestament", book: "romans", chapter: "11", verse: "25", verseEnd: "29" },
          { canon: "newtestament", book: "ephesians", chapter: "2", verse: "11", verseEnd: "13" }
        ]
      },
      {
        id: "replacement-theology-grafted-in",
        title: "Grafted in, not replacing",
        description: "See how the olive tree image preserves the root and warns against boasting.",
        references: [
          { canon: "newtestament", book: "romans", chapter: "11", verse: "17", verseEnd: "24" }
        ]
      },
      {
        id: "replacement-theology-restoration",
        title: "Restoration promised",
        description: "End with the prophets’ assurance that Israel’s covenant identity remains in view.",
        references: [
          { canon: "tanakh", book: "ezekiel", chapter: "36", verse: "24", verseEnd: "28" },
          { canon: "tanakh", book: "amos", chapter: "9", verse: "11", verseEnd: "15" }
        ]
      }
    ]
  }
];

const STUDY_PATH_PROGRESS_KEY = "sj_institute_app_study_path_progress_v1";

const PROGRESS_KEY = "semiticJewAppProgress";
const SETTINGS_KEY = "sj_institute_app_settings_v1";
const READER_MARKS_KEY = "sj_institute_app_reader_marks_v1";
const READER_HISTORY_KEY = "sj_institute_app_last_read_v1";
const SAVED_LIBRARY_FILTERS_KEY = "sj_institute_app_saved_library_filters_v1";
const CURRENT_STUDY_CHAIN_KEY = "sj_institute_app_current_study_chain_v1";
const SAVED_STUDY_CHAINS_KEY = "sj_institute_app_study_chains_v1";
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
let readerFocusVerse = "";
let readerActiveVerse = "";
let readerChapterSearchTerm = "";
let currentReaderVerses = [];
let currentReaderLocation = { canon: "", book: "", chapter: "" };
let currentStudyPathId = "";
let currentStudyPathStepId = "";
let onboardingLastFocus = null;
let dailyPreceptsPromise = null;
let referenceEntriesPromise = null;
const chapterCrossrefCache = new Map();
const chapterAvailabilityCache = new Map();
const chapterVerseCache = new Map();

const DAILY_PROMPTS = [
  "What does this passage reveal about covenant identity?",
  "What command, promise, or warning appears in this passage?",
  "What precept connects this verse to the rest of Scripture?",
  "How does this text correct common religious assumptions?",
  "What does this passage require the reader to obey today?"
];

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

function escapeSelector(value){
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value || "").replace(/["\\]/g, "\\$&");
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

function readOnboardingState(){
  return readJSONStorage(ONBOARDING_KEY, {});
}

function writeOnboardingState(state = {}){
  writeJSONStorage(ONBOARDING_KEY, {
    completed: Boolean(state.completed),
    completedAt: state.completedAt || "",
    source: state.source || ""
  });
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
  const exists = Boolean(saved.canon && saved.book && saved.chapter);
  return {
    canon: saved.canon || "tanakh",
    book: saved.book || "genesis",
    chapter: String(saved.chapter || "1"),
    verse: String(saved.verse || ""),
    updatedAt: saved.updatedAt || "",
    exists
  };
}

function writeLastRead(location){
  const lastRead = {
    canon: location.canon,
    book: location.book,
    chapter: String(location.chapter || "1"),
    verse: String(location.verse || ""),
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
  renderTodayDashboard();
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

function parseMarkKey(key){
  const [canon, book, chapter, verse] = String(key || "").split(":");
  if (!canon || !book || !chapter) return null;
  return { canon, book, chapter, verse: verse || "" };
}

function locationFromItem(item){
  const parsed = parseMarkKey(item.key);
  return {
    canon: item.canon || parsed?.canon || "",
    book: item.book || parsed?.book || "",
    chapter: String(item.chapter || parsed?.chapter || "1"),
    verse: String(item.verse || parsed?.verse || "")
  };
}

function normalizeSavedItem(item, type, source){
  const location = locationFromItem(item);
  const ref = item.ref || item.title || [
    titleFromSlug(location.book),
    location.chapter && `${location.chapter}${location.verse ? `:${location.verse}` : ""}`
  ].filter(Boolean).join(" ");

  return {
    ...item,
    type,
    source,
    key: item.key || item.ref || item.url || `${source}:${type}:${ref}`,
    ref,
    text: item.text || item.exposition || item.note || "",
    note: item.note || item.exposition || "",
    canon: location.canon,
    book: location.book,
    chapter: location.chapter,
    verse: location.verse,
    date: item.savedAt || item.updatedAt || ""
  };
}

function readSiteBookmarks(){
  const items = readJSONStorage(LEGACY_KEYS.bookmarks, []);
  return Array.isArray(items) ? items : [];
}

function writeSiteBookmarks(items){
  writeJSONStorage(LEGACY_KEYS.bookmarks, items.slice(0, 50));
}

function readSiteHighlights(){
  const items = readJSONStorage(LEGACY_KEYS.highlights, []);
  return Array.isArray(items) ? items : [];
}

function writeSiteHighlights(items){
  writeJSONStorage(LEGACY_KEYS.highlights, items.slice(0, 300));
}

function readSiteNotes(){
  const items = readJSONStorage(LEGACY_KEYS.notes, []);
  return Array.isArray(items) ? items : [];
}

function writeSiteNotes(items){
  writeJSONStorage(LEGACY_KEYS.notes, items.slice(0, 300));
}

function readSiteHistory(){
  const items = readJSONStorage(LEGACY_KEYS.reading, []);
  return Array.isArray(items) ? items : [];
}

function writeSiteHistory(items){
  writeJSONStorage(LEGACY_KEYS.reading, items.slice(0, 8));
}

function appBookmarkItems(){
  return readReaderMarks().bookmarks.map(item => normalizeSavedItem(item, "bookmark", "app"));
}

function siteBookmarkItems(){
  return readSiteBookmarks().map(item => normalizeSavedItem({
    ...item,
    key: item.url || item.title,
    ref: item.title || item.url,
    text: item.canonLabel || "",
    canon: item.canon,
    book: item.book,
    chapter: item.chapter,
    savedAt: item.savedAt
  }, "bookmark", "site"));
}

function appHighlightItems(){
  return readReaderMarks().highlights.map(item => normalizeSavedItem(item, "highlight", "app"));
}

function appNoteItems(){
  return readReaderMarks().notes.map(item => normalizeSavedItem(item, "note", "app"));
}

function siteHighlightItems(){
  return readSiteHighlights().map(item => normalizeSavedItem(item, "highlight", "site"));
}

function siteNoteItems(){
  return readSiteNotes().map(item => normalizeSavedItem(item, "note", "site"));
}

function formatSavedDate(value){
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function removeSavedItem(type, source, key){
  const marks = readReaderMarks();

  if (source === "app" && type === "bookmark"){
    marks.bookmarks = marks.bookmarks.filter(item => item.key !== key && item.ref !== key);
    writeReaderMarks(marks);
    return;
  }

  if (source === "app" && type === "highlight"){
    marks.highlights = marks.highlights.filter(item => item.key !== key && item.ref !== key);
    writeReaderMarks(marks);
    return;
  }

  if (source === "app" && type === "note"){
    marks.notes = marks.notes.filter(item => item.key !== key && item.ref !== key);
    writeReaderMarks(marks);
    return;
  }

  if (source === "site" && type === "bookmark"){
    writeSiteBookmarks(readSiteBookmarks().filter(item => item.url !== key && item.key !== key));
  }

  if (source === "site" && type === "highlight"){
    writeSiteHighlights(readSiteHighlights().filter(item => item.key !== key));
  }

  if (source === "site" && type === "note"){
    writeSiteNotes(readSiteNotes().filter(item => item.key !== key));
  }

  if (source === "site" && type === "history"){
    writeSiteHistory(readSiteHistory().filter(item => item.url !== key && item.key !== key && item.title !== key));
  }

  if (source === "app" && type === "history"){
    localStorage.removeItem(READER_HISTORY_KEY);
  }

  renderProfile();
  renderTodayDashboard();
}

function updateAppNote(key, note){
  const marks = readReaderMarks();
  const existing = marks.notes.find(item => item.key === key || item.ref === key);
  if (!existing) return;
  marks.notes = marks.notes.filter(item => item.key !== key && item.ref !== key);
  if (note.trim()){
    marks.notes.unshift({ ...existing, key: existing.key || key, note: note.trim(), savedAt: new Date().toISOString() });
  }
  writeReaderMarks(marks);
}

function defaultSavedLibraryFilters(){
  return {
    query: "",
    type: "all",
    canon: "all",
    source: "all",
    sort: "newest"
  };
}

function readSavedLibraryFilters(){
  const saved = readJSONStorage(SAVED_LIBRARY_FILTERS_KEY, {});
  return { ...defaultSavedLibraryFilters(), ...saved };
}

function writeSavedLibraryFilters(filters){
  writeJSONStorage(SAVED_LIBRARY_FILTERS_KEY, { ...defaultSavedLibraryFilters(), ...filters });
}

function applySavedLibraryControls(){
  const filters = readSavedLibraryFilters();
  const form = $("#saved-library-filter-form");
  if (!form) return;
  if (form.elements.query) form.elements.query.value = filters.query;
  if (form.elements.type) form.elements.type.value = filters.type;
  if (form.elements.canon) form.elements.canon.value = filters.canon;
  if (form.elements.source) form.elements.source.value = filters.source;
  if (form.elements.sort) form.elements.sort.value = filters.sort;
}

function savedItemSearchText(item){
  return [
    item.title,
    item.ref,
    item.text,
    item.note,
    item.canon,
    CANON_LABELS[item.canon],
    item.book,
    titleFromSlug(item.book),
    item.type,
    item.source,
    item.preview
  ].filter(Boolean).join(" ").toLowerCase();
}

function savedItemTime(item){
  const time = Date.parse(item.date || "");
  return Number.isNaN(time) ? 0 : time;
}

function compareSavedItems(a, b, sort){
  if (sort === "oldest") return savedItemTime(a) - savedItemTime(b);
  if (sort === "reference") return String(a.ref || "").localeCompare(String(b.ref || ""));
  if (sort === "type"){
    return String(a.type || "").localeCompare(String(b.type || "")) ||
      String(a.ref || "").localeCompare(String(b.ref || ""));
  }
  return savedItemTime(b) - savedItemTime(a);
}

function collectSavedLibraryItems(){
  const lastRead = readLastRead();
  const chains = readSavedStudyChains();
  const localHistory = lastRead.exists ? [normalizeSavedItem({
    key: `history:app:${lastRead.canon}:${lastRead.book}:${lastRead.chapter}`,
    ref: `${titleFromSlug(lastRead.book)} ${lastRead.chapter}`,
    text: "Last local app reader location.",
    canon: lastRead.canon,
    book: lastRead.book,
    chapter: lastRead.chapter,
    savedAt: lastRead.updatedAt
  }, "history", "app")] : [];

  const siteHistory = readSiteHistory().map(item => normalizeSavedItem({
    ...item,
    key: item.url || item.title,
    ref: item.title || item.url,
    text: item.canonLabel || "",
    canon: item.canon,
    book: item.book,
    chapter: item.chapter
  }, "history", "site"));

  return [
    ...appBookmarkItems(),
    ...siteBookmarkItems(),
    ...appHighlightItems(),
    ...appNoteItems(),
    ...siteHighlightItems(),
    ...siteNoteItems(),
    ...localHistory,
    ...siteHistory,
    ...chains.map(chain => {
      const preview = savedStudyChainPreview(chain).join(" · ");
      return normalizeSavedItem({
        id: chain.id,
        key: chain.id,
        ref: chain.title,
        title: chain.title,
        items: chain.items,
        text: preview,
        preview,
        note: preview,
        canon: chain.canon,
        book: chain.book,
        chapter: chain.chapter || "1",
        verse: chain.items?.[0]?.verse || "",
        source: "app",
        type: "chain",
        savedAt: chain.updatedAt || chain.createdAt
      }, "chain", "app");
    })
  ];
}

function filteredSavedLibrary(){
  const filters = readSavedLibraryFilters();
  const allItems = collectSavedLibraryItems();
  const query = filters.query.trim().toLowerCase();
  const filtered = allItems.filter(item => {
    if (filters.type !== "all" && item.type !== filters.type) return false;
    if (filters.canon !== "all" && item.canon !== filters.canon) return false;
    if (filters.source !== "all" && item.source !== filters.source) return false;
    if (query && !savedItemSearchText(item).includes(query)) return false;
    return true;
  }).sort((a, b) => compareSavedItems(a, b, filters.sort));

  return { filters, allItems, filtered };
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

function canonLandingUrl(canon){
  return CANON_LANDING_URLS[canon] || "/biblia.html";
}

function bookPageSlug(canon, book){
  const override = BOOK_PAGE_OVERRIDES[canon]?.[book];
  if (override === "") return "";
  return override || book;
}

function bookPageUrl(canon, book){
  const slug = bookPageSlug(canon, book);
  return slug ? `/${canon}/${slug}.html` : "";
}

function chapterPageUrl(canon, book, chapter){
  if (!canon || !book || !chapter) return "";
  return `/${canon}/chapter.html?book=${encodeURIComponent(book)}&ch=${encodeURIComponent(chapter)}`;
}

function bookCategory(canon, book){
  const context = CANON_CONTEXT[canon];
  if (!context) return "";
  const found = context.categories.find(([books]) => books.split(" ").includes(book));
  return found ? found[1] : context.fallback;
}

function sameReaderLocation(a, b){
  return Boolean(a && b &&
    a.canon === b.canon &&
    a.book === b.book &&
    String(a.chapter) === String(b.chapter));
}

function readerVerseShareSlug(location = {}, verse = ""){
  const book = String(location.book || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const chapter = String(location.chapter || "").trim();
  const verseNumber = String(verse || "").trim();
  if (!book || !chapter || !verseNumber) return "";
  return `${book}-${chapter}-${verseNumber}`;
}

function readerVerseShareUrl(location = {}, verse = ""){
  const slug = readerVerseShareSlug(location, verse);
  return slug ? `https://semiticjew.org/v/${slug}/` : "https://semiticjew.org/app.html";
}

function readerVerseShareText(ref, text, location = {}, verse = ""){
  const reference = String(ref || "").trim();
  const verseText = String(text || "").trim().replace(/\s+/g, " ");
  const shareUrl = readerVerseShareUrl(location, verse);
  return [
    reference ? `${reference}, KJV` : "KJV",
    "",
    `“${verseText}”`,
    "",
    `Read in context | ${shareUrl}`,
    "",
    "Semitic Jew",
    "Scripture. Logic. History. Identity."
  ].join("\n");
}

async function shareReaderVerse(ref, text, location = {}, verse = ""){
  const shareUrl = readerVerseShareUrl(location, verse);
  const shareText = readerVerseShareText(ref, text, location, verse);
  const title = ref ? `${ref} - Semitic Jew` : "Semitic Jew";

  if (navigator.share){
    try{
      await navigator.share({ title, text: shareText });
      return "shared";
    }catch(error){
      if (error?.name === "AbortError") return "canceled";
    }
  }

  const copied = await copyTextToClipboard(shareText);
  return copied ? "copied" : "failed";
}

function readerScopeLabel(location){
  const book = titleFromSlug(location.book);
  const chapter = String(location.chapter || "1");
  const verse = location.verse ? `:${location.verse}` : "";
  return `${book} ${chapter}${verse}`;
}

async function loadChapterVerses(canon, book, chapter){
  const key = `${canon}:${book}:${chapter}`;
  if (chapterVerseCache.has(key)) return chapterVerseCache.get(key);
  try{
    const chapterData = await getJSON(`/data/${canon}/${book}/${chapter}.json`);
    const verses = Array.isArray(chapterData)
      ? chapterData
      : Array.isArray(chapterData?.verses)
        ? chapterData.verses
        : [];
    chapterVerseCache.set(key, verses);
    return verses;
  }catch(error){
    chapterVerseCache.set(key, null);
    return null;
  }
}

function canonicalBookKey(value){
  return String(value || "").toLowerCase().replace(/\s+/g, "-");
}

function normalizeScriptureRef(ref){
  if (!ref) return null;
  const canon = String(ref.canon || "").toLowerCase();
  const slug = String(ref.slug || "").toLowerCase();
  const chapter = String(ref.ch || ref.chapter || "").trim();
  const verse = String(ref.vStart || ref.v || "").trim();
  const verseEnd = String(ref.vEnd || "").trim();
  if (!canon || !slug || !chapter) return null;
  return {
    canon,
    slug,
    chapter,
    verse,
    verseEnd,
    label: ref.label || scriptureRefLabel(ref)
  };
}

function normalizeChapterCrossref(ref){
  if (!ref) return null;
  const canon = String(ref.canon || "").toLowerCase();
  const slug = String(ref.slug || "").toLowerCase();
  const chapter = String(ref.c || ref.chapter || "").trim();
  const verse = String(ref.v || ref.verse || "").trim();
  if (!canon || !slug || !chapter) return null;
  return {
    canon,
    slug,
    chapter,
    verse,
    verseEnd: String(ref.vEnd || ref.verseEnd || "").trim(),
    label: ref.label || scriptureRefLabel({ ...ref, ch: ref.c || ref.chapter, vStart: ref.v || ref.verse, vEnd: ref.vEnd || ref.verseEnd || ref.v || ref.verse })
  };
}

function relatedSourceLabel(item){
  if (item.kind === "dictionary") return "Dictionary";
  if (item.kind === "crossref") return "Cross-reference";
  return "Reference";
}

function relatedItemKey(item){
  if (item.kind === "dictionary") return `dictionary:${item.id}`;
  return `crossref:${item.canon}:${item.slug}:${item.chapter}:${item.verse}:${item.verseEnd || ""}:${item.label}`;
}

function relatedItemSearchText(item){
  return [
    item.title,
    item.snippet,
    item.sourceLabel,
    item.kind,
    item.canon,
    CANON_LABELS[item.canon],
    item.book,
    titleFromSlug(item.slug),
    item.label,
    item.verseLabel
  ].filter(Boolean).join(" ").toLowerCase();
}

function rankRelatedItem(item, location){
  let score = item.score || 0;
  if (item.kind === "dictionary"){
    if (item.canon === location.canon && item.slug === location.book) score += 10;
    if (item.chapter === String(location.chapter)) score += 10;
    if (location.verse && item.verse && String(location.verse) === String(item.verse)) score += 15;
  }else if (item.kind === "crossref"){
    if (item.canon === location.canon && item.slug === location.book) score += 5;
    if (item.chapter === String(location.chapter)) score += 5;
  }
  return score;
}

function chapterCrossrefItems(crossrefs, location, scope = "chapter"){
  if (!crossrefs || typeof crossrefs !== "object") return [];
  const items = [];
  const seen = new Set();
  const activeVerse = String(location.verse || "").trim();

  Object.entries(crossrefs).forEach(([sourceVerse, targets]) => {
    const sourceVerseNum = String(sourceVerse || "").trim();
    if (scope === "verse" && activeVerse && sourceVerseNum !== activeVerse) return;
    const list = Array.isArray(targets) ? targets : [];
    list.forEach(target => {
      const normalized = normalizeChapterCrossref(target);
      if (!normalized) return;
      const key = relatedItemKey({ kind: "crossref", ...normalized, label: normalized.label, verseLabel: sourceVerseNum });
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        kind: "crossref",
        source: "crossref",
        sourceLabel: "Cross-reference",
        title: normalized.label || scriptureRefLabel({ ...normalized, ch: normalized.chapter, vStart: normalized.verse }),
        snippet: sourceVerseNum ? `Linked from verse ${sourceVerseNum} in this chapter.` : "Linked from this chapter.",
        canon: normalized.canon,
        slug: normalized.slug,
        book: titleFromSlug(normalized.slug),
        chapter: normalized.chapter,
        verse: normalized.verse,
        verseEnd: normalized.verseEnd || "",
        verseLabel: sourceVerseNum,
        actionLabel: "Open in Bible",
        pageUrl: "",
        location: {
          canon: normalized.canon,
          book: normalized.slug,
          chapter: normalized.chapter,
          verse: normalized.verse,
          verseEnd: normalized.verseEnd || ""
        },
        score: 20 + (location.verse && sourceVerseNum && String(location.verse) === sourceVerseNum ? 20 : 0)
      });
    });
  });

  return items;
}

function dictionaryReferenceItems(entries, location, scope = "chapter"){
  const items = [];
  const seen = new Set();
  const activeVerse = String(location.verse || "").trim();

  entries.forEach(entry => {
    const refs = Array.isArray(entry.bible_refs) ? entry.bible_refs : [];
    const normalizedRefs = refs.map(normalizeScriptureRef).filter(Boolean);
    const matchedRefs = normalizedRefs.filter(ref => ref.canon === location.canon && ref.slug === location.book && ref.chapter === String(location.chapter));
    const verseMatches = activeVerse
      ? matchedRefs.filter(ref => {
          const start = Number(ref.verse || 0);
          const end = Number(ref.verseEnd || ref.verse || 0);
          const verse = Number(activeVerse || 0);
          return start && verse >= start && verse <= end;
        })
      : [];
    const shouldInclude = scope === "verse" ? verseMatches.length > 0 : matchedRefs.length > 0;

    if (!shouldInclude) return;

    const bestRef = verseMatches[0] || matchedRefs[0];
    const key = relatedItemKey({ kind: "dictionary", id: entry.id });
    if (seen.has(key)) return;
    seen.add(key);

    items.push({
      kind: "dictionary",
      source: "dictionary",
      sourceLabel: "Dictionary",
      id: entry.id,
      title: entry.headword || titleFromSlug(entry.id),
      snippet: truncate(entry.usage_notes || entry.definition || "", 180),
      canon: bestRef.canon,
      slug: bestRef.slug,
      book: titleFromSlug(bestRef.slug),
      chapter: bestRef.chapter,
      verse: bestRef.verse || "",
      verseEnd: bestRef.verseEnd || "",
      verseLabel: bestRef.label || scriptureRefLabel({ canon: bestRef.canon, slug: bestRef.slug, ch: bestRef.chapter, vStart: bestRef.verse, vEnd: bestRef.verseEnd }),
      pageUrl: `/encyclopedia.html#${encodeURIComponent(entry.id)}`,
      actionLabel: "Open reference",
      location: {
        canon: bestRef.canon,
        book: bestRef.slug,
        chapter: bestRef.chapter,
        verse: bestRef.verse || "",
        verseEnd: bestRef.verseEnd || ""
      },
      score: verseMatches.length ? 100 : 60
    });
  });

  return items;
}

function uniqueRelatedItems(items){
  const seen = new Set();
  return items.filter(item => {
    const key = relatedItemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildRelatedReferences(location, entries, crossrefs){
  const hasVerse = Boolean(String(location.verse || "").trim());
  const verseItems = hasVerse
    ? uniqueRelatedItems([
        ...dictionaryReferenceItems(entries, location, "verse"),
        ...chapterCrossrefItems(crossrefs, location, "verse")
      ])
    : [];
  const chapterItems = uniqueRelatedItems([
    ...dictionaryReferenceItems(entries, location, "chapter"),
    ...chapterCrossrefItems(crossrefs, location, "chapter")
  ]);
  const related = verseItems.length
    ? [
        ...verseItems.sort((a, b) => rankRelatedItem(b, location) - rankRelatedItem(a, location) || String(a.title || "").localeCompare(String(b.title || ""))),
        ...chapterItems.filter(item => !verseItems.some(verseItem => relatedItemKey(verseItem) === relatedItemKey(item)))
      ]
    : chapterItems;
  return related
    .sort((a, b) => rankRelatedItem(b, location) - rankRelatedItem(a, location) || String(a.title || "").localeCompare(String(b.title || "")))
    .slice(0, 8);
}

function renderRelatedCard(item){
  const title = escapeHTML(item.title || item.label || "Related reference");
  const snippet = item.snippet ? `<p class="app-related-snippet">${escapeHTML(item.snippet)}</p>` : "";

  const openBible = item.location
    ? `<button class="app-btn" type="button" data-related-open="bible" data-related-canon="${escapeHTML(item.location.canon)}" data-related-book="${escapeHTML(item.location.book)}" data-related-chapter="${escapeHTML(item.location.chapter)}" data-related-verse="${escapeHTML(item.location.verse || "")}">Open in Bible</button>`
    : "";
  const openPage = item.pageUrl
    ? `<a class="app-btn" href="${escapeHTML(item.pageUrl)}" data-related-open="page">Open reference</a>`
    : "";
  const addChain = item.location
    ? `<button class="app-btn" type="button" data-chain-add data-chain-canon="${escapeHTML(item.location.canon)}" data-chain-book="${escapeHTML(item.location.book)}" data-chain-chapter="${escapeHTML(item.location.chapter)}" data-chain-verse="${escapeHTML(item.location.verse || "")}" data-chain-verse-end="${escapeHTML(item.location.verseEnd || "")}" data-chain-ref="${escapeHTML(item.verseLabel || item.title || "")}" data-chain-text="${escapeHTML(item.snippet || item.title || "")}">Add to Chain</button>`
    : "";

  return `
    <article class="app-related-card">
      <h4>${title}</h4>
      ${snippet}
      <div class="app-related-actions">
        ${openBible}
        ${addChain}
        ${openPage}
      </div>
    </article>
  `;
}

function setReaderActiveVerse(verse, options = {}){
  readerActiveVerse = verse ? String(verse) : "";
  const { persist = true, updateRelated = true, location = currentReaderLocation } = options;
  if (persist && location.canon && location.book && location.chapter){
    writeLastRead({ ...location, verse: readerActiveVerse });
  }
  updateReaderVerseSelection();
  renderStudyChain();
  if (updateRelated && location.canon && location.book && location.chapter){
    renderRelatedReferences({ ...location, verse: readerActiveVerse }, null, readerRequestId);
  }
}

function updateReaderVerseSelection(){
  const verseNodes = $$(".reader-verse");
  if (!verseNodes.length) return;
  verseNodes.forEach(node => {
    const active = node.dataset.verse === String(readerActiveVerse || "");
    node.classList.toggle("is-active", active);
    if (active) node.setAttribute("aria-current", "true");
    else node.removeAttribute("aria-current");
  });
}

function readCurrentStudyChain(){
  const items = readJSONStorage(CURRENT_STUDY_CHAIN_KEY, []);
  return Array.isArray(items) ? items : [];
}

function writeCurrentStudyChain(items){
  writeJSONStorage(CURRENT_STUDY_CHAIN_KEY, Array.isArray(items) ? items : []);
  renderStudyChain();
  renderTodayDashboard();
}

function readStudyPathProgress(){
  return readJSONStorage(STUDY_PATH_PROGRESS_KEY, {});
}

function writeStudyPathProgress(progress){
  writeJSONStorage(STUDY_PATH_PROGRESS_KEY, progress && typeof progress === "object" ? progress : {});
}

function studyPathProgress(pathId){
  const progress = readStudyPathProgress();
  return progress[pathId] && typeof progress[pathId] === "object"
    ? progress[pathId]
    : { completed: [], updatedAt: "" };
}

function studyPathCompletedIds(pathId){
  const progress = studyPathProgress(pathId);
  return Array.isArray(progress.completed) ? progress.completed : [];
}

function studyPathCompleteCount(path){
  return studyPathCompletedIds(path.id).length;
}

function studyPathStepKey(pathId, stepId){
  return `${pathId}:${stepId}`;
}

function isStudyPathStepComplete(pathId, stepId){
  return studyPathCompletedIds(pathId).includes(stepId);
}

function setStudyPathStepComplete(pathId, stepId, complete){
  const progress = readStudyPathProgress();
  const entry = progress[pathId] && typeof progress[pathId] === "object" ? progress[pathId] : { completed: [], updatedAt: "" };
  const completed = new Set(Array.isArray(entry.completed) ? entry.completed : []);
  const shouldComplete = typeof complete === "boolean" ? complete : !completed.has(stepId);
  if (shouldComplete) completed.add(stepId);
  else completed.delete(stepId);
  progress[pathId] = {
    completed: Array.from(completed),
    updatedAt: new Date().toISOString()
  };
  writeStudyPathProgress(progress);
  renderTodayDashboard();
}

function studyPathNextIncompleteStep(path){
  const completed = new Set(studyPathCompletedIds(path.id));
  return (Array.isArray(path.steps) ? path.steps : []).find(step => !completed.has(step.id)) || (Array.isArray(path.steps) ? path.steps[0] : null) || null;
}

function formatStudyPathReference(ref){
  if (!ref) return "";
  return scriptureRefLabel({
    slug: ref.book,
    ch: ref.chapter,
    vStart: ref.verse,
    vEnd: ref.verseEnd,
    label: ref.label
  }) || `${titleFromSlug(ref.book)} ${ref.chapter}${ref.verse ? `:${ref.verse}${ref.verseEnd && ref.verseEnd !== ref.verse ? `–${ref.verseEnd}` : ""}` : ""}`;
}

function studyPathStepRefs(step){
  return Array.isArray(step.references) ? step.references.filter(Boolean) : [];
}

function studyPathResource(step, path){
  return step.resource || path.resource || null;
}

async function openStudyPathScripture(ref){
  if (!ref || !ref.book || !ref.chapter) return false;
  setActiveTab("bible");
  await setReaderLocation({
    canon: String(ref.canon || "tanakh").toLowerCase(),
    book: String(ref.book).toLowerCase(),
    chapter: String(ref.chapter),
    verse: String(ref.verse || "")
  });
  $("#reader-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

async function addStudyPathReferencesToChain(path, step){
  const refs = studyPathStepRefs(step);
  if (!refs.length) return false;
  let added = false;
  for (const ref of refs){
    const ok = await addToCurrentStudyChain({
      canon: String(ref.canon || "tanakh").toLowerCase(),
      book: String(ref.book).toLowerCase(),
      chapter: String(ref.chapter),
      verse: String(ref.verse || ""),
      verseEnd: String(ref.verseEnd || ref.verse || "")
    }, {
      reference: formatStudyPathReference(ref),
      text: step.description || path.description || "",
      source: "study-path",
      sourceLabel: path.title
    });
    added = added || ok;
  }
  return added;
}

function setStudyPathStatus(message, state = "info"){
  const root = $("#study-path-status");
  if (!root) return;
  root.textContent = message || "";
  root.dataset.state = state;
}

function renderStudyPathCards(){
  const root = $("#study-path-grid");
  if (!root) return;

  if (!Array.isArray(STUDY_PATHS) || !STUDY_PATHS.length){
    root.innerHTML = `<div class="app-study-path-empty">Study paths will appear here.</div>`;
    return;
  }

  root.innerHTML = STUDY_PATHS.map(path => {
    const done = studyPathCompleteCount(path);
    const total = Array.isArray(path.steps) ? path.steps.length : 0;
    const current = currentStudyPathId === path.id;
    const buttonLabel = done >= total && total ? "Review" : done > 0 ? "Continue" : "Start";

    return `
      <article class="app-study-path-card${current ? " is-active" : ""}" data-study-path-card="${escapeHTML(path.id)}">
        <div class="app-study-path-card-head">
          <div class="app-study-path-card-copy">
            <h4>${escapeHTML(path.title)}</h4>
            <p>${escapeHTML(path.description)}</p>
          </div>
        </div>
        <div class="app-study-path-card-actions">
          <button class="app-btn primary" type="button" data-study-path-open="${escapeHTML(path.id)}">${escapeHTML(buttonLabel)}</button>
          ${path.resource ? `<a class="app-btn" href="${escapeHTML(path.resource.href)}">${escapeHTML(path.resource.label || "Open resource")}</a>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderStudyPathDetail(path, focusStepId = ""){
  const root = $("#study-path-detail");
  if (!root) return;

  if (!path){
    root.innerHTML = `
      <div class="app-study-path-empty">
        Select a study path to begin.
      </div>
    `;
    return;
  }

  const completed = new Set(studyPathCompletedIds(path.id));
  const total = Array.isArray(path.steps) ? path.steps.length : 0;
  const done = completed.size;
  const nextStep = focusStepId ? (path.steps || []).find(step => step.id === focusStepId) : studyPathNextIncompleteStep(path);
  const targetStepId = nextStep?.id || path.steps?.[0]?.id || "";
  currentStudyPathId = path.id;
  currentStudyPathStepId = targetStepId;

  root.innerHTML = `
    <article class="app-study-path-detail-card">
      <div class="app-study-path-detail-head">
        <div class="app-study-path-detail-copy">
          <h3>${escapeHTML(path.title)}</h3>
          <p>${escapeHTML(path.description)}</p>
        </div>
        <div class="app-study-path-detail-actions">
          <button class="app-btn primary" type="button" data-study-path-continue="${escapeHTML(path.id)}">${done >= total && total ? "Review next step" : "Continue"}</button>
          ${path.resource ? `<a class="app-btn" href="${escapeHTML(path.resource.href)}">${escapeHTML(path.resource.label || "Open resource")}</a>` : ""}
        </div>
      </div>
      <p class="app-study-path-status" id="study-path-status" aria-live="polite"></p>
      <div class="app-study-path-steps" aria-label="${escapeHTML(path.title)} steps">
        ${(Array.isArray(path.steps) ? path.steps : []).map(step => {
          const stepRefs = studyPathStepRefs(step);
          const stepComplete = completed.has(step.id);
          const stepTarget = step.id === targetStepId;
          const resource = studyPathResource(step, path);
          return `
            <article class="app-study-path-step${stepComplete ? " is-complete" : ""}${stepTarget ? " is-target" : ""}" id="study-path-step-${escapeHTML(step.id)}" data-study-path-step-card="${escapeHTML(path.id)}:${escapeHTML(step.id)}"${stepTarget ? ' aria-current="step"' : ""}>
              <div class="app-study-path-step-head">
                <div>
                  <h4>${escapeHTML(step.title)}</h4>
                  <p>${escapeHTML(step.description)}</p>
                </div>
              </div>
              ${stepRefs.length ? `
                <div class="app-study-path-ref-list" aria-label="${escapeHTML(step.title)} references">
                  ${stepRefs.map((ref, index) => `<button class="app-tag" type="button" data-study-path-step-ref="${escapeHTML(path.id)}:${escapeHTML(step.id)}:${index}">${escapeHTML(formatStudyPathReference(ref))}</button>`).join("")}
                </div>
              ` : `<p class="app-study-path-empty-line">No Scripture references provided for this step yet.</p>`}
              <div class="app-study-path-step-actions">
                <button class="app-btn" type="button" data-study-path-step-open="${escapeHTML(path.id)}:${escapeHTML(step.id)}"${stepRefs.length ? "" : " disabled"}>Open Scripture</button>
                <button class="app-btn" type="button" data-study-path-step-add-chain="${escapeHTML(path.id)}:${escapeHTML(step.id)}"${stepRefs.length ? "" : " disabled"}>Add references to Study Chain</button>
                ${resource ? `<a class="app-btn" href="${escapeHTML(resource.href)}" data-study-path-resource="${escapeHTML(path.id)}:${escapeHTML(step.id)}">${escapeHTML(resource.label || "Open resource")}</a>` : ""}
                <button class="app-btn" type="button" data-study-path-step-complete="${escapeHTML(path.id)}:${escapeHTML(step.id)}">${stepComplete ? "Undo complete" : "Mark complete"}</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </article>
  `;

  requestAnimationFrame(() => {
    const target = targetStepId ? $(`#study-path-step-${escapeSelector(targetStepId)}`) : null;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function renderStudyPaths(){
  renderStudyPathCards();
  const path = STUDY_PATHS.find(item => item.id === currentStudyPathId) || null;
  if (path){
    renderStudyPathDetail(path, currentStudyPathStepId);
  }else{
    const detail = $("#study-path-detail");
    if (detail){
      detail.innerHTML = `<div class="app-study-path-empty">Select a study path to begin.</div>`;
    }
    setStudyPathStatus("Select a study path to begin.", "info");
  }
}

async function openStudyPath(pathId, { continueNext = false, focusStepId = "" } = {}){
  const path = STUDY_PATHS.find(item => item.id === pathId);
  if (!path) return;
  const step = focusStepId
    ? (path.steps || []).find(item => item.id === focusStepId)
    : (continueNext ? studyPathNextIncompleteStep(path) : (path.steps || [])[0]);
  currentStudyPathId = path.id;
  currentStudyPathStepId = step?.id || "";
  renderStudyPaths();
  $("#study-path-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function readSavedStudyChains(){
  const items = readJSONStorage(SAVED_STUDY_CHAINS_KEY, []);
  return Array.isArray(items) ? items.map(normalizeSavedStudyChain).filter(Boolean) : [];
}

function writeSavedStudyChains(items){
  writeJSONStorage(SAVED_STUDY_CHAINS_KEY, Array.isArray(items) ? items.map(normalizeSavedStudyChain).filter(Boolean) : []);
}

function normalizeSavedStudyChain(chain){
  if (!chain || typeof chain !== "object") return null;
  const items = Array.isArray(chain.items) ? chain.items.map(normalizeStudyChainItem).filter(Boolean) : [];
  const first = items[0] || null;
  const canonSet = new Set(items.map(item => item.canon).filter(Boolean));
  const canon = chain.canon || (canonSet.size === 1 ? (first?.canon || "") : "mixed") || "mixed";
  return {
    id: chain.id || `chain-${Date.now()}`,
    title: String(chain.title || "").trim() || "Untitled Study Chain",
    createdAt: chain.createdAt || chain.updatedAt || new Date().toISOString(),
    updatedAt: chain.updatedAt || chain.createdAt || new Date().toISOString(),
    canon,
    book: chain.book || first?.book || "",
    chapter: String(chain.chapter || first?.chapter || ""),
    items
  };
}

function studyChainTitle(chain){
  const title = String(chain?.title || "").trim();
  return title || "Untitled Study Chain";
}

function savedStudyChainPreview(chain, count = 3){
  return (Array.isArray(chain.items) ? chain.items : [])
    .slice(0, count)
    .map(item => item.reference || `${titleFromSlug(item.book)} ${item.chapter}${item.verse ? `:${item.verse}` : ""}`)
    .filter(Boolean);
}

function studyChainExportText(chain, { includeHeading = true } = {}){
  const normalized = normalizeSavedStudyChain(chain);
  if (!normalized) return "";
  const items = Array.isArray(normalized.items) ? normalized.items : [];
  const lines = [
    studyChainTitle(normalized),
    includeHeading ? "Semitic Jew Study Chain" : ""
  ].filter(Boolean);

  if (items.length) lines.push("");

  items.forEach((item, index) => {
    const ref = item.reference || `${titleFromSlug(item.book)} ${item.chapter}${item.verse ? `:${item.verse}` : ""}` || `Verse ${index + 1}`;
    const text = String(item.text || "").trim();
    lines.push(`${index + 1}. ${ref}`);
    if (text) lines.push(`   ${text}`);
    lines.push("");
  });

  lines.push("Study with Semitic Jew:");
  lines.push("https://semiticjew.org/app.html");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function studyChainLessonOutline(chain){
  const normalized = normalizeSavedStudyChain(chain);
  if (!normalized) return "";
  const items = Array.isArray(normalized.items) ? normalized.items : [];
  const title = studyChainTitle(normalized);
  const outline = [
    title,
    "Opening Scripture:",
    items[0]?.reference || "Choose the opening verse",
    "Precept Chain:",
    ...items.map((item, index) => `${index + 1}. ${item.reference || `${titleFromSlug(item.book)} ${item.chapter}`}`),
    "Notes:",
    "Add brief teaching notes here.",
    "Closing Application:",
    "State the covenant lesson and the obedience response."
  ];
  return outline.join("\n");
}

async function copyTextToClipboard(text){
  const value = String(text || "");
  if (!value) return false;
  try{
    if (navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(value);
      return true;
    }
  }catch(error){
    // fall through to fallback
  }

  try{
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return Boolean(ok);
  }catch(error){
    return false;
  }
}

function setChainStatus(target, message, state = "info"){
  const selector = target === "saved" ? "#saved-study-chains-status" : "#study-chain-status";
  const node = $(selector);
  if (!node) return;
  node.textContent = message || "";
  node.dataset.state = state;
}

async function exportStudyChain(chain, { share = false, target = "current" } = {}){
  const normalized = normalizeSavedStudyChain(chain);
  if (!normalized) return false;
  const text = studyChainExportText(normalized);
  if (!text) return false;

  if (share && navigator.share){
    try{
      await navigator.share({
        title: studyChainTitle(normalized),
        text,
        url: "https://semiticjew.org/app.html"
      });
      setChainStatus(target, "Study chain shared.", "success");
      return true;
    }catch(error){
      // Share cancelled or unavailable.
      setChainStatus(target, "Share was not completed.", "error");
      return false;
    }
  }

  const copied = await copyTextToClipboard(text);
  setChainStatus(target, copied ? "Study chain copied to clipboard." : "Copy failed. Try again.", copied ? "success" : "error");
  return copied;
}

async function exportLessonOutline(chain, { target = "current" } = {}){
  const normalized = normalizeSavedStudyChain(chain);
  if (!normalized) return false;
  const text = studyChainLessonOutline(normalized);
  const copied = await copyTextToClipboard(text);
  setChainStatus(target, copied ? "Lesson outline copied to clipboard." : "Copy failed. Try again.", copied ? "success" : "error");
  return copied;
}

function savedStudyChainSearchText(chain){
  return [
    chain.title,
    chain.canon,
    CANON_LABELS[chain.canon],
    chain.book,
    titleFromSlug(chain.book),
    chain.chapter,
    savedStudyChainPreview(chain, 3).join(" "),
    Array.isArray(chain.items) ? chain.items.map(item => item.text).join(" ") : ""
  ].filter(Boolean).join(" ").toLowerCase();
}

function chainItemKey(location){
  return [
    location.canon,
    location.book,
    location.chapter,
    location.verse || "",
    location.verseEnd || ""
  ].join(":");
}

function normalizeStudyChainItem(item){
  const location = locationFromItem(item);
  const canon = String(item.canon || location.canon || "").toLowerCase();
  const book = String(item.book || location.book || "").toLowerCase();
  const chapter = String(item.chapter || location.chapter || "1");
  const verse = String(item.verse || location.verse || "");
  const verseEnd = String(item.verseEnd || location.verseEnd || "");
  const reference = item.reference || item.ref || [
    titleFromSlug(book),
    chapter,
    verse ? `:${verse}${verseEnd && verseEnd !== verse ? `–${verseEnd}` : ""}` : ""
  ].join("").replace(/\s+/g, " ").trim();

  return {
    id: item.id || chainItemKey({ canon, book, chapter, verse, verseEnd }),
    canon,
    book,
    chapter,
    verse,
    verseEnd,
    reference,
    text: item.text || "",
    source: item.source || "reader",
    sourceLabel: item.sourceLabel || "Reader",
    addedAt: item.addedAt || item.createdAt || new Date().toISOString()
  };
}

async function buildStudyChainItem(location, fallback = {}){
  const normalized = {
    canon: String(location.canon || "").toLowerCase(),
    book: String(location.book || "").toLowerCase(),
    chapter: String(location.chapter || "1"),
    verse: String(location.verse || ""),
    verseEnd: String(location.verseEnd || ""),
    reference: fallback.reference || "",
    text: fallback.text || "",
    source: fallback.source || "reader",
    sourceLabel: fallback.sourceLabel || "Reader",
    addedAt: new Date().toISOString()
  };

  if (!normalized.canon || !normalized.book || !normalized.chapter) return null;

  if (!normalized.text){
    const verses = await loadChapterVerses(normalized.canon, normalized.book, normalized.chapter);
    if (Array.isArray(verses) && verses.length){
      const start = Number(normalized.verse || 0) || 0;
      const end = Number(normalized.verseEnd || normalized.verse || 0) || start;
      const selected = start
        ? verses.filter(verse => {
            const num = Number(verse.v || 0);
            return num >= start && num <= end;
          })
        : verses;
      normalized.text = selected.map(verse => {
        const num = verse.v ?? "";
        const verseText = verse.t ?? verse.text ?? "";
        return num ? `${num} ${verseText}` : verseText;
      }).join(" ");
    }
  }

  if (!normalized.reference){
    normalized.reference = `${titleFromSlug(normalized.book)} ${normalized.chapter}${normalized.verse ? `:${normalized.verse}${normalized.verseEnd && normalized.verseEnd !== normalized.verse ? `–${normalized.verseEnd}` : ""}` : ""}`;
  }

  return normalizeStudyChainItem(normalized);
}

function studyChainContains(items, item){
  return items.some(existing => existing.id === item.id || chainItemKey(existing) === item.id);
}

function renderStudyChain(){
  const root = $("#study-chain");
  if (!root) return;
  root.innerHTML = "";
}

async function addToCurrentStudyChain(location, fallback = {}){
  const item = await buildStudyChainItem(location, fallback);
  if (!item) return false;
  const chain = readCurrentStudyChain().map(normalizeStudyChainItem);
  if (studyChainContains(chain, item)) return false;
  chain.push(item);
  writeCurrentStudyChain(chain);
  return true;
}

function removeFromCurrentStudyChain(id){
  const chain = readCurrentStudyChain().map(normalizeStudyChainItem).filter(item => item.id !== id);
  writeCurrentStudyChain(chain);
}

function moveCurrentStudyChainItem(id, direction){
  const chain = readCurrentStudyChain().map(normalizeStudyChainItem);
  const index = chain.findIndex(item => item.id === id);
  if (index === -1) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= chain.length) return;
  const [item] = chain.splice(index, 1);
  chain.splice(target, 0, item);
  writeCurrentStudyChain(chain);
}

function clearCurrentStudyChain(){
  writeCurrentStudyChain([]);
}

function chainDefaultTitle(items){
  if (!items.length) return "Study Chain";
  const first = items[0];
  return `${first.reference || titleFromSlug(first.book)} Study Chain`;
}

async function saveCurrentStudyChain(){
  const items = readCurrentStudyChain().map(normalizeStudyChainItem);
  if (!items.length) return;
  const title = window.prompt("Title for this study chain", chainDefaultTitle(items));
  if (title === null) return;
  const trimmed = title.trim() || chainDefaultTitle(items);
  const now = new Date().toISOString();
  const saved = readSavedStudyChains();
  saved.unshift({
    id: `chain-${Date.now()}`,
    title: trimmed,
    createdAt: now,
    updatedAt: now,
    items
  });
  writeSavedStudyChains(saved);
  renderSavedLibrary();
  renderProfile();
  renderTodayDashboard();
}

function scriptureRefLabel(ref){
  if (!ref) return "";
  const start = Number(ref.vStart || ref.v || 0);
  const end = Number(ref.vEnd || ref.vStart || ref.v || 0);
  if (!start) return String(ref.label || "").trim();
  const suffix = end && end !== start ? `:${start}\u2013${end}` : `:${start}`;
  return `${titleFromSlug(ref.slug)} ${ref.ch}${suffix}`;
}

async function loadReferenceEntries(){
  if (!referenceEntriesPromise){
    referenceEntriesPromise = getJSON("/data/israelite_dictionary.json")
      .then(data => Array.isArray(data?.entries) ? data.entries : [])
      .catch(() => []);
  }
  return referenceEntriesPromise;
}

async function loadChapterCrossrefs(canon, book, chapter){
  const key = `${canon}:${book}:${chapter}`;
  if (chapterCrossrefCache.has(key)) return chapterCrossrefCache.get(key);
  try{
    const refs = await getJSON(`/data/crossrefs/${canon}/${book}/${chapter}.json`);
    chapterCrossrefCache.set(key, refs && typeof refs === "object" ? refs : null);
  }catch(error){
    chapterCrossrefCache.set(key, null);
  }
  return chapterCrossrefCache.get(key);
}

async function chapterExists(canon, book, chapter){
  const key = `${canon}:${book}:${chapter}`;
  if (chapterAvailabilityCache.has(key)) return chapterAvailabilityCache.get(key);
  const verses = await loadChapterVerses(canon, book, chapter);
  const exists = Array.isArray(verses) && verses.length > 0;
  chapterAvailabilityCache.set(key, exists);
  return exists;
}

async function resolveReaderLocation({ canon, book, chapter } = {}){
  const settings = readSettings();
  const nextCanon = canon || settings.canon;
  const requestedBook = book || settings.book;
  const requestedChapter = String(Number(chapter || settings.chapter) || 1);

  try{
    const books = await loadBookMap(nextCanon);
    const slugs = orderedBookSlugs(books, nextCanon);
    const preferredBook = slugs.includes(requestedBook) ? requestedBook : slugs[0];
    const preferredChapter = String(Math.min(Math.max(Number(requestedChapter) || 1, 1), Number(books[preferredBook]) || 1));

    if (preferredBook && await chapterExists(nextCanon, preferredBook, preferredChapter)){
      return { canon: nextCanon, book: preferredBook, chapter: preferredChapter };
    }

    for (const slug of slugs){
      const total = Number(books[slug]) || 1;
      const candidateChapter = String(Math.min(Math.max(Number(requestedChapter) || 1, 1), total));
      const firstChapter = String(1);
      if (await chapterExists(nextCanon, slug, candidateChapter)){
        return { canon: nextCanon, book: slug, chapter: candidateChapter };
      }
      if (candidateChapter !== firstChapter && await chapterExists(nextCanon, slug, firstChapter)){
        return { canon: nextCanon, book: slug, chapter: firstChapter };
      }
    }

    return { canon: nextCanon, book: preferredBook || slugs[0] || requestedBook || settings.book, chapter: preferredChapter };
  }catch(error){
    return {
      canon: nextCanon,
      book: requestedBook || settings.book,
      chapter: requestedChapter
    };
  }
}

function truncate(value, max = 150){
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function highlightSearchMarkup(text, term){
  const raw = String(text || "");
  const query = String(term || "").trim();
  if (!query) return escapeHTML(raw);
  const source = raw.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return escapeHTML(raw);
  let index = 0;
  const parts = [];
  while (true){
    const found = source.indexOf(needle, index);
    if (found === -1) break;
    parts.push(escapeHTML(raw.slice(index, found)));
    parts.push(`<mark>${escapeHTML(raw.slice(found, found + query.length))}</mark>`);
    index = found + query.length;
  }
  parts.push(escapeHTML(raw.slice(index)));
  return parts.join("");
}

function chapterSearchResults(){
  const term = readerChapterSearchTerm.trim().toLowerCase();
  const verses = Array.isArray(currentReaderVerses) ? currentReaderVerses : [];
  if (!term) return [];
  return verses.filter(verse => {
    const text = String(verse.t ?? verse.text ?? "");
    return text.toLowerCase().includes(term) || String(verse.v || "").includes(term);
  });
}

function clearChapterSearch(){
  readerChapterSearchTerm = "";
  const input = $("#reader-chapter-search");
  if (input) input.value = "";
  renderChapterSearch();
  syncReaderSearchHighlight();
}

function renderChapterSearch(verses = currentReaderVerses){
  const input = $("#reader-chapter-search");
  const status = $("#reader-chapter-search-status");
  const resultsRoot = $("#reader-chapter-search-results");
  if (!input || !status || !resultsRoot) return;

  const term = readerChapterSearchTerm.trim();
  const matches = chapterSearchResults();

  if (!term){
    status.textContent = "Search within the current chapter.";
    resultsRoot.innerHTML = "";
    return;
  }

  if (!matches.length){
    status.textContent = "No matches in this chapter.";
    resultsRoot.innerHTML = `
      <div class="app-reader-search-empty">
        <p>No matches in this chapter.</p>
      </div>
    `;
    return;
  }

  status.textContent = `${matches.length} match${matches.length === 1 ? "" : "es"} in this chapter.`;
  resultsRoot.innerHTML = matches.map(verse => {
    const verseNumber = verse.v ?? "";
    const ref = `${titleFromSlug(currentReaderLocation.book)} ${currentReaderLocation.chapter}:${verseNumber}`;
    const text = verse.t ?? verse.text ?? "";
    const active = String(verseNumber) === String(readerActiveVerse || "");
    return `
      <button type="button" class="app-reader-search-result${active ? " is-active" : ""}" data-chapter-search-verse="${escapeHTML(verseNumber)}" aria-label="${escapeHTML(ref)}">
        <span class="app-reader-search-ref">${escapeHTML(ref)}</span>
        <span class="app-reader-search-text">${highlightSearchMarkup(truncate(text, 180), term)}</span>
      </button>
    `;
  }).join("");
}

function syncReaderSearchHighlight(){
  $$(".reader-verse").forEach(node => {
    const verseNumber = node.dataset.verse || "";
    const text = node.dataset.text || "";
    const target = $(".reader-verse-text", node);
    if (!target) return;
    target.innerHTML = `<span class="reader-verse-num">${escapeHTML(verseNumber)}</span> ${highlightSearchMarkup(text, readerChapterSearchTerm)}`;
  });
}

async function openChapterSearchResult(verse){
  if (!verse) return;
  await setReaderLocation({
    canon: currentReaderLocation.canon,
    book: currentReaderLocation.book,
    chapter: currentReaderLocation.chapter,
    verse
  });
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
    if (link.hasAttribute("data-focus-saved-search")){
      $("#saved-library-search")?.focus();
    }
  });

  window.addEventListener("hashchange", () => setActiveTab(activeTabFromHash(), false));
  setActiveTab(activeTabFromHash(), false);
}

function focusAppTarget(selector, options = {}){
  const target = selector ? $(selector) : null;
  if (!target) return false;
  if (typeof target.focus === "function"){
    target.focus({ preventScroll: Boolean(options.preventScroll) });
  }
  if (options.scroll !== false && typeof target.scrollIntoView === "function"){
    target.scrollIntoView({ behavior: "smooth", block: options.block || "start" });
  }
  return true;
}

function completeOnboarding(source = "finish"){
  writeOnboardingState({
    completed: true,
    completedAt: new Date().toISOString(),
    source
  });
}

function hideOnboarding(restoreFocus = true){
  const overlay = $("#app-onboarding");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove("app-onboarding-open");
  if (restoreFocus && onboardingLastFocus && typeof onboardingLastFocus.focus === "function"){
    onboardingLastFocus.focus({ preventScroll: true });
  }
  onboardingLastFocus = null;
}

function showOnboarding(force = false){
  const state = readOnboardingState();
  if (state.completed && !force) return false;

  const overlay = $("#app-onboarding");
  if (!overlay) return false;

  onboardingLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  overlay.hidden = false;
  document.body.classList.add("app-onboarding-open");
  requestAnimationFrame(() => {
    overlay.querySelector("[data-onboarding-primary]")?.focus({ preventScroll: true });
  });
  return true;
}

async function launchOnboardingAction(tab, selector){
  completeOnboarding("start");
  hideOnboarding(false);
  setActiveTab(tab);
  await new Promise(resolve => setTimeout(resolve, 0));
  focusAppTarget(selector, { preventScroll: false });
}

function wireOnboarding(){
  document.addEventListener("click", async event => {
    const actionButton = event.target.closest("[data-onboarding-action]");
    if (actionButton){
      event.preventDefault();
      const action = actionButton.dataset.onboardingAction;
      if (action === "bible") await launchOnboardingAction("bible", "#reader-canon");
      else if (action === "search") await launchOnboardingAction("bible", "#global-scripture-search-input");
      else if (action === "study-paths") await launchOnboardingAction("study", "#study-path-grid");
      else if (action === "chain") await launchOnboardingAction("bible", "#study-chain");
      else if (action === "library") await launchOnboardingAction("profile", "#saved-library-search");
      return;
    }

    if (event.target.closest("[data-onboarding-dismiss]")){
      event.preventDefault();
      completeOnboarding("skip");
      hideOnboarding(false);
      return;
    }

    if (event.target.closest("[data-onboarding-finish]")){
      event.preventDefault();
      completeOnboarding("finish");
      hideOnboarding(false);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const overlay = $("#app-onboarding");
    if (!overlay || overlay.hidden) return;
    completeOnboarding("escape");
    hideOnboarding(false);
  });
}

async function loadDailyPrecepts(){
  if (!dailyPreceptsPromise){
    dailyPreceptsPromise = getJSON(DATA.precepts)
      .then(data => Array.isArray(data) ? data : [])
      .catch(() => []);
  }
  return dailyPreceptsPromise;
}

function stableDailyIndex(seed, size){
  const total = Array.from(String(seed || "")).reduce((acc, char) => ((acc * 33) + char.charCodeAt(0)) >>> 0, 5381);
  return size > 0 ? total % size : 0;
}

function dailyPromptForToday(){
  if (!DAILY_PROMPTS.length) return "";
  return DAILY_PROMPTS[stableDailyIndex(todayKey(), DAILY_PROMPTS.length)];
}

function dailyPreceptForToday(list){
  if (!Array.isArray(list) || !list.length) return null;
  return list[stableDailyIndex(todayKey(), list.length)] || null;
}

async function resolveScriptureReferenceLocation(reference, preferredCanon = ""){
  const text = String(reference || "").trim();
  if (!text) return null;
  const canonOrder = preferredCanon
    ? [preferredCanon, ...Object.keys(CANON_LABELS).filter(canon => canon !== preferredCanon)]
    : Object.keys(CANON_LABELS);
  const normalizedText = text.toLowerCase();

  for (const canon of canonOrder){
    const books = await loadBookMap(canon);
    const candidates = orderedBookSlugs(books, canon)
      .map(slug => ({ slug, title: titleFromSlug(slug) }))
      .sort((a, b) => b.title.length - a.title.length);

    for (const candidate of candidates){
      const title = candidate.title.toLowerCase();
      const slugText = candidate.slug.toLowerCase().replace(/-/g, " ");
      const titleIndex = normalizedText.indexOf(title);
      const slugIndex = slugText !== title ? normalizedText.indexOf(slugText) : -1;
      const index = titleIndex >= 0 ? titleIndex : slugIndex;
      if (index < 0) continue;

      const after = text.slice(index + (titleIndex >= 0 ? candidate.title.length : slugText.length)).trim();
      const match = after.match(/^(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?/);
      if (!match || !match[1]) continue;

      const chapter = match[1];
      const verse = match[2] || "";
      const verseEnd = match[3] || verse;
      return {
        canon,
        book: candidate.slug,
        chapter,
        verse,
        verseEnd
      };
    }
  }

  return null;
}

function studyPathProgressSummary(){
  const progress = readStudyPathProgress();
  const completedSteps = Object.values(progress).reduce((sum, entry) => sum + (Array.isArray(entry?.completed) ? entry.completed.length : 0), 0);
  const activePaths = STUDY_PATHS.filter(path => {
    const done = studyPathCompleteCount(path);
    return done > 0 && done < (Array.isArray(path.steps) ? path.steps.length : 0);
  }).length;
  const completedPaths = STUDY_PATHS.filter(path => {
    const total = Array.isArray(path.steps) ? path.steps.length : 0;
    return total > 0 && studyPathCompleteCount(path) >= total;
  }).length;
  return { completedSteps, activePaths, completedPaths };
}

function recommendedStudyPath(){
  const partialPaths = STUDY_PATHS
    .map(path => ({
      path,
      done: studyPathCompleteCount(path),
      total: Array.isArray(path.steps) ? path.steps.length : 0,
      updatedAt: studyPathProgress(path.id).updatedAt || ""
    }))
    .filter(item => item.done > 0 && item.done < item.total)
    .sort((a, b) => Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "") || b.done - a.done);

  if (partialPaths.length) return partialPaths[0].path;

  const nextIncomplete = STUDY_PATHS.find(path => studyPathCompleteCount(path) < (Array.isArray(path.steps) ? path.steps.length : 0));
  if (nextIncomplete) return nextIncomplete;

  return STUDY_PATHS.find(path => path.id === "who-are-israelites") || STUDY_PATHS[0] || null;
}

function recentSavedWorkItems(){
  const notes = [...appNoteItems(), ...siteNoteItems()].sort((a, b) => savedItemTime(b) - savedItemTime(a))[0];
  const bookmarks = [...appBookmarkItems(), ...siteBookmarkItems()].sort((a, b) => savedItemTime(b) - savedItemTime(a))[0];
  const highlights = [...appHighlightItems(), ...siteHighlightItems()].sort((a, b) => savedItemTime(b) - savedItemTime(a))[0];
  const chains = readSavedStudyChains().sort((a, b) => Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || ""));

  return [
    notes ? { ...notes, label: "Recent note", summary: notes.note || notes.text || "Saved locally." } : null,
    bookmarks ? { ...bookmarks, label: "Recent bookmark", summary: bookmarks.text || "Saved locally." } : null,
    highlights ? { ...highlights, label: "Recent highlight", summary: highlights.text || "Saved locally." } : null,
    chains[0]
      ? {
          ...chains[0],
          type: "chain",
          label: "Recent study chain",
          ref: studyChainTitle(chains[0]),
          summary: savedStudyChainPreview(chains[0]).join(" · ") || "Saved locally."
        }
      : null
  ].filter(Boolean);
}

function renderDailyPromptCard(){
  const root = $("#daily-prompt-card");
  if (!root) return;
  const prompt = dailyPromptForToday();
  root.innerHTML = `
    <span class="app-label">Daily Prompt</span>
    <h3>Study question for today</h3>
    <p>${escapeHTML(prompt || "What does this passage reveal about covenant identity?")}</p>
    <div class="app-button-row">
      <a class="app-btn primary" href="#ask" data-app-tab-link="ask">Open Ask</a>
    </div>
  `;
}

function renderTodayProgressCard(){
  const root = $("#today-progress-card");
  if (!root) return;
  const marks = readReaderMarks();
  const savedVerses = storageArrayLength(LEGACY_KEYS.bookmarks) + (Array.isArray(marks.bookmarks) ? marks.bookmarks.length : 0);
  const chainCount = readSavedStudyChains().length;
  const pathSummary = studyPathProgressSummary();

  root.innerHTML = `
    <span class="app-label">Progress Summary</span>
    <h3>What’s stored on this device</h3>
    <div class="app-today-stats" aria-label="Daily progress summary">
      <article class="app-today-stat">
        <strong>${escapeHTML(savedVerses)}</strong>
        <span>Saved verses</span>
      </article>
      <article class="app-today-stat">
        <strong>${escapeHTML(chainCount)}</strong>
        <span>Study chains</span>
      </article>
      <article class="app-today-stat">
        <strong>${escapeHTML(pathSummary.completedSteps)}</strong>
        <span>Path steps</span>
      </article>
    </div>
    <p>${escapeHTML(pathSummary.activePaths ? `${pathSummary.activePaths} path${pathSummary.activePaths === 1 ? "" : "s"} in progress, ${pathSummary.completedPaths} complete.` : `${pathSummary.completedPaths} study path${pathSummary.completedPaths === 1 ? "" : "s"} complete.`)}</p>
    <div class="app-button-row">
      <a class="app-btn primary" href="#profile" data-app-tab-link="profile">Open Profile</a>
    </div>
  `;
}

function renderTodayDashboard(){
  renderContinueReading();
  renderCourseHome();
  renderWatchHome();
  renderDailyPrecept();
  renderDailyPromptCard();
  renderTodayProgressCard();
}

function renderConnectivityStatus(){
  const root = $("#offline-status-card");
  const badge = $("#offline-status-badge");
  const title = $("#offline-status-title");
  const text = $("#offline-status-text");
  if (!root || !badge || !title || !text) return;

  const offline = !navigator.onLine;
  badge.textContent = offline ? "Offline" : "Online";
  badge.classList.toggle("is-offline", offline);
  title.textContent = offline ? "Offline mode" : "Online";
  text.textContent = offline
    ? "Offline — saved Scripture and study data remain available where cached. Recently opened chapters may still load if the browser or service worker cached them."
    : "Online — the app can refresh cached chapters, search data, and media when network access is available.";
  root.dataset.state = offline ? "offline" : "online";
}

async function renderDailyPrecept(){
  const root = $("#daily-precept");
  if (!root) return;

  try{
    const list = await loadDailyPrecepts();
    const item = dailyPreceptForToday(list);
    if (!item){
      root.innerHTML = loadingError("No daily precepts are available yet.");
      return;
    }

    const location = await resolveScriptureReferenceLocation(item.reference);
    root.innerHTML = `
      <div class="app-precept">
        <span class="app-label">Daily Precept</span>
        <h3>${escapeHTML(item.reference)}</h3>
        <blockquote>${escapeHTML(item.text)}</blockquote>
        <div class="app-precept-meta">
          <span class="app-pill">${escapeHTML(item.theme)}</span>
          ${location ? `<span class="app-pill">${escapeHTML(CANON_LABELS[location.canon] || "Scripture")}</span>` : ""}
        </div>
        <p>${escapeHTML(item.prompt)}</p>
        <div class="app-button-row">
          <button class="app-btn primary" type="button" data-home-precept-open data-reference="${escapeHTML(item.reference)}" data-canon="${escapeHTML(location?.canon || "")}" data-book="${escapeHTML(location?.book || "")}" data-chapter="${escapeHTML(location?.chapter || "")}" data-verse="${escapeHTML(location?.verse || "")}">Open in Reader</button>
          ${location ? `<button class="app-btn" type="button" data-home-precept-chain data-reference="${escapeHTML(item.reference)}" data-canon="${escapeHTML(location.canon)}" data-book="${escapeHTML(location.book)}" data-chapter="${escapeHTML(location.chapter)}" data-verse="${escapeHTML(location.verse || "")}" data-verse-end="${escapeHTML(location.verseEnd || location.verse || "")}" data-text="${escapeHTML(item.text)}">Add to Chain</button>` : ""}
          <button class="app-btn" type="button" data-explain-precept data-reference="${escapeHTML(item.reference)}" data-question="${escapeHTML(item.prompt)}">Explain this</button>
        </div>
      </div>
    `;
  }catch(error){
    root.innerHTML = loadingError(navigator.onLine ? "Today's precept could not be loaded." : "Offline: today's precept is unavailable until the precept data has been cached.");
  }
}

function renderCourseHome(){
  const root = $("#continue-course-card");
  if (!root) return;
  const path = recommendedStudyPath();
  const total = Array.isArray(path?.steps) ? path.steps.length : 0;
  const done = path ? studyPathCompleteCount(path) : 0;
  const nextStep = path ? studyPathNextIncompleteStep(path) : null;
  const progress = total ? Math.round((done / total) * 100) : 0;

  root.innerHTML = `
    <span class="app-label">Recommended Path</span>
    <h3>${escapeHTML(path?.title || "Study Paths")}</h3>
    <p>${escapeHTML(path ? `${path.description} ${nextStep ? `Next step: ${nextStep.title}.` : ""}` : "Guided study paths will appear here.")}</p>
    <div class="course-progress" aria-label="${done} of ${total} steps complete"><span style="width:${progress}%"></span></div>
    <div class="app-button-row">
      <button class="app-btn primary" type="button" data-home-study-path="${escapeHTML(path?.id || "")}" ${path ? "" : "disabled"}>${done >= total && total ? "Review Study Path" : done ? "Continue Study Path" : "Start Study Path"}</button>
      <a class="app-btn" href="#study" data-app-tab-link="study">Open Study</a>
    </div>
  `;
}

function renderWatchHome(){
  const root = $("#latest-lesson-card");
  if (!root) return;
  const items = recentSavedWorkItems();
  root.innerHTML = `
    <span class="app-label">Recent Saved Work</span>
    <h3>${escapeHTML(items.length ? "Latest notes, bookmarks, highlights, and chains" : "No saved work yet")}</h3>
    <div class="app-today-recent-list">
      ${items.length
        ? items.map(item => `
          <article class="app-today-recent-item">
            <h4>${escapeHTML(item.ref || item.title || "Saved item")}</h4>
            <p>${escapeHTML(truncate(item.summary || item.text || item.note || "", 120))}</p>
          </article>
        `).join("")
        : `<p class="app-today-empty">Save a verse, highlight, note, or chain to surface it here.</p>`}
    </div>
    <div class="app-button-row">
      <a class="app-btn primary" href="#profile" data-app-tab-link="profile">Open Saved Library</a>
    </div>
  `;
}

function renderContinueReading(){
  const root = $("#continue-reading-card");
  if (!root) return;

  const lastRead = readLastRead();
  const settings = readSettings();
  const reference = lastRead.exists
    ? `${titleFromSlug(lastRead.book)} ${lastRead.chapter}${lastRead.verse ? `:${lastRead.verse}` : ""}`
    : `${titleFromSlug(settings.book)} ${settings.chapter}`;
  root.innerHTML = `
    <span class="app-label">Continue Reading</span>
    <h3>${escapeHTML(lastRead.exists ? reference : "Start Reading")}</h3>
    <p>${escapeHTML(lastRead.exists ? `${CANON_LABELS[lastRead.canon] || "Scripture"} reader saved on this device.` : `Open ${titleFromSlug(settings.book)} ${settings.chapter} as the default reader chapter.`)}</p>
    <div class="app-button-row">
      <button class="app-btn primary" type="button" data-home-continue-reading>${lastRead.exists ? "Continue Reading" : "Start Reading"}</button>
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

function wireStudyPaths(){
  $("#study")?.addEventListener("click", async event => {
    const openButton = event.target.closest("[data-study-path-open]");
    if (openButton){
      await openStudyPath(openButton.dataset.studyPathOpen, { continueNext: true });
      return;
    }

    const continueButton = event.target.closest("[data-study-path-continue]");
    if (continueButton){
      await openStudyPath(continueButton.dataset.studyPathContinue, { continueNext: true });
      return;
    }

    const openStepButton = event.target.closest("[data-study-path-step-open]");
    if (openStepButton){
      const [pathId, stepId] = String(openStepButton.dataset.studyPathStepOpen || "").split(":");
      const path = STUDY_PATHS.find(item => item.id === pathId);
      const step = path?.steps?.find(item => item.id === stepId);
      const ref = studyPathStepRefs(step || {})[0];
      if (ref) await openStudyPathScripture(ref);
      return;
    }

    const stepRefButton = event.target.closest("[data-study-path-step-ref]");
    if (stepRefButton){
      const [, , refIndex] = String(stepRefButton.dataset.studyPathStepRef || "").split(":");
      const [pathId, stepId] = String(stepRefButton.dataset.studyPathStepRef || "").split(":");
      const path = STUDY_PATHS.find(item => item.id === pathId);
      const step = path?.steps?.find(item => item.id === stepId);
      const ref = studyPathStepRefs(step || [])[Number(refIndex || 0)];
      if (ref) await openStudyPathScripture(ref);
      return;
    }

    const addChainButton = event.target.closest("[data-study-path-step-add-chain]");
    if (addChainButton){
      const [pathId, stepId] = String(addChainButton.dataset.studyPathStepAddChain || "").split(":");
      const path = STUDY_PATHS.find(item => item.id === pathId);
      const step = path?.steps?.find(item => item.id === stepId);
      if (path && step){
        const added = await addStudyPathReferencesToChain(path, step);
        setStudyPathStatus(added ? "Study path references added to the current chain." : "Those references are already in the current chain.", added ? "success" : "info");
      }
      return;
    }

    const completeButton = event.target.closest("[data-study-path-step-complete]");
    if (completeButton){
      const [pathId, stepId] = String(completeButton.dataset.studyPathStepComplete || "").split(":");
      const path = STUDY_PATHS.find(item => item.id === pathId);
      const step = path?.steps?.find(item => item.id === stepId);
      if (!path || !step) return;
      const complete = !isStudyPathStepComplete(pathId, stepId);
      setStudyPathStepComplete(pathId, stepId, complete);
      currentStudyPathId = pathId;
      currentStudyPathStepId = (complete ? studyPathNextIncompleteStep(path)?.id : stepId) || stepId;
      renderStudyPaths();
      setStudyPathStatus(complete ? "Step marked complete." : "Step marked incomplete.", complete ? "success" : "info");
      return;
    }
  });
}

function wireHome(){
  $("#home")?.addEventListener("click", async event => {
    const continueReadingButton = event.target.closest("[data-home-continue-reading]");
    if (continueReadingButton){
      event.preventDefault();
      const lastRead = readLastRead();
      const settings = readSettings();
      const location = lastRead.exists
        ? { canon: lastRead.canon, book: lastRead.book, chapter: lastRead.chapter, verse: lastRead.verse || "" }
        : { canon: settings.canon, book: settings.book, chapter: settings.chapter, verse: "" };
      setActiveTab("bible");
      await setReaderLocation(location);
      $("#reader-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const preceptOpenButton = event.target.closest("[data-home-precept-open]");
    if (preceptOpenButton){
      event.preventDefault();
      const canon = String(preceptOpenButton.dataset.canon || "");
      const book = String(preceptOpenButton.dataset.book || "");
      const chapter = String(preceptOpenButton.dataset.chapter || "");
      const verse = String(preceptOpenButton.dataset.verse || "");
      if (canon && book && chapter){
        setActiveTab("bible");
        await setReaderLocation({ canon, book, chapter, verse });
        $("#reader-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }else{
        const settings = readSettings();
        setActiveTab("bible");
        await setReaderLocation({ canon: settings.canon, book: settings.book, chapter: settings.chapter });
      }
      return;
    }

    const preceptChainButton = event.target.closest("[data-home-precept-chain]");
    if (preceptChainButton){
      event.preventDefault();
      const location = {
        canon: String(preceptChainButton.dataset.canon || ""),
        book: String(preceptChainButton.dataset.book || ""),
        chapter: String(preceptChainButton.dataset.chapter || ""),
        verse: String(preceptChainButton.dataset.verse || ""),
        verseEnd: String(preceptChainButton.dataset.verseEnd || preceptChainButton.dataset.verse || "")
      };
      if (!location.canon || !location.book || !location.chapter) return;
      const added = await addToCurrentStudyChain(location, {
        reference: String(preceptChainButton.dataset.reference || ""),
        text: String(preceptChainButton.dataset.text || ""),
        source: "daily-precept",
        sourceLabel: "Daily Precept"
      });
      setChainStatus("current", added ? "Daily precept added to the current chain." : "That precept is already in the current chain.", added ? "success" : "info");
      return;
    }

    const studyPathButton = event.target.closest("[data-home-study-path]");
    if (studyPathButton){
      event.preventDefault();
      const pathId = String(studyPathButton.dataset.homeStudyPath || "");
      const path = STUDY_PATHS.find(item => item.id === pathId);
      if (path){
        setActiveTab("study");
        await openStudyPath(path.id, { continueNext: true });
      }
    }
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
  renderTodayDashboard();
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
  try{
    const map = await getJSON(`/data/${canon}/books.json`);
    bookMaps[canon] = map && typeof map === "object" ? map : {};
  }catch(error){
    bookMaps[canon] = {};
  }
  return bookMaps[canon];
}

async function populateBooks(canon, selectedBook){
  const bookSelect = $("#reader-book");
  const chapterSelect = $("#reader-chapter");
  if (!bookSelect || !chapterSelect) return "";

  const books = await loadBookMap(canon);
  const slugs = orderedBookSlugs(books, canon);
  const preferred = slugs.includes(selectedBook) ? selectedBook : slugs[0];
  if (!slugs.length){
    const fallbackBook = selectedBook || readSettings().book || "";
    bookSelect.innerHTML = fallbackBook ? `<option value="${escapeHTML(fallbackBook)}" selected>${escapeHTML(titleFromSlug(fallbackBook))}</option>` : "";
    chapterSelect.innerHTML = buildChapterOptions(1, readSettings().chapter);
    return fallbackBook;
  }
  bookSelect.innerHTML = slugs.map(slug => `<option value="${escapeHTML(slug)}"${slug === preferred ? " selected" : ""}>${escapeHTML(titleFromSlug(slug))}</option>`).join("");
  chapterSelect.innerHTML = buildChapterOptions(books[preferred], readSettings().chapter);
  return preferred;
}

async function setReaderLocation({ canon, book, chapter, verse, fontSize, spacing } = {}){
  const settings = readSettings();
  const resolved = await resolveReaderLocation({ canon, book, chapter });
  const nextCanon = resolved.canon;
  const nextBook = resolved.book;
  const nextChapter = resolved.chapter;
  readerFocusVerse = verse ? String(verse) : "";
  const nextLocation = { canon: nextCanon, book: nextBook, chapter: nextChapter };
  const changedChapter = !sameReaderLocation(currentReaderLocation, nextLocation);
  currentReaderLocation = nextLocation;
  if (changedChapter && !verse) readerActiveVerse = "";
  if (changedChapter){
    readerChapterSearchTerm = "";
    const chapterSearchInput = $("#reader-chapter-search");
    if (chapterSearchInput) chapterSearchInput.value = "";
  }

  const canonSelect = $("#reader-canon");
  const bookSelect = $("#reader-book");
  const chapterSelect = $("#reader-chapter");
  const fontSelect = $("#reader-font-size");
  const spacingSelect = $("#reader-spacing");

  if (canonSelect) canonSelect.value = nextCanon;
  await populateBooks(nextCanon, nextBook);
  if (bookSelect) bookSelect.value = nextBook;
  const total = Number((await loadBookMap(nextCanon))[nextBook]) || 1;
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

function renderReaderChrome({ canon, book, chapter }){
  const title = `${titleFromSlug(book)} ${chapter}`;
  const canonLabel = CANON_LABELS[canon] || titleFromSlug(canon);
  const category = bookCategory(canon, book);
  const context = CANON_CONTEXT[canon];
  const landingUrl = canonLandingUrl(canon);
  const bookUrl = bookPageUrl(canon, book);
  const chapterUrl = chapterPageUrl(canon, book, chapter);

  const summary = $("#reader-current-summary");
  if (summary){
    summary.innerHTML = `
      <span class="app-label">Continue Reading</span>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(canonLabel)} · ${escapeHTML(category)}</p>
    `;
  }

  const contextRoot = $("#reader-context");
  if (contextRoot){
    contextRoot.innerHTML = `
      <h3>${escapeHTML(titleFromSlug(book))}</h3>
      <p>${escapeHTML(context?.framing || "Read with Scripture, logic, history, and covenant identity in view.")}</p>
    `;
  }

  const actions = $("#reader-study-actions");
  if (actions){
    actions.innerHTML = `
      <div class="app-reader-action-grid">
        <button class="app-btn" type="button" data-app-tab-link="profile">Open saved library</button>
        <button class="app-btn" type="button" data-app-tab-link="profile" data-focus-saved-search>Search saved notes</button>
        <a class="app-btn" href="/biblia.html">Open Biblia hub</a>
        <a class="app-btn" href="${escapeHTML(landingUrl)}">Open ${escapeHTML(canonLabel)}</a>
        ${bookUrl ? `<a class="app-btn" href="${escapeHTML(bookUrl)}">Open book page</a>` : ""}
        <a class="app-btn" href="${escapeHTML(chapterUrl)}">Open full chapter</a>
      </div>
    `;
  }
}

async function renderRelatedReferences(location, verses, requestId){
  const root = $("#reader-related");
  if (!root) return;
  root.innerHTML = "";
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
  const persistedLastRead = readLastRead();
  const sameSavedLocation = sameReaderLocation(persistedLastRead, { canon, book, chapter });
  const selectedVerse = readerFocusVerse || readerActiveVerse || (sameSavedLocation ? persistedLastRead.verse : "");
  readerActiveVerse = selectedVerse ? String(selectedVerse) : "";
  currentReaderLocation = { canon, book, chapter };

  writeSettings({ canon, book, chapter, fontSize, spacing });
  syncProfileSettings();
  renderReaderChrome({ canon, book, chapter });
  output.innerHTML = `<div class="app-loading">Loading ${escapeHTML(titleFromSlug(book))} ${escapeHTML(chapter)}...</div>`;

  try{
    const chapterData = await getJSON(`/data/${canon}/${book}/${chapter}.json`);
    const verses = Array.isArray(chapterData)
      ? chapterData
      : Array.isArray(chapterData?.verses)
        ? chapterData.verses
        : [];
    if (requestId !== readerRequestId) return;
    if (!Array.isArray(verses) || !verses.length){
      output.innerHTML = `${loadingError(navigator.onLine ? "This chapter is not available in the local reader yet." : "Offline: this chapter is not cached on this device yet.")}<p><a class="app-btn primary" href="/biblia.html">Open Biblia</a></p>`;
      return;
    }

  const marks = readReaderMarks();
  const chain = readCurrentStudyChain().map(normalizeStudyChainItem);
  const focusVerse = readerFocusVerse || readerActiveVerse || "";
  readerFocusVerse = "";
  readerActiveVerse = focusVerse ? String(focusVerse) : "";
  currentReaderVerses = verses;
  writeLastRead({ canon, book, chapter, verse: readerActiveVerse || "" });
  await updateReaderNav();

    output.innerHTML = `
      <div class="reader-head">
        <div>
          <span class="app-label">${escapeHTML(CANON_LABELS[canon] || "Scripture")}</span>
          <h3>${escapeHTML(titleFromSlug(book))} ${escapeHTML(chapter)}</h3>
        </div>
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
          const isActive = String(verseNumber) === String(readerActiveVerse || "");
          const chainItem = {
            canon,
            book,
            chapter,
            verse: String(verseNumber || ""),
            verseEnd: String(verseNumber || "")
          };
          const inChain = studyChainContains(chain, normalizeStudyChainItem({
            ...chainItem,
            reference: `${titleFromSlug(book)} ${chapter}:${verseNumber}`,
            source: "reader",
            sourceLabel: "Active verse"
          }));
          return `
            <section class="reader-verse${highlighted ? " is-highlighted" : ""}${isActive ? " is-active" : ""}" tabindex="0" role="button" aria-label="${escapeHTML(ref)}" data-key="${escapeHTML(key)}" data-ref="${escapeHTML(ref)}" data-text="${escapeHTML(text)}" data-verse="${escapeHTML(verseNumber)}">
              <p class="reader-verse-text"><span class="reader-verse-num">${escapeHTML(verseNumber)}</span> ${highlightSearchMarkup(text, readerChapterSearchTerm)}</p>
              ${note ? `<p class="reader-note"><strong>Note:</strong> ${escapeHTML(note.note)}</p>` : ""}
              <div class="reader-actions" aria-label="${escapeHTML(ref)} actions">
                <button type="button" data-reader-action="share">Share</button>
                <button type="button" data-reader-action="bookmark">${bookmarked ? "Bookmarked" : "Bookmark"}</button>
                <button type="button" data-reader-action="highlight" aria-pressed="${highlighted ? "true" : "false"}" data-active="${highlighted ? "true" : "false"}">${highlighted ? "Highlighted" : "Highlight"}</button>
                <button type="button" data-reader-action="note">${note ? "Edit note" : "Note"}</button>
                <button type="button" data-reader-action="chain">${inChain ? "In Chain" : "Add to Chain"}</button>
              </div>
            </section>
          `;
        }).join("")}
      </div>
    `;

    updateReaderVerseSelection();
    renderChapterSearch(verses);
    syncReaderSearchHighlight();
    await renderRelatedReferences({ canon, book, chapter, verse: readerActiveVerse }, verses, requestId);
    renderStudyChain();

    if (readerActiveVerse){
      const verseNode = $(`[data-key="${escapeSelector(markKey(canon, book, chapter, readerActiveVerse))}"]`);
      verseNode?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }catch(error){
    if (requestId !== readerRequestId) return;
    await updateReaderNav();
    currentReaderVerses = [];
    renderChapterSearch([]);
    syncReaderSearchHighlight();
    const related = $("#reader-related");
    if (related){
      related.innerHTML = "";
    }
    renderStudyChain();
    output.innerHTML = `${loadingError(navigator.onLine ? "The local reader could not load this chapter." : "Offline: this chapter is not cached on this device yet.")}<p><a class="app-btn primary" href="/biblia.html">Open Biblia</a></p>`;
  }
}

async function syncReaderControls(){
  const settings = readSettings();
  const lastRead = readLastRead();
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

  const restoreVerse = lastRead.exists && sameReaderLocation(lastRead, settings) ? lastRead.verse : "";
  await setReaderLocation({ ...settings, verse: restoreVerse });
}

function wireReader(){
  $("#reader-canon")?.addEventListener("change", async event => {
    await setReaderLocation({ canon: event.target.value, chapter: "1" });
  });

  $("#reader-book")?.addEventListener("change", async event => {
    await setReaderLocation({ canon: $("#reader-canon").value, book: event.target.value, chapter: "1" });
  });

  $("#reader-chapter")?.addEventListener("change", async event => {
    await setReaderLocation({ canon: $("#reader-canon").value, book: $("#reader-book").value, chapter: event.target.value });
  });

  ["#reader-font-size", "#reader-spacing"].forEach(selector => {
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

  const chapterSearchForm = $("#reader-chapter-search-form");
  const chapterSearchInput = $("#reader-chapter-search");
  const chapterSearchClear = $("#reader-chapter-search-clear");
  const chapterSearchResultsRoot = $("#reader-chapter-search-results");

  chapterSearchInput?.addEventListener("input", () => {
    readerChapterSearchTerm = chapterSearchInput.value || "";
    renderChapterSearch();
    syncReaderSearchHighlight();
  });

  chapterSearchForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const results = chapterSearchResults();
    if (!results.length) return;
    const verse = String(results[0].v || "");
    await openChapterSearchResult(verse);
  });

  chapterSearchInput?.addEventListener("keydown", async event => {
    if (event.key !== "Enter") return;
    const results = chapterSearchResults();
    if (!results.length) return;
    event.preventDefault();
    await openChapterSearchResult(String(results[0].v || ""));
  });

  chapterSearchClear?.addEventListener("click", () => {
    clearChapterSearch();
    chapterSearchInput?.focus();
  });

  chapterSearchResultsRoot?.addEventListener("click", async event => {
    const button = event.target.closest("[data-chapter-search-verse]");
    if (!button) return;
    event.preventDefault();
    await openChapterSearchResult(button.dataset.chapterSearchVerse || "");
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-related-open='bible']");
    if (!button) return;
    event.preventDefault();
    const canon = button.dataset.relatedCanon;
    const book = button.dataset.relatedBook;
    const chapter = button.dataset.relatedChapter;
    const verse = button.dataset.relatedVerse;
    if (!canon || !book || !chapter) return;
    setActiveTab("bible");
    await setReaderLocation({ canon, book, chapter, verse });
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-related-add-chain]");
    if (!button) return;
    event.preventDefault();
    await addToCurrentStudyChain({
      canon: button.dataset.relatedCanon,
      book: button.dataset.relatedBook,
      chapter: button.dataset.relatedChapter,
      verse: button.dataset.relatedVerse,
      verseEnd: button.dataset.relatedVerseEnd || button.dataset.relatedVerse
    }, {
      reference: button.dataset.relatedRef || "",
      text: button.dataset.relatedText || "",
      source: "related",
      sourceLabel: "Related precept"
    });
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
    if (button && verse) {
      const key = verse.dataset.key;
      const ref = verse.dataset.ref;
      const text = verse.dataset.text;
      const verseNumber = verse.dataset.verse;
      const marks = readReaderMarks();

      if (button.dataset.readerAction === "share"){
        const result = await shareReaderVerse(ref, text, currentReaderLocation, verseNumber);
        button.textContent = result === "shared" ? "Shared" : result === "copied" ? "Copied" : "Share";
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
        button.setAttribute("aria-pressed", String(!exists));
        button.dataset.active = String(!exists);
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

      if (button.dataset.readerAction === "chain"){
        await addToCurrentStudyChain({
          canon: currentReaderLocation.canon,
          book: currentReaderLocation.book,
          chapter: currentReaderLocation.chapter,
          verse: verse.dataset.verse || "",
          verseEnd: verse.dataset.verse || ""
        }, {
          reference: ref,
          text,
          source: "reader",
          sourceLabel: "Active verse"
        });
        await renderReader();
        return;
      }

      writeReaderMarks(marks);
      return;
    }
  });

  $("#reader-output")?.addEventListener("keydown", event => {
    const verse = event.target.closest(".reader-verse");
    if (!verse || event.target.closest("[data-reader-action]")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setReaderActiveVerse(verse.dataset.verse || "", { persist: true, updateRelated: true });
  });

  $("#reader-output")?.addEventListener("click", event => {
    const verse = event.target.closest(".reader-verse");
    const button = event.target.closest("[data-reader-action]");
    if (!verse || button) return;
    setReaderActiveVerse(verse.dataset.verse || "", { persist: true, updateRelated: true });
  });

  $("#study-chain")?.addEventListener("click", async event => {
    const addActive = event.target.closest("[data-chain-add-active]");
    if (addActive){
      event.preventDefault();
      if (!readerActiveVerse || !currentReaderLocation.canon) return;
      await addToCurrentStudyChain({
        ...currentReaderLocation,
        verse: readerActiveVerse,
        verseEnd: readerActiveVerse
      }, {
        reference: `${titleFromSlug(currentReaderLocation.book)} ${currentReaderLocation.chapter}:${readerActiveVerse}`,
        text: "",
        source: "reader",
        sourceLabel: "Active verse"
      });
      return;
    }

    const copyButton = event.target.closest("[data-chain-copy]");
    if (copyButton){
      event.preventDefault();
      await exportStudyChain({
        title: "",
        items: readCurrentStudyChain().map(normalizeStudyChainItem)
      }, { target: "current" });
      return;
    }

    const shareButton = event.target.closest("[data-chain-share]");
    if (shareButton){
      event.preventDefault();
      await exportStudyChain({
        title: "",
        items: readCurrentStudyChain().map(normalizeStudyChainItem)
      }, { share: true, target: "current" });
      return;
    }

    const saveButton = event.target.closest("[data-chain-save]");
    if (saveButton){
      event.preventDefault();
      await saveCurrentStudyChain();
      return;
    }

    const clearButton = event.target.closest("[data-chain-clear]");
    if (clearButton){
      event.preventDefault();
      clearCurrentStudyChain();
      return;
    }

    const openButton = event.target.closest("[data-chain-open]");
    if (openButton){
      event.preventDefault();
      const item = readCurrentStudyChain().map(normalizeStudyChainItem).find(entry => entry.id === openButton.dataset.chainOpen);
      if (!item) return;
      setActiveTab("bible");
      await setReaderLocation({
        canon: item.canon,
        book: item.book,
        chapter: item.chapter,
        verse: item.verse
      });
      return;
    }

    const removeButton = event.target.closest("[data-chain-remove]");
    if (removeButton){
      event.preventDefault();
      removeFromCurrentStudyChain(removeButton.dataset.chainRemove);
      return;
    }

    const upButton = event.target.closest("[data-chain-up]");
    if (upButton){
      event.preventDefault();
      moveCurrentStudyChainItem(upButton.dataset.chainUp, "up");
      return;
    }

    const downButton = event.target.closest("[data-chain-down]");
    if (downButton){
      event.preventDefault();
      moveCurrentStudyChainItem(downButton.dataset.chainDown, "down");
    }
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

  $("#profile")?.addEventListener("click", event => {
    if (!event.target.closest("[data-restart-onboarding]")) return;
    event.preventDefault();
    showOnboarding(true);
  });
}

function savedItemCard(item, typeLabel){
  const date = formatSavedDate(item.date);
  const canOpen = item.canon && item.book && item.chapter;
  return `
    <article class="app-library-item">
      <div>
        <div class="app-library-meta">
          <span class="app-pill">${escapeHTML(typeLabel)}</span>
          ${item.canon ? `<span class="app-pill">${escapeHTML(CANON_LABELS[item.canon] || titleFromSlug(item.canon))}</span>` : ""}
          ${date ? `<time datetime="${escapeHTML(item.date)}">${escapeHTML(date)}</time>` : ""}
        </div>
        <h4>${escapeHTML(item.ref || "Saved item")}</h4>
        ${item.text ? `<p>${escapeHTML(truncate(item.text, 220))}</p>` : ""}
        ${item.note && item.note !== item.text ? `<p class="app-library-note">${escapeHTML(truncate(item.note, 220))}</p>` : ""}
      </div>
      <div class="app-library-actions">
        ${canOpen ? `<button type="button" data-open-saved="${escapeHTML(item.canon)}:${escapeHTML(item.book)}:${escapeHTML(item.chapter)}:${escapeHTML(item.verse || "")}">Open in Bible</button>` : item.url ? `<a class="app-btn" href="${escapeHTML(item.url)}">Open</a>` : ""}
        ${item.source === "app" && item.type === "note" ? `<button type="button" data-edit-saved-note="${escapeHTML(item.key)}">Edit</button>` : ""}
        <button type="button" data-remove-saved="${escapeHTML(item.type)}:${escapeHTML(item.source)}:${escapeHTML(item.key)}">Remove</button>
      </div>
    </article>
  `;
}

function emptyLibraryBlock(title, text){
  return `
    <div class="app-library-empty">
      <h4>${escapeHTML(title)}</h4>
      <p>${escapeHTML(text)}</p>
    </div>
  `;
}

function renderSavedVerses(items, hasSavedData){
  const root = $("#profile-saved-verses");
  if (!root) return;
  const appBookmarks = items.filter(item => item.type === "bookmark");

  root.innerHTML = `
    <div class="app-library-head">
      <span class="app-label">Saved Library</span>
      <h3 id="saved-verses-title">Saved Verses</h3>
      <p>Bookmarked verses from the app reader are saved locally on this device.</p>
    </div>
    <div class="app-library-list">
      ${appBookmarks.length
        ? appBookmarks.map(item => savedItemCard(item, "Bookmark")).join("")
        : emptyLibraryBlock(hasSavedData ? "No saved items match this search." : "No saved verses yet.", hasSavedData ? "Try clearing search or filters." : "Open the Bible tab and bookmark a verse.")}
    </div>
  `;
}

function renderSavedHighlights(items, hasSavedData){
  const root = $("#profile-highlights");
  if (!root) return;
  const highlights = items.filter(item => item.type === "highlight");
  root.innerHTML = `
    <div class="app-library-head">
      <span class="app-label">Highlights</span>
      <h3 id="saved-highlights-title">Highlighted Verses</h3>
      <p>Highlights from the app reader and existing Scripture reader are shown together.</p>
    </div>
    <div class="app-library-list">
      ${highlights.length
        ? highlights.map(item => savedItemCard(item, item.categoryLabel || "Highlight")).join("")
        : emptyLibraryBlock(hasSavedData ? "No saved items match this search." : "No highlights yet.", hasSavedData ? "Try clearing search or filters." : "Highlight a verse in the Bible tab or Scripture reader.")}
    </div>
  `;
}

function renderSavedNotes(items, hasSavedData){
  const root = $("#profile-notes");
  if (!root) return;
  const notes = items.filter(item => item.type === "note");
  root.innerHTML = `
    <div class="app-library-head">
      <span class="app-label">Notes</span>
      <h3 id="saved-notes-title">Study Notes</h3>
      <p>Verse notes and existing No Private Interpretation entries are stored locally.</p>
    </div>
    <div class="app-library-list">
      ${notes.length
        ? notes.map(item => savedItemCard(item, item.source === "site" ? "Exposition" : "Note")).join("")
        : emptyLibraryBlock(hasSavedData ? "No saved items match this search." : "No notes yet.", hasSavedData ? "Try clearing search or filters." : "Add a note to a verse in the Bible tab.")}
    </div>
  `;
}

function renderReadingHistory(items, hasSavedData){
  const root = $("#profile-reading-history");
  if (!root) return;
  const history = items.filter(item => item.type === "history");

  root.innerHTML = `
    <div class="app-library-head">
      <span class="app-label">Reading</span>
      <h3 id="reading-history-title">Reading History</h3>
      <p>Continue in the app reader or reopen recent Biblia chapters saved on this device.</p>
    </div>
    <div class="app-library-list">
      ${history.length
        ? history.map(item => savedItemCard(item, item.source === "app" ? "Continue" : "Recent")).join("")
        : emptyLibraryBlock(hasSavedData ? "No saved items match this search." : "No local reading history yet.", hasSavedData ? "Try clearing search or filters." : "Open a chapter in the Bible tab to start.")}
    </div>
  `;
}

function renderSavedStudyChains(items, hasSavedData){
  const root = $("#profile-study-chains");
  if (!root) return;
  const chains = items.filter(item => item.type === "chain");
  const totalChains = readSavedStudyChains().length;

  root.innerHTML = `
    <div class="app-library-head">
      <span class="app-label">Study Chains</span>
      <h3 id="saved-study-chains-title">Saved Study Chains</h3>
      <p>${escapeHTML(totalChains)} chain${totalChains === 1 ? "" : "s"} saved on this device. Open one to continue reading where the chain started.</p>
    </div>
    <p class="app-study-chain-status" id="saved-study-chains-status" aria-live="polite"></p>
    <div class="app-library-list">
      ${chains.length
        ? chains.map(savedStudyChainCard).join("")
        : emptyLibraryBlock(hasSavedData ? "No saved items match this search." : "No saved study chains yet.", hasSavedData ? "Try clearing search or filters." : "Build one from the Bible reader.")}
    </div>
  `;
}

function savedStudyChainCard(chain){
  const chainId = chain.id || chain.key || "";
  const preview = savedStudyChainPreview(chain);
  const count = Array.isArray(chain.items) ? chain.items.length : 0;
  const created = formatSavedDate(chain.createdAt);
  const updated = formatSavedDate(chain.updatedAt);
  const canonLabel = chain.canon && chain.canon !== "mixed" ? (CANON_LABELS[chain.canon] || titleFromSlug(chain.canon)) : "Mixed canon";

  return `
    <article class="app-library-item app-chain-card">
      <div>
        <div class="app-library-meta">
          <span class="app-pill">Study Chain</span>
          <span class="app-pill">${escapeHTML(canonLabel)}</span>
          <span class="app-pill">${escapeHTML(String(count))} item${count === 1 ? "" : "s"}</span>
          ${updated ? `<time datetime="${escapeHTML(chain.updatedAt)}">Updated ${escapeHTML(updated)}</time>` : ""}
          ${created && created !== updated ? `<time datetime="${escapeHTML(chain.createdAt)}">Created ${escapeHTML(created)}</time>` : ""}
        </div>
        <h4>${escapeHTML(studyChainTitle(chain))}</h4>
        <p>${escapeHTML(preview.length ? preview.join(" · ") : "No verse preview available yet.")}</p>
      </div>
      <div class="app-library-actions">
        <button type="button" data-open-chain="${escapeHTML(chainId)}">Continue</button>
        <button type="button" data-rename-chain="${escapeHTML(chainId)}">Rename</button>
        <button type="button" data-delete-chain="${escapeHTML(chainId)}">Delete</button>
        <button type="button" data-copy-chain="${escapeHTML(chainId)}">Copy</button>
        ${navigator.share ? `<button type="button" data-share-chain="${escapeHTML(chainId)}">Share</button>` : ""}
      </div>
    </article>
  `;
}

async function openSavedStudyChain(chainId){
  const chain = readSavedStudyChains().find(item => item.id === chainId);
  if (!chain || !Array.isArray(chain.items) || !chain.items.length) return;
  const items = chain.items.map(normalizeStudyChainItem).filter(Boolean);
  if (!items.length) return;
  writeCurrentStudyChain(items);
  setActiveTab("bible");
  const first = items[0];
  await setReaderLocation({
    canon: first.canon,
    book: first.book,
    chapter: first.chapter,
    verse: first.verse || ""
  });
  $("#study-chain")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renameSavedStudyChain(chainId){
  const chains = readSavedStudyChains();
  const index = chains.findIndex(item => item.id === chainId);
  if (index === -1) return;
  const existing = chains[index];
  const title = window.prompt("Rename this study chain", existing.title || "Study Chain");
  if (title === null) return;
  const trimmed = title.trim();
  chains[index] = {
    ...existing,
    title: trimmed || existing.title || "Study Chain",
    updatedAt: new Date().toISOString()
  };
  writeSavedStudyChains(chains);
  renderSavedLibrary();
  renderProfile();
  renderTodayDashboard();
}

function deleteSavedStudyChain(chainId){
  const chains = readSavedStudyChains();
  const index = chains.findIndex(item => item.id === chainId);
  if (index === -1) return;
  const existing = chains[index];
  const confirmed = window.confirm(`Delete "${existing.title || "Study Chain"}"? This removes the saved chain but keeps the current in-progress chain.`);
  if (!confirmed) return;
  chains.splice(index, 1);
  writeSavedStudyChains(chains);
  renderSavedLibrary();
  renderProfile();
  renderTodayDashboard();
}

function renderStudyProgress(){
  const root = $("#profile-study-progress");
  if (!root) return;
  const completed = completedLessonMap();
  const completedLessons = Object.keys(completed).filter(key => completed[key]).length;
  const practiceCount = completedPracticeIds().length;

  root.innerHTML = `
    <div class="app-library-head">
      <h3 id="study-progress-title">Study Progress</h3>
      <p>${escapeHTML(completedLessons)} completed lessons and ${escapeHTML(practiceCount)} completed practice items today.</p>
    </div>
    <div class="app-course-progress-list">
      ${courseData.length ? courseData.map(course => {
        const lessons = Array.isArray(course.lessons) ? course.lessons : [];
        const done = lessons.filter(lesson => completed[lessonKey(course.id, lesson.id)]).length;
        const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
        return `
          <article class="app-course-progress-row">
            <div>
              <h4>${escapeHTML(course.title)}</h4>
            </div>
            <div class="course-progress" aria-label="${percent}% complete"><span style="width:${percent}%"></span></div>
          </article>
        `;
      }).join("") : emptyLibraryBlock("Courses are loading.", "Study progress will appear after course data loads.")}
    </div>
  `;
}

function renderSavedLibrary(){
  const { allItems, filtered } = filteredSavedLibrary();
  const hasSavedData = allItems.length > 0;
  const count = $("#saved-library-count");
  if (count){
    count.textContent = hasSavedData
      ? `Showing ${filtered.length} of ${allItems.length} saved items`
      : "No saved items on this device yet.";
  }

  renderSavedVerses(filtered, hasSavedData);
  renderSavedHighlights(filtered, hasSavedData);
  renderSavedNotes(filtered, hasSavedData);
  renderReadingHistory(filtered, hasSavedData);
  renderSavedStudyChains(filtered, hasSavedData);
  renderStudyProgress();
}

function wireSavedLibrary(){
  const form = $("#saved-library-filter-form");
  if (form){
    const syncFilters = () => {
      writeSavedLibraryFilters({
        query: form.elements.query?.value || "",
        type: form.elements.type?.value || "all",
        canon: form.elements.canon?.value || "all",
        source: form.elements.source?.value || "all",
        sort: form.elements.sort?.value || "newest"
      });
      renderSavedLibrary();
    };

    form.addEventListener("input", event => {
      if (event.target.matches("input, select")) syncFilters();
    });

    form.addEventListener("change", syncFilters);
  }

  $("#saved-library-clear")?.addEventListener("click", () => {
    writeSavedLibraryFilters(defaultSavedLibraryFilters());
    applySavedLibraryControls();
    renderSavedLibrary();
    $("#saved-library-search")?.focus();
  });

  $("#profile")?.addEventListener("click", async event => {
    const openChainButton = event.target.closest("[data-open-chain]");
    if (openChainButton){
      await openSavedStudyChain(openChainButton.dataset.openChain);
      return;
    }

    const renameChainButton = event.target.closest("[data-rename-chain]");
    if (renameChainButton){
      renameSavedStudyChain(renameChainButton.dataset.renameChain);
      return;
    }

    const deleteChainButton = event.target.closest("[data-delete-chain]");
    if (deleteChainButton){
      deleteSavedStudyChain(deleteChainButton.dataset.deleteChain);
      return;
    }

    const copyChainButton = event.target.closest("[data-copy-chain]");
    if (copyChainButton){
      const chain = readSavedStudyChains().find(item => item.id === copyChainButton.dataset.copyChain);
      if (chain) await exportStudyChain(chain, { target: "saved" });
      return;
    }

    const shareChainButton = event.target.closest("[data-share-chain]");
    if (shareChainButton){
      const chain = readSavedStudyChains().find(item => item.id === shareChainButton.dataset.shareChain);
      if (chain) await exportStudyChain(chain, { share: true, target: "saved" });
      return;
    }

    const openButton = event.target.closest("[data-open-saved]");
    if (openButton){
      const [canon, book, chapter, verse] = openButton.dataset.openSaved.split(":");
      if (canon && book && chapter){
        setActiveTab("bible");
        await setReaderLocation({ canon, book, chapter });
        const target = verse ? $(`[data-key="${escapeSelector(markKey(canon, book, chapter, verse))}"]`) : $("#reader-output");
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const removeButton = event.target.closest("[data-remove-saved]");
    if (removeButton){
      const [type, source, ...keyParts] = removeButton.dataset.removeSaved.split(":");
      removeSavedItem(type, source, keyParts.join(":"));
      return;
    }

    const editButton = event.target.closest("[data-edit-saved-note]");
    if (editButton){
      const key = editButton.dataset.editSavedNote;
      const existing = getNote(readReaderMarks(), key);
      const note = window.prompt("Edit verse note", existing?.note || "");
      if (note !== null) updateAppNote(key, note);
    }
  });
}

function renderProfile(){
  const marks = readReaderMarks();
  const practiceCount = completedPracticeIds().length;
  const chainCount = readSavedStudyChains().length;
  const siteHistoryCount = storageArrayLength(LEGACY_KEYS.reading);
  const readingCount = siteHistoryCount + (readLastRead().exists ? 1 : 0);
  const setText = (selector, value) => {
    const node = $(selector);
    if (node) node.textContent = String(value);
  };

  setText("#profile-reading-count", readingCount);
  setText("#profile-bookmark-count", storageArrayLength(LEGACY_KEYS.bookmarks) + marks.bookmarks.length);
  setText("#profile-highlight-count", storageArrayLength(LEGACY_KEYS.highlights) + marks.highlights.length);
  setText("#profile-note-count", storageArrayLength(LEGACY_KEYS.notes) + marks.notes.length);
  setText("#profile-practice-count", practiceCount);
  setText("#profile-chain-count", chainCount);
  syncProfileSettings();
  renderConnectivityStatus();
  renderSavedLibrary();
}

function openScriptureResultInReader(result){
  if (!result) return Promise.resolve(false);
  const canon = String(result.canon || "").toLowerCase();
  const book = String(result.slug || result.book || "").toLowerCase();
  const chapter = String(result.chapter || "1");
  const verse = String(result.verse || "");
  if (!canon || !book || !chapter) return Promise.resolve(false);
  setActiveTab("bible");
  return setReaderLocation({ canon, book, chapter, verse });
}

window.semiticJewApp = {
  setActiveTab,
  setReaderLocation,
  addToCurrentStudyChain,
  copyTextToClipboard,
  openScriptureResult: openScriptureResultInReader
};

async function init(){
  wireTabs();
  wireOnboarding();
  wireHome();
  wireAsk();
  wireCourses();
  wireStudyPaths();
  wireReader();
  wireProfileSettings();
  wireSavedLibrary();
  applySavedLibraryControls();
  window.addEventListener("online", renderConnectivityStatus);
  window.addEventListener("offline", renderConnectivityStatus);
  renderConnectivityStatus();
  renderTodayDashboard();
  await Promise.all([
    renderStudyPaths(),
    renderCourses(),
    renderWatch(),
    renderPractice(),
    syncReaderControls()
  ]);
  renderProfile();
  if (!readOnboardingState().completed){
    showOnboarding();
  }
}

if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
