/* extra-sources-atlas.js — Extra-Biblical Sources research atlas (/extra-biblical-sources.html).

   One amCharts 5 map chart and one country series drive both views: "Globe" (orthographic, drag to
   rotate — the default) and "Flat Map" (Mercator, drag to pan). Switching view only changes the
   chart's projection and pan mode, so the highlighted regions, the selected region and its open
   evidence panel are shared by both. Regions come from data/region-notes.json, matched to map
   countries by ISO code or by title exactly as before; shared links (#region=EG) still open a region.

   The searchable region index lists the same matched regions and is the keyboard route into the map.
   All note text is inserted as text (never as HTML). */
(function () {
  const $ = id => document.getElementById(id);
  const noteStatusEl = $('note-status'), noteKeysEl = $('note-keys'), noteMatchEl = $('note-matched'), totalRegionsEl = $('total-regions');
  const stateEl = $('atlasState'), stateText = $('atlasStateText'), retryBtn = $('atlasRetry');
  const listEl = $('regionList'), filterEl = $('regionFilter'), countEl = $('regionCount'), noMatchEl = $('regionNoMatch');
  const drawer = $('drawer'), scrim = $('drawer-scrim');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const hint = flat => (flat ? 'Drag to pan' : 'Drag to rotate') + (touch ? ' · Pinch to zoom' : ' · Scroll to zoom');

  let NOTES = {}, NAME_INDEX = {}, CURRENT_REGION = null, notesOk = true;
  let world = null, chart = null, root = null, graticule = null;
  let REGIONS = [];                // [{id, name, polygon}] — matched regions, sorted by name
  let view = 'globe';
  let returnFocus = null;

  /* ---------- states ---------- */
  function showState(kind, msg) {
    stateEl.hidden = false;
    stateEl.dataset.kind = kind;
    stateText.textContent = msg;
    retryBtn.hidden = kind !== 'error';
  }
  function hideState() { stateEl.hidden = true; }
  retryBtn.addEventListener('click', () => location.reload());

  /* ---------- data ---------- */
  async function loadNotes() {
    try {
      const r = await fetch('data/region-notes.json?v=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      NOTES = await r.json();
    } catch (e) { NOTES = {}; notesOk = false; }
    NAME_INDEX = {};
    for (const [, v] of Object.entries(NOTES)) {
      if (v && v.title) NAME_INDEX[String(v.title).trim().toUpperCase()] = v;
    }
    const c = Object.keys(NOTES).length;
    noteStatusEl.textContent = c ? 'loaded' : 'empty';
    noteKeysEl.textContent = String(c);
  }

  function polyCode(mp) { const ctx = mp?.dataItem?.dataContext || {}; return (ctx.id || ctx.iso_a2 || ctx.iso_a3 || '').toString().trim().toUpperCase(); }
  function polyName(mp) { const ctx = mp?.dataItem?.dataContext || {}; return (ctx.name || '').toString().trim(); }
  const matchNote = mp => NOTES[polyCode(mp)] || NAME_INDEX[polyName(mp).toUpperCase()] || null;

  /* ---------- evidence panel ---------- */
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function extLink(href, text) { const a = el('a', null, text); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; }
  function section(id, title, count) {
    const s = el('section', 'ev-sec'); s.id = id;
    const h = el('h3', 'ev-sec__title', title);
    if (count != null) h.appendChild(el('span', 'ev-sec__count', String(count)));
    s.appendChild(h);
    return s;
  }

  function openDrawer(payload) {
    CURRENT_REGION = payload || {};
    const body = $('drawer-body'), title = $('drawer-title'), tag = $('drawer-region-id'), toc = $('drawer-toc');
    const regionTitle = payload.title || payload.name || 'Region';
    const regionId = payload.id || payload.code || '';
    title.textContent = regionTitle;
    tag.textContent = regionId || '—';
    drawer.dataset.regionId = regionId;
    drawer.dataset.regionTitle = regionTitle;
    body.innerHTML = ''; toc.innerHTML = '';
    const tocItems = [];

    if (payload.summary) {
      const s = section('ev-summary', 'Summary');
      s.appendChild(el('p', 'ev-summary', payload.summary));
      body.appendChild(s); tocItems.push(['ev-summary', 'Summary']);
    }

    const bib = Array.isArray(payload.biblical_refs) ? payload.biblical_refs : [];
    if (bib.length) {
      const s = section('ev-bible', 'Biblical References', bib.length);
      const ol = el('ol', 'ev-refs');
      bib.forEach(r => {
        const li = el('li', 'ref');
        li.appendChild(el('b', 'ref__verse', r.verse || ''));
        li.appendChild(el('p', 'ref__note', r.note || ''));
        ol.appendChild(li);
      });
      s.appendChild(ol);
      body.appendChild(s); tocItems.push(['ev-bible', 'Biblical References']);
    }

    const hist = Array.isArray(payload.historical_refs) ? payload.historical_refs : [];
    if (hist.length) {
      const s = section('ev-history', 'Historical & Scholarly Notes', hist.length);
      const ol = el('ol', 'ev-hist');
      hist.forEach(h => {
        const li = el('li', 'hist');
        // What the note asserts …
        const claim = el('div', 'hist__claim');
        claim.appendChild(el('span', 'hist__label', 'Claim'));
        claim.appendChild(el('p', 'claim', h.claim || ''));
        li.appendChild(claim);
        // … and where it comes from, set apart as the citation.
        const cite = el('div', 'hist__cite');
        if (h.source || Number.isFinite(h.year) || h.confidence) {
          cite.appendChild(el('span', 'hist__label', 'Source'));
          const meta = el('p', 'meta');
          if (h.source) meta.appendChild(h.link ? extLink(h.link, h.source) : el('span', 'hist__src', h.source));
          if (Number.isFinite(h.year)) meta.appendChild(el('span', 'badge badge--year', h.year < 0 ? `${Math.abs(h.year)} BCE` : `${h.year} CE`));
          if (h.confidence) { const b = el('span', 'badge badge--conf'); b.append(el('span', 'badge__k', 'Confidence '), document.createTextNode(h.confidence)); meta.appendChild(b); }
          cite.appendChild(meta);
        }
        if (h.book) {
          const b = h.book, book = el('div', 'meta hist__book');
          if (b.cover_url) { const img = el('img'); img.src = b.cover_url; img.alt = 'Cover'; img.loading = 'lazy'; book.appendChild(img); }
          const info = [b.title, b.author, b.publisher, b.year, b.pages].filter(Boolean).join(', ');
          const p = el('p'); if (b.link) p.appendChild(extLink(b.link, info)); else p.textContent = info;
          book.appendChild(p); cite.appendChild(book);
        }
        if (cite.childNodes.length) li.appendChild(cite);
        if (Array.isArray(h.images) && h.images.length) {
          const g = el('div', 'hist__images');
          h.images.forEach(im => {
            const thumb = im.thumb || im.path || im.url, full = im.full || im.url || im.path || thumb;
            const a = el('a'); a.href = full; a.target = '_blank'; a.rel = 'noopener';
            const img = el('img'); img.src = thumb; img.srcset = `${thumb} 1x, ${full} 2x`; img.loading = 'lazy'; img.decoding = 'async'; img.alt = im.alt || 'image';
            a.appendChild(img); g.appendChild(a);
          });
          li.appendChild(g);
        }
        ol.appendChild(li);
      });
      s.appendChild(ol);
      body.appendChild(s); tocItems.push(['ev-history', 'Historical & Scholarly Notes']);
    }

    if (!body.childNodes.length) {
      body.appendChild(el('p', 'ev-empty', 'No regional note has been written for this region yet.'));
    }
    if (tocItems.length > 1) {
      tocItems.forEach(([id, label]) => {
        const a = el('a', null, label); a.href = '#' + id;
        a.addEventListener('click', e => { e.preventDefault(); const t = $(id); if (t) t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); });
        toc.appendChild(a);
      });
    }
    toc.hidden = tocItems.length < 2;
    body.scrollTop = 0;

    if (!drawer.classList.contains('open')) returnFocus = document.activeElement;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    scrim.hidden = false;
    document.documentElement.classList.add('atlas-panel-open');
    markListSelection(regionId);
    title.focus({ preventScroll: true });
  }

  function closeDrawer() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    scrim.hidden = true;
    document.documentElement.classList.remove('atlas-panel-open');
    if (world) world.mapPolygons.each(p => p.set('active', false));
    markListSelection(null);
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  $('drawer-close').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });

  $('copy-link').addEventListener('click', async () => {
    const btn = $('copy-link'), label = btn.querySelector('span');
    const regionId = (CURRENT_REGION && CURRENT_REGION.id) || drawer.dataset.regionId || '';
    const url = new URL(window.location.href);
    if (regionId) url.hash = 'region=' + encodeURIComponent(regionId);
    const text = url.toString();
    try {
      await navigator.clipboard.writeText(text);
      label.textContent = 'Copied';
      setTimeout(() => { label.textContent = 'Copy Link'; }, 1400);
    } catch (e) {
      window.prompt('Copy this link:', text);
      label.textContent = 'Copy Link';
    }
  });

  /* ---------- region index ---------- */
  function counts(note) {
    return [Array.isArray(note.biblical_refs) ? note.biblical_refs.length : 0, Array.isArray(note.historical_refs) ? note.historical_refs.length : 0];
  }
  function renderList() {
    listEl.innerHTML = '';
    REGIONS.forEach(r => {
      const li = el('li');
      const btn = el('button', 'atlas__item');
      btn.type = 'button';
      btn.dataset.regionId = r.id;
      const [b, h] = counts(r.note);
      const parts = r.name.split('|').map(s => s.trim()).filter(Boolean);
      btn.appendChild(el('span', 'atlas__item-name', parts[0] || r.name));
      if (parts.length > 1) btn.appendChild(el('span', 'atlas__item-alt', parts.slice(1).join(' · ')));
      const meta = el('span', 'atlas__item-meta');
      meta.appendChild(el('span', 'atlas__code', r.id));
      meta.appendChild(el('span', null, `${b} biblical · ${h} historical`));
      btn.appendChild(meta);
      btn.setAttribute('aria-label', `${r.name}: ${b} biblical references, ${h} historical notes`);
      btn.addEventListener('click', () => openRegionById(r.id));
      li.appendChild(btn);
      listEl.appendChild(li);
    });
    applyFilter();
  }
  function applyFilter() {
    const q = filterEl.value.trim().toLowerCase();
    let shown = 0;
    listEl.querySelectorAll('li').forEach(li => {
      const btn = li.firstChild, r = REGIONS.find(x => x.id === btn.dataset.regionId);
      const hit = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase() === q || polyName(r.polygon).toLowerCase().includes(q);
      li.hidden = !hit; if (hit) shown++;
    });
    noMatchEl.hidden = shown > 0 || !REGIONS.length;
    countEl.textContent = REGIONS.length
      ? (q ? `${shown} of ${REGIONS.length} regions` : `${REGIONS.length} highlighted regions`)
      : (notesOk ? 'No highlighted regions.' : 'Regional notes could not be loaded.');
  }
  filterEl.addEventListener('input', applyFilter);
  filterEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const first = listEl.querySelector('li:not([hidden]) button'); if (first) { e.preventDefault(); first.click(); } }
    if (e.key === 'ArrowDown') { const first = listEl.querySelector('li:not([hidden]) button'); if (first) { e.preventDefault(); first.focus(); } }
  });
  listEl.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...listEl.querySelectorAll('li:not([hidden]) button')];
    const i = items.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault();
    const next = items[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) next.focus(); else if (e.key === 'ArrowUp') filterEl.focus();
  });
  function markListSelection(id) {
    listEl.querySelectorAll('.atlas__item').forEach(b => {
      const on = !!id && b.dataset.regionId === id;
      b.classList.toggle('is-selected', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }

  /* ---------- map ---------- */
  const THEME = {
    light: { ocean: '#E8EEF5', land: '#D3DBE5', landStroke: '#A9B6C7', grid: '#9FB0C5', matched: '#F17300', matchedStroke: '#0B2340', hover: '#FFB066', active: '#0B2340' },
    dark:  { ocean: '#0A1628', land: '#22324A', landStroke: '#3A4D68', grid: '#5A6E89', matched: '#F17300', matchedStroke: '#FBF8F3', hover: '#F7A04F', active: '#FBF8F3' }
  };
  const theme = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? THEME.dark : THEME.light);

  function paint() {
    if (!chart) return;
    const t = theme();
    chart.chartContainer.get('background').set('fill', am5.color(t.ocean));
    if (graticule) graticule.mapLines.template.setAll({ stroke: am5.color(t.grid) });
    world.mapPolygons.template.setAll({ fill: am5.color(t.land), stroke: am5.color(t.landStroke) });
    world.mapPolygons.template.states.lookup('hover').set('fill', am5.color(t.hover));
    world.mapPolygons.template.states.lookup('active').set('fill', am5.color(t.active));
    world.mapPolygons.each(mp => {
      if (matchNote(mp)) mp.setAll({ fill: am5.color(t.matched), stroke: am5.color(t.matchedStroke), strokeWidth: 1.2 });
      else mp.setAll({ fill: am5.color(t.land), stroke: am5.color(t.landStroke) });
    });
  }

  function findPolygon(id) {
    let found = null;
    if (world) world.mapPolygons.each(mp => { if (polyCode(mp) === String(id).toUpperCase()) found = mp; });
    return found;
  }

  function focusPolygon(mp) {
    try {
      if (view === 'globe') {
        const c = am5map.getGeoCentroid(mp.dataItem.get('geometry'));
        chart.animate({ key: 'rotationX', to: -c.longitude, duration: reduceMotion ? 0 : 900, easing: am5.ease.out(am5.ease.cubic) });
        chart.animate({ key: 'rotationY', to: -c.latitude, duration: reduceMotion ? 0 : 900, easing: am5.ease.out(am5.ease.cubic) });
      }
      chart.zoomToDataItem(mp.dataItem);
    } catch (e) { /* keep the panel even if the map cannot move */ }
  }

  function openRegionById(id) {
    if (!id) return false;
    const found = findPolygon(id);
    if (!found) return false;
    const hit = matchNote(found) || {};
    const payload = Object.assign({}, hit, { id: polyCode(found), name: polyName(found) });
    world.mapPolygons.each(p => p.set('active', p === found));
    openDrawer(payload);
    focusPolygon(found);
    return true;
  }

  function setView(next) {
    if (!chart || next === view) return;
    view = next;
    document.querySelectorAll('.atlas__viewbtn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    const flat = view === 'flat';
    chart.setAll({
      projection: flat ? am5map.geoMercator() : am5map.geoOrthographic(),
      panX: flat ? 'translateX' : 'rotateX',
      panY: flat ? 'translateY' : 'rotateY',
      rotationX: 0, rotationY: 0
    });
    $('atlasHint').textContent = hint(flat);
    $('resetLabel').textContent = flat ? 'Reset Map' : 'Reset Globe';
    document.getElementById('atlas').dataset.atlasView = view;
    // keep the selected region and its panel; re-centre on it in the new view
    const selId = drawer.classList.contains('open') ? drawer.dataset.regionId : null;
    setTimeout(() => {
      chart.goHome(0);
      const mp = selId && findPolygon(selId);
      if (mp) { world.mapPolygons.each(p => p.set('active', p === mp)); setTimeout(() => focusPolygon(mp), 60); }
    }, 60);
  }
  document.querySelectorAll('.atlas__viewbtn').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

  function openFromHash() {
    const hash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    const m = /^region=(.+)$/i.exec(hash);
    if (m) openRegionById(m[1]);
  }

  async function start() {
    $('atlasHint').textContent = hint(false);
    showState('loading', 'Loading the map…');
    await loadNotes();
    if (typeof am5 === 'undefined' || typeof am5map === 'undefined' || typeof am5geodata_worldLow === 'undefined') {
      showState('error', 'The map could not be loaded. Check your connection and try again.');
      countEl.textContent = 'The region index needs the map to load.';
      return;
    }
    am5.ready(() => {
      root = am5.Root.new('chart-globe');
      if (!reduceMotion && typeof am5themes_Animated !== 'undefined') root.setThemes([am5themes_Animated.new(root)]);
      chart = root.container.children.push(am5map.MapChart.new(root, {
        panX: 'rotateX', panY: 'rotateY', projection: am5map.geoOrthographic(),
        animationDuration: reduceMotion ? 0 : 900, maxPanOut: 0.2
      }));
      chart.chartContainer.set('background', am5.Rectangle.new(root, { fill: am5.color(theme().ocean) }));

      try {
        graticule = chart.series.unshift(am5map.GraticuleSeries.new(root, {}));
        graticule.mapLines.template.setAll({ stroke: am5.color(theme().grid), strokeOpacity: .32, strokeWidth: .6 });
      } catch (e) { graticule = null; }

      world = chart.series.push(am5map.MapPolygonSeries.new(root, { geoJSON: am5geodata_worldLow, exclude: ['AQ'] }));
      world.mapPolygons.template.setAll({
        tooltipText: '{name}', interactive: true, toggleKey: 'active',
        fill: am5.color(theme().land), stroke: am5.color(theme().landStroke), strokeWidth: 0.65, cursorOverStyle: 'pointer'
      });
      world.mapPolygons.template.states.create('hover', { fill: am5.color(theme().hover) });
      world.mapPolygons.template.states.create('active', { fill: am5.color(theme().active) });

      const zoom = chart.set('zoomControl', am5map.ZoomControl.new(root, {}));
      zoom.homeButton.set('visible', true);
      zoom.homeButton.events.on('click', () => chart.goHome());
      $('resetGlobe').addEventListener('click', () => { chart.setAll({ rotationX: 0, rotationY: 0 }); chart.goHome(); });

      world.mapPolygons.template.adapters.add('tooltipText', (def, t) => {
        const h = matchNote(t);
        if (h) {
          const name = h.title || polyName(t) || '{name}';
          const [b, hc] = counts(h);
          return `${name}\nBiblical refs: ${b} · Historical notes: ${hc}\nClick to open evidence panel`;
        }
        return '{name}\nNo regional note loaded';
      });
      world.mapPolygons.template.events.on('click', ev => {
        const mp = ev.target;
        const hit = matchNote(mp) || {};
        const payload = Object.assign({}, hit, { id: polyCode(mp), name: polyName(mp) });
        world.mapPolygons.each(p => p.set('active', p === mp));
        openDrawer(payload);
      });

      world.events.on('datavalidated', () => {
        let total = 0, matched = 0;
        REGIONS = [];
        world.mapPolygons.each(mp => {
          total++;
          const hit = matchNote(mp);
          if (hit) { matched++; REGIONS.push({ id: polyCode(mp), name: hit.title || polyName(mp), note: hit, polygon: mp }); }
        });
        REGIONS.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        totalRegionsEl.textContent = String(total);
        noteMatchEl.textContent = String(matched);
        paint();
        renderList();
        if (!notesOk) showState('error', 'The regional notes could not be loaded, so no regions are highlighted. Try again in a moment.');
        else if (!matched) showState('empty', 'No highlighted regions are available yet.');
        else hideState();
        setTimeout(openFromHash, 450);
      });

      // follow the site's light / dark switch
      new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    });
  }

  window.addEventListener('hashchange', openFromHash);
  start();
})();
