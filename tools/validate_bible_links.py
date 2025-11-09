import json,re,sys,pathlib

BASE="/israelite-research"
DICT=pathlib.Path("data/israelite_dictionary.json")
OUT_TSV=pathlib.Path("tmp/bible_link_audit.tsv")

tanakh={
"genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numbers":"numbers","deuteronomy":"deuteronomy","joshua":"joshua","judges":"judges","ruth":"ruth",
"1 samuel":"1-samuel","2 samuel":"2-samuel","i samuel":"1-samuel","ii samuel":"2-samuel",
"1 kings":"1-kings","2 kings":"2-kings","i kings":"1-kings","ii kings":"2-kings",
"1 chronicles":"1-chronicles","2 chronicles":"2-chronicles","i chronicles":"1-chronicles","ii chronicles":"2-chronicles",
"ezra":"ezra","nehemiah":"nehemiah","esther":"esther","job":"job","psalm":"psalms","psalms":"psalms","proverbs":"proverbs","ecclesiastes":"ecclesiastes","song of songs":"song-of-songs","song of solomon":"song-of-songs",
"isaiah":"isaiah","jeremiah":"jeremiah","lamentations":"lamentations","ezekiel":"ezekiel","daniel":"daniel",
"hosea":"hosea","joel":"joel","amos":"amos","obadiah":"obadiah","jonah":"jonah","micah":"micah","nahum":"nahum","habakkuk":"habakkuk","zephaniah":"zephaniah","haggai":"haggai","zechariah":"zechariah","malachi":"malachi"
}
apoc={
"tobit":"tobit","judith":"judith","wisdom":"wisdom","wisdom of solomon":"wisdom","sirach":"sirach","ecclesiasticus":"sirach","baruch":"baruch",
"1 maccabees":"1-maccabees","2 maccabees":"2-maccabees","i maccabees":"1-maccabees","ii maccabees":"2-maccabees",
"susanna":"susanna","bel and the dragon":"bel-and-the-dragon","prayer of azariah":"prayer-of-azariah","additions to esther":"additions-to-esther"
}
nt={
"matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts","romans":"romans",
"1 corinthians":"1-corinthians","2 corinthians":"2-corinthians","i corinthians":"1-corinthians","ii corinthians":"2-corinthians",
"galatians":"galatians","ephesians":"ephesians","philippians":"philippians","colossians":"colossians",
"1 thessalonians":"1-thessalonians","2 thessalonians":"2-thessalonians","i thessalonians":"1-thessalonians","ii thessalonians":"2-thessalonians",
"1 timothy":"1-timothy","2 timothy":"2-timothy","i timothy":"1-timothy","ii timothy":"2-timothy",
"titus":"titus","philemon":"philemon","hebrews":"hebrews","james":"james",
"1 peter":"1-peter","2 peter":"2-peter","i peter":"1-peter","ii peter":"2-peter",
"1 john":"1-john","2 john":"2-john","3 john":"3-john","i john":"1-john","ii john":"2-john","iii john":"3-john",
"jude":"jude","revelation":"revelation","apocalypse":"revelation"
}

def load_entries(p):
    j=json.loads(p.read_text())
    return j if isinstance(j,list) else j.get("entries",[])

def norm(s):
    return re.sub(r"[\u2012\u2013\u2014]","-",s or "").strip()

def tokenize(refs):
    s=norm(refs)
    parts=re.split(r"[;,|]\s*",s)
    return [x for x in parts if x]

def parse(ref):
    m=re.match(r"^\s*((?:[1-3]\s+)?[A-Za-z][A-Za-z .-]+)\s+(\d+)(?::(\d+)(?:-\d+)?)?\s*$",ref,re.I)
    if not m: return None
    book=m.group(1).strip().lower().replace(".","")
    ch=m.group(2)
    v=m.group(3)
    return book,ch,v

def categorize(book):
    if book in tanakh: return "tanakh",tanakh[book]
    if book in apoc: return "apocrypha",apoc[book]
    if book in nt: return "new-testament",nt[book]
    return None,None

def build_url(cat,slug,ch,v):
    if cat=="apocrypha":
        return f"{BASE}/apocrypha/chapter.html?book={slug}&ch={ch}"
    if cat=="tanakh":
        return f"{BASE}/tanakh/chapter.html?book={slug}&ch={ch}" + (f"#v{v}" if v else "")
    if cat=="new-testament":
        return f"{BASE}/new-testament/chapter.html?book={slug}&ch={ch}" + (f"#v{v}" if v else "")
    return None

entries=load_entries(DICT)
rows=[]
for idx,e in enumerate(entries):
    refs=",".join([str(e.get(k,"")) for k in ("bible_refs","biblical_refs","refs") if e.get(k)])
    for piece in tokenize(refs):
        parsed=parse(piece)
        if not parsed:
            rows.append([idx,e.get("headword",""),piece,"PARSE_FAIL","","",""])
            continue
        book,ch,v=parsed
        cat,slug=categorize(book)
        if not cat:
            rows.append([idx,e.get("headword",""),piece,"UNKNOWN_BOOK",book,"",""])
            continue
        url=build_url(cat,slug,ch,v)
        if not url:
            rows.append([idx,e.get("headword",""),piece,"URL_FAIL",book,cat,slug])
            continue
        rows.append([idx,e.get("headword",""),piece,"OK",book,cat,url])

OUT_TSV.parent.mkdir(parents=True,exist_ok=True)
with OUT_TSV.open("w",encoding="utf-8") as f:
    f.write("entry_index\theadword\tref\tstatus\tbook\tcategory\turl\n")
    for r in rows:
        f.write("\t".join(str(x) for x in r)+"\n")

bad=[r for r in rows if r[3]!="OK"]
print(f"Total refs: {len(rows)} | OK: {len(rows)-len(bad)} | Issues: {len(bad)}")
print(f"Wrote {OUT_TSV}")
