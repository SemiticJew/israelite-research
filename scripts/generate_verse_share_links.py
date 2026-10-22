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
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Optional


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
BASE_URL = "https://semiticjew.org"
DAILY_VERSES_PATH = DATA_DIR / "verse-of-the-day.json"

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


def resolve_daily_record(item: dict) -> Optional[VerseRecord]:
    canon = str(item.get("canon") or "").strip()
    book = str(item.get("book") or "").strip()
    try:
        chapter = int(item.get("chapter"))
        verse = int(item.get("verse"))
    except (TypeError, ValueError):
        return None
    chapter_path = DATA_DIR / canon / book / f"{chapter}.json"
    if not canon or not book or not chapter_path.exists():
        return None
    chapter_data = load_json(chapter_path)
    match = next(
        (entry for entry in chapter_data.get("verses", []) if int(entry.get("v") or -1) == verse),
        None,
    )
    text = str((match or {}).get("t") or "").strip()
    if not text:
        return None
    return VerseRecord(canon=canon, book=book, chapter=chapter, verse=verse, text=text)


def daily_records() -> list[VerseRecord]:
    payload = load_json(DAILY_VERSES_PATH)
    records = [resolve_daily_record(item) for item in payload.get("verses", [])]
    if not records or any(record is None for record in records):
        raise ValueError(f"Invalid verse entry in {DAILY_VERSES_PATH}")
    return [record for record in records if record is not None]


def render_page(record: VerseRecord) -> str:
    ref = html.escape(record.ref)
    text = html.escape(record.text)
    short_url = html.escape(record.short_url)
    context_url = html.escape(record.context_url)
    description = html.escape(record.text[:180])
    title = html.escape(f"{record.ref} | Semitic Jew")
    image_url = html.escape(f"{BASE_URL}/images/verse-cards/{record.slug}.png")
    image_path = html.escape(f"/images/verse-cards/{record.slug}.png")
    image_alt = html.escape(f"{record.ref}, King James Version — Semitic Jew")
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
  <meta property="og:image" content="{image_url}">
  <meta property="og:image:secure_url" content="{image_url}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{image_alt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{image_url}">
  <meta name="twitter:image:alt" content="{image_alt}">
  <link rel="canonical" href="{short_url}">
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
      <a class="button" href="{image_path}" download>Download verse card</a>
    </div>
    <p class="brandline">Scripture. Logic. History. Identity.</p>
  </main>
</body>
</html>
"""


def first_font(paths: list[str]) -> str:
    for value in paths:
        if Path(value).exists():
            return value
    raise FileNotFoundError("No supported font found for verse-card generation")


def render_card(path: Path, record: VerseRecord) -> None:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as error:
        raise RuntimeError("Pillow is required to generate verse-card PNG files") from error

    serif_path = first_font([
        "/System/Library/Fonts/NewYork.ttf",
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ])
    sans_path = first_font([
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ])
    sans_bold_path = first_font([
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ])

    width, height = 1200, 630
    image = Image.new("RGB", (width, height), "#F4F7FB")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, width, 18), fill="#F17300")
    draw.rectangle((0, 18, 26, height), fill="#054A91")
    draw.rounded_rectangle((72, 62, 1128, 568), radius=28, fill="#FFFFFF", outline="#DBE4EE", width=3)

    brand_font = ImageFont.truetype(sans_bold_path, 28)
    reference_font = ImageFont.truetype(sans_bold_path, 42)
    footer_font = ImageFont.truetype(sans_path, 24)
    draw.text((112, 98), "SEMITIC JEW", font=brand_font, fill="#054A91")
    draw.text((1088, 98), "KJV", font=brand_font, fill="#3E7CB1", anchor="ra")

    max_text_width = 930
    max_text_height = 270
    chosen_font = None
    wrapped = ""
    for font_size in range(52, 19, -2):
        font = ImageFont.truetype(serif_path, font_size)
        average_width = max(1, draw.textlength("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", font=font) / 52)
        line_chars = max(18, int(max_text_width / average_width))
        candidate = textwrap.fill(record.text, width=line_chars, break_long_words=False)
        box = draw.multiline_textbbox((0, 0), candidate, font=font, spacing=14)
        if box[2] - box[0] <= max_text_width and box[3] - box[1] <= max_text_height:
            chosen_font = font
            wrapped = candidate
            break
    if chosen_font is None:
        chosen_font = ImageFont.truetype(serif_path, 18)
        average_width = max(1, draw.textlength("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", font=chosen_font) / 52)
        wrapped = textwrap.fill(
            record.text,
            width=max(18, int(max_text_width / average_width)),
            break_long_words=False,
        )

    text_box = draw.multiline_textbbox((0, 0), wrapped, font=chosen_font, spacing=14)
    text_height = text_box[3] - text_box[1]
    text_y = 185 + max(0, (max_text_height - text_height) // 2)
    draw.multiline_text((135, text_y), wrapped, font=chosen_font, fill="#0B2340", spacing=14)
    draw.rectangle((112, 175, 120, 175 + max_text_height), fill="#F17300")
    draw.text((112, 492), record.ref, font=reference_font, fill="#054A91")
    draw.text((1088, 514), "Scripture. Logic. Truth.", font=footer_font, fill="#526579", anchor="ra")
    draw.text((1088, 544), "semiticjew.org", font=footer_font, fill="#526579", anchor="ra")

    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def write_record(out_root: Path, record: VerseRecord) -> Path:
    target = out_root / "v" / record.slug / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render_page(record), encoding="utf-8")
    render_card(out_root / "images" / "verse-cards" / f"{record.slug}.png", record)
    return target


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Generate Semitic Jew short verse pages.")
    parser.add_argument("--out", type=Path, default=ROOT / "verse-share-pages", help="Output root directory.")
    parser.add_argument("--verse", help="Generate one page by slug, e.g. genesis-2-7")
    parser.add_argument("--all", action="store_true", help="Generate every verse page.")
    parser.add_argument("--daily", action="store_true", help="Generate configured Verse of the Day pages and cards.")
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

    if args.daily:
        records = daily_records()
        for record in records:
            write_record(args.out, record)
        print(f"[ok] wrote {len(records)} daily verse pages and cards to {args.out}")
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
