<script>
// ensure-nt-grid.js — if a NT book page has no grid, add one and let wire-chapter-cards.js populate it.
(function () {
  if (!location.pathname.includes('/newtestament/')) return;

  // If a grid already exists, do nothing.
  if (document.getElementById('chapGrid') || document.querySelector('.grid')) return;

  // Find <main> and insert a grid section consistent with Tanakh layout.
  const main = document.querySelector('main') || document.body;
  const sec = document.createElement('section');
  sec.className = 'container';
  const div = document.createElement('div');
  div.id = 'chapGrid';
  div.className = 'grid';
  sec.appendChild(div);

  // Insert before site-footer if present, else append to main.
  const footer = document.getElementById('site-footer');
  if (footer && footer.parentNode === document.body) {
    document.body.insertBefore(sec, footer);
  } else {
    main.appendChild(sec);
  }
})();
</script>
