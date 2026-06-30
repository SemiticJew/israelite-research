#!/usr/bin/env python3
"""
Generate short-link verse pages for Semitic Jew.

This script is intentionally safe by default:
- `--verse genesis-2-7` generates one page.
- `--all` generates every verse page, but requires `--force` once the
  output count is large enough to be expensive.

The runtime app uses a generic `/v/index.html` plus 404/SW fallback so
we do not need to prebuild all verse pages for normal operation.
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Optional


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
BASE_URL = "https://semiticjew.org"

CANONS = (
    ("tanakh", DATA_DIR / "tanakh" / "books.json"),
    ("newtestament", DATA_DIR / "newtestament" / "books.json"),
    ("apocrypha", DATA_DIR / "apocrypha" / "books.json"),
)


@dataclass(frozen=True)
class VerseRecord:
    canon: str
    book: str
    chapter: int
    verse: int
    text: str

    @property
    def slug(self) -> str:
        return f"{self.book}-{self.chapter}-{self.verse}"

    @property
    def ref(self) -> str:
        return f"{title_from_slug(self.book)} {self.chapter}:{self.verse}"

    @property
    def short_url(self) -> str:
        return f"{BASE_URL}/v/{self.slug}/"

    @property
    def context_url(self) -> str:
        return (
            f"{BASE_URL}/app.html?"
            f"canon={self.canon}&book={self.book}&ch={self.chapter}&v={self.verse}"
        )


def title_from_slug(slug: str) -> str:
    return " ".join(
        part.upper() if len(part) <= 2 else part[:1].upper() + part[1:]
        for part in slug.split("-")
        if part
    )


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_books() -> Dict[str, Dict[str, int]]:
    books: Dict[str, Dict[str, int]] = {}
    for canon, path in CANONS:
        books[canon] = load_json(path)
    return books


def iter_records() -> Iterable[VerseRecord]:
    for canon, books in CANONS:
        book_index = load_json(books)
        for book, total_chapters in book_index.items():
            for chapter in range(1, int(total_chapters) + 1):
                chapter_path = DATA_DIR / canon / book / f"{chapter}.json"
                if not chapter_path.exists():
                    continue
                chapter_data = load_json(chapter_path)
                for item in chapter_data.get("verses", []):
                    verse = item.get("v")
                    text = str(item.get("t") or "").strip()
                    if verse is None or not text:
                        continue
                    yield VerseRecord(
                        canon=canon,
                        book=book,
                        chapter=int(chapter),
                        verse=int(verse),
                        text=text,
                    )


def parse_slug(slug: str) -> Optional[tuple[str, int, int]]:
    tokens = [part for part in str(slug or "").strip().strip("/").split("-") if part]
    if len(tokens) < 3:
        return None
    verse = tokens.pop()
    chapter = tokens.pop()
    book = "-".join(tokens)
    if not book or not chapter.isdigit() or not verse.isdigit():
        return None
    return book, int(chapter), int(verse)


def resolve_record(slug: str, books: Dict[str, Dict[str, int]]) -> Optional[VerseRecord]:
    parsed = parse_slug(slug)
    if not parsed:
        return None
    book, chapter, verse = parsed
    canon = next((canon for canon, index in books.items() if book in index), None)
    if not canon:
        return None
    chapter_path = DATA_DIR / canon / book / f"{chapter}.json"
    if not chapter_path.exists():
        return None
    chapter_data = load_json(chapter_path)
    text = ""
    for item in chapter_data.get("verses", []):
        if int(item.get("v") or -1) == verse:
            text = str(item.get("t") or "").strip()
            break
    if not text:
        return None
    return VerseRecord(canon=canon, book=book, chapter=chapter, verse=verse, text=text)


def render_page(record: VerseRecord) -> str:
    ref = html.escape(record.ref)
    text = html.escape(record.text)
    short_url = html.escape(record.short_url)
    context_url = html.escape(record.context_url)
    description = html.escape(record.text[:180])
    title = html.escape(f"{record.ref} | Semitic Jew")
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="theme-color" content="#054A91">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Semitic Jew">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{short_url}">
  <meta property="twitter:card" content="summary">
  <style>
    body{{margin:0;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f7f9fc;color:#0b1220}}
    main{{max-width:760px;margin:0 auto;background:#fff;border:1px solid rgba(129,164,205,.26);border-radius:18px;padding:clamp(20px,4vw,36px);box-shadow:0 16px 40px rgba(5,74,145,.10)}}
    .brand{{margin:0 0 8px;color:#054A91;font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}}
    h1{{margin:0;font-size:clamp(1.6rem,4.5vw,2.4rem);line-height:1.1}}
    .meta{{margin:12px 0 0;color:rgba(11,18,32,.76)}}
    blockquote{{margin:22px 0 0;padding:18px 18px 18px 20px;border-left:4px solid #F17300;background:linear-gradient(180deg, rgba(219,228,238,.45), rgba(255,255,255,.85));border-radius:14px;font-size:clamp(1.1rem,3.4vw,1.35rem);line-height:1.8;white-space:pre-wrap}}
    .actions{{margin-top:18px;display:flex;flex-wrap:wrap;gap:10px}}
    a{{color:#054A91;text-decoration:none;font-weight:700}}
    .button{{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 14px;border-radius:999px;border:1px solid rgba(62,124,177,.22);background:rgba(219,228,238,.5)}}
    .brandline{{margin:20px 0 0;color:rgba(11,18,32,.72);font-size:.96rem}}
  </style>
</head>
<body>
  <main>
    <p class="brand">Semitic Jew</p>
    <h1>{ref}</h1>
    <p class="meta">KJV</p>
    <blockquote>“{text}”</blockquote>
    <div class="actions">
      <a class="button" href="{context_url}">Read in context</a>
      <a class="button" href="{short_url}">{short_url}</a>
    </div>
    <p class="brandline">Scripture. Logic. History. Identity.</p>
  </main>
</body>
</html>
"""


def write_record(out_root: Path, record: VerseRecord) -> Path:
    target = out_root / "v" / record.slug / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render_page(record), encoding="utf-8")
    return target


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Generate Semitic Jew short verse pages.")
    parser.add_argument("--out", type=Path, default=ROOT / "verse-share-pages", help="Output root directory.")
    parser.add_argument("--verse", help="Generate one page by slug, e.g. genesis-2-7")
    parser.add_argument("--all", action="store_true", help="Generate every verse page.")
    parser.add_argument("--force", action="store_true", help="Allow large bulk generation.")
    args = parser.parse_args(argv)

    books = load_books()

    if args.verse:
        record = resolve_record(args.verse, books)
        if not record:
            print(f"[error] verse not found: {args.verse}", file=sys.stderr)
            return 1
        path = write_record(args.out, record)
        print(f"[ok] wrote {path}")
        return 0

    if args.all:
        count = sum(1 for _ in iter_records())
        if count > 10000 and not args.force:
            print(
                f"[refusing] {count} verse pages would be generated. "
                "Use --force if you really want the full prerender.",
                file=sys.stderr,
            )
            return 2
        records = list(iter_records())
        for record in records:
            write_record(args.out, record)
        print(f"[ok] wrote {len(records)} pages to {args.out}")
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
