#!/usr/bin/env python3
"""
Generic TSK CSV importer.

Usage:
  python3 tools/import_tsk.py --canon tanakh --book exodus
Inputs:
  tools/tsk/<book>.csv   with headers: ref,xrefs
Output (merged map for updater):
  tools/<book>_xrefs.json

Then run the (book-agnostic) updater:
  python3 tools/update_xrefs.py --canon tanakh --book exodus
"""
import csv, json, re, sys, argparse
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
TSK_DIR = REPO / "tools" / "tsk"

BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians",
  "Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy",
  "Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
]
ALIASES = {b.lower(): b for b in BOOKS}
ALIASES.update({
  "gen":"Genesis","ex":"Exodus","lev":"Leviticus","num":"Numbers","deut":"Deuteronomy",
  "jos":"Joshua","judg":"Judges","ru":"Ruth",
  "ps":"Psalms","psa":"Psalms","pr":"Proverbs","prov":"Proverbs","eccl":"Ecclesiastes",
  "song":"Song of Solomon","sos":"Song of Solomon","isa":"Isaiah","jer":"Jeremiah","lam":"Lamentations",
  "ezek":"Ezekiel","dan":"Daniel","hos":"Hosea","obad":"Obadiah","jon":"Jonah","mic":"Micah",
  "nah":"Nahum","hab":"Habakkuk","zeph":"Zephaniah","hag":"Haggai","zech":"Zechariah","mal":"Malachi",
  "mt":"Matthew","mk":"Mark","lk":"Luke","jn":"John","ac":"Acts","rom":"Romans","col":"Colossians",
  "heb":"Hebrews","rev":"Revelation",
  "1co":"1 Corinthians","2co":"2 Corinthians","1th":"1 Thessalonians","2th":"2 Thessalonians",
  "1ti":"1 Timothy","2ti":"2 Timothy","1pe":"1 Peter","2pe":"2 Peter","1jn":"1 John","2jn":"2 John","3jn":"3 John"
})

REF_PAT = re.compile(r"""^\s*(?P<book>(?:[1-3]\s*)?[A-Za-z\. ]+?)\s*[.,]?\s*(?P<ch>\d+)\s*[:.\s]\s*(?P<vs>\d+)\s*$""")

def norm_book(raw: str):
    s = raw.strip().lower()
    s = re.sub(r'^([1-3])\s*([a-z])', r'\1 \2', s)
    s = re.sub(r'\s+', ' ', s).replace('.', '')
    return ALIASES.get(s)

def norm_ref(ref: str):
    if not ref or not str(ref).strip(): return None
    s = str(ref).strip().replace('–','-').replace('—','-').replace('·','.')
    m = REF_PAT.match(s)
    if not m: return None
    book = norm_book(m.group("book")); ch = m.group("ch"); vs = m.group("vs")
    if not book: return None
    try:
        ci, vi = int(ch), int(vs)
        if ci <= 0 or vi <= 0: return None
    except: return None
    return f"{book} {ci}:{vi}"

def parse_key_for(book_canon: str, this_book_canon: str, ref: str):
    n = norm_ref(ref)
    if not n: return None
    if not n.startswith(this_book_canon + " "): return None
    return n.split(" ",1)[1]  # "C:V"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--canon", default="tanakh", help="tanakh | newtestament")
    ap.add_argument("--book", required=True, help="book slug, e.g. exodus")
    args = ap.parse_args()

    book_slug = args.book.lower()
    # recover canonical name from slug (simple mapping)
    canonical = book_slug.replace("-", " ").title()
    # special cases that title() mangles
    canonical = {
        "1 samuel":"1 Samuel","2 samuel":"2 Samuel","1 kings":"1 Kings","2 kings":"2 Kings",
        "1 chronicles":"1 Chronicles","2 chronicles":"2 Chronicles","song Of Solomon":"Song of Solomon",
        "1 corinthians":"1 Corinthians","2 corinthians":"2 Corinthians","1 thessalonians":"1 Thessalonians",
        "2 thessalonians":"2 Thessalonians","1 timothy":"1 Timothy","2 timothy":"2 Timothy",
        "1 peter":"1 Peter","2 peter":"2 Peter","1 john":"1 John","2 john":"2 John","3 john":"3 John"
    }.get(canonical, canonical)

    if canonical not in BOOKS:
        print(f"Unknown/unsupported book: {args.book}", file=sys.stderr)
        sys.exit(1)

    src_csv  = TSK_DIR / f"{book_slug}.csv"
    out_json = REPO / "tools" / f"{book_slug}_xrefs.json"

    if not src_csv.exists():
        print(f"Missing CSV: {src_csv}", file=sys.stderr)
        sys.exit(1)

    # load existing map (if any)
    existing = {}
    if out_json.exists():
        try:
            with out_json.open("r", encoding="utf-8") as f:
                existing = {str(k): list(dict.fromkeys(v)) for k,v in json.load(f).items()}
        except: existing = {}

    merged = {**existing}
    added = 0
    bad = 0

    with src_csv.open("r", encoding="utf-8") as f:
        rdr = csv.DictReader(f)
        if "ref" not in rdr.fieldnames or "xrefs" not in rdr.fieldnames:
            print("CSV must have headers: ref,xrefs", file=sys.stderr)
            sys.exit(1)
        for row in rdr:
            key = parse_key_for(args.canon, canonical, row["ref"])
            if not key:
                bad += 1
                continue
            items = re.split(r"[;|,]", row.get("xrefs") or "")
            normed = []
            for r in items:
                nr = norm_ref(r)
                if nr:
                    normed.append(nr)
            if not normed:
                continue
            dest = merged.setdefault(key, [])
            seen = set(map(str.strip, dest))
            for n in normed:
                if n not in seen:
                    dest.append(n); seen.add(n); added += 1

    with out_json.open("w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2); f.write("\n")

    print(f"Done. Book={canonical}. Added {added} refs; {bad} source rows were not for this book or invalid.")
    print(f"Wrote: {out_json}")

if __name__ == "__main__":
    main()
