/* Semitic Jew App: Install guide */
(function(){
  function getPlatform(){
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);

    if(isIOS) return "ios";
    if(isAndroid) return "android";
    return "desktop";
  }

  function render(){
    const root = document.getElementById("app-install-guide");
    if(!root) return;

    const platform = getPlatform();

    const copy = {
      ios: {
        title: "Install on iPhone or iPad",
        steps: [
          "Tap the Share button in Safari.",
          "Choose Add to Home Screen.",
          "Tap Add to install the Semitic Jew app."
        ]
      },
      android: {
        title: "Install on Android",
        steps: [
          "Open this page in Chrome.",
          "Tap the menu button.",
          "Choose Install app or Add to Home screen."
        ]
      },
      desktop: {
        title: "Install on Desktop",
        steps: [
          "Open this page in Chrome, Edge, or another PWA-ready browser.",
          "Look for the install icon in the address bar.",
          "Choose Install to open Semitic Jew like an app."
        ]
      }
    };

    const current = copy[platform] || copy.desktop;

    root.innerHTML = `
      <section class="app-install-shell" aria-label="Install app instructions">
        <div class="app-install-copy">
          <span class="label">Install App</span>
          <h2>${current.title}</h2>
          <p>Use the Semitic Jew app dashboard for quick access to Scripture tools, bookmarks, highlights, study trails, and local study data.</p>
        </div>

        <ol class="app-install-steps">
          ${current.steps.map(step => `<li>${step}</li>`).join("")}
        </ol>
      </section>
    `;
  }

  document.addEventListener("DOMContentLoaded", render);
})();
