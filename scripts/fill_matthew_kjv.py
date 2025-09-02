#!/usr/bin/env python3
"""
Fill Matthew 1–28 JSONs with KJV text.

INPUT:
  A UTF-8 text file with chapters/verses in this simple shape:

    Matthew 1
    1 The book of the generation of Jesus Christ, the son of David, the son of Abraham.
    2 Abraham begat Isaac; and Isaac begat Jacob; ...
    ...
    25 And knew her not till she had brought forth her firstborn son: and he called his name JESUS.

    Matthew 2
    1 Now when Jesus was born in Bethlehem of Judaea in the days of Herod the king, ...
    ...

  Minimal requirements:
    - A line with "Matthew <n>" starts a chapter
    - Each verse line begins with "<number><space><text>"

USAGE:
  python3 scripts/fill_matthew_kjv.py --txt scripts/data/kjv_matthew.txt \
      --root israelite-research/data/newtestament/matthew
"""

import re, json
from pathlib import Path
import argparse

CHAPTERS = 28
CHAPTER_RE = re.compile(r'^\s*Matthew\s+(\d+)\s*$', re.IGNORECASE)
VERSE_RE = re.compile(r'^\s*(\d+)\s+(.*\S)\s*$')

def parse_kjv_text(path: Path):
    """Return dict {chapter:int -> list of (v:int, t:str)}"""
    chapters = {}
    cur = None
    for raw in path.read_text(encoding='utf-8').splitlines():
        if not raw.strip():
            continue
        m = CHAPTER_RE.match(raw)
        if m:
            cur = int(m.group(1))
            chapters[cur] = []
            continue
        m = VERSE_RE.match(raw)
        if m and cur:
            v = int(m.group(1))
            t = m.group(2)
            chapters[cur].append({"v": v, "t": t, "s": []})  # s = Strong's tags (later)
    return chapters

def load_json(p: Path):
    if p.exists():
        return json.loads(p.read_text(encoding='utf-8'))
    return {"book":"Matthew","chapter":int(p.stem),"verses":[],"lexicon":{},"commentary":""}

def save_json(p: Path, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--txt", required=True, help="Path to kjv_matthew.txt")
    ap.add_argument("--root", default="israelite-research/data/newtestament/matthew", help="Root folder with 1..28.json")
    ap.add_argument("--preserve_commentary", action="store_true", help="Keep existing commentary if present")
    args = ap.parse_args()

    txt_path = Path(args.txt)
    out_root = Path(args.root)

    data = parse_kjv_text(txt_path)

    made, missing = 0, []
    for ch in range(1, CHAPTERS + 1):
        dst = out_root / f"{ch}.json"
        obj = load_json(dst)

        verses = data.get(ch, [])
        if not verses:
            missing.append(ch)
        obj["book"] = "Matthew"
        obj["chapter"] = ch
        obj["verses"] = verses

        if "lexicon" not in obj or not isinstance(obj.get("lexicon"), dict):
            obj["lexicon"] = {}

        if "commentary" not in obj or not isinstance(obj.get("commentary"), str):
            obj["commentary"] = ""
        elif not args.preserve_commentary:
            # keep any existing commentary by default; flip with flag if you want to preserve
            pass

        save_json(dst, obj)
        made += 1

    print(f"Updated {made} JSON files in {out_root}")
    if missing:
        print("WARNING: No verses parsed for chapters:", missing)

if __name__ == "__main__":
    main()
