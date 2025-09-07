(function(){
  const KEY = 'theme';
  const root = document.documentElement;

  const sysPrefersDark = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function apply(theme){
    root.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if(btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function init(){
    const saved = localStorage.getItem(KEY);
    const initial = saved || (sysPrefersDark() ? 'dark' : 'light');
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

  function ensureToggle(){
    let btn = document.getElementById('themeToggle');
    if(!btn){
      const wrap = document.createElement('div');
      wrap.className = 'floating-theme-toggle';
      wrap.innerHTML = `
        <button id="themeToggle" class="theme-toggle" aria-pressed="false" aria-label="Toggle dark mode">
          <svg class="sun" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v2m0 12v2m8-8h-2M6 12H4m12.95 4.95l-1.41-1.41M6.46 6.46L5.05 5.05m12.9 0l-1.41 1.41M6.46 17.54l-1.41 1.41M12 8a4 4 0 100 8 4 4 0 000-8z"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg class="moon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>`;
      document.body.appendChild(wrap);
      btn = wrap.querySelector('#themeToggle');
    }
    btn.addEventListener('click', ()=>{
      const next = (root.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      apply(next);
    });
  }

  document.addEventListener('DOMContentLoaded', () => { init(); ensureToggle(); });
})();
