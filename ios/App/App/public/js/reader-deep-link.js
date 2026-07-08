(function () {
  const HIGHLIGHT_CLASS = 'reader-verse-target';
  const SEARCH_MARK_CLASS = 'reader-search-mark';

  const escapeRegExp = (value) =>
    String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const getParams = () => new URLSearchParams(window.location.search);

  const getTargetVerseNumber = () => {
    const params = getParams();
    const fromParam = params.get('v');

    if (fromParam && /^\d+$/.test(fromParam)) {
      return fromParam;
    }

    const hash = window.location.hash || '';
    const match = hash.match(/^#v(\d+)$/i);

    return match ? match[1] : '';
  };

  const getSearchQuery = () => {
    const query = getParams().get('q') || '';
    return query.trim();
  };

  const getVerseNumberFromElement = (element) => {
    if (!element) return '';

    const directAttributes = [
      element.getAttribute('data-verse'),
      element.getAttribute('data-v'),
      element.getAttribute('data-verse-number'),
      element.getAttribute('id')
    ];

    for (const value of directAttributes) {
      if (!value) continue;

      const clean = String(value).replace(/^v/i, '');
      if (/^\d+$/.test(clean)) return clean;
    }

    const text = element.textContent || '';
    const match = text.trim().match(/^(\d+)\b/);

    return match ? match[1] : '';
  };

  const findVerseElement = (verseNumber) => {
    if (!verseNumber) return null;

    const selectors = [
      `#v${CSS.escape(verseNumber)}`,
      `[data-verse="${CSS.escape(verseNumber)}"]`,
      `[data-v="${CSS.escape(verseNumber)}"]`,
      `[data-verse-number="${CSS.escape(verseNumber)}"]`,
      `.verse-${CSS.escape(verseNumber)}`
    ];

    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found) return found;
    }

    const candidates = document.querySelectorAll(
      '.verse, .scripture-verse, .chapter-verse, [data-verse], [data-v], [id^="v"]'
    );

    for (const candidate of candidates) {
      if (getVerseNumberFromElement(candidate) === String(verseNumber)) {
        return candidate;
      }
    }

    return null;
  };

  const getVerseTextNodes = (root) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          if (
            parent.closest('script, style, noscript, textarea, input, select, button') ||
            parent.closest(`.${SEARCH_MARK_CLASS}`)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let node = walker.nextNode();

    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }

    return nodes;
  };

  const highlightSearchTerms = (root, query) => {
    if (!root || !query) return;

    const terms = query
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 1)
      .map(escapeRegExp);

    if (!terms.length) return;

    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const textNodes = getVerseTextNodes(root);

    textNodes.forEach((node) => {
      const text = node.nodeValue;

      if (!regex.test(text)) {
        regex.lastIndex = 0;
        return;
      }

      regex.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      text.replace(regex, (match, _term, offset) => {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));

        const mark = document.createElement('mark');
        mark.className = SEARCH_MARK_CLASS;
        mark.textContent = match;
        fragment.appendChild(mark);

        lastIndex = offset + match.length;
        return match;
      });

      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(fragment, node);
    });
  };

  const applyTargetHighlight = (element) => {
    if (!element) return;

    element.classList.add(HIGHLIGHT_CLASS);
    element.setAttribute('tabindex', '-1');

    window.setTimeout(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      try {
        element.focus({ preventScroll: true });
      } catch (_error) {
        element.focus();
      }
    }, 250);
  };

  const ensureHashFromParam = (verseNumber) => {
    if (!verseNumber || window.location.hash === `#v${verseNumber}`) return;

    const url = new URL(window.location.href);
    url.hash = `v${verseNumber}`;
    window.history.replaceState({}, '', url.toString());
  };

  const runDeepLink = () => {
    const verseNumber = getTargetVerseNumber();
    const query = getSearchQuery();
    const target = findVerseElement(verseNumber);

    if (query) {
      const scope = document.querySelector('main') || document.body;
      highlightSearchTerms(scope, query);
    }

    if (target) {
      ensureHashFromParam(verseNumber);
      applyTargetHighlight(target);
    }
  };

  const injectStyles = () => {
    if (document.getElementById('reader-deep-link-styles')) return;

    const style = document.createElement('style');
    style.id = 'reader-deep-link-styles';
    style.textContent = `
      .reader-verse-target{
        outline:3px solid rgba(241,115,0,.65);
        outline-offset:6px;
        border-radius:12px;
        background:rgba(241,115,0,.10);
        transition:background .25s ease, outline-color .25s ease;
        scroll-margin-top:110px;
      }

      .reader-search-mark{
        padding:.04rem .18rem;
        border-radius:.28rem;
        background:rgba(241,115,0,.24);
        color:inherit;
      }
    `;

    document.head.appendChild(style);
  };

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();

    // Give the chapter loader a moment to render verses before targeting them.
    window.setTimeout(runDeepLink, 450);
    window.setTimeout(runDeepLink, 1200);
  });

  window.addEventListener('hashchange', () => {
    window.setTimeout(runDeepLink, 100);
  });
}());
