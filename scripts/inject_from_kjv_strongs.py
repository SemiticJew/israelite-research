#!/usr/bin/env python3
import csv, json, re, argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# -------- Strong's patterns (Greek + Hebrew) --------
P_GH_BARE  = re.compile(r'\b([GH])(\d{1,5})\b')            # G5055 / H0430 / H430
P_ATTR     = re.compile(r'data-strongs="([GH]\d{1,5})"')    # data-strongs="G5055"
P_BRACKETS = re.compile(r'\[([GH]\d{1,5})\]')               # [G5055]
P_PARENS   = re.compile(r'\(([GH]\d{1,5})\)')               # (H0430)

# -------- Canon + slug map (book name -> (canon, slug)) --------
BOOK_MAP: Dict[str, Tuple[str, str]] = {
    # Tanakh (OT)
    "genesis": ("tanakh","genesis"),
    "exodus": ("tanakh","exodus"),
    "leviticus": ("tanakh","leviticus"),
    "numbers": ("tanakh","numbers"),
    "deuteronomy": ("tanakh","deuteronomy"),
    "joshua": ("tanakh","joshua"),
    "judges": ("tanakh","judges"),
    "ruth": ("tanakh","ruth"),
    "1 samuel": ("tanakh","1-samuel"), "i samuel": ("tanakh","1-samuel"),
    "2 samuel": ("tanakh","2-samuel"), "ii samuel": ("tanakh","2-samuel"),
    "1 kings": ("tanakh","1-kings"),   "i kings": ("tanakh","1-kings"),
    "2 kings": ("tanakh","2-kings"),   "ii kings": ("tanakh","2-kings"),
    "1 chronicles": ("tanakh","1-chronicles"), "i chronicles": ("tanakh","1-chronicles"),
    "2 chronicles": ("tanakh","2-chronicles"), "ii chronicles": ("tanakh","2-chronicles"),
    "ezra": ("tanakh","ezra"),
    "nehemiah": ("tanakh","nehemiah"),
    "esther": ("tanakh","esther"),
    "job": ("tanakh","job"),
    "psalms": ("tanakh","psalms"), "psalm": ("tanakh","psalms"),
    "proverbs": ("tanakh","proverbs"),
    "ecclesiastes": ("tanakh","ecclesiastes"),
    "song of solomon": ("tanakh","song-of-solomon"),
    "song of songs": ("tanakh","song-of-songs"),
    "isaiah": ("tanakh","isaiah"),
    "jeremiah": ("tanakh","jeremiah"),
    "lamentations": ("tanakh","lamentations"),
    "ezekiel": ("tanakh","ezekiel"),
    "daniel": ("tanakh","daniel"),
    "hosea": ("tanakh","hosea"),
    "joel": ("tanakh","joel"),
    "amos": ("tanakh","amos"),
    "obadiah": ("tanakh","obadiah"),
    "jonah": ("tanakh","jonah"),
    "micah": ("tanakh","micah"),
    "nahum": ("tanakh","nahum"),
    "habakkuk": ("tanakh","habakkuk"),
    "zephaniah": ("tanakh","zephaniah"),
    "haggai": ("tanakh","haggai"),
    "zechariah": ("tanakh","zechariah"),
    "malachi": ("tanakh","malachi"),
    # New Testament (NT)
    "matthew": ("newtestament","matthew"),
    "mark": ("newtestament","mark"),
    "luke": ("newtestament","luke"),
    "john": ("newtestament","john"),
    "acts": ("newtestament","acts"),
    "romans": ("newtestament","romans"),
    "1 corinthians": ("newtestament","1-corinthians"), "i corinthians": ("newtestament","1-corinthians"),
    "2 corinthians": ("newtestament","2-corinthians"), "ii corinthians": ("newtestament","2-corinthians"),
    "galatians": ("newtestament","galatians"),
    "ephesians": ("newtestament","ephesians"),
    "philippians": ("newtestament","philippians"),
    "colossians": ("newtestament","colossians"),
    "1 thessalonians": ("newtestament","1-thessalonians"), "i thessalonians": ("newtestament","1-thessalonians"),
    "2 thessalonians": ("newtestament","2-thessalonians"), "ii thessalonians": ("newtestament","2-thessalonians"),
    "1 timothy": ("newtestament","1-timothy"), "i timothy": ("newtestament","1-timothy"),
    "2 timothy": ("newtestament","2-timothy"), "ii timothy": ("newtestament","2-timothy"),
    "titus": ("newtestament","titus"),
    "philemon": ("newtestament","philemon"),
    "hebrews": ("newtestament","hebrews"),
    "james": ("newtestament","james"),
    "1 peter": ("newtestament","1-peter"), "i peter": ("newtestament","1-peter"),
    "2 peter": ("newtestament","2-peter"), "ii peter": ("newtestament","2-peter"),
    "1 john": ("newtestament","1-john"), "i john": ("newtestament","1-john"),
    "2 john": ("newtestament","2-john"), "ii john": ("newtestament","2-john"),
    "3 john": ("newtestament","3-john"), "iii john": ("newtestament","3-john"),
    "jude": ("newtestament","jude"),
    "revelation": ("newtestament","revelation"),
}

def norm_book(name: str) -> str:
    s = (name or "").strip().lower()
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'^(1st|first)\s+', '1 ', s)
    s = re.sub(r'^(2nd|second)\s+', '2 ', s)
    s = re.sub(r'^(3rd|third)\s+', '3 ', s)
    return s

def extract_codes(text: str) -> List[str]:
    codes = set()
    if not text:
        return []
    for kind, num in P_GH_BARE.findall(text):
        try:
            codes.add(f"{kind.upper()}{int(num)}")
        except ValueError:
            pass
    for pat in (P_ATTR, P_BRACKETS, P_PARENS):
        for c in pat.findall(text):
            try:
                kind = c[0].upper()
                num  = int(c[1:])
                codes.add(f"{kind}{num}")
            except Exception:
                pass
    return sorted(codes, key=lambda x: (x[0], int(x[1:])))

def load_chapter_json(path: Path) -> List[dict]:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[warn] could not read {path}: {e}")
        return []

def save_chapter_json(path: Path, verses: List[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(verses, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

def upsert_verse(verses: List[dict], vnum: int, new_text: Optional[str], new_codes: List[str], force_text: bool):
    changed = False
    added   = 0
    target = None
    for d in verses:
        if isinstance(d, dict) and d.get("v") == vnum:
            target = d
            break
    if target is None:
        target = {"v": vnum, "t": new_text or "", "c": [], "s": []}
        verses.append(target)
        changed = True

    existing_text = target.get("t") or ""
    if force_text or not existing_text.strip():
        if (new_text or "") != existing_text:
            target["t"] = new_text or ""
            changed = True

    if new_codes:
        exist = sorted({str(c).upper() for c in target.get("s", [])})
        merged = sorted({*exist, *[c.upper() for c in new_codes]}, key=lambda x: (x[0], int(x[1:])))
        if merged != exist:
            target["s"] = merged
            changed = True
            added = max(0, len(merged) - len(exist))

    return changed, added

def main():
    ap = argparse.ArgumentParser(description="Inject KJV text + Strong's codes into Tanakh/NT JSON from kjv_strongs.csv")
    ap.add_argument("--csv", required=True, help="Path to kjv_strongs.csv")
    ap.add_argument("--data-root", default="data", help="Root data folder (default: data)")
    ap.add_argument("--force-text", action="store_true", default=True,
                    help="Always overwrite verse text from CSV (default True).")
    ap.add_argument("--no-force-text", dest="force_text", action="store_false",
                    help="Do not overwrite existing text if present.")
    ap.add_argument("--inplace", action="store_true", help="Write changes to disk")
    ap.add_argument("--dry-run", action="store_true", help="Show changes, do not write")
    ap.add_argument("--only-book", help='Limit to one book (e.g., "Matthew", "1 Samuel", "II Kings")')
    args = ap.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[error] CSV not found: {csv_path}")
        return
    data_root = Path(args.data_root)

    files_scanned = 0
    verses_seen = 0
    verses_changed = 0
    codes_added_total = 0

    cache: Dict[Tuple[str,str,int], List[dict]] = {}
    touched: Dict[Tuple[str,str,int], bool] = {}

    # --- CSV open with utf-8-sig to strip BOM; build safe keymap ---
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        # Build a normalized header map: "book name" -> original header key
        keymap: Dict[str, str] = {}
        if reader.fieldnames:
            for k in reader.fieldnames:
                if k is None:
                    continue
                nk = k.strip().lower()
                if nk and nk not in keymap:
                    keymap[nk] = k

        def get(row: dict, key: str) -> str:
            # tolerant lookup by normalized header name
            nk = key.strip().lower()
            korig = keymap.get(nk)
            if korig is None:
                return ""
            val = row.get(korig)
            return "" if val is None else str(val)

        only_book_norm = norm_book(args.only_book) if args.only_book else None

        for row in reader:
            book_name = get(row, "Book Name") or get(row, "Book")
            chap      = get(row, "Chapter")
            verse     = get(row, "Verse")
            text      = get(row, "Text")

            if not book_name or not chap or not verse:
                continue

            book_key = norm_book(book_name)
            if only_book_norm and book_key != only_book_norm:
                continue

            meta = BOOK_MAP.get(book_key)
            if not meta:
                book_key2 = re.sub(r'^(i{1,3})\s+', lambda m: str(len(m.group(1))) + ' ', book_key)
                meta = BOOK_MAP.get(book_key2)
            if not meta:
                print(f"[warn] unmapped book: '{book_name}'")
                continue

            canon, slug = meta
            try:
                ch = int(chap)
                vs = int(verse)
            except ValueError:
                continue

            ch_path = data_root / canon / slug / f"{ch}.json"
            key = (canon, slug, ch)
            if key not in cache:
                cache[key] = load_chapter_json(ch_path)
                files_scanned += 1
                touched[key] = False

            codes = extract_codes(text)
            changed, added = upsert_verse(cache[key], vs, text, codes, force_text=args.force_text)
            verses_seen += 1
            if changed:
                verses_changed += 1
                codes_added_total += added
                touched[key] = True
                print(f"[update] {slug} {ch}:{vs}  +{added} codes{'  (text overwritten)' if args.force_text else ''}")

    if args.inplace and not args.dry_run:
        for (canon, slug, ch), verses in cache.items():
            if not touched.get((canon, slug, ch)):
                continue
            out = data_root / canon / slug / f"{ch}.json"
            save_chapter_json(out, verses)

    print("\n=== KJV + Strong's Injection Summary ===")
    print(f"Files scanned:    {files_scanned}")
    print(f"Verses inspected: {verses_seen}")
    print(f"Verses updated:   {verses_changed}")
    print(f"Codes added:      {codes_added_total}")
    if not args.inplace or args.dry_run:
        print("\n(No files were modified. Use --inplace to write changes.)")

if __name__ == "__main__":
    main()
