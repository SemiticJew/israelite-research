#!/usr/bin/env python3
import json, csv, sys, shutil, time, re
from pathlib import Path

# CONFIG — adjust if your repo root differs
REPO_ROOT   = Path(__file__).resolve().parents[1]
GENESIS_DIR = REPO_ROOT / "data" / "tanakh" / "genesis"
MAP_JSON    = REPO_ROOT / "tools" / "genesis_xrefs.json"
MAP_CSV     = REPO_ROOT / "tools" / "genesis_xrefs.csv"
REPORT_DIR  = REPO_ROOT / "tools" / "reports"

# Canonical book names (KJV style) and common aliases/abbreviations
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

# Map of lowercased alias -> canonical name
ALIASES = {
  # Torah
  "gen":"Genesis","ge":"Genesis","gn":"Genesis","genesis":"Genesis","gen.":"Genesis",
  "ex":"Exodus","exo":"Exodus","exod":"Exodus","exodus":"Exodus","ex.":"Exodus",
  "lev":"Leviticus","le":"Leviticus","lv":"Leviticus","leviticus":"Leviticus","lev.":"Leviticus",
  "num":"Numbers","nu":"Numbers","nm":"Numbers","numbers":"Numbers","num.":"Numbers",
  "deut":"Deuteronomy","dt":"Deuteronomy","de":"Deuteronomy","deuteronomy":"Deuteronomy","deut.":"Deuteronomy",
  # Hist / Poetry (a few useful ones)
  "jos":"Joshua","josh":"Joshua","joshua":"Joshua","jos.":"Joshua",
  "jdg":"Judges","judg":"Judges","judges":"Judges","judg.":"Judges",
  "ru":"Ruth","rut":"Ruth","ruth":"Ruth","ruth.":"Ruth",
  "1sa":"1 Samuel","1sam":"1 Samuel","1 sam":"1 Samuel","i sam":"1 Samuel","1samuel":"1 Samuel","1 samuel":"1 Samuel","1sa.":"1 Samuel",
  "2sa":"2 Samuel","2sam":"2 Samuel","2 sam":"2 Samuel","ii sam":"2 Samuel","2samuel":"2 Samuel","2 samuel":"2 Samuel","2sa.":"2 Samuel",
  "1ki":"1 Kings","1kings":"1 Kings","1 kings":"1 Kings","i ki":"1 Kings","1ki.":"1 Kings",
  "2ki":"2 Kings","2kings":"2 Kings","2 kings":"2 Kings","ii ki":"2 Kings","2ki.":"2 Kings",
  "1ch":"1 Chronicles","1chronicles":"1 Chronicles","1 chronicles":"1 Chronicles","1ch.":"1 Chronicles",
  "2ch":"2 Chronicles","2chronicles":"2 Chronicles","2 chronicles":"2 Chronicles","2ch.":"2 Chronicles",
  "ezr":"Ezra","ezra":"Ezra","ezr.":"Ezra",
  "neh":"Nehemiah","nehemiah":"Nehemiah","neh.":"Nehemiah",
  "est":"Esther","esther":"Esther","est.":"Esther",
  "job":"Job","job.":"Job",
  "ps":"Psalms","psa":"Psalms","psalm":"Psalms","psalms":"Psalms","ps.":"Psalms","psa.":"Psalms",
  "pr":"Proverbs","prov":"Proverbs","pro":"Proverbs","proverbs":"Proverbs","prov.":"Proverbs",
  "eccl":"Ecclesiastes","ecc":"Ecclesiastes","qoheleth":"Ecclesiastes","ecclesiastes":"Ecclesiastes","eccl.":"Ecclesiastes",
  "song":"Song of Solomon","song of solomon":"Song of Solomon","song of songs":"Song of Solomon","sos":"Song of Solomon","canticles":"Song of Solomon","song.":"Song of Solomon",
  "isa":"Isaiah","isaiah":"Isaiah","isa.":"Isaiah",
  "jer":"Jeremiah","jeremiah":"Jeremiah","jer.":"Jeremiah",
  "lam":"Lamentations","lamentations":"Lamentations","lam.":"Lamentations",
  "ezek":"Ezekiel","eze":"Ezekiel","ezekiel":"Ezekiel","ezek.":"Ezekiel",
  "dan":"Daniel","dn":"Daniel","daniel":"Daniel","dan.":"Daniel",
  "hos":"Hosea","hosea":"Hosea","hos.":"Hosea",
  "joel":"Joel","jl":"Joel","joel.":"Joel",
  "amos":"Amos","am":"Amos","amos.":"Amos",
  "obad":"Obadiah","ob":"Obadiah","obadiah":"Obadiah","obad.":"Obadiah",
  "jon":"Jonah","jnh":"Jonah","jonah":"Jonah","jon.":"Jonah",
  "mic":"Micah","micah":"Micah","mic.":"Micah",
  "nah":"Nahum","nahum":"Nahum","nah.":"Nahum",
  "hab":"Habakkuk","habakkuk":"Habakkuk","hab.":"Habakkuk",
  "zeph":"Zephaniah","zephaniah":"Zephaniah","zeph.":"Zephaniah",
  "hag":"Haggai","haggai":"Haggai","hag.":"Haggai",
  "zech":"Zechariah","zec":"Zechariah","zechariah":"Zechariah","zech.":"Zechariah",
  "mal":"Malachi","malachi":"Malachi","mal.":"Malachi",
  # NT (core)
  "mt":"Matthew","mat":"Matthew","matt":"Matthew","matthew":"Matthew","mt.":"Matthew",
  "mk":"Mark","mrk":"Mark","mark":"Mark","mk.":"Mark",
  "lk":"Luke","lu":"Luke","luke":"Luke","lk.":"Luke",
  "jn":"John","jhn":"John","john":"John","jn.":"John",
  "ac":"Acts","acts":"Acts","ac.":"Acts",
  "rom":"Romans","ro":"Romans","romans":"Romans","rom.":"Romans",
  "1co":"1 Corinthians","1 cor":"1 Corinthians","i cor":"1 Corinthians","1corinthians":"1 Corinthians","1 corinthians":"1 Corinthians","1co.":"1 Corinthians",
  "2co":"2 Corinthians","2 cor":"2 Corinthians","ii cor":"2 Corinthians","2corinthians":"2 Corinthians","2 corinthians":"2 Corinthians","2co.":"2 Corinthians",
  "gal":"Galatians","galatians":"Galatians","gal.":"Galatians",
  "eph":"Ephesians","ephesians":"Ephesians","eph.":"Ephesians",
  "php":"Philippians","phil":"Philippians","philippians":"Philippians","phil.":"Philippians","php.":"Philippians",
  "col":"Colossians","colossians":"Colossians","col.":"Colossians",
  "1th":"1 Thessalonians","1 thes":"1 Thessalonians","i thes":"1 Thessalonians","1thessalonians":"1 Thessalonians","1 thessalonians":"1 Thessalonians","1th.":"1 Thessalonians",
  "2th":"2 Thessalonians","2 thes":"2 Thessalonians","ii thes":"2 Thessalonians","2thessalonians":"2 Thessalonians","2 thessalonians":"2 Thessalonians","2th.":"2 Thessalonians",
  "1ti":"1 Timothy","1 tim":"1 Timothy","i tim":"1 Timothy","1timothy":"1 Timothy","1 timothy":"1 Timothy","1ti.":"1 Timothy",
  "2ti":"2 Timothy","2 tim":"2 Timothy","ii tim":"2 Timothy","2timothy":"2 Timothy","2 timothy":"2 Timothy","2ti.":"2 Timothy",
  "tit":"Titus","titus":"Titus","tit.":"Titus",
  "phm":"Philemon","philemon":"Philemon","phm.":"Philemon",
  "heb":"Hebrews","hebrews":"Hebrews","heb.":"Hebrews",
  "jas":"James","jam":"James","james":"James","jas.":"James",
  "1pe":"1 Peter","1 pet":"1 Peter","i pet":"1 Peter","1peter":"1 Peter","1 peter":"1 Peter","1pe.":"1 Peter",
  "2pe":"2 Peter","2 pet":"2 Peter","ii pet":"2 Peter","2peter":"2 Peter","2 peter":"2 Peter","2pe.":"2 Peter",
  "1jn":"1 John","1 john":"1 John","i john":"1 John","1john":"1 John","1jn.":"1 John",
  "2jn":"2 John","2 john":"2 John","ii john":"2 John","2john":"2 John","2jn.":"2 John",
  "3jn":"3 John","3 john":"3 John","iii john":"3 John","3john":"3 John","3jn.":"3 John",
  "jud":"Jude","jude":"Jude","jud.":"Jude",
  "rev":"Revelation","re":"Revelation","revelation":"Revelation","apocalypse":"Revelation","rev.":"Revelation",
}

# Build fast lookup including exact canonical names
for b in BOOKS:
    ALIASES[b.lower()] = b

# --- Reference normalization --------------------------------------------------
# Accepts:
#   "Gen 1:1", "Genesis 1:1", "Gen.1.1", "Gen 1.1", "1 Jn 5:7", "1John 5:7"
# Returns "Genesis 1:1" style or None if not parseable.
REF_PATTERNS = [
    re.compile(r"""^\s*(?P<book>(?:[1-3]\s*)?[A-Za-z\. ]+?)\s*[.,]?\s*(?P<ch>\d+)\s*[:.\s]\s*(?P<vs>\d+)\s*$"""),
]

def normalize_book(raw: str) -> str | None:
    s = raw.strip().lower()
    # unify "1john" => "1 john"
    s = re.sub(r'^([1-3])\s*([a-z])', r'\1 \2', s)
    s = re.sub(r'\s+', ' ', s)
    # strip trailing dots in tokens
    s = s.replace('.', '')
    return ALIASES.get(s)

def normalize_ref(ref: str) -> str | None:
    if not ref or not str(ref).strip():
        return None
    s = str(ref).strip()
    # Replace weird separators
    s = s.replace('–', '-').replace('—', '-').replace('·', '.')
    for pat in REF_PATTERNS:
        m = pat.match(s)
        if not m:
            continue
        book_raw = m.group("book")
        ch = m.group("ch")
        vs = m.group("vs")
        book = normalize_book(book_raw)
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

# --- IO helpers ---------------------------------------------------------------
def load_mapping():
    if MAP_JSON.exists():
        with MAP_JSON.open("r", encoding="utf-8") as f:
            raw = json.load(f)
        return {str(k).strip(): list(dict.fromkeys(v)) for k, v in raw.items()}
    if MAP_CSV.exists():
        mapping = {}
        with MAP_CSV.open("r", encoding="utf-8") as f:
            rdr = csv.DictReader(f)
            for row in rdr:
                ch = str(row.get("chapter", "")).strip()
                vs = str(row.get("verse", "")).strip()
                refs = str(row.get("refs", "")).strip()
                if not ch or not vs:
                    continue
                key = f"{int(ch)}:{int(vs)}"
                # split by ; or | or ,
                items = re.split(r'[;|,]', refs)
                items = [r.strip() for r in items if r.strip()]
                mapping.setdefault(key, []).extend(items)
        return {k: list(dict.fromkeys(v)) for k, v in mapping.items()}
    print("No mapping file found. Provide tools/genesis_xrefs.json or tools/genesis_xrefs.csv", file=sys.stderr)
    sys.exit(1)

# near the top with other imports/paths
BAK_ROOT = REPO_ROOT / "tools" / "_bak"

def backup_dir(src: Path) -> Path:
    BAK_ROOT.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    # create a descriptive backup path: tools/_bak/data-tanakh-genesis.bak.YYYYmmdd-HHMMSS
    rel = src.relative_to(REPO_ROOT).as_posix().replace("/", "-")
    dst = BAK_ROOT / f"{rel}.bak.{stamp}"
    shutil.copytree(src, dst)
    return dst

def merge_refs(existing, new_items, invalid_log):
    if not isinstance(existing, list):
        existing = []
    normalized = []
    for r in (new_items or []):
        n = normalize_ref(r)
        if n:
            normalized.append(n)
        else:
            invalid_log.append(r)
    # dedupe in stable order: existing first, then new normalized
    combined = list(dict.fromkeys(
        [*(e.strip() for e in existing if isinstance(e, str) and e.strip()),
         *normalized]
    ))
    return combined

def update_chapter(ch_path: Path, mapping: dict, invalid_log: list[str], missing_rows: list[tuple[int,int]]) -> int:
    """Returns number of verses updated in this chapter."""
    changed = 0
    ch_num = int(ch_path.stem)  # e.g., 1.json -> 1
    with ch_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        print(f"SKIP {ch_path}: not an array", file=sys.stderr)
        return 0

    for i, vobj in enumerate(data):
        vnum = vobj.get("v")
        if not isinstance(vnum, int):
            continue
        key = f"{ch_num}:{vnum}"

        # ensure required fields
        if "c" not in vobj or not isinstance(vobj["c"], list):
            vobj["c"] = []
        if "s" not in vobj or not isinstance(vobj["s"], list):
            vobj["s"] = []

        before = list(vobj.get("c") or [])
        after = before

        if key in mapping and mapping[key]:
            after = merge_refs(before, mapping[key], invalid_log)

        if after != before:
            vobj["c"] = after
            changed += 1

        if not vobj["c"]:
            missing_rows.append((ch_num, int(vnum)))

    with ch_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return changed

def write_reports(missing_rows, invalid_refs):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    # Missing cross-refs per verse
    miss_csv = REPORT_DIR / "genesis_xrefs_missing.csv"
    with miss_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["chapter", "verse"])
        for ch, vs in sorted(missing_rows):
            w.writerow([ch, vs])

    # Invalid references encountered during normalization
    bad_txt = REPORT_DIR / "genesis_xrefs_invalid.txt"
    with bad_txt.open("w", encoding="utf-8") as f:
        if not invalid_refs:
            f.write("(none)\n")
        else:
            f.write("\n".join(sorted(set(invalid_refs))) + "\n")

    return miss_csv, bad_txt

def main():
    if not GENESIS_DIR.exists():
        print(f"Missing: {GENESIS_DIR}", file=sys.stderr)
        sys.exit(1)

    mapping = load_mapping()
    backup = backup_dir(GENESIS_DIR)
    print(f"Backup created: {backup}")

    total_files = 0
    total_updates = 0
    missing_rows: list[tuple[int,int]] = []
    invalid_refs: list[str] = []

    for ch_path in sorted(GENESIS_DIR.glob("*.json"), key=lambda p: int(p.stem)):
        changed = update_chapter(ch_path, mapping, invalid_refs, missing_rows)
        total_files += 1
        total_updates += changed
        print(f"Updated {ch_path.name}: {changed} verse(s)")

    miss_csv, bad_txt = write_reports(missing_rows, invalid_refs)

    print(f"\nDone. Files: {total_files}, verses updated: {total_updates}")
    print(f"Report (missing xrefs): {miss_csv}")
    print(f"Report (invalid refs):  {bad_txt}")

if __name__ == "__main__":
    main()
