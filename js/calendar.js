/* calendar.js
 * Simple calendar builder with month/day/year selectors
 */

document.addEventListener("DOMContentLoaded", () => {
  const calendarEl = document.getElementById("calendar");
  const monthSelect = document.getElementById("monthSelect");
  const daySelect = document.getElementById("daySelect");
  const yearSelect = document.getElementById("yearSelect");
  const prevBtn = document.getElementById("prevBtn");
  const todayBtn = document.getElementById("todayBtn");
  const nextBtn = document.getElementById("nextBtn");

  let currentDate = new Date();

  // ===== Populate Selectors =====
  function populateSelectors(date) {
    // Months
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    monthSelect.innerHTML = monthNames
      .map((m,i)=>`<option value="${i}" ${i===date.getMonth()?"selected":""}>${m}</option>`)
      .join("");

    // Days
    const daysInMonth = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
    daySelect.innerHTML = "";
    for (let d=1; d<=daysInMonth; d++) {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      if (d === date.getDate()) opt.selected = true;
      daySelect.appendChild(opt);
    }

    // Years (from currentYear-50 to currentYear+10)
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    for (let y=currentYear-50; y<=currentYear+10; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === date.getFullYear()) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }

  // ===== Render Calendar =====
  function renderCalendar(date) {
    populateSelectors(date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();

    let html = `<table class="calendar-table">
      <thead><tr>
        <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th>
        <th>Thu</th><th>Fri</th><th>Sat</th>
      </tr></thead><tbody><tr>`;

    // Empty cells before first day
    for (let i=0; i<firstDay; i++) html += "<td></td>";

    // Days
    for (let d=1; d<=daysInMonth; d++) {
      const dayOfWeek = (firstDay + d - 1) % 7;
      const isToday = (d===new Date().getDate() &&
                       month===new Date().getMonth() &&
                       year===new Date().getFullYear());
      html += `<td class="${isToday?"today":""}">${d}</td>`;
      if (dayOfWeek===6 && d!==daysInMonth) html += "</tr><tr>";
    }

    html += "</tr></tbody></table>";
    calendarEl.innerHTML = html;
  }

  // ===== Event Listeners =====
  monthSelect.addEventListener("change", () => {
    currentDate.setMonth(parseInt(monthSelect.value));
    renderCalendar(currentDate);
  });
  daySelect.addEventListener("change", () => {
    currentDate.setDate(parseInt(daySelect.value));
    renderCalendar(currentDate);
  });
  yearSelect.addEventListener("change", () => {
    currentDate.setFullYear(parseInt(yearSelect.value));
    renderCalendar(currentDate);
  });
  prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth()-1);
    renderCalendar(currentDate);
  });
  nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth()+1);
    renderCalendar(currentDate);
  });
  todayBtn.addEventListener("click", () => {
    currentDate = new Date();
    renderCalendar(currentDate);
  });

  // ===== Init =====
  renderCalendar(currentDate);
});
