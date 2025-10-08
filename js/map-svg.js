// map-svg.js — ultra-light interactive SVG map
(() => {
  const tip = document.getElementById('tooltip');
  const sr  = document.getElementById('announcer');

  // Region copy (swap/expand as you like)
  const DATA = {
    EGYPT: {
      title: 'Egypt',
      text: 'Nile region; Exodus setting; contact with Patriarchs (Gen 12; 37–50).',
      color: '#fde2e4'
    },
    SINAI: {
      title: 'Sinai',
      text: 'Wilderness of the wandering; covenant at Horeb/Sinai.',
      color: '#e7e5e4'
    },
    CANAAN: {
      title: 'Canaan',
      text: 'Patriarchal sojourns; later Israel/Judah core.',
      color: '#cdeafe'
    },
    ASSYRIA: {
      title: 'Assyria',
      text: 'Northern empire; exile of the Northern Kingdom (722 BCE).',
      color: '#e9d5ff'
    },
    BABYLON: {
      title: 'Babylon',
      text: 'Neo-Babylonian empire; exile of Judah (586 BCE).',
      color: '#fde68a'
    },
    ARABIA: {
      title: 'Arabia',
      text: 'Trade routes & sojourns to the south/east.',
      color: '#dcfce7'
    }
  };

  const regions = document.querySelectorAll('svg .r');
  let active = null;

  function showTip(id, x, y) {
    const d = DATA[id];
    if (!d) return hideTip();
    tip.hidden = false;
    tip.style.left = (x + 14) + 'px';
    tip.style.top  = (y + 14) + 'px';
    tip.innerHTML = `<h4>${d.title}</h4><p>${d.text}</p>`;
  }
  function hideTip(){ tip.hidden = true; }

  function announce(msg){ sr.textContent = msg; }

  regions.forEach(el => {
    const id = el.id;
    const d  = DATA[id];

    // paint initial fill using data color (keeps a light-coded look)
    if (d?.color) el.style.fill = d.color;

    el.setAttribute('tabindex', '0'); // keyboard focusable

    el.addEventListener('pointerenter', e => {
      if (!active) el.classList.add('active');
      showTip(id, e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', e => showTip(id, e.clientX, e.clientY));
    el.addEventListener('pointerleave', () => {
      if (active !== el) el.classList.remove('active');
      hideTip();
    });

    el.addEventListener('click', () => {
      if (active && active !== el) active.classList.remove('active');
      active = el.classList.toggle('active') ? el : null;
      announce((DATA[id]?.title || id) + ' selected');
      // Hook: navigate or open side panel here
      // e.g., openDetailsPanel(id)
    });

    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });
})();
