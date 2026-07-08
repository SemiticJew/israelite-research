/* Semitic Jew App: Study Trails with Local Progress */
(function(){
  const STORAGE_KEY = "sj_study_trail_progress_v1";

  function escapeHTML(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(value){
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function readProgress(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    }catch(e){
      return {};
    }
  }

  function writeProgress(data){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data || {}));
  }

  function isComplete(progress, trailId, itemId){
    return !!progress?.[trailId]?.[itemId];
  }

  function toggleComplete(trailId, itemId){
    const progress = readProgress();

    if(!progress[trailId]) progress[trailId] = {};
    progress[trailId][itemId] = !progress[trailId][itemId];

    writeProgress(progress);
    renderStudyTrails();
  }

  function completionCount(progress, trailId, total){
    const items = progress[trailId] || {};
    const done = Object.values(items).filter(Boolean).length;
    return {
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0
    };
  }

  async function renderStudyTrails(){
    const root = document.getElementById("app-study-trails");
    if(!root) return;

    try{
      const res = await fetch("/data/study-trails.json", {cache:"no-cache"});
      if(!res.ok) throw new Error("Could not load study trails.");

      const trails = await res.json();
      if(!Array.isArray(trails) || !trails.length) return;

      const progress = readProgress();

      root.innerHTML = `
        <section class="app-trails-shell" aria-label="Study trails">
          <div class="app-trails-head">
            <span class="label">Study Trails</span>
            <h2>Follow a topic through Scripture and research.</h2>
            <p>These guided trails help you move through Scripture, articles, tools, and study paths without starting from scratch. Progress is saved locally on this device.</p>
          </div>

          <div class="app-trails-grid">
            ${trails.map(trail => {
              const trailId = slugify(trail.title);
              const items = Array.isArray(trail.items) ? trail.items : [];
              const stats = completionCount(progress, trailId, items.length);

              return `
                <article class="app-trail-card">
                  <span class="trail-kicker">${escapeHTML(trail.kicker)}</span>
                  <h3>${escapeHTML(trail.title)}</h3>
                  <p>${escapeHTML(trail.description)}</p>

                  <div class="trail-progress" aria-label="${escapeHTML(trail.title)} progress">
                    <div class="trail-progress-row">
                      <span>${stats.done}/${stats.total} complete</span>
                      <strong>${stats.percent}%</strong>
                    </div>
                    <div class="trail-progress-bar">
                      <span style="width:${stats.percent}%"></span>
                    </div>
                  </div>

                  <div class="trail-links">
                    ${items.map((item, index) => {
                      const itemId = slugify(item.label || String(index));
                      const checked = isComplete(progress, trailId, itemId);

                      return `
                        <div class="trail-step ${checked ? "complete" : ""}">
                          <button type="button" data-trail="${escapeHTML(trailId)}" data-step="${escapeHTML(itemId)}" aria-pressed="${checked ? "true" : "false"}">
                            ${checked ? "✓" : ""}
                          </button>
                          <a href="${escapeHTML(item.url)}">${escapeHTML(item.label)}</a>
                        </div>
                      `;
                    }).join("")}
                  </div>

                  <a class="trail-main" href="${escapeHTML(trail.url)}">Open Trail →</a>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;

      root.querySelectorAll("[data-trail][data-step]").forEach(btn => {
        btn.addEventListener("click", function(){
          toggleComplete(btn.getAttribute("data-trail"), btn.getAttribute("data-step"));
        });
      });

    }catch(error){
      root.innerHTML = "";
      console.warn("Study trails failed to load:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", renderStudyTrails);

  window.SemJStudyTrails = {
    read: readProgress,
    write: writeProgress,
    refresh: renderStudyTrails
  };
})();
