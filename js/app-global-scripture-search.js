(function () {
  const CANONS = [
    {
      id: 'tanakh',
      label: 'Tanakh',
      basePath: '/tanakh/chapter.html',
      dataPath: '/data/tanakh'
    },
    {
      id: 'newtestament',
      label: 'New Testament',
      basePath: '/newtestament/chapter.html',
      dataPath: '/data/newtestament'
    },
    {
      id: 'apocrypha',
      label: 'Apocrypha',
      basePath: '/apocrypha/chapter.html',
      dataPath: '/data/apocrypha'
    }
  ];

  const state = {
    index: [],
    loaded: false,
    loading: false,
    error: ''
  };

  const normalize = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const escapeHtml = (value) =>
    String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));

  const titleCaseBook = (slug) =>
    String(slug || '')
      .split('-')
      .map((part) => {
        if (/^\d+$/.test(part)) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ')
      .replace(/\bOf\b/g, 'of')
      .replace(/\bThe\b/g, 'the');

  const normalizeBooksManifest = (manifest) => {
    if (Array.isArray(manifest)) return manifest;

    if (manifest && Array.isArray(manifest.books)) return manifest.books;

    if (manifest && typeof manifest === 'object') {
      return Object.entries(manifest).map(([slug, chapters]) => ({
        slug,
        name: titleCaseBook(slug),
        chapters
      }));
    }

    return [];
  };

  const getBookName = (book) =>
    book.name || book.title || book.book || book.label || book.slug || 'Unknown Book';

  const getBookSlug = (book) =>
    book.slug || book.id || book.key || normalize(getBookName(book)).replace(/\s+/g, '-');

  const getChapterCount = (book) => {
    if (Array.isArray(book.chapters)) return book.chapters.length;
    return Number(book.chapters || book.total || book.chapterCount || book.count || 0);
  };

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'default' });
    if (!response.ok) {
      throw new Error(`Unable to load ${path}`);
    }
    return response.json();
  }

  async function loadCanon(canon) {
    const manifest = await fetchJson(`${canon.dataPath}/books.json`);
    const books = normalizeBooksManifest(manifest);

    const entries = [];

    for (const book of books) {
      const slug = getBookSlug(book);
      const bookName = getBookName(book);
      const chapters = getChapterCount(book);

      if (!slug || !chapters) continue;

      for (let chapter = 1; chapter <= chapters; chapter += 1) {
        try {
          const chapterData = await fetchJson(`${canon.dataPath}/${slug}/${chapter}.json`);
          const verses = Array.isArray(chapterData.verses) ? chapterData.verses : [];

          verses.forEach((verse) => {
            if (!verse || typeof verse.t !== 'string') return;

            entries.push({
              canon: canon.id,
              canonLabel: canon.label,
              basePath: canon.basePath,
              book: bookName,
              slug,
              chapter,
              verse: verse.v,
              text: verse.t,
              normalizedText: normalize(verse.t)
            });
          });
        } catch (error) {
          console.warn('[Global Scripture Search] Skipped chapter:', canon.id, slug, chapter, error);
        }
      }
    }

    return entries;
  }

  async function buildIndex() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    state.error = '';

    try {
      const groups = await Promise.all(CANONS.map(loadCanon));
      state.index = groups.flat();
      state.loaded = true;
    } catch (error) {
      state.error = error.message || 'Unable to build Scripture search index.';
      console.error('[Global Scripture Search]', error);
    } finally {
      state.loading = false;
    }
  }

  function highlightText(text, query) {
    const safeText = escapeHtml(text);
    const cleanQuery = query.trim();

    if (!cleanQuery) return safeText;

    const terms = cleanQuery
      .split(/\s+/)
      .filter((term) => term.length > 1)
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (!terms.length) return safeText;

    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    return safeText.replace(regex, '<mark>$1</mark>');
  }

  function getResultUrl(result, query) {
    const params = new URLSearchParams({
      book: result.slug,
      ch: String(result.chapter)
    });

    if (result.verse) {
      params.set('v', String(result.verse));
    }

    if (query) {
      params.set('q', query);
    }

    return `${result.basePath}?${params.toString()}#v${result.verse}`;
  }

  function searchIndex(query, canonFilter) {
    const normalizedQuery = normalize(query);
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    if (!terms.length) return [];

    return state.index
      .filter((entry) => canonFilter === 'all' || entry.canon === canonFilter)
      .filter((entry) => terms.every((term) => entry.normalizedText.includes(term)))
      .slice(0, 75);
  }

  function renderStatus(elements, message, tone) {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone || 'neutral';
  }

  function renderResults(elements, results, query) {
    if (!results.length) {
      elements.results.innerHTML = `
        <div class="app-search-empty">
          No Scripture results found. Try fewer words or another spelling.
        </div>
      `;
      return;
    }

    elements.results.innerHTML = results.map((result) => `
      <a class="app-search-result" href="${escapeHtml(getResultUrl(result, query))}">
        <span class="app-search-ref">${escapeHtml(result.book)} ${result.chapter}:${result.verse}</span>
        <span class="app-search-canon">${escapeHtml(result.canonLabel)}</span>
        <span class="app-search-text">${highlightText(result.text, query)}</span>
      </a>
    `).join('');
  }

  function bindSearch(root) {
    const elements = {
      form: root.querySelector('[data-global-scripture-search-form]'),
      input: root.querySelector('[data-global-scripture-search-input]'),
      canon: root.querySelector('[data-global-scripture-search-canon]'),
      status: root.querySelector('[data-global-scripture-search-status]'),
      results: root.querySelector('[data-global-scripture-search-results]')
    };

    if (!elements.form || !elements.input || !elements.canon || !elements.status || !elements.results) return;

    let debounceTimer = null;

    const runSearch = async () => {
      const query = elements.input.value.trim();
      const canonFilter = elements.canon.value || 'all';

      if (!query) {
        renderStatus(elements, 'Enter a word or phrase to search all Scripture.', 'neutral');
        elements.results.innerHTML = '';
        return;
      }

      if (!state.loaded) {
        renderStatus(elements, 'Loading Scripture search index...', 'loading');
        await buildIndex();
      }

      if (state.error) {
        renderStatus(elements, state.error, 'error');
        elements.results.innerHTML = '';
        return;
      }

      const results = searchIndex(query, canonFilter);
      renderStatus(
        elements,
        `${results.length} result${results.length === 1 ? '' : 's'} shown${results.length === 75 ? ' — refine search for more precision.' : '.'}`,
        'success'
      );
      renderResults(elements, results, query);
    };

    const scheduleSearch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 250);
    };

    elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      runSearch();
    });

    elements.input.addEventListener('input', scheduleSearch);
    elements.canon.addEventListener('change', runSearch);

    renderStatus(elements, 'Enter a word or phrase to search all Scripture.', 'neutral');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document
      .querySelectorAll('[data-global-scripture-search]')
      .forEach(bindSearch);
  });
}());
