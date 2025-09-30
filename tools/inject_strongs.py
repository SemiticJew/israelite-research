#!/usr/bin/env python3
"""
inject_strongs.py
- Consume a KJV-with-Strong's CSV (book, chapter, verse, strongs[, ...])
- Write Strong's codes into each chapter JSON's verses[].s array.

Usage:
  python3 inject_strongs.py --csv data/lexicon/kjv_strongs.csv --root data/newtestament --inplace
  python3 inject_strongs.py --csv data/lexicon/kjv_strongs.csv --root data/tanakh --inplace
  python3 inject_strongs.py --csv data/lexicon/kjv_strongs.csv --root data/apocrypha --inplace
Options:
  --dry-run    Show what would change but don’t write files
  --inplace    Write changes (mutually exclusive with --dry-run)
  --validate   Only inject codes that exist in strongs-hebrew.json/strongs-greek.json
  --he strongs-hebrew.json path (default: data/lexicon/strongs-hebrew.json)
  --gr strongs-greek.json path   (default: data/lexicon/strongs-greek.json)
"""

import csv, json, re, sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

# ---- configuration ----

# Map KJV book names to your folder slugs
KJV_BOOK_TO_SLUG = {
    # Pentateuch
    "genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numbers":"numbers","deuteronomy":"deuteronomy",
    # History (OT)
    "joshua":"joshua","judges":"judges","ruth":"ruth",
    "1 samuel":"1-samuel","2 samuel":"2-samuel","1 kings":"1-kings","2 kings":"2-kings",
    "1 chronicles":"1-chronicles","2 chronicles":"2-chronicles","ezra":"ezra","nehemiah":"nehemiah","esther":"esther",
    # Poetry/Wisdom
    "job":"job","psalms":"psalms","psalm":"psalms","proverbs":"proverbs","ecclesiastes":"ecclesiastes","song of solomon":"song-of-solomon","song of songs":"song-of-solomon",
    # Prophets
    "isaiah":"isaiah","jeremiah":"jeremiah","lamentations":"lamentations","ezekiel":"ezekiel","daniel":"daniel",
    "hosea":"hosea","joel":"joel","amos":"amos","obadiah":"obadiah","jonah":"jonah","micah":"micah",
    "nahum":"nahum","habakkuk":"habakkuk","zephaniah":"zephaniah","haggai":"haggai","zechariah":"zechariah","malachi":"malachi",
    # Gospels/Acts
    "matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts",
    # Paul
    "romans":"romans","1 corinthians":"1-corinthians","2 corinthians":"2-corinthians",
    "galatians":"galatians","ephesians":"ephesians","philippians":"philippians","colossians":"colossians",
    "1 thessalonians":"1-thessalonians","2 thessalonians":"2-thessalonians",
    "1 timothy":"1-timothy","2 timothy":"2-timothy","titus":"titus","philemon":"philemon",
    # General + Revelation
    "hebrews":"hebrews","james":"james","1 peter":"1-peter","2 peter":"2-peter",
    "1 john":"1-john","2 john":"2-john","3 john":"3-john","jude":"jude","revelation":"revelation",
    # Common apocrypha names (adjust as needed to match your folders)
    "tobit":"tobit","judith":"judith","wisdom":"wisdom","sirach":"sirach","ecclesiasticus":"sirach",
    "baruch":"baruch","1 maccabees":"1-maccabees","2 maccabees":"2-maccabees",
    "1 esdras":"1-esdras","2 esdras":"2-esdras","additions to esther":"additions-to-esther",
    "susanna":"susanna","bel and the dragon":"bel-and-the-dragon","prayer of manasseh":"prayer-of-manasseh"
}

CODE_RE = re.compile(r'^[HG]\d{1,5}$', re.I)

def norm_book_name(name: str) -> str:
    return re.sub(r'\s+', ' ', (name or "").strip().lower())

def book_to_slug(name: str) -> Optional[str]:
    key = norm_book_name(name)
    if key in KJV_BOOK_TO_SLUG: return KJV_BOOK_TO_SLUG[key]
    # Try a simple fallback: numbers normalized, strip punctuation
    key2 = re.sub(r'[^\w\s-]', '', key)
    return KJV_BOOK_TO_SLUG.get(key2)

def sort_codes(codes: List[str]) -> List[str]:
    def keyfn(c): 
        try: return (c[0].upper(), int(c[1:]))
        except: return (c[0].upper(), 999999)
    return sorted({c.upper() for c in codes if CODE_RE.match(c)}, key=keyfn)

def read_strongs_lexicons(he_path: Path, gr_path: Path) -> set:
    ok = set()
    try:
        he = json.loads(he_path.read_text(encoding="utf-8"))
        ok.update(k.upper() for k in he.keys())
    except Exception: pass
    try:
        gr = json.loads(gr_path.read_text(encoding="utf-8"))
        ok.update(k.upper() for k in gr.keys())
    except Exception: pass
    return ok

def load_csv_map(csv_path: Path) -> Dict[Tuple[str,int,int], List[str]]:
    """
    Returns mapping: (book_slug, chapter, verse) -> [codes]
    Accepts CSV with flexible columns; tries these in order:
      - book, chapter, verse, strongs
      - ref/Reference like "Gen 1:1", "Matthew 5:3" + strongs
    """
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        cols = {c.lower(): c for c in reader.fieldnames or []}

        def col(*names): 
            for n in names:
                if n in cols: return cols[n]
            return None

        c_book = col("book","bk")
        c_ch   = col("chapter","chap","ch")
        c_v    = col("verse","v","vs")
        c_str  = col("strongs","strong","code","codes")
        c_ref  = col("ref","reference")

        mapping: Dict[Tuple[str,int,int], List[str]] = defaultdict(list)

        for row in reader:
            try:
                if c_book and c_ch and c_v:
                    book_name = row[c_book]
                    slug = book_to_slug(book_name)
                    if not slug: 
                        continue
                    ch = int(str(row[c_ch]).strip())
                    v  = int(str(row[c_v]).strip())
                elif c_ref:
                    ref = str(row[c_ref]).strip()
                    # Parse e.g. "Genesis 1:1", "1 Samuel 3:5"
                    m = re.match(r'^(.+?)\s+(\d+):(\d+)$', ref)
                    if not m: 
                        continue
                    book_name, ch, v = m.group(1), int(m.group(2)), int(m.group(3))
                    slug = book_to_slug(book_name)
                    if not slug:
                        continue
                else:
                    continue

                raw_codes = str(row.get(c_str, "")).strip()
                if not raw_codes:
                    continue
                # Split on comma/pipe/space; allow "H430 H3068" too
                parts = re.split(r'[,\|;]\s*', raw_codes)
                if len(parts) == 1:
                    parts = re.findall(r'[HG]\d{1,5}', raw_codes, flags=re.I) or parts
                codes = [p.strip().upper() for p in parts if p.strip()]
                if not codes:
                    continue

                mapping[(slug, ch, v)].extend(codes)
            except Exception:
                continue

    # Dedup & sort
    for k, codes in list(mapping.items()):
        mapping[k] = sort_codes(codes)
    return mapping

def load_chapter_json(path: Path):
    """Return (data, verses_list, wrapped_bool) where data is the root JSON object or list."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[error] read {path}: {e}")
        return None, None, False

    if isinstance(data, list):
        return data, data, False
    if isinstance(data, dict) and isinstance(data.get("verses"), list):
        return data, data["verses"], True
    print(f"[warn] {path} is not a chapter file (expected list or {{'verses':[]}})")
    return None, None, False

def write_chapter_json(path: Path, root, verses, wrapped: bool):
    try:
        if wrapped:
            out = root
        else:
            out = verses
        path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        return True
    except Exception as e:
        print(f"[error] write {path}: {e}")
        return False

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True, help="Path to kjv_strongs.csv")
    ap.add_argument("--root", required=True, help="Canon root (e.g., data/newtestament, data/tanakh, data/apocrypha)")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--inplace", action="store_true")
    ap.add_argument("--validate", action="store_true", help="Only keep codes present in Strong's JSONs")
    ap.add_argument("--he", default="data/lexicon/strongs-hebrew.json")
    ap.add_argument("--gr", default="data/lexicon/strongs-greek.json")
    args = ap.parse_args()

    csv_path = Path(args.csv)
    root = Path(args.root)
    if not csv_path.exists():
        print(f"[fatal] CSV not found: {csv_path}"); sys.exit(1)
    if not root.exists():
        print(f"[fatal] root not found: {root}"); sys.exit(1)

    print(f"[*] Loading mapping from {csv_path} …")
    mapping = load_csv_map(csv_path)
    print(f"    {len(mapping)} verse keys with Strong's codes")

    valid_codes = None
    if args.validate:
        valid_codes = read_strongs_lexicons(Path(args.he), Path(args.gr))
        print(f"[*] Validation enabled — {len(valid_codes)} codes loaded from lexicons")

    changed_files = 0
    total_injected = 0
    total_verses = 0

    # Iterate book folders under root
    for book_dir in sorted([p for p in root.glob("*") if p.is_dir()]):
        slug = book_dir.name
        # quick reverse lookup: ensure slug is in mapping keys at least once
        # (skip empty dirs)
        # But we can still scan all chapters; it's fine.

        for ch_json in sorted(book_dir.glob("*.json"), key=lambda p: int(p.stem) if p.stem.isdigit() else 0):
            try:
                ch_num = int(ch_json.stem)
            except:
                continue

            root_obj, verses, wrapped = load_chapter_json(ch_json)
            if verses is None: 
                continue

            file_changed = False
            for vobj in verses:
                if not isinstance(vobj, dict): 
                    continue
                vnum = vobj.get("v")
                if not isinstance(vnum, int): 
                    continue
                total_verses += 1

                key = (slug, ch_num, vnum)
                codes = mapping.get(key, [])
                if not codes:
                    continue

                if valid_codes is not None:
                    codes = [c for c in codes if c.upper() in valid_codes]

                codes = sort_codes(codes)
                cur = vobj.get("s") or []
                cur_sorted = sort_codes(cur)

                if cur_sorted != codes:
                    vobj["s"] = codes
                    file_changed = True
                    total_injected += len(codes)

            if file_changed:
                changed_files += 1
                if args.dry_run:
                    print(f"[dry] {ch_json}  (updated)")
                elif args.inplace:
                    ok = write_chapter_json(ch_json, root_obj, verses, wrapped)
                    if ok:
                        print(f"[ok]  {ch_json}  (written)")
                    else:
                        print(f"[err] {ch_json}  (write failed)")

    print(f"\nDone. Files changed: {changed_files}, verses scanned: {total_verses}, codes injected (latest state count): {total_injected}")
    if not args.inplace and not args.dry_run:
        print("\nNo action performed. Use --dry-run to preview, or --inplace to write.")

if __name__ == "__main__":
    main()
