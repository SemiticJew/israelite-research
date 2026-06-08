(function () {
  const SEARCH_INDEX_PATH = '/data/scripture-search-index.json';

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
        await loadSearchIndex();
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
