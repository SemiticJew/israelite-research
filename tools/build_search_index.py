#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import json
import re
from datetime import datetime

ROOT = Path(".")
OUT = ROOT / "search-index.json"

EXCLUDE_FILES = {
    "404.html",
    "search.html",
    "article-template.html",
}

EXCLUDE_PARTS = {
    "/partials/",
    "/assets/",
}

STATIC_PAGES = [
    "index.html",
    "articles.html",
    "authors.html",
    "biblia.html",
    "apologetics.html",
    "dietary-laws.html",
    "donate.html",
    "events.html",
    "media.html",
    "tanakh.html",
    "newtestament.html",
    "apocrypha.html",
    "ologies.html",
    "black-history-biblical-identity.html",
]

TAG_WORDS = {
    "logic": "logic",
    "truth": "truth",
    "creation": "creation",
    "gentile": "gentiles",
    "gentiles": "gentiles",
    "ham": "hamites",
    "hamites": "hamites",
    "rage": "rage",
    "white supremacy": "white supremacy",
    "christianity": "christianity",
    "justice": "justice",
    "biblical": "biblical identity",
    "identity": "biblical identity",
    "law": "law",
    "dietary": "dietary laws",
    "prophecy": "prophecy",
    "karmelo": "karmelo anthony",
    "austin": "austin metcalf",
}

class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.in_title = False
        self.h1 = ""
        self.in_h1 = False
        self.meta = {}
        self.times = []
        self.images = []
        self.text_chunks = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)

        if tag == "title":
            self.in_title = True

        if tag == "h1":
            self.in_h1 = True

        if tag == "meta":
            key = attrs.get("name") or attrs.get("property") or attrs.get("itemprop")
            val = attrs.get("content")
            if key and val:
                self.meta[key.strip()] = val.strip()

        if tag == "time":
            dt = attrs.get("datetime")
            if dt:
                self.times.append(dt.strip())

        if tag == "img":
            src = attrs.get("src")
            if src:
                self.images.append(src.strip())

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "h1":
            self.in_h1 = False

    def handle_data(self, data):
        s = " ".join(data.split())
        if not s:
            return
        if self.in_title:
            self.title += s + " "
        if self.in_h1:
            self.h1 += s + " "
        if len(s) > 20:
            self.text_chunks.append(s)

def clean(text):
    text = re.sub(r"\s+", " ", text or "").strip()
    text = text.replace(" — Semitic Jew", "").replace(" | Semitic Jew", "").strip()
    return text

def url_for(path):
    s = "/" + str(path).replace("\\", "/")
    if s.endswith("/index.html"):
        return s[:-10] or "/"
    return s

def type_for(path):
    p = str(path).replace("\\", "/")
    if p.startswith("articles/"):
        return "Article"
    if p.startswith("authors/"):
        return "Page"
    if "map" in p or "region" in p:
        return "Region"
    return "Page"

def keyword_tags(parser):
    raw = parser.meta.get("keywords") or parser.meta.get("article:tag") or ""
    tags = []
    for part in raw.split(","):
        t = clean(part).lower()
        if t:
            tags.append(t)
    return tags

def tags_for(title, excerpt, path):
    hay = f"{title} {excerpt} {path}".lower()
    tags = set()

    for needle, tag in TAG_WORDS.items():
        if needle in hay:
            tags.add(tag)

    if str(path).startswith("articles/"):
        tags.add("articles")
    if "biblia" in hay or "scripture" in hay:
        tags.add("scripture")
    if "black" in hay or "hebrew" in hay or "israelite" in hay:
        tags.add("black hebrews")

    return sorted(tags)

def date_for(parser, path):
    for key in [
        "article:published_time",
        "datePublished",
        "date",
    ]:
        if parser.meta.get(key):
            return parser.meta[key][:10]

    for t in parser.times:
        if re.match(r"\d{4}-\d{2}-\d{2}", t):
            return t[:10]

    return ""

def image_for(parser):
    for key in ["og:image", "twitter:image", "image"]:
        val = parser.meta.get(key)
        if val:
            val = val.replace("https://semiticjew.org", "")
            return val

    for img in parser.images:
        if "/images/" in img or img.startswith("/images/"):
            return img

    return ""

def excerpt_for(parser):
    for key in ["description", "og:description", "twitter:description"]:
        if parser.meta.get(key):
            return clean(parser.meta[key])

    text = clean(" ".join(parser.text_chunks))
    return text[:220] + ("…" if len(text) > 220 else "")

def should_include(path):
    name = path.name
    s = str(path).replace("\\", "/")

    if name in EXCLUDE_FILES:
        return False

    if any(part in s for part in EXCLUDE_PARTS):
        return False

    if path.suffix.lower() != ".html":
        return False

    if s.startswith("."):
        return False

    if s.startswith("articles/") and name == "article-template.html":
        return False

    return True

def build():
    files = []

    for page in STATIC_PAGES:
        p = ROOT / page
        if p.exists() and should_include(p):
            files.append(p)

    article_files = sorted((ROOT / "articles").glob("*.html")) if (ROOT / "articles").exists() else []
    author_files = sorted((ROOT / "authors").glob("*.html")) if (ROOT / "authors").exists() else []

    for p in article_files + author_files:
        if should_include(p) and p not in files:
            files.append(p)

    items = []
    seen = set()

    for path in files:
        rel = path.relative_to(ROOT)
        html = path.read_text(errors="ignore")

        parser = MetaParser()
        parser.feed(html)

        title = clean(parser.h1) or clean(parser.title) or clean(rel.stem.replace("-", " ").title())
        excerpt = excerpt_for(parser)
        url = url_for(rel)

        if url in seen:
            continue
        seen.add(url)

        items.append({
            "type": type_for(rel),
            "title": title,
            "url": url,
            "image": image_for(parser),
            "date": date_for(parser, rel),
            "excerpt": excerpt,
            "tags": sorted(set(tags_for(title, excerpt, rel) + keyword_tags(parser))),
        })

    def sort_key(item):
        d = item.get("date") or "0000-00-00"
        return (d, item.get("title", ""))

    items.sort(key=sort_key, reverse=True)

    OUT.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {OUT} with {len(items)} records")

if __name__ == "__main__":
    build()
