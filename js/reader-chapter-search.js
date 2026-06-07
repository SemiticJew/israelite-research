/* Semitic Jew Reader: search within chapter */
(function(){
  let matches = [];
  let activeIndex = -1;

  function getVerses(){
    return Array.from(document.querySelectorAll(".verse"));
  }

  function clearMarks(){
    matches = [];
    activeIndex = -1;

    document.querySelectorAll(".reader-search-match, .reader-search-active").forEach(el => {
      el.classList.remove("reader-search-match", "reader-search-active");
    });

    updateCount();
  }

  function updateCount(){
    const count = document.getElementById("reader-search-count");
    if(!count) return;

    if(!matches.length){
      count.textContent = "0 matches";
      return;
    }

    count.textContent = `${activeIndex + 1} of ${matches.length}`;
  }

  function createShell(){
    if(document.querySelector(".reader-search-shell")) return document.querySelector(".reader-search-shell");

    const shell = document.createElement("section");
    shell.className = "reader-search-shell";
    shell.setAttribute("aria-label", "Search within this chapter");

    shell.innerHTML = `
      <div class="reader-search-title">
        <span>Chapter Search</span>
        <strong>Search this chapter</strong>
      </div>

      <div class="reader-search-controls">
        <input id="reader-chapter-search" type="search" placeholder="Search words in this chapter..." autocomplete="off" />
        <button type="button" id="reader-search-prev">Previous</button>
        <button type="button" id="reader-search-next">Next</button>
        <button type="button" id="reader-search-clear">Clear</button>
      </div>

      <div class="reader-search-count" id="reader-search-count" aria-live="polite">0 matches</div>
    `;

    const prefs = document.querySelector(".reader-preferences-shell");
    const progress = document.querySelector(".reader-progress-shell");
    const nav = document.querySelector(".reader-chapter-nav");
    const header = document.querySelector("main .page-header");

    if(prefs){
      prefs.insertAdjacentElement("afterend", shell);
    }else if(progress){
      progress.insertAdjacentElement("afterend", shell);
    }else if(nav){
      nav.insertAdjacentElement("afterend", shell);
    }else if(header){
      header.insertAdjacentElement("afterend", shell);
    }else{
      document.querySelector("main")?.prepend(shell);
    }

    return shell;
  }

  function activate(index){
    if(!matches.length) return;

    matches.forEach(el => el.classList.remove("reader-search-active"));

    activeIndex = (index + matches.length) % matches.length;
    const active = matches[activeIndex];

    active.classList.add("reader-search-active");
    active.scrollIntoView({behavior:"smooth", block:"center"});

    updateCount();
  }

  function search(query){
    clearMarks();

    const term = String(query || "").trim().toLowerCase();

    if(term.length < 2){
      updateCount();
      return;
    }

    const verses = getVerses();

    verses.forEach(verse => {
      const text = verse.textContent.toLowerCase();

      if(text.includes(term)){
        verse.classList.add("reader-search-match");
        matches.push(verse);
      }
    });

    if(matches.length){
      activate(0);
    }else{
      updateCount();
    }
  }

  function debounce(fn, ms){
    let timer = null;
    return function(...args){
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function bind(shell){
    const input = shell.querySelector("#reader-chapter-search");
    const prev = shell.querySelector("#reader-search-prev");
    const next = shell.querySelector("#reader-search-next");
    const clear = shell.querySelector("#reader-search-clear");

    const runSearch = debounce(() => search(input.value), 160);

    input.addEventListener("input", runSearch);

    input.addEventListener("keydown", function(event){
      if(event.key === "Enter"){
        event.preventDefault();
        if(matches.length){
          activate(activeIndex + 1);
        }else{
          search(input.value);
        }
      }

      if(event.key === "Escape"){
        input.value = "";
        clearMarks();
      }
    });

    prev.addEventListener("click", () => activate(activeIndex - 1));
    next.addEventListener("click", () => activate(activeIndex + 1));

    clear.addEventListener("click", function(){
      input.value = "";
      clearMarks();
      input.focus();
    });
  }

  function init(){
    if(!document.body.classList.contains("reader-page")) return;

    let attempts = 0;

    const wait = setInterval(function(){
      attempts += 1;

      if(document.querySelector(".reader-preferences-shell") || document.querySelector(".reader-progress-shell") || attempts > 80){
        clearInterval(wait);
        const shell = createShell();
        bind(shell);
      }
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
