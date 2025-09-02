#!/usr/bin/env python3
"""
Import Treasury-of-Scripture-Knowledge–style cross references for GENESIS,
normalize them, and merge into tools/genesis_xrefs.json (your mapping that
update_genesis_xrefs.py consumes).

Input CSV expected at tools/tsk/genesis.csv with columns:
  ref, xrefs
Where:
  - ref   = a Genesis reference like "Gen 1:1" or "Genesis 1:1" or "Gen.1.1"
  - xrefs = semicolon/pipe/comma-separated list of refs (any OSIS-ish forms OK)

Example row:
  Gen 1:1,"John 1:1; Heb 11:3; Col 1:16"

Run:
  python3 tools/import_tsk_genesis.py
Then merge into chapter JSONs:
  python3 tools/update_genesis_xrefs.py
"""
import csv, json, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SRC_CSV = REPO / "tools" / "tsk" / "genesis.csv"
OUT_JSON = REPO / "tools" / "genesis_xrefs.json"

# --- Canonical book map (same as in your updater; abridged to keep size) ---
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
  "gen":"Genesis","ge":"Genesis","gn":"Genesis","genesis":"Genesis","gen.":"Genesis",
  "ex":"Exodus","exo":"Exodus","exod":"Exodus","exodus":"Exodus","ex.":"Exodus",
  "lev":"Leviticus","le":"Leviticus","lv":"Leviticus","leviticus":"Leviticus","lev.":"Leviticus",
  "num":"Numbers","nu":"Numbers","nm":"Numbers","numbers":"Numbers","num.":"Numbers",
  "deut":"Deuteronomy","dt":"Deuteronomy","de":"Deuteronomy","deuteronomy":"Deuteronomy","deut.":"Deuteronomy",
  "ps":"Psalms","psa":"Psalms","psalm":"Psalms","psalms":"Psalms","ps.":"Psalms","psa.":"Psalms",
  "prov":"Proverbs","proverbs":"Proverbs","prov.":"Proverbs","pr":"Proverbs",
  "eccl":"Ecclesiastes","ecclesiastes":"Ecclesiastes","eccl.":"Ecclesiastes",
  "song":"Song of Solomon","song of songs":"Song of Solomon","song of solomon":"Song of Solomon","sos":"Song of Solomon",
  "isa":"Isaiah","isaiah":"Isaiah","isa.":"Isaiah","jer":"Jeremiah","jeremiah":"Jeremiah","jer.":"Jeremiah",
  "heb":"Hebrews","hebrews":"Hebrews","heb.":"Hebrews","col":"Colossians","colossians":"Colossians","col.":"Colossians",
  "jn":"John","jhn":"John","john":"John","jn.":"John","mt":"Matthew","matt":"Matthew","matthew":"Matthew","mt.":"Matthew",
  "1co":"1 Corinthians","1 cor":"1 Corinthians","i cor":"1 Corinthians","1corinthians":"1 Corinthians","1 corinthians":"1 Corinthians",
  "2co":"2 Corinthians","2 cor":"2 Corinthians","ii cor":"2 Corinthians","2corinthians":"2 Corinthians","2 corinthians":"2 Corinthians",
  "1jn":"1 John","1 john":"1 John","i john":"1 John","1john":"1 John",
  "2jn":"2 John","2 john":"2 John","ii john":"2 John","2john":"2 John",
  "3jn":"3 John","3 john":"3 John","iii john":"3 John","3john":"3 John",
  "rev":"Revelation","revelation":"Revelation","rev.":"Revelation"
})

REF_PATTERNS = [
    re.compile(r"""^\s*(?P<book>(?:[1-3]\s*)?[A-Za-z\. ]+?)\s*[.,]?\s*(?P<ch>\d+)\s*[:.\s]\s*(?P<vs>\d+)\s*$""")
]

def normalize_book(raw: str):
    s = raw.strip().lower()
    s = re.sub(r'^([1-3])\s*([a-z])', r'\1 \2', s)
    s = re.sub(r'\s+', ' ', s).replace('.', '')
    return ALIASES.get(s)

def normalize_ref(ref: str):
    if not ref or not str(ref).strip():
        return None
    s = str(ref).strip().replace('–','-').replace('—','-').replace('·','.')
    for pat in REF_PATTERNS:
        m = pat.match(s)
        if not m: 
            continue
        book = normalize_book(m.group("book"))
        ch, vs = m.group("ch"), m.group("vs")
        if not book: 
            return None
        try:
            ci = int(ch); vi = int(vs)
            if ci <= 0 or vi <= 0: 
                return None
        except:
            return None
        return f"{book} {ci}:{vi}"
    return None

def parse_key(gen_ref: str):
    """Return 'chapter:verse' key for Genesis refs only; else None."""
    n = normalize_ref(gen_ref)
    if not n: 
        return None
    if not n.startswith("Genesis "):
        return None
    # n == "Genesis C:V"
    _, cv = n.split(" ", 1)
    return cv.replace(":", ":")

def load_existing_map(path: Path):
    if path.exists():
        try:
            with path.open("r", encoding="utf-8") as f:
                raw = json.load(f)
            # ensure list values
            return {str(k): list(dict.fromkeys(v)) for k, v in raw.items()}
        except:
            pass
    return {}

def main():
    if not SRC_CSV.exists():
        print(f"Missing input CSV: {SRC_CSV}", file=sys.stderr)
        sys.exit(1)

    existing = load_existing_map(OUT_JSON)
    merged = {**existing}  # shallow copy

    invalid_source_rows = 0
    added_refs = 0

    with SRC_CSV.open("r", encoding="utf-8") as f:
        rdr = csv.DictReader(f)
        if "ref" not in rdr.fieldnames or "xrefs" not in rdr.fieldnames:
            print("CSV must have headers: ref,xrefs", file=sys.stderr)
            sys.exit(1)
        for row in rdr:
            key = parse_key(row["ref"])
            if not key:
                invalid_source_rows += 1
                continue
            # split xrefs on ; | , and normalize
            raw_list = re.split(r"[;|,]", row["xrefs"] or "")
            norm = []
            for r in raw_list:
                n = normalize_ref(r)
                if n:
                    norm.append(n)
            if not norm:
                continue
            dest = merged.setdefault(key, [])
            # dedupe while preserving prior + new order
            seen = set(map(str.strip, dest))
            for n in norm:
                if n not in seen:
                    dest.append(n)
                    seen.add(n)
                    added_refs += 1

    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Done. Added {added_refs} cross-ref(s). Ignored {invalid_source_rows} non-Genesis or invalid row(s).")
    print(f"Wrote: {OUT_JSON}")

if __name__ == "__main__":
    main()
