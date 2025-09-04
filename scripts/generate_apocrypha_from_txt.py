#!/usr/bin/env python3
"""
Parse apocrypha_book.txt and emit:
  data/apocrypha/<book-slug>/<chapter>.json  (array of {v,t,c,s})
  data/apocrypha/<book-slug>/_meta.json      ({"book": "<Display>", "chapters": N})

Supported input formats (flexible):
- Book: <Display Name>            # or "BOOK: <name>" or "# <name>"
- Chapter 1                       # or "CHAPTER 1" or "CH 1" or "C 1"
- 1 In the beginning ...          # verse lines: "<num> <text>" OR "<num>\t<text>"

Multiple books may be concatenated; detector resets on "Book:" or a big header line.
Everything else is ignored.
"""

import re, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "apocrypha"

BOOK_PAT = re.compile(r"^\s*(?:Book:|BOOK:|#)\s*(.+?)\s*$")
CH_PAT   = re.compile(r"^\s*(?:Chapter|CHAPTER|CH|C)\s+(\d+)\s*$")
V_PAT    = re.compile(r"^\s*(\d+)[\.\):\-]?\s+(.*\S)\s*$")   # 1 text / 1) text / 1. text

def slugify(name:str)->str:
  return re.sub(r"[^a-z0-9\-]", "", re.sub(r"\s+", "-", name.strip().lower()))

def flush_chapter(book_slug, ch_num, verses, store):
  if not verses: return
  store.setdefault(book_slug, {})[ch_num] = [
    {"v": int(vn), "t": txt.strip(), "c": [], "s": []}
    for vn, txt in verses
  ]

def write_book(book_slug, display_name, chapters_map):
  out_dir = OUT / book_slug
  out_dir.mkdir(parents=True, exist_ok=True)
  max_ch = 0
  for ch, arr in chapters_map.items():
    max_ch = max(max_ch, int(ch))
    with (out_dir / f"{int(ch)}.json").open("w", encoding="utf-8") as f:
      json.dump(arr, f, ensure_ascii=False, indent=2)
  meta = {"book": display_name, "chapters": max_ch or len(chapters_map)}
  with (out_dir / "_meta.json").open("w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

def main():
  if len(sys.argv) < 2:
    print("Usage: python3 scripts/generate_apocrypha_from_txt.py apocrypha_book.txt")
    sys.exit(2)
  txt_path = Path(sys.argv[1])
  if not txt_path.exists():
    print(f"[error] not found: {txt_path}", file=sys.stderr)
    sys.exit(2)

  raw = txt_path.read_text(encoding="utf-8", errors="ignore").splitlines()

  current_book = None
  current_slug = None
  display_name = None
  ch_num = None
  verses = []
  store = {}   # { book_slug: { ch: [ {v,t,c,s}, ... ] } }

  def start_book(name):
    nonlocal current_book, current_slug, display_name, ch_num, verses
    # flush any pending chapter
    if current_slug and ch_num is not None:
      flush_chapter(current_slug, ch_num, verses, store)
    # write previous book
    if current_slug and current_slug in store:
      write_book(current_slug, display_name or current_book, store[current_slug])
    # reset
    current_book = name.strip()
    display_name = current_book
    current_slug = slugify(current_book)
    ch_num = None
    verses = []
    store.setdefault(current_slug, {})

  def start_chapter(n):
    nonlocal ch_num, verses
    # flush prior
    if current_slug and ch_num is not None:
      flush_chapter(current_slug, ch_num, verses, store)
    ch_num = int(n)
    verses = []

  for line in raw:
    line = line.rstrip("\n")
    if not line.strip():
      continue
    m = BOOK_PAT.match(line)
    if m:
      start_book(m.group(1))
      continue
    # also accept big ALLCAPS line as book header if no chapter selected yet
    if current_book is None and line.isupper() and len(line.split())<=6:
      start_book(line.title())
      continue

    m = CH_PAT.match(line)
    if m:
      if current_book is None:
        # if a chapter appears before a book, name it "Apocrypha"
        start_book("Apocrypha")
      start_chapter(m.group(1))
      continue

    m = V_PAT.match(line)
    if m and current_slug and ch_num is not None:
      vn, txt = m.group(1), m.group(2)
      verses.append((vn, txt))
      continue

    # If we encounter a non-matching line right after a book header without chapter,
    # try to parse implicit "Chapter 1" and start with verse if it starts with number
    if current_slug and ch_num is None:
      mv = V_PAT.match(line)
      if mv:
        start_chapter(1)
        verses.append((mv.group(1), mv.group(2)))
        continue
    # otherwise ignore the line

  # flush tail
  if current_slug and ch_num is not None:
    flush_chapter(current_slug, ch_num, verses, store)
  if current_slug and current_slug in store:
    write_book(current_slug, display_name or current_book, store[current_slug])

  print("[ok] Apocrypha JSON generated under data/apocrypha")

if __name__ == "__main__":
  main()
