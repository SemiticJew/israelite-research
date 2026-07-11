const screens = Array.from(
  document.querySelectorAll("[data-v3-screen]")
);

const navButtons = Array.from(
  document.querySelectorAll("[data-v3-nav]")
);

const validScreens = new Set(
  screens.map(screen => screen.dataset.v3Screen)
);


function escapeHTML(value = ""){
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


async function fetchJSON(url){
  const response = await fetch(url);

  if(!response.ok){
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}


function showScreen(name, options = {}){
  const { updateHash = true } = options;

  if(!validScreens.has(name)){
    name = "home";
  }

  screens.forEach(screen => {
    const isActive = screen.dataset.v3Screen === name;

    screen.hidden = !isActive;
    screen.classList.toggle("is-active", isActive);
  });

  navButtons.forEach(button => {
    const isActive = button.dataset.v3Nav === name;

    button.classList.toggle("is-active", isActive);

    if(isActive){
      button.setAttribute("aria-current", "page");
    }else{
      button.removeAttribute("aria-current");
    }
  });

  if(updateHash){
    history.replaceState(null, "", `#${name}`);
  }

  window.scrollTo({
    top:0,
    left:0,
    behavior:"instant"
  });
}


navButtons.forEach(button => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.v3Nav);
  });
});


window.addEventListener("hashchange", () => {
  const requested = location.hash.replace("#", "");

  showScreen(requested, {
    updateHash:false
  });
});


const initialScreen = location.hash.replace("#", "");

showScreen(
  validScreens.has(initialScreen)
    ? initialScreen
    : "home",
  { updateHash:false }
);


/* =========================================================
   Home: Precept Verse
   ========================================================= */

const PRECEPT_LIKES_KEY = "sj_v3_precept_likes_v1";
const PRECEPT_NOTES_KEY = "sj_v3_precept_notes_v1";

let currentPrecept = null;


function readObjectStorage(key){
  try{
    const value = JSON.parse(localStorage.getItem(key) || "{}");

    return value && typeof value === "object"
      ? value
      : {};
  }catch(error){
    console.warn(`Could not read ${key}.`, error);
    return {};
  }
}


function writeObjectStorage(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
  }catch(error){
    console.warn(`Could not write ${key}.`, error);
  }
}


function preceptKey(precept){
  return String(precept?.reference || "daily-precept")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}


function renderPrecept(precept){
  const root = document.getElementById("sj-home-precept");

  if(!root) return;

  currentPrecept = precept;

  const key = preceptKey(precept);
  const likes = readObjectStorage(PRECEPT_LIKES_KEY);
  const notes = readObjectStorage(PRECEPT_NOTES_KEY);

  root.innerHTML = `
    <div class="sj-precept-content">
      <p class="sj-precept-label">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v17H6.5A3.5 3.5 0 0 0 3 22Z"></path>
          <path d="M21 5.5A3.5 3.5 0 0 0 17.5 2H13v17h4.5A3.5 3.5 0 0 1 21 22Z"></path>
        </svg>

        <span>Verse of the Day</span>
      </p>

      <span class="sj-precept-reference">
        ${escapeHTML(precept.reference || "")}
      </span>

      <blockquote class="sj-precept-text">
        ${escapeHTML(precept.text || "")}
      </blockquote>

      ${precept.prompt ? `
        <p class="sj-precept-prompt">
          ${escapeHTML(precept.prompt)}
        </p>
      ` : ""}
    </div>

    <div class="sj-precept-actions" aria-label="Verse actions">
      <button
        type="button"
        data-precept-action="like"
        class="${likes[key] ? "is-active" : ""}"
        aria-pressed="${likes[key] ? "true" : "false"}"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"></path>
        </svg>
        <span>Like</span>
      </button>

      <button
        type="button"
        data-precept-action="note"
        class="${notes[key] ? "is-active" : ""}"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h9l4 4v14H6Z"></path>
          <path d="M14 3v5h5"></path>
          <path d="M9 12h6"></path>
          <path d="M9 16h6"></path>
        </svg>
        <span>Note</span>
      </button>

      <button
        type="button"
        data-precept-action="comment"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path>
        </svg>
        <span>Comment</span>
      </button>

      <button
        type="button"
        data-precept-action="share"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16V3"></path>
          <path d="m7 8 5-5 5 5"></path>
          <path d="M5 12v9h14v-9"></path>
        </svg>
        <span>Share</span>
      </button>
    </div>

    <div class="sj-precept-daily">
      <button
        type="button"
        data-precept-action="daily"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
          <path d="M10 21h4"></path>
        </svg>

        <span>Send Me This Daily</span>
      </button>
    </div>
  `;
}


async function loadDailyPrecept(){
  const root = document.getElementById("sj-home-precept");

  if(!root) return;

  try{
    const precepts = await fetchJSON("/data/app/daily-precepts.json");

    if(!Array.isArray(precepts) || !precepts.length){
      throw new Error("No daily precepts found");
    }

    const today = new Date();

    const dayNumber = Math.floor(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime() / 86400000
    );

    const precept = precepts[
      Math.abs(dayNumber) % precepts.length
    ];

    renderPrecept(precept);
  }catch(error){
    console.warn("Daily precept failed.", error);

    root.innerHTML = `
      <div class="sj-precept-content">
        <p class="sj-precept-theme">Scripture</p>
        <blockquote class="sj-precept-text">
          “For precept must be upon precept, precept upon precept;
          line upon line, line upon line; here a little, and there a little.”
        </blockquote>
        <span class="sj-precept-reference">Isaiah 28:10</span>
      </div>
    `;
  }
}


document
  .getElementById("sj-home-precept")
  ?.addEventListener("click", async event => {
    const button = event.target.closest("[data-precept-action]");

    if(!button || !currentPrecept) return;

    const action = button.dataset.preceptAction;
    const key = preceptKey(currentPrecept);

    if(action === "like"){
      const likes = readObjectStorage(PRECEPT_LIKES_KEY);
      const nextState = !likes[key];

      if(nextState){
        likes[key] = true;
      }else{
        delete likes[key];
      }

      writeObjectStorage(PRECEPT_LIKES_KEY, likes);

      button.classList.toggle("is-active", nextState);
      button.setAttribute("aria-pressed", String(nextState));

      return;
    }

    if(action === "note"){
      const notes = readObjectStorage(PRECEPT_NOTES_KEY);
      const existing = notes[key] || "";

      const note = window.prompt(
        `Your note for ${currentPrecept.reference}`,
        existing
      );

      if(note === null) return;

      const cleaned = note.trim();

      if(cleaned){
        notes[key] = cleaned;
      }else{
        delete notes[key];
      }

      writeObjectStorage(PRECEPT_NOTES_KEY, notes);
      button.classList.toggle("is-active", Boolean(cleaned));

      return;
    }

    if(action === "comment"){
      window.alert(
        "Community comments are coming soon. No public comment was posted."
      );

      return;
    }

    if(action === "daily"){
      window.alert(
        "Daily verse reminders are coming soon. No notification was scheduled yet."
      );

      return;
    }

    if(action === "share"){
      const text =
        `${currentPrecept.reference} — ${currentPrecept.text}`;

      const shareData = {
        title:`${currentPrecept.reference} | Semitic Jew Institute`,
        text
      };

      if(navigator.share){
        try{
          await navigator.share(shareData);
          return;
        }catch(error){
          if(error.name === "AbortError") return;
        }
      }

      try{
        await navigator.clipboard.writeText(text);
        window.alert("Precept copied to clipboard.");
      }catch(error){
        console.warn("Could not share precept.", error);
      }
    }
  });


/* =========================================================
   Home: Precept Upon Precept
   ========================================================= */

const SCRIPTURE_VIDEO_TERMS = [
  "bible",
  "scripture",
  "deuteronomy",
  "genesis",
  "exodus",
  "leviticus",
  "jesus",
  "christ",
  "messiah",
  "israelite",
  "israelites",
  "covenant",
  "ham",
  "psalm",
  "jeremiah",
  "isaiah",
  "god"
];


function isScriptureTeachingVideo(video){
  const title = String(video?.title || "").toLowerCase();

  return SCRIPTURE_VIDEO_TERMS.some(term =>
    title.includes(term)
  );
}


async function loadPreceptVideos(){
  const root = document.getElementById("sj-precept-videos");

  if(!root) return;

  try{
    const payload = await fetchJSON("/data/youtube-videos.json");

    const videos = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.videos)
        ? payload.videos
        : [];

    const scriptureVideos = videos
      .filter(isScriptureTeachingVideo)
      .slice(0, 5);

    if(!scriptureVideos.length){
      throw new Error("No Scripture teaching videos found");
    }

    root.innerHTML = scriptureVideos.map(video => `
      <a
        class="sj-video-card"
        href="${escapeHTML(video.url || "#")}"
        target="_blank"
        rel="noopener"
      >
        <div class="sj-video-frame">
          <img
            src="${escapeHTML(video.thumbnail || "")}"
            alt=""
            loading="lazy"
          >

          <span class="sj-video-play" aria-hidden="true">
            ▶
          </span>
        </div>

        <div class="sj-video-copy">
          <h3>${escapeHTML(video.title || "Scripture teaching")}</h3>
        </div>
      </a>
    `).join("");
  }catch(error){
    console.warn("Precept Upon Precept videos failed.", error);

    root.innerHTML = `
      <p class="sj-home-loading">
        Scripture teachings are temporarily unavailable.
      </p>
    `;
  }
}


/* =========================================================
   Home: Latest Article
   ========================================================= */

function cleanText(value = ""){
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}


async function loadLatestArticle(){
  const root = document.getElementById("sj-latest-article");

  if(!root) return;

  try{
    const response = await fetch("/articles.html");

    if(!response.ok){
      throw new Error(`articles.html returned ${response.status}`);
    }

    const html = await response.text();

    const doc = new DOMParser()
      .parseFromString(html, "text/html");

    const card = doc.querySelector(
      ".recent-grid .article-card"
    );

    if(!card){
      throw new Error("No recent article card found");
    }

    const link = card.querySelector('a[href*="/articles/"]');
    const image = card.querySelector("img");
    const title = decodeHTMLEntities(
      cleanText(
        card.querySelector("h2, h3")?.textContent
      )
    );

    const excerpt = decodeHTMLEntities(
      cleanText(
        card.querySelector("p.muted, p")?.textContent
      )
    );

    const href = link?.getAttribute("href");
    const imageSrc = image?.getAttribute("src");

    if(!href || !title){
      throw new Error("Incomplete latest article data");
    }

    root.innerHTML = `
      <a class="sj-latest-article-card" href="${escapeHTML(href)}">
        ${imageSrc ? `
          <div class="sj-latest-article-image">
            <img
              src="${escapeHTML(imageSrc)}"
              alt=""
              loading="lazy"
            >
          </div>
        ` : ""}

        <div class="sj-latest-article-copy">
          <span class="sj-article-label">Latest Article</span>
          <h3>${escapeHTML(title)}</h3>
          ${excerpt ? `<p>${escapeHTML(excerpt)}</p>` : ""}
        </div>
      </a>
    `;
  }catch(error){
    console.warn("Latest article failed.", error);

    root.innerHTML = `
      <a class="sj-latest-article-card" href="/articles.html">
        <div class="sj-latest-article-copy">
          <span class="sj-article-label">Articles</span>
          <h3>Read the latest from Semitic Jew.</h3>
        </div>
      </a>
    `;
  }
}


/* =========================================================
   Home: Ask composer
   ========================================================= */

const QUESTION_DRAFTS_KEY = "sj_v3_question_drafts_v1";

document
  .querySelector("[data-home-ask-open]")
  ?.addEventListener("click", event => {
    const button = event.currentTarget;

    const composer = document.querySelector(
      "[data-home-ask-compose]"
    );

    const label = button.querySelector(
      "[data-home-ask-toggle-label]"
    );

    if(!composer) return;

    const willOpen = composer.hidden;

    composer.hidden = !willOpen;

    button.classList.toggle(
      "is-open",
      willOpen
    );

    button.setAttribute(
      "aria-expanded",
      String(willOpen)
    );

    if(label){
      label.textContent = willOpen
        ? "Close Question"
        : "Write a Question";
    }

    if(willOpen){
      document
        .getElementById("sj-home-ask-input")
        ?.focus();
    }
  });


document
  .querySelector("[data-home-ask-save]")
  ?.addEventListener("click", () => {
    const input = document.getElementById(
      "sj-home-ask-input"
    );

    const status = document.querySelector(
      "[data-home-ask-status]"
    );

    const question = input?.value.trim() || "";

    if(!question){
      if(status){
        status.textContent = "Write a question first.";
      }

      return;
    }

    try{
      const drafts = JSON.parse(
        localStorage.getItem(QUESTION_DRAFTS_KEY) || "[]"
      );

      const safeDrafts = Array.isArray(drafts)
        ? drafts
        : [];

      safeDrafts.unshift({
        question,
        savedAt:new Date().toISOString()
      });

      localStorage.setItem(
        QUESTION_DRAFTS_KEY,
        JSON.stringify(safeDrafts.slice(0, 25))
      );

      if(status){
        status.textContent = "Question saved on this device.";
      }

      input.value = "";
    }catch(error){
      console.warn("Could not save question.", error);

      if(status){
        status.textContent = "Could not save this question.";
      }
    }
  });


/* =========================================================
   Initialize Home
   ========================================================= */

loadDailyPrecept();
/* =========================================================
   Build 3H.3 — Actual Articles Browser
   ========================================================= */

let articleBrowserCache = [];
let activeArticleReaderURL = null;


function articleBrowserRoot(){
  return document.querySelector(
    "[data-articles-browser]"
  );
}


function normalizeArticleImageURL(value){
  const image = cleanText(value);

  if(!image){
    return "";
  }

  return image
    .replace(
      /^https?:\/\/(?:www\.)?semiticjew\.org/i,
      ""
    )
    .replace(
      /^\/israelite-research\//,
      "/"
    );
}


function parseArticleCard(card){
  if(!card){
    return null;
  }

  const link = card.querySelector(
    'a[href*="/articles/"]'
  );

  const title = card.querySelector(
    ".card-body h3, h3"
  );

  const excerpt = card.querySelector(
    ".card-body p, p.muted"
  );

  const image = card.querySelector(
    ".image-block img, img"
  );

  const author = card.querySelector(
    ".author"
  );

  const href = cleanText(
    link?.getAttribute("href")
  );

  const titleText = decodeHTMLEntities(
    cleanText(title?.textContent)
  );

  const excerptText = decodeHTMLEntities(
    cleanText(excerpt?.textContent)
  );

  const imageURL = normalizeArticleImageURL(
    image?.getAttribute("src")
  );

  const authorText = decodeHTMLEntities(
    cleanText(author?.textContent)
  ) || "Semitic Jew";

  if(
    !href ||
    !titleText
  ){
    return null;
  }

  return {
    href,
    title:titleText,
    excerpt:excerptText,
    image:imageURL,
    author:authorText
  };
}


function renderArticlesBrowserError(){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  root.innerHTML = `
    <section class="sj-articles-error">
      <span class="sj-article-label">
        Articles
      </span>

      <h2>
        Articles could not be loaded.
      </h2>

      <p>
        Please try again.
      </p>

      <button
        type="button"
        data-reload-articles
      >
        Reload
      </button>
    </section>
  `;
}


function renderArticlesBrowser(articles){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  if(!Array.isArray(articles) || !articles.length){
    renderArticlesBrowserError();
    return;
  }

  const [featured, ...remaining] = articles;

  root.innerHTML = `
    <section
      class="sj-articles-featured-section"
      aria-labelledby="sj-articles-latest-title"
    >
      <div class="sj-articles-section-head">
        <span class="sj-article-label">
          Latest
        </span>

        <h2 id="sj-articles-latest-title">
          Latest Article
        </h2>
      </div>

      <a
        class="sj-articles-featured-card"
        href="${escapeHTML(featured.href)}"
        data-app-article-link
      >
        ${
          featured.image
            ? `
              <div class="sj-articles-featured-image">
                <img
                  src="${escapeHTML(featured.image)}"
                  alt=""
                  loading="eager"
                >
              </div>
            `
            : ""
        }

        <div class="sj-articles-featured-copy">
          <h3>
            ${escapeHTML(featured.title)}
          </h3>

          ${
            featured.excerpt
              ? `
                <p>
                  ${escapeHTML(featured.excerpt)}
                </p>
              `
              : ""
          }

          <span class="sj-articles-author">
            By ${escapeHTML(featured.author)}
          </span>
        </div>
      </a>
    </section>

    <section
      class="sj-articles-library-section"
      aria-labelledby="sj-articles-library-title"
    >
      <div class="sj-articles-section-head">
        <span class="sj-article-label">
          Library
        </span>

        <h2 id="sj-articles-library-title">
          All Articles
        </h2>
      </div>

      <div class="sj-articles-list">
        ${remaining.map(article => `
          <a
            class="sj-articles-list-card"
            href="${escapeHTML(article.href)}"
            data-app-article-link
          >
            ${
              article.image
                ? `
                  <div class="sj-articles-list-image">
                    <img
                      src="${escapeHTML(article.image)}"
                      alt=""
                      loading="lazy"
                    >
                  </div>
                `
                : ""
            }

            <div class="sj-articles-list-copy">
              <h3>
                ${escapeHTML(article.title)}
              </h3>

              ${
                article.excerpt
                  ? `
                    <p>
                      ${escapeHTML(article.excerpt)}
                    </p>
                  `
                  : ""
              }

              <span>
                ${escapeHTML(article.author)}
              </span>
            </div>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}




/* =========================================================
   Build 3H.4.2 — Actual in-app Article reader
   ========================================================= */

function articleReaderTitle(doc){
  return decodeHTMLEntities(
    cleanText(
      doc.querySelector(
        ".article-title"
      )?.textContent
    )
  );
}


function articleReaderDate(doc){
  const date = doc.querySelector(
    ".article-date time, .article-date"
  );

  return decodeHTMLEntities(
    cleanText(
      date?.textContent
    )
  );
}


function articleReaderAuthor(doc){
  return decodeHTMLEntities(
    cleanText(
      doc.querySelector(
        ".byline-name"
      )?.textContent
    )
  ) || "Semitic Jew";
}


function articleReaderHero(doc){
  const image = doc.querySelector(
    ".hero-image img, img.hero-image"
  );

  if(!image){
    return null;
  }

  return {
    src:normalizeArticleImageURL(
      image.getAttribute("src")
    ),
    alt:decodeHTMLEntities(
      cleanText(
        image.getAttribute("alt")
      )
    )
  };
}


function prepareArticleReaderFragment(
  source,
  articleURL
){
  if(!source){
    return "";
  }

  const clone = source.cloneNode(true);

  clone.querySelectorAll(
    "script, style, iframe, form"
  ).forEach(element => {
    element.remove();
  });

  const baseURL = new URL(
    articleURL,
    window.location.origin
  );

  clone.querySelectorAll(
    "[src]"
  ).forEach(element => {
    const value = cleanText(
      element.getAttribute("src")
    );

    if(!value){
      return;
    }

    try{
      const resolved = new URL(
        value,
        baseURL
      );

      element.setAttribute(
        "src",
        resolved.pathname +
          resolved.search +
          resolved.hash
      );
    }catch(error){
      console.warn(
        "Could not normalize article image URL.",
        value,
        error
      );
    }
  });

  clone.querySelectorAll(
    "a[href]"
  ).forEach(link => {
    const value = cleanText(
      link.getAttribute("href")
    );

    if(!value){
      return;
    }

    if(value.startsWith("#")){
      return;
    }

    try{
      const resolved = new URL(
        value,
        baseURL
      );

      const sameOrigin =
        resolved.origin ===
        window.location.origin;

      if(
        sameOrigin &&
        resolved.pathname.startsWith(
          "/articles/"
        )
      ){
        link.setAttribute(
          "href",
          resolved.pathname +
            resolved.search +
            resolved.hash
        );

        link.setAttribute(
          "data-app-article-link",
          ""
        );

        return;
      }

      link.setAttribute(
        "href",
        resolved.href
      );

      if(!sameOrigin){
        link.setAttribute(
          "target",
          "_blank"
        );

        link.setAttribute(
          "rel",
          "noopener noreferrer"
        );
      }

    }catch(error){
      console.warn(
        "Could not normalize article link.",
        value,
        error
      );
    }
  });

  return clone.innerHTML;
}


function renderArticleReaderLoading(){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  root.innerHTML = `
    <section class="sj-app-article-reader">
      <button
        class="sj-app-article-back"
        type="button"
        data-app-article-back
      >
        <span aria-hidden="true">‹</span>
        <span>Articles</span>
      </button>

      <div class="sj-app-article-loading">
        <span
          class="sj-articles-loading-ring"
          aria-hidden="true"
        ></span>

        <p>Loading article...</p>
      </div>
    </section>
  `;
}


function renderArticleReaderError(){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  root.innerHTML = `
    <section class="sj-app-article-reader">
      <button
        class="sj-app-article-back"
        type="button"
        data-app-article-back
      >
        <span aria-hidden="true">‹</span>
        <span>Articles</span>
      </button>

      <div class="sj-app-article-error">
        <span class="sj-article-label">
          Article
        </span>

        <h2>
          This article could not be loaded.
        </h2>

        <p>
          Return to the Articles library and try again.
        </p>
      </div>
    </section>
  `;
}


function renderArticleReader(
  articleURL,
  doc
){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  const title = articleReaderTitle(doc);
  const date = articleReaderDate(doc);
  const author = articleReaderAuthor(doc);
  const hero = articleReaderHero(doc);

  const content = doc.querySelector(
    ".article-content"
  );

  const footnotes = doc.querySelector(
    ".footnotes"
  );

  if(
    !title ||
    !content
  ){
    throw new Error(
      "Article title or article content is missing."
    );
  }

  const contentHTML =
    prepareArticleReaderFragment(
      content,
      articleURL
    );

  const footnotesHTML =
    footnotes
      ? prepareArticleReaderFragment(
          footnotes,
          articleURL
        )
      : "";

  root.innerHTML = `
    <article
      class="sj-app-article-reader"
      data-app-article-reader
    >
      <div class="sj-app-article-reader-topbar">
        <button
          class="sj-app-article-back"
          type="button"
          data-app-article-back
        >
          <span aria-hidden="true">‹</span>
          <span>Articles</span>
        </button>

        <button
          class="sj-app-article-share"
          type="button"
          data-app-article-share
          aria-label="Share this article"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v6h14v-6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <span>Share</span>
        </button>
      </div>

      <header class="sj-app-article-head">
        <p class="sj-app-article-kicker">
          Semitic Jew Institute
        </p>

        <h2>
          ${escapeHTML(title)}
        </h2>

        <div class="sj-app-article-meta">
          <span>
            By ${escapeHTML(author)}
          </span>

          ${
            date
              ? `
                <span aria-hidden="true">•</span>
                <time>
                  ${escapeHTML(date)}
                </time>
              `
              : ""
          }
        </div>
      </header>

      ${
        hero?.src
          ? `
            <figure class="sj-app-article-hero">
              <img
                src="${escapeHTML(hero.src)}"
                alt="${escapeHTML(hero.alt || "")}"
              >
            </figure>
          `
          : ""
      }

      <div class="sj-app-article-body">
        ${contentHTML}
      </div>

      ${
        footnotesHTML
          ? `
            <hr class="sj-app-article-divider">

            <section
              class="sj-app-article-footnotes"
              aria-label="References and footnotes"
            >
              <p class="sj-app-article-reference-label">
                References
              </p>

              ${footnotesHTML}
            </section>
          `
          : ""
      }

      <div class="sj-app-article-end">
        <span aria-hidden="true"></span>

        <p>
          Scripture. Logic. Truth.
        </p>

        <button
          type="button"
          data-app-article-back
        >
          Back to Articles
        </button>
      </div>
    </article>
  `;

  window.scrollTo({
    top:0,
    behavior:"instant"
  });
}


async function openArticleReader(articleURL){
  const href = cleanText(articleURL);

  if(!href){
    return;
  }

  activeArticleReaderURL = href;

  renderArticleReaderLoading();

  try{
    const response = await fetch(
      `${href}${
        href.includes("?")
          ? "&"
          : "?"
      }appReader=${Date.now()}`
    );

    if(!response.ok){
      throw new Error(
        `Article returned ${response.status}`
      );
    }

    const html = await response.text();

    const doc = new DOMParser().parseFromString(
      html,
      "text/html"
    );

    renderArticleReader(
      href,
      doc
    );

  }catch(error){
    console.warn(
      "In-app Article reader failed.",
      error
    );

    renderArticleReaderError();
  }
}


function closeArticleReader(){
  activeArticleReaderURL = null;

  if(articleBrowserCache.length){
    renderArticlesBrowser(
      articleBrowserCache
    );
  }else{
    loadArticlesBrowser();
  }

  window.scrollTo({
    top:0,
    behavior:"instant"
  });
}


async function shareActiveArticle(){
  if(!activeArticleReaderURL){
    return;
  }

  const title = cleanText(
    document.querySelector(
      ".sj-app-article-head h2"
    )?.textContent
  ) || "Semitic Jew Article";

  const shareURL = new URL(
    activeArticleReaderURL,
    "https://semiticjew.org"
  ).href;

  try{
    if(navigator.share){
      await navigator.share({
        title,
        url:shareURL
      });

      return;
    }

    await navigator.clipboard.writeText(
      shareURL
    );

    const button = document.querySelector(
      "[data-app-article-share]"
    );

    if(button){
      const label = button.querySelector(
        "span"
      );

      if(label){
        const original = label.textContent;

        label.textContent = "Copied";

        setTimeout(() => {
          label.textContent = original;
        }, 1600);
      }
    }

  }catch(error){
    if(error?.name === "AbortError"){
      return;
    }

    console.warn(
      "Article sharing failed.",
      error
    );
  }
}




async function loadArticlesBrowser(){
  const root = articleBrowserRoot();

  if(!root){
    return;
  }

  try{
    const response = await fetch(
      `/articles.html?appArticles=${Date.now()}`
    );

    if(!response.ok){
      throw new Error(
        `articles.html returned ${response.status}`
      );
    }

    const html = await response.text();

    const doc = new DOMParser().parseFromString(
      html,
      "text/html"
    );

    const cards = [
      doc.querySelector(".featured-left"),
      doc.querySelector(".featured-right"),
      ...Array.from(
        doc.querySelectorAll(
          ".article-card"
        )
      )
    ].filter(Boolean);

    const articles = [];
    const seen = new Set();

    cards.forEach(card => {
      const article = parseArticleCard(card);

      if(
        !article ||
        seen.has(article.href)
      ){
        return;
      }

      seen.add(article.href);
      articles.push(article);
    });

    if(!articles.length){
      throw new Error(
        "No article cards were found."
      );
    }

    articleBrowserCache = articles;

    renderArticlesBrowser(articles);

  }catch(error){
    console.warn(
      "Articles browser failed.",
      error
    );

    renderArticlesBrowserError();
  }
}


loadLatestArticle();

loadArticlesBrowser();


/* =========================================================
   Build 3D — Bible canon / book / chapter navigation
   ========================================================= */

const SCRIPTURE_CANON_URL =
  "/data/app/scripture-canon.json";

const READER_LOCATION_KEY =
  "sj_v3_reader_location_v1";

const READER_FONT_KEY =
  "sj_v3_reader_font_size_v1";

const READER_FONT_SIZES = [
  "base",
  "large",
  "xlarge"
];

let scriptureCanonData = null;

const READER_BOOKMARKS_KEY =
  "sj_scripture_bookmarks_v1";

const READER_HIGHLIGHTS_KEY =
  "sj_verse_highlights_v1";

const READER_NOTES_KEY =
  "sj_v3_verse_notes_v1";


let bibleBrowserStage = "canons";
let selectedBibleCanon = null;
let selectedBibleBook = null;
let selectedBibleChapter = null;
let selectedReaderVerse = null;

let readerWordStudyOrderCache = null;
let readerHebrewLexiconCache = null;
let readerGreekLexiconCache = null;

let activeReaderWordStudyTerms = [];
let activeReaderWordStudyIndex = 0;


function bibleCanonMenu(){
  return document.querySelector(
    "[data-biblia-canon-menu]"
  );
}


function bibleBrowserShell(){
  return document.querySelector(
    "[data-bible-browser]"
  );
}


function hideBibleCanonMenu(){
  const menu = bibleCanonMenu();

  if(menu){
    menu.hidden = true;
  }
}


function bibleBrowserContent(){
  return document.querySelector(
    "[data-bible-browser-content]"
  );
}


function bibleStageTitle(){
  return document.querySelector(
    "[data-bible-stage-title]"
  );
}


function bibleStageKicker(){
  return document.querySelector(
    "[data-bible-stage-kicker]"
  );
}


function bibleBackButton(){
  return document.querySelector(
    "[data-bible-back]"
  );
}


function setBibleNotice(message = ""){
  const notice = document.querySelector(
    "[data-bible-notice]"
  );

  if(notice){
    notice.textContent = message;
  }
}


function getBibleCanon(slug){
  return scriptureCanonData?.canons?.find(
    canon => canon.slug === slug
  ) || null;
}


function getBibleBook(canonSlug, bookSlug){
  const canon = getBibleCanon(canonSlug);

  return canon?.books?.find(
    book => book.slug === bookSlug
  ) || null;
}


function saveBibleLocation(){
  if(
    !selectedBibleCanon ||
    !selectedBibleBook ||
    !selectedBibleChapter
  ){
    return;
  }

  try{
    localStorage.setItem(
      READER_LOCATION_KEY,
      JSON.stringify({
        canon:selectedBibleCanon,
        book:selectedBibleBook,
        chapter:selectedBibleChapter,
        savedAt:new Date().toISOString()
      })
    );
  }catch(error){
    console.warn(
      "Could not save Bible location.",
      error
    );
  }
}


function readBibleLocation(){
  try{
    const stored = JSON.parse(
      localStorage.getItem(
        READER_LOCATION_KEY
      ) || "null"
    );

    if(
      stored &&
      typeof stored === "object"
    ){
      return stored;
    }
  }catch(error){
    console.warn(
      "Could not restore Bible location.",
      error
    );
  }

  return null;
}


function renderBibleCanons(){
  const menu = bibleCanonMenu();

  if(!menu || !scriptureCanonData) return;

  bibleBrowserStage = "canons";

  selectedBibleCanon = null;
  selectedBibleBook = null;
  selectedBibleChapter = null;

  const browser = bibleBrowserShell();

  if(browser){
    browser.hidden = true;
  }

  updateBibliaPath();

  menu.innerHTML = `
    <div class="sj-canon-menu-list">
      ${scriptureCanonData.canons.map(
        canon => `
          <button
            class="sj-canon-menu-option"
            type="button"
            data-bible-canon="${escapeHTML(canon.slug)}"
          >
            <span>
              <strong>
                ${escapeHTML(canon.name)}
              </strong>
            </span>

            <span>
              ${canon.books.length} books
            </span>

            <span
              class="sj-canon-menu-option-arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;

  menu.hidden = false;
}


function renderBibleBooks(canonSlug){
  const root = bibleBrowserContent();
  const canon = getBibleCanon(canonSlug);

  if(!root || !canon) return;

  bibleBrowserStage = "books";

  selectedBibleCanon = canon.slug;
  selectedBibleBook = null;
  selectedBibleChapter = null;

  hideBibleCanonMenu();

  const browser = bibleBrowserShell();

  if(browser){
    browser.hidden = false;
  }

  updateBibliaPath();

  const title = bibleStageTitle();
  const kicker = bibleStageKicker();
  const back = bibleBackButton();

  if(title){
    title.textContent = canon.name;
  }

  if(kicker){
    kicker.textContent = "Select a book";
  }

  if(back){
    back.hidden = false;
  }

  root.innerHTML = `
    <div class="sj-book-list">
      ${canon.books.map(
        book => `
          <button
            class="sj-book-row"
            type="button"
            data-bible-book="${escapeHTML(book.slug)}"
          >
            <strong>
              ${escapeHTML(book.name)}
            </strong>

            <span class="sj-book-row-meta">
              <span>
                ${book.chapters}
                ${book.chapters === 1 ? "chapter" : "chapters"}
              </span>

              <span
                class="sj-book-row-arrow"
                aria-hidden="true"
              >
                ›
              </span>
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;
}


function renderBibleChapters(
  canonSlug,
  bookSlug
){
  const root = bibleBrowserContent();

  const canon = getBibleCanon(canonSlug);

  const book = getBibleBook(
    canonSlug,
    bookSlug
  );

  if(!root || !canon || !book) return;

  bibleBrowserStage = "chapters";

  selectedBibleCanon = canon.slug;
  selectedBibleBook = book.slug;

  hideBibleCanonMenu();

  const browser = bibleBrowserShell();

  if(browser){
    browser.hidden = false;
  }

  updateBibliaPath();

  const savedLocation = readBibleLocation();

  selectedBibleChapter =
    savedLocation?.canon === canon.slug &&
    savedLocation?.book === book.slug
      ? Number(savedLocation.chapter)
      : null;

  const title = bibleStageTitle();
  const kicker = bibleStageKicker();
  const back = bibleBackButton();

  if(title){
    title.textContent = book.name;
  }

  if(kicker){
    kicker.textContent =
      `${canon.name} · Select a chapter`;
  }

  if(back){
    back.hidden = false;
  }

  const chapterButtons = Array.from(
    { length:book.chapters },
    (_, index) => index + 1
  ).map(chapter => `
    <button
      class="sj-chapter-button${
        selectedBibleChapter === chapter
          ? " is-selected"
          : ""
      }"
      type="button"
      data-bible-chapter="${chapter}"
      aria-label="${
        escapeHTML(book.name)
      } chapter ${chapter}"
    >
      ${chapter}
    </button>
  `).join("");

  root.innerHTML = `
    <div class="sj-chapter-grid">
      ${chapterButtons}
    </div>

    <p
      class="sj-chapter-selection-status"
      data-bible-chapter-status
    >
      ${
        selectedBibleChapter
          ? `${escapeHTML(book.name)} ${selectedBibleChapter} selected.`
          : "Select a chapter."
      }
    </p>
  `;
}


function readReaderArray(key){
  try{
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value)
      ? value
      : [];
  }catch(error){
    console.warn(
      `Unable to read reader data: ${key}`,
      error
    );

    return [];
  }
}


function writeReaderArray(
  key,
  value
){
  try{
    localStorage.setItem(
      key,
      JSON.stringify(
        Array.isArray(value)
          ? value
          : []
      )
    );

    return true;
  }catch(error){
    console.warn(
      `Unable to save reader data: ${key}`,
      error
    );

    return false;
  }
}


function readReaderNotes(){
  try{
    const value = JSON.parse(
      localStorage.getItem(
        READER_NOTES_KEY
      ) || "{}"
    );

    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      ? value
      : {};
  }catch(error){
    console.warn(
      "Unable to read reader notes.",
      error
    );

    return {};
  }
}


function writeReaderNotes(value){
  try{
    localStorage.setItem(
      READER_NOTES_KEY,
      JSON.stringify(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
          ? value
          : {}
      )
    );

    return true;
  }catch(error){
    console.warn(
      "Unable to save reader notes.",
      error
    );

    return false;
  }
}


function readerVerseKey(
  canonSlug,
  bookSlug,
  chapter,
  verse
){
  return [
    canonSlug,
    bookSlug,
    chapter,
    verse
  ].join(":");
}


function getReaderBookmark(key){
  return readReaderArray(
    READER_BOOKMARKS_KEY
  ).find(item => (
    item?.key === key
  )) || null;
}


function getReaderHighlight(key){
  return readReaderArray(
    READER_HIGHLIGHTS_KEY
  ).find(item => (
    item?.key === key
  )) || null;
}


function readerHighlightClass(color){
  const allowed = new Set([
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet"
  ]);

  return allowed.has(color)
    ? `sj-reader-highlight-${color}`
    : "";
}


function clearReaderHighlightClasses(
  verseElement
){
  if(!verseElement) return;

  [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet"
  ].forEach(color => {
    verseElement.classList.remove(
      `sj-reader-highlight-${color}`
    );
  });
}


function closeReaderActionTray(){
  selectedReaderVerse = null;

  document
    .querySelectorAll(".sj-reader-verse.is-selected")
    .forEach(verse => {
      verse.classList.remove("is-selected");
    });

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(tray){
    tray.hidden = true;
  }

  document.body.classList.remove(
    "sj-reader-tray-open"
  );
}


function updateReaderActionTray(){
  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(!tray || !selectedReaderVerse){
    return;
  }

  const reference = tray.querySelector(
    "[data-reader-action-reference]"
  );

  if(reference){
    reference.textContent =
      selectedReaderVerse.ref;
  }

  const saveButton = tray.querySelector(
    '[data-reader-tool="save"]'
  );

  const noteButton = tray.querySelector(
    '[data-reader-tool="note"]'
  );

  const highlightButton = tray.querySelector(
    '[data-reader-tool="highlight"]'
  );

  const bookmark = getReaderBookmark(
    selectedReaderVerse.key
  );

  const notes = readReaderNotes();

  const note = notes[
    selectedReaderVerse.key
  ];

  const highlight = getReaderHighlight(
    selectedReaderVerse.key
  );

  if(saveButton){
    saveButton.classList.toggle(
      "is-active",
      Boolean(bookmark)
    );

    saveButton.setAttribute(
      "aria-pressed",
      String(Boolean(bookmark))
    );

    const label = saveButton.querySelector(
      ".sj-reader-tool-label"
    );

    if(label){
      label.textContent = bookmark
        ? "Saved"
        : "Save";
    }
  }

  if(noteButton){
    noteButton.classList.toggle(
      "is-active",
      Boolean(note?.note)
    );
  }

  if(highlightButton){
    highlightButton.classList.toggle(
      "is-active",
      Boolean(highlight)
    );

    highlightButton.dataset.highlightColor =
      highlight?.category || "";
  }

  const palette = tray.querySelector(
    "[data-reader-highlight-palette]"
  );

  if(palette){
    palette.hidden = true;
  }
}


function selectReaderVerse(
  verseElement
){
  if(!verseElement) return;

  const book = getBibleBook(
    selectedBibleCanon,
    selectedBibleBook
  );

  if(
    !book ||
    !selectedBibleCanon ||
    !selectedBibleBook ||
    !selectedBibleChapter
  ){
    return;
  }

  const verseNumber = Number(
    verseElement.dataset.readerVerse
  );

  const text = (
    verseElement.querySelector(
      ".sj-reader-verse-text"
    )?.textContent || ""
  ).trim();

  const strongs = (
    verseElement.dataset.readerStrongs || ""
  )
    .split(",")
    .filter(Boolean);

  const key = readerVerseKey(
    selectedBibleCanon,
    selectedBibleBook,
    selectedBibleChapter,
    verseNumber
  );

  const ref =
    `${book.name} ${selectedBibleChapter}:${verseNumber}`;

  const isSameVerse =
    selectedReaderVerse?.key === key;

  if(isSameVerse){
    closeReaderActionTray();
    return;
  }

  document
    .querySelectorAll(".sj-reader-verse.is-selected")
    .forEach(verse => {
      verse.classList.remove("is-selected");
    });

  verseElement.classList.add(
    "is-selected"
  );

  selectedReaderVerse = {
    key,
    ref,
    text,
    verse:verseNumber,
    chapter:selectedBibleChapter,
    canon:selectedBibleCanon,
    book:selectedBibleBook,
    strongs
  };

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(tray){
    tray.hidden = false;
  }

  document.body.classList.add(
    "sj-reader-tray-open"
  );

  updateReaderActionTray();
}


function toggleReaderBookmark(){
  if(!selectedReaderVerse) return;

  const bookmarks = readReaderArray(
    READER_BOOKMARKS_KEY
  );

  const exists = bookmarks.some(
    item => (
      item?.key === selectedReaderVerse.key
    )
  );

  const next = exists
    ? bookmarks.filter(
        item => (
          item?.key !== selectedReaderVerse.key
        )
      )
    : [
        {
          key:selectedReaderVerse.key,
          ref:selectedReaderVerse.ref,
          text:selectedReaderVerse.text,
          canon:selectedReaderVerse.canon,
          book:selectedReaderVerse.book,
          chapter:selectedReaderVerse.chapter,
          verse:selectedReaderVerse.verse,
          url:
            `/app.html?canon=${
              encodeURIComponent(
                selectedReaderVerse.canon
              )
            }&book=${
              encodeURIComponent(
                selectedReaderVerse.book
              )
            }&chapter=${
              selectedReaderVerse.chapter
            }&verse=${
              selectedReaderVerse.verse
            }#bible`,
          savedAt:new Date().toISOString()
        },
        ...bookmarks.filter(
          item => (
            item?.key !== selectedReaderVerse.key
          )
        )
      ];

  writeReaderArray(
    READER_BOOKMARKS_KEY,
    next.slice(0, 300)
  );

  updateReaderActionTray();
}


function editReaderNote(){
  if(!selectedReaderVerse) return;

  const notes = readReaderNotes();

  const existing = notes[
    selectedReaderVerse.key
  ]?.note || "";

  const next = window.prompt(
    `Note for ${selectedReaderVerse.ref}`,
    existing
  );

  if(next === null){
    return;
  }

  const trimmed = next.trim();

  if(trimmed){
    notes[selectedReaderVerse.key] = {
      key:selectedReaderVerse.key,
      ref:selectedReaderVerse.ref,
      text:selectedReaderVerse.text,
      note:trimmed,
      savedAt:new Date().toISOString()
    };
  }else{
    delete notes[selectedReaderVerse.key];
  }

  writeReaderNotes(notes);
  updateReaderActionTray();
}


async function copySelectedReaderVerse(){
  if(!selectedReaderVerse) return;

  const value =
    `${selectedReaderVerse.ref} — ${
      selectedReaderVerse.text
    }`;

  try{
    await navigator.clipboard.writeText(
      value
    );

    setBibleNotice(
      `${selectedReaderVerse.ref} copied.`
    );
  }catch(error){
    console.warn(
      "Unable to copy selected verse.",
      error
    );

    window.prompt(
      "Copy this verse:",
      value
    );
  }
}


async function shareSelectedReaderVerse(){
  if(!selectedReaderVerse) return;

  const value =
    `${selectedReaderVerse.ref}\n\n${
      selectedReaderVerse.text
    }\n\nSemitic Jew Institute`;

  if(navigator.share){
    try{
      await navigator.share({
        title:selectedReaderVerse.ref,
        text:value
      });

      return;
    }catch(error){
      if(error?.name === "AbortError"){
        return;
      }

      console.warn(
        "Native verse share failed.",
        error
      );
    }
  }

  try{
    await navigator.clipboard.writeText(
      value
    );

    setBibleNotice(
      `${selectedReaderVerse.ref} copied for sharing.`
    );
  }catch(error){
    console.warn(
      "Verse share fallback failed.",
      error
    );
  }
}


function saveReaderHighlight(color){
  if(!selectedReaderVerse) return;

  const highlights = readReaderArray(
    READER_HIGHLIGHTS_KEY
  );

  const withoutCurrent = highlights.filter(
    item => (
      item?.key !== selectedReaderVerse.key
    )
  );

  const allowed = new Set([
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet"
  ]);

  const next = allowed.has(color)
    ? [
        {
          key:selectedReaderVerse.key,
          ref:selectedReaderVerse.ref,
          text:selectedReaderVerse.text,
          canon:selectedReaderVerse.canon,
          book:selectedReaderVerse.book,
          chapter:selectedReaderVerse.chapter,
          verse:selectedReaderVerse.verse,
          category:color,
          savedAt:new Date().toISOString()
        },
        ...withoutCurrent
      ]
    : withoutCurrent;

  writeReaderArray(
    READER_HIGHLIGHTS_KEY,
    next.slice(0, 300)
  );

  const selectedElement = document.querySelector(
    `[data-reader-key="${
      CSS.escape(selectedReaderVerse.key)
    }"]`
  );

  clearReaderHighlightClasses(
    selectedElement
  );

  if(
    selectedElement &&
    allowed.has(color)
  ){
    selectedElement.classList.add(
      `sj-reader-highlight-${color}`
    );
  }

  updateReaderActionTray();
}


function toggleReaderHighlightPalette(){
  const palette = document.querySelector(
    "[data-reader-highlight-palette]"
  );

  if(!palette) return;

  palette.hidden = !palette.hidden;
}


function readerWordStudyModal(){
  return document.querySelector(
    "[data-reader-word-study-modal]"
  );
}


function readerWordStudyContent(){
  return document.querySelector(
    "[data-reader-word-study-content]"
  );
}


function readerWordStudyWordStrip(){
  return document.querySelector(
    "[data-reader-word-study-words]"
  );
}


function readerWordStudyStatus(){
  return document.querySelector(
    "[data-reader-word-study-status]"
  );
}


function readerWordStudyReference(){
  return document.querySelector(
    "[data-reader-word-study-reference]"
  );
}


async function loadReaderWordStudyOrder(){
  if(readerWordStudyOrderCache){
    return readerWordStudyOrderCache;
  }

  readerWordStudyOrderCache = await fetchJSON(
    "/data/lexicon/verse-strongs-order.json"
  );

  return readerWordStudyOrderCache;
}


async function loadReaderHebrewLexicon(){
  if(readerHebrewLexiconCache){
    return readerHebrewLexiconCache;
  }

  readerHebrewLexiconCache = await fetchJSON(
    "/data/lexicon/strongs-hebrew.json"
  );

  return readerHebrewLexiconCache;
}


async function loadReaderGreekLexicon(){
  if(readerGreekLexiconCache){
    return readerGreekLexiconCache;
  }

  readerGreekLexiconCache = await fetchJSON(
    "/data/lexicon/strongs-greek.json"
  );

  return readerGreekLexiconCache;
}


function cleanWordStudyText(value){
  return typeof value === "string"
    ? value.trim()
    : "";
}


function usefulWordStudyText(value){
  const text = cleanWordStudyText(value);

  if(!text){
    return "";
  }

  const rejected = new Set([
    "or",
    "n.",
    "vb.",
    "adj.",
    "adv.",
    "prep.",
    "conj.",
    "pron."
  ]);

  return rejected.has(text.toLowerCase())
    ? ""
    : text;
}


function usefulWordStudyList(value){
  if(!Array.isArray(value)){
    return [];
  }

  return value
    .map(usefulWordStudyText)
    .filter(Boolean);
}


function wordStudyLexiconForCode(code){
  if(
    code.startsWith("H") &&
    readerHebrewLexiconCache
  ){
    return readerHebrewLexiconCache[code] || null;
  }

  if(
    code.startsWith("G") &&
    readerGreekLexiconCache
  ){
    return readerGreekLexiconCache[code] || null;
  }

  return null;
}


function wordStudyOrderKey(verse){
  if(!verse){
    return "";
  }

  return [
    verse.canon,
    verse.book,
    verse.chapter,
    verse.verse
  ].join("/");
}


function renderReaderWordStudyLoading(){
  const content = readerWordStudyContent();
  const strip = readerWordStudyWordStrip();
  const status = readerWordStudyStatus();

  if(strip){
    strip.innerHTML = "";
    strip.hidden = true;
  }

  if(status){
    status.hidden = false;
    status.textContent =
      "Loading original-language study data...";
  }

  if(content){
    content.innerHTML = `
      <div class="sj-word-study-loading">
        <span
          class="sj-word-study-spinner"
          aria-hidden="true"
        ></span>

        <p>
          Loading Word Study...
        </p>
      </div>
    `;
  }
}


function renderReaderWordStudyEmpty(message){
  const content = readerWordStudyContent();
  const strip = readerWordStudyWordStrip();
  const status = readerWordStudyStatus();

  activeReaderWordStudyTerms = [];
  activeReaderWordStudyIndex = 0;

  if(strip){
    strip.innerHTML = "";
    strip.hidden = true;
  }

  if(status){
    status.hidden = true;
  }

  if(content){
    content.innerHTML = `
      <div class="sj-word-study-empty">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"></path>
          <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"></path>
        </svg>

        <h3>Word Study unavailable</h3>

        <p>
          ${escapeHTML(message)}
        </p>
      </div>
    `;
  }
}


function renderReaderWordStudyWords(){
  const strip = readerWordStudyWordStrip();

  if(!strip){
    return;
  }

  strip.hidden = false;

  strip.innerHTML = activeReaderWordStudyTerms
    .map((term, index) => {
      const word = usefulWordStudyText(term.word);

      const label = word || term.code;

      return `
        <button
          type="button"
          class="sj-word-study-word${
            index === activeReaderWordStudyIndex
              ? " is-active"
              : ""
          }"
          data-reader-word-study-word="${index}"
          aria-pressed="${
            index === activeReaderWordStudyIndex
              ? "true"
              : "false"
          }"
        >
          <span>
            ${escapeHTML(label)}
          </span>

          <small>
            ${escapeHTML(term.code)}
          </small>
        </button>
      `;
    })
    .join("");
}


function renderReaderWordStudyDetail(index){
  const content = readerWordStudyContent();

  if(!content){
    return;
  }

  const term = activeReaderWordStudyTerms[index];

  if(!term){
    renderReaderWordStudyEmpty(
      "No original-language entry was found for this term."
    );

    return;
  }

  activeReaderWordStudyIndex = index;

  renderReaderWordStudyWords();

  const entry = term.lexicon || {};

  const word = usefulWordStudyText(term.word);
  const lemma = usefulWordStudyText(entry.lemma);
  const translit = usefulWordStudyText(entry.translit);
  const gloss = usefulWordStudyText(entry.gloss);

  const definitions = usefulWordStudyList(
    entry.defs
  );

  const refs = usefulWordStudyList(
    entry.refs
  );

  const strongsDefinition = usefulWordStudyText(
    entry.strongs_def
  );

  const kjvDefinition = usefulWordStudyText(
    entry.kjv_def
  );

  const derivation = usefulWordStudyText(
    entry.derivation
  );

  const isHebrew = term.code.startsWith("H");

  const hasLexiconContent = Boolean(
    lemma ||
    translit ||
    gloss ||
    definitions.length ||
    strongsDefinition ||
    kjvDefinition ||
    derivation ||
    refs.length
  );

  if(!hasLexiconContent){
    content.innerHTML = `
      <div class="sj-word-study-empty">
        <h3>
          ${escapeHTML(word || term.code)}
        </h3>

        <p>
          ${escapeHTML(term.code)} is attached to this verse,
          but no usable lexicon entry is currently available.
        </p>
      </div>
    `;

    return;
  }

  content.innerHTML = `
    <article class="sj-word-study-detail">
      <header class="sj-word-study-term-head">
        <div>
          ${
            word
              ? `
                <p class="sj-word-study-english-word">
                  ${escapeHTML(word)}
                </p>
              `
              : ""
          }

          <span class="sj-word-study-code">
            ${escapeHTML(term.code)}
          </span>
        </div>

        ${
          lemma
            ? `
              <h2
                class="sj-word-study-lemma"
                ${
                  isHebrew
                    ? 'dir="rtl" lang="he"'
                    : 'lang="grc"'
                }
              >
                ${escapeHTML(lemma)}
              </h2>
            `
            : ""
        }

        ${
          translit
            ? `
              <p class="sj-word-study-translit">
                ${escapeHTML(translit)}
              </p>
            `
            : ""
        }

        ${
          gloss
            ? `
              <p class="sj-word-study-gloss">
                ${escapeHTML(gloss)}
              </p>
            `
            : ""
        }
      </header>

      ${
        definitions.length
          ? `
            <section class="sj-word-study-section">
              <h3>Definitions</h3>

              <ul>
                ${definitions.map(definition => `
                  <li>
                    ${escapeHTML(definition)}
                  </li>
                `).join("")}
              </ul>
            </section>
          `
          : ""
      }

      ${
        strongsDefinition
          ? `
            <section class="sj-word-study-section">
              <h3>Strong's Definition</h3>

              <p>
                ${escapeHTML(strongsDefinition)}
              </p>
            </section>
          `
          : ""
      }

      ${
        kjvDefinition
          ? `
            <section class="sj-word-study-section">
              <h3>KJV Usage</h3>

              <p>
                ${escapeHTML(kjvDefinition)}
              </p>
            </section>
          `
          : ""
      }

      ${
        derivation
          ? `
            <section class="sj-word-study-section">
              <h3>Derivation</h3>

              <p>
                ${escapeHTML(derivation)}
              </p>
            </section>
          `
          : ""
      }

      ${
        refs.length
          ? `
            <section class="sj-word-study-section">
              <h3>Reference Examples</h3>

              <div class="sj-word-study-reference-list">
                ${refs.map(ref => `
                  <span>
                    ${escapeHTML(ref)}
                  </span>
                `).join("")}
              </div>
            </section>
          `
          : ""
      }
    </article>
  `;
}


async function openReaderWordStudy(){
  if(!selectedReaderVerse){
    return;
  }

  const modal = readerWordStudyModal();

  if(!modal){
    return;
  }

  const selectedKey = selectedReaderVerse.key;

  const reference = readerWordStudyReference();

  if(reference){
    reference.textContent =
      selectedReaderVerse.ref;
  }

  modal.hidden = false;

  document.body.classList.add(
    "sj-word-study-open"
  );

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(tray){
    tray.hidden = true;
  }

  document.body.classList.remove(
    "sj-reader-tray-open"
  );

  renderReaderWordStudyLoading();

  try{
    const orderData =
      await loadReaderWordStudyOrder();

    if(
      !selectedReaderVerse ||
      selectedReaderVerse.key !== selectedKey
    ){
      return;
    }

    const orderKey = wordStudyOrderKey(
      selectedReaderVerse
    );

    const orderedTerms = Array.isArray(
      orderData?.entries?.[orderKey]
    )
      ? orderData.entries[orderKey]
      : [];

    const fallbackCodes = Array.from(
      new Set(
        Array.isArray(selectedReaderVerse.strongs)
          ? selectedReaderVerse.strongs
          : []
      )
    )
      .filter(code => (
        typeof code === "string" &&
        /^[HG]\d+$/.test(code)
      ));

    const rawTerms = orderedTerms.length
      ? orderedTerms
      : fallbackCodes.map(code => ({
          word:"",
          code
        }));

    if(!rawTerms.length){
      renderReaderWordStudyEmpty(
        selectedReaderVerse.canon === "apocrypha"
          ? "No verified word-level Strong's alignment is currently available for this Apocrypha verse."
          : "No Strong's data is currently attached to this verse."
      );

      return;
    }

    const needsHebrew = rawTerms.some(
      term => term?.code?.startsWith("H")
    );

    const needsGreek = rawTerms.some(
      term => term?.code?.startsWith("G")
    );

    const loads = [];

    if(needsHebrew){
      loads.push(loadReaderHebrewLexicon());
    }

    if(needsGreek){
      loads.push(loadReaderGreekLexicon());
    }

    await Promise.all(loads);

    if(
      !selectedReaderVerse ||
      selectedReaderVerse.key !== selectedKey
    ){
      return;
    }

    activeReaderWordStudyTerms = rawTerms
      .filter(term => (
        term &&
        typeof term.code === "string"
      ))
      .map(term => ({
        word:cleanWordStudyText(term.word),
        code:term.code,
        lexicon:wordStudyLexiconForCode(
          term.code
        )
      }));

    activeReaderWordStudyIndex = 0;

    const status = readerWordStudyStatus();

    if(status){
      if(orderedTerms.length){
        status.hidden = true;
      }else{
        status.hidden = false;
        status.textContent =
          "Exact word-order alignment is unavailable for this verse. Showing attached Strong's entries without claiming word-by-word alignment.";
      }
    }

    if(!activeReaderWordStudyTerms.length){
      renderReaderWordStudyEmpty(
        "No usable Strong's entries were found for this verse."
      );

      return;
    }

    renderReaderWordStudyWords();
    renderReaderWordStudyDetail(0);

  }catch(error){
    console.warn(
      "Unable to load Word Study data.",
      error
    );

    renderReaderWordStudyEmpty(
      "Word Study data could not be loaded. Please try again."
    );
  }
}


function closeReaderWordStudy(){
  const modal = readerWordStudyModal();

  if(modal){
    modal.hidden = true;
  }

  document.body.classList.remove(
    "sj-word-study-open"
  );

  if(!selectedReaderVerse){
    return;
  }

  const tray = document.querySelector(
    "[data-reader-action-tray]"
  );

  if(tray){
    tray.hidden = false;
  }

  document.body.classList.add(
    "sj-reader-tray-open"
  );

  updateReaderActionTray();
}


function bibleChapterDataURL(
  book,
  chapter
){
  return [
    "",
    "data",
    book.dataCanon,
    book.dataSlug,
    `${chapter}.json`
  ].join("/");
}


function renderBibleReaderLoading(
  book,
  chapter
){
  const root = bibleBrowserContent();

  if(!root) return;

  root.innerHTML = `
    <section
      class="sj-scripture-reader sj-scripture-reader-loading"
      aria-live="polite"
    >
      <div class="sj-reader-loading-mark" aria-hidden="true"></div>

      <p>
        Loading
        ${escapeHTML(book.name)}
        ${chapter}...
      </p>
    </section>
  `;
}


function renderBibleReaderError(
  book,
  chapter
){
  const root = bibleBrowserContent();

  if(!root) return;

  root.innerHTML = `
    <section
      class="sj-scripture-reader sj-scripture-reader-error"
      role="alert"
    >
      <h2>
        Unable to load
        ${escapeHTML(book.name)}
        ${chapter}
      </h2>

      <p>
        This chapter could not be loaded right now.
      </p>

      <button
        class="sj-reader-retry-button"
        type="button"
        data-reader-chapter="${chapter}"
      >
        Try Again
      </button>
    </section>
  `;
}


function renderBibleReader(
  canon,
  book,
  chapter,
  payload
){
  const root = bibleBrowserContent();

  if(!root) return;

  const verses = Array.isArray(payload?.verses)
    ? payload.verses
    : [];

  const previousChapter =
    chapter > 1
      ? chapter - 1
      : null;

  const nextChapter =
    chapter < book.chapters
      ? chapter + 1
      : null;

  const verseHTML = verses.map(verse => {
    const verseNumber = Number(verse.v);

    const strongs = Array.isArray(verse.s)
      ? verse.s
      : [];

    const key = readerVerseKey(
      canon.slug,
      book.slug,
      chapter,
      verseNumber
    );

    const highlight = getReaderHighlight(
      key
    );

    const highlightClass =
      readerHighlightClass(
        highlight?.category || ""
      );

    return `
      <p
        class="sj-reader-verse${
          highlightClass
            ? ` ${highlightClass}`
            : ""
        }"
        id="verse-${verseNumber}"
        data-reader-verse="${verseNumber}"
        data-reader-key="${escapeHTML(key)}"
        data-reader-strongs="${escapeHTML(
          strongs.join(",")
        )}"
        tabindex="0"
        role="button"
        aria-label="${
          escapeHTML(
            `${book.name} ${chapter}:${verseNumber}`
          )
        }"
      >
        <sup class="sj-reader-verse-number">
          ${verseNumber}
        </sup>

        <span class="sj-reader-verse-text">
          ${escapeHTML(verse.t || "")}
        </span>
      </p>
    `;
  }).join("");

  root.innerHTML = `
    <article
      class="sj-scripture-reader"
      aria-labelledby="sj-bible-stage-title"
    >
      <nav
        class="sj-reader-chapter-nav sj-reader-chapter-nav-top"
        aria-label="Chapter navigation"
      >
        ${
          previousChapter
            ? `
              <button
                type="button"
                data-reader-chapter="${previousChapter}"
                aria-label="Read ${escapeHTML(book.name)} chapter ${previousChapter}"
              >
                <span aria-hidden="true">‹</span>
                <span>Chapter ${previousChapter}</span>
              </button>
            `
            : `
              <span
                class="sj-reader-nav-spacer"
                aria-hidden="true"
              ></span>
            `
        }

        <button
          class="sj-reader-chapter-picker"
          type="button"
          data-reader-show-chapters
          aria-label="Choose another chapter"
        >
          ${chapter}
        </button>

        ${
          nextChapter
            ? `
              <button
                type="button"
                data-reader-chapter="${nextChapter}"
                aria-label="Read ${escapeHTML(book.name)} chapter ${nextChapter}"
              >
                <span>Chapter ${nextChapter}</span>
                <span aria-hidden="true">›</span>
              </button>
            `
            : `
              <span
                class="sj-reader-nav-spacer"
                aria-hidden="true"
              ></span>
            `
        }
      </nav>

      <div class="sj-reader-verses">
        ${
          verseHTML || `
            <p class="sj-reader-empty">
              No verse text was found for this chapter.
            </p>
          `
        }
      </div>

      <nav
        class="sj-reader-chapter-nav sj-reader-chapter-nav-bottom"
        aria-label="Chapter navigation"
      >
        ${
          previousChapter
            ? `
              <button
                type="button"
                data-reader-chapter="${previousChapter}"
              >
                <span aria-hidden="true">‹</span>
                <span>Previous</span>
              </button>
            `
            : `
              <span
                class="sj-reader-nav-spacer"
                aria-hidden="true"
              ></span>
            `
        }

        <button
          class="sj-reader-chapter-picker"
          type="button"
          data-reader-show-chapters
        >
          ${escapeHTML(book.name)} ${chapter}
        </button>

        ${
          nextChapter
            ? `
              <button
                type="button"
                data-reader-chapter="${nextChapter}"
              >
                <span>Next</span>
                <span aria-hidden="true">›</span>
              </button>
            `
            : `
              <span
                class="sj-reader-nav-spacer"
                aria-hidden="true"
              ></span>
            `
        }
      </nav>
    </article>

    <aside
      class="sj-reader-action-tray"
      data-reader-action-tray
      aria-label="Selected verse tools"
      hidden
    >
      <div class="sj-reader-action-tray-head">
        <strong data-reader-action-reference>
          Selected verse
        </strong>

        <button
          class="sj-reader-action-close"
          type="button"
          data-reader-action-close
          aria-label="Close verse tools"
        >
          ×
        </button>
      </div>

      <div class="sj-reader-tool-row">
        <button
          type="button"
          data-reader-tool="highlight"
          aria-label="Highlight selected verse"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 20 5-1 10-10-4-4L5 15Z"></path>
            <path d="m13 7 4 4"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Highlight
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="save"
          aria-label="Save selected verse"
          aria-pressed="false"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h12v18l-6-4-6 4Z"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Save
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="note"
          aria-label="Add note to selected verse"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h9l4 4v14H6Z"></path>
            <path d="M14 3v5h5"></path>
            <path d="M9 12h6"></path>
            <path d="M9 16h4"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Note
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="copy"
          aria-label="Copy selected verse"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="8" y="8" width="11" height="12" rx="2"></rect>
            <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Copy
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="share"
          aria-label="Share selected verse"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V3"></path>
            <path d="m7 8 5-5 5 5"></path>
            <path d="M5 12v9h14v-9"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Share
          </span>
        </button>

        <button
          type="button"
          data-reader-tool="word-study"
          aria-label="Open Word Study for selected verse"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"></path>
            <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"></path>
            <circle cx="17" cy="8" r="2.5"></circle>
            <path d="m19 10 2 2"></path>
          </svg>
          <span class="sj-reader-tool-label">
            Word Study
          </span>
        </button>
      </div>

      <div
        class="sj-reader-highlight-palette"
        data-reader-highlight-palette
        hidden
      >
        <button
          type="button"
          data-reader-highlight-color="red"
          aria-label="Red highlight"
          title="Red"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="orange"
          aria-label="Orange highlight"
          title="Orange"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="yellow"
          aria-label="Yellow highlight"
          title="Yellow"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="green"
          aria-label="Green highlight"
          title="Green"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="blue"
          aria-label="Blue highlight"
          title="Blue"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="indigo"
          aria-label="Indigo highlight"
          title="Indigo"
        ></button>

        <button
          type="button"
          data-reader-highlight-color="violet"
          aria-label="Violet highlight"
          title="Violet"
        ></button>

        <button
          class="sj-reader-highlight-clear"
          type="button"
          data-reader-highlight-color="clear"
          aria-label="Remove highlight"
          title="Clear highlight"
        >
          ×
        </button>
      </div>
    </aside>

    <div
      class="sj-word-study-modal"
      data-reader-word-study-modal
      hidden
    >
      <button
        class="sj-word-study-backdrop"
        type="button"
        data-reader-word-study-backdrop
        aria-label="Close Word Study"
      ></button>

      <section
        class="sj-word-study-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sj-word-study-title"
      >
        <div
          class="sj-word-study-handle"
          aria-hidden="true"
        ></div>

        <header class="sj-word-study-sheet-head">
          <div>
            <p
              class="sj-word-study-reference"
              data-reader-word-study-reference
            >
              Selected verse
            </p>

            <h2 id="sj-word-study-title">
              Word Study
            </h2>
          </div>

          <button
            class="sj-word-study-close"
            type="button"
            data-reader-word-study-close
            aria-label="Close Word Study"
          >
            ×
          </button>
        </header>

        <p
          class="sj-word-study-status"
          data-reader-word-study-status
          hidden
        ></p>

        <div
          class="sj-word-study-words"
          data-reader-word-study-words
          hidden
        ></div>

        <div
          class="sj-word-study-content"
          data-reader-word-study-content
          aria-live="polite"
        ></div>
      </section>
    </div>
  `;
}


async function openBibleReader(
  canonSlug,
  bookSlug,
  chapter
){
  const canon = getBibleCanon(canonSlug);

  const book = getBibleBook(
    canonSlug,
    bookSlug
  );

  const chapterNumber = Number(chapter);

  if(
    !canon ||
    !book ||
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > book.chapters
  ){
    return;
  }

  bibleBrowserStage = "reader";

  selectedReaderVerse = null;
  closeReaderActionTray();

  selectedBibleCanon = canon.slug;
  selectedBibleBook = book.slug;
  selectedBibleChapter = chapterNumber;

  saveBibleLocation();
  hideBibleCanonMenu();

  const browser = bibleBrowserShell();

  if(browser){
    browser.hidden = false;
  }

  const title = bibleStageTitle();
  const kicker = bibleStageKicker();
  const back = bibleBackButton();

  if(title){
    title.textContent = book.name;
  }

  if(kicker){
    kicker.textContent = canon.name;
  }

  if(back){
    back.hidden = false;
  }

  updateBibliaPath();

  renderBibleReaderLoading(
    book,
    chapterNumber
  );

  try{
    const payload = await fetchJSON(
      bibleChapterDataURL(
        book,
        chapterNumber
      )
    );

    if(
      selectedBibleCanon !== canon.slug ||
      selectedBibleBook !== book.slug ||
      selectedBibleChapter !== chapterNumber
    ){
      return;
    }

    renderBibleReader(
      canon,
      book,
      chapterNumber,
      payload
    );

    setBibleNotice(
      `${book.name} ${chapterNumber}`
    );

    window.scrollTo({
      top:0,
      behavior:"smooth"
    });
  }catch(error){
    console.warn(
      "Scripture chapter failed to load.",
      error
    );

    renderBibleReaderError(
      book,
      chapterNumber
    );
  }
}


function handleBibleBrowserClick(event){
  const canonButton = event.target.closest(
    "[data-bible-canon]"
  );

  if(canonButton){
    renderBibleBooks(
      canonButton.dataset.bibleCanon
    );

    return;
  }


  const bookButton = event.target.closest(
    "[data-bible-book]"
  );

  if(bookButton && selectedBibleCanon){
    renderBibleChapters(
      selectedBibleCanon,
      bookButton.dataset.bibleBook
    );

    return;
  }


  const chapterButton = event.target.closest(
    "[data-bible-chapter]"
  );

  if(
    chapterButton &&
    selectedBibleCanon &&
    selectedBibleBook
  ){
    openBibleReader(
      selectedBibleCanon,
      selectedBibleBook,
      Number(chapterButton.dataset.bibleChapter)
    );

    return;
  }


  const readerChapterButton = event.target.closest(
    "[data-reader-chapter]"
  );

  if(
    readerChapterButton &&
    selectedBibleCanon &&
    selectedBibleBook
  ){
    openBibleReader(
      selectedBibleCanon,
      selectedBibleBook,
      Number(readerChapterButton.dataset.readerChapter)
    );

    return;
  }
}


function goBackInBibleBrowser(){
  if(
    bibleBrowserStage === "reader" &&
    selectedBibleCanon &&
    selectedBibleBook
  ){
    renderBibleChapters(
      selectedBibleCanon,
      selectedBibleBook
    );

    return;
  }


  if(bibleBrowserStage === "chapters"){
    renderBibleBooks(
      selectedBibleCanon
    );

    return;
  }

  if(bibleBrowserStage === "books"){
    const browser = bibleBrowserShell();
    const menu = bibleCanonMenu();

    if(browser){
      browser.hidden = true;
    }

    if(menu){
      menu.hidden = true;
    }

    updateBibliaPath();
  }
}


function restoreReaderFontPreference(){
  let savedSize = "base";

  try{
    const stored = localStorage.getItem(
      READER_FONT_KEY
    );

    if(
      READER_FONT_SIZES.includes(stored)
    ){
      savedSize = stored;
    }
  }catch(error){
    console.warn(
      "Could not restore reader font size.",
      error
    );
  }

  document.documentElement.dataset.sjReaderFont =
    savedSize;
}


function cycleReaderFontPreference(){
  const current =
    document.documentElement.dataset.sjReaderFont ||
    "base";

  const currentIndex =
    READER_FONT_SIZES.indexOf(current);

  const next =
    READER_FONT_SIZES[
      (currentIndex + 1) %
      READER_FONT_SIZES.length
    ];

  document.documentElement.dataset.sjReaderFont =
    next;

  try{
    localStorage.setItem(
      READER_FONT_KEY,
      next
    );
  }catch(error){
    console.warn(
      "Could not save reader font size.",
      error
    );
  }

  const label = {
    base:"Standard",
    large:"Large",
    xlarge:"Extra large"
  }[next];

  setBibleNotice(
    `Reader text size: ${label}.`
  );
}


async function loadBibleBrowser(){
  const root = bibleBrowserContent();

  if(!root) return;

  try{
    scriptureCanonData = await fetchJSON(
      SCRIPTURE_CANON_URL
    );

    if(
      !Array.isArray(
        scriptureCanonData?.canons
      )
    ){
      throw new Error(
        "Invalid Scripture canon metadata."
      );
    }

    renderBibleCanons();
  }catch(error){
    console.warn(
      "Bible navigation failed.",
      error
    );

    root.innerHTML = `
      <p class="sj-home-loading">
        Israelite Writings are temporarily unavailable.
      </p>
    `;
  }
}


document
  .querySelector("[data-bible-browser-content]")
  ?.addEventListener(
    "click",
    event => {
      const chapterPicker = event.target.closest(
        "[data-reader-show-chapters]"
      );

      if(
        chapterPicker &&
        selectedBibleCanon &&
        selectedBibleBook
      ){
        renderBibleChapters(
          selectedBibleCanon,
          selectedBibleBook
        );

        return;
      }

      handleBibleBrowserClick(event);
    }
  );


document
  .querySelector("[data-biblia-canon-menu]")
  ?.addEventListener(
    "click",
    handleBibleBrowserClick
  );




document
  .querySelector("[data-bible-back]")
  ?.addEventListener(
    "click",
    goBackInBibleBrowser
  );


document
  .querySelector("[data-bible-open-canons]")
  ?.addEventListener("click", () => {
    const menu = bibleCanonMenu();

    const moreMenu = document.querySelector(
      "[data-bible-more-menu]"
    );

    if(!menu || !scriptureCanonData) return;

    if(moreMenu){
      moreMenu.hidden = true;
    }

    if(menu.hidden){
      renderBibleCanons();
    }else{
      hideBibleCanonMenu();
    }
  });


document
  .querySelector("[data-bible-version]")
  ?.addEventListener("click", () => {
    setBibleNotice(
      "KJV is the available Scripture version in this build."
    );
  });


document
  .querySelector("[data-bible-font]")
  ?.addEventListener(
    "click",
    cycleReaderFontPreference
  );


restoreReaderFontPreference();
loadBibleBrowser();


/* =========================================================
   Build 3D.1 — Home greeting, podcast, refined actions
   ========================================================= */

const PODCAST_DATA_URL =
  "/data/youtube-podcast-videos.json";

const APPLE_PODCASTS_URL =
  "https://podcasts.apple.com/us/podcast/semitic-jew/id1693178004";

const SPOTIFY_PODCAST_URL =
  "https://open.spotify.com/show/0GvSSHiBeVAmvHMIXP6lOi";


function setHomeDaypart(){
  const target = document.querySelector(
    "[data-home-daypart]"
  );

  if(!target) return;

  const hour = new Date().getHours();

  let daypart = "Evening";

  if(hour >= 5 && hour < 12){
    daypart = "Morning";
  }else if(hour >= 12 && hour < 17){
    daypart = "Afternoon";
  }

  target.textContent = daypart;
}


function decodeHTMLEntities(value = ""){
  const textarea = document.createElement("textarea");

  textarea.innerHTML = value;

  return textarea.value;
}


function updateBibliaPath(){
  const root = document.querySelector(
    "[data-biblia-path]"
  );

  if(!root) return;

  const canon = selectedBibleCanon
    ? getBibleCanon(selectedBibleCanon)
    : null;

  const book =
    selectedBibleCanon && selectedBibleBook
      ? getBibleBook(
          selectedBibleCanon,
          selectedBibleBook
        )
      : null;

  if(book && canon){
    root.innerHTML = `
      <span class="is-accent">
        ${escapeHTML(canon.name)}
      </span>

      <span aria-hidden="true">›</span>

      <span>
        ${escapeHTML(book.name)}
      </span>
    `;

    return;
  }

  if(canon){
    root.innerHTML = `
      <span class="is-accent">
        ${escapeHTML(canon.name)}
      </span>
    `;

    return;
  }

  root.innerHTML = `
    <span>Israelite Writings</span>
  `;
}


async function loadLatestPodcast(){
  const root = document.getElementById(
    "sj-latest-podcast"
  );

  if(!root) return;

  try{
    const payload = await fetchJSON(
      PODCAST_DATA_URL
    );

    const videos = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.videos)
        ? payload.videos
        : [];

    const episode = videos[0];

    if(!episode){
      throw new Error(
        "No podcast episodes found."
      );
    }

    const title = String(episode.title || "")
      .replace(/^EP\s*/i, "EP ")
      .trim();

    root.innerHTML = `
      <article class="sj-podcast-card">
        <div class="sj-podcast-art">
          <img
            src="${escapeHTML(episode.thumbnail || "")}"
            alt=""
            loading="lazy"
          >
        </div>

        <div class="sj-podcast-copy">
          <span class="sj-podcast-label">
            Latest Episode
          </span>

          <h3>${escapeHTML(title)}</h3>

          <div class="sj-podcast-actions">
            <button
              type="button"
              data-podcast-play
              data-podcast-embed="${escapeHTML(
                episode.embed || ""
              )}"
            >
              <span aria-hidden="true">▶</span>
              Play
            </button>

            <a
              href="${APPLE_PODCASTS_URL}"
              target="_blank"
              rel="noopener"
            >
              Apple
            </a>

            <a
              href="${SPOTIFY_PODCAST_URL}"
              target="_blank"
              rel="noopener"
            >
              Spotify
            </a>
          </div>

          <div
            class="sj-podcast-player"
            data-podcast-player
            hidden
          ></div>
        </div>
      </article>
    `;
  }catch(error){
    console.warn(
      "Latest podcast failed.",
      error
    );

    root.innerHTML = `
      <p class="sj-home-loading">
        The latest podcast episode is temporarily unavailable.
      </p>
    `;
  }
}


document.addEventListener("click", event => {
  const podcastButton = event.target.closest(
    "[data-podcast-play]"
  );

  if(podcastButton){
    const player = document.querySelector(
      "[data-podcast-player]"
    );

    const embed = podcastButton.dataset.podcastEmbed;

    if(!player || !embed) return;

    if(player.hidden){
      const joiner = embed.includes("?")
        ? "&"
        : "?";

      player.innerHTML = `
        <iframe
          src="${escapeHTML(
            `${embed}${joiner}autoplay=1`
          )}"
          title="Semitic Jew Podcast"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;

      player.hidden = false;

      podcastButton.innerHTML = `
        <span aria-hidden="true">■</span>
        Close
      `;
    }else{
      player.hidden = true;
      player.innerHTML = "";

      podcastButton.innerHTML = `
        <span aria-hidden="true">▶</span>
        Play
      `;
    }

    return;
  }


  const placeholderReel = event.target.closest(
    "[data-placeholder-reel]"
  );

  if(placeholderReel){
    const status = document.querySelector(
      "[data-precept-placeholder-status]"
    );

    if(status){
      status.textContent =
        "Precept Upon Precept reel teachings are coming soon.";
    }

    return;
  }


  if(event.target.closest("[data-precept-see-all]")){
    const status = document.querySelector(
      "[data-precept-placeholder-status]"
    );

    if(status){
      status.textContent =
        "The complete Precept Upon Precept library is coming soon.";
    }
  }
});


document
  .querySelector("[data-bible-search]")
  ?.addEventListener("click", () => {
    setBibleNotice(
      "Scripture search will be connected in a later reader batch."
    );
  });


document
  .querySelector("[data-bible-more]")
  ?.addEventListener("click", event => {
    event.stopPropagation();

    const menu = document.querySelector(
      "[data-bible-more-menu]"
    );

    const canonMenu = bibleCanonMenu();

    if(!menu) return;

    if(canonMenu){
      canonMenu.hidden = true;
    }

    menu.hidden = !menu.hidden;
  });


setHomeDaypart();
loadLatestPodcast();
updateBibliaPath();


document.addEventListener("click", event => {
  const moreMenu = document.querySelector(
    "[data-bible-more-menu]"
  );

  if(
    !moreMenu ||
    moreMenu.hidden ||
    event.target.closest("[data-bible-more]") ||
    event.target.closest("[data-bible-more-menu]")
  ){
    return;
  }

  moreMenu.hidden = true;
});



/* =========================================================
   Build 3F.2 — Verse selection and real reader tools
   ========================================================= */

document.addEventListener("click", event => {
  const verse = event.target.closest(
    ".sj-reader-verse[data-reader-verse]"
  );

  if(verse){
    selectReaderVerse(verse);
    return;
  }


  if(
    event.target.closest(
      "[data-reader-action-close]"
    )
  ){
    closeReaderActionTray();
    return;
  }


  const colorButton = event.target.closest(
    "[data-reader-highlight-color]"
  );

  if(colorButton){
    saveReaderHighlight(
      colorButton.dataset.readerHighlightColor
    );

    return;
  }


  if(
    event.target.closest(
      "[data-reader-word-study-close]"
    ) ||
    event.target.closest(
      "[data-reader-word-study-backdrop]"
    )
  ){
    closeReaderWordStudy();
    return;
  }


  const wordStudyWord = event.target.closest(
    "[data-reader-word-study-word]"
  );

  if(wordStudyWord){
    const index = Number(
      wordStudyWord.dataset.readerWordStudyWord
    );

    if(Number.isInteger(index)){
      renderReaderWordStudyDetail(index);
    }

    return;
  }


  const toolButton = event.target.closest(
    "[data-reader-tool]"
  );

  if(!toolButton) return;

  const tool = toolButton.dataset.readerTool;

  if(tool === "highlight"){
    toggleReaderHighlightPalette();
    return;
  }

  if(tool === "save"){
    toggleReaderBookmark();
    return;
  }

  if(tool === "note"){
    editReaderNote();
    return;
  }

  if(tool === "copy"){
    copySelectedReaderVerse();
    return;
  }

  if(tool === "share"){
    shareSelectedReaderVerse();
    return;
  }

  if(tool === "word-study"){
    openReaderWordStudy();
  }
});


document.addEventListener("keydown", event => {
  if(
    event.key !== "Enter" &&
    event.key !== " "
  ){
    return;
  }

  const verse = event.target.closest(
    ".sj-reader-verse[data-reader-verse]"
  );

  if(!verse) return;

  event.preventDefault();

  selectReaderVerse(verse);
});



/* =========================================================
   Build 3G.3 — Word Study keyboard controls
   ========================================================= */

document.addEventListener("keydown", event => {
  if(event.key !== "Escape"){
    return;
  }

  const modal = readerWordStudyModal();

  if(modal && !modal.hidden){
    closeReaderWordStudy();
  }
});



/* =========================================================
   Build 3H.3 — Articles browser events
   ========================================================= */

document.addEventListener("click", event => {
  const reload = event.target.closest(
    "[data-reload-articles]"
  );

  if(!reload){
    return;
  }

  const root = articleBrowserRoot();

  if(root){
    root.innerHTML = `
      <div class="sj-articles-loading">
        <span
          class="sj-articles-loading-ring"
          aria-hidden="true"
        ></span>

        <p>Loading articles...</p>
      </div>
    `;
  }

  loadArticlesBrowser();
});


/* =========================================================
   Build 3H.4.2 — In-app Article reader events
   ========================================================= */

document.addEventListener("click", event => {
  const articleLink = event.target.closest(
    "[data-app-article-link]"
  );

  if(articleLink){
    const href = cleanText(
      articleLink.getAttribute("href")
    );

    if(href){
      event.preventDefault();

      openArticleReader(
        href
      );
    }

    return;
  }


  const back = event.target.closest(
    "[data-app-article-back]"
  );

  if(back){
    event.preventDefault();

    closeArticleReader();

    return;
  }


  const share = event.target.closest(
    "[data-app-article-share]"
  );

  if(share){
    event.preventDefault();

    shareActiveArticle();
  }
});
