/* Semitic Jew Reader: chapter navigation + mobile polish */
(function(){
  function titleCaseSlug(slug){
    return String(slug || "")
      .split("-")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getCanon(){
    const path = location.pathname;
    if(path.includes("/tanakh/")) return "tanakh";
    if(path.includes("/newtestament/")) return "newtestament";
    if(path.includes("/apocrypha/")) return "apocrypha";
    return "";
  }

  function canonTitle(canon){
    if(canon === "tanakh") return "Tanakh";
    if(canon === "newtestament") return "New Testament";
    if(canon === "apocrypha") return "Apocrypha";
    return "Biblia";
  }

  function normalizeBooks(data){
    let raw = [];

    if(Array.isArray(data)){
      raw = data;
    }else if(data && Array.isArray(data.books)){
      raw = data.books;
    }else if(data && Array.isArray(data.items)){
      raw = data.items;
    }else if(data && typeof data === "object"){
      raw = Object.entries(data).map(([slug, value]) => {
        if(typeof value === "number") return {slug, chapters:value};
        if(value && typeof value === "object") return {slug, ...value};
        return {slug};
      });
    }

    return raw.map(item => {
      const slug = item.slug || item.id || item.key || item.book || "";
      const chapterCount =
        item.chapters ||
        item.chapterCount ||
        item.chapter_count ||
        item.count ||
        (Array.isArray(item.chapterList) ? item.chapterList.length : 0) ||
        (Array.isArray(item.chaptersList) ? item.chaptersList.length : 0);

      return {
        slug,
        title: item.title || item.name || titleCaseSlug(slug),
        chapters: Number(chapterCount) || 1
      };
    }).filter(book => book.slug);
  }

  function makeLink(canon, book, chapter){
    return `/${canon}/chapter.html?book=${encodeURIComponent(book)}&ch=${encodeURIComponent(chapter)}`;
  }

  async function getBooks(canon){
    try{
      const res = await fetch(`/data/${canon}/books.json`, {cache:"no-cache"});
      if(!res.ok) throw new Error("missing books manifest");
      return normalizeBooks(await res.json());
    }catch(error){
      console.warn("Reader navigation manifest failed:", error);
      return [];
    }
  }

  function createNav({canon, bookSlug, chapter, books}){
    const index = books.findIndex(book => book.slug === bookSlug);
    const currentBook = books[index] || {
      slug: bookSlug,
      title: titleCaseSlug(bookSlug),
      chapters: chapter
    };

    let prev = null;
    let next = null;

    if(chapter > 1){
      prev = {book: currentBook.slug, chapter: chapter - 1, label: "Previous Chapter"};
    }else if(index > 0){
      const previousBook = books[index - 1];
      prev = {book: previousBook.slug, chapter: previousBook.chapters, label: "Previous Book"};
    }

    if(chapter < currentBook.chapters){
      next = {book: currentBook.slug, chapter: chapter + 1, label: "Next Chapter"};
    }else if(index >= 0 && index < books.length - 1){
      const nextBook = books[index + 1];
      next = {book: nextBook.slug, chapter: 1, label: "Next Book"};
    }

    const shell = document.createElement("section");
    shell.className = "reader-chapter-nav";
    shell.setAttribute("aria-label", "Reader chapter navigation");

    const backToBook = `/${canon}/${bookSlug}.html`;
    const canonHub = `/${canon}.html`;

    shell.innerHTML = `
      <div class="reader-chapter-nav-title">
        <span>${canonTitle(canon)}</span>
        <strong>${currentBook.title} ${chapter}</strong>
      </div>

      <div class="reader-chapter-nav-actions">
        <a href="${backToBook}">Back to Book</a>
        ${prev ? `<a href="${makeLink(canon, prev.book, prev.chapter)}">‹ ${prev.label}</a>` : `<span class="disabled">‹ Previous</span>`}
        ${next ? `<a href="${makeLink(canon, next.book, next.chapter)}">${next.label} ›</a>` : `<span class="disabled">Next ›</span>`}
        <a href="${canonHub}">${canonTitle(canon)} Hub</a>
      </div>
    `;

    return shell;
  }

  async function render(){
    if(!document.body.classList.contains("reader-page")) return;
    if(document.querySelector(".reader-chapter-nav")) return;

    const params = new URLSearchParams(location.search);
    const canon = getCanon();
    const bookSlug = params.get("book") || "";
    const chapter = Number(params.get("ch") || "1") || 1;

    if(!canon || !bookSlug) return;

    const books = await getBooks(canon);
    const nav = createNav({canon, bookSlug, chapter, books});

    const pageHeader = document.querySelector("main .page-header");
    if(pageHeader){
      pageHeader.insertAdjacentElement("afterend", nav);
      return;
    }

    const main = document.querySelector("main");
    if(main){
      main.insertBefore(nav, main.firstChild);
    }
  }

  document.addEventListener("DOMContentLoaded", render);
})();
