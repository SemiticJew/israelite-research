import csv, json, os, re, sys, ast
from collections import defaultdict

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "book_cross_references.csv"
OUT_ROOT = "data/crossrefs"

NT = {"Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"}
AP = {"Tobit","Judith","Wisdom","Sirach","Ecclesiasticus","Baruch","1 Maccabees","2 Maccabees","I Maccabees","II Maccabees","Additions to Esther","Prayer of Azariah","Susanna","Bel and the Dragon","1 Esdras","2 Esdras","Prayer of Manasseh","Letter of Jeremiah"}
ROMAN = {"I":"1","II":"2","III":"3","IV":"4","V":"5","VI":"6","VII":"7","VIII":"8","IX":"9","X":"10"}

ALIASES = {
  "Gen":"Genesis","Ge":"Genesis","Gn":"Genesis",
  "Ex":"Exodus","Exod":"Exodus",
  "Lev":"Leviticus","Lv":"Leviticus",
  "Num":"Numbers","Nu":"Numbers","Nm":"Numbers",
  "Deut":"Deuteronomy","Dt":"Deuteronomy","Deu":"Deuteronomy",
  "Josh":"Joshua","Jos":"Joshua",
  "Judg":"Judges","Jdg":"Judges",
  "Rth":"Ruth",
  "1 Sam":"1 Samuel","I Sam":"1 Samuel","1Samuel":"1 Samuel",
  "2 Sam":"2 Samuel","II Sam":"2 Samuel","2Samuel":"2 Samuel",
  "1 Kgs":"1 Kings","I Kgs":"1 Kings",
  "2 Kgs":"2 Kings","II Kgs":"2 Kings",
  "1 Chron":"1 Chronicles","I Chron":"1 Chronicles","1 Chr":"1 Chronicles","1Ch":"1 Chronicles",
  "2 Chron":"2 Chronicles","II Chron":"2 Chronicles","2 Chr":"2 Chronicles","2Ch":"2 Chronicles",
  "Ezr":"Ezra","Neh":"Nehemiah","Esth":"Esther",
  "Job":"Job","Psa":"Psalms","Ps":"Psalms","Psalm":"Psalms","Psalms":"Psalms",
  "Prov":"Proverbs","Pr":"Proverbs",
  "Eccl":"Ecclesiastes","Ecc":"Ecclesiastes","Qoheleth":"Ecclesiastes",
  "Song":"Song of Solomon","SoS":"Song of Solomon","Canticles":"Song of Solomon","Song of Songs":"Song of Solomon",
  "Isa":"Isaiah","Jer":"Jeremiah","Lam":"Lamentations","Ezek":"Ezekiel","Dan":"Daniel",
  "Hos":"Hosea","Joel":"Joel","Am":"Amos","Amos":"Amos","Obad":"Obadiah","Ob":"Obadiah",
  "Jon":"Jonah","Mic":"Micah","Nah":"Nahum","Hab":"Habakkuk","Zeph":"Zephaniah","Hag":"Haggai","Zech":"Zechariah","Mal":"Malachi",
  "Mt":"Matthew","Matt":"Matthew",
  "Mk":"Mark","Mrk":"Mark",
  "Lk":"Luke",
  "Jn":"John","Jhn":"John",
  "Ac":"Acts","Act":"Acts",
  "Rom":"Romans",
  "1 Cor":"1 Corinthians","I Cor":"1 Corinthians","1Co":"1 Corinthians",
  "2 Cor":"2 Corinthians","II Cor":"2 Corinthians","2Co":"2 Corinthians",
  "Gal":"Galatians","Eph":"Ephesians","Phil":"Philippians","Php":"Philippians","Col":"Colossians",
  "1 Thess":"1 Thessalonians","I Thess":"1 Thessalonians","1Th":"1 Thessalonians",
  "2 Thess":"2 Thessalonians","II Thess":"2 Thessalonians","2Th":"2 Thessalonians",
  "1 Tim":"1 Timothy","I Tim":"1 Timothy","1Ti":"1 Timothy",
  "2 Tim":"2 Timothy","II Tim":"2 Timothy","2Ti":"2 Timothy",
  "Tit":"Titus","Phlm":"Philemon","Phm":"Philemon","Heb":"Hebrews","Jas":"James","Jam":"James",
  "1 Pet":"1 Peter","I Pet":"1 Peter","1Pe":"1 Peter",
  "2 Pet":"2 Peter","II Pet":"2 Peter","2Pe":"2 Peter",
  "1 Jn":"1 John","I Jn":"1 John","1Jo":"1 John","1John":"1 John",
  "2 Jn":"2 John","II Jn":"2 John","2Jo":"2 John","2John":"2 John",
  "3 Jn":"3 John","III Jn":"3 John","3Jo":"3 John","3John":"3 John",
  "Jud":"Jude","Rev":"Revelation","Apoc":"Revelation",
  "Ecclesiasticus":"Sirach","Wis":"Wisdom","Sir":"Sirach"
}

def canon_for(book: str) -> str:
    if book in NT: return "newtestament"
    if book in AP: return "apocrypha"
    return "tanakh"

def expand_roman_prefix(name: str) -> str:
    m = re.match(r'^\s*(I{1,3}|IV|V|VI{0,3}|IX|X)\s+(.+)$', name)
    if not m: return name
    return f"{ROMAN.get(m.group(1).upper(), m.group(1))} {m.group(2)}"

def normalize_book(raw: str) -> str:
    s = (raw or "").strip()
    s = ALIASES.get(s, s)
    s = expand_roman_prefix(s)
    s = ALIASES.get(s, s)
    return s

def slugify(name: str) -> str:
    s = name.strip()
    s = re.sub(r'^(I{1,3}|IV|V|VI{0,3}|IX|X)\s+', lambda m: ROMAN.get(m.group(0).strip().upper(), m.group(0)), s)
    s = s.replace('&','and')
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"^(\d+)\s+", r"\1-", s)
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

REF_RE = re.compile(r'^\s*([1-3]?\s*[A-Za-z][A-Za-z\.\s\-]*?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?\s*$')

def parse_one_ref(s: str):
    m = REF_RE.match((s or "").strip().replace("’","'"))
    if not m: return None
    book = normalize_book(m.group(1).replace('.', '').strip())
    ch = int(m.group(2))
    v1 = int(m.group(3))
    v2 = int(m.group(4)) if m.group(4) else v1
    return book, ch, v1, v2

def split_refs(cell: str):
    if not cell: return []
    t = cell.strip()
    if t.startswith("[") and t.endswith("]"):
        try:
            arr = ast.literal_eval(t)
            return [str(x).strip() for x in arr if str(x).strip()]
        except Exception:
            pass
    parts = re.split(r'[;,/]+', t.strip("[]"))
    out = []
    for p in parts:
        p = p.strip().strip("'").strip('"')
        if p:
            out.append(p)
    return out

by_src = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
    r = csv.DictReader(f)
    for row in r:
        src_cell = row.get("verse_ref_source_ls") or row.get("source") or ""
        tgt_cell = row.get("verse_ref_target_ls") or row.get("target") or ""
        for sref in split_refs(src_cell):
            s = parse_one_ref(sref)
            if not s: continue
            s_book, s_ch, s_v1, s_v2 = s
            s_slug = slugify(s_book)
            s_canon = canon_for(s_book)
            for tref in split_refs(tgt_cell):
                t = parse_one_ref(tref)
                if not t: continue
                t_book, t_ch, t_v1, t_v2 = t
                t_slug = slugify(t_book)
                t_canon = canon_for(t_book)
                for v in range(s_v1, s_v2+1):
                    for tv in range(t_v1, t_v2+1):
                        label = f"{t_book} {t_ch}:{tv}"
                        by_src[s_canon][s_slug][s_ch].append({
                            "v": v,
                            "target": {"canon": t_canon, "slug": t_slug, "book": t_book, "c": t_ch, "v": tv, "label": label}
                        })

written = 0
for canon, books in by_src.items():
    for slug, chapters in books.items():
        out_dir = os.path.join(OUT_ROOT, canon, slug)
        os.makedirs(out_dir, exist_ok=True)
        for ch, rows in chapters.items():
            grouped = defaultdict(list)
            for r in rows:
                grouped[r["v"]].append(r["target"])
            payload = {str(v): targets for v, targets in sorted(grouped.items(), key=lambda kv: int(kv[0]))}
            with open(os.path.join(out_dir, f"{ch}.json"), "w", encoding="utf-8") as w:
                json.dump(payload, w, ensure_ascii=False, indent=2)
                written += 1

print(f"Wrote {written} files to {OUT_ROOT}")
