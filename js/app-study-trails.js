/* Semitic Jew App: Study Trails */
(function(){
  function escapeHTML(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function renderStudyTrails(){
    const root = document.getElementById("app-study-trails");
    if(!root) return;

    try{
      const res = await fetch("/data/study-trails.json", {cache:"no-cache"});
      if(!res.ok) throw new Error("Could not load study trails.");

      const trails = await res.json();
      if(!Array.isArray(trails) || !trails.length) return;

      root.innerHTML = `
        <section class="app-trails-shell" aria-label="Study trails">
          <div class="app-trails-head">
            <span class="label">Study Trails</span>
            <h2>Follow a topic through Scripture and research.</h2>
            <p>These guided trails help you move through Scripture, articles, tools, and study paths without starting from scratch.</p>
          </div>

          <div class="app-trails-grid">
            ${trails.map(trail => `
              <article class="app-trail-card">
                <span class="trail-kicker">${escapeHTML(trail.kicker)}</span>
                <h3>${escapeHTML(trail.title)}</h3>
                <p>${escapeHTML(trail.description)}</p>

                <div class="trail-links">
                  ${(trail.items || []).map(item => `
                    <a href="${escapeHTML(item.url)}">${escapeHTML(item.label)}</a>
                  `).join("")}
                </div>

                <a class="trail-main" href="${escapeHTML(trail.url)}">Open Trail →</a>
              </article>
            `).join("")}
          </div>
        </section>
      `;
    }catch(error){
      root.innerHTML = "";
      console.warn("Study trails failed to load:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", renderStudyTrails);
})();
