(function(){
  function escapeHTML(value){
    return String(value || "").replace(/[&<>"']/g, function(ch){
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch];
    });
  }

  function truncate(value, max){
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trim() + "…";
  }

  function formatDate(value){
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      year:"numeric",
      month:"long",
      day:"numeric"
    });
  }

  function card(video, label){
    const title = escapeHTML(video.title || "Semitic Jew Teaching");
    const desc = escapeHTML(truncate(video.description || "A Semitic Jew teaching focused on Scripture, logic, and truth.", 130));
    const url = escapeHTML(video.url || "#");
    const thumb = escapeHTML(video.thumbnail || "");
    const date = escapeHTML(formatDate(video.published));

    return `
      <a class="media-card" href="${url}" target="_blank" rel="noopener">
        <div class="media-thumb">
          <img src="${thumb}" alt="${title}" loading="lazy">
          <span class="media-play" aria-hidden="true">▶</span>
        </div>
        <div class="media-card-body">
          <div class="media-label">${escapeHTML(label)}</div>
          <h3>${title}</h3>
          ${date ? `<time>${date}</time>` : ""}
          ${desc ? `<p>${desc}</p>` : ""}
        </div>
      </a>
    `;
  }

  async function fillGrid(gridId, url, label, limit){
    const grid = document.getElementById(gridId);
    if (!grid) return;

    try{
      const response = await fetch(url, { cache:"no-store" });
      if (!response.ok) throw new Error("Feed unavailable.");

      const data = await response.json();
      const videos = Array.isArray(data.videos) ? data.videos.slice(0, limit) : [];

      if (!videos.length){
        grid.innerHTML = '<p class="media-empty">Videos will appear here soon.</p>';
        return;
      }

      grid.innerHTML = videos.map(video => card(video, label)).join("");
    }catch(error){
      grid.innerHTML = '<p class="media-empty">Videos are unavailable right now.</p>';
    }
  }

  function init(){
    fillGrid("media-podcast-grid", "/data/youtube-podcast-videos.json", "Podcast", 6);
    fillGrid("media-latest-grid", "/data/youtube-videos.json", "Video", 8);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
