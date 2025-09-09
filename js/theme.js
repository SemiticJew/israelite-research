/* /israelite-research/js/theme.js
   Make dark/light cooperate with the new palette switcher.
   Source of truth = localStorage "ir-theme" set by the switcher.
*/
(function () {
  const KEY = "ir-theme";
  const html = document.documentElement;

  // If user already chose a theme, respect it (do nothing else).
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      html.setAttribute("data-theme", saved);
    } else {
      // First visit: follow OS preference, but *via data-theme* (not classes)
      const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      html.setAttribute("data-theme", prefersDark ? "dark" : "default");
    }
  } catch (e) {
    html.setAttribute("data-theme", "default");
  }

  // If the switcher updates localStorage, mirror it here
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      html.setAttribute("data-theme", e.newValue);
    }
  });

  // IMPORTANT: Do not add/remove any `.dark` classes here.
  // If your old code had document.body.classList.add("dark") etc., remove it.
})();
