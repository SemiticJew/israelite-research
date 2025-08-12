// js/breadcrumbs.js
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('crumbs');
  if (!el) return;

  let items = [];
  const raw = el.getAttribute('data-bc');
  if (raw) { try { items = JSON.parse(raw); } catch (_) {} }

  // Render
  if (items.length) {
    el.innerHTML = '';
    items.forEach((it, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = ' / ';
        el.appendChild(sep);
      }
      if (it.href && i < items.length - 1) {
        const a = document.createElement('a');
        a.href = it.href;
        a.textContent = it.label;
        el.appendChild(a);
      } else {
        const span = document.createElement('span');
        span.className = 'current';
        span.textContent = it.label;
        el.appendChild(span);
      }
    });
  }
});
