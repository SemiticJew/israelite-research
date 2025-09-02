#!/usr/bin/env python3
"""
Build chapter JSON files for a book in your schema:
  [{ "v": <int>, "t": "<text>", "c": [], "s": [] }, ... ]

Inputs (use one):
  1) CSV text: tools/<book>_kjv.csv  with columns: chapter,verse,text
  2) Verse counts: tools/<book>_verse_counts.json  like:
     { "1": 22, "2": 25, ..., "40": 38 }

By DEFAULT this script **skips existing chapter files**. Use --force to overwrite.

Usage (from repo root):
  python3 tools/build_book_json.py --canon tanakh --book exodus
  python3 tools/build_book_json.py --canon tanakh --book exodus --force
"""
import csv, json, sys
from pathlib import Path
import argparse

REPO_ROOT = Path(__file__).resolve().parents[1]

def out_dir(canon:str, book:str) -> Path:
    return REPO_ROOT / "data" / canon.lower() / book.lower()

def csv_path(book:str) -> Path:
    return REPO_ROOT / "tools" / f"{book.lower()}_kjv.csv"

def vc_path(book:str) -> Path:
    return REPO_ROOT / "tools" / f"{book.lower()}_verse_counts.json"

def ensure_dir(p:Path):
    p.mkdir(parents=True, exist_ok=True)

def write_chapter_json(fp:Path, rows, force: bool) -> tuple[bool,bool]:
    """
    rows: list of dicts with v(int), t(str)
    Returns (wrote, skipped)
    """
    if fp.exists() and not force:
        return (False, True)
    data = []
    for r in rows:
        v = int(r["v"])
        t = str(r.get("t","")).strip()
        data.append({"v": v, "t": t, "c": [], "s": []})
    data.sort(key=lambda x: x["v"])
    ensure_dir(fp.parent)
    with fp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return (True, False)

def build_from_csv(canon:str, book:str, force: bool) -> tuple[int,int]:
    src = csv_path(book)
    if not src.exists():
        return (0,0)
    dest_dir = out_dir(canon, book)
    ensure_dir(dest_dir)

    chapters = {}
    with src.open("r", encoding="utf-8") as f:
        rdr = csv.DictReader(f)
        for row in rdr:
            ch = int(row["chapter"])
            vs = int(row["verse"])
            tx = (row.get("text") or "").strip()
            chapters.setdefault(ch, []).append({"v": vs, "t": tx})
    wrote = skipped = 0
    for ch, vrows in chapters.items():
        fp = dest_dir / f"{ch}.json"
        w, s = write_chapter_json(fp, vrows, force)
        wrote += int(w); skipped += int(s)
    print(f"[CSV] Wrote {wrote}, skipped {skipped} (existing) in {dest_dir}")
    return (wrote, skipped)

def build_from_counts(canon:str, book:str, force: bool) -> tuple[int,int]:
    src = vc_path(book)
    if not src.exists():
        return (0,0)
    dest_dir = out_dir(canon, book)
    ensure_dir(dest_dir)

    with src.open("r", encoding="utf-8") as f:
        counts = json.load(f)

    wrote = skipped = 0
    for ch_str, vcount in counts.items():
        ch = int(ch_str)
        rows = [{"v": v, "t": ""} for v in range(1, int(vcount)+1)]
        fp = dest_dir / f"{ch}.json"
        w, s = write_chapter_json(fp, rows, force)
        wrote += int(w); skipped += int(s)
    print(f"[COUNTS] Wrote {wrote}, skipped {skipped} (existing) in {dest_dir}")
    return (wrote, skipped)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--canon", default="tanakh", help="tanakh | newtestament")
    ap.add_argument("--book", required=True, help="book slug, e.g. exodus")
    ap.add_argument("--force", action="store_true", help="overwrite existing chapter files")
    args = ap.parse_args()

    w1,s1 = build_from_csv(args.canon, args.book, args.force)
    if w1+s1 == 0:  # no CSV present
        w2,s2 = build_from_counts(args.canon, args.book, args.force)
        if w2+s2 == 0:
            print(f"No inputs found.\nProvide either:\n  {csv_path(args.book)} or\n  {vc_path(args.book)}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
