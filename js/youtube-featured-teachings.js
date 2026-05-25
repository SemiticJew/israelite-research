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

  async function loadFeaturedTeachings(){
    const grid = document.querySelector(".featured-video-block .teaching-grid");
    if (!grid) return;

    try{
      const response = await fetch("/data/youtube-podcast-videos.json", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const videos = Array.isArray(data.videos) ? data.videos : [];
      const featured = videos.slice(0, 3);

      if (!featured.length) return;

      grid.innerHTML = featured.map(function(video){
        const title = escapeHTML(video.title || "Semitic Jew Teaching");
        const desc = escapeHTML(truncate(video.description || "A Semitic Jew podcast teaching focused on Scripture, logic, and truth.", 120));
        const thumb = escapeHTML(video.thumbnail || "");
        const url = escapeHTML(video.url || "#");

        return `
          <a class="teaching-card teaching-card--minimal" href="${url}" target="_blank" rel="noopener">
            <div class="teaching-thumb">
              <img src="${thumb}" alt="${title}" loading="lazy">
            </div>
            <div class="teaching-content">
              <div class="teaching-title">${title}</div>
              <div class="teaching-desc">${desc}</div>
            </div>
          </a>
        `;
      }).join("");
    }catch(error){
      return;
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", loadFeaturedTeachings);
  } else {
    loadFeaturedTeachings();
  }
})();
