(() => {
  'use strict';

  const store = 'https://goodtree.semiticjew.org/product/';
  const cdn = 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/';

  // Verified against the published Printify catalog on 2026-11-20.
  const catalog = {
    goodTree: [
      {
        name: 'Vintage T-Shirt', category: 't-shirts', price: 'From $27.99', path: '34620821/good-tree-known-by-the-fruit-vintage-t-shirt',
        colors: [
          ['Vintage Black', '#2e2c2a', cdn + '20261120015931-1f1e4860-6c17-642e-af6a-526cd0535393.png?revision=1795185330512'],
          ['Vintage Grey', '#766d72', cdn + '20261120015931-1f1e4860-6db6-67d0-912e-c6650127acbf.png?revision=1795185330512'],
          ['Vintage Denim', '#50526f', cdn + '20261120015931-1f1e4860-6ded-6dd4-9a83-aa8cbcf17d13.png?revision=1795185330512'],
          ['Vintage Olive', '#858061', cdn + '20261120015931-1f1e4860-6e3b-6214-bc5f-3692d6f4184e.png?revision=1795185330512'],
          ['Vintage Brick', '#882032', cdn + '20261120015931-1f1e4860-6c4b-631e-aed9-46eaaeb317a8.png?revision=1795185330512']
        ]
      },
      {
        name: 'Crewneck Sweatshirt', category: 'sweatshirts', price: 'From $34.99', path: '34626752/good-tree-known-by-the-fruit-crewneck-sweatshirt',
        colors: [
          ['Maroon', '#642838', cdn + '20261119183724-1f1e4484-32df-67c2-92b9-22a5a83b6628.png?revision=1795185273843'],
          ['Military Green', '#62664c', cdn + '20261119183724-1f1e4484-35a9-6bce-a933-6e30745c8b49.png?revision=1795185273843'],
          ['Forest Green', '#223b26', cdn + '20261119183724-1f1e4484-32c4-6f80-8d9f-5e0df7458027.png?revision=1795185273843'],
          ['Indigo Blue', '#476579', cdn + '20261119183724-1f1e4484-3309-6c52-b100-0a47ec39d359.png?revision=1795185273843'],
          ['Charcoal', '#585559', cdn + '20261119183724-1f1e4484-3387-61a2-8740-3692d6f4184e.png?revision=1795185273843']
        ]
      },
      {
        name: 'Vintage Hoodie', category: 'hoodies', price: 'From $49.99', path: '34633853/good-tree-known-by-the-fruit-vintage-hoodie',
        // Vintage Black is featured in the hero and the hoodie showcase, so the grid card opens on
        // another real colorway to avoid showing the same black hoodie twice in a row.
        cardStartColor: 'Vintage Olive',
        // Per-color mockups published on the Printify product page (verified 2026-11-21).
        viewOrder: ['front', 'back', 'folded'],
        views: {
          'Vintage Black': {
            front: cdn + '20261120142140-1f1e4edb-3eb2-6f2a-8f5b-9e2622fb01c8.png?revision=1795185293158',
            back: cdn + '20261120142139-1f1e4edb-3bd8-6304-a436-76d2984597fa.png?revision=1795185293158',
            folded: cdn + '20261120142140-1f1e4edb-4006-62a0-adfa-d287c95c4f15.png?revision=1795185293158'
          },
          'Vintage Olive': {
            front: cdn + '20261120142140-1f1e4edb-3e8e-6f12-8d6e-8e6df2c701c9.png?revision=1795185293158',
            back: cdn + '20261120142140-1f1e4edb-3f5d-60a6-be00-62b87e098c1f.png?revision=1795185293158',
            folded: cdn + '20261120142140-1f1e4edb-3fab-6ff8-b717-e6a59ba02253.png?revision=1795185293158'
          },
          'Vintage Zinc': {
            front: cdn + '20261120142140-1f1e4edb-3f07-6336-98a4-8e6df2c701c9.png?revision=1795185293158',
            back: cdn + '20261120142140-1f1e4edb-3e81-62a4-97e6-d2cc7ad0dc0a.png?revision=1795185293158',
            folded: cdn + '20261120142140-1f1e4edb-417d-634a-8b86-0ac778cf8c54.png?revision=1795185293158'
          },
          'Vintage Denim': {
            front: cdn + '20261120142140-1f1e4edb-4089-67a4-b878-ba0fe31e2c90.png?revision=1795185293158',
            back: cdn + '20261120142140-1f1e4edb-3f92-6454-9b3d-9ee278212040.png?revision=1795185293158',
            folded: cdn + '20261120142140-1f1e4edb-4072-68b0-9d93-660376e82713.png?revision=1795185293158'
          }
        },
        colors: [
          ['Vintage Black', '#252525', cdn + '20261120142140-1f1e4edb-4006-62a0-adfa-d287c95c4f15.png?revision=1795185293158'],
          ['Vintage Olive', '#73705b', cdn + '20261120142140-1f1e4edb-3e8e-6f12-8d6e-8e6df2c701c9.png?revision=1795185293158'],
          ['Vintage Zinc', '#77736d', cdn + '20261120142140-1f1e4edb-3e81-62a4-97e6-d2cc7ad0dc0a.png?revision=1795185293158'],
          ['Vintage Denim', '#525a70', cdn + '20261120142140-1f1e4edb-3f92-6454-9b3d-9ee278212040.png?revision=1795185293158']
        ]
      },
      {
        name: 'Embroidered Snapback', category: 'hats', price: 'From $35.99', path: '34638213/good-tree-signature-embroidered-two-tone-snapback-cap',
        colors: [
          ['Natural / Walnut', '#e5d7b9', cdn + '20261118060301-1f1e315b-5e80-6b38-9381-4696daa47a66.png?revision=1795194647429', '#66412c'],
          ['Natural / Army', '#e5d7b9', cdn + '20261118060300-1f1e315b-5c57-6f8c-a0ef-22854b10b233.png?revision=1795194647429', '#5b6245'],
          ['Natural / Forest', '#e5d7b9', cdn + '20261118060300-1f1e315b-5b34-647a-a122-cabdb3920221.png?revision=1795194647429', '#263d2d']
        ]
      }
    ],
    tribe: [
      {
        name: 'TRIBE. | 12. Embroidered Snapback', category: 'hats', price: 'From $42.99',
        description: 'TRIBE. embroidered front and back, with 12. on the sides and coordinated embroidery colors.',
        colors: [
          ['Navy / Natural', '#1f2d48', 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/20261121025839-1f1e5577-3bdf-6170-80c2-a6058d49d060.png?revision=1795229929634', '#e5d7b9', '34780278/tribe-12-embroidered-two-tone-snapback-cap-tribal-collection'],
          ['Red / Natural', '#8c2633', 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/20261121030157-1f1e557e-a076-6d84-8d71-86bbc60f87c3.png?revision=1795230126653', '#e5d7b9', '34784114/tribe-12-embroidered-two-tone-snapback-cap-tribal-collection'],
          ['Dark Green / Natural', '#243f31', 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/20261121030348-1f1e5582-bd5d-6af2-8838-76d70cf2108e.png?revision=1795230237237', '#e5d7b9', '34784181/tribe-12-embroidered-two-tone-snapback-cap-tribal-collection'],
          ['Solid Black / White', '#171717', 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/20261121030311-1f1e5581-6412-6476-91bd-569281c427a1.png?revision=1795230200633', null, '34784540/tribe-12-embroidered-two-tone-snapback-cap-tribal-collection']
        ]
      },
      {
        name: '12. | TRIBE. Embroidered Snapback', category: 'hats', price: 'From $39.99',
        description: '12. embroidered on the front, 1 and 2 split across the back center seam, and TRIBE. on the sides in coordinated colors.',
        colors: [
          ['Navy / Natural', '#1f2d48', 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/20261121025932-1f1e5579-3382-6caa-84ef-22054da716b5.png?revision=1795229983705', '#e5d7b9', '34781634/12-embroidered-two-tone-snapback-cap-tribal-collection'],
          ['Red / Natural', '#8c2633', 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/20261121025746-1f1e5575-4743-64aa-b61b-4e840d2a206c.png?revision=1795229890928', '#e5d7b9', '34783603/12-embroidered-two-tone-snapback-cap-tribal-collection'],
          ['Dark Green / Natural', '#243f31', 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/20261121030041-1f1e557b-cbae-6b26-b37c-726e289c3875.png?revision=1795230069958', '#e5d7b9', '34783339/12-embroidered-two-tone-snapback-cap-tribal-collection'],
          ['Black / Natural', '#171717', 'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/20261121030231-1f1e557f-e3cf-60bc-a341-22054da716b5.png?revision=1795230168226', '#e5d7b9', '34783949/12-embroidered-two-tone-snapback-cap-tribal-collection']
        ]
      }
    ]
  };

  // Shopping categories. Each has its own shareable URL: /shop.html?category=<slug>.
  // `spotlight` lists which featured showcase sections (by id) belong to the category.
  const categories = [
    { slug: 'hats', label: 'Hats', description: 'Embroidered snapbacks from Good Tree and Tribe Gear, in every available colorway.', spotlight: ['tribe-gear'] },
    { slug: 'hoodies', label: 'Hoodies', description: 'The Good Tree Vintage Hoodie, with front, back and folded views for every color.', spotlight: ['good-tree-hoodie'] },
    { slug: 't-shirts', label: 'T-Shirts', description: 'The Good Tree Vintage T-Shirt in every available color.', spotlight: [] },
    { slug: 'sweatshirts', label: 'Sweatshirts', description: 'The Good Tree Crewneck Sweatshirt in every available color.', spotlight: [] }
  ];
  const collectionLabels = { 'good-tree': 'Good Tree', tribe: 'Tribe Gear' };
  const products = [
    ...catalog.goodTree.map(product => ({ product, collection: 'good-tree' })),
    ...catalog.tribe.map(product => ({ product, collection: 'tribe' }))
  ];

  const viewLabels = { front: 'Front', back: 'Back', folded: 'Folded' };
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  const preload = src => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    return image;
  };

  // Keep the current photo visible until the next one has loaded, then cross-fade.
  const swapImage = (img, src, alt) => {
    if (img.getAttribute('src') === src) { img.alt = alt; return; }
    const token = (img._swapToken || 0) + 1;
    img._swapToken = token;
    const frame = img.parentElement;
    if (reduceMotion.matches) { img.src = src; img.alt = alt; return; }
    const busy = setTimeout(() => frame && frame.classList.add('is-loading'), 220);
    const next = preload(src);
    const ready = next.decode ? next.decode().catch(() => {}) : new Promise(resolve => { next.onload = next.onerror = resolve; });
    ready.then(() => {
      if (img._swapToken !== token) return;
      clearTimeout(busy);
      if (frame) frame.classList.remove('is-loading');
      img.classList.add('is-swapping');
      setTimeout(() => {
        if (img._swapToken !== token) return;
        img.src = src;
        img.alt = alt;
        requestAnimationFrame(() => img.classList.remove('is-swapping'));
      }, 140);
    });
  };

  const imageFor = (product, color, view) => (product.views && product.views[color[0]] && product.views[color[0]][view]) || color[2];
  const altFor = (product, color, view) => `${product.name} in ${color[0]}` + (product.views && view ? `, ${viewLabels[view].toLowerCase()} view` : '');

  const createCard = (product, collection, options = {}) => {
    const card = document.createElement('article');
    card.className = 'catalog-card';
    // A product may open on a different real colorway (see `cardStartColor`).
    const startIndex = Math.max(0, product.colors.findIndex(c => c[0] === product.cardStartColor));
    const initial = product.colors[startIndex];
    const initialPath = initial[4] || product.path;
    const views = product.views ? product.viewOrder : null;
    let current = initial;
    let view = views ? views[0] : null;
    // Every card renders the same eight rows (empty ones stay in place) so CSS subgrid can line up
    // titles, prices, swatches, labels and buttons across a row of cards.
    card.innerHTML = `
      <div class="catalog-media">
        <div class="catalog-image"><img src="${imageFor(product, initial, view)}" alt="${altFor(product, initial, view)}" width="900" height="900" loading="lazy" draggable="false"></div>
        ${views ? `<div class="view-toggle" role="group" aria-label="${product.name} view">${views.map((v, i) => `<button type="button" data-view="${v}" aria-pressed="${i === 0}">${viewLabels[v]}</button>`).join('')}</div>` : ''}
      </div>
      <p class="catalog-collection">${options.showCollection ? collectionLabels[collection] : ''}</p>
      <h3 class="catalog-title">${product.name}</h3>
      <p class="catalog-price">${product.price}</p>
      <p class="catalog-description">${product.description || ''}</p>
      <fieldset class="catalog-colors"><legend>Color</legend><div class="swatch-row"></div></fieldset>
      <p class="selected-color">Selected: <strong>${initial[0]}</strong></p>
      <a class="catalog-cta" href="${store + initialPath}" target="_blank" rel="noopener">Shop This Color <span aria-hidden="true">↗</span></a>`;

    const image = card.querySelector('img');
    const label = card.querySelector('.selected-color strong');
    const cta = card.querySelector('.catalog-cta');
    const row = card.querySelector('.swatch-row');
    const show = () => swapImage(image, imageFor(product, current, view), altFor(product, current, view));

    card.querySelectorAll('.view-toggle button').forEach(button => {
      button.addEventListener('click', () => {
        view = button.dataset.view;
        card.querySelectorAll('.view-toggle button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        show();
      });
      const warm = () => preload(imageFor(product, current, button.dataset.view));
      button.addEventListener('pointerenter', warm, { once: true });
      button.addEventListener('focus', warm, { once: true });
    });

    product.colors.forEach((color, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'color-swatch';
      button.setAttribute('aria-label', `Select ${color[0]} for ${product.name}`);
      button.setAttribute('aria-pressed', String(index === startIndex));
      button.title = color[0];
      button.style.setProperty('--swatch-a', color[1]);
      button.style.setProperty('--swatch-b', color[3] || color[1]);
      button.addEventListener('click', () => {
        row.querySelectorAll('.color-swatch').forEach(item => item.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        current = color;
        show();
        label.textContent = color[0];
        cta.href = store + (color[4] || product.path);
        cta.setAttribute('aria-label', `Shop ${product.name} in ${color[0]} on Printify`);
      });
      const warm = () => preload(imageFor(product, color, view));
      button.addEventListener('pointerenter', warm, { once: true });
      button.addEventListener('focus', warm, { once: true });
      row.append(button);
    });

    cta.setAttribute('aria-label', `Shop ${product.name} in ${initial[0]} on Printify`);
    card.dataset.collection = collection;
    return card;
  };

  const render = (id, products, collection) => {
    const target = document.getElementById(id);
    if (!target) return;
    products.forEach(product => target.append(createCard(product, collection)));
  };

  window.SJShop = { store, catalog, categories, products, collectionLabels, createCard, swapImage, preload, viewLabels };

  render('good-tree-products', catalog.goodTree, 'good-tree');
  render('tribe-products', catalog.tribe, 'tribe');
})();
