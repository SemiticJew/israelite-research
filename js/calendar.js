document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("calendarGrid");
  const dow = document.getElementById("calendarDow");
  const monthSelect = document.getElementById("monthSelect");
  const daySelect = document.getElementById("daySelect");
  const yearSelect = document.getElementById("yearSelect");
  const prevBtn = document.getElementById("prevBtn");
  const todayBtn = document.getElementById("todayBtn");
  const nextBtn = document.getElementById("nextBtn");
  const addEventBtn = document.getElementById("addEventBtn");

  // Drawer
  const drawer = document.getElementById("eventDrawer");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerBody = document.getElementById("drawerBody");
  const drawerClose = document.getElementById("drawerClose");

  // Modal (Date + Time + Label; Intel = Notes only)
  const modal = document.getElementById("addEventModal");
  const modalClose = document.getElementById("modalClose");
  const modalCancel = document.getElementById("modalCancel");
  const addForm = document.getElementById("addEventForm");
  const evtDate = document.getElementById("evtDate");
  const evtTime = document.getElementById("evtTime");

  // DOW
  const dowLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  dow.innerHTML = dowLabels.map(l => `<div class="dow">${l}</div>`).join("");

  // Color map from CSS vars
  const COLOR = () => {
    const s = getComputedStyle(document.documentElement);
    return {
      xspace:  s.getPropertyValue('--evt-xspace').trim(),
      youtube: s.getPropertyValue('--evt-youtube').trim(),
      discord: s.getPropertyValue('--evt-discord').trim(),
      sabbath: s.getPropertyValue('--evt-sabbath').trim(),
      newmoon: s.getPropertyValue('--evt-newmoon').trim(),
      feast:   s.getPropertyValue('--evt-feast').trim(),
    };
  };

  // Storage
  const LS_KEY = "ir.events";
  function uid(){ return Math.random().toString(36).slice(2, 10); }
  function loadEvents(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return seed();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : seed();
    }catch{ return seed(); }
  }
  function saveEvents(){ localStorage.setItem(LS_KEY, JSON.stringify(EVENTS)); }
  function seed(){
    const demo = [
      { id: uid(), date:"2025-09-21", time:"19:00",  label:"Prophetic Q & Answers", type:"xspace"  },
      { id: uid(), date:"2025-09-22", time:"20:30",  label:"Semitic Jew Podcast",   type:"youtube" },
      { id: uid(), date:"2025-09-24", time:"18:00",  label:"Bible Study",           type:"discord" },
      { id: uid(), date:"2025-09-27", time:"",       label:"Sabbath",               type:"sabbath" },
      { id: uid(), date:"2025-10-02", time:"",       label:"New Moon",              type:"newmoon" },
      { id: uid(), date:"2025-10-13", time:"",       label:"Feast of Tabernacles",  type:"feast"   }
    ];
    localStorage.setItem(LS_KEY, JSON.stringify(demo));
    return demo;
  }

  let EVENTS = loadEvents();

  // Dates
  let current = new Date();
  const today = new Date();
  const pad = (n) => n.toString().padStart(2,"0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const hhmm = (time) => {
    if (!time) return "—";
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
    return m ? `${m[1]}${m[2]}` : "—";
  };

  function populateSelectors(date){
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    monthSelect.innerHTML = monthNames.map((m,i)=>`<option value="${i}" ${i===date.getMonth()?"selected":""}>${m}</option>`).join("");
    const dim = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
    daySelect.innerHTML = Array.from({length: dim}, (_,i)=>`<option value="${i+1}" ${i+1===date.getDate()?"selected":""}>${i+1}</option>`).join("");
    const cy = new Date().getFullYear();
    yearSelect.innerHTML = Array.from({length: 61}, (_,k)=>cy-50+k)
      .map(y=>`<option value="${y}" ${y===date.getFullYear()?"selected":""}>${y}</option>`).join("");
  }

  function render(date){
    populateSelectors(date);

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const firstDow = firstOfMonth.getDay();
    const dim = new Date(year, month+1, 0).getDate();
    const prevDim = new Date(year, month, 0).getDate();
    const leading = firstDow;

    let html = "";

    for (let i=leading; i>0; i--) html += dayCell(year, month-1, prevDim - i + 1, true);
    for (let d=1; d<=dim; d++) html += dayCell(year, month, d, false);
    const total = leading + dim;
    const trailing = (7 - (total % 7)) % 7;
    for (let t=1; t<=trailing; t++) html += dayCell(year, month+1, t, true);

    grid.innerHTML = html;

    grid.querySelectorAll(".day").forEach(cell => {
      cell.addEventListener("click", () => {
        const ds = cell.getAttribute("data-date");
        const [Y, M, D] = ds.split("-").map(Number);
        openDrawer(new Date(Y, M-1, D));
      });
    });
  }

  function dayCell(y, m, d, muted){
    const view = new Date(y, m, d);
    const key = ymd(view);
    const isToday = (view.getFullYear()===today.getFullYear() && view.getMonth()===today.getMonth() && view.getDate()===today.getDate());
    const list = EVENTS.filter(e => e.date === key);

    const previews = list.slice(0,2).map(e => chipHTML(e)).join("");
    const more = list.length > 2 ? `<a class="more-link">+${list.length-2} more</a>` : "";

    return `
      <div class="day ${muted?"muted":""}" data-date="${key}" tabindex="0" role="button" aria-label="View events for ${key}">
        <div class="date-badge">
          <span>${d}</span>
          ${isToday ? `<span class="today">Today</span>` : ``}
        </div>
        <div class="events">${previews}${more}</div>
      </div>
    `;
  }

  // Calendar pills: NOT bold, one line: HHmm | Title
  function chipHTML(e){
    const text = `${hhmm(e.time)} | ${escapeHtml(e.label)}`;
    return `<div class="chip" data-type="${e.type}" title="${escapeHtml(text)}">${text}</div>`;
  }

  // Drawer: two-line format (HHmm | Title) + (TypeInitial | MM.DD.YYYY)
  function fullEventHTML(e){
    const color = COLOR()[e.type] || '#444';
    const fg = prefersLightText(color) ? '#fff' : '#111';
    const first = `${hhmm(e.time)} | ${escapeHtml(e.label)}`;
    const [Y, M, D] = e.date.split("-");
    const second = `${(e.type ? e.type.charAt(0).toUpperCase() : "?")} | ${M}.${D}.${Y}`;
    return `
      <div class="evt-full" style="background:${color}; color:${fg}; border-color:${fg==='#fff'?'rgba(255,255,255,.18)':'rgba(0,0,0,.12)'}">
        <div>
          <div class="evt-title">${first}</div>
          <div class="evt-meta">${second}</div>
          ${e.notes ? `<p class="evt-notes">${escapeHtml(e.notes)}</p>` : ``}
          ${e.url ? `<p><a href="${e.url}" target="_blank" rel="noopener" style="color:${fg};text-decoration:underline">Open link</a></p>` : ``}
        </div>
        <div class="evt-actions">
          <button class="btn-del" data-id="${e.id}">Delete</button>
        </div>
      </div>
    `;
  }

  drawerBody.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-del");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    EVENTS = EVENTS.filter(e => e.id !== id);
    saveEvents();
    render(current);
    const openDate = drawerTitle.textContent.split(" — ")[1];
    if (openDate) openDrawer(new Date(openDate));
  });

  // Modal open/close
  function openModal(){
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden","false");
    evtDate.value = ymd(current);
    evtTime.value = "18:00";
    evtDate.focus();
  }
  function closeModal(){
    modal.style.display = "none";
    modal.setAttribute("aria-hidden","true");
    addForm.reset();
  }

  addEventBtn.addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (modal.getAttribute("aria-hidden")==="true") return;
    if (e.key === "Escape") closeModal();
  });

  // Modal submit (type defaults to xspace; url/location omitted)
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(addForm);
    const date = String(fd.get("date")||"").trim();
    const time = String(fd.get("time")||"").trim(); // 24h HH:MM
    const label = String(fd.get("label")||"").trim();
    const notes = String(fd.get("notes")||"").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert("Please enter a valid date (YYYY-MM-DD).");
    if (!label) return alert("Please enter an event name.");
    if (time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return alert("Use 24-hour time, e.g., 18:00.");

    const type = "xspace"; // default type since modal omits picker
    const url = "";        // optional fields omitted in modal
    const location = "";

    EVENTS.push({ id: uid(), date, time, label, type, url, location, notes });
    saveEvents();
    render(current);
    closeModal();
  });

  // Utils
  function prefersLightText(hex){
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    const L = (0.299*r + 0.587*g + 0.114*b)/255;
    return L < 0.6;
  }
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  // Controls
  monthSelect.addEventListener("change", () => { current.setMonth(parseInt(monthSelect.value,10)); clampDay(); render(current); });
  daySelect  .addEventListener("change", () => { current.setDate(parseInt(daySelect.value,10)); render(current); });
  yearSelect .addEventListener("change", () => { current.setFullYear(parseInt(yearSelect.value,10)); clampDay(); render(current); });
  prevBtn    .addEventListener("click", () => { current.setMonth(current.getMonth()-1); clampDay(); render(current); });
  nextBtn    .addEventListener("click", () => { current.setMonth(current.getMonth()+1); clampDay(); render(current); });
  todayBtn   .addEventListener("click", () => { current = new Date(); render(current); });

  function clampDay(){
    const dim = new Date(current.getFullYear(), current.getMonth()+1, 0).getDate();
    if (current.getDate() > dim) current.setDate(dim);
  }

  // Init
  render(current);
});
