#!/usr/bin/env python3
"""Apply the shared research-library shell to the research pages (Batch 4).

    python3 tools/apply_research_shell.py           # update pages in place
    python3 tools/apply_research_shell.py --check   # exit 1 if any page is out of date (used by tests)

For each page it is idempotent and only touches presentation:
  - adds body class "sj-research" and links /css/sj-tokens.css + /css/research.css after the inline styles
  - adds shared rs-* classes next to the page's own classes (hero, kicker, title, lede, intro cards,
    panels, section heads, chips, tiles), so css/research.css can style every page the same way
  - inserts the research sub-navigation after the page head
  - writes "Continue your research" links between <!-- rs-related:start --> and <!-- rs-related:end -->
    from data/research-related.json (titles read from the target pages / encyclopedia data)
  - Ologies pages also get previous/next Ology links (order from the Ologies index)
  - Bible Summaries: page head + breadcrumbs, and each "Coming Soon" summary links to the book's
    existing overview page; the embedded video summaries are kept as they are (lazy-loaded)

Text content, citations, scripts, data attributes and purchase links are never changed.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PAGES = [
    "ologies.html",
    *[f"ologies/{n}.html" for n in ("bibliology", "elology", "christology", "pneumatology", "anthropology",
                                    "hamartiology", "soteriology", "israelology", "ecclesiology", "eschatology")],
    "encyclopedia.html",
    "biblical_references.html",
    "dietary-laws.html",
    "israelite-catechism.html",
    "extra-biblical-sources.html",
    "black-history-biblical-identity.html",
    "bible-summaries.html",
    "study-guides.html",
]

SUBNAV = [
    ("/search.html", "Search"),
    ("/ologies.html", "Ologies"),
    ("/encyclopedia.html", "Encyclopedia"),
    ("/biblical_references.html", "Biblical References"),
    ("/dietary-laws.html", "Dietary Laws"),
    ("/israelite-catechism.html", "Catechism"),
    ("/extra-biblical-sources.html", "Extra-Biblical Sources"),
    ("/black-history-biblical-identity.html", "Black History & Identity"),
    ("/bible-summaries.html", "Bible Summaries"),
    ("/study-guides.html", "Study Guides"),
]

CSS_LINKS = '<link rel="stylesheet" href="/css/sj-tokens.css"/>\n<link rel="stylesheet" href="/css/research.css"/>\n'

# class token (regex, full match) -> shared class
CLASS_MAP = [
    (r"[a-z]+(?:-[a-z]+)*-hero|hero", "rs-hero"),
    (r"[a-z]+(?:-[a-z]+)*-kicker", "rs-kicker"),
    (r"[a-z]+(?:-[a-z]+)*-subtitle|sub", "rs-lede"),
    (r"study-tagline", "rs-tagline"),
    (r"[a-z]+(?:-[a-z]+)*-intro-grid|extra-map-guide", "rs-intro"),
    (r"[a-z]+(?:-[a-z]+)*-info-card|extra-guide-card", "rs-card"),
    (r"[a-z]+(?:-[a-z]+)*-tool-shell|extra-map-shell|black-history-shell|apol-tools-shell|dietary-tree-shell", "rs-panel"),
    (r"[a-z]+(?:-[a-z]+)*-section-head|apol-tools-head|extra-map-head", "rs-section-head"),
    (r"(?:ency|bibrefs|dietary)-chip|chip", "rs-chip"),
    (r"card|study-card|coming-card", "rs-tile"),
]
# These page-specific tokens look like the patterns above but are something else.
NOT_MAPPED = {"product-hero", "video-box"}

OLOGY_ENCY = {}  # filled from data/research-related.json


def text_of(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def page_title(rel: str) -> str:
    path = ROOT / rel.lstrip("/")
    s = path.read_text(encoding="utf-8", errors="replace")
    m = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S)
    t = text_of(m.group(1)) if m else ""
    if not t:
        m = re.search(r"<title>(.*?)</title>", s, re.S)
        t = text_of(m.group(1)).split(" — ")[0].split(" | ")[0] if m else rel
    return t


def book_name(slug: str) -> str:
    special = {"psalm": "Psalm", "song-of-solomon": "Song of Solomon"}
    return special.get(slug) or " ".join(w if w.isdigit() else w.capitalize() for w in slug.split("-"))


def resolve(target: str, ency: dict) -> tuple[str, str, str]:
    """-> (href, title, kind). Raises ValueError for anything that does not exist."""
    if target.startswith("scripture:"):
        _, canon, slug, ch = target.split(":")
        books = json.loads((ROOT / f"data/{canon}/books.json").read_text())
        if slug not in books or not (1 <= int(ch) <= int(books[slug])):
            raise ValueError(f"no such chapter: {target}")
        if not (ROOT / f"data/{canon}/{slug}/{ch}.json").exists():
            raise ValueError(f"chapter data missing: {target}")
        return f"/{canon}/chapter.html?book={slug}&amp;ch={ch}", f"{book_name(slug)} {ch}", "Scripture"
    if target.startswith("/encyclopedia.html#"):
        eid = target.split("#", 1)[1]
        if eid not in ency:
            raise ValueError(f"no encyclopedia entry: {eid}")
        return target, ency[eid], "Encyclopedia entry"
    if not (ROOT / target.lstrip("/")).exists():
        raise ValueError(f"no such page: {target}")
    kind = ("Article" if target.startswith("/articles/") else "Ology" if target.startswith("/ologies") else
            "Scripture" if target in ("/biblia.html", "/tanakh.html", "/newtestament.html", "/apocrypha.html") or re.match(r"^/(tanakh|newtestament|apocrypha)/", target) else
            "Study guide" if target.startswith("/study-guides") else "Research tool")
    return target, page_title(target), kind


def related_html(groups: list, ency: dict) -> str:
    out = ['<!-- rs-related:start (generated by tools/apply_research_shell.py from data/research-related.json; do not edit by hand) -->',
           '<nav class="rs-related" aria-labelledby="rs-related-title">',
           '  <h2 class="rs-related-title" id="rs-related-title">Continue your research</h2>',
           '  <div class="rs-related-groups">']
    for label, targets in groups:
        items = []
        for t in targets:
            href, title, kind = resolve(t, ency)
            items.append(f'      <li><a href="{href}"><span>{html.escape(title)}<span class="rs-related-kind">{kind}</span></span></a></li>')
        out += [f'    <section class="rs-related-group" aria-label="{html.escape(label)}">', f'      <h3>{html.escape(label)}</h3>', '      <ul>', *items, '      </ul>', '    </section>']
    out += ['  </div>', '</nav>', '<!-- rs-related:end -->']
    return "\n".join(out)


def subnav_html(current: str) -> str:
    items = []
    for href, label in SUBNAV:
        cur = ' aria-current="page"' if href == current else ""
        items.append(f'    <li><a href="{href}"{cur}>{html.escape(label)}</a></li>')
    return '<nav class="rs-subnav" aria-label="Research library">\n  <ul>\n' + "\n".join(items) + "\n  </ul>\n</nav>"


def add_classes(main: str) -> str:
    def fix(m):
        tokens = m.group(2).split()
        extra = []
        for pat, cls in CLASS_MAP:
            if cls in tokens or cls in extra:
                continue
            if any(re.fullmatch(pat, t) and t not in NOT_MAPPED for t in tokens):
                extra.append(cls)
        return m.group(0) if not extra else f'{m.group(1)}class="{" ".join(tokens + extra)}"'
    return re.sub(r'(<[a-z0-9]+\s[^>]*?)class="([^"]*)"', fix, main)


def mark_title(main: str) -> str:
    if "rs-title" in main:  # only the page title, even when a page has more than one <h1>
        return main
    return re.sub(r'<h1(?![^>]*\brs-title\b)([^>]*?)(?:\sclass="([^"]*)")?([^>]*)>',
                  lambda m: f'<h1{m.group(1)} class="{((m.group(2) or "") + " rs-title").strip()}"{m.group(3)}>', main, count=1)


def ensure_breadcrumbs(main: str, rel: str) -> str:
    if 'class="breadcrumbs"' in main:
        return main
    trail = {"ologies/": ('<a href="/ologies.html">Ologies</a>', None), "bible-summaries.html": ('<a href="/biblia.html">Biblia</a>', None)}
    parent = next((v[0] for k, v in trail.items() if rel.startswith(k)), None)
    title = text_of(re.search(r"<h1[^>]*>(.*?)</h1>", main, re.S).group(1))
    parts = ['  <a href="/index.html">Home</a>']
    if parent:
        parts += ['  <span class="sep">›</span>', f"  {parent}"]
    parts += ['  <span class="sep">›</span>', f'  <span class="current">{html.escape(title)}</span>']
    crumbs = '<nav class="breadcrumbs" aria-label="Breadcrumb">\n' + "\n".join(parts) + "\n</nav>\n"
    return re.sub(r"(<main[^>]*>\s*)", lambda m: m.group(1) + crumbs, main, count=1)


def hero_end(main: str) -> int:
    m = re.search(r'<(section|header|div)\b[^>]*class="[^"]*\brs-hero\b[^"]*"[^>]*>', main)
    if not m:
        return -1
    tag = m.group(1)
    depth, i = 0, m.start()
    for t in re.finditer(rf"<(/?){tag}\b[^>]*>", main[m.start():]):
        depth += -1 if t.group(1) else 1
        if depth == 0:
            return m.start() + t.end()
    return -1


def bible_summaries(main: str) -> str:
    if "rs-hero" in main:
        return main
    main = re.sub(r"<h1>Bible Summaries</h1>\s*<p class=\"intro\">(.*?)</p>",
                  lambda m: ('<header class="rs-hero">\n    <p class="rs-kicker">Scripture Overview</p>\n'
                             '    <h1 class="rs-title">Bible Summaries</h1>\n'
                             f'    <p class="intro rs-lede">{m.group(1).strip()}</p>\n  </header>'), main, count=1, flags=re.S)
    canon_for = {"Torah": "tanakh", "Prophets": "tanakh", "Writings": "tanakh", "Apocrypha": "apocrypha", "New Testament": "newtestament"}
    slug_for = {"Psalms": "psalms", "Wisdom of Solomon": "wisdom"}
    out, canon = [], "tanakh"
    for chunk in re.split(r"(<h2>[^<]+</h2>)", main):
        h = re.fullmatch(r"<h2>([^<]+)</h2>", chunk)
        if h:
            canon = canon_for.get(h.group(1), canon)
            out.append(f'<h2 class="bs-collection">{h.group(1)}</h2>')
            continue

        def soon(m):
            title = m.group(1)
            slug = slug_for.get(title, title.lower().replace(" ", "-"))
            page = ROOT / canon / f"{slug}.html"
            status = '<span class="bs-status">Summary video coming soon</span>'
            if page.exists():
                return (f'<a class="card rs-tile" href="/{canon}/{slug}.html" aria-label="{html.escape(title)}: summary video coming soon; read the book overview">'
                        f'<div class="card-body"><p class="title">{title}</p></div>{status}</a>')
            return f'<div class="card rs-tile"><div class="card-body"><p class="title">{title}</p></div>{status}</div>'
        chunk = re.sub(r'<div class="card"><div class="soon"></div><div class="card-body"><p class="title">([^<]+)</p></div></div>', soon, chunk)
        if 'class="soon"' not in chunk and "rs-tile" in chunk and "<iframe" not in chunk:
            chunk = chunk.replace('<div class="grid">', '<div class="grid bs-grid">')
        chunk = re.sub(r"<iframe(?![^>]*\bloading=)", '<iframe loading="lazy"', chunk)
        out.append(chunk)
    return "".join(out)


def apply(rel: str, related: dict, ency: dict, ology_order: list) -> str:
    path = ROOT / rel
    s = path.read_text(encoding="utf-8")
    # stylesheet links after the inline styles
    if "/css/research.css" not in s:
        head_end = s.index("</head>")
        s = s[:head_end] + CSS_LINKS + s[head_end:]
    # body class
    s = re.sub(r"<body(?![^>]*\bsj-research\b)([^>]*?)(?:\sclass=\"([^\"]*)\")?([^>]*)>",
               lambda m: f'<body{m.group(1)} class="{((m.group(2) or "") + " sj-research").strip()}"{m.group(3)}>', s, count=1)
    a, b = s.index("<main"), s.index("</main>")
    main = s[a:b]
    if rel == "bible-summaries.html":
        main = bible_summaries(main)
    main = ensure_breadcrumbs(main, rel)
    main = add_classes(main)
    main = mark_title(main)
    # sub-navigation after the page head
    if "rs-subnav" not in main:
        end = hero_end(main)
        current = "/ologies.html" if rel.startswith("ologies/") else "/" + rel
        if end > 0:
            main = main[:end] + "\n\n" + subnav_html(current) + "\n" + main[end:]
    # related links
    groups = list(related.get(rel, []))
    if rel.startswith("ologies/"):
        i = ology_order.index(rel)
        nav = [ology_order[i - 1] if i > 0 else None, ology_order[i + 1] if i + 1 < len(ology_order) else None]
        groups = [["More Ologies", [f"/{p}" for p in nav if p] + ["/ologies.html"]]] + groups + [["Reference tools", ["/encyclopedia.html", "/biblical_references.html", "/israelite-catechism.html"]]]
    if groups:
        block = related_html(groups, ency)
        main = re.sub(r"\n?<!-- rs-related:start.*?<!-- rs-related:end -->\n?", "\n", main, flags=re.S).rstrip() + "\n\n" + block + "\n"
    return s[:a] + main + s[b:]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report pages that would change; write nothing")
    args = ap.parse_args(argv)
    related = json.loads((ROOT / "data/research-related.json").read_text())["pages"]
    ency = {}
    for e in json.loads((ROOT / "data/encyclopedia.json").read_text()):
        ency.setdefault(e["id"], e["headword"])
    hub = (ROOT / "ologies.html").read_text(encoding="utf-8")
    ology_order = []
    for m in re.finditer(r'href="/(ologies/[a-z]+\.html)"', hub):
        if m.group(1) not in ology_order:
            ology_order.append(m.group(1))
    changed = []
    for rel in PAGES:
        new = apply(rel, related, ency, ology_order)
        if new != (ROOT / rel).read_text(encoding="utf-8"):
            changed.append(rel)
            if not args.check:
                (ROOT / rel).write_text(new, encoding="utf-8")
    if args.check:
        if changed:
            print("Out of date: " + ", ".join(changed))
            return 1
        print("All research pages are up to date.")
        return 0
    print(f"Updated {len(changed)} page(s): " + (", ".join(changed) or "none"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
