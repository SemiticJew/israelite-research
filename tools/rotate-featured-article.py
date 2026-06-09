#!/usr/bin/env python3
"""
Rotate the newest article into the large Featured card on articles.html.

What it does:
- Promotes the selected/newest article into .featured-left.
- Demotes the previous .featured-left article into the Recent Articles grid.
- Removes duplicate recent card for the newly featured article.
- Ensures all non-large article cards use the standard card footer:
  author avatar + Semitic Jew.
- Preserves existing articles.html dimensions and styles.

Usage:
  python3 tools/rotate-featured-article.py \
    --url /articles/example.html \
    --image /images/articles/example-700x394.jpg \
    --title "Article Title" \
    --excerpt "Short excerpt."

Optional previous-feature override:
  --previous-title "Old Featured Title"
  --previous-image /images/articles/old-700x394.jpg
  --previous-excerpt "Old excerpt."
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from html import escape


ARTICLES_PAGE = Path("articles.html")
AUTHOR_IMG = "/images/authors/semitic-jew.jpg"
AUTHOR = "Semitic Jew"


def card_html(url: str, image: str, title: str, excerpt: str) -> str:
    return f'''<article class="article-card boxed">
<a href="{escape(url)}">
<div class="image-block">
<img alt="{escape(title)}" src="{escape(image)}"/>
<span class="resource-label resource-in-image">Article</span>
</div>
<div class="card-body">
<h3>{escape(title)}</h3>
<time class="meta-date"></time>
<p class="muted">{escape(excerpt)}</p>
</div>
<div class="card-footer">
<img alt="Author avatar" class="avatar" src="{AUTHOR_IMG}"/>
<span class="author">{AUTHOR}</span>
</div>
</a>
</article>'''


def featured_html(url: str, image: str, title: str, excerpt: str) -> str:
    return f'''<!-- Left Featured -->
<article class="featured-left boxed">
  <a href="{escape(url)}">
    <div class="image-block">
      <img alt="{escape(title)}" src="{escape(image)}"/>
    </div>

    <div class="card-body">
      <span class="resource-label resource-in-excerpt">Article</span>
      <h3>{escape(title)}</h3>
      <time class="meta-date"></time>
      <p class="muted">{escape(excerpt)}</p>

      <div class="card-footer">
        <img alt="Author avatar" class="avatar" src="{AUTHOR_IMG}"/>
        <span class="author">{AUTHOR}</span>
      </div>
    </div>
  </a>
</article>'''


def extract_featured(text: str) -> dict[str, str]:
    m = re.search(r'<!-- Left Featured -->\s*(<article class="featured-left boxed">.*?</article>)', text, re.S)
    if not m:
        raise SystemExit("Could not find featured-left article block.")

    block = m.group(1)

    def grab(pattern: str, default: str = "") -> str:
        mm = re.search(pattern, block, re.S)
        return mm.group(1).strip() if mm else default

    return {
        "block": m.group(0),
        "url": grab(r'<a href="([^"]+)"'),
        "image": grab(r'<img alt="[^"]*" src="([^"]+)"'),
        "title": grab(r'<h3>(.*?)</h3>'),
        "excerpt": grab(r'<p class="muted">(.*?)</p>'),
    }


def remove_recent_card_for_url(text: str, url: str) -> str:
    pattern = re.compile(
        r'\s*<article class="article-card boxed">\s*'
        r'<a href="' + re.escape(url) + r'">.*?</article>\s*',
        re.S
    )
    return pattern.sub("\n", text)


def insert_first_recent(text: str, card: str) -> str:
    marker = '<div class="recent-grid">'
    if marker not in text:
        raise SystemExit("Could not find recent-grid marker.")
    return text.replace(marker, marker + "\n" + card + "\n", 1)


def ensure_footer_alignment_css(text: str) -> str:
    if "Featured card author footer alignment" in text:
        return text

    css = '''
/* Mini-Batch: Featured card author footer alignment */
body.articles-page .featured-left .card-body{
  justify-content:flex-start;
}

body.articles-page .featured-left .card-footer{
  margin-top:auto !important;
  padding:12px 0 0 !important;
  align-items:center !important;
}

body.articles-page .featured-left .card-footer .avatar{
  flex:0 0 30px;
}

body.articles-page .featured-left .card-footer .author{
  display:inline-flex;
  align-items:center;
  line-height:1;
}
'''
    return text.replace("</style>", css + "\n</style>", 1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--excerpt", required=True)
    parser.add_argument("--previous-title")
    parser.add_argument("--previous-image")
    parser.add_argument("--previous-excerpt")
    args = parser.parse_args()

    text = ARTICLES_PAGE.read_text()
    text = ensure_footer_alignment_css(text)

    current = extract_featured(text)

    previous_title = args.previous_title or current["title"]
    previous_image = args.previous_image or current["image"]
    previous_excerpt = args.previous_excerpt or current["excerpt"]
    previous_url = current["url"]

    text = text.replace(current["block"], featured_html(args.url, args.image, args.title, args.excerpt), 1)

    # Remove any duplicate recent card for the new featured article.
    text = remove_recent_card_for_url(text, args.url)

    # Add the previous featured article as first recent card, unless it is the same URL.
    if previous_url and previous_url != args.url:
        recent_part = text.split('<div class="recent-grid">', 1)[1].split('</div>', 1)[0]
        if previous_url not in recent_part:
            text = insert_first_recent(text, card_html(previous_url, previous_image, previous_title, previous_excerpt))

    ARTICLES_PAGE.write_text(text)
    print(f"Featured article set to: {args.title}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
