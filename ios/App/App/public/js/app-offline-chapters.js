/* Semitic Jew App: saved offline chapters dashboard */
(function(){
  const STORAGE_KEY = "sj_offline_chapters_v1";

  function readStore(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function writeStore(items){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }catch(e){
      console.warn("Could not update offline chapters:", e);
    }
  }

  function escapeHTML(value){
    return String(value || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function render(){
    const root = document.getElementById("app-offline-chapters");
    if(!root) return;

    const items = readStore();

    if(!items.length){
      root.innerHTML = `
        <section class="app-offline-shell empty" id="offline-chapters" aria-label="Saved offline chapters">
          <div class="app-offline-head">
            <span class="label">Offline Chapters</span>
            <h2>No saved chapters yet.</h2>
            <p>Open a reader chapter and choose “Save Offline” to store it locally on this device.</p>
          </div>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="app-offline-shell" id="offline-chapters" aria-label="Saved offline chapters">
        <div class="app-offline-head">
          <span class="label">Offline Chapters</span>
          <h2>Saved for offline study</h2>
          <p>${items.length} chapter${items.length === 1 ? "" : "s"} saved locally on this device.</p>
        </div>

        <div class="app-offline-grid">
          ${items.map(item => `
            <article class="app-offline-card" data-offline-key="${escapeHTML(item.key)}">
              <span>${escapeHTML(item.canonTitle || item.canon)}</span>
              <h3>${escapeHTML(item.reference)}</h3>
              <p>${escapeHTML((item.verses || []).length)} verse${(item.verses || []).length === 1 ? "" : "s"} saved.</p>
              <div class="app-offline-actions">
                <a href="${escapeHTML(item.url)}">Open</a>
                <button type="button" data-remove-offline="${escapeHTML(item.key)}">Remove</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  document.addEventListener("DOMContentLoaded", render);

  document.addEventListener("click", function(event){
    const button = event.target.closest("[data-remove-offline]");
    if(!button) return;

    const key = button.dataset.removeOffline;
    writeStore(readStore().filter(item => item.key !== key));
    render();
  });

  window.SemJOfflineChapters = {
    refresh: render
  };
})();
