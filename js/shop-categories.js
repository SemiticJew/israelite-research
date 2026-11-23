// Shop categories: /shop.html (Shop All) and /shop.html?category=<slug>.
// Category links are real URLs, so they work when shared, opened in a new tab, or without JS
// (the page reads the query on load). With JS, navigation uses the History API, so
// Back/Forward move between categories without reloading.
(() => {
  'use strict';

  const shop = window.SJShop;
  const main = document.getElementById('shop-main');
  if (!shop || !main) return;

  const baseTitle = document.title;
  const bySlug = Object.fromEntries(shop.categories.map(c => [c.slug, c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const allOnly = [...main.querySelectorAll('.gt-hero, #good-tree')];
  const intro = document.getElementById('category-intro');
  const title = document.getElementById('category-title');
  const lede = document.getElementById('category-lede');
  const count = document.getElementById('category-count');
  const section = document.getElementById('category-products');
  const grid = document.getElementById('category-grid');
  const showcases = [...main.querySelectorAll('.showcase')];
  const navLinks = [...main.querySelectorAll('.category-nav a[data-category]')];

  // Category cards are built once from the shared catalog, then reused.
  const rendered = {};
  const cardsFor = slug => {
    if (!rendered[slug]) {
      rendered[slug] = shop.products
        .filter(entry => entry.product.category === slug)
        .map(entry => shop.createCard(entry.product, entry.collection, { showCollection: true }));
    }
    return rendered[slug];
  };

  const categoryFrom = url => {
    const slug = new URL(url, location.href).searchParams.get('category');
    return slug && bySlug[slug] ? slug : 'all';
  };

  const apply = slug => {
    const category = bySlug[slug];
    const isAll = !category;
    main.dataset.category = slug;

    navLinks.forEach(link => {
      if (link.dataset.category === slug) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    allOnly.forEach(el => { el.hidden = !isAll; });
    intro.hidden = isAll;
    section.hidden = isAll;

    // Featured showcases follow the category: Hats shows Heaven's Tribe, Hoodies the hoodie showcase.
    const featured = isAll ? showcases.map(s => s.id) : category.spotlight;
    showcases.forEach(section => { section.hidden = !featured.includes(section.id); });
    // With a featured showcase below, the category name becomes a small identifier so the
    // showcase title ("Heaven's Tribe", "Known by the Fruit") is the one large headline.
    main.dataset.showcase = String(!isAll && featured.length > 0);

    if (isAll) {
      document.title = baseTitle;
      return;
    }
    const cards = cardsFor(slug);
    title.textContent = category.label;
    lede.textContent = category.description;
    count.textContent = cards.length === 1 ? '1 style available' : `${cards.length} styles available`;
    grid.dataset.count = String(cards.length);
    grid.replaceChildren(...cards);
    if (shop.enhance) shop.enhance(section);
    document.title = `${category.label} | Semitic Jew Shop`;
  };

  const scrollToTarget = (hash, focusHeading) => {
    const behavior = reduceMotion.matches ? 'auto' : 'smooth';
    const target = hash && document.getElementById(hash.slice(1));
    if (target && !target.hidden) {
      target.scrollIntoView({ behavior, block: 'start' });
      return;
    }
    const nav = main.querySelector('.category-nav');
    const top = nav.getBoundingClientRect().top + window.scrollY - 8;
    if (window.scrollY > top) window.scrollTo({ top, behavior });
    if (focusHeading && !intro.hidden) title.focus({ preventScroll: true });
  };

  // Same-page shop links (category nav, "Good Tree") route without a reload.
  main.addEventListener('click', event => {
    const link = event.target.closest('a[data-shop-route]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    event.preventDefault();
    const slug = categoryFrom(url);
    if (url.href !== location.href) history.pushState({ category: slug }, '', url.pathname + url.search + url.hash);
    apply(slug);
    scrollToTarget(url.hash, slug !== 'all');
  });

  window.addEventListener('popstate', () => {
    apply(categoryFrom(location.href));
    scrollToTarget(location.hash, false);
  });

  // Keep the active category visible in the horizontally scrolling mobile nav.
  const keepActiveVisible = () => {
    const active = main.querySelector('.category-nav a[aria-current="page"]');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const initial = categoryFrom(location.href);
  apply(initial);
  if (initial !== 'all') requestAnimationFrame(keepActiveVisible);

  // Direct links such as /shop.html#good-tree: the browser jumps to the section before the
  // shared site header is injected, which then pushes the section down. Re-align once it lands.
  const header = document.getElementById('site-header');
  if (location.hash && header && !header.childElementCount) {
    const realign = () => {
      const target = document.getElementById(location.hash.slice(1));
      if (target && !target.hidden) target.scrollIntoView({ block: 'start', behavior: 'instant' });
    };
    const watcher = new MutationObserver(() => { watcher.disconnect(); requestAnimationFrame(realign); });
    watcher.observe(header, { childList: true });
    setTimeout(() => watcher.disconnect(), 4000);
  }
})();
