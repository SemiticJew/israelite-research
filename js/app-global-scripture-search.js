(function () {
  const SEARCH_INDEX_PATH = '/data/scripture-search-index.json';

  const state = {
    index: [],
    booksByCanon: {
      all: [],
      tanakh: [],
      newtestament: [],
      apocrypha: []
    },
    loaded: false,
    loading: false,
    error: ''
  };

  const DEFAULT_STATUS = 'Search Scripture across Tanakh, New Testament, and Apocrypha.';

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

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'default' });

    if (!response.ok) {
      throw new Error(`Unable to load ${path}`);
    }

    return response.json();
  }

  function hydrateEntry(entry) {
    return {
      canon: entry.canon || '',
      canonLabel: entry.canonLabel || entry.canon || 'Scripture',
      book: entry.book || entry.slug || 'Unknown Book',
      slug: entry.slug || '',
      chapter: Number(entry.chapter || 0),
      verse: Number(entry.verse || 0),
      text: entry.text || '',
      normalizedText: entry.normalizedText || normalize(entry.text),
      readerPath: entry.readerPath || `/${entry.canon}/chapter.html`
    };
  }

  function buildBookLists(entries) {
    const canonMaps = {
      all: new Map(),
      tanakh: new Map(),
      newtestament: new Map(),
      apocrypha: new Map()
    };

    entries.forEach((entry) => {
      const slug = String(entry.slug || '').trim();
      const book = String(entry.book || slug || '').trim();

      if (!slug || !book) return;

      const canon = String(entry.canon || '').toLowerCase();
      const target = canonMaps[canon];

      canonMaps.all.set(slug, book);
      if (target) {
        target.set(slug, book);
      }
    });

    const sortBooks = (map) => Array.from(map.entries())
      .map(([slug, book]) => ({ slug, book }))
      .sort((a, b) => a.book.localeCompare(b.book));

    return {
      all: sortBooks(canonMaps.all),
      tanakh: sortBooks(canonMaps.tanakh),
      newtestament: sortBooks(canonMaps.newtestament),
      apocrypha: sortBooks(canonMaps.apocrypha)
    };
  }

  async function loadSearchIndex() {
    if (state.loaded || state.loading) return;

    state.loading = true;
    state.error = '';

    try {
      const payload = await fetchJson(SEARCH_INDEX_PATH);
      const entries = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.entries)
          ? payload.entries
          : [];

      state.index = entries.map(hydrateEntry).filter((entry) =>
        entry.slug &&
        entry.chapter &&
        entry.verse &&
        entry.text
      );
      state.booksByCanon = buildBookLists(state.index);

      state.loaded = true;
    } catch (error) {
      state.error = error.message || 'Unable to load Scripture search index.';
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

    return `${result.readerPath}?${params.toString()}#v${result.verse}`;
  }

  function searchIndex(query, canonFilter, bookFilter) {
    const normalizedQuery = normalize(query);
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    if (!terms.length) return [];

    return state.index
      .filter((entry) => canonFilter === 'all' || entry.canon === canonFilter)
      .filter((entry) => bookFilter === 'all' || entry.slug === bookFilter)
      .filter((entry) => terms.every((term) => entry.normalizedText.includes(term)))
      .slice(0, 75);
  }

  function renderStatus(elements, message, tone) {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone || 'neutral';
  }

  function renderBookOptions(elements, canonFilter) {
    if (!elements.book) return;

    const selectedBook = elements.book.value || 'all';
    const books = canonFilter === 'all'
      ? state.booksByCanon.all
      : state.booksByCanon[canonFilter] || [];

    elements.book.innerHTML = `
      <option value="all">All books</option>
      ${books.map((book) => `<option value="${escapeHtml(book.slug)}">${escapeHtml(book.book)}</option>`).join('')}
    `;
    elements.book.disabled = canonFilter === 'all';
    elements.book.value = canonFilter === 'all' ? 'all' : selectedBook;

    if (elements.book.value !== 'all' && !books.some((book) => book.slug === elements.book.value)) {
      elements.book.value = 'all';
    }
  }

  function renderAppResult(elements, result, query, index) {
    const reference = `${result.book} ${result.chapter}:${result.verse}`;

    return `
      <article class="app-search-result app-search-result-card">
        <div class="app-search-result-header">
          <div class="app-search-result-meta">
            <span class="app-pill">${escapeHtml(result.canonLabel)}</span>
            <span class="app-search-ref">${escapeHtml(reference)}</span>
          </div>
          <span class="app-search-canon">${escapeHtml(result.canonLabel)}</span>
        </div>
        <p class="app-search-text">${highlightText(result.text, query)}</p>
        <div class="app-search-result-actions" aria-label="${escapeHtml(reference)} actions">
          <button type="button" data-global-scripture-search-action="open" data-global-scripture-search-index="${index}">Open in Reader</button>
          <button type="button" data-global-scripture-search-action="chain" data-global-scripture-search-index="${index}">Add to Chain</button>
          <button type="button" data-global-scripture-search-action="copy" data-global-scripture-search-index="${index}">Copy Verse</button>
        </div>
      </article>
    `;
  }

  function renderResults(elements, results, query, isAppRoot) {
    if (!results.length) {
      elements.results.innerHTML = `
        <div class="app-search-empty">
          No Scripture matches found.
        </div>
      `;
      return;
    }

    if (isAppRoot) {
      elements.results.innerHTML = results.map((result, index) => renderAppResult(elements, result, query, index)).join('');
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
      book: root.querySelector('[data-global-scripture-search-book]'),
      clear: root.querySelector('[data-global-scripture-search-clear]'),
      status: root.querySelector('[data-global-scripture-search-status]'),
      results: root.querySelector('[data-global-scripture-search-results]')
    };

    if (!elements.form || !elements.input || !elements.canon || !elements.status || !elements.results) return;

    let debounceTimer = null;
    let lastResults = [];
    const isAppRoot = Boolean(root.closest('.institute-app'));

    const appApi = () => window.semiticJewApp || null;

    const syncBookFilter = () => {
      renderBookOptions(elements, elements.canon.value || 'all');
    };

    const runSearch = async () => {
      const query = elements.input.value.trim();
      const canonFilter = elements.canon.value || 'all';
      const bookFilter = canonFilter === 'all' ? 'all' : (elements.book?.value || 'all');

      if (!query) {
        renderStatus(elements, DEFAULT_STATUS, 'neutral');
        elements.results.innerHTML = '';
        lastResults = [];
        return;
      }

      if (query.length < 2) {
        renderStatus(elements, 'Enter at least 2 characters to search Scripture.', 'neutral');
        elements.results.innerHTML = '';
        lastResults = [];
        return;
      }

      if (!state.loaded) {
        renderStatus(elements, 'Loading Scripture search index...', 'loading');
        await loadSearchIndex();
        syncBookFilter();
      }

      if (state.error) {
        renderStatus(elements, state.error, 'error');
        elements.results.innerHTML = '';
        lastResults = [];
        return;
      }

      const results = searchIndex(query, canonFilter, bookFilter);
      lastResults = results;

      renderStatus(
        elements,
        results.length
          ? `${results.length} result${results.length === 1 ? '' : 's'} shown${results.length === 75 ? ' — refine search for more precision.' : '.'}`
          : 'No Scripture matches found.',
        'success'
      );

      renderResults(elements, results, query, isAppRoot);
    };

    const scheduleSearch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 250);
    };

    elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      runSearch();
    });

    elements.input.addEventListener('focus', () => {
      if (!state.loaded && !state.loading) {
        void loadSearchIndex().then(() => {
          if (!state.error) {
            syncBookFilter();
            if (!elements.input.value.trim()) {
              renderStatus(elements, DEFAULT_STATUS, 'neutral');
            }
          }
        });
      }
    });

    elements.input.addEventListener('input', scheduleSearch);
    elements.canon.addEventListener('change', async () => {
      if (!state.loaded && !state.loading) {
        renderStatus(elements, 'Loading Scripture search index...', 'loading');
        await loadSearchIndex();
      }
      syncBookFilter();
      if (!elements.input.value.trim()) {
        elements.results.innerHTML = '';
        lastResults = [];
        renderStatus(elements, DEFAULT_STATUS, 'neutral');
        return;
      }
      await runSearch();
    });
    elements.book?.addEventListener('change', runSearch);

    elements.clear?.addEventListener('click', () => {
      elements.input.value = '';
      elements.canon.value = 'all';
      if (elements.book) {
        elements.book.value = 'all';
        elements.book.disabled = true;
      }
      lastResults = [];
      elements.results.innerHTML = '';
      renderStatus(elements, DEFAULT_STATUS, 'neutral');
      elements.input.focus();
    });

    if (isAppRoot) {
      elements.results.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-global-scripture-search-action]');
        if (!button) return;

        const index = Number(button.dataset.globalScriptureSearchIndex || '-1');
        const result = lastResults[index];
        if (!result) return;

        const reference = `${result.book} ${result.chapter}:${result.verse}`;
        const action = button.dataset.globalScriptureSearchAction;
        const api = appApi();

        if (action === 'open') {
          if (api?.openScriptureResult) {
            await api.openScriptureResult(result);
            renderStatus(elements, `Opened ${reference} in the reader.`, 'success');
          }
          return;
        }

        if (action === 'chain') {
          if (api?.addToCurrentStudyChain) {
            const added = await api.addToCurrentStudyChain({
              canon: result.canon,
              book: result.slug,
              chapter: String(result.chapter),
              verse: String(result.verse),
              verseEnd: String(result.verse)
            }, {
              reference,
              text: result.text,
              source: 'search',
              sourceLabel: 'Scripture search'
            });
            renderStatus(elements, added ? `Added ${reference} to the current study chain.` : `${reference} is already in the current study chain.`, added ? 'success' : 'neutral');
          }
          return;
        }

        if (action === 'copy') {
          const payload = `${reference}\n${result.text}`;
          let copied = false;
          if (api?.copyTextToClipboard) {
            copied = await api.copyTextToClipboard(payload);
          } else {
            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(payload);
                copied = true;
              }
            } catch (error) {
              copied = false;
            }
          }
          renderStatus(elements, copied ? `Copied ${reference} to clipboard.` : 'Copy failed. Try again.', copied ? 'success' : 'error');
        }
      });
    }

    syncBookFilter();
    renderStatus(elements, DEFAULT_STATUS, 'neutral');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document
      .querySelectorAll('[data-global-scripture-search]')
      .forEach(bindSearch);
  });
}());
