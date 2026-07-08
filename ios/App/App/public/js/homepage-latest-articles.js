(() => {
  const mount = document.getElementById("homepage-latest-articles");
  if (!mount) return;

  const clean = (text) => (text || "").replace(/\s+/g, " ").trim();

  function getArticleFromCard(card, fallbackKicker = "Article") {
    const link = card.querySelector('a[href*="/articles/"]');
    if (!link) return null;

    const href = link.getAttribute("href");
    const title = clean(card.querySelector("h2, h3")?.textContent);
    const excerpt = clean(card.querySelector("p.muted, p")?.textContent);
    const label =
      clean(card.querySelector(".resource-label, .article-kicker, .youtube-label")?.textContent) ||
      fallbackKicker;

    if (!href || !title) return null;

    return { href, title, excerpt, label };
  }

  function render(items) {
    const seen = new Set();
    const unique = items.filter((item) => {
      if (!item || seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    }).slice(0, 4);

    if (!unique.length) {
      mount.innerHTML = '<p class="muted">Latest articles are loading.</p>';
      return;
    }

    mount.innerHTML = unique.map((item) => `
      <div class="article">
        <a href="${item.href}">
          <div class="article-kicker">${item.label}</div>
          <h2>${item.title}</h2>
          ${item.excerpt ? `<p>${item.excerpt}</p>` : ""}
          <span class="article-read">Read Article →</span>
        </a>
      </div>
    `).join("");
  }

  async function loadLatestArticles() {
    try {
      const res = await fetch(`/articles.html?homeArticles=${Date.now()}`, {
        cache: "no-store"
      });

      if (!res.ok) throw new Error(`articles.html returned ${res.status}`);

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const items = [
        getArticleFromCard(doc.querySelector(".featured-left"), "Featured Article"),
        getArticleFromCard(doc.querySelector(".featured-right"), "Featured Article"),
        ...Array.from(doc.querySelectorAll(".recent-grid .article-card"))
          .map((card) => getArticleFromCard(card, "Recent Article"))
      ];

      render(items);
    } catch (err) {
      console.warn("Homepage latest articles failed:", err);
      mount.innerHTML = `
        <div class="article">
          <a href="/articles.html">
            <div class="article-kicker">Articles</div>
            <h2>Latest Articles</h2>
            <p>Read the newest articles from Semitic Jew.</p>
            <span class="article-read">View Articles →</span>
          </a>
        </div>
      `;
    }
  }

  loadLatestArticles();
})();
