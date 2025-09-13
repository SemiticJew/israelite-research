import csv, json, os, re, sys
from collections import defaultdict, OrderedDict

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "kjv-apocrypha.csv"
OUT_ROOT = "data"

APOCRYPHA = {
    "Tobit","Judith","Wisdom","Sirach","Ecclesiasticus","Baruch",
    "1 Maccabees","2 Maccabees","I Maccabees","II Maccabees",
    "Additions to Esther","Prayer of Azariah","Susanna","Bel and the Dragon",
    "1 Esdras","2 Esdras","Prayer of Manasseh","Letter of Jeremiah"
}
NEW_TESTAMENT = {
    "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
    "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians",
    "1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
    "1 John","2 John","3 John","Jude","Revelation"
}

def slugify_book(name: str) -> str:
    s = name.strip()
    s = re.sub(r'^(I{1,3}|IV|V|VI{0,3}|IX|X)(?=\s)',
               lambda m: {"I":"1","II":"2","III":"3","IV":"4","V":"5","VI":"6","VII":"7","VIII":"8","IX":"9","X":"10"}.get(m.group(0).upper(), m.group(0)), s)
    s = re.sub(r"^Canticles$", "Song of Solomon", s, flags=re.I)
    s = re.sub(r"^Song of Songs$", "Song of Solomon", s, flags=re.I)
    s = re.sub(r"^Ecclesiasticus$", "Sirach", s, flags=re.I)
    s = re.sub(r"^Wis$", "Wisdom", s, flags=re.I)
    s = re.sub(r"^Sir$", "Sirach", s, flags=re.I)
    s = re.sub(r'^(\d+)\s+', r'\1-', s)
    s = s.lower().replace('&','and')
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def canon_for(book_name: str) -> str:
    if book_name in APOCRYPHA: return "apocrypha"
    if book_name in NEW_TESTAMENT: return "newtestament"
    return "tanakh"

def to_int_safe(x, default=0):
    try: return int(str(x).strip())
    except: return default

chapters = defaultdict(list)
book_max_ch = defaultdict(int)

with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        book = (row.get("Book") or "").strip()
        ch = to_int_safe(row.get("Chapter"), 0)
        v  = to_int_safe(row.get("Verse"), 0)
        t  = (row.get("Text") or "").strip()
        c  = to_int_safe(row.get("Count"), 0)
        if not book or ch <= 0 or v <= 0:
            continue
        canon = canon_for(book)
        slug = slugify_book(book)
        chapters[(canon, slug, ch)].append((v, t, c))
        if ch > book_max_ch[(canon, slug)]:
            book_max_ch[(canon, slug)] = ch

for (canon, slug, ch), items in chapters.items():
    items.sort(key=lambda x: x[0])
    verses = [{"v": v, "t": t, "c": c, "s": []} for v, t, c in items]
    total = book_max_ch[(canon, slug)]
    out_dir = os.path.join(OUT_ROOT, canon, slug)
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, f"{ch}.json"), "w", encoding="utf-8") as w:
        json.dump({"total": total, "verses": verses}, w, ensure_ascii=False, indent=2)

by_canon = {"tanakh": {}, "newtestament": {}, "apocrypha": {}}
for (canon, slug), total in book_max_ch.items():
    by_canon[canon][slug] = total

for canon, mapping in by_canon.items():
    if not mapping: 
        continue
    canon_dir = os.path.join(OUT_ROOT, canon)
    os.makedirs(canon_dir, exist_ok=True)
    ordered = OrderedDict(sorted(mapping.items(), key=lambda kv: kv[0]))
    with open(os.path.join(canon_dir, "books.json"), "w", encoding="utf-8") as w:
        json.dump(ordered, w, ensure_ascii=False, indent=2)

print("Done.")
