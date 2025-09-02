#!/usr/bin/env python3
"""
Build chapter JSON files for a book in your schema:
  [{ "v": <int>, "t": "<text>", "c": [], "s": [] }, ... ]

Inputs (use one):
  1) CSV text: tools/exodus_kjv.csv  with columns: chapter,verse,text
  2) Verse counts: tools/exodus_verse_counts.json  like:
     { "1": 22, "2": 25, ..., "40": 38 }

Usage (from repo root):
  python3 tools/build_book_json.py --canon tanakh --book exodus
  (auto-detects CSV and/or verse-counts file based on --book)

You can reuse this for any book by changing --book and supplying inputs.
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

def write_chapter_json(fp:Path, rows):
    # rows: list of dicts with v(int), t(str)
    data = []
    for r in rows:
        v = int(r["v"])
        t = str(r.get("t","")).strip()
        data.append({"v": v, "t": t, "c": [], "s": []})
    # sort by verse number just in case
    data.sort(key=lambda x: x["v"])
    with fp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

def build_from_csv(canon:str, book:str) -> int:
    src = csv_path(book)
    if not src.exists():
        return 0
    dest_dir = out_dir(canon, book)
    ensure_dir(dest_dir)

    # gather rows per chapter
    chapters = {}
    with src.open("r", encoding="utf-8") as f:
        rdr = csv.DictReader(f)
        for row in rdr:
            ch = int(row["chapter"])
            vs = int(row["verse"])
            tx = (row.get("text") or "").strip()
            chapters.setdefault(ch, []).append({"v": vs, "t": tx})
    count_files = 0
    for ch, vrows in chapters.items():
        fp = dest_dir / f"{ch}.json"
        write_chapter_json(fp, vrows)
        count_files += 1
    print(f"[CSV] Wrote {count_files} chapter files to {dest_dir}")
    return count_files

def build_from_counts(canon:str, book:str) -> int:
    src = vc_path(book)
    if not src.exists():
        return 0
    dest_dir = out_dir(canon, book)
    ensure_dir(dest_dir)

    with src.open("r", encoding="utf-8") as f:
        counts = json.load(f)

    count_files = 0
    for ch_str, vcount in counts.items():
        ch = int(ch_str)
        rows = [{"v": v, "t": ""} for v in range(1, int(vcount)+1)]
        fp = dest_dir / f"{ch}.json"
        write_chapter_json(fp, rows)
        count_files += 1
    print(f"[COUNTS] Wrote {count_files} chapter skeletons to {dest_dir}")
    return count_files

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--canon", default="tanakh", help="tanakh | newtestament")
    ap.add_argument("--book", required=True, help="book slug, e.g. exodus")
    args = ap.parse_args()

    wrote = 0
    # Prefer CSV (with real text) if present; otherwise use verse counts
    wrote += build_from_csv(args.canon, args.book)
    if wrote == 0:
        wrote += build_from_counts(args.canon, args.book)
    if wrote == 0:
        print(f"No inputs found.\nProvide either:\n  {csv_path(args.book)} or\n  {vc_path(args.book)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
