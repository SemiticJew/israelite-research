// tabs.js
(function () {
  function renderChapter(container, chapter) {
    const h = document.createElement('h3');
    h.textContent = `Chapter ${chapter.number}`;
    container.appendChild(h);

    chapter.verses.forEach(v => {
      const p = document.createElement('p');
      p.innerHTML = `<strong>${chapter.number}:${v.number}</strong> ${v.text}`;
      container.appendChild(p);

      if (v.crossRefs?.length) {
        const refs = document.createElement('div');
        refs.className = 'cross-refs';
        refs.textContent = `Cross references: ${v.crossRefs.join(', ')}`;
        container.appendChild(refs);
      }

      if ('commentary' in v) {
        const c = document.createElement('div');
        c.className = 'commentary';
        c.textContent = v.commentary || '';
        container.appendChild(c);
      }
    });
  }

  function loadBook(basePath, bookSlug, contentEl) {
    contentEl.textContent = 'Loading…';
    fetch(`${basePath}/${bookSlug}.json`)
      .then(r => {
        if (!r.ok) throw new Error(`Not found: ${bookSlug}`);
        return r.json();
      })
      .then(data => {
        contentEl.innerHTML = '';
        if (!data.chapters?.length) {
          contentEl.textContent = 'No content available yet.';
          return;
        }
        data.chapters.forEach(ch => renderChapter(contentEl, ch));
      })
      .catch(err => {
        contentEl.textContent = `Error loading book: ${err.message}`;
      });
  }

  function initTabs(scope) {
    const tabWrappers = scope.querySelectorAll('.book-tabs');
    tabWrappers.forEach(tabs => {
      const basePath = tabs.getAttribute('data-basepath') || 'data/tanakh';
      const list = tabs.querySelector('.tab-list');
      const content = tabs.querySelector('.tab-content');
      if (!list || !content) return;

      list.addEventListener('click', (e) => {
        const li = e.target.closest('li[data-book]');
        if (!li) return;
        list.querySelectorAll('li').forEach(n => n.classList.remove('active'));
        li.classList.add('active');
        loadBook(basePath, li.getAttribute('data-book'), content);
      });

      const active = list.querySelector('li.active') || list.querySelector('li[data-book]');
      if (active) loadBook(basePath, active.getAttribute('data-book'), content);
    });
  }

  document.addEventListener('DOMContentLoaded', () => initTabs(document));
})();
