(function(){
  function formatDate(value){
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

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
    const text = String(value || "").trim();
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trim() + "…";
  }

  async function loadLatestVideos(){
    const root = document.getElementById("youtube-latest-grid");
    if (!root) return;

    try{
      const response = await fetch("/data/youtube-videos.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load YouTube videos.");
      const data = await response.json();
      const videos = Array.isArray(data.videos) ? data.videos.slice(0, 4) : [];

      if (!videos.length){
        root.innerHTML = '<p class="muted">Latest videos will appear here soon.</p>';
        return;
      }

      root.innerHTML = videos.map(function(video){
        const title = escapeHTML(video.title);
        const date = escapeHTML(formatDate(video.published));
        const desc = escapeHTML(truncate(video.description, 135));
        const thumb = escapeHTML(video.thumbnail);
        const url = escapeHTML(video.url);

        return `
          <article class="youtube-card">
            <a href="${url}" target="_blank" rel="noopener">
              <div class="youtube-thumb">
                <img src="${thumb}" alt="${title}" loading="lazy">
                <span class="youtube-play" aria-hidden="true">▶</span>
              </div>
              <div class="youtube-card-body">
                <div class="youtube-label">Video</div>
                <h3>${title}</h3>
                ${date ? `<time>${date}</time>` : ""}
                ${desc ? `<p>${desc}</p>` : ""}
              </div>
            </a>
          </article>
        `;
      }).join("");
    }catch(error){
      root.innerHTML = '<p class="muted">Latest videos are unavailable right now.</p>';
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", loadLatestVideos);
  } else {
    loadLatestVideos();
  }
})();
