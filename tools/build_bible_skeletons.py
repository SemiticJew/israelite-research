#!/usr/bin/env python3
"""
Generate skeleton chapter JSON for entire Tanakh/NT, using:
- tools/verse_counts/chapter_counts.json  (required)
- tools/verse_counts/<canon>/<book>.json  (optional per-chapter verse counts)
Writes: data/<canon>/<book>/<chapter>.json
Schema: [{ "v": <int>, "t": "", "c": [], "s": [] }, ...]

If a book's per-chapter verse counts file is missing, creates 1 placeholder
verse per chapter and logs a TODO report.

Usage:
  python3 tools/build_bible_skeletons.py --canon tanakh
  python3 tools/build_bible_skeletons.py --canon newtestament
  python3 tools/build_bible_skeletons.py --canon all
"""
import json, sys, time, shutil
from pathlib import Path
import argparse

REPO = Path(__file__).resolve().parents[1]
VC_ROOT = REPO / "tools" / "verse_counts"
COUNTS_PACK = VC_ROOT / "chapter_counts.json"
REPORTS = REPO / "tools" / "reports"

def backup_dir(p: Path) -> Path:
    stamp = time.strftime("%Y%m%d-%H%M%S")
    dst = p.parent / f"{p.name}.bak.{stamp}"
    if p.exists():
        shutil.copytree(p, dst)
        return dst
    return None

def ensure_dir(p: Path): p.mkdir(parents=True, exist_ok=True)

def write_chapter(out_file: Path, verse_count: int):
    # at least 1 verse
    n = max(1, int(verse_count))
    data = [{"v": i, "t": "", "c": [], "s": []} for i in range(1, n+1)]
    ensure_dir(out_file.parent)
    with out_file.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

def load_counts_pack():
    if not COUNTS_PACK.exists():
        print(f"Missing {COUNTS_PACK}", file=sys.stderr)
        sys.exit(1)
    with COUNTS_PACK.open("r", encoding="utf-8") as f:
        return json.load(f)

def per_chapter_counts_path(canon: str, book: str) -> Path:
    return VC_ROOT / canon / f"{book}.json"

def build_canon(canon: str):
    pack = load_counts_pack()
    canon = canon.lower()
    if canon not in ("tanakh","newtestament","all"):
        print("canon must be tanakh | newtestament | all", file=sys.stderr)
        sys.exit(1)

    todo = []   # (canon, book) lacking per-chapter counts
    wrote = 0
    for cn in (("tanakh","newtestament") if canon=="all" else (canon,)):
        books = pack.get(cn, {})
        for book, ch_count in books.items():
            out_dir = REPO / "data" / cn / book
            # backup once per book if directory exists
            if out_dir.exists():
                backup_dir(out_dir)
            ensure_dir(out_dir)

            pc_path = per_chapter_counts_path(cn, book)
            per_ch = None
            if pc_path.exists():
                with pc_path.open("r", encoding="utf-8") as f:
                    per_ch = {int(k): int(v) for k,v in json.load(f).items()}

            if not per_ch:
                todo.append((cn, book))
                # create each chapter with 1 placeholder verse
                for ch in range(1, int(ch_count)+1):
                    write_chapter(out_dir / f"{ch}.json", 1)
                    wrote += 1
            else:
                # use exact verse counts
                for ch in range(1, int(ch_count)+1):
                    vc = int(per_ch.get(ch, 1))
                    write_chapter(out_dir / f"{ch}.json", vc)
                    wrote += 1

    ensure_dir(REPORTS)
    todo_file = REPORTS / "missing_per_chapter_counts.txt"
    with todo_file.open("w", encoding="utf-8") as f:
        if not todo:
            f.write("(all books had per-chapter verse counts)\n")
        else:
            for cn, bk in todo:
                f.write(f"{cn}/{bk}\n")

    print(f"Wrote {wrote} chapter files.")
    print(f"Report: {todo_file}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--canon", required=True, help="tanakh | newtestament | all")
    args = ap.parse_args()
    build_canon(args.canon)

if __name__ == "__main__":
    main()
