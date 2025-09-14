import csv, json, os, re, sys
from collections import defaultdict

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "book_cross_references.csv"
OUT_ROOT = "data/crossrefs"

NEW_TESTAMENT = {
    "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
    "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians",
    "1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
    "1 John","2 John","3 John","Jude","Revelation"
}
APOCRYPHA = {
    "Tobit","Judith","Wisdom","Sirach","Ecclesiasticus","Baruch",
    "1 Maccabees","2 Maccabees","I Maccabees","II Maccabees",
    "Additions to Esther","Prayer of Azariah","Susanna","Bel and the Dragon",
    "1 Esdras","2 Esdras","Prayer of Manasseh","Letter of Jeremiah"
}

ROMAN = {"I":"1","II":"2","III":"3","IV":"4","V":"5","VI":"6","VII":"7","VIII":"8","IX":"9","X":"10"}

def canon_for(book: str) -> str:
    if book in NEW_TESTAMENT: return "newtestament"
    if book in APOCRYPHA: return "apocrypha"
    return "tanakh"

ALIASES = {
    "Song of Songs":"Song of Solomon",
    "Canticles":"Song of Solomon",
    "Ecclesiasticus":"Sirach",
    "Wis":"Wisdom",
    "Sir":"Sirach",
}
def norm_book(name: str) -> str:
    s = (name or "").strip()
    s = ALIASES.get(s, s)
    return s

def slugify_book(name: str) -> str:
    s = name.strip()
    s = re.sub(r'^(I{1,3}|IV|V|VI{0,3}|IX|X)(?=\s)',
               lambda m: ROMAN.get(m.group(0).upper(), m.group(0)), s)
    s = s.replace('&','and')
    s = re.sub(r"^Song of Songs$", "Song of Solomon", s, flags=re.I)
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"^(\d+)\s+", r"\1-", s)
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

BK_RE = re.compile(r"^\s*([1-3]?\s*[A-Za-z][A-Za-z\s\-]+?)\s+(\d+):(\d+)\s*$")
def parse_ref(ref: str):
    m = BK_RE.match(ref or "")
    if not m: return None
    book = norm_book(m.group(1).strip())
    ch = int(m.group(2)); v = int(m.group(3))
    slug = slugify_book(book)
    canon = canon_for(book)
    return {"canon": canon, "book": book, "slug": slug, "chapter": ch, "verse": v}

by_src = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
    r = csv.DictReader(f)
    for row in r:
        src_ref = (row.get("verse_ref_source_ls") or row.get("source") or "").strip()
        tgt_ref = (row.get("verse_ref_target_ls") or row.get("target") or "").strip()
        if not src_ref or not tgt_ref: continue
        s = parse_ref(src_ref)
        t = parse_ref(tgt_ref)
        if not s or not t: continue
        label = f"{t['book']} {t['chapter']}:{t['verse']}"
        by_src[s["canon"]][s["slug"]][s["chapter"]].append({
            "v": s["verse"],
            "target": {"canon": t["canon"], "slug": t["slug"], "book": t["book"], "c": t["chapter"], "v": t["verse"], "label": label}
        })

written = 0
for canon, books in by_src.items():
    for slug, chapters in books.items():
        out_dir = os.path.join(OUT_ROOT, canon, slug)
        os.makedirs(out_dir, exist_ok=True)
        for ch, rows in chapters.items():
            from collections import defaultdict
            grouped = defaultdict(list)
            for r in rows:
                grouped[r["v"]].append(r["target"])
            payload = {str(v): targets for v, targets in sorted(grouped.items(), key=lambda kv: int(kv[0]))}
            with open(os.path.join(out_dir, f"{ch}.json"), "w", encoding="utf-8") as w:
                json.dump(payload, w, ensure_ascii=False, indent=2)
                written += 1

print(f"Wrote {written} cross-ref chapter files into {OUT_ROOT}")
