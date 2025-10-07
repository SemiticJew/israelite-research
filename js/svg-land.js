/* svg-land.js — layered landmass with coastline + rivers for a map-like look */
document.addEventListener('DOMContentLoaded', () => {
  const svg = document.getElementById('isr-svg');
  if (!svg) return;

  const sea = svg.querySelector('rect');

  // Remove previous land if present
  ['LAND','LANDGROUP'].forEach(id => {
    const old = svg.querySelector('#'+id);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  });

  // Group to hold land layers
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.setAttribute('id','LANDGROUP');

  // Main land fill (stylized Old World around Eastern Med)
  const landFill = document.createElementNS('http://www.w3.org/2000/svg','path');
  landFill.setAttribute('d',
    'M120,100 C300,40 520,60 720,110 C860,145 940,210 960,270 L965,350 C930,420 820,500 620,540 C410,565 210,520 130,450 L105,395 L95,330 Z'
  );
  landFill.setAttribute('fill','#f5efe1');

  // Coastline outline
  const coast = document.createElementNS('http://www.w3.org/2000/svg','path');
  coast.setAttribute('d',
    'M120,100 C300,40 520,60 720,110 C860,145 940,210 960,270 L965,350 C930,420 820,500 620,540 C410,565 210,520 130,450 L105,395 L95,330 Z'
  );
  coast.setAttribute('fill','none');
  coast.setAttribute('stroke','#9aa6b2');
  coast.setAttribute('stroke-width','1.6');

  // Shoreline highlight (thin inner stroke)
  const shore = document.createElementNS('http://www.w3.org/2000/svg','path');
  shore.setAttribute('d',
    'M122,108 C302,52 522,70 718,118 C854,150 932,212 950,268 L955,344 C922,410 820,492 628,532 C426,558 234,516 144,448 L118,396 L108,338 Z'
  );
  shore.setAttribute('fill','none');
  shore.setAttribute('stroke','#c8d2de');
  shore.setAttribute('stroke-width','1');

  // Nile river (stylized)
  const nile = document.createElementNS('http://www.w3.org/2000/svg','path');
  nile.setAttribute('d','M230,500 L238,488 L246,472 L254,452 L262,430 L270,410 L278,390 L286,370 L294,350');
  nile.setAttribute('fill','none');
  nile.setAttribute('stroke','#7bb7ff');
  nile.setAttribute('stroke-width','1.2');
  nile.setAttribute('stroke-linecap','round');

  // Nile delta
  const delta = document.createElementNS('http://www.w3.org/2000/svg','path');
  delta.setAttribute('d','M250,420 L270,410 L290,418 L272,430 Z');
  delta.setAttribute('fill','#e2f2ff');
  delta.setAttribute('stroke','#9cc9ff');
  delta.setAttribute('stroke-width','0.8');

  // Euphrates (stylized)
  const euphrates = document.createElementNS('http://www.w3.org/2000/svg','path');
  euphrates.setAttribute('d','M610,340 L602,330 L594,318 L586,304 L578,292 L570,280 L562,268 L554,256');
  euphrates.setAttribute('fill','none');
  euphrates.setAttribute('stroke','#7bb7ff');
  euphrates.setAttribute('stroke-width','1.1');
  euphrates.setAttribute('stroke-linecap','round');

  // Tigris (stylized)
  const tigris = document.createElementNS('http://www.w3.org/2000/svg','path');
  tigris.setAttribute('d','M636,338 L628,326 L620,312 L612,298 L604,286 L596,274 L588,262');
  tigris.setAttribute('fill','none');
  tigris.setAttribute('stroke','#7bb7ff');
  tigris.setAttribute('stroke-width','1.1');
  tigris.setAttribute('stroke-linecap','round');

  // Append in correct stacking order
  g.appendChild(landFill);
  g.appendChild(shore);
  g.appendChild(coast);
  g.appendChild(delta);
  g.appendChild(nile);
  g.appendChild(euphrates);
  g.appendChild(tigris);

  if (sea && sea.parentNode) {
    sea.parentNode.insertBefore(g, sea.nextSibling);
  } else {
    svg.insertBefore(g, svg.firstChild);
  }
});
