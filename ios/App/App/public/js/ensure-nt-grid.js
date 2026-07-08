(function () {
  if (!location.pathname.includes('/newtestament/')) return;
  if (document.getElementById('chapGrid') || document.querySelector('.grid')) return;
  const main = document.querySelector('main') || document.body;
  const sec = document.createElement('section');
  sec.className = 'container';
  const div = document.createElement('div');
  div.id = 'chapGrid';
  div.className = 'grid';
  sec.appendChild(div);
  const footer = document.getElementById('site-footer');
  if (footer && footer.parentNode === document.body) {
    document.body.insertBefore(sec, footer);
  } else {
    main.appendChild(sec);
  }
})();
