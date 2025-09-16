(function () {
  document.querySelectorAll('.footnote-ref a[href^="#fn"]').forEach(function (a) {
    var liId = a.getAttribute('href').slice(1);
    var sup = a.closest('.footnote-ref');
    if (!sup) return;
    if (!sup.id) {
      var n = a.textContent.trim() || liId.replace(/\D+/g,'');
      sup.id = 'ref-fn' + n;
    }
    var entry = document.getElementById(liId);
    if (entry) {
      var back = entry.querySelector('.backref');
      if (back) back.setAttribute('href', '#' + sup.id);
    }
  });
})();
