// timeline.js
// Minimal timeline render + add-marker form using localStorage.

(function () {
  const STORAGE_KEY = 'ir_timeline_markers_v1';

  function getMarkers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveMarkers(markers) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  }

  function addMarker(marker) {
    const markers = getMarkers();
    markers.push(marker);
    markers.sort((a, b) => (a.year || 0) - (b.year || 0));
    saveMarkers(markers);
  }

  function renderTimeline(listEl) {
    const markers = getMarkers();
    listEl.innerHTML = '';
    if (!markers.length) {
      listEl.innerHTML = '<p>No markers yet. Add the first one below.</p>';
      return;
    }
    markers.forEach(m => {
      const div = document.createElement('div');
      div.className = 'timeline-marker';
      div.innerHTML = `<strong>${m.year || 'Year?'}</strong> — ${m.title || 'Untitled'}<br/><span>${m.description || ''}</span>`;
      listEl.appendChild(div);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const timeline = document.getElementById('timeline');
    const form = document.getElementById('addMarkerForm');

    if (timeline) renderTimeline(timeline);

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        addMarker({
          year: parseInt(fd.get('year'), 10),
          title: fd.get('title'),
          description: fd.get('description'),
          lat: fd.get('lat') ? parseFloat(fd.get('lat')) : undefined,
          lng: fd.get('lng') ? parseFloat(fd.get('lng')) : undefined
        });
        form.reset();
        if (timeline) renderTimeline(timeline);
      });
    }
  });
})();

