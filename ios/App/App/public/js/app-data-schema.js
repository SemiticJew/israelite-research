/* Semitic Jew App: versioned local data schema helper */
(function(){
  const SCHEMA_VERSION = "1.1.0";

  const KEYS = {
    readingHistory: "sj_reading_history_v1",
    bookmarks: "sj_scripture_bookmarks_v1",
    highlights: "sj_verse_highlights_v1",
    expositions: "sj_no_private_interpretation_v1",
    studyTrailProgress: "sj_study_trail_progress_v1",
    readerPosition: "sj_reader_position_v1",
    readerPreferences: "sj_reader_preferences_v1",
    offlineChapters: "sj_offline_chapters_v1"
  };

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      return JSON.parse(raw);
    }catch(e){
      return fallback;
    }
  }

  function exportData(){
    return {
      schema: "semitic-jew-local-app-data",
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      keys: Object.fromEntries(
        Object.entries(KEYS).map(([name, key]) => [name, {
          key,
          value: readJSON(key, key.includes("v1") ? [] : null)
        }])
      )
    };
  }

  function importData(payload){
    if(!payload || payload.schema !== "semitic-jew-local-app-data" || !payload.keys){
      throw new Error("Invalid Semitic Jew app data file.");
    }

    Object.entries(payload.keys).forEach(([name, entry]) => {
      if(!KEYS[name] || !entry || !("value" in entry)) return;
      localStorage.setItem(KEYS[name], JSON.stringify(entry.value));
    });

    return true;
  }

  window.SemJDataSchema = {
    version: SCHEMA_VERSION,
    keys: KEYS,
    exportData,
    importData
  };
})();
