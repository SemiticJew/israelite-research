/* js/calendar.js
 * Responsive calendar with month/day/year selectors and in-cell events.
 * Event types + colors (scoped in CSS):
 *  - xspace  => #000000
 *  - youtube => #808080
 *  - discord => #5865f2
 *  - sabbath => #8B0000
 *  - newmoon => #054A91
 *  - feast   => #F17300
 */

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("calendarGrid");
  const dow = document.getElementById("calendarDow");
  const monthSelect = document.getElementById("monthSelect");
  const daySelect = document.getElementById("daySelect");
  const yearSelect = document.getElementById("yearSelect");
  const prevBtn = document.getElementById("prevBtn");
  const todayBtn = document.getElementById("todayBtn");
  const nextBtn = document.getElementById("nextBtn");

  // Build DOW header once
  const dowLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  dow.innerHTML = dowLabels.map(l => `<div class="dow">${l}</div>`).join("");

  // State
  let current = new Date();

  // Example events (replace/extend as needed; can later load from JSON)
  // type: xspace | youtube | discord | sabbath | newmoon | feast
  const events = [
    // Platform lives
    { date: "2025-09-21", time: "7:00 PM", label: "X Space: Prophetic Q&A", type: "xspace" },
    { date: "2025-09-22", time: "8:30 PM", label: "YouTube Live: Semitic Jew Podcast", type: "youtube" },
    { date: "2025-09-24", time: "6:00 PM", label: "Discord Live: Bible Study", type: "discord" },
    // Fixed types
    { date: "2025-09-27", time: "", label: "Sabbath", type: "sabbath" },
    { date: "2025-10-02", time: "", label: "New Moon", type: "newmoon" },
    { date: "2025-10-13", time: "All Day", label: "Feast of Tabernacles", type: "feast" },
  ];

  // Utils
  const ymd = (d) => d.toISOString().slice(0,10);
  const pad = (n) => n.toString().padStart(2, "0");

  // Populate selectors
  function populateSelectors(date){
    // months
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    monthSelect.innerHTML = monthNames
      .map((m,i)=>`<option value="${i}" ${i===date.getMonth()?"selected":""}>${m}</option>`)
      .join("");

    // days (of current month)
    const dim = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
    daySelect.innerHTML = Array.from({length: dim}, (_,i)=>{
      const d = i+1;
      return `<option value="${d}" ${d===date.getDate()?"selected":""}>${d}</option>`;
    }).join("");

    // years (currentYear-50 to +10)
    const cy = new Date().getFullYear();
    let yHtml = "";
    for(let y=cy-50; y<=cy+10; y++){
      yHtml += `<option value="${y}" ${y===date.getFullYear()?"selected":""}>${y}</option>`;
    }
    yearSelect.innerHTML = yHtml;
  }

  // Render grid for given month
  function render(date){
    populateSelectors(date);

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const firstDow = firstOfMonth.getDay(); // 0..6
    const dim = new Date(year, month+1, 0).getDate();

    // Previous month's trailing days
    const prevDim = new Date(year, month, 0).getDate();
    const leading = firstDow; // count to show before day 1

    // Build cells: 7 columns each row; we’ll just output in order
    let html = "";

    // Leading (previous month)
    for (let i=leading; i>0; i--){
      const dNum = prevDim - i + 1;
      html += dayCell(year, month-1, dNum, true);
    }
    // Current month
    for (let d=1; d<=dim; d++){
      html += dayCell(year, month, d, false);
    }
    // Trailing (next month) to complete the grid to full weeks
    const totalCells = leading + dim;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let t=1; t<=trailing; t++){
      html += dayCell(year, month+1, t, true);
    }

    grid.innerHTML = html;
  }

  // Create one day cell
  function dayCell(y, m, d, isMuted){
    const viewDate = new Date(y, m, d);
    const isToday = y===today.getFullYear() && m===today.getMonth() && d===today.getDate();

    // events for this exact day
    const key = `${viewDate.getFullYear()}-${pad(viewDate.getMonth()+1)}-${pad(viewDate.getDate())}`;
    const todays = events.filter(e => e.date === key);

    const evtsHtml = todays.map(e => `
      <div class="evt ${e.type}">
        <span class="dot" aria-hidden="true"></span>
        ${e.time ? `<span class="time">${e.time}</span>` : ""}
        <span class="label">${e.label}</span>
      </div>
    `).join("");

    return `
      <div class="day ${isMuted?"muted":""}" data-date="${key}">
        <div class="date-badge">
          <span>${d}</span>
          ${isToday ? `<span class="today">Today</span>` : ``}
        </div>
        <div class="events">${evtsHtml}</div>
      </div>
    `;
  }

  const today = new Date();

  // Listeners
  monthSelect.addEventListener("change", () => {
    current.setMonth(parseInt(monthSelect.value, 10));
    // clamp day within month range
    const dim = new Date(current.getFullYear(), current.getMonth()+1, 0).getDate();
    if (current.getDate() > dim) current.setDate(dim);
    render(current);
  });
  daySelect.addEventListener("change", () => {
    current.setDate(parseInt(daySelect.value, 10));
    render(current);
  });
  yearSelect.addEventListener("change", () => {
    current.setFullYear(parseInt(yearSelect.value, 10));
    // clamp day within month range
    const dim = new Date(current.getFullYear(), current.getMonth()+1, 0).getDate();
    if (current.getDate() > dim) current.setDate(dim);
    render(current);
  });

  prevBtn.addEventListener("click", () => {
    current.setMonth(current.getMonth()-1);
    render(current);
  });
  nextBtn.addEventListener("click", () => {
    current.setMonth(current.getMonth()+1);
    render(current);
  });
  todayBtn.addEventListener("click", () => {
    current = new Date();
    render(current);
  });

  // Init
  render(current);
});
