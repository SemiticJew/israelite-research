# tools/build_from_csv.py
import csv, json, os, re
from collections import defaultdict

CSV_PATH = os.path.join('tools', 'kjv-apocrypha.csv')

# ---------------- Canon Partitions (exact display names expected from CSV) ----------------
TANAKH = [
    "Genesis","Exodus","Leviticus","Numbers","Deuteronomy",
    "Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings",
    "1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms",
    "Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations",
    "Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah",
    "Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"
]

NEW_TESTAMENT = [
    "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
    "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians",
    "1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
    "1 John","2 John","3 John","Jude","Revelation"
]

APOCRYPHA = [
    "1 Esdras","2 Esdras","Tobit","Judith","Additions to Esther","Wisdom of Solomon","Sirach",
    "Baruch","Letter of Jeremiah","Prayer of Azariah","Susanna","Bel and the Dragon",
    "Prayer of Manasseh","1 Maccabees","2 Maccabees","3 Maccabees","4 Maccabees","Psalm 151",
    "Epistle to the Laodiceans","Laodiceans"
]

# Roman numeral → Arabic prefix normalization for CSV “Book” names
ROMAN_PREFIXES = [
    (r'^\s*III\s+', '3 '),
    (r'^\s*II\s+',  '2 '),
    (r'^\s*I\s+',   '1 '),
]

def normalize_book_name(name: str) -> str:
    s = name.strip()
    # Roman numerals at start → Arabic
    for pat, rep in ROMAN_PREFIXES:
        s = re.sub(pat, rep, s, flags=re.IGNORECASE)
    # Common alternates
    if s == "Song of Songs":
        s = "Song of Solomon"
    if s == "Laodiceans":
        s = "Epistle to the Laodiceans"
    return s

def slugify(book: str) -> str:
    s = book.lower().strip()
    s = s.replace('&', 'and')
    s = re.sub(r'[^a-z0-9\s-]+', '', s)
    s = re.sub(r'\s+', '-', s)
    return s

def bucket_root(book_norm: str) -> str:
    if book_norm in TANAKH:
        return os.path.join('data','tanakh')
    if book_norm in NEW_TESTAMENT:
        return os.path.join('data','newtestament')
    if book_norm in APOCRYPHA:
        return os.path.join('data','apocrypha')
    # Fallback: apocrypha bucket
    return os.path.join('data','apocrypha')

# ---------------- Read CSV (Book ID,Book,Chapter,Text,Count,Verse) ----------------
rows = []
with open(CSV_PATH, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    # Sanity check for required headers
    required = {'Book ID','Book','Chapter','Text','Count','Verse'}
    missing = required - set(reader.fieldnames or [])
    if missing:
        raise SystemExit(f"CSV missing columns: {', '.join(sorted(missing))}")
    for r in reader:
        rows.append(r)

# ---------------- Group into per-(Book, Chapter) lists ----------------
chapters = defaultdict(list)
for r in rows:
    book_raw = (r.get('Book') or '').strip()
    if not book_raw:
        continue
    book_norm = normalize_book_name(book_raw)

    try:
        ch = int(r.get('Chapter') or 0)
        v  = int(r.get('Verse') or 0)
    except ValueError:
        continue

    text = (r.get('Text') or '').strip()

    # Build the verse shape the site expects (no inline Strong’s; placeholders for cross-refs/strongs)
    chapters[(book_norm, ch)].append({
        "v": v,
        "t": text,
        "c": [],   # cross-references placeholder
        "s": []    # strongs placeholder
    })

# ---------------- Write JSON per chapter ----------------
written = 0
for (book_norm, ch), verse_list in chapters.items():
    verse_list.sort(key=lambda x: x["v"])
    root   = bucket_root(book_norm)
    bslug  = slugify(book_norm)
    outdir = os.path.join(root, bslug)
    os.makedirs(outdir, exist_ok=True)
    outpath = os.path.join(outdir, f"{ch}.json")
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(verse_list, f, ensure_ascii=False, indent=2)
    written += 1

print(f"Wrote {written} chapter JSON files from {CSV_PATH}")
