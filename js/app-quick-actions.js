/* Semitic Jew App: Quick Actions */
(function(){
  const KEYS = {
    history: "sj_reading_history_v1",
    bookmarks: "sj_scripture_bookmarks_v1",
    highlights: "sj_verse_highlights_v1",
    expositions: "sj_no_private_interpretation_v1",
    trails: "sj_study_trail_progress_v1"
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

  function completedTrailSteps(){
    const progress = readObject(KEYS.trails);
    return Object.values(progress).reduce((sum, trail) => {
      return sum + Object.values(trail || {}).filter(Boolean).length;
    }, 0);
  }

  function render(){
    const root = document.getElementById("app-quick-actions");
    if(!root) return;

    const history = readArray(KEYS.history);
    const bookmarks = readArray(KEYS.bookmarks);
    const highlights = readArray(KEYS.highlights);
    const expositions = readArray(KEYS.expositions);
    const trailSteps = completedTrailSteps();

    const latest = history[0];

    root.innerHTML = `
      <section class="app-quick-shell" aria-label="Quick actions">
        <div class="app-quick-head">
          <span class="label">Quick Actions</span>
          <h2>Jump back into study.</h2>
          <p>Open the main tools, resume reading, or return to saved study work.</p>
        </div>

        <div class="app-quick-grid">
          <a class="app-quick-card primary" href="/biblia.html">
            <strong>Open Biblia</strong>
            <span>Scripture reader and study hub</span>
          </a>

          <a class="app-quick-card" href="${latest ? latest.url : "/biblia.html"}">
            <strong>${latest ? "Continue Reading" : "Start Reading"}</strong>
            <span>${latest ? latest.title : "Open your first chapter"}</span>
          </a>

          <a class="app-quick-card" href="#app-bookmarks">
            <strong>Saved Scripture</strong>
            <span>${bookmarks.length} saved chapter${bookmarks.length === 1 ? "" : "s"}</span>
          </a>

          <a class="app-quick-card" href="#app-highlights">
            <strong>Highlighted Verses</strong>
            <span>${highlights.length} highlighted verse${highlights.length === 1 ? "" : "s"}</span>
          </a>

          <a class="app-quick-card" href="#app-expositions">
            <strong>No Private Interpretation</strong>
            <span>${expositions.length} saved exposition${expositions.length === 1 ? "" : "s"}</span>
          </a>

          <a class="app-quick-card" href="#app-study-trails">
            <strong>Study Trails</strong>
            <span>${trailSteps} completed step${trailSteps === 1 ? "" : "s"}</span>
          </a>
        </div>
      </section>
    `;
  }

  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("storage", render);
})();
