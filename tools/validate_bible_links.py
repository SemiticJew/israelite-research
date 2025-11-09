import json, re, pathlib

BASE="/israelite-research"
DICT=pathlib.Path("data/israelite_dictionary.json")
OUT_TSV=pathlib.Path("tmp/bible_link_audit.tsv")
OUT_UNKNOWN=pathlib.Path("tmp/bible_unknown_books.tsv")

def norm_dashes(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
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
    s=squeeze(norm_dashes(refs))
    return [x for x in re.split(r"[;|,]\s*", s) if x]

def split_book_chv(piece, last_book=None, last_ch=None):
    piece=squeeze(piece)
    full=re.match(r"^((?:[1-3]|\bI{1,3}\b)\s+)?([A-Za-z][A-Za-z .'-]+?)\s+(\d+)(?::(\d+(?:-\d+)?))?$", piece, re.I)
    if full:
        numeral=(full.group(1) or "").strip()
        book=strip_punct(full.group(2).lower())
        if numeral:
            n=roman_to_int(numeral) if not numeral.isdigit() else int(numeral)
            if n: book=f"{n} "+book
        ch=full.group(3)
        vs=full.group(4) or ""
        v=re.match(r"(\d+)",vs).group(1) if vs else ""
        return book,ch,v,True
    cont_cv=re.match(r"^(\d+):(\d+(?:-\d+)?)$",piece)
    if cont_cv and last_book:
        ch=cont_cv.group(1)
        v=re.match(r"(\d+)",cont_cv.group(2)).group(1)
        return last_book,ch,v,False
    cont_v=re.match(r"^(\d+)(?:-\d+)?$",piece)
    if cont_v and last_book and last_ch:
        v=cont_v.group(1)
        return last_book,last_ch,v,False
    return None

def canonicalize_book(book_raw):
    b=squeeze(book_raw).lower().replace(".","")
    b=b.replace("bel and the dragon","bel-and-the-dragon").replace("song of songs","song-of-songs")
    b=ALIASES.get(b,b)
    return b

def categorize_and_slug(book_norm):
    if book_norm in TANAKH: return "tanakh",TANAKH[book_norm]
    if book_norm in APOC: return "apocrypha",APOC[book_norm]
    if book_norm in NT: return "new-testament",NT[book_norm]
    return None,None

def build_url(cat,slug,ch,v):
    if cat=="apocrypha":
        return f"{BASE}/apocrypha/chapter.html?book={slug}&ch={ch}"
    if cat=="tanakh":
        return f"{BASE}/tanakh/chapter.html?book={slug}&ch={ch}"+(f"#v{v}" if v else "")
    if cat=="new-testament":
        return f"{BASE}/new-testament/chapter.html?book={slug}&ch={ch}"+(f"#v{v}" if v else "")
    return None

entries=load_entries(DICT)
rows=[]; unknown_books={}
for idx,e in enumerate(entries):
    refs=",".join(str(e.get(k,"")) for k in ("bible_refs","biblical_refs","refs") if e.get(k))
    last_book=None; last_ch=None
    for piece in tokenize(refs):
        parsed=split_book_chv(piece,last_book,last_ch)
        if not parsed:
            rows.append([idx,e.get("headword",""),piece,"PARSE_FAIL","","",""])
            continue
        book_raw,ch,v,resets=parsed
        book_norm=canonicalize_book(book_raw)
        cat,slug=categorize_and_slug(book_norm)
        if not cat:
            rows.append([idx,e.get("headword",""),piece,"UNKNOWN_BOOK",book_norm,"",""])
            unknown_books[book_norm]=unknown_books.get(book_norm,0)+1
        else:
            url=build_url(cat,slug,ch,v)
            rows.append([idx,e.get("headword",""),piece,"OK",book_norm,cat,url])
            if resets or not last_book: last_book=book_norm
            if resets or not last_ch: last_ch=ch

OUT_TSV.parent.mkdir(parents=True,exist_ok=True)
with OUT_TSV.open("w",encoding="utf-8") as f:
    f.write("entry_index\theadword\tref\tstatus\tbook\tcategory\turl\n")
    for r in rows:
        f.write("\t".join(str(x) for x in r)+"\n")

with OUT_UNKNOWN.open("w",encoding="utf-8") as f:
    f.write("book\thits\n")
    for b,c in sorted(unknown_books.items(),key=lambda x:-x[1]):
        f.write(f"{b}\t{c}\n")

bad=[r for r in rows if r[3]!="OK"]
print(f"Total refs: {len(rows)} | OK: {len(rows)-len(bad)} | Issues: {len(bad)} | Unknown-book types: {len(unknown_books)}")
print(f"Wrote {OUT_TSV}")
print(f"Wrote {OUT_UNKNOWN}")
