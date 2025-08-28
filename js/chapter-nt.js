// /israelite-research/js/chapter.js
(() => {
  const ROOT = location.pathname.includes('/israelite-research/')
    ? '/israelite-research/'
    : '/';
  const params = new URLSearchParams(location.search);
  const rawBook = params.get('book') || '';
  const chapter = params.get('chapter') || '1';

  // Detect corpus from URL path
  const corpus = location.pathname.includes('/newtestament/')
    ? 'newtestament'
    : 'tanakh';

  // Slug rules for your data folders (lowercase, words -> hyphens)
  const slugify = s => s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const bookSlug = slugify(rawBook);
  const dataURL = `${ROOT}data/${corpus}/${bookSlug}/${chapter}.json`;

  const el = {
    header: document.getElementById('chapterHeader'),
    verses: document.getElementById('verses'),
    crumb: document.getElementById('breadcrumbs')
  };

  // Build breadcrumbs (keeps your universal logic, just a safe fallback)
  function renderCrumbs() {
    if (!el.crumb) return;
    const home = `${ROOT}index.html`;
    const texts = `${ROOT}texts.html`;
    const tanakh = `${ROOT}${corpus === 'tanakh' ? 'tanakh.html' : 'newtestament.html'}`;
    const bookPage = `${ROOT}${corpus}/book.html?book=${encodeURIComponent(rawBook)}`;
    el.crumb.innerHTML = `
      <ol>
        <li><a href="${home}">Home</a></li>
        <li><a href="${texts}">Texts</a></li>
        <li><a href="${tanakh}">${corpus === 'tanakh' ? 'Tanakh' : 'New Testament'}</a></li>
        <li><a href="${bookPage}">${rawBook}</a></li>
        <li>Chapter ${chapter}</li>
      </ol>
    `;
  }

  function emptyMsg(label = 'Coming soon') {
    return `<div class="empty-msg" style="color:#666;font-size:.95rem;">${label}</div>`;
  }

  function notesKey(vnum) {
    return `notes:${corpus}:${bookSlug}:${chapter}:${vnum}`;
  }

  function renderCrossRefs(list = []) {
    if (!list.length) return emptyMsg('No cross references yet.');
    return `
      <ul class="xrefs-list" style="padding-left:1rem; margin:.5rem 0;">
        ${list.map(x => `
          <li style="margin:.25rem 0;">
            <strong>${x.ref || ''}</strong>${x.note ? ` — ${x.note}` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  function renderCommentary(text = '') {
    return text?.trim()
      ? `<div class="commentary-text" style="white-space:pre-wrap">${text}</div>`
      : emptyMsg('No commentary yet.');
  }

  function renderLexicon(list = []) {
    if (!list || !list.length) return emptyMsg('No lexicon entries for this verse (yet).');
    return `
      <table class="lexicon-table" style="width:100%;border-collapse:collapse;border:1px solid #e6ebf2;">
        <thead>
          <tr>
            <th style="text-align:left;padding:.4rem;border-bottom:1px solid #e6ebf2;">Lemma</th>
            <th style="text-align:left;padding:.4rem;border-bottom:1px solid #e6ebf2;">Strong’s</th>
            <th style="text-align:left;padding:.4rem;border-bottom:1px solid #e6ebf2;">Gloss</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(row => `
            <tr>
              <td style="padding:.4rem;border-top:1px solid #f1f3f7;">${row.lemma || ''}</td>
              <td style="padding:.4rem;border-top:1px solid #f1f3f7;">${row.strong || ''}</td>
              <td style="padding:.4rem;border-top:1px solid #f1f3f7;">${row.gloss || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function renderStrongs(list = []) {
    if (!list || !list.length) return emptyMsg('No Strong’s entries for this verse (yet).');
    return `
      <ul class="strongs-list" style="padding-left:1rem; margin:.5rem 0;">
        ${list.map(s => `
          <li style="margin:.25rem 0;">
            <strong>${s.number || ''}</strong>
            ${s.lemma ? ` — ${s.lemma}` : ''}
            ${s.meaning ? `: ${s.meaning}` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  function renderNotesArea(vnum) {
    const saved = localStorage.getItem(notesKey(vnum)) || '';
    const id = `notes-ta-${vnum}`;
    return `
      <div class="notes-wrap">
        <textarea id="${id}" rows="5" style="width:100%;padding:.6rem;border:1px solid #e6ebf2;border-radius:8px;">${saved}</textarea>
        <button class="btn-save-note" data-v="${vnum}" style="margin-top:.5rem;padding:.4rem .8rem;border:1px solid #e6ebf2;border-radius:8px;background:#fff;cursor:pointer;">
          Save notes
        </button>
        <span class="notes-status" id="${id}-status" style="margin-left:.5rem;color:#666;font-size:.9rem;"></span>
      </div>
    `;
  }

  function buildVerseRow(v) {
    const vnum = v.num;
    return `
      <div class="verse-row" id="v${vnum}" style="border-bottom:1px solid #eef2f7;padding:.6rem 0;">
        <div class="verse-head" style="display:flex;align-items:flex-start;gap:.6rem;">
          <div class="verse-num" style="min-width:2.2rem;text-align:right;color:#666;">${vnum}</div>
          <div class="verse-text" style="flex:1 1 auto;">${v.text || ''}</div>
          <button class="tools-btn" data-v="${vnum}" aria-expanded="false"
            style="margin-left:auto;padding:.25rem .5rem;border:1px solid #e6ebf2;border-radius:6px;background:#fff;cursor:pointer;">
            Tools
          </button>
        </div>

        <div class="verse-tools" id="tools-${vnum}" hidden style="margin:.5rem 0 .75rem; padding:.6rem; border:1px solid #e6ebf2; border-radius:10px; background:#fafcff;">
          <div class="tabs" role="tablist" style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem;">
            <button class="tab active" data-tab="xrefs" role="tab" aria-selected="true"
              style="padding:.3rem .6rem;border:1px solid #e6ebf2;border-radius:999px;background:#fff;cursor:pointer;">Cross Refs</button>
            <button class="tab" data-tab="commentary" role="tab" aria-selected="false"
              style="padding:.3rem .6rem;border:1px solid #e6ebf2;border-radius:999px;background:#fff;cursor:pointer;">Commentary</button>
            <button class="tab" data-tab="lexicon" role="tab" aria-selected="false"
              style="padding:.3rem .6rem;border:1px solid #e6ebf2;border-radius:999px;background:#fff;cursor:pointer;">Lexicon</button>
            <button class="tab" data-tab="strongs" role="tab" aria-selected="false"
              style="padding:.3rem .6rem;border:1px solid #e6ebf2;border-radius:999px;background:#fff;cursor:pointer;">Strong’s</button>
            <button class="tab" data-tab="notes" role="tab" aria-selected="false"
              style="padding:.3rem .6rem;border:1px solid #e6ebf2;border-radius:999px;background:#fff;cursor:pointer;">Notes</button>
          </div>

          <div class="panels">
            <div class="panel" data-panel="xrefs">${renderCrossRefs(v.crossRefs)}</div>
            <div class="panel" data-panel="commentary" hidden>${renderCommentary(v.commentary)}</div>
            <div class="panel" data-panel="lexicon" hidden>${renderLexicon(v.lexicon)}</div>
            <div class="panel" data-panel="strongs" hidden>${renderStrongs(v.strongs)}</div>
            <div class="panel" data-panel="notes" hidden>${renderNotesArea(vnum)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function wireEvents(container, data) {
    // Tools open/close
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.tools-btn');
      if (btn) {
        const v = btn.getAttribute('data-v');
        const panel = document.getElementById(`tools-${v}`);
        const open = panel.hasAttribute('hidden') ? false : true;
        if (open) {
          panel.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          panel.removeAttribute('hidden');
          btn.setAttribute('aria-expanded', 'true');
        }
      }

      // Tabs switch
      const tab = e.target.closest('.tab');
      if (tab) {
        const tabsWrap = tab.parentElement;
        const toolsWrap = tabsWrap.parentElement;
        const target = tab.getAttribute('data-tab');

        tabsWrap.querySelectorAll('.tab').forEach(b => {
          b.classList.toggle('active', b === tab);
          b.setAttribute('aria-selected', b === tab ? 'true' : 'false');
        });
        toolsWrap.querySelectorAll('.panel').forEach(p => {
          p.toggleAttribute('hidden', p.getAttribute('data-panel') !== target);
        });
      }

      // Save notes
      const saveBtn = e.target.closest('.btn-save-note');
      if (saveBtn) {
        const vnum = saveBtn.getAttribute('data-v');
        const ta = document.getElementById(`notes-ta-${vnum}`);
        const status = document.getElementById(`notes-ta-${vnum}-status`);
        localStorage.setItem(notesKey(vnum), ta.value);
        if (status) { status.textContent = 'Saved'; setTimeout(()=>status.textContent='', 1200); }
      }
    });
  }

  async function init() {
    renderCrumbs();

    if (el.header) {
      el.header.innerHTML = `
        <h1 class="page-title" style="margin:0 0 .25rem 0;">${rawBook} ${chapter}</h1>
      `;
    }

    if (!el.verses) return;

    try {
      const res = await fetch(dataURL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load chapter JSON');
      const data = await res.json();

      // Render verses
      el.verses.innerHTML = (data.verses || [])
        .map(buildVerseRow)
        .join('');

      wireEvents(el.verses, data);
    } catch (err) {
      el.verses.innerHTML = `<div style="color:#b00020;">Could not load chapter data.</div>`;
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
