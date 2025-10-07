/* svg-land.js — add a subtle landmass silhouette behind regions */
document.addEventListener('DOMContentLoaded', () => {
  const svg = document.getElementById('isr-svg');
  if (!svg) return;

  const sea = svg.querySelector('rect');

  const land = document.createElementNS('http://www.w3.org/2000/svg','path');
  land.setAttribute('id','LAND');
  land.setAttribute('d',
    'M80,110 C240,60 470,70 710,120 C860,155 920,210 935,260 L940,360 C900,430 780,490 600,520 C370,540 210,505 120,440 L95,390 L85,330 Z'
  );
  land.setAttribute('fill','#f3efe2');
  land.setAttribute('stroke','#c8bea3');
  land.setAttribute('stroke-width','1');

  if (sea && sea.parentNode) {
    sea.parentNode.insertBefore(land, sea.nextSibling);
  } else {
    svg.insertBefore(land, svg.firstChild);
  }
});
