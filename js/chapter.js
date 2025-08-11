// js/chapter.js
(function () {
  function param(name) {
    const p = new URLSearchParams(location.search);
    return p.get(name) ? decodeURIComponent(p.get(name)) : null;
  }

  function slugifyBook(book) {
    // Use folder names exactly as book names (e.g., Genesis), so no slugging needed.
    // But keep a fallback replacing spaces with %20 for links.
    return book;
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

    // tools
    const tools = document.createElement('div');
    tools.className = 'verse-tools';
    tools.innerHTML = `
      <button class="tool-btn" data-action="xrefs">Cross Refs</button>
      <button class="tool-btn" data-action="comm">Commentary</button>
      <button class="tool-btn" data-action="study">Study</button>
    `;

    const xrefs = document.createElement('div');
    xrefs.className = 'panel xrefs';
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
    comm.innerHTML = `
      <div><strong>Your Commentary</strong></div>
      <textarea placeholder="Add notes for ${v.num}…">${v.commentary || ''}</textarea>
      <div style="margin-top:.5rem; font-size: var(--fs-small-text); color:#666;">
        Notes are local to this file (static site). Persisting edits requires updating the JSON.
      </div>
    `;

    const study = document.createElement('div');
    study.className = 'panel study';
    study.innerHTML = `
      <div><strong>Study Tools</strong></div>
      <ul style="margin:.5rem 0 0; padding-left:1rem;">
        <li>Compare translations (future)</li>
        <li>Original language / morphology (future)</li>
        <li>Audio (future)</li>
      </ul>
    `;

    // Toggle logic
    tools.addEventListener('click', (e) => {
      const btn = e.target.closest('.tool-btn');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      [xrefs, comm, study].forEach(p => p.classList.remove('open'));
      if (action === 'xrefs') xrefs.classList.add('open');
      if (action === 'comm') comm.classList.add('open');
      if (action === 'study') study.classList.add('open');
    });

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
      // load chapter data
      const data = await loadJSON(pathForChapter(book, chapter));
      // load chapter count (books.json) to set prev/next limits
      const books = await loadJSON('../data/tanakh/books.json');
      const maxCh = books[book] || (data.maxChapter || chapter);

      // header
      title.textContent = `${book} ${chapter}`;
      crumbBook.textContent = book;
      crumbBook.href = `book.html?book=${encodeURIComponent(book)}`;
      crumbChapter.textContent = `Chapter ${chapter}`;

      // verses
      versesWrap.innerHTML = '';
      (data.verses || []).forEach(v => renderVerse(versesWrap, v));

      // nav
      setNavLinks(book, chapter, maxCh);
    } catch (err) {
      title.textContent = `${book} ${chapter}`;
      versesWrap.innerHTML = `<p>Could not load data for ${book} ${chapter}. Make sure the file exists at <code>${pathForChapter(book, chapter)}</code>.</p>`;
    }
  });
})();
