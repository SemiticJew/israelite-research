#!/usr/bin/env python3
"""
Standardize Semitic Jew article HTML files without rewriting article content.

This tool is intentionally conservative. It updates shared article shell details:
- /styles.css link
- Bible reference italics removal inside article content
- author modal bio/role
- common script order
- basic article structure checks

It does NOT rewrite:
- article title
- article description
- article body paragraphs
- bibliography source content
- hero image paths
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Iterable


ARTICLE_DIR = Path("articles")
TEMPLATE_NAME = "article-template.html"

STANDARD_STYLESHEET_RE = re.compile(
    r'<link\s+rel=["\']stylesheet["\']\s+href=["\']/styles\.css(?:\?v=[^"\']*)?["\']\s*/?>'
)

STANDARD_STYLESHEET = '<link rel="stylesheet" href="/styles.css"/>'

STANDARD_AUTHOR_BIO_OLD_PATTERNS = [
    re.compile(
        r'<p class="ap-text">Founder \| Teacher of Semitic Jew Inc\. A researcher who focuses on reading the bible logically and proving Ancient Israelites resembled dark skinned Hamites\.</p>'
    ),
    re.compile(
        r'<p class="ap-text">Researcher and teacher focused on reading Scripture with logic, consistency, and historical context\. Curates resources on Israel and the nations of the ancient Near East\.</p>'
    ),
]

STANDARD_AUTHOR_BIO = '''<span class="ap-role">Founder | Teacher | Researcher</span>
        <p class="ap-text">Semitic Jew focuses on Scripture, logic, historical context, Israelite identity, and disciplined biblical research.</p>'''

MODAL_REFINEMENT_CSS = '''
/* === Standard Article Modal Refinement === */
.modal-card{
  border:1px solid rgba(230,235,242,.95);
}

.modal-close{
  color:#0b2340;
}

.modal-body{
  background:
    radial-gradient(circle at top left, rgba(241,115,0,.08), transparent 32%),
    #ffffff;
}

.author-pane{
  border-right:1px solid #e6ebf2;
}

.ap-avatar{
  border:3px solid #ffffff;
  box-shadow:0 12px 28px rgba(5,74,145,.16);
}

.ap-name{
  color:#0b2340;
  font-weight:900;
}

.ap-role{
  display:block;
  margin:.15rem 0 .45rem;
  color:#6b7280;
  font-size:.82rem;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.08em;
}

.author-list h4{
  color:#0b2340;
  font-weight:900;
  letter-spacing:-.02em;
}

.ra-title{
  color:#0b2340;
}

.ra-title:hover{
  color:var(--accent);
  text-decoration:none;
}

.more-by-btn{
  color:#0b2340;
}

.more-by-btn:hover{
  color:var(--accent);
}

html[data-theme="dark"] .modal-card{
  background:#07111f;
  border-color:rgba(255,255,255,.14);
}

html[data-theme="dark"] .modal-body{
  background:
    radial-gradient(circle at top left, rgba(241,115,0,.18), transparent 32%),
    #07111f;
}

html[data-theme="dark"] .modal-close,
html[data-theme="dark"] .ap-name,
html[data-theme="dark"] .author-list h4,
html[data-theme="dark"] .ra-title,
html[data-theme="dark"] .more-by-btn{
  color:#ffffff !important;
}

html[data-theme="dark"] .author-pane{
  border-right-color:rgba(255,255,255,.14);
}

html[data-theme="dark"] .ap-text,
html[data-theme="dark"] .ap-role,
html[data-theme="dark"] .ra-meta{
  color:rgba(255,255,255,.72) !important;
}

html[data-theme="dark"] .more-by-btn{
  background:#0f1a2b;
  border-color:rgba(255,255,255,.16);
}

@media(max-width:720px){
  .author-pane{
    border-right:0;
    border-bottom:1px solid #e6ebf2;
    padding:0 0 18px;
  }

  html[data-theme="dark"] .author-pane{
    border-bottom-color:rgba(255,255,255,.14);
  }
}
'''

SCRIPT_BLOCK_RE = re.compile(
    r'(?:\n?<script src="/js/metadata\.js" defer></script>\s*)?'
    r'(?:\n?<script src="/js/modal\.js" defer></script>\s*)?'
    r'(?:\n?<script src="/js/biblio\.js" defer></script>\s*)?'
    r'(?:\n?<script src="/js/articles\.js" defer></script>\s*)?'
    r'(?:\n?<script src="/js/citations\.js(?:\?v=[^"]*)?" defer></script>\s*)?'
    r'(?:\n?<script src="/js/xref-hover\.js(?:\?v=[^"]*)?" defer></script>\s*)?'
    r'(?:\n?<script src="/js/include\.js"></script>\s*)',
    re.M
)

STANDARD_SCRIPT_BLOCK = '''<script src="/js/metadata.js" defer></script>
<script src="/js/modal.js" defer></script>
<script src="/js/biblio.js" defer></script>
<script src="/js/articles.js" defer></script>
<script src="/js/citations.js?v=20260531-footnotes2" defer></script>
<script src="/js/xref-hover.js" defer></script>
<script src="/js/include.js"></script>'''


# Bible references should be regular text, not italicized.
# This targets common reference patterns inside <em>...</em>.
BIBLE_REF_IN_EM_RE = re.compile(
    r'<em>('
    r'(?:Gen|Genesis|Ex|Exod|Exodus|Lev|Num|Deut|Josh|Judg|Ruth|'
    r'1 Sam|2 Sam|1 Kgs|2 Kgs|1 Chr|2 Chr|Ezra|Neh|Esth|Job|'
    r'Ps|Psalm|Psalms|Prov|Eccl|Ecc|Song|Isa|Jer|Lam|Ezek|Dan|'
    r'Hos|Joel|Amos|Obad|Jonah|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|'
    r'Matt|Matthew|Mark|Luke|John|Acts|Rom|Romans|1 Cor|2 Cor|'
    r'Gal|Eph|Phil|Col|1 Thess|2 Thess|1 Tim|2 Tim|Titus|Phlm|'
    r'Heb|Jas|James|1 Pet|2 Pet|1 John|1 Jn|2 John|2 Jn|3 John|3 Jn|Jude|Rev|Revelation)'
    r'\s+\d{1,3}:\d{1,3}(?:[–-]\d{1,3})?'
    r'(?:\s*;\s*'
    r'(?:Gen|Genesis|Ex|Exod|Exodus|Lev|Num|Deut|Josh|Judg|Ruth|'
    r'1 Sam|2 Sam|1 Kgs|2 Kgs|1 Chr|2 Chr|Ezra|Neh|Esth|Job|'
    r'Ps|Psalm|Psalms|Prov|Eccl|Ecc|Song|Isa|Jer|Lam|Ezek|Dan|'
    r'Hos|Joel|Amos|Obad|Jonah|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|'
    r'Matt|Matthew|Mark|Luke|John|Acts|Rom|Romans|1 Cor|2 Cor|'
    r'Gal|Eph|Phil|Col|1 Thess|2 Thess|1 Tim|2 Tim|Titus|Phlm|'
    r'Heb|Jas|James|1 Pet|2 Pet|1 John|1 Jn|2 John|2 Jn|3 John|3 Jn|Jude|Rev|Revelation)'
    r'\s+\d{1,3}:\d{1,3}(?:[–-]\d{1,3})?)*'
    r')</em>'
)


def article_paths(include_template: bool = False) -> Iterable[Path]:
    for path in sorted(ARTICLE_DIR.glob("*.html")):
        if not include_template and path.name == TEMPLATE_NAME:
            continue
        yield path


def add_modal_refinement_css(html: str) -> str:
    if "Standard Article Modal Refinement" in html or "Standard Article Template Modal Refinement" in html:
        return html

    close = html.find("</style>")
    if close == -1:
        return html

    return html[:close] + MODAL_REFINEMENT_CSS + "\n" + html[close:]


def standardize_author_bio(html: str) -> str:
    if '<span class="ap-role">Founder | Teacher | Researcher</span>' in html:
        return html

    for pattern in STANDARD_AUTHOR_BIO_OLD_PATTERNS:
        html, count = pattern.subn(STANDARD_AUTHOR_BIO, html, count=1)
        if count:
            return html

    # If modal exists but expected bio paragraph was not matched, insert role before first ap-text.
    marker = '<p class="ap-text">'
    idx = html.find(marker)
    if idx != -1:
        return html[:idx] + '<span class="ap-role">Founder | Teacher | Researcher</span>\n        ' + html[idx:]

    return html


def standardize_scripts(html: str) -> str:
    if STANDARD_SCRIPT_BLOCK in html:
        return html

    matches = list(SCRIPT_BLOCK_RE.finditer(html))
    if matches:
        start = matches[-1].start()
        end = matches[-1].end()
        return html[:start] + STANDARD_SCRIPT_BLOCK + "\n" + html[end:]

    body_close = html.rfind("</body>")
    if body_close != -1:
        return html[:body_close] + STANDARD_SCRIPT_BLOCK + "\n" + html[body_close:]

    return html


def standardize_html(html: str) -> str:
    html = STANDARD_STYLESHEET_RE.sub(STANDARD_STYLESHEET, html, count=1)
    html = BIBLE_REF_IN_EM_RE.sub(r"\1", html)
    html = add_modal_refinement_css(html)
    html = standardize_author_bio(html)
    html = standardize_scripts(html)
    return html


def required_checks(path: Path, html: str) -> list[str]:
    issues: list[str] = []

    required = [
        '<body class="article-doc" data-page="article">',
        '<main class="article-page">',
        '<article class="article-shell"',
        '<figure class="hero-image"',
        'height="394"',
        'width="700"',
        '<div class="meta-row">',
        '<div class="article-content" itemprop="articleBody">',
        '<section class="footnotes">',
        '<div id="site-footer"></div>',
        '<script src="/js/include.js"></script>',
    ]

    for item in required:
        if item not in html:
            issues.append(f"missing required marker: {item}")

    if "/images/articles/" not in html:
        issues.append("missing article image path")

    if '<link rel="stylesheet" href="/styles.css"/>' not in html:
        issues.append("stylesheet not standardized")

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Standardize Semitic Jew article HTML files.")
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing files.")
    parser.add_argument("--write", action="store_true", help="Write changes.")
    parser.add_argument("--include-template", action="store_true", help="Also process article-template.html.")
    parser.add_argument("--check", action="store_true", help="Run structure checks.")
    args = parser.parse_args()

    if not args.dry_run and not args.write and not args.check:
        parser.error("Choose --dry-run, --write, or --check.")

    changed = []
    checked_issues = {}

    for path in article_paths(include_template=args.include_template):
        original = path.read_text()
        updated = standardize_html(original)

        if args.check:
            issues = required_checks(path, updated)
            if issues:
                checked_issues[str(path)] = issues

        if updated != original:
            changed.append(path)
            if args.write:
                path.write_text(updated)

    if args.dry_run:
        if changed:
            print("Would update:")
            for path in changed:
                print(f" - {path}")
        else:
            print("No article standardization changes needed.")

    if args.write:
        if changed:
            print("Updated:")
            for path in changed:
                print(f" - {path}")
        else:
            print("No article standardization changes needed.")

    if args.check:
        if checked_issues:
            print("ARTICLE STANDARD CHECK FAILED")
            for path, issues in checked_issues.items():
                print(f"\n{path}")
                for issue in issues:
                    print(f" - {issue}")
            return 1
        print("ARTICLE STANDARD CHECK PASSED")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
