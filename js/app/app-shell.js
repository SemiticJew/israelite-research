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
let referenceEntriesPromise = null;
const chapterCrossrefCache = new Map();
const chapterAvailabilityCache = new Map();
const chapterVerseCache = new Map();

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
  const badge = escapeHTML(item.sourceLabel || relatedSourceLabel(item));
  const title = escapeHTML(item.title || item.label || "Related reference");
  const snippet = item.snippet ? `<p class="app-related-snippet">${escapeHTML(item.snippet)}</p>` : "";
  const source = item.verseLabel || item.verse
    ? `${escapeHTML(CANON_LABELS[item.canon] || titleFromSlug(item.canon))} · ${escapeHTML(item.verseLabel || `${titleFromSlug(item.slug)} ${item.chapter}`)}`
    : `${escapeHTML(CANON_LABELS[item.canon] || "Reference")}`;

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
      <div class="app-related-meta">
        <span class="app-pill">${badge}</span>
        <span class="app-related-source">${source}</span>
      </div>
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

  const chain = readCurrentStudyChain().map(normalizeStudyChainItem);
  const activeVerse = readerActiveVerse ? String(readerActiveVerse) : "";
  const activeLocation = currentReaderLocation?.canon && currentReaderLocation?.book && currentReaderLocation?.chapter
    ? {
        canon: currentReaderLocation.canon,
        book: currentReaderLocation.book,
        chapter: currentReaderLocation.chapter,
        verse: activeVerse,
        verseEnd: activeVerse
      }
    : null;

  const hasActiveVerse = Boolean(activeLocation?.canon && activeLocation?.book && activeLocation?.chapter && activeLocation.verse);
  const activeItem = hasActiveVerse ? normalizeStudyChainItem({
    ...activeLocation,
    reference: `${titleFromSlug(activeLocation.book)} ${activeLocation.chapter}:${activeLocation.verse}`,
    source: "reader",
    sourceLabel: "Active verse"
  }) : null;
  const activeInChain = activeItem ? studyChainContains(chain, activeItem) : false;

  root.innerHTML = `
    <div class="app-study-chain-head">
      <div>
        <span class="app-label">Study Chain</span>
        <h3 id="study-chain-title">Current Study Chain</h3>
        <p>${chain.length ? `${chain.length} verse${chain.length === 1 ? "" : "s"} selected in order.` : "Select verses or related precepts to build a study chain."}</p>
      </div>
      <div class="app-study-chain-actions">
        <button class="app-btn" type="button" data-chain-add-active${hasActiveVerse && !activeInChain ? "" : " disabled"}>${activeInChain ? "In Chain" : "Add active verse"}</button>
        <button class="app-btn" type="button" data-chain-save${chain.length ? "" : " disabled"}>Save Chain</button>
        <button class="app-btn" type="button" data-chain-clear${chain.length ? "" : " disabled"}>Clear Chain</button>
        <button class="app-btn" type="button" data-chain-copy${chain.length ? "" : " disabled"}>Copy Chain</button>
        ${navigator.share ? `<button class="app-btn" type="button" data-chain-share${chain.length ? "" : " disabled"}>Share</button>` : ""}
      </div>
    </div>
    <p class="app-study-chain-status" id="study-chain-status" aria-live="polite"></p>
    <div class="app-study-chain-list" aria-label="Current study chain verses">
      ${chain.length
        ? chain.map((item, index) => `
          <article class="app-study-chain-item">
            <div class="app-study-chain-copy">
              <div class="app-study-chain-meta">
                <span class="app-pill">${escapeHTML(item.sourceLabel || "Verse")}</span>
                <span class="app-study-chain-ref">${escapeHTML(item.reference)}</span>
              </div>
              ${item.text ? `<p>${escapeHTML(item.text)}</p>` : `<p class="app-study-chain-empty-line">No stored text available.</p>`}
            </div>
            <div class="app-study-chain-item-actions">
              <button class="app-btn" type="button" data-chain-open="${escapeHTML(item.id)}">Open</button>
              <button class="app-btn" type="button" data-chain-up="${escapeHTML(item.id)}"${index === 0 ? " disabled" : ""}>Up</button>
              <button class="app-btn" type="button" data-chain-down="${escapeHTML(item.id)}"${index === chain.length - 1 ? " disabled" : ""}>Down</button>
              <button class="app-btn" type="button" data-chain-remove="${escapeHTML(item.id)}">Remove</button>
            </div>
          </article>
        `).join("")
        : `<div class="app-study-chain-empty">Select verses or related precepts to build a study chain.</div>`}
    </div>
  `;
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
  const books = await loadBookMap(nextCanon);
  const slugs = orderedBookSlugs(books, nextCanon);
  const preferredBook = slugs.includes(book || settings.book) ? (book || settings.book) : slugs[0];
  const requestedChapter = String(Number(chapter || settings.chapter) || 1);
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

  return { canon: nextCanon, book: preferredBook || slugs[0] || settings.book, chapter: preferredChapter };
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
  const reference = lastRead.exists
    ? `${titleFromSlug(lastRead.book)} ${lastRead.chapter}${lastRead.verse ? `:${lastRead.verse}` : ""}`
    : "Open the reader";
  root.innerHTML = `
    <span class="app-label">Continue Reading</span>
    <h3>${escapeHTML(reference)}</h3>
    <p>${escapeHTML(lastRead.exists ? `${CANON_LABELS[lastRead.canon] || "Scripture"} reader saved on this device.` : "Start in the first available Tanakh chapter on this device.")}</p>
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
      <span class="app-label">Israelite Study Context</span>
      <h3>${escapeHTML(titleFromSlug(book))}</h3>
      <div class="app-reader-context-meta">
        <span class="app-pill">${escapeHTML(canonLabel)}</span>
        <span class="app-pill">${escapeHTML(category)}</span>
      </div>
      <p>${escapeHTML(context?.framing || "Read with Scripture, logic, history, and covenant identity in view.")}</p>
    `;
  }

  const actions = $("#reader-study-actions");
  if (actions){
    actions.innerHTML = `
      <span class="app-label">Study Actions</span>
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

  root.innerHTML = `<div class="app-loading">Loading related references...</div>`;

  try{
    const [entries, crossrefs] = await Promise.all([
      loadReferenceEntries(),
      loadChapterCrossrefs(location.canon, location.book, location.chapter)
    ]);

    if (requestId !== readerRequestId) return;

    const related = buildRelatedReferences(location, entries, crossrefs);
    const scopeLabel = readerScopeLabel(location);
    const chapterLabel = location.verse ? `Verse scope active: ${scopeLabel}` : `Chapter scope: ${scopeLabel}`;
    if (!related.length){
      root.innerHTML = `
        <div class="app-related-empty">
          <span class="app-label">Related Precepts</span>
          <h3 id="reader-related-title">Related Precepts for ${escapeHTML(scopeLabel)}</h3>
          <p>${escapeHTML(chapterLabel)}. Open Biblia, the encyclopedia, or the chapter itself to keep studying from the full reference library.</p>
        </div>
      `;
      return;
    }

    root.innerHTML = `
      <div class="app-section-head compact app-related-head">
        <span class="app-label">Related Precepts</span>
        <h3 id="reader-related-title">Related Precepts for ${escapeHTML(scopeLabel)}</h3>
        <p>${escapeHTML(chapterLabel)}. ${escapeHTML(related.length)} study links matched from the dictionary and cross-reference index.</p>
      </div>
      <div class="app-related-list">
        ${related.map(renderRelatedCard).join("")}
      </div>
    `;
  }catch(error){
    if (requestId !== readerRequestId) return;
    root.innerHTML = `
      <div class="app-related-empty">
        <span class="app-label">Related Precepts</span>
        <h3 id="reader-related-title">Related Precepts for ${escapeHTML(readerScopeLabel(location))}</h3>
        <p>The related reference index could not be loaded. Open Biblia or the encyclopedia for more study.</p>
      </div>
    `;
  }
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
      output.innerHTML = `${loadingError("This chapter is not available in the local reader yet.")}<p><a class="app-btn primary" href="/biblia.html">Open Biblia</a></p>`;
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
                <button type="button" data-reader-action="copy">Copy</button>
                <button type="button" data-reader-action="bookmark">${bookmarked ? "Bookmarked" : "Bookmark"}</button>
                <button type="button" data-reader-action="highlight">${highlighted ? "Highlighted" : "Highlight"}</button>
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
      related.innerHTML = `
        <div class="app-related-empty">
          <span class="app-label">Related Precepts</span>
          <h3 id="reader-related-title">Reference data unavailable</h3>
          <p>The related reference index could not be loaded for this chapter.</p>
        </div>
      `;
    }
    renderStudyChain();
    output.innerHTML = `${loadingError("The local reader could not load this chapter.")}<p><a class="app-btn primary" href="/biblia.html">Open Biblia</a></p>`;
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
}

function renderStudyProgress(){
  const root = $("#profile-study-progress");
  if (!root) return;
  const completed = completedLessonMap();
  const completedLessons = Object.keys(completed).filter(key => completed[key]).length;
  const practiceCount = completedPracticeIds().length;

  root.innerHTML = `
    <div class="app-library-head">
      <span class="app-label">Progress</span>
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
              <p>${done}/${lessons.length} lessons complete</p>
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
  renderSavedLibrary();
}

async function init(){
  wireTabs();
  wireAsk();
  wireCourses();
  wireReader();
  wireProfileSettings();
  wireSavedLibrary();
  applySavedLibraryControls();
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
