#!/usr/bin/env python3
"""
inject_strongs_from_csv.py
Map KJV-with-Strong's CSV rows to your canon chapter JSONs and inject codes into verses[].s.

Your CSV format (example):
HEADER: "Verse ID","Book Name","Book Number",Chapter,Verse,Text
DATA:   1,Genesis,1,1,1,"In the beginning{H7225} God{H430} created{H1254}{(H8804)}{H853} ..."

This script:
  - Reads Book Name / Chapter / Verse / Text
  - Extracts H####/G#### codes from {…} and {(…)}
  - Maps Book Name -> your folder slug (e.g., "1 Samuel" -> "1-samuel")
  - Writes unique/sorted codes to verses[].s in /data/<canon>/<book>/<chapter>.json
  - Works with chapter JSON shaped as { "total": N, "verses": [...] } or a bare list
  - Optional --validate filters codes by your lexicon JSONs

Usage:
  python3 tools/inject_strongs_from_csv.py --csv data/lexicon/kjv_strongs.csv --root data/tanakh --dry-run
  python3 tools/inject_strongs_from_csv.py --csv data/lexicon/kjv_strongs.csv --root data/newtestament --inplace --validate \
      --he data/lexicon/strongs-hebrew.json --gr data/lexicon/strongs-greek.json
"""

import csv, json, re, sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

# -------- Book name -> folder slug mapping --------
KJV_BOOK_TO_SLUG = {
    # Pentateuch
    "genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numbers":"numbers","deuteronomy":"deuteronomy",
    # History (OT)
    "joshua":"joshua","judges":"judges","ruth":"ruth",
    "1 samuel":"1-samuel","2 samuel":"2-samuel","1 kings":"1-kings","2 kings":"2-kings",
    "1 chronicles":"1-chronicles","2 chronicles":"2-chronicles","ezra":"ezra","nehemiah":"nehemiah","esther":"esther",
    # Poetry/Wisdom
    "job":"job","psalms":"psalms","psalm":"psalms","proverbs":"proverbs","ecclesiastes":"ecclesiastes",
    "song of solomon":"song-of-solomon","song of songs":"song-of-solomon","canticles":"song-of-solomon",
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
    # Apocrypha (adjust if your folders differ)
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
    # allow punctuation differences
    key2 = re.sub(r'[^\w\s-]', '', key)
    return KJV_BOOK_TO_SLUG.get(key2)

# -------- Code extraction & sorting --------
def split_codes(raw: str) -> List[str]:
    """
    Extract Strong's codes from text (handles {H7225}, {(H8804)}, H430, G3056, etc.)
    """
    if not raw:
        return []
    found = re.findall(r'[HG]\d{1,5}', raw, flags=re.I)
    return [f.upper() for f in found]

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
    except Exception:
        pass
    try:
        gr = json.loads(gr_path.read_text(encoding="utf-8"))
        ok.update(k.upper() for k in gr.keys())
    except Exception:
        pass
    return ok

# -------- CSV loader (your exact header) --------
def load_csv_map(csv_path: Path) -> Dict[Tuple[str,int,int], List[str]]:
    """
    Build (book_slug, chapter, verse) -> codes[] from your CSV:
    HEADER: "Verse ID","Book Name","Book Number",Chapter,Verse,Text
    Strong's codes are embedded in Text like {...} or {(H####)}.
    """
    raw = csv_path.read_text(encoding="utf-8-sig")

    from io import StringIO
    f = StringIO(raw)
    reader = csv.DictReader(f)

    # Normalize fieldnames (strip quotes/case)
    def norm(h): return (h or "").strip().strip('"').lower()
    headers = [norm(h) for h in (reader.fieldnames or [])]
    # Map back original keys for DictReader usage
    cols = {norm(h): h for h in (reader.fieldnames or [])}

    def col(*names):
        for n in names:
            if n in cols: return cols[n]
        # try forgiving match (in case quoting/spacing varies)
        for k,v in cols.items():
            if k.replace(" ", "") == n.replace(" ", ""):
                return v
        return None

    c_book = col("book name","book","bookname")
    c_ch   = col("chapter","chap","ch")
    c_v    = col("verse","v","vs","verse_num","versenum")
    c_txt  = col("text","line","content")

    if not (c_book and c_ch and c_v and c_txt):
        print("[fatal] Could not find Book Name / Chapter / Verse / Text columns in CSV.")
        return {}

    mapping: Dict[Tuple[str,int,int], List[str]] = defaultdict(list)

    for row in reader:
        try:
            book_name = str(row[c_book]).strip()
            slug = book_to_slug(book_name)
            if not slug:
                continue
            ch = int(str(row[c_ch]).strip())
            v  = int(str(row[c_v]).strip())
            text = str(row[c_txt] or "")

            codes = split_codes(text)
            if not codes:
                continue

            mapping[(slug, ch, v)].extend(codes)
        except Exception:
            # skip malformed rows
            continue

    # Dedup & sort per verse
    for k in list(mapping.keys()):
        mapping[k] = sort_codes(mapping[k])
    return mapping

# -------- Chapter JSON helpers --------
def load_chapter_json(path: Path):
    """Return (root, verses_list, wrapped_bool)."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[error] read {path}: {e}")
        return None, None, False

    if isinstance(data, list):
        return data, data, False
    if isinstance(data, dict) and isinstance(data.get("verses"), list):
        return data, data["verses"], True
    print(f"[warn] {path} not a chapter (expected list or object with 'verses').")
    return None, None, False

def write_chapter_json(path: Path, root, verses, wrapped: bool) -> bool:
    try:
        out = root if wrapped else verses
        path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        return True
    except Exception as e:
        print(f"[error] write {path}: {e}")
        return False

# -------- Main --------
def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True, help="Path to KJV Strong's CSV")
    ap.add_argument("--root", required=True, help="Canon root: data/tanakh | data/newtestament | data/apocrypha")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--inplace", action="store_true")
    ap.add_argument("--validate", action="store_true", help="Keep only codes present in Strong's lexicons")
    ap.add_argument("--he", default="data/lexicon/strongs-hebrew.json")
    ap.add_argument("--gr", default="data/lexicon/strongs-greek.json")
    args = ap.parse_args()

    csv_path = Path(args.csv)
    root = Path(args.root)
    if not csv_path.exists(): print(f"[fatal] CSV not found: {csv_path}"); sys.exit(1)
    if not root.exists(): print(f"[fatal] root not found: {root}"); sys.exit(1)

    print(f"[*] Reading CSV: {csv_path}")
    mapping = load_csv_map(csv_path)
    print(f"    verses with codes in CSV: {len(mapping)}")

    valid = None
    if args.validate:
        valid = read_strongs_lexicons(Path(args.he), Path(args.gr))
        print(f"[*] Validation on — {len(valid)} codes loaded from lexicons")

    changed_files = 0
    total_verses = 0
    injected_total = 0

    # Iterate book folders
    for book_dir in sorted([p for p in root.glob("*") if p.is_dir()]):
        slug = book_dir.name
        for ch_path in sorted(book_dir.glob("*.json"), key=lambda p: int(p.stem) if p.stem.isdigit() else 0):
            try:
                ch = int(ch_path.stem)
            except:
                continue

            root_obj, verses, wrapped = load_chapter_json(ch_path)
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

                codes = mapping.get((slug, ch, vnum), [])
                if not codes:
                    continue

                if valid is not None:
                    codes = [c for c in codes if c.upper() in valid]

                codes = sort_codes(codes)
                cur = vobj.get("s") or []
                cur_sorted = sort_codes(cur)
                if cur_sorted != codes:
                    vobj["s"] = codes
                    file_changed = True
                    injected_total += len(codes)

            if file_changed:
                changed_files += 1
                if args.dry_run:
                    print(f"[dry] {ch_path}  (updated)")
                elif args.inplace:
                    if write_chapter_json(ch_path, root_obj, verses, wrapped):
                        print(f"[ok]  {ch_path}  (written)")
                    else:
                        print(f"[err] {ch_path}  (write failed)")

    print(f"\nDone. Files changed: {changed_files}, verses scanned: {total_verses}, codes injected: {injected_total}")
    if not args.dry_run and not args.inplace:
        print("No changes written. Use --dry-run to preview or --inplace to write.")

if __name__ == "__main__":
    main()
