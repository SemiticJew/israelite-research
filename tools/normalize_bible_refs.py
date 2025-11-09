import json, re, pathlib

DICT = pathlib.Path("data/israelite_dictionary.json")

def ndash(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
def squeeze(s): return re.sub(r"\s+", " ", s or "").strip()
def stripdot(s): return (s or "").replace(".","").strip().lower()

# Canon + slugs
TANAKH = {
 "genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numbers":"numbers","deuteronomy":"deuteronomy",
 "joshua":"joshua","judges":"judges","ruth":"ruth","1 samuel":"1-samuel","2 samuel":"2-samuel",
 "1 kings":"1-kings","2 kings":"2-kings","1 chronicles":"1-chronicles","2 chronicles":"2-chronicles",
 "ezra":"ezra","nehemiah":"nehemiah","esther":"esther","job":"job","psalms":"psalms","proverbs":"proverbs",
 "ecclesiastes":"ecclesiastes","song-of-songs":"song-of-songs","isaiah":"isaiah","jeremiah":"jeremiah",
 "lamentations":"lamentations","ezekiel":"ezekiel","daniel":"daniel","hosea":"hosea","joel":"joel","amos":"amos",
 "obadiah":"obadiah","jonah":"jonah","micah":"micah","nahum":"nahum","habakkuk":"habakkuk","zephaniah":"zephaniah",
 "haggai":"haggai","zechariah":"zechariah","malachi":"malachi"
}
APOC = {
 "tobit":"tobit","judith":"judith","wisdom":"wisdom","sirach":"sirach","baruch":"baruch",
 "1 maccabees":"1-maccabees","2 maccabees":"2-maccabees","susanna":"susanna","bel-and-the-dragon":"bel-and-the-dragon",
 "prayer-of-azariah":"prayer-of-azariah","additions-to-esther":"additions-to-esther"
}
NT = {
 "matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts","romans":"romans",
 "1 corinthians":"1-corinthians","2 corinthians":"2-corinthians","galatians":"galatians","ephesians":"ephesians",
 "philippians":"philippians","colossians":"colossians","1 thessalonians":"1-thessalonians","2 thessalonians":"2-thessalonians",
 "1 timothy":"1-timothy","2 timothy":"2-timothy","titus":"titus","philemon":"philemon","hebrews":"hebrews","james":"james",
 "1 peter":"1-peter","2 peter":"2-peter","1 john":"1-john","2 john":"2-john","3 john":"3-john","jude":"jude","revelation":"revelation"
}
CANON = {}
for k,v in TANAKH.items(): CANON[k]=("tanakh",v)
for k,v in APOC.items(): CANON[k]=("apocrypha",v)
for k,v in NT.items(): CANON[k]=("new-testament",v)

ALIASES = {
 "gen":"genesis","ge":"genesis","gn":"genesis",
 "ex":"exodus","exo":"exodus","exod":"exodus",
 "lev":"leviticus","lv":"leviticus",
 "num":"numbers","nu":"numbers","nm":"numbers","nb":"numbers",
 "deut":"deuteronomy","deu":"deuteronomy","dt":"deuteronomy",
 "jos":"joshua","josh":"joshua",
 "jdg":"judges","judg":"judges","jgs":"judges","jg":"judges",
 "ru":"ruth","rut":"ruth",
 "1 sam":"1 samuel","i sam":"1 samuel","1sa":"1 samuel","1 sm":"1 samuel",
 "2 sam":"2 samuel","ii sam":"2 samuel","2sa":"2 samuel","2 sm":"2 samuel",
 "1 kgs":"1 kings","i kgs":"1 kings","1ki":"1 kings","1kgs":"1 kings",
 "2 kgs":"2 kings","ii kgs":"2 kings","2ki":"2 kings","2kgs":"2 kings",
 "1 chr":"1 chronicles","i chr":"1 chronicles","1ch":"1 chronicles","1 chron":"1 chronicles",
 "2 chr":"2 chronicles","ii chr":"2 chronicles","2ch":"2 chronicles","2 chron":"2 chronicles",
 "ezr":"ezra","neh":"nehemiah","ne":"nehemiah","esth":"esther","es":"esther",
 "ps":"psalms","psa":"psalms","psm":"psalms","psalm":"psalms",
 "prov":"proverbs","prv":"proverbs","pr":"proverbs",
 "eccl":"ecclesiastes","qoheleth":"ecclesiastes",
 "song":"song-of-songs","song of solomon":"song-of-songs","song of songs":"song-of-songs","canticles":"song-of-songs",
 "isa":"isaiah","is":"isaiah","jer":"jeremiah","la":"lamentations","lam":"lamentations",
 "ezek":"ezekiel","eze":"ezekiel","ezk":"ezekiel","dan":"daniel","dn":"daniel",
 "hos":"hosea","jl":"joel","joe":"joel","am":"amos","ob":"obadiah","oba":"obadiah",
 "jon":"jonah","mic":"micah","nah":"nahum","hab":"habakkuk","zep":"zephaniah",
 "hag":"haggai","hg":"haggai","zec":"zechariah","zech":"zechariah","mal":"malachi",
 "wis":"wisdom","wisd":"wisdom","wisdom of solomon":"wisdom",
 "sir":"sirach","ecclus":"sirach","ecclesiasticus":"sirach",
 "1 mac":"1 maccabees","1 macc":"1 maccabees","i maccabees":"1 maccabees",
 "2 mac":"2 maccabees","2 macc":"2 maccabees","ii maccabees":"2 maccabees",
 "bel":"bel-and-the-dragon","sus":"susanna","pr. azariah":"prayer-of-azariah","prayer of azariah":"prayer-of-azariah",
 "additions to esther":"additions-to-esther",
 "mt":"matthew","mk":"mark","mr":"mark","lk":"luke","lu":"luke","jn":"john","joh":"john",
 "ac":"acts","act":"acts","rom":"romans","rm":"romans",
 "1 cor":"1 corinthians","i cor":"1 corinthians","1co":"1 corinthians",
 "2 cor":"2 corinthians","ii cor":"2 corinthians","2co":"2 corinthians",
 "gal":"galatians","eph":"ephesians","php":"philippians","phil":"philippians","col":"colossians",
 "1 th":"1 thessalonians","i thess":"1 thessalonians","1 thes":"1 thessalonians",
 "2 th":"2 thessalonians","ii thess":"2 thessalonians","2 thes":"2 thessalonians",
 "1 tim":"1 timothy","i tim":"1 timothy","2 tim":"2 timothy","ii tim":"2 timothy",
 "tit":"titus","phm":"philemon","heb":"hebrews","jas":"james","jm":"james",
 "1 pet":"1 peter","i pet":"1 peter","2 pet":"2 peter","ii pet":"2 peter",
 "1 jn":"1 john","i jn":"1 john","2 jn":"2 john","ii jn":"2 john","3 jn":"3 john","iii jn":"3 john",
 "jud":"jude","rev":"revelation","apoc":"revelation","re":"revelation"
}

def canonical_book(book):
    b = stripdot(book)
    b = b.replace("bel and the dragon","bel-and-the-dragon").replace("song of songs","song-of-songs")
    return ALIASES.get(b, b)

def split_series(refs):
    s = squeeze(ndash(refs))
    return [x.strip() for x in re.split(r"[;|,]", s) if x.strip()]

def full_parse(piece):
    m = re.match(r"^((?:[1-3]|\bI{1,3}\b)\s+)?([A-Za-z][A-Za-z .'-]+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$", piece, re.I)
    if not m: return None
    numeral = (m.group(1) or "").strip()
    book = canonical_book(m.group(2))
    ch = int(m.group(3))
    v1 = int(m.group(4)) if m.group(4) else None
    v2 = int(m.group(5)) if m.group(5) else None
    if numeral and numeral.upper() in {"I","II","III"}:
        numeral_map={"I":"1","II":"2","III":"3"}
        book = f"{numeral_map[numeral.upper()]} {book}"
    elif numeral.isdigit():
        book = f"{numeral} {book}"
    return book, ch, v1, v2

def cont_cv(piece):
    m = re.match(r"^(\d+):(\d+)(?:-(\d+))?$", piece)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3)) if m and m.group(3) else None) if m else None

def cont_v(piece):
    m = re.match(r"^(\d+)(?:-(\d+))?$", piece)
    return (int(m.group(1)), int(m.group(2)) if m and m.group(2) else None) if m else None

def normalize_refs(refs):
    last_book = last_ch = None
    out = []
    for token in split_series(refs):
        p = full_parse(token)
        if p:
            book,ch,v1,v2 = p
            last_book, last_ch = book, ch
        else:
            pcv = cont_cv(token)
            if pcv and last_book:
                ch,v1,v2 = pcv
                last_ch = ch
                book = last_book
            else:
                pv = cont_v(token)
                if pv and last_book and last_ch:
                    v1,v2 = pv
                    book, ch = last_book, last_ch
                else:
                    out.append({"label": token}); continue
        canon_slug = CANON.get(book)
        if not canon_slug:
            out.append({"label": token}); continue
        canon, slug = canon_slug
        item = {"label": f"{book.title()} {ch}" + (f":{v1}" if v1 else "") + (f"-{v2}" if v2 else "")}
        item.update({"canon": canon, "slug": slug, "ch": ch})
        if v1 is not None: item["vStart"]=v1
        if v2 is not None: item["vEnd"]=v2
        out.append(item)
    return out

def process_entry(e):
    changed = False
    for k in ("bible_refs","biblical_refs","refs"):
        r = e.get(k)
        if isinstance(r, str):
            e[k] = normalize_refs(r); changed = True
        elif isinstance(r, list):
            new_list=[]
            for x in r:
                if isinstance(x, str):
                    new_list += normalize_refs(x); changed = True
                else:
                    new_list.append(x)
            e[k] = new_list
    return changed

data = json.loads(DICT.read_text(encoding="utf-8"))
entries = data if isinstance(data,list) else data.get("entries",[])
changed_count=0
for e in entries:
    if process_entry(e): changed_count+=1

if isinstance(data,list):
    DICT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
else:
    data["entries"]=entries
    DICT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Normalized entries: {changed_count}")
