/* Semitic Jew App: Local storage status */
(function(){
  const KEYS = {
    history: "sj_reading_history_v1",
    bookmarks: "sj_scripture_bookmarks_v1",
    highlights: "sj_verse_highlights_v1",
    expositions: "sj_no_private_interpretation_v1",
    trailProgress: "sj_study_trail_progress_v1"
  };

  function readArray(key){
    try{
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function readObject(key){
    try{
      const data = JSON.parse(localStorage.getItem(key) || "{}");
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    }catch(e){
      return {};
    }
  }

  function trailSteps(){
    const progress = readObject(KEYS.trailProgress);
    return Object.values(progress).reduce((sum, trail) => {
      return sum + Object.values(trail || {}).filter(Boolean).length;
    }, 0);
  }

  function storageAvailable(){
    try{
      const test = "__sj_storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    }catch(e){
      return false;
    }
  }

  function render(){
    const root = document.getElementById("app-status");
    if(!root) return;

    const available = storageAvailable();

    const total =
      readArray(KEYS.history).length +
      readArray(KEYS.bookmarks).length +
      readArray(KEYS.highlights).length +
      readArray(KEYS.expositions).length +
      trailSteps();

    root.innerHTML = `
      <section class="app-status-shell" aria-label="App storage status">
        <div class="app-status-copy">
          <span class="label">App Status</span>
          <h2>${available ? "Local study data is active." : "Local storage is unavailable."}</h2>
          <p>
            ${available
              ? "Your reading history, bookmarks, highlights, study trail progress, and No Private Interpretation notes are saved locally on this device."
              : "Your browser is blocking local storage, so app study tools may not save between visits."}
          </p>
        </div>

        <div class="app-status-stat">
          <strong>${total}</strong>
          <span>saved local item${total === 1 ? "" : "s"}</span>
        </div>
      </section>
    `;
  }

  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("storage", render);

  window.SemJAppStatus = {
    refresh: render
  };
})();
