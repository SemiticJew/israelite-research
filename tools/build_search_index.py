#!/usr/bin/env python3
import os, re, json, sys, argparse
from datetime import datetime
from pathlib import Path
from html import unescape

SITE_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = SITE_ROOT / "search-index.json"

INCLUDE_DIRS = [
    "articles",
    "encyclopedia",
    "regions",
    "pages",
]

TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
META_DESC_RE = re.compile(r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"'](.*?)[\"'][^>]*>", re.I | re.S)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.I | re.S)
P_RE = re.compile(r"<p[^>]*>(.*?)</p>", re.I | re.S)
DATE_META_RE = re.compile(r"<meta[^>]+property=[\"']article:published_time[\"'][^>]+content=[\"'](.*?)[\"'][^>]*>", re.I | re.S)

def strip_tags(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()

def infer_type(path: Path) -> str:
    p = path.as_posix()
    if "/articles/" in p:
        return "Article"
    if "/encyclopedia/" in p:
        return "Encyclopedia"
    if "/regions/" in p or "region" in p:
        return "Region"
    return "Page"

TAG_HINTS = {
    "logic": ["logic", "fallacy", "reason", "reasoning"],
    "scripture": ["scripture", "bible", "verse", "psalm", "genesis", "isaiah", "tanakh", "new testament", "apocrypha"],
    "creation": ["creation", "genesis"],
}

def infer_tags(title: str, excerpt: str, path: Path) -> list:
    bins = set()
    low = f"{title} {excerpt} {path.as_posix()}".lower()
    for tag, keys in TAG_HINTS.items():
        if any(k in low for k in keys):
            bins.add(tag)
    parts = [p for p in path.parts if p not in ("israelite-research",)]
    for p in parts:
        if len(p) > 2 and p.isalpha():
            bins.add(p.replace("_", "-").lower())
    return sorted(bins)[:8]

def parse_file(path: Path, base_url_prefix="/israelite-research") -> dict | None:
    try:
        html = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    title = strip_tags(TITLE_RE.search(html).group(1)) if TITLE_RE.search(html) else path.stem.replace("-", " ").title()

    if (m := META_DESC_RE.search(html)):
        excerpt = strip_tags(m.group(1))
    elif (m := P_RE.search(html)):
        excerpt = strip_tags(m.group(1))
    elif (m := H1_RE.search(html)):
        excerpt = strip_tags(m.group(1))
    else:
        excerpt = ""

    date_str = ""
    if (m := DATE_META_RE.search(html)):
        date_str = m.group(1)
    else:
        m = re.search(r"(20\d{2}-\d{2}-\d{2})", path.name)
        if m:
            try:
                d = datetime.strptime(m.group(1), "%Y-%m-%d")
                date_str = d.strftime("%b %d, %Y")
            except Exception:
                pass

    img = ""
    m = re.search(r"<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"'](.*?)[\"']", html, re.I | re.S)
    if m:
        img = m.group(1)
    else:
        m = re.search(r"<img[^>]+src=[\"'](.*?)[\"']", html, re.I | re.S)
        if m:
            img = m.group(1)

    rel = path.relative_to(SITE_ROOT)
    url = f"/{rel.as_posix()}"
    if not url.startswith("/israelite-research"):
        url = f"{base_url_prefix}{url}"

    rec = {
        "type": infer_type(path),
        "title": title,
        "url": url,
        "image": img,
        "date": date_str,
        "excerpt": excerpt[:400],
        "tags": infer_tags(title, excerpt, path),
        "source": infer_type(path).lower(),
    }
    return rec

def collect(root: Path) -> list:
    records = []
    for inc in INCLUDE_DIRS:
        d = root / inc
        if not d.exists():
            continue
        for p in d.rglob("*.html"):
            if "/partials/" in p.as_posix():
                continue
            rec = parse_file(p)
            if rec:
                records.append(rec)
    for p in root.glob("*.html"):
        if p.name in ("404.html", "index.html"):
            continue
        rec = parse_file(p)
        if rec:
            records.append(rec)
    return records

def main():
    ap = argparse.ArgumentParser(description="Build search-index.json for Semitic Jew site")
    ap.add_argument("--root", default=str(SITE_ROOT), help="Site root (default: repo root)")
    ap.add_argument("--out", default=str(OUTPUT), help="Output path (default: repo/search-index.json)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    out = Path(args.out).resolve()

    records = collect(root)

    def date_key(r):
        try:
            return datetime.strptime(r.get("date", ""), "%b %d, %Y")
        except Exception:
            return datetime.min

    records.sort(key=lambda r: (date_key(r), r.get("title", "")), reverse=True)

    out.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(records)} records -> {out}")

if __name__ == "__main__":
    main()
