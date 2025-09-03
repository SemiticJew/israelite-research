#!/usr/bin/env python3
"""
Merge cross-reference map into chapter JSONs for any book.

Usage:
  python3 tools/update_xrefs.py --canon tanakh --book exodus
Inputs:
  tools/<book>_xrefs.json     (from import_tsk.py)
Writes:
  data/<canon>/<book>/<ch>.json (updates "c" arrays)
Reports:
  tools/reports/<book>_xrefs_missing.csv
  tools/reports/<book>_xrefs_invalid.txt
"""
import json, csv, sys, time, shutil, re, argparse
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
REPORT_DIR = REPO / "tools" / "reports"
BAK_ROOT = REPO / "tools" / "_bak"

def backup_dir(src: Path) -> Path | None:
    if not src.exists(): return None
    BAK_ROOT.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    rel = src.relative_to(REPO).as_posix().replace("/", "-")
    dst = BAK_ROOT / f"{rel}.bak.{stamp}"
    shutil.copytree(src, dst)
    return dst

def merge_refs(existing, new_items):
    if not isinstance(existing, list): existing = []
    combined = list(dict.fromkeys(
        [*(e.strip() for e in existing if isinstance(e, str) and e.strip()),
         *(r.strip() for r in (new_items or []) if r and isinstance(r, str))]
    ))
    return combined

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--canon", required=True, help="tanakh | newtestament")
    ap.add_argument("--book",  required=True, help="book slug, e.g. exodus")
    args = ap.parse_args()

    book_slug = args.book.lower()
    book_dir = REPO / "data" / args.canon.lower() / book_slug
    xmap = REPO / "tools" / f"{book_slug}_xrefs.json"

    if not xmap.exists():
        print(f"Missing xref map: {xmap}", file=sys.stderr); sys.exit(1)
    if not book_dir.exists():
        print(f"Missing book dir: {book_dir}", file=sys.stderr); sys.exit(1)

    with xmap.open("r", encoding="utf-8") as f:
        mapping = json.load(f)

    # Backup once
    backup_dir(book_dir)

    missing = []
    total_changed = 0
    for ch_path in sorted(book_dir.glob("*.json"), key=lambda p: int(p.stem)):
        ch_num = int(ch_path.stem)
        with ch_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            print(f"SKIP {ch_path}: not array", file=sys.stderr); continue

        changed = 0
        for vobj in data:
            vnum = vobj.get("v")
            if not isinstance(vnum, int): continue
            key = f"{ch_num}:{vnum}"
            before = list(vobj.get("c") or [])
            after = before
            if key in mapping and mapping[key]:
                after = merge_refs(before, mapping[key])
            if after != before:
                vobj["c"] = after
                changed += 1
            if not vobj.get("c"):
                missing.append((ch_num, int(vnum)))

        with ch_path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")
        total_changed += changed
        print(f"Updated {book_slug}/{ch_num}.json: {changed} verse(s)")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    miss_csv = REPORT_DIR / f"{book_slug}_xrefs_missing.csv"
    with miss_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f); w.writerow(["chapter","verse"])
        for ch, vs in sorted(missing): w.writerow([ch, vs])

    print(f"Done. Changed verses: {total_changed}. Missing refs report: {miss_csv}")

if __name__ == "__main__":
    main()
