/* Load Logos Reftagger only on article pages */
(function () {
  if (!document.querySelector('.article-page')) return;

  window.refTagger = {
    settings: {
      bibleVersion: "KJV",
      tooltipStyle: "light",
      roundedCorners: false,
      tagChapters: true,
      socialSharing: [],
      linkTarget: "_blank"
    }
  };

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://api.reftagger.com/v2/RefTagger.js';
  document.head.appendChild(s);
})();
