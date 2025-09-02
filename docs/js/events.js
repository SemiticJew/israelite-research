// /israelite-research/js/events.js
(function () {
  const state = {
    today: new Date(),
    view: new Date(), // month being displayed
    events: [],       // {id, title, date (YYYY-MM-DD), time, location, desc}
    selectedDate: null
  };

  const els = {
    title: null, grid: null,
    prev: null, next: null, today: null, addBtn: null,
    modal: null, closeModal: null, form: null, del: null, cancel: null,
    id: null, titleIn: null, dateIn: null, timeIn: null, locIn: null, descIn: null
  };

  const STORAGE_KEY = 'ir_events_v1';

  function fmtYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function parseYMD(s) {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.events = raw ? JSON.parse(raw) : [];
    } catch { state.events = []; }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  }

  function setMonth(delta) {
    state.view.setMonth(state.view.getMonth()+delta);
    render();
  }
  function goToday() {
    state.view = new Date(state.today.getFullYear(), state.today.getMonth(), 1);
    render();
  }

  function openModal(dateStr, eventId=null) {
    state.selectedDate = dateStr || fmtYMD(new Date());
    // Reset form
    els.form.reset();
    els.id.value = '';
    els.deleteEvent.classList.remove('show');

    if (eventId) {
      const ev = state.events.find(e => e.id === eventId);
      if (ev) {
        els.id.value = ev.id;
        els.titleIn.value = ev.title || '';
        els.dateIn.value = ev.date || state.selectedDate;
        els.timeIn.value = ev.time || '';
        els.locIn.value = ev.location || '';
        els.descIn.value = ev.desc || '';
        els.deleteEvent.classList.add('show');
        document.getElementById('eventModalTitle').textContent = 'Edit Event';
      }
    } else {
      els.dateIn.value = state.selectedDate;
      document.getElementById('eventModalTitle').textContent = 'Add Event';
    }

    els.modal.classList.add('open');
    els.modal.setAttribute('aria-hidden','false');
    els.titleIn.focus();
  }
  function closeModal() {
    els.modal.classList.remove('open');
    els.modal.setAttribute('aria-hidden','true');
  }

  function render() {
    // Title
    const month = state.view.toLocaleString(undefined, {month:'long'});
    const year  = state.view.getFullYear();
    els.title.textContent = `${month} ${year}`;

    // Clear old date cells (keep DOW headers: first 7 children)
    const toRemove = Array.from(els.grid.children).slice(7);
    toRemove.forEach(n => n.remove());

    // Build dates
    const first = new Date(year, state.view.getMonth(), 1);
    const startDay = first.getDay(); // 0 Sun ... 6 Sat
    const daysInMonth = new Date(year, state.view.getMonth()+1, 0).getDate();

    // Leading blanks
    for (let i=0;i<startDay;i++){
      const cell = document.createElement('div');
      cell.className = 'cal-cell cal-empty';
      els.grid.appendChild(cell);
    }

    // Actual days
    for (let d=1; d<=daysInMonth; d++){
      const dateObj = new Date(year, state.view.getMonth(), d);
      const dateStr = fmtYMD(dateObj);

      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      if (fmtYMD(state.today) === dateStr) cell.classList.add('is-today');

      const top = document.createElement('div');
      top.className = 'cal-date';
      top.textContent = d;
      cell.appendChild(top);

      // Events chips
      const dayEvents = state.events.filter(e => e.date === dateStr);
      dayEvents.forEach(ev => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'evt-chip';
        chip.textContent = ev.time ? `${ev.time} — ${ev.title}` : ev.title;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal(dateStr, ev.id);
        });
        cell.appendChild(chip);
      });

      // Click to add event on this date
      cell.addEventListener('click', () => openModal(dateStr, null));

      els.grid.appendChild(cell);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const id = els.id.value || `e_${Date.now()}`;
    const ev = {
      id,
      title: els.titleIn.value.trim(),
      date:  els.dateIn.value,
      time:  els.timeIn.value,
      location: els.locIn.value.trim(),
      desc:  els.descIn.value.trim()
    };
    if (!ev.title || !ev.date) return;

    const idx = state.events.findIndex(x => x.id === id);
    if (idx >= 0) state.events[idx] = ev; else state.events.push(ev);
    save();
    closeModal();
    render();
  }

  function onDelete() {
    const id = els.id.value;
    if (!id) return closeModal();
    state.events = state.events.filter(e => e.id !== id);
    save();
    closeModal();
    render();
  }

  function keyHandler(e){
    if (e.key === 'Escape') closeModal();
    // Arrow month nav
    if (e.key === 'ArrowLeft' && !els.modal.classList.contains('open')) setMonth(-1);
    if (e.key === 'ArrowRight' && !els.modal.classList.contains('open')) setMonth(1);
  }

  function init() {
    els.title = document.getElementById('calTitle');
    els.grid  = document.querySelector('.cal-grid');
    els.prev  = document.getElementById('prevMonth');
    els.next  = document.getElementById('nextMonth');
    els.today = document.getElementById('todayBtn');
    els.addBtn= document.getElementById('addEventBtn');

    els.modal = document.getElementById('eventModal');
    els.closeModal = document.getElementById('closeModal');
    els.form  = document.getElementById('eventForm');
    els.del   = document.getElementById('deleteEvent');
    els.cancel= document.getElementById('cancelEvent');

    els.id    = document.getElementById('eventId');
    els.titleIn = document.getElementById('eventTitle');
    els.dateIn  = document.getElementById('eventDate');
    els.timeIn  = document.getElementById('eventTime');
    els.locIn   = document.getElementById('eventLocation');
    els.descIn  = document.getElementById('eventDesc');

    load();
    state.view = new Date(state.today.getFullYear(), state.today.getMonth(), 1);

    els.prev.addEventListener('click', () => setMonth(-1));
    els.next.addEventListener('click', () => setMonth(1));
    els.today.addEventListener('click', goToday);
    els.addBtn.addEventListener('click', () => openModal(fmtYMD(new Date())));

    els.closeModal.addEventListener('click', closeModal);
    els.cancel.addEventListener('click', closeModal);
    els.form.addEventListener('submit', onSubmit);
    els.del.addEventListener('click', onDelete);
    document.addEventListener('keydown', keyHandler);

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
