(function(w){if(typeof w.__isArticlePage!=="function"){w.__isArticlePage=function(){return (typeof w.isArticlePage==="function")?!!w.isArticlePage():!!w.isArticlePage;};}})(window);
/* xref-hover.js — article inline Scripture hover (brand header + KJV footer + 4-verse range)
   Works with links created by citations.js (class="xref-trigger", data-xref="Book C:V–V")
*/
(function(){
  // ---------- Ensure hover container + styles ----------
  var hover = document.getElementById('hovercard');
  if (!hover) {
    hover = document.createElement('div');
    hover.id = 'hovercard';
    hover.setAttribute('role','dialog');
    hover.setAttribute('aria-hidden','true');
    document.body.appendChild(hover);
  }

  // Inject minimal styles (scoped to #hovercard)
  (function ensureStyles(){
    if (document.getElementById('hovercard-brand-styles')) return;
    var s = document.createElement('style');
    s.id = 'hovercard-brand-styles';
    s.textContent = `
      #hovercard{
        position:fixed; display:none; z-index:9999;
        max-width: 420px; background:#fff; color:#0b2340;
        border-radius: 12px; box-shadow: 0 18px 45px rgba(0,0,0,.28);
        border: 1px solid #e6ebf2; overflow: hidden;
      }
      #hovercard.open{ display:block; }
      .hc-brand{
        display:flex; align-items:center; gap:.5rem;
        padding:.4rem .6rem; background:#F17300; color:#fff; font-weight:700;
        font-size:.9rem; line-height:1;
      }
      .hc-brand svg{ width:16px; height:16px; flex:0 0 auto; }
      .hc-body{ padding:.75rem .85rem .5rem; }
      .hc-title{ font-weight:700; margin:0 0 .35rem; font-size:.98rem; }
      .hc-verse{ margin:.28rem 0; line-height:1.55; }
      .hc-verse b{ color:#6b7280; margin-right:.35rem; }
      .hc-footer{
        display:flex; justify-content:space-between; align-items:center;
        padding:.5rem .65rem; border-top:1px solid #e6ebf2; background:#fafafa;
        font-size:.88rem; color:#475569;
      }
      .hc-link{
        text-decoration:none; display:inline-flex; align-items:center; gap:.35rem;
      }
      .hc-link svg{ width:16px; height:16px; }
      @media (max-width:480px){ #hovercard{ max-width:92vw; } }
    `;
    document.head.appendChild(s);
  })();

  // ---------- Utils ----------
  const $ = (s, r=document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function prettyBook(slug){
    return String(slug||'')
      .split('-').map(w=>w ? w[0].toUpperCase()+w.slice(1) : w).join(' ');
  }
  function parseFromDataXref(a){
    // data-xref example: "Matthew 1:1–4" or "John 3:16"
    const raw = a.getAttribute('data-xref') || '';
    const m = /^(.+?)\s+(\d+):(\d+)(?:[–-](\d+))?$/i.exec(raw.replace(/\u00A0/g,' ').trim());
    if (!m) return null;
    return { bookLabel: m[1].trim(), chapter: parseInt(m[2],10), vStart: parseInt(m[3],10), vEnd: m[4]?parseInt(m[4],10):null };
  }
  function parseFromHref(a){
    // backup: parse canon/book/ch from the chapter URL and #vN from hash
    try{
      const u = new URL(a.href, location.origin);
      const parts = u.pathname.split('/').filter(Boolean);
      const canon = parts[1] || '';
      const qs = new URLSearchParams(u.search);
      const slug = (qs.get('book')||'').toLowerCase();
      const ch = parseInt(qs.get('ch')||'1',10) || 1;
      const v = parseInt((u.hash||'').replace(/^#v/,''),10) || 1;
      return { canon, slug, chapter: ch, vStart: v, vEnd: v };
    }catch{ return null; }
  }
  function canonFromSlug(slug){
    // Match citations.js logic
    var OT = new Set(["genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","1-samuel","2-samuel","1-kings","2-kings","1-chronicles","2-chronicles","ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song-of-songs","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi"]);
    var APO = new Set(["tobit","judith","wisdom-of-solomon","sirach","baruch","letter-of-jeremiah","1-maccabees","2-maccabees","1-esdras","2-esdras","prayer-of-manasseh","song-of-three","susanna","bel-and-the-dragon"]);
    if (APO.has(slug)) return 'apocrypha';
    if (OT.has(slug)) return 'tanakh';
    return 'newtestament';
  }
  function slugFromHref(a){
    try{
      const u = new URL(a.href, location.origin);
      const qs = new URLSearchParams(u.search);
      return (qs.get('book')||'').toLowerCase();
    }catch{ return ''; }
  }
  function chapterHref(canon, slug, ch){
    return `/israelite-research/${canon}/chapter.html?book=${encodeURIComponent(slug)}&ch=${encodeURIComponent(ch)}`;
  }

  const DATA_ROOT = '/israelite-research/data';
  const CHAPTER_JSON  = (canon,b,c) => `${DATA_ROOT}/${canon}/${b}/${c}.json`;
  const _CACHE = Object.create(null);
  async function getChapter(canon, slug, ch){
    const key = `${canon}/${slug}/${ch}`;
    if (_CACHE[key]) return _CACHE[key];
    try{
      const r = await fetch(CHAPTER_JSON(canon, slug, ch));
      if (!r.ok) throw 0;
      const j = await r.json();
      _CACHE[key] = j;
      return j;
    }catch{ return null; }
  }

  // ---------- Position + open/close ----------
  function openHover(html, x, y){
    hover.innerHTML = html;
    const pad = 16, vw = window.innerWidth, vh = window.innerHeight;
    hover.style.display = 'block';
    hover.style.visibility = 'hidden';
    hover.classList.add('open');
    const r = hover.getBoundingClientRect();
    let left = (x ?? 0) + 12, top = (y ?? 0) + 12;
    if (left + r.width + pad > vw) left = vw - r.width - pad;
    if (top + r.height + pad > vh) top = vh - r.height - pad;
    if (left < pad) left = pad;
    if (top  < pad) top  = pad;
    hover.style.left = left + 'px';
    hover.style.top  = top + 'px';
    hover.style.visibility = '';
    hover.setAttribute('aria-hidden','false');
  }
  function closeHover(){
    hover.classList.remove('open');
    hover.setAttribute('aria-hidden','true');
    hover.style.display = 'none';
  }

  // ---------- Render ----------
  function renderCard(opts){
    const {canon, slug, chapter, title, verses, anchorX, anchorY} = opts;
    const crown = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 7l4 4 5-7 5 7 4-4v10H3V7zm3 8h12v2H6v-2z"/></svg>`;
    const head = `<div class="hc-brand">${crown}<span>Semitic Jew</span></div>`;
    const bodyTitle = `<div class="hc-title">${esc(title)}</div>`;
    const bodyVerses = verses.map(v=>{
      return `<div class="hc-verse"><b>${v.v}</b>${esc(v.t||'')}</div>`;
    }).join('');
    const chapterURL = chapterHref(canon, slug, chapter);
    const foot = `
      <div class="hc-footer">
        <span>KJV 1611</span>
        <a class="hc-link" href="${chapterURL}" target="_blank" rel="noopener">
          <span>Open chapter</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 12h12l-4-4 1.4-1.4L21.8 12l-7.4 5.4L13 16l4-4H5z"/></svg>
        </a>
      </div>`;
    const html = head + `<div class="hc-body">` + bodyTitle + bodyVerses + `</div>` + foot;
    openHover(html, anchorX, anchorY);
  }

  // Given a start/end and chapter data, pick up to 4 verses (inclusive range, capped)
  function collectVerses(data, vStart, vEnd){
    const list = Array.isArray(data?.verses) ? data.verses : [];
    const start = Math.max(1, vStart|0);
    const end = Math.max(start, vEnd ? vEnd|0 : start);
    const limitEnd = Math.min(end, start + 3); // cap to 4 total
    return list.filter(v => Number(v.v) >= start && Number(v.v) <= limitEnd).slice(0, 4);
  }

  async function showPreview(a, evt){
    // Prefer data-xref (keeps the original label/range)
    const dx = parseFromDataXref(a);
    let slug = slugFromHref(a);
    if (!slug && dx) {
      // Try to infer from anchor URL if present; citations.js always builds URL with slug
      slug = slugFromHref(a);
    }
    if (!slug) return;

    const canon = canonFromSlug(slug);
    const parsedHref = parseFromHref(a) || {};
    const chapter = dx ? dx.chapter : parsedHref.chapter || 1;
    const vStart = dx ? dx.vStart : parsedHref.vStart || 1;
    const vEnd   = dx ? dx.vEnd   : parsedHref.vEnd   || vStart;

    const data = await getChapter(canon, slug, chapter);
    if (!data) return;

    const verses = collectVerses(data, vStart, vEnd);
    const title = `${prettyBook(slug)} ${chapter}:${vStart}${vEnd && vEnd !== vStart ? '–' + vEnd : ''}`;
    const rect = a.getBoundingClientRect();
    const x = (evt && 'clientX' in evt) ? evt.clientX : rect.left + 4;
    const y = (evt && 'clientY' in evt) ? evt.clientY : rect.bottom + 4;

    renderCard({canon, slug, chapter, title, verses, anchorX:x, anchorY:y});
  }

  // ---------- Wire events ----------
  let hideTimer = null;

  document.addEventListener('mouseover', function(e){
    const a = e.target.closest('a.xref-trigger');
    if (!a) return;
    if (hideTimer){ clearTimeout(hideTimer); hideTimer = null; }
    showPreview(a, e);
  });
  document.addEventListener('mouseout', function(e){
    const a = e.target.closest('a.xref-trigger');
    if (!a) return;
    hideTimer = setTimeout(closeHover, 130);
  });

  // Keep open while hovering the card
  hover.addEventListener('mouseenter', function(){ if (hideTimer){ clearTimeout(hideTimer); hideTimer = null; }});
  hover.addEventListener('mouseleave', function(){ hideTimer = setTimeout(closeHover, 130); });

  // Keyboard accessibility
  document.addEventListener('focusin', function(e){
    const a = e.target.closest('a.xref-trigger');
    if (!a) return;
    if (hideTimer){ clearTimeout(hideTimer); hideTimer = null; }
    showPreview(a, {clientX:0, clientY:0});
  });
  document.addEventListener('focusout', function(e){
    const a = e.target.closest('a.xref-trigger');
    if (!a) return;
    hideTimer = setTimeout(closeHover, 130);
  });

  // Close on scroll or generic click outside
  document.addEventListener('scroll', closeHover, {passive:true});
  document.addEventListener('click', function(e){
    if (!hover.contains(e.target) && !e.target.closest('a.xref-trigger')) closeHover();
  });
})();
