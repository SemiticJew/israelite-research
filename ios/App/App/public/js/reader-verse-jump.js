/* Semitic Jew Reader: verse jump / mini table of contents */
(function(){
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

  function jumpToVerse(number){
    const verses = getVerses();
    const target = verses.find(v => getVerseNumber(v) === Number(number));

    if(!target) return false;

    target.scrollIntoView({behavior:"smooth", block:"center"});
    target.classList.add("reader-jump-pulse");
    setTimeout(() => target.classList.remove("reader-jump-pulse"), 1600);

    return true;
  }

  function quickNumbers(total){
    const nums = new Set([1]);

    for(let i = 5; i <= total; i += 5){
      nums.add(i);
    }

    if(total > 1){
      nums.add(total);
    }

    return Array.from(nums).filter(n => n >= 1 && n <= total);
  }

  function createShell(){
    if(document.querySelector(".reader-verse-jump-shell")) return;

    const verses = getVerses();
    if(!verses.length) return;

    const verseNumbers = verses.map(getVerseNumber).filter(Boolean);
    const maxVerse = Math.max(...verseNumbers);

    const shell = document.createElement("section");
    shell.className = "reader-verse-jump-shell";
    shell.setAttribute("aria-label", "Jump to verse");

    shell.innerHTML = `
      <div class="reader-verse-jump-title">
        <span>Verse Jump</span>
        <strong>Move through this chapter</strong>
      </div>

      <form class="reader-verse-jump-form">
        <label for="reader-verse-jump-input">Verse</label>
        <input id="reader-verse-jump-input" type="number" min="1" max="${maxVerse}" placeholder="1-${maxVerse}" />
        <button type="submit">Jump</button>
      </form>

      <div class="reader-verse-jump-chips" aria-label="Quick verse jumps">
        ${quickNumbers(maxVerse).map(num => `<button type="button" data-jump-verse="${num}">${num}</button>`).join("")}
      </div>
    `;

    const shortcuts = document.querySelector(".reader-shortcuts-button");
    const share = document.querySelector(".reader-share-shell");
    const search = document.querySelector(".reader-search-shell");

    if(shortcuts){
      shortcuts.insertAdjacentElement("afterend", shell);
    }else if(share){
      share.insertAdjacentElement("afterend", shell);
    }else if(search){
      search.insertAdjacentElement("afterend", shell);
    }else{
      document.querySelector("main")?.prepend(shell);
    }

    const form = shell.querySelector(".reader-verse-jump-form");
    const input = shell.querySelector("#reader-verse-jump-input");

    form.addEventListener("submit", function(event){
      event.preventDefault();
      const ok = jumpToVerse(input.value);
      if(ok){
        input.blur();
      }
    });

    shell.addEventListener("click", function(event){
      const button = event.target.closest("[data-jump-verse]");
      if(!button) return;

      jumpToVerse(button.dataset.jumpVerse);
    });
  }

  function init(){
    if(!document.body.classList.contains("reader-page")) return;

    let attempts = 0;

    const wait = setInterval(function(){
      attempts += 1;

      if(getVerses().length || attempts > 80){
        clearInterval(wait);
        createShell();
      }
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
