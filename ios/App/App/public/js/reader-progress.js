/* Semitic Jew Reader: chapter progress + last read position */
(function(){
  const STORAGE_KEY = "sj_reader_position_v1";

  function getCanon(){
    const path = location.pathname;
    if(path.includes("/tanakh/")) return "tanakh";
    if(path.includes("/newtestament/")) return "newtestament";
    if(path.includes("/apocrypha/")) return "apocrypha";
    return "biblia";
  }

  function getKey(){
    const params = new URLSearchParams(location.search);
    const canon = getCanon();
    const book = params.get("book") || "unknown";
    const ch = params.get("ch") || "1";
    return `${canon}:${book}:${ch}`;
  }

  function readStore(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    }catch(e){
      return {};
    }
  }

  function writeStore(data){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }catch(e){
      console.warn("Reader progress could not save:", e);
    }
  }

  function getVerses(){
    return Array.from(document.querySelectorAll(".verse"));
  }

  function getVerseNumber(verse){
    const raw =
      verse.dataset.verse ||
      verse.dataset.v ||
      verse.getAttribute("data-verse") ||
      verse.querySelector(".vnum")?.textContent ||
      "";
    const match = String(raw).match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  function createShell(){
    if(document.querySelector(".reader-progress-shell")) return document.querySelector(".reader-progress-shell");

    const shell = document.createElement("section");
    shell.className = "reader-progress-shell";
    shell.setAttribute("aria-label", "Chapter reading progress");
    shell.innerHTML = `
      <div class="reader-progress-copy">
        <span class="label">Reading Progress</span>
        <strong>Chapter progress: <span id="reader-progress-percent">0%</span></strong>
        <small id="reader-progress-last">Start reading this chapter.</small>
      </div>
      <div class="reader-progress-meter" aria-hidden="true">
        <span id="reader-progress-bar"></span>
      </div>
      <button type="button" id="reader-progress-resume" hidden>Resume</button>
    `;

    const nav = document.querySelector(".reader-chapter-nav");
    const header = document.querySelector("main .page-header");

    if(nav){
      nav.insertAdjacentElement("afterend", shell);
    }else if(header){
      header.insertAdjacentElement("afterend", shell);
    }else{
      document.querySelector("main")?.prepend(shell);
    }

    return shell;
  }

  function savePosition(percent, verseNumber){
    const key = getKey();
    const store = readStore();

    store[key] = {
      percent,
      verse: verseNumber,
      path: location.pathname + location.search,
      updatedAt: new Date().toISOString()
    };

    writeStore(store);
  }

  function getSavedPosition(){
    return readStore()[getKey()] || null;
  }

  function updateProgress(){
    const verses = getVerses();
    if(!verses.length) return;

    const shell = createShell();
    const percentEl = shell.querySelector("#reader-progress-percent");
    const bar = shell.querySelector("#reader-progress-bar");
    const lastEl = shell.querySelector("#reader-progress-last");

    const viewportLine = window.scrollY + (window.innerHeight * 0.38);

    let active = verses[0];

    for(const verse of verses){
      const top = verse.getBoundingClientRect().top + window.scrollY;
      if(top <= viewportLine){
        active = verse;
      }else{
        break;
      }
    }

    const index = Math.max(0, verses.indexOf(active));
    const percent = Math.min(100, Math.max(0, Math.round(((index + 1) / verses.length) * 100)));
    const verseNumber = getVerseNumber(active) || index + 1;

    percentEl.textContent = `${percent}%`;
    bar.style.width = `${percent}%`;
    lastEl.textContent = `Last position: verse ${verseNumber}.`;

    savePosition(percent, verseNumber);
  }

  function setupResume(){
    const shell = createShell();
    const button = shell.querySelector("#reader-progress-resume");
    const saved = getSavedPosition();

    if(!saved || !saved.verse) return;

    const verses = getVerses();
    const target = verses.find(v => getVerseNumber(v) === Number(saved.verse));

    if(!target) return;

    button.hidden = false;
    button.textContent = `Resume at verse ${saved.verse}`;

    button.addEventListener("click", function(){
      target.scrollIntoView({behavior:"smooth", block:"center"});
      target.classList.add("reader-resume-pulse");
      setTimeout(() => target.classList.remove("reader-resume-pulse"), 1600);
    });
  }

  function throttle(fn, wait){
    let timer = null;
    return function(){
      if(timer) return;
      timer = setTimeout(function(){
        timer = null;
        fn();
      }, wait);
    };
  }

  function init(){
    if(!document.body.classList.contains("reader-page")) return;

    let attempts = 0;

    const waitForVerses = setInterval(function(){
      attempts += 1;
      if(getVerses().length || attempts > 80){
        clearInterval(waitForVerses);
        createShell();
        setupResume();
        updateProgress();

        const throttled = throttle(updateProgress, 180);
        window.addEventListener("scroll", throttled, {passive:true});
        window.addEventListener("resize", throttled);
      }
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
