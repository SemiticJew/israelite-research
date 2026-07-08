/* Semitic Jew Reader: keyboard shortcuts */
(function(){
  function isTypingTarget(el){
    if(!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  function clickSelector(selector){
    const el = document.querySelector(selector);
    if(el){
      el.click();
      return true;
    }
    return false;
  }

  function focusSearch(){
    const input = document.getElementById("reader-chapter-search");
    if(input){
      input.focus();
      input.select();
    }
  }

  function createHelp(){
    if(document.getElementById("reader-shortcuts-help")) return;

    const overlay = document.createElement("div");
    overlay.id = "reader-shortcuts-help";
    overlay.className = "reader-shortcuts-help";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Reader keyboard shortcuts");

    overlay.innerHTML = `
      <div class="reader-shortcuts-card">
        <div class="reader-shortcuts-head">
          <span>Keyboard Shortcuts</span>
          <button type="button" aria-label="Close keyboard shortcuts">×</button>
        </div>

        <dl>
          <div><dt>/</dt><dd>Focus chapter search</dd></div>
          <div><dt>n</dt><dd>Next search match</dd></div>
          <div><dt>p</dt><dd>Previous search match</dd></div>
          <div><dt>+</dt><dd>Increase reader text</dd></div>
          <div><dt>-</dt><dd>Decrease reader text</dd></div>
          <div><dt>c</dt><dd>Copy citation</dd></div>
          <div><dt>l</dt><dd>Copy chapter link</dd></div>
          <div><dt>?</dt><dd>Show or hide this help</dd></div>
          <div><dt>esc</dt><dd>Close help</dd></div>
        </dl>
      </div>
    `;

    overlay.addEventListener("click", function(event){
      if(event.target === overlay || event.target.closest("button")){
        overlay.hidden = true;
      }
    });

    document.body.appendChild(overlay);
  }

  function toggleHelp(){
    createHelp();
    const overlay = document.getElementById("reader-shortcuts-help");
    overlay.hidden = !overlay.hidden;
  }

  function createButton(){
    if(document.querySelector(".reader-shortcuts-button")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reader-shortcuts-button";
    btn.textContent = "Shortcuts";
    btn.addEventListener("click", toggleHelp);

    const share = document.querySelector(".reader-share-shell");
    const search = document.querySelector(".reader-search-shell");

    if(share){
      share.insertAdjacentElement("afterend", btn);
    }else if(search){
      search.insertAdjacentElement("afterend", btn);
    }else{
      document.querySelector("main")?.prepend(btn);
    }
  }

  function init(){
    if(!document.body.classList.contains("reader-page")) return;

    createHelp();

    let attempts = 0;
    const wait = setInterval(function(){
      attempts += 1;
      if(document.querySelector(".reader-share-shell") || document.querySelector(".reader-search-shell") || attempts > 80){
        clearInterval(wait);
        createButton();
      }
    }, 100);

    document.addEventListener("keydown", function(event){
      if(isTypingTarget(event.target)){
        if(event.key === "Escape"){
          const help = document.getElementById("reader-shortcuts-help");
          if(help && !help.hidden){
            help.hidden = true;
          }
        }
        return;
      }

      const key = event.key;

      if(key === "/"){
        event.preventDefault();
        focusSearch();
      }

      if(key.toLowerCase() === "n"){
        event.preventDefault();
        clickSelector("#reader-search-next");
      }

      if(key.toLowerCase() === "p"){
        event.preventDefault();
        clickSelector("#reader-search-prev");
      }

      if(key === "+" || key === "="){
        event.preventDefault();
        clickSelector('[data-reader-font="up"]');
      }

      if(key === "-" || key === "_"){
        event.preventDefault();
        clickSelector('[data-reader-font="down"]');
      }

      if(key.toLowerCase() === "c"){
        event.preventDefault();
        clickSelector('[data-copy="citation"]');
      }

      if(key.toLowerCase() === "l"){
        event.preventDefault();
        clickSelector('[data-copy="link"]');
      }

      if(key === "?"){
        event.preventDefault();
        toggleHelp();
      }

      if(key === "Escape"){
        const help = document.getElementById("reader-shortcuts-help");
        if(help && !help.hidden){
          help.hidden = true;
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
