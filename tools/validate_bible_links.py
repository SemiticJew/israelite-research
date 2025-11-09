import json, re, pathlib

BASE="/israelite-research"
DICT=pathlib.Path("data/israelite_dictionary.json")
OUT=pathlib.Path("tmp/bible_link_audit.tsv")

def ndash(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
def squeeze(s): return re.sub(r"\s+", " ", s or "").strip()
def strip_punct(s): return re.sub(r"[.,;:]+$", "", s or "")

TANAKH_LIST = [
 ("genesis","genesis"),("exodus","exodus"),("leviticus","leviticus"),("numbers","numbers"),("deuteronomy","deuteronomy"),
 ("joshua","joshua"),("judges","judges"),("ruth","ruth"),
 ("1 samuel","1-samuel"),("2 samuel","2-samuel"),
 ("1 kings","1-kings"),("2 kings","2-kings"),
 ("1 chronicles","1-chronicles"),("2 chronicles","2-chronicles"),
 ("ezra","ezra"),("nehemiah","nehemiah"),("esther","esther"),("job","job"),
 ("psalms","psalms"),("proverbs","proverbs"),("ecclesiastes","ecclesiastes"),("song-of-songs","song-of-songs"),
 ("isaiah","isaiah"),("jeremiah","jeremiah"),("lamentations","lamentations"),("ezekiel","ezekiel"),("daniel","daniel"),
 ("hosea","hosea"),("joel","joel"),("amos","amos"),("obadiah","obadiah"),("jonah","jonah"),("micah","micah"),
 ("nahum","nahum"),("habakkuk","habakkuk"),("zephaniah","zephaniah"),("haggai","haggai"),("zechariah","zechariah"),("malachi","malachi"),
]
APOC_LIST = [
 ("tobit","tobit"),("judith","judith"),("wisdom","wisdom"),("sirach","sirach"),("baruch","baruch"),
 ("1 maccabees","1-maccabees"),("2 maccabees","2-maccabees"),
 ("susanna","susanna"),("bel-and-the-dragon","bel-and-the-dragon"),("prayer-of-azariah","prayer-of-azariah"),("additions-to-esther","additions-to-esther"),
]
NT_LIST = [
 ("matthew","matthew"),("mark","mark"),("luke","luke"),("john","john"),("acts","acts"),("romans","romans"),
 ("1 corinthians","1-corinthians"),("2 corinthians","2-corinthians"),
 ("galatians","galatians"),("ephesians","ephesians"),("philippians","philippians"),("colossians","colossians"),
 ("1 thessalonians","1-thessalonians"),("2 thessalonians","2-thessalonians"),
 ("1 timothy","1-timothy"),("2 timothy","2-timothy"),("titus","titus"),("philemon","philemon"),
 ("hebrews","hebrews"),("james","james"),("1 peter","1-peter"),("2 peter","2-peter"),
 ("1 john","1-john"),("2 john","2-john"),("3 john","3-john"),("jude","jude"),("revelation","revelation"),
]

CANON_SLUG = {name:( "tanakh", slug) for name,slug in TANAKH_LIST}
CANON_SLUG.update({name:( "apocrypha", slug) for name,slug in APOC_LIST})
CANON_SLUG.update({name:( "new-testament", slug) for name,slug in NT_LIST})

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
 "ezek":"ezekiel","eze":"ezekiel","ezk":"ezekiel",
 "dan":"daniel","dn":"daniel",
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

def canonicalize(book):
    b = squeeze(book).lower().replace(".","")
    b = b.replace("bel and the dragon","bel-and-the-dragon").replace("song of songs","song-of-songs")
    return ALIASES.get(b, b)

def infer_from_label(label):
    t = ndash(label or "")
    m = re.match(r"^((?:[1-3]\s+)?[A-Za-z][A-Za-z .'-]+?)\s+(\d+):(\d+)", t)
    if not m: return None
    book = canonicalize(m.group(1))
    ch   = int(m.group(2))
    v    = int(m.group(3))
    canon_slug = CANON_SLUG.get(book)
    if not canon_slug: return None
    canon, slug = canon_slug
    return canon, slug, ch, v

def build_url(canon, slug, ch, v=None):
    if canon=="apocrypha":
        return f"{BASE}/apocrypha/chapter.html?book={slug}&ch={ch}"
    if canon=="tanakh":
        return f"{BASE}/tanakh/chapter.html?book={slug}&ch={ch}"+(f"#v{v}" if v else "")
    if canon=="new-testament":
        return f"{BASE}/new-testament/chapter.html?book={slug}&ch={ch}"+(f"#v{v}" if v else "")
    return None

def load_entries(p):
    j=json.loads(p.read_text())
    return j if isinstance(j,list) else j.get("entries",[])

rows=[]
for i,e in enumerate(load_entries(DICT)):
    refs = e.get("bible_refs") or e.get("biblical_refs") or e.get("refs") or []
    if isinstance(refs, str):
        refs = []
    for r in refs:
        if not isinstance(r, dict):
            continue
        canon = r.get("canon")
        slug  = r.get("slug")
        ch    = r.get("ch")
        v     = r.get("vStart") or r.get("v") or None
        if canon and slug and ch:
            url = build_url(canon, slug, ch, v)
            status = "OK" if url else "FAIL"
        else:
            inf = infer_from_label(r.get("label",""))
            if inf:
                canon, slug, ch, v = inf
                url = build_url(canon, slug, ch, v)
                status = "OK" if url else "FAIL"
            else:
                url = ""
                status = "FAIL"
        rows.append([i, e.get("headword",""), r.get("label",""), status, canon or "", slug or "", ch or "", v or "", url])

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w",encoding="utf-8") as f:
    f.write("idx\theadword\tlabel\tstatus\tcanon\tslug\tch\tv\turl\n")
    for row in rows:
        f.write("\t".join(str(x) for x in row)+"\n")

print(f"Wrote {OUT} with {sum(1 for r in rows if r[3]=='OK')} OK / {len(rows)} total")
