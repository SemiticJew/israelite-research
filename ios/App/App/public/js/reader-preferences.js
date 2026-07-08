/* Semitic Jew Reader: font controls + display modes */
(function(){
  const STORAGE_KEY = "sj_reader_preferences_v1";

  const DEFAULTS = {
    fontScale: 1,
    mode: "comfortable"
  };

  function readPrefs(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return Object.assign({}, DEFAULTS, data || {});
    }catch(e){
      return Object.assign({}, DEFAULTS);
    }
  }

  function savePrefs(prefs){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }catch(e){
      console.warn("Reader preferences could not save:", e);
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function applyPrefs(prefs){
    const scale = clamp(Number(prefs.fontScale || 1), 0.85, 1.35);
    const mode = prefs.mode === "compact" ? "compact" : "comfortable";

    document.documentElement.style.setProperty("--reader-font-scale", String(scale));
    document.body.dataset.readerMode = mode;
  }

  function createControls(){
    if(document.querySelector(".reader-preferences-shell")) return;

    const prefs = readPrefs();
    applyPrefs(prefs);

    const shell = document.createElement("section");
    shell.className = "reader-preferences-shell";
    shell.setAttribute("aria-label", "Reader display preferences");

    shell.innerHTML = `
      <div class="reader-preferences-title">
        <span>Reader Display</span>
        <strong>Text size and spacing</strong>
      </div>

      <div class="reader-preferences-actions">
        <button type="button" data-reader-font="down" aria-label="Decrease reader text size">A−</button>
        <button type="button" data-reader-font="up" aria-label="Increase reader text size">A+</button>
        <button type="button" data-reader-mode="comfortable" aria-pressed="${prefs.mode !== "compact"}">Comfortable</button>
        <button type="button" data-reader-mode="compact" aria-pressed="${prefs.mode === "compact"}">Compact</button>
      </div>
    `;

    const progress = document.querySelector(".reader-progress-shell");
    const nav = document.querySelector(".reader-chapter-nav");
    const header = document.querySelector("main .page-header");

    if(progress){
      progress.insertAdjacentElement("afterend", shell);
    }else if(nav){
      nav.insertAdjacentElement("afterend", shell);
    }else if(header){
      header.insertAdjacentElement("afterend", shell);
    }else{
      document.querySelector("main")?.prepend(shell);
    }

    shell.addEventListener("click", function(event){
      const button = event.target.closest("button");
      if(!button) return;

      const next = readPrefs();

      if(button.dataset.readerFont === "down"){
        next.fontScale = clamp(Number(next.fontScale || 1) - 0.05, 0.85, 1.35);
      }

      if(button.dataset.readerFont === "up"){
        next.fontScale = clamp(Number(next.fontScale || 1) + 0.05, 0.85, 1.35);
      }

      if(button.dataset.readerMode){
        next.mode = button.dataset.readerMode === "compact" ? "compact" : "comfortable";
      }

      savePrefs(next);
      applyPrefs(next);

      shell.querySelectorAll("[data-reader-mode]").forEach(btn => {
        btn.setAttribute("aria-pressed", String(btn.dataset.readerMode === next.mode));
      });
    });
  }

  function init(){
    if(!document.body.classList.contains("reader-page")) return;

    applyPrefs(readPrefs());

    let attempts = 0;
    const wait = setInterval(function(){
      attempts += 1;

      if(document.querySelector(".reader-progress-shell") || document.querySelector(".reader-chapter-nav") || attempts > 80){
        clearInterval(wait);
        createControls();
      }
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
