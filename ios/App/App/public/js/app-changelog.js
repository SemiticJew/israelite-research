/* Semitic Jew App: Version / Changelog */
(function(){
  function escapeHTML(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function render(){
    const root = document.getElementById("app-changelog");
    if(!root) return;

    try{
      const res = await fetch("/data/app-changelog.json", {cache:"no-cache"});
      if(!res.ok) throw new Error("Could not load changelog.");

      const entries = await res.json();
      if(!Array.isArray(entries) || !entries.length) return;

      const latest = entries[0];

      root.innerHTML = `
        <section class="app-changelog-shell" aria-label="App version and changelog">
          <div class="app-changelog-head">
            <span class="label">App Version</span>
            <h2>Version ${escapeHTML(latest.version)} — ${escapeHTML(latest.title)}</h2>
            <p>Recent updates to the Semitic Jew app experience.</p>
          </div>

          <div class="app-changelog-list">
            ${entries.map(entry => `
              <article class="app-changelog-card">
                <div class="app-changelog-meta">
                  <strong>v${escapeHTML(entry.version)}</strong>
                  <span>${escapeHTML(entry.date)}</span>
                </div>
                <h3>${escapeHTML(entry.title)}</h3>
                <ul>
                  ${(entry.items || []).map(item => `<li>${escapeHTML(item)}</li>`).join("")}
                </ul>
              </article>
            `).join("")}
          </div>
        </section>
      `;
    }catch(error){
      console.warn("App changelog failed to load:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", render);
})();
