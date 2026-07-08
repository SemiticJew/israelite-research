// map-svg-loader.js — load external SVG maps (amCharts-style), add hover, tooltip, click
(() => {
  const host = document.getElementById('svgHost');
  const select = document.getElementById('mapSelect');
  const tip = document.getElementById('tooltip');
  const sr  = document.getElementById('announcer');
  let activeEl = null;

  async function fetchSVG(url) {
    try {
      const res = await fetch(url + '?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      return await res.text();
    } catch (e) {
      return `<div class="empty">Failed to load map: ${url}. ${e.message}</div>`;
    }
  }

  function clearHost() {
    host.innerHTML = '';
    activeEl = null;
  }

  function attachInteractions(svgEl) {
    const regions = svgEl.querySelectorAll('path[id], g[id], [data-name]');
    regions.forEach(region => {
      const label = region.getAttribute('title') || region.getAttribute('data-name') || region.id || 'Region';
      region.setAttribute('tabindex', '0');
      region.setAttribute('role', 'button');
      region.setAttribute('aria-label', label);

      region.addEventListener('pointerenter', (e) => {
        region.classList.add('region-hover');
        showTip(label, e.clientX, e.clientY);
      });
      region.addEventListener('pointermove', (e) => {
        showTip(label, e.clientX, e.clientY);
      });
      region.addEventListener('pointerleave', () => {
        region.classList.remove('region-hover');
        hideTip();
      });

      region.addEventListener('click', () => {
        if (activeEl && activeEl !== region) activeEl.classList.remove('region-active');
        activeEl = region.classList.toggle('region-active') ? region : null;
        announce(label + ' selected');
      });

      region.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          region.click();
        }
      });
    });
  }

  function showTip(title, x, y) {
    tip.hidden = false;
    tip.style.left = (x + 14) + 'px';
    tip.style.top  = (y + 14) + 'px';
    tip.innerHTML = `<h4>${title}</h4><p>Click to select.</p>`;
  }
  function hideTip(){ tip.hidden = true; }
  function announce(msg){ sr.textContent = msg; }

  async function loadMap(url) {
    clearHost();
    const markup = await fetchSVG(url);
    if (/^<svg[\s\S]*<\/svg>/i.test(markup)) {
      host.insertAdjacentHTML('afterbegin', markup);
      const svgEl = host.querySelector('svg');
      if (svgEl) attachInteractions(svgEl);
    } else {
      host.innerHTML = markup;
    }
  }

  loadMap(select.value);
  select.addEventListener('change', () => loadMap(select.value));
})();
