// /israelite-research/js/verses.js
// Enhances verse spans without changing their visible text.
// It ensures data attributes exist and leaves the inner text alone.

(function () {
  function enhanceVerses() {
    var verses = document.querySelectorAll('.verse');
    verses.forEach(function (el) {
      // Ensure we never overwrite what the user wrote
      var ref  = el.getAttribute('data-ref')  || '';
      var note = el.getAttribute('data-note') || '';

      // If the element got clobbered to "verse preview", restore to ref
      // but ONLY if we have a ref and the element looks like a placeholder.
      var txt = (el.textContent || '').trim().toLowerCase();
      if (ref && (txt === 'verse preview' || txt === 'preview' || txt === 'citation')) {
        el.textContent = ref;
      }

      // Accessibility: add a concise tooltip via title (CSS ::after already handles rich tooltip)
      var title = ref + (note ? ' — ' + note : '');
      if (title.trim()) el.setAttribute('title', title);

      // Defensive: if some builder wrapped it in a link, don’t let link styling leak
      // (Your CSS already removes underline, but we also guard focus style here)
      if (el.closest('a')) {
        el.closest('a').style.textDecoration = 'none';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceVerses);
  } else {
    enhanceVerses();
  }
})();
