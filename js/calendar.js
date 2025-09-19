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

  const drawer = document.getElementById("eventDrawer");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerBody = document.getElementById("drawerBody");
  const drawerClose = document.getElementById("drawerClose");

  const dowLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  dow.innerHTML = dowLabels.map(l => `<div class="dow">${l}</div>`).join("");

  // Event map (type -> hex) read from CSS variables
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

  // Single-letter code for the format “18:00 PM - X | Title”
  const TYPE_LETTER = {
    xspace: 'X',
    youtube: 'Y',
    discord: 'D',
    sabbath: 'S',
    newmoon: 'N',
    feast: 'F'
  };

  // Persist events per browser (no file edits needed)
  const LS_KEY = "ir.events";
  function loadEvents(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return seed();  // first time seed
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return seed();
      return parsed;
    }catch{ return seed(); }
  }
  function saveEvents(){ localStorage.setItem(LS_KEY, JSON.stringify(EVENTS)); }
  function seed(){
    const demo = [
      { id: uid(), date:"2025-09-21", time:"7:00 PM",  label:"Prophetic Q & A",     type:"xspace"  },
      { id: uid(), date:"2025-09-22", time:"8:30 PM",  label:"Semitic Jew Podcast", type:"youtube" },
      { id: uid(), date:"2025-09-24", time:"6:00 PM",  label:"Bible Study",         type:"discord" },
      { id: uid(), date:"2025-09-27", time:"",         label:"Sabbath",             type:"sabbath" },
      { id: uid(), date:"2025-10-02", time:"",         label:"New Moon",            type:"newmoon" },
      { id: uid(), date:"2025-10-13", time:"All Day",  label:"Feast of Tabernacles",type:"feast"   },
      { id: uid(), date:"2025-09-24", time:"7:30 PM",  label:"Discord Q & A",       type:"discord" },
      { id: uid(), date:"2025-09-24", time:"9:00 PM",  label:"After Hours",         type:"xspace"  },
      { id: uid(), date:"2025-09-24", time:"",         label:"Sabbath Prep",        type:"sabbath" }
    ];
    localStorage.setItem(LS_KEY, JSON.stringify(demo));
    return demo;
  }
  function uid(){ return Math.random().toString(36).slice(2, 10); }

  let EVENTS = loadEvents();

  let current = new Date();
  const today = new Date();
  const pad = (n) => n.toString().padStart(2,"0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

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

  function chipHTML(e){
    const letter = TYPE_LETTER[e.type] || "?";
    const text = formatListing(e.time, letter, e.label);
    return `<div class="chip" data-type="${e.type}" title="${escapeHtml(text)}">${escapeHtml(text)}</div>`;
  }

  function formatListing(time, letter, label){
    // Keep your explicit pattern: "18:00 PM - X | Q & A"
    // If time missing, show "— - X | Title"
    const t = time && time.trim() ? time.trim() : "—";
    return `${t} - ${letter} | ${label}`;
  }

  function openDrawer(date){
    const key = ymd(date);
    const items = EVENTS.filter(e => e.date === key);

    drawerTitle.textContent = `Events — ${key}`;
    drawerBody.innerHTML = items.length
      ? items.map(e => fullEventHTML(e)).join("")
      : `<p class="muted">No events for this date.</p>`;

    drawer.hidden = false;
    drawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function fullEventHTML(e){
    const color = COLOR()[e.type] || '#444';
    const letter = TYPE_LETTER[e.type] || "?";
    const text = formatListing(e.time, letter, e.label);
    const fg = prefersLightText(color) ? '#fff' : '#111';
    return `
      <div class="evt-full" style="background:${color}; color:${fg}; border-color:${fg==='#fff'?'rgba(255,255,255,.18)':'rgba(0,0,0,.12)'}">
        <div>
          <div class="evt-title">${escapeHtml(text)}</div>
          <div class="evt-meta">
            <span><strong>Date:</strong> ${e.date}</span>
            <span><strong>Type:</strong> ${e.type}</span>
            ${e.location ? `<span><strong>Location:</strong> ${escapeHtml(e.location)}</span>` : ``}
          </div>
          ${e.notes ? `<p class="evt-notes">${escapeHtml(e.notes)}</p>` : ``}
        </div>
        <div class="evt-actions">
          ${e.url ? `<a class="btn-link" href="${e.url}" target="_blank" rel="noopener" style="color:${fg};text-decoration:underline">Open</a>` : ``}
          <button class="btn-del" data-id="${e.id}">Delete</button>
        </div>
      </div>
    `;
  }

  // Delete handler (event delegation)
  drawerBody.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-del");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    EVENTS = EVENTS.filter(e => e.id !== id);
    saveEvents();
    render(current);
    // refresh drawer to reflect deletion
    const openDate = drawerTitle.textContent.split(" — ")[1];
    if (openDate) openDrawer(new Date(openDate));
  });

  // Add Event (prompt-based minimal UI to avoid extra HTML)
  addEventBtn.addEventListener("click", () => {
    const date = prompt("Date (YYYY-MM-DD):", ymd(new Date()));
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const time = prompt("Time (e.g., 6:00 PM):", "");
    const label = prompt("Title (e.g., Q & A):", "");
    const type = prompt("Type [xspace|youtube|discord|sabbath|newmoon|feast]:", "xspace");
    if (!label || !type) return;
    EVENTS.push({ id: uid(), date, time, label, type });
    saveEvents();
    render(current);
  });

  // Utility
  function prefersLightText(hex){
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    const L = (0.299*r + 0.587*g + 0.114*b)/255; // perceived luminance
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

  // Close drawer
  drawerClose.addEventListener("click", () => drawer.hidden = true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") drawer.hidden = true; });
});
