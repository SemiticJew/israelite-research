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

  function isPodcastVideo(video){
    const title = String(video.title || "").toLowerCase();
    const desc = String(video.description || "").toLowerCase();

    return (
      title.includes("podcast") ||
      title.includes("episode") ||
      /\bep\s*\d+\b/i.test(title) ||
      /\bep\d+\b/i.test(title) ||
      desc.includes("podcast")
    );
  }

  async function loadFeaturedTeachings(){
    const grid = document.querySelector(".featured-video-block .teaching-grid");
    if (!grid) return;

    try{
      const response = await fetch("/data/youtube-podcast-videos.json", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const videos = Array.isArray(data.videos) ? data.videos : [];

      const podcastVideos = videos.slice(0, 3);

      if (!podcastVideos.length) return;

      grid.innerHTML = podcastVideos.map(function(video){
        const title = escapeHTML(video.title);
        const desc = escapeHTML(truncate(video.description, 155));
        const embed = escapeHTML(video.embed);

        return `
          <div class="teaching-card">
            <iframe
              src="${embed}"
              title="${title}"
              allowfullscreen
              loading="lazy">
            </iframe>

            <div class="teaching-content">
              <div class="teaching-title">${title}</div>
              <div class="teaching-desc">${desc || "A Semitic Jew podcast teaching focused on Scripture, logic, and truth."}</div>
            </div>
          </div>
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
