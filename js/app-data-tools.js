/* Semitic Jew App: Local Data Tools */
(function(){
  const KEYS = {
    history: "sj_reading_history_v1",
    bookmarks: "sj_scripture_bookmarks_v1"
  };

  function readJSON(key){
    try{
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function writeJSON(key, value){
    localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
  }

  function render(){
    const root = document.getElementById("app-data-tools");
    if(!root) return;

    const history = readJSON(KEYS.history);
    const bookmarks = readJSON(KEYS.bookmarks);

    root.innerHTML = `
      <section class="app-data-shell" aria-label="App data tools">
        <div class="app-data-head">
          <span class="label">Local App Data</span>
          <h2>Your study data stays on this device.</h2>
          <p>Reading history and bookmarks are saved locally in this browser. You can export a backup, import it later, or clear the local app data.</p>
        </div>

        <div class="app-data-stats">
          <div><strong>${history.length}</strong><span>Recent Chapters</span></div>
          <div><strong>${bookmarks.length}</strong><span>Bookmarks</span></div>
        </div>

        <div class="app-data-actions">
          <button type="button" id="app-export-data">Export Backup</button>
          <label class="app-import-label">
            Import Backup
            <input id="app-import-data" type="file" accept="application/json,.json"/>
          </label>
          <button type="button" id="app-clear-data" class="danger">Clear Local Data</button>
        </div>

        <p class="app-data-note">No account is required. This data is not synced across devices unless you export and import a backup manually.</p>
      </section>
    `;

    const exportBtn = document.getElementById("app-export-data");
    const importInput = document.getElementById("app-import-data");
    const clearBtn = document.getElementById("app-clear-data");

    exportBtn && exportBtn.addEventListener("click", function(){
      const payload = {
        app: "Semitic Jew",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          readingHistory: readJSON(KEYS.history),
          bookmarks: readJSON(KEYS.bookmarks)
        }
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "semitic-jew-app-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    importInput && importInput.addEventListener("change", async function(){
      const file = importInput.files && importInput.files[0];
      if(!file) return;

      try{
        const text = await file.text();
        const payload = JSON.parse(text);

        const importedHistory = payload?.data?.readingHistory;
        const importedBookmarks = payload?.data?.bookmarks;

        if(!Array.isArray(importedHistory) && !Array.isArray(importedBookmarks)){
          alert("This does not look like a valid Semitic Jew app backup.");
          return;
        }

        if(Array.isArray(importedHistory)) writeJSON(KEYS.history, importedHistory);
        if(Array.isArray(importedBookmarks)) writeJSON(KEYS.bookmarks, importedBookmarks);

        alert("App data imported successfully.");
        window.location.reload();
      }catch(e){
        alert("Import failed. Please choose a valid JSON backup file.");
      }
    });

    clearBtn && clearBtn.addEventListener("click", function(){
      const confirmed = confirm("Clear local reading history and bookmarks from this device?");
      if(!confirmed) return;

      localStorage.removeItem(KEYS.history);
      localStorage.removeItem(KEYS.bookmarks);

      alert("Local app data cleared.");
      window.location.reload();
    });
  }

  document.addEventListener("DOMContentLoaded", render);
})();
