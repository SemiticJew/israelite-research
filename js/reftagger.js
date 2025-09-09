/* reftagger.js
   Site-local "RefTagger"-style hovercards using your own JSON data.
   - Reads window.refTagger.settings
   - Works with <span class="verse" data-ref="..."> and auto-detects plain text citations
   - Uses lowercase, hyphenated, roman-numeral slugs
   - Strips Strong’s numbers/tags from shown text
*/

(function(){
  'use strict';

  // ---------------- Settings ----------------
  const CFG = Object.assign({
    bibleVersion: 'KJV',
    underlineStyle: 'dotted',
    showIcon: false,             // turned off (no 📖 icon)
    tooltipDelay: 80,
    theme: 'auto',
    autodetect: true,
    clickBehavior: 'none'
  }, (window.refTagger && window.refTagger.settings) || {});

  const ROOT = '/israelite-research/data';
  const PREF_KEYS = [CFG.bibleVersion, 'KJV', 'Text', 'text', 'Darby'];

  // ... [BOOK_CANON, BOOK_MAP, helpers unchanged from before] ...

  // ----------------------- UI -----------------------
  let hc, hideTimer, showTimer;
  function ensureCard(){
    if (hc) return hc;
    hc = document.createElement('div');
    hc.id = 'bible-hovercard';
    hc.setAttribute('aria-hidden','true');
    hc.className = 'refcard';
    hc.innerHTML = `
      <div class="refcard-inner">
        <div class="refcard-head">
          <span class="refcard-ref"></span>
          <button class="refcard-close" aria-label="Close">&times;</button>
        </div>
        <div class="refcard-body"></div>
      </div>`;
    document.body.appendChild(hc);
    hc.querySelector('.refcard-close').addEventListener('click', () => hide());
    applyTheme();
    return hc;
  }
  function applyTheme(){
    const mode = CFG.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light') : CFG.theme;
    document.documentElement.dataset.reftaggerTheme = mode;
  }
  function show(el, html){
    clearTimeout(hideTimer);
    const card = ensureCard();
    card.querySelector('.refcard-ref').textContent = el.dataset.ref || el.textContent || '';
    card.querySelector('.refcard-body').innerHTML = html;
    card.style.opacity = '1'; card.setAttribute('aria-hidden','false');
    const r = el.getBoundingClientRect();
    const top = window.scrollY + r.bottom + 8;
    const left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + window.innerWidth - card.offsetWidth - 8));
    card.style.top = `${Math.max(8, top)}px`;
    card.style.left = `${left}px`;
  }
  function hide(){
    if (!hc) return;
    hc.style.opacity = '0'; hc.setAttribute('aria-hidden','true');
  }

  // 🔹 Updated render function (no redundant vXX for single verse)
  async function render(el, ref){
    try{
      const p = parseRef(ref);
      if (!p) { show(el, `<div>Couldn’t parse: ${escapeHtml(ref)}</div>`); return; }
      const json = await getChapter(p.bookCanonical, p.chapter);
      const trans = pickTranslation(json);

      let html = '';

      const hasChapter = p.parts.some(x=>x.type==='chapter');
      const verseParts = p.parts.filter(x=>x.type!=='chapter');
      const isSingleVerse = verseParts.length === 1 && verseParts[0].type === 'single';

      if (hasChapter){
        html += `<div class="refcard-sec">
          <div class="refcard-label">Chapter Overview</div>
          <div class="refcard-text">${escapeHtml(autosummary(json))}</div>
        </div>`;
      }

      const chunks = extractVerses(trans, verseParts);

      if (isSingleVerse && chunks.length === 1){
        html += `<div class="refcard-sec"><div class="refcard-text">${chunks[0].text}</div></div>`;
      } else {
        chunks.forEach(({label,text})=>{
          html += `<div class="refcard-sec"><div class="refcard-label">${label}</div><div class="refcard-text">${text}</div></div>`;
        });
      }

      if (!html) html = `<div class="refcard-sec"><div class="refcard-text">No verses found for ${escapeHtml(ref)}.</div></div>`;
      show(el, html);
    } catch (e){
      show(el, `<div class="refcard-sec"><div class="refcard-text">Couldn’t load: ${escapeHtml(ref)}</div></div>`);
    }
  }

  // ... [binding, autodetect, init functions unchanged] ...

  // ----------------------- Minimal styles injected -----------------------
  const css = `
    .reftag{ position:relative; color:var(--brand, #054A91); font-weight:600; text-decoration-line: underline; text-decoration-style:${CFG.underlineStyle}; cursor:pointer; }
    #bible-hovercard.refcard{
      position:absolute; max-width:520px; z-index:9999; padding:10px;
      border-radius:12px; border:1px solid rgba(0,0,0,.08); box-shadow:0 10px 30px rgba(0,0,0,.18);
      background:#fff; color:#0b2340; transition:opacity .12s ease; opacity:0;
    }
    .refcard-inner{ padding:8px 10px 10px; }
    .refcard-head{ display:flex; align-items:center; justify-content:space-between; font-weight:700; margin-bottom:6px; }
    .refcard-ref{ color:var(--brand,#054A91); }
    .refcard-close{ background:transparent; border:0; font-size:20px; line-height:1; color:var(--muted,#6b7280); cursor:pointer; border-radius:50%; width:28px; height:28px; }
    .refcard-sec{ margin:8px 0; }
    .refcard-label{ font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted,#6b7280); margin-bottom:4px; }
    .refcard-text{ font-size:14px; line-height:1.45; }
    .refcard .vr{ display:inline-block; min-width:1.75em; font-weight:600; color:var(--accent,#F17300); }

    :root[data-reftagger-theme="dark"] #bible-hovercard.refcard{
      background:#0b1220; color:#e6e8ee; border-color:rgba(255,255,255,.1); box-shadow:0 10px 30px rgba(0,0,0,.6);
    }
    :root[data-reftagger-theme="dark"] .refcard-ref{ color:#81A4CD; }
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

})();
