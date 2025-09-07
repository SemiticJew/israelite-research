(function(){
  const KEY = 'theme';
  const root = document.documentElement;

  const prefersDark = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function apply(theme){
    root.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if(btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function init(){
    const saved = localStorage.getItem(KEY);
    const initial = saved || (prefersDark() ? 'dark' : 'light');
    apply(initial);

    if(!saved && window.matchMedia){
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = e => {
        if(!localStorage.getItem(KEY)) apply(e.matches ? 'dark' : 'light');
      };
      mq.addEventListener ? mq.addEventListener('change', onChange)
                          : mq.addListener && mq.addListener(onChange);
    }
  }

  const SUN_SVG = `
    <svg class="sun" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  const MOON_SVG = `
    <svg class="moon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.5a8.5 8.5 0 11-8.5-8.5 6.5 6.5 0 008.5 8.5z"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  function ensureToggle(){
    let btn = document.getElementById('themeToggle');
    if(!btn){
      const wrap = document.createElement('div');
      wrap.className = 'floating-theme-toggle';
      wrap.innerHTML = `
        <button id="themeToggle" class="theme-toggle" aria-pressed="false" aria-label="Toggle dark mode">
          ${SUN_SVG}${MOON_SVG}
        </button>`;
      document.body.appendChild(wrap);
      btn = wrap.querySelector('#themeToggle');
    } else {
      if(!btn.querySelector('svg')) btn.innerHTML = SUN_SVG + MOON_SVG;
    }
    btn.addEventListener('click', ()=>{
      const next = (root.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      apply(next);
    });
  }

  document.addEventListener('DOMContentLoaded', () => { init(); ensureToggle(); });
})();
