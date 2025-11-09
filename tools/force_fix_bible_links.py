import json, re, pathlib, csv

DICT = pathlib.Path("data/israelite_dictionary.json")
AUD  = pathlib.Path("tmp/bible_link_audit.tsv")

def ndash(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
def normlabel(s): return re.sub(r"\s+"," ", ndash((s or "").strip()).lower().replace(".",""))

ALIASES = {
 "gen":"genesis","ge":"genesis","gn":"genesis","genesis":"genesis",
 "ex":"exodus","exo":"exodus","exod":"exodus","exodus":"exodus",
 "lev":"leviticus","lv":"leviticus","leviticus":"leviticus",
 "num":"numbers","nu":"numbers","nm":"numbers","nb":"numbers","numbers":"numbers",
 "deut":"deuteronomy","deu":"deuteronomy","dt":"deuteronomy","deuteronomy":"deuteronomy",
 "josh":"joshua","jos":"joshua","joshua":"joshua",
 "judg":"judges","jdg":"judges","judges":"judges",
 "ruth":"ruth",
 "1 sam":"1 samuel","i sam":"1 samuel","1sa":"1 samuel","1 sm":"1 samuel","1 samuel":"1 samuel",
 "2 sam":"2 samuel","ii sam":"2 samuel","2sa":"2 samuel","2 sm":"2 samuel","2 samuel":"2 samuel",
 "1 kgs":"1 kings","i kgs":"1 kings","1ki":"1 kings","1kgs":"1 kings","1 kings":"1 kings",
 "2 kgs":"2 kings","ii kgs":"2 kings","2ki":"2 kings","2kgs":"2 kings","2 kings":"2 kings",
 "1 chr":"1 chronicles","i chr":"1 chronicles","1ch":"1 chronicles","1 chron":"1 chronicles","1 chronicles":"1 chronicles",
 "2 chr":"2 chronicles","ii chr":"2 chronicles","2ch":"2 chronicles","2 chron":"2 chronicles","2 chronicles":"2 chronicles",
 "ezra":"ezra","nehemiah":"nehemiah","esther":"esther","job":"job",
 "ps":"psalms","psa":"psalms","psalm":"psalms","psalms":"psalms",
 "prov":"proverbs","proverbs":"proverbs",
 "eccl":"ecclesiastes","ecclesiastes":"ecclesiastes","song":"song-of-songs","song of songs":"song-of-songs","song of solomon":"song-of-songs","song-of-songs":"song-of-songs",
 "isa":"isaiah","isaiah":"isaiah","jer":"jeremiah","jeremiah":"jeremiah","lam":"lamentations","lamentations":"lamentations",
 "ezek":"ezekiel","ezekiel":"ezekiel","dan":"daniel","dn":"daniel","daniel":"daniel",
 "hos":"hosea","hosea":"hosea","joel":"joel","amos":"amos","obadiah":"obadiah","jonah":"jonah","micah":"micah",
 "nahum":"nahum","habakkuk":"habakkuk","zephaniah":"zephaniah","haggai":"haggai","zechariah":"zechariah","malachi":"malachi",
 "wis":"wisdom","wisd":"wisdom","wisdom":"wisdom","wisdom of solomon":"wisdom",
 "sir":"sirach","ecclus":"sirach","ecclesiasticus":"sirach","sirach":"sirach",
 "tobit":"tobit","judith":"judith","baruch":"baruch","sus":"susanna","susanna":"susanna",
 "bel":"bel-and-the-dragon","bel and the dragon":"bel-and-the-dragon","bel-and-the-dragon":"bel-and-the-dragon",
 "pr. azariah":"prayer-of-azariah","prayer of azariah":"prayer-of-azariah","prayer-of-azariah":"prayer-of-azariah",
 "additions to esther":"additions-to-esther","additions-to-esther":"additions-to-esther",
 "1 mac":"1 maccabees","1 macc":"1 maccabees","i maccabees":"1 maccabees","1 maccabees":"1 maccabees",
 "2 mac":"2 maccabees","2 macc":"2 maccabees","ii maccabees":"2 maccabees","2 maccabees":"2 maccabees",
 "matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts","romans":"romans",
 "1 cor":"1 corinthians","1 corinthians":"1 corinthians","2 cor":"2 corinthians","2 corinthians":"2 corinthians",
 "galatians":"galatians","ephesians":"ephesians","philippians":"philippians","colossians":"colossians",
 "1 th":"1 thessalonians","1 thessalonians":"1 thessalonians","2 th":"2 thessalonians","2 thessalonians":"2 thessalonians",
 "1 tim":"1 timothy","1 timothy":"1 timothy","2 tim":"2 timothy","2 timothy":"2 timothy",
 "titus":"titus","philemon":"philemon","hebrews":"hebrews","james":"james",
 "1 peter":"1 peter","2 peter":"2 peter","1 john":"1 john","2 john":"2 john","3 john":"3 john","jude":"jude","rev":"revelation","revelation":"revelation"
}

SLUG = {
 **{k:v for k,v in {
 "genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numbers":"numbers","deuteronomy":"deuteronomy",
 "joshua":"joshua","judges":"judges","ruth":"ruth","1 samuel":"1-samuel","2 samuel":"2-samuel",
 "1 kings":"1-kings","2 kings":"2-kings","1 chronicles":"1-chronicles","2 chronicles":"2-chronicles",
 "ezra":"ezra","nehemiah":"nehemiah","esther":"esther","job":"job","psalms":"psalms","proverbs":"proverbs",
 "ecclesiastes":"ecclesiastes","song-of-songs":"song-of-songs","isaiah":"isaiah","jeremiah":"jeremiah","lamentations":"lamentations",
 "ezekiel":"ezekiel","daniel":"daniel","hosea":"hosea","joel":"joel","amos":"amos","obadiah":"obadiah","jonah":"jonah","micah":"micah",
 "nahum":"nahum","habakkuk":"habakkuk","zephaniah":"zephaniah","haggai":"haggai","zechariah":"zechariah","malachi":"malachi"
}.items()},
 **{k:v for k,v in {
 "tobit":"tobit","judith":"judith","wisdom":"wisdom","sirach":"sirach","baruch":"baruch",
 "1 maccabees":"1-maccabees","2 maccabees":"2-maccabees","susanna":"susanna","bel-and-the-dragon":"bel-and-the-dragon",
 "prayer-of-azariah":"prayer-of-azariah","additions-to-esther":"additions-to-esther"
}.items()},
 **{k:v for k,v in {
 "matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts","romans":"romans",
 "1 corinthians":"1-corinthians","2 corinthians":"2-corinthians","galatians":"galatians","ephesians":"ephesians",
 "philippians":"philippians","colossians":"colossians","1 thessalonians":"1-thessalonians","2 thessalonians":"2-thessalonians",
 "1 timothy":"1-timothy","2 timothy":"2-timothy","titus":"titus","philemon":"philemon",
 "hebrews":"hebrews","james":"james","1 peter":"1-peter","2 peter":"2-peter",
 "1 john":"1-john","2 john":"2-john","3 john":"3-john","jude":"jude","revelation":"revelation"
}.items()}
}

def detect_canon(book):
    if book in ("wisdom","sirach","1 maccabees","2 maccabees","tobit","judith","baruch","susanna","bel-and-the-dragon","prayer-of-azariah","additions-to-esther"):
        return "apocrypha"
    if book in ("matthew","mark","luke","john","acts","romans","1 corinthians","2 corinthians","galatians","ephesians","philippians","colossians","1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon","hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation"):
        return "new-testament"
    return "tanakh"

def parse_label(label):
    t = normlabel(label)
    m = re.match(r"^((?:[1-3]\s+)?[a-z][a-z '\-]+?)\s+(\d+)(?::(\d+))?", t)
    if not m: return None
    book = ALIASES.get(m.group(1).strip(), m.group(1).strip())
    ch = int(m.group(2))
    v = int(m.group(3)) if m.group(3) else None
    if book not in SLUG: return None
    return detect_canon(book), SLUG[book], ch, v

data = []
with AUD.open(encoding="utf-8") as f:
    r = csv.DictReader(f, delimiter="\t")
    for row in r:
        if row.get("status") == "OK": continue
        data.append(row)

root = json.loads(DICT.read_text(encoding="utf-8"))
entries = root if isinstance(root,list) else root.get("entries",[])
changed = 0

for row in data:
    try: idx = int(row["entry_index"])
    except: continue
    if idx<0 or idx>=len(entries): continue
    e = entries[idx]
    label = row.get("label","")
    parsed = parse_label(label)
    if not parsed: continue
    canon, slug, ch, v = parsed

    # find refs array
    arr = None
    key = None
    for k in ("bible_refs","biblical_refs","refs"):
        if isinstance(e.get(k), list):
            arr = e[k]; key = k; break
    if arr is None: continue

    # try exact label match, else fuzzy by normalized label, else by chapter+book slug present in label
    target_norm = normlabel(label)
    matched_any = False
    for ref in arr:
        if not isinstance(ref, dict): continue
        if normlabel(ref.get("label","")) == target_norm:
            ref["canon"] = canon
            ref["slug"] = slug
            ref["ch"] = ch
            if v and "vStart" not in ref and "v" not in ref: ref["vStart"] = v
            changed += 1
            matched_any = True
    if matched_any: continue

    # second pass: same chapter and either missing slug or mismatched
    for ref in arr:
        if not isinstance(ref, dict): continue
        rn = parse_label(ref.get("label",""))
        if not rn: continue
        _, _, rch, _ = rn
        if rch == ch:
            ref["canon"] = canon
            ref["slug"] = slug
            if "ch" not in ref: ref["ch"] = ch
            changed += 1
            matched_any = True
    # no else; move on if nothing matched

if isinstance(root, list):
    DICT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
else:
    root["entries"]=entries
    DICT.write_text(json.dumps(root, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Applied changes: {changed}")
