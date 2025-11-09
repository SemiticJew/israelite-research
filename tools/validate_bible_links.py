import json, re, pathlib, sys
BASE="/israelite-research"
DICT=pathlib.Path("data/israelite_dictionary.json")
OUT_TSV=pathlib.Path("tmp/bible_link_audit.tsv")
OUT_UNKNOWN=pathlib.Path("tmp/bible_unknown_books.tsv")

def norm(s): return re.sub(r"[\u2012\u2013\u2014]", "-", (s or "")).strip()
def squeeze(s): return re.sub(r"\s+", " ", s or "").strip()
def strip_punct(s): return re.sub(r"[.,;:]+$", "", s or "")

def roman_to_int(s):
    s=s.upper().strip('. ')
    table={'I':1,'V':5,'X':10}
    val=0; prev=0
    for ch in reversed(s):
        if ch not in table: return None
        cur=table[ch]
        val = val-cur if cur<prev else val+cur
        prev=cur
    return val

TANAKH={"genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numbers":"numbers","deuteronomy":"deuteronomy","daniel":"daniel","isaiah":"isaiah"}
APOC={"1 maccabees":"1-maccabees","2 maccabees":"2-maccabees","wisdom":"wisdom","sirach":"sirach","susanna":"susanna"}
NT={"matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts","revelation":"revelation"}

ALIASES={"gen":"genesis","ex":"exodus","lev":"leviticus","num":"numbers","deut":"deuteronomy","dan":"daniel",
"wis":"wisdom","sir":"sirach","1 mac":"1 maccabees","2 mac":"2 maccabees","sus":"susanna",
"mt":"matthew","mk":"mark","lk":"luke","jn":"john","rev":"revelation"}

def load_entries(p):
    j=json.loads(p.read_text())
    return j if isinstance(j,list) else j.get("entries",[])

def tokenize(refs):
    s=squeeze(norm(refs))
    return [x for x in re.split(r"[;|,]\s*", s) if x]

def split_book_chv(piece):
    piece=squeeze(piece)
    m=re.match(r"^((?:[1-3]|\bI{1,3}\b)\s+)?([A-Za-z][A-Za-z .'-]+?)\s+(\d+)(?::(\d+(?:-\d+)?))?$", piece, re.I)
    if not m: return None
    numeral=(m.group(1) or "").strip()
    book=strip_punct(m.group(2).lower())
    if numeral:
        n = roman_to_int(numeral) if not numeral.isdigit() else int(numeral)
        if n: book = f"{n} " + book
    ch=m.group(3)
    vs=m.group(4) or ""
    v = re.match(r"(\d+)", vs).group(1) if re.match(r"(\d+)", vs) else ""
    return book, ch, v

def canonicalize_book(book_raw):
    b = squeeze(book_raw).lower().replace(".", "")
    b = ALIASES.get(b, b)
    return b

def categorize_and_slug(book_norm):
    if book_norm in TANAKH: return "tanakh", TANAKH[book_norm]
    if book_norm in APOC: return "apocrypha", APOC[book_norm]
    if book_norm in NT: return "new-testament", NT[book_norm]
    return None, None

def build_url(cat, slug, ch, v):
    if cat=="apocrypha":
        return f"{BASE}/apocrypha/chapter.html?book={slug}&ch={ch}"
    if cat=="tanakh":
        return f"{BASE}/tanakh/chapter.html?book={slug}&ch={ch}" + (f"#v{v}" if v else "")
    if cat=="new-testament":
        return f"{BASE}/new-testament/chapter.html?book={slug}&ch={ch}" + (f"#v{v}" if v else "")
    return None

entries=load_entries(DICT)
rows=[]; unknown_books={}
for idx,e in enumerate(entries):
    refs=",".join([str(e.get(k,"")) for k in ("bible_refs","biblical_refs","refs") if e.get(k)])
    for piece in tokenize(refs):
        sc = split_book_chv(piece)
        if not sc:
            rows.append([idx,e.get("headword",""),piece,"PARSE_FAIL","","",""]); continue
        book_raw, ch, v = sc
        book_norm = canonicalize_book(book_raw)
        cat, slug = categorize_and_slug(book_norm)
        if not cat:
            rows.append([idx,e.get("headword",""),piece,"UNKNOWN_BOOK",book_norm,"",""])
            unknown_books[book_norm]=unknown_books.get(book_norm,0)+1
            continue
        url = build_url(cat, slug, ch, v)
        rows.append([idx,e.get("headword",""),piece,"OK",book_norm,cat,url])

OUT_TSV.parent.mkdir(parents=True,exist_ok=True)
with OUT_TSV.open("w",encoding="utf-8") as f:
    f.write("entry_index\theadword\tref\tstatus\tbook\tcategory\turl\n")
    for r in rows:
        f.write("\t".join(str(x) for x in r)+"\n")

with open("tmp/bible_unknown_books.tsv","w",encoding="utf-8") as f:
    f.write("book\thits\n")
    for b,c in sorted(unknown_books.items(), key=lambda x:-x[1]):
        f.write(f"{b}\t{c}\n")

print(f"Total refs: {len(rows)} | OK: {sum(1 for r in rows if r[3]=='OK')} | Issues: {sum(1 for r in rows if r[3]!='OK')}")
print(f"Wrote {OUT_TSV} and tmp/bible_unknown_books.tsv")
