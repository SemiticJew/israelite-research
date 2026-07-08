(function () {
  function absoluteUrl(href) {
    try {
      return new URL(href, window.location.origin).href;
    } catch {
      return window.location.href;
    }
  }

  function cleanText(el) {
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function buildBreadcrumbSchema() {
    const nav = document.querySelector('nav.breadcrumbs[aria-label="Breadcrumb"]');
    if (!nav) return;

    if (document.getElementById("breadcrumb-schema-jsonld")) return;

    const items = [];
    const parts = nav.querySelectorAll("a, .current");

    parts.forEach((el, index) => {
      const name = cleanText(el);
      if (!name) return;

      const href = el.tagName.toLowerCase() === "a"
        ? el.getAttribute("href")
        : window.location.href;

      items.push({
        "@type": "ListItem",
        "position": items.length + 1,
        "name": name,
        "item": absoluteUrl(href)
      });
    });

    if (items.length < 2) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "breadcrumb-schema-jsonld";
    script.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildBreadcrumbSchema);
  } else {
    buildBreadcrumbSchema();
  }
})();
