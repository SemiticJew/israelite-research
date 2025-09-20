document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("calendarGrid");
  const dow = document.getElementById("calendarDow");
  const monthSelect = document.getElementById("monthSelect");
  const daySelect = document.getElementById("daySelect");
  const yearSelect = document.getElementById("yearSelect");
  const prevBtn = document.getElementById("prevBtn");
  const todayBtn = document.getElementById("todayBtn");
  const nextBtn = document.getElementById("nextBtn");

  const drawer = document.getElementById("eventDrawer");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerBody = document.getElementById("drawerBody");
  const drawerClose = document.getElementById("drawerClose");

  // DOW header
  const dowLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  dow.innerHTML = dowLabels.map(l => `<div class="dow">${l}</div>`).join("");

  // ===== EVENTS LIVE HERE (no JSON) =====
  // type: xspace | youtube | discord | sabbath | newmoon | feast
  const EVENTS = [
    { date:"2025-09-21", time:"7:00 PM",  label:"X Space: Prophetic Q&A",    type:"xspace",  url:"" },
    { date:"2025-09-22", time:"8:30 PM",  label:"YouTube Live: Semitic Jew", type:"youtube", url:"" },
    { date:"2025-09-24", time:"6:00 PM",  label:"Discord Live: Bible Study", type:"discord", url:"" },
    { date:"2025-09-27", time:"",         label:"Sabbath",                   type:"sabbath" },
    { date:"2025-10-02", time:"",         label:"New Moon",                  type:"newmoon" },
    { date:"2025-10-13", time:"All Day",  label:"Feast of Tabernacles",      type:"feast" },
    // extras to show overflow behavior
    { date:"2025-09-24", time:"7:30 PM",  label:"Discord Live: Q&A",         type:"discord" },
    { date:"2025-09-24", time:"9:00 PM",  label:"X Space: After Hours",      type:"xspace"  },
    { date:"2025-09-24", time:"",         label:"Sabbath Prep",              type:"sabbath" }
  ];
  // ======================================

  let current = new Date();
  const today = new Date();
  const pad = (n) => n.toString().padStart(2,"0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  function populateSelectors(date){
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    monthSelect.innerHTML = monthNames.map((m,i)=>`<option value="${i}" ${i===date.getMonth()?"selected":""}>${m}</option>`).join("");

    const dim = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
    daySelect.innerHTML = Array.from({length: dim}, (_,i)=>{
      const d = i+1;
      return `<option value="${d}" ${d===date.getDate()?"selected":""}>${d}</option>`;
    }).join("");

    const cy = new Date().getFullYear();
    let yHtml = "";
    for(let y=cy-50; y<=cy+10; y++){
      yHtml += `<option value="${y}" ${y===date.getFullYear()?"selected":""}>${y}</option>`;
    }
    yearSelect.innerHTML = yHtml;
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

    // previous month tail
    for (let i=leading; i>0; i--){
      html += dayCell(year, month-1, prevDim - i + 1, true);
    }
    // current month
    for (let d=1; d<=dim; d++){
      html += dayCell(year, month, d, false);
    }
    // next month head
    const total = leading + dim;
    const trailing = (7 - (total % 7)) % 7;
    for (let t=1; t<=trailing; t++){
      html += dayCell(year, month+1, t, true);
    }

    grid.innerHTML = html;

    // open drawer on day click
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
    const isToday = (view.getFullYear()===today.getFullYear()
                  && view.getMonth()===today.getMonth()
                  && view.getDate()===today.getDate());

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
    // chips use background color from CSS by [data-type]
    return `
      <div class="chip" data-type="${e.type}" title="${escapeHtml(e.label)}">
        ${e.time ? `<span class="time">${e.time}</span>` : ``}
        <span class="label">${escapeHtml(e.label)}</span>
      </div>
    `;
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
    const { bg, fg } = colorForType(e.type);
    return `
      <div class="evt-full" style="background:${bg}; color:${fg}; border-color:${fg === '#fff' ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.12)'}">
        <div>
          <div class="evt-title">${escapeHtml(e.label)}</div>
          <div class="evt-meta">
            ${e.time ? `<span><strong>Time:</strong> ${escapeHtml(e.time)}</span>` : ``}
            ${e.type ? `<span><strong>Type:</strong> ${escapeHtml(e.type)}</span>` : ``}
            ${e.location ? `<span><strong>Location:</strong> ${escapeHtml(e.location)}</span>` : ``}
          </div>
          ${e.notes ? `<p class="evt-notes">${escapeHtml(e.notes)}</p>` : ``}
        </div>
        ${e.url ? `<div class="evt-actions"><a href="${e.url}" target="_blank" rel="noopener" style="color:${fg};text-decoration:underline">Open link</a></div>` : ``}
      </div>
    `;
  }

  function colorForType(type){
    const s = getComputedStyle(document.documentElement);
    const hex = {
      xspace:  s.getPropertyValue('--evt-xspace').trim(),
      youtube: s.getPropertyValue('--evt-youtube').trim(),
      discord: s.getPropertyValue('--evt-discord').trim(),
      sabbath: s.getPropertyValue('--evt-sabbath').trim(),
      newmoon: s.getPropertyValue('--evt-newmoon').trim(),
      feast:   s.getPropertyValue('--evt-feast').trim(),
    }[type] || '#999';

    // Pick contrasting foreground automatically
    const fg = prefersLightText(hex) ? '#fff' : '#111';
    return { bg: hex, fg };
  }

  function prefersLightText(hex){
    // luminance check to decide white/black text
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    // perceived luminance
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

  // Close drawer
  function closeDrawer(){ drawer.hidden = true; }
  drawerClose.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
});
