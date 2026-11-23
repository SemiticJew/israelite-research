// Shop showcase: featured pieces, tilt, entrance reveals and scroll transitions.
// Plain CSS + JS; every effect is skipped when the visitor prefers reduced motion.
(() => {
  'use strict';

  const shop = window.SJShop;
  const root = document.querySelector('.shop');
  if (!root) return;

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionOK = () => !reduceQuery.matches;
  const syncMotionClass = () => document.body.classList.toggle('shop-motion', motionOK());
  syncMotionClass();
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', syncMotionClass);

  /* ---------- Featured pieces ---------- */
  const setupSpotlight = () => {
    if (!shop) return;
    const { catalog, store, swapImage, preload, viewLabels } = shop;

    // TRIBE. | 12. snapback, opening on the approved Solid Black / White colorway.
    const hat = catalog.tribe.find(p => p.name.startsWith('TRIBE. | 12.'));
    const hatSpot = document.getElementById('spot-tribe-hat');
    if (hat && hatSpot) {
      const img = hatSpot.querySelector('img');
      const row = hatSpot.querySelector('.spot-swatches');
      const label = hatSpot.querySelector('.selected-color strong');
      const cta = hatSpot.querySelector('.spot-cta');
      const start = hat.colors.findIndex(c => c[0] === 'Solid Black / White');
      hat.colors.forEach((color, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'color-swatch';
        button.title = color[0];
        button.setAttribute('aria-label', `Select ${color[0]} for ${hat.name}`);
        button.setAttribute('aria-pressed', String(index === start));
        button.style.setProperty('--swatch-a', color[1]);
        button.style.setProperty('--swatch-b', color[3] || color[1]);
        button.addEventListener('click', () => {
          row.querySelectorAll('.color-swatch').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
          swapImage(img, color[2], `${hat.name} in ${color[0]}`);
          label.textContent = color[0];
          cta.href = store + (color[4] || hat.path);
          cta.setAttribute('aria-label', `Shop ${hat.name} in ${color[0]} on Printify`);
        });
        const warm = () => preload(color[2]);
        button.addEventListener('pointerenter', warm, { once: true });
        button.addEventListener('focus', warm, { once: true });
        row.append(button);
      });
      row.closest('fieldset').hidden = false;
    }

    // Good Tree Vintage Hoodie: opens on Vintage Black; every real color, each with
    // front, back and folded mockups from the Printify product page.
    const hoodie = catalog.goodTree.find(p => p.views);
    const hoodieSpot = document.getElementById('spot-good-tree-hoodie');
    if (hoodie && hoodieSpot) {
      const img = hoodieSpot.querySelector('img');
      const swatches = hoodieSpot.querySelector('.spot-swatches');
      const group = hoodieSpot.querySelector('.spot-views');
      const label = hoodieSpot.querySelector('.selected-color strong');
      const cta = hoodieSpot.querySelector('.spot-cta');
      const views = ['front', 'back', 'folded'];
      let color = hoodie.colors.find(c => c[0] === 'Vintage Black') || hoodie.colors[0];
      let view = 'front';
      const srcFor = (c, v) => (hoodie.views[c[0]] && hoodie.views[c[0]][v]) || c[2];
      const show = () => {
        swapImage(img, srcFor(color, view), `Good Tree Vintage Hoodie in ${color[0]}, ${viewLabels[view].toLowerCase()} view`);
        label.textContent = `${color[0]} · ${viewLabels[view]}`;
        cta.href = store + (color[4] || hoodie.path);
        cta.setAttribute('aria-label', `Shop the Good Tree Vintage Hoodie in ${color[0]} on Printify`);
      };
      hoodie.colors.forEach(c => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'color-swatch';
        button.title = c[0];
        button.setAttribute('aria-label', `Select ${c[0]} for Good Tree Vintage Hoodie`);
        button.setAttribute('aria-pressed', String(c === color));
        button.style.setProperty('--swatch-a', c[1]);
        button.style.setProperty('--swatch-b', c[3] || c[1]);
        button.addEventListener('click', () => {
          swatches.querySelectorAll('.color-swatch').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
          color = c;
          show();
        });
        const warm = () => preload(srcFor(c, view));
        button.addEventListener('pointerenter', warm, { once: true });
        button.addEventListener('focus', warm, { once: true });
        swatches.append(button);
      });
      views.forEach((v, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.view = v;
        button.textContent = viewLabels[v];
        button.setAttribute('aria-pressed', String(index === 0));
        button.addEventListener('click', () => {
          group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
          view = v;
          show();
        });
        const warm = () => preload(srcFor(color, v));
        button.addEventListener('pointerenter', warm, { once: true });
        button.addEventListener('focus', warm, { once: true });
        group.append(button);
      });
      swatches.closest('fieldset').hidden = false;
      group.hidden = false;
    }
  };

  /* ---------- 3D-style tilt (hover with a mouse, drag with mouse, touch or pen) ---------- */
  const MAX = 9;
  const clamp = (n, m) => Math.max(-m, Math.min(m, n));

  const bindTilt = (el) => {
    el.classList.add('tilt');
    let raf = 0;
    let drag = null;

    const paint = (rx, ry, active) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        el.classList.toggle('is-tilting', active);
      });
    };
    const glare = (e, r) => {
      el.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    };
    const reset = () => { drag = null; el.classList.remove('is-dragging'); paint(0, 0, false); };

    el.addEventListener('pointermove', e => {
      if (!motionOK()) return;
      const r = el.getBoundingClientRect();
      if (drag && e.pointerId === drag.id) {
        glare(e, r);
        const dx = (e.clientX - drag.x) / r.width;
        const dy = (e.clientY - drag.y) / r.height;
        paint(clamp(-dy * MAX * 3, MAX * 1.6), clamp(dx * MAX * 3, MAX * 1.6), true);
      } else if (!drag && e.pointerType === 'mouse') {
        glare(e, r);
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        paint((0.5 - py) * 2 * MAX, (px - 0.5) * 2 * MAX, true);
      }
    });
    el.addEventListener('pointerdown', e => {
      if (!motionOK() || e.button > 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.classList.add('is-dragging');
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
    });
    el.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) reset(); });
    el.addEventListener('pointercancel', reset); // e.g. the browser took over for vertical scrolling
    el.addEventListener('pointerleave', e => { if (!drag || e.pointerType === 'mouse') reset(); });
    el.addEventListener('lostpointercapture', () => { if (drag) reset(); });
  };

  /* ---------- Entrance reveals ---------- */
  const revealIO = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;

  const reveal = elements => elements.forEach(el => {
    if (el.hasAttribute('data-reveal')) return;
    el.setAttribute('data-reveal', '');
    if (revealIO) revealIO.observe(el); else el.classList.add('is-in');
  });

  // Tilt + staggered reveal for product cards; also used for cards rendered later by category views.
  const enhance = container => {
    container.querySelectorAll('.catalog-image:not(.tilt), .spot-tilt:not([data-tilt-bound])').forEach(el => { el.dataset.tiltBound = ''; bindTilt(el); });
    container.querySelectorAll('.product-grid').forEach(grid => {
      [...grid.children].forEach((card, i) => card.style.setProperty('--reveal-delay', (i % 4) * 90 + 'ms'));
      reveal([...grid.children]);
    });
  };

  const setupReveal = () => {
    reveal([...root.querySelectorAll('.section-heading, .showcase-head, .spot, .category-intro')]);
  };

  /* ---------- Scroll-linked product transitions in the featured section ---------- */
  const setupScroll = () => {
    const spots = [...root.querySelectorAll('.spot')];
    if (!spots.length || !('IntersectionObserver' in window)) return;
    const visible = new Set();
    let ticking = false;

    const update = () => {
      ticking = false;
      if (!motionOK()) { spots.forEach(s => s.style.removeProperty('--sp')); return; }
      const vh = window.innerHeight;
      visible.forEach(spot => {
        const r = spot.getBoundingClientRect();
        // -1 when the piece's centre sits at the bottom edge, 0 at mid-screen, 1 at the top edge.
        const p = Math.max(-1, Math.min(1, ((vh / 2) - (r.top + r.height / 2)) / (vh / 2 + r.height / 2)));
        spot.style.setProperty('--sp', p.toFixed(3));
      });
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      request();
    });
    spots.forEach(s => io.observe(s));
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
  };

  setupSpotlight();
  enhance(root);
  setupReveal();
  setupScroll();
  if (shop) shop.enhance = enhance;
})();
