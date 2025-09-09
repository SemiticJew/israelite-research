(function(){
  'use strict';

  // ... [same code as before above] ...

  // ---------- Styling: add spacing between verses ----------
  (function injectCSS(){
    const css = `
      #chapter-root .verselist{ display:block; margin:16px 0 32px; }
      #chapter-root .verse-row{
        display:block;
        margin:0 0 1rem 0;          /* 👈 bottom margin for spacing */
        padding:0 0 .6rem 0;
        border-bottom:1px solid var(--border, rgba(0,0,0,.12));
        line-height:1.85;
      }
      #chapter-root .verse-row:last-child{ border-bottom:1px solid var(--border, rgba(0,0,0,.12)); }
      #chapter-root .verse-num{ font-weight:800; color:var(--accent,#F17300); margin-right:.5rem; }
      #chapter-root .verse-text{ white-space:normal; }
      html[data-theme="dark"] #chapter-root .verse-row{ border-color: rgba(255,255,255,.18); }
      html[data-theme="dark"] #chapter-root .verse-text{ color:#fff; }
      #chapter-root .chapter-title{ margin:.25rem 0 1rem; font-family:var(--ff-serif,serif); font-weight:900; }
    `;
    const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  })();

  // ... [rest of the script unchanged] ...
})();
