#!/usr/bin/env python3
"""Apply the shared Semitic Jew institutional design to the organization pages.

The nonprofit pages (About, Mission, Programs, Support, Contact, Newsletter, Events, the legal
pages and the small utility pages) each carry their own inline styles. This script opts them
into css/institution.css without touching their wording, links, forms, scripts or embeds:

  * adds `sj-inst` to <body> and links the design tokens + institution.css after the inline styles;
  * adds shared in-* classes next to each page's own classes (hero, kicker, title, lede, sections,
    cards, grids, lists, buttons, fact boxes, callouts) — existing classes are kept;
  * inserts the Organization sub-navigation under the page head of the organization pages;
  * adds breadcrumbs where a page has none.

Idempotent. `--check` exits 1 when a page is out of date (used by tests/institution.test.mjs).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Organization sub-navigation, in reading order for a first-time visitor.
ORG_NAV = [
    ("/about.html", "About"),
    ("/mission.html", "Mission"),
    ("/programs.html", "Programs"),
    ("/donate.html", "Support"),
    ("/newsletter.html", "Newsletter"),
    ("/contact.html", "Contact"),
]

# page -> (breadcrumb label if the page needs breadcrumbs added, show organization sub-navigation)
PAGES = {
    "about.html": (None, True),
    "mission.html": (None, True),
    "programs.html": (None, True),
    "donate.html": (None, True),
    "contact.html": (None, True),
    "newsletter.html": ("Newsletter", True),
    "events.html": (None, False),
    "privacy.html": (None, False),
    "terms.html": (None, False),
    "researcher-welcome.html": ("Become a Researcher", False),
    "offline.html": (None, False),
}

# existing class -> shared classes added beside it
CLASS_MAP = {}
for prefix in ("about", "mission", "programs", "donate", "contact", "legal", "events"):
    CLASS_MAP[f"{prefix}-hero"] = "in-hero"
    CLASS_MAP[f"{prefix}-kicker"] = "in-kicker"
    CLASS_MAP[f"{prefix}-title"] = "in-title"
    CLASS_MAP[f"{prefix}-subtitle"] = "in-lede"
CLASS_MAP.update({
    # About
    "about-section": "in-section", "org-verification": "in-section in-section--registry",
    "verification-details": "in-facts", "mission-grid": "in-grid", "work-grid": "in-grid in-grid--4",
    "mission-card": "in-card", "work-card": "in-card", "about-actions": "in-actions",
    "about-btn": "in-btn", "support-callout": "in-callout", "support-btn": "in-btn in-btn--give",
    # Mission
    "mission-section": "in-section", "mission-copy": "in-copy", "values-grid": "in-grid",
    "audience-grid": "in-grid in-grid--4", "value-card": "in-card", "audience-card": "in-card",
    "mission-list": "in-list", "mission-actions": "in-actions", "mission-btn": "in-btn",
    "mission-link": "in-btn in-btn--quiet", "mission-meta": "in-details", "verification-box": "in-facts",
    # Programs
    "programs-intro": "in-section", "program-grid": "in-programs", "program-card": "in-card in-card--program",
    "program-kicker": "in-eyebrow", "program-list": "in-list", "program-actions": "in-actions",
    "program-btn": "in-btn", "programs-cta": "in-callout", "program-main-btn": "in-btn in-btn--give",
    # Support
    "donate-layout": "in-split", "donate-panel": "in-section in-section--flow", "donate-list": "in-list",
    "impact-grid": "in-grid in-grid--2", "impact-card": "in-card", "donate-note": "in-note",
    "donate-clarity": "in-note", "donate-card": "in-aside", "candid-seal-featured": "in-seal",
    "donate-actions": "in-actions in-actions--stack", "donate-btn": "in-btn", "donate-mini-links": "in-minilinks",
    # Contact
    "contact-layout": "in-split", "contact-panel": "in-section in-section--flow", "contact-list": "in-defs",
    "contact-note": "in-note", "contact-card": "in-aside", "contact-actions": "in-actions in-actions--stack",
    "contact-btn": "in-btn", "contact-detail": "in-facts",
    # Newsletter
    "newsletter-hero": "in-newsletter", "newsletter-note": "in-fineprint",
    # Legal
    "legal-content": "in-prose",
    # Offline
    "offline-card": "in-hero in-hero--card", "offline-kicker": "in-kicker", "offline-title": "in-title",
    "offline-text": "in-lede", "offline-actions": "in-actions",
})
BUTTONS = {"about-btn", "mission-btn", "program-btn", "donate-btn", "contact-btn"}
# Primary actions (the first, non-secondary button of a stacked card) keep the strong treatment;
# Give Now is the page's donation call to action.
GIVE_HREF = re.compile(r'href="https://www\.zeffy\.com/')

CSS_LINKS = '<link rel="stylesheet" href="/css/sj-tokens.css"/>\n<link rel="stylesheet" href="/css/institution.css"/>\n'


def add_classes(html):
    def fix(m):
        tag = m.group(0)
        cm = re.search(r'class="([^"]*)"', tag)
        if not cm:
            return tag
        tokens = cm.group(1).split()
        extra = []
        for t in tokens:
            for c in CLASS_MAP.get(t, "").split():
                if c not in tokens and c not in extra:
                    extra.append(c)
        if "secondary" in tokens and BUTTONS & set(tokens) and "in-btn--quiet" not in tokens:
            extra.append("in-btn--quiet")
        if BUTTONS & set(tokens) and GIVE_HREF.search(tag) and "in-btn--give" not in tokens:
            extra.append("in-btn--give")
        if not extra:
            return tag
        return tag[:cm.start(1)] + " ".join(tokens + extra) + tag[cm.end(1):]
    return re.sub(r"<[a-zA-Z][^<>]*\bclass=\"[^\"]*\"[^<>]*>", fix, html)


def mark_plain_hero(html):
    """researcher-welcome / subscribe-email / newsletter use generic markup: tag their page head."""
    html = re.sub(r'<header class="hero">', '<header class="hero in-hero">', html, count=1)
    html = re.sub(r'<h1 class="title">', '<h1 class="title in-title">', html, count=1)
    html = re.sub(r'<p class="sub">', '<p class="sub in-lede">', html, count=1)
    html = re.sub(r'<div class="card">', '<div class="card in-card in-card--form">', html)
    # newsletter: the section itself is the page head
    html = re.sub(r'(<section id="newsletter" class="[^"]*\bin-newsletter\b[^"]*">\s*)<h1>', r'\1<h1 class="in-title">', html, count=1)
    html = re.sub(r'(<h1 class="in-title">[^<]*</h1>\s*<p)>', r'\1 class="in-lede">', html, count=1)
    return html


def ensure_body_class(html):
    m = re.search(r"<body([^>]*)>", html)
    attrs = m.group(1)
    if re.search(r'class="[^"]*\bsj-inst\b', attrs):
        return html
    if 'class="' in attrs:
        new = re.sub(r'class="([^"]*)"', lambda c: f'class="{c.group(1)} sj-inst"', attrs, count=1)
    else:
        new = attrs + ' class="sj-inst"'
    return html[:m.start(1)] + new + html[m.end(1):]


def ensure_css(html):
    if "/css/institution.css" in html:
        return html
    i = html.index("</head>")
    tokens = "" if "/css/sj-tokens.css" in html else '<link rel="stylesheet" href="/css/sj-tokens.css"/>\n'
    return html[:i] + tokens + '<link rel="stylesheet" href="/css/institution.css"/>\n' + html[i:]


def ensure_breadcrumbs(html, label):
    if label is None or 'class="breadcrumbs"' in html:
        return html
    crumb = (f'\n<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/index.html">Home</a>'
             f'<span class="sep">›</span><span class="current" aria-current="page">{label}</span></nav>\n')
    m = re.search(r"<main[^>]*>", html)
    return html[:m.end()] + crumb + html[m.end():]


def org_nav(path):
    items = []
    for href, label in ORG_NAV:
        cur = ' aria-current="page"' if href == "/" + path else ""
        items.append(f'<li><a href="{href}"{cur}>{label}</a></li>')
    return ('<!-- in-orgnav:start (generated by tools/apply_institution_shell.py) -->\n'
            '<nav class="in-orgnav" aria-label="Organization"><ul>' + "".join(items) + '</ul></nav>\n'
            '<!-- in-orgnav:end -->')


def ensure_org_nav(html, path, show):
    html = re.sub(r"\n?<!-- in-orgnav:start.*?<!-- in-orgnav:end -->", "", html, flags=re.S)
    if not show:
        return html
    # after the page head: the first element carrying in-hero / in-newsletter title block
    m = re.search(r'<(section|header)[^>]*\bin-(?:hero|newsletter)\b[^>]*>.*?</\1>', html, flags=re.S)
    if m:
        return html[:m.end()] + "\n" + org_nav(path) + html[m.end():]
    raise SystemExit(f"{path}: no page head found for the organization navigation")


def build(path, html):
    label, show = PAGES[path]
    html = ensure_body_class(html)
    html = ensure_css(html)
    html = ensure_breadcrumbs(html, label)
    html = add_classes(html)
    html = mark_plain_hero(html)
    html = ensure_org_nav(html, path, show)
    return html


def main():
    check = "--check" in sys.argv
    stale = []
    for path in PAGES:
        f = ROOT / path
        old = f.read_text(encoding="utf-8")
        new = build(path, old)
        if new != old:
            stale.append(path)
            if not check:
                f.write_text(new, encoding="utf-8")
    if check:
        if stale:
            print("Out of date: " + ", ".join(stale))
            sys.exit(1)
        print("All institution pages are up to date.")
    else:
        print(f"Updated {len(stale)} page(s): {', '.join(stale) or 'none'}")


if __name__ == "__main__":
    main()
