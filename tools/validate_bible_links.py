import json, re, pathlib

BASE="/israelite-research"
DICT=pathlib.Path("data/israelite_dictionary.json")
OUT_TSV=pathlib.Path("tmp/bible_link_audit.tsv")

def roman_to_int(s):
    s=s.upper().strip('. ')
    table={'I':1,'V':5,'X':10}
    val=0
    prev=0
    for ch in reversed(s):
        if ch not in table: return None
        cur=table[ch]
        if cur<prev: val-=cur
        else: val+=cur; prev=cur
    return val

def norm_dashes(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
def squeeze(s): return re.sub(r"\s+", " ", s or "").strip()
def strip_punct(s): return re.sub(r"[.,;:]+$", "", s or "")

TANAKH = {"genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numbers":"numbers","deuteronomy":"deuteronomy","daniel":"daniel","isaiah":"isaiah"}
APOC = {"1 maccabees":"1-maccabees","2 maccabees":"2-maccabees","wisdom":"wisdom","susanna":"susanna"}
NT = {"matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts","revelation":"revelation"}

ALIASES = {
 "gen":"genesis","ex":"exodus","lev":"leviticus","num":"numbers","deut":"deuteronomy","dan":"daniel",
 "isa":"isaiah","wis":"wisdom","1 mac":"1 maccabees","2 mac":"2 maccabees","sus":"susanna",
 "mt":"matthew","mk":"mark","lk":"luke","jn":"john","rev":"revelation"
}

def load_entries(p):
    j=json.loads(p.read_text())
    return j if isinstance(j,list) else j.get("entries",[])

def tokenize(refs):
    s=squeeze(norm_dashes(refs))
    return [x for x in re.split(r"[;|,]\s*", s) if x]

def split_book_chv(piece):
    piece=squeeze(piece)
    m=re.match(r"^((?:[1-3]|\bI{1,3}\b)\s+)?([A-Za-z][A-Za-z .'-]+?)\s+(\d+)(?::(\d+(?:-\d+)?))?$", piece, re.I)
    if not m: return None
    numeral=m.group(1) or ""
    book=strip_punct(m.group(2).lower())
    if numeral.strip():
        n = roman_to_int(numeral.strip()) if not numeral.strip().isdigit() else int(numeral)
        if n: book = f"{n} " + book
    ch=m.group(3)
    vs=m.group(4) or ""
    first_v = re.match(r"(\d+)", vs)
    v = first_v.group(1) if first_v else ""
    return book, ch, v

def canonicalize_book(book_raw):
    b = squeeze(book_raw).lower().replace(".", "")
    if b in ALIASES: b = ALIASES[b]
    return b

def categorize_and_slug(book_norm):
    if book_norm in TANAKH:   return "tanakh", TANAKH[book_norm]
    if book_norm in APOC:     return "apocrypha", APOC[book_norm]
    if book_norm in NT:       return "new-testament", NT[book_norm]
    return None, None

def build_url(cat, slug, ch, v):
    if cat=="apocrypha":
        return f"{BASE}/apocrypha/chapter.html?book={slug}&ch={ch}"
    if cat=="tanakh":
        return f"{BASE}/tanakh/chapter.html?book={slug}&ch={ch}" + (f"#v{v}" if v else "")
    if cat=="new-testament":
        return f"{BASE}/new-testament/chapter.html?book={slug}&ch={ch}" + (f"#v{v}" if v else "")
    return None

entries = load_entries(DICT)
rows=[]
for idx,e in enumerate(entries):
    refs=",".join([str(e.get(k,"")) for k in ("bible_refs","biblical_refs","refs") if e.get(k)])
    for piece in tokenize(refs):
        sc = split_book_chv(piece)
        if not sc:
            rows.append([idx,e.get("headword",""),piece,"PARSE_FAIL","","",""])
            continue
        book_raw, ch, v = sc
        book_norm = canonicalize_book(book_raw)
        cat, slug = categorize_and_slug(book_norm)
        if not cat:
            rows.append([idx,e.get("headword",""),piece,"UNKNOWN_BOOK",book_norm,"",""])
            continue
        url = build_url(cat, slug, ch, v)
        if not url:
            rows.append([idx,e.get("headword",""),piece,"URL_FAIL",book_norm,cat,slug])
            continue
        rows.append([idx,e.get("headword",""),piece,"OK",book_norm,cat,url])

OUT_TSV.parent.mkdir(parents=True, exist_ok=True)
with OUT_TSV.open("w",encoding="utf-8") as f:
    f.write("entry_index\theadword\tref\tstatus\tbook\tcategory\turl\n")
    for r in rows:
        f.write("\t".join(str(x) for x in r) + "\n")

bad=[r for r in rows if r[3]!="OK"]
print(f"Total refs: {len(rows)} | OK: {len(rows)-len(bad)} | Issues: {len(bad)}")
print(f"Wrote {OUT_TSV}")
