#!/bin/bash
# Usage: tools/new-article.sh "Title" slug "Description" image_path pub_date(YYYY-MM-DD)

TITLE="$1"
SLUG="$2"
DESC="$3"
IMAGE="$4"
PUBDATE="$5"

if [ -z "$TITLE" ] || [ -z "$SLUG" ] || [ -z "$DESC" ] || [ -z "$IMAGE" ] || [ -z "$PUBDATE" ]; then
  echo "Usage: $0 \"Title\" slug \"Description\" image_path YYYY-MM-DD"
  exit 1
fi

OUTFILE="articles/${SLUG}.html"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

mkdir -p articles

cat > "$OUTFILE" <<EOF
<!DOCTYPE html>
<html lang="en" data-theme="">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width,initial-scale=1" name="viewport"/>
<title>${TITLE} — Semitic Jew</title>

<!-- Open Graph -->
<meta property="og:title" content="${TITLE} — Semitic Jew"/>
<meta property="og:description" content="${DESC}"/>
<meta property="og:image" content="https://semiticjew.github.io/israelite-research/${IMAGE}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="https://semiticjew.github.io/israelite-research/articles/${SLUG}.html"/>
<meta property="og:site_name" content="Semitic Jew"/>

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${TITLE} — Semitic Jew"/>
<meta name="twitter:description" content="${DESC}"/>
<meta name="twitter:image" content="https://semiticjew.github.io/israelite-research/${IMAGE}"/>
<meta name="twitter:site" content="@semitic_jew"/>
<meta name="twitter:creator" content="@semitic_jew"/>

<link rel="stylesheet" href="/israelite-research/styles.css?v=${TIMESTAMP}"/>
</head>

<body class="article-doc" data-page="article">
<div id="site-header"></div>

<main class="article-page">
<article class="article-shell" itemscope itemtype="https://schema.org/Article">
  <header class="article-head">
    <p class="article-date"><time datetime="${PUBDATE}" id="pub-date" itemprop="datePublished">${PUBDATE}</time></p>
    <h1 class="article-title" itemprop="headline">${TITLE}</h1>
  </header>

  <figure class="hero-image" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
    <img alt="${TITLE}" src="/israelite-research/${IMAGE}" width="700"/>
    <meta content="/israelite-research/${IMAGE}" itemprop="url"/>
  </figure>

  <div class="meta-row">
    <div class="author-inline">
      <img alt="Semitic Jew" class="author-avatar" height="40" src="/israelite-research/images/authors/semitic-jew.jpg" width="40"/>
      <span class="byline-name">Semitic Jew</span>
      <span class="byline-meta">• Article</span>
      <button aria-label="About the author" class="author-info-btn" id="author-info" type="button">i</button>
    </div>
    <div aria-label="Share" class="share-min">
      <a aria-label="Share on X" class="share-btn" href="#" id="share-x" rel="noopener" target="_blank">X</a>
      <a aria-label="Share on Facebook" class="share-btn" href="#" id="share-fb" rel="noopener" target="_blank">Fb</a>
      <button aria-label="Copy link" class="share-btn" id="share-copy" type="button" title="Copy link">Copy</button>
    </div>
  </div>

  <div class="article-content" itemprop="articleBody">
    <p>Write your content here.</p>
  </div>

  <hr class="biblio-divider"/>
  <section class="footnotes">
    <div class="biblio-list">
      <p id="fn1">Reference here. <a class="backref" href="#ref-fn1"><span class="badge">1</span></a></p>
    </div>
  </section>
</article>
</main>

<div id="site-footer"></div>

<!-- Scripts -->
<script src="/israelite-research/js/metadata.js" defer></script>
<script src="/israelite-research/js/modal.js" defer></script>
<script src="/israelite-research/js/biblio.js" defer></script>
<script src="/israelite-research/js/articles.js" defer></script>
<script src="/israelite-research/js/citations.js?v=${TIMESTAMP}" defer></script>
<script src="/israelite-research/js/xref-hover.js?v=${TIMESTAMP}" defer></script>
<script src="/israelite-research/js/include.js"></script>
</body>
</html>
EOF

echo "✅ Article scaffolded at $OUTFILE"
