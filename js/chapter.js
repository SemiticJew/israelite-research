// js/chapter.js
(function () {
  function param(name) {
    const p = new URLSearchParams(location.search);
    return p.get(name) ? decodeURIComponent(p.get(name)) : null;
  }

  function pathForChapter(book, chapter) {
    // data/tanakh/Genesis/1.json
    return `../data/tanakh/${encodeURIComponent(book)}/${chapter}.json`;
  }

  function setNavLinks(book, chapter, maxCh) {
    const bkHref = `book.html?book=${encodeURIComponent(book)}`;
    const prev = Math.max(1, chapter - 1);
    const next = Math.min(maxCh, chapter + 1);

    // Top
    document.getElementById('bookLink').href = bkHref;
    document.getElementById('prevLink').href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${prev}`;
    document.getElementById('nextLink').href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${next}`;
    // Bottom
    document.getElementById('bookLinkBottom').href = bkHref;
    document.getElementById('prevLinkBottom').href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${prev}`;
    document.getElementById('nextLinkBottom').href = `chapter.html?book=${encodeURIComponent(book)}&chapter=${next}`;
  }

  async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.json();
  }

  function renderVerse(container, v) {
    const wrap = document.createElement('article');
    wrap.className = 'verse-block';
    wrap.id = `v${v.num}`;

    const num = document.createElement('a');
    num.className = 'verse-num';
    num.href = `#v${v.num}`;
    num.textContent = v.num;

    const text = document.createElement('div');
    text.className = 'verse-text';
    text.textContent = v.text;

    // Panels first so we can wire aria-controls accurately
    const xrefs = document.createElement('div');
    xrefs.className = 'panel xrefs';
    xrefs.id = `xrefs-v${v.num}`;
    if (Array.isArray(v.crossRefs) && v.crossRefs.length) {
      xrefs.innerHTML = `
        <div><strong>Cross References</strong></div>
        <ul style="margin:.5rem 0 0; padding-left:1rem;">
          ${v.crossRefs.map(cr => `<li><a href="${cr.url || '#'}" target="_blank" rel="noopener">${cr.ref}</a>${cr.note ? ` — ${cr.note}` : ''}</li>`).join('')}
        </ul>
      `;
    } else {
      xrefs.innerHTML = `<em>No cross references yet.</em>`;
    }

    const comm = document.createElement('div');
    comm.className = 'panel commentary';
    comm.id = `comm-v${v.num}`;
    comm.innerHTML = `
      <div><strong>Your Commentary</strong></div>
      <textarea placeholder="Add notes for ${v.num}…">${v.commentary || ''}</textarea>
      <div style="margin-top:.5rem; font-size: var(--fs-small-text); color:#666;">
        Notes are local to this file (static site). Persisting edits requires updating the JSON.
      </div>
    `;

    const study = document.createElement('div');
    study.className = 'panel study';
    study.id = `study-v${v.num}`;
    study.innerHTML = `
      <div><strong>Study Tools</strong></div>
      <ul style="margin:.5rem 0 0; padding-left:1rem;">
        <li>Compare translations (future)</li>
        <li>Original language / morphology (future)</li>
        <li>Audio (future)</li>
      </ul>
    `;

    // Tools toolbar with ARIA wiring
    const tools = document.createElement('div');
    tools.className = 'verse-tools';

    const btnX = document.createElement('button');
    btnX.className = 'tool-btn';
    btnX.dataset.action = 'xrefs';
    btnX.setAttribute('aria-controls', xrefs.id);
    btnX.setAttribute('aria-expanded', 'false');
    btnX.textContent = 'Cross Refs';

    const btnC = document.createElement('button');
    btnC.className = 'tool-btn';
    btnC.dataset.action = 'comm';
    btnC.setAttribute('aria-controls', comm.id);
    btnC.setAttribute('aria-expanded', 'false');
    btnC.textContent = 'Commentary';

    const btnS = document.createElement('button');
    btnS.className = 'tool-btn';
    btnS.dataset.action = 'study';
    btnS.setAttribute('aria-controls', study.id);
    btnS.setAttribute('aria-expanded', 'false');
    btnS.textContent = 'Study';

    tools.append(btnX, btnC, btnS);

    function setExpanded(btn, expanded) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
    function closeAll() {
      [xrefs, comm, study].forEach(p => p.classList.remove('open'));
      tools.querySelectorAll('.tool-btn[aria-expanded="true"]').forEach(b => setExpanded(b, false));
    }

    // Click-to-toggle behavior (open/close same button; switch between panels)
    tools.addEventListener('click', (e) => {
      const btn = e.target.closest('.tool-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      const panel = action === 'xrefs' ? xrefs : action === 'comm' ? comm : study;
      const isOpen = panel.classList.contains('open');

      closeAll();
      if (!isOpen) {
        panel.classList.add('open');
        setExpanded(btn, true);
      }
    });

    // Optional: Escape closes any open panel in this verse
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAll();
      }
    });

    // Assemble verse block
    wrap.appendChild(num);
    wrap.appendChild(text);
    wrap.appendChild(tools);
    wrap.appendChild(xrefs);
    wrap.appendChild(comm);
    wrap.appendChild(study);
    container.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const book = param('book');
    const chapter = parseInt(param('chapter') || '1', 10);

    const title = document.getElementById('title');
    const crumbBook = document.getElementById('crumbBook');
    const crumbChapter = document.getElementById('crumbChapter');
    const versesWrap = document.getElementById('verses');

    if (!book) {
      title.textContent = 'Select a Book';
      versesWrap.innerHTML = '<p>Please open this page with ?book=BookName&chapter=1</p>';
      return;
    }

    try {
      const data = await loadJSON(pathForChapter(book, chapter));
      const books = await loadJSON('../data/tanakh/books.json');
      const maxCh = books[book] || (data.maxChapter || chapter);

      title.textContent = `${book} ${chapter}`;
      crumbBook.textContent = book;
      crumbBook.href = `book.html?book=${encodeURIComponent(book)}`;
      crumbChapter.textContent = `Chapter ${chapter}`;

      versesWrap.innerHTML = '';
      (data.verses || []).forEach(v => renderVerse(versesWrap, v));

      setNavLinks(book, chapter, maxCh);
    } catch (err) {
      title.textContent = `${book} ${chapter}`;
      versesWrap.innerHTML = `<p>Could not load data for ${book} ${chapter}. Make sure the file exists at <code>${pathForChapter(book, chapter)}</code>.</p>`;
    }
  });
})();
