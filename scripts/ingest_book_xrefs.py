#!/usr/bin/env python3
"""
Ingest cross references from book_cross_references.csv and merge into chapter JSON (`v.c`).

CSV columns:
  testament_name_source, verse_ref_source_ls, testament_name_target, verse_ref_target_ls
Where *_ls columns are Python-style lists as strings, e.g. "['Genesis 1:1']"
or "['Colossians 1:16', 'Colossians 1:17']"

Usage:
  python scripts/ingest_book_xrefs.py data/book_cross_references.csv              # dry run
  python scripts/ingest_book_xrefs.py data/book_cross_references.csv --inplace    # write changes

This updates: data/{tanakh|newtestament}/{book-slug}/{chapter}.json
by merging human-readable target refs into each verse's `c` array.
"""
import argparse, csv, json, re, sys, ast
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]

ROMAN_TO_INT = {"i":1,"ii":2,"iii":3}
INT_TO_ROMAN = {1:"i",2:"ii",3:"iii"}

OT_BOOKS = {
  "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth",
  "1 samuel","2 samuel","i samuel","ii samuel",
  "1 kings","2 kings","i kings","ii kings",
  "1 chronicles","2 chronicles","i chronicles","ii chronicles",
  "ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes",
  "song of solomon","song of songs","isaiah","jeremiah","lamentations","ezekiel","daniel",
  "hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi"
}
NT_BOOKS = {
  "matthew","mark","luke","john","acts","romans",
  "1 corinthians","2 corinthians","i corinthians","ii corinthians",
  "galatians","ephesians","philippians","colossians",
  "1 thessalonians","2 thessalonians","i thessalonians","ii thessalonians",
  "1 timothy","2 timothy","i timothy","ii timothy",
  "titus","philemon","hebrews","james",
  "1 peter","2 peter","i peter","ii peter",
  "1 john","2 john","3 john","i john","ii john","iii john",
  "jude","revelation"
}

def clean_spaces(s:str)->str:
  return re.sub(r"\s+", " ", (s or "").replace("–","-").replace("—","-")).strip()

def parse_list_field(s:str):
  if not s or not s.strip(): return []
  try:
    v = ast.literal_eval(s)
    if isinstance(v, (list, tuple)):
      return [clean_spaces(str(x)) for x in v if str(x).strip()]
    # handle single value inside quotes like "['Genesis 1:1']" missing brackets (edge)
    return [clean_spaces(str(v))]
  except Exception:
    # Fallback: split on commas inside brackets like "['A', 'B']" as plain text
    t = s.strip().strip("[]")
    parts = [clean_spaces(p.strip().strip("'").strip('"')) for p in t.split(",")]
    return [p for p in parts if p]

def split_book_ch_verse(ref:str):
  # Accept "Genesis 1:1" / "1 John 3:16" / "I Kings 3:9"
  r = clean_spaces(ref)
  m = re.match(r"^((?:(?:[1-3])|(?:I{1,3}))\s+)?([A-Za-z][A-Za-z\s]+?)\s+(\d+):(\d+)$", r, flags=re.I)
  if not m: return None
  ord_token, base, ch, vs = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
  base = clean_spaces(base)
  ord_num = None
  if ord_token:
    t = ord_token.strip().lower()
    ord_num = int(t) if t.isdigit() else ROMAN_TO_INT.get(t, None)
  book_display = f"{INT_TO_ROMAN.get(ord_num, '') + ' ' if ord_num else ''}{base}".strip()
  return book_display, ch, vs

def book_display_to_slug(name:str)->str:
  n = clean_spaces(name).lower()
  # extract optional ordinal
  m = re.match(r"^((?:(?:[1-3])|(?:i{1,3})))[\s-]+(.+)$", n)
  if m:
    ord_token, base = m.group(1).lower(), m.group(2).strip().replace(" ", "-")
    ord_num = int(ord_token) if ord_token.isdigit() else ROMAN_TO_INT.get(ord_token, None)
    if ord_num in (1,2,3):
      return f"{INT_TO_ROMAN[ord_num]}-{base}"
  # special dual titles
  n = n.replace("songs of solomon","song of solomon")  # resilience
  return n.replace(" ", "-")

def guess_canon(book_display:str)->str:
  x = clean_spaces(book_display).lower()
  y = re.sub(r"[\-]+", " ", x)
  if y in OT_BOOKS: return "tanakh"
  if y in NT_BOOKS: return "newtestament"
  if "psalm" in y or "song of" in y: return "tanakh"
  if any(k in y for k in ["corinthians","thessalonians","timothy","peter","john","jude","revelation","romans","acts","galatians","ephesians","philippians","colossians","hebrews","james"]):
    return "newtestament"
  return "newtestament"

def load_chapter_json(path:Path):
  try:
    with path.open("r", encoding="utf-8") as f:
      data = json.load(f)
    if isinstance(data, list): return data
  except FileNotFoundError:
    return None
  return None

def save_chapter_json(path:Path, data):
  path.parent.mkdir(parents=True, exist_ok=True)
  tmp = path.with_suffix(".json.tmp")
  with tmp.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
  tmp.replace(path)

def merge_unique(existing, new_items):
  seen = set(existing or [])
  out = list(existing or [])
  for s in new_items:
    if s not in seen:
      seen.add(s)
      out.append(s)
  return out

def main():
  ap = argparse.ArgumentParser(description="Ingest cross references from book_cross_references.csv into chapter JSON.")
  ap.add_argument("csv_path", help="Path to book_cross_references.csv")
  ap.add_argument("--inplace", action="store_true", help="Write changes to disk")
  args = ap.parse_args()

  csv_path = Path(args.csv_path)
  if not csv_path.exists():
    print(f"[error] file not found: {csv_path}", file=sys.stderr)
    sys.exit(2)

  # source -> list of targets
  # key: (canon, slug, chapter, verse)
  buckets = defaultdict(list)

  with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
      src_list  = parse_list_field(row.get("verse_ref_source_ls",""))
      tgt_list  = parse_list_field(row.get("verse_ref_target_ls",""))
      if not src_list or not tgt_list:
        continue

      # Each row can have multiple sources and multiple targets; take cartesian
      srcs = [split_book_ch_verse(s) for s in src_list]
      tgts = [clean_spaces(t) for t in tgt_list]
      srcs = [s for s in srcs if s]

      for (src_book, src_ch, src_vs) in srcs:
        canon = guess_canon(src_book)
        slug  = book_display_to_slug(src_book)
        buckets[(canon, slug, src_ch, src_vs)].extend(tgts)

  files_scanned = 0
  files_changed = 0
  verses_updated = 0
  refs_added = 0

  # Apply to JSON
  for (canon, slug, ch, vs), targets in sorted(buckets.items()):
    chapter_path = ROOT / "data" / canon / slug / f"{ch}.json"
    files_scanned += 1
    data = load_chapter_json(chapter_path)
    if not data:
      print(f"[warn] missing chapter JSON: {canon}/{slug}/{ch}.json")
      continue

    # find verse object
    target_obj = None
    for obj in data:
      if isinstance(obj, dict) and obj.get("v") == vs:
        target_obj = obj
        break
    if not target_obj:
      print(f"[warn] verse not found: {canon}/{slug} {ch}:{vs}")
      continue

    old = target_obj.get("c") or []
    new = merge_unique(old, targets)
    if new != old:
      target_obj["c"] = new
      verses_updated += 1
      refs_added += max(0, len(new) - len(old))
      files_changed += 1
      if args.inplace:
        save_chapter_json(chapter_path, data)

  print("\n=== Xrefs Ingestion Summary ===")
  print(f"Files scanned:    {files_scanned}")
  print(f"Files changed:    {files_changed}")
  print(f"Verses updated:   {verses_updated}")
  print(f"Refs added:       {refs_added}")
  if not args.inplace:
    print("\n(No files were modified. Use --inplace to write changes.)")

if __name__ == "__main__":
  main()
