// js/include.js — loads partials/header.html + partials/footer.html on any page depth
(async () => {
  const roots = [
    '/israelite-research/', // GitHub Pages (repo root)
    '',                     // same folder
    '../',                  // one level up
    '../../'                // two levels up
  ];

  async function loadInto(id, file) {
    const host = document.getElementById(id);
    if (!host) return;
    for (const base of roots) {
      try {
        const res = await fetch(base + 'partials/' + file, { cache: 'no-cache' });
        if (res.ok) {
          host.innerHTML = await res.text();
          return;
        }
      } catch (_) {}
    }
    console.error('Failed to load partial:', file);
  }

  await loadInto('site-header', 'header.html');
  await loadInto('site-footer', 'footer.html');
})();
