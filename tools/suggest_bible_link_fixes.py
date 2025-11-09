import json, re, pathlib

DICT = pathlib.Path("data/israelite_dictionary.json")
FAILS = pathlib.Path("tmp/bible_link_audit.tsv")
OUT = pathlib.Path("tmp/bible_link_fixes.tsv")

def ndash(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
def squeeze(s): return re.sub(r"\s+", " ", s or "").strip()
def stripdot(s): return (s or "").replace(".","").strip().lower()

CANON_MAP = {
  "tanakh":"tanakh",
  "apocrypha":"apocrypha",
  "new-testament":"new-testament",
  "nt":"new-testament",
  "old-testament":"tanakh",
  "ot":"tanakh",
}

ALIAS_BOOK = {
 "gen":"genesis","ge":"genesis","gn":"genesis","genesis":"genesis",
 "ex":"exodus","exo":"exodus","exod":"exodus","exodus":"exodus",
 "lev":"leviticus","lv":"leviticus","leviticus":"leviticus",
 "num":"numbers","nu":"numbers","nm":"numbers","nb":"numbers","numbers":"numbers",
 "deut":"deuteronomy","deu":"deuteronomy","dt":"deuteronomy","deuteronomy":"deuteronomy",
 "dan":"daniel","dn":"daniel","daniel":"daniel",
 "isa":"isaiah","is":"isaiah","isaiah":"isaiah",
 "wis":"wisdom","wisd":"wisdom","wisdom of solomon":"wisdom","wisdom":"wisdom",
 "sir":"sirach","ecclus":"sirach","ecclesiasticus":"sirach","sirach":"sirach",
 "1 mac":"1 maccabees","1 macc":"1 maccabees","i maccabees":"1 maccabees","1 maccabees":"1 maccabees",
 "2 mac":"2 maccabees","2 macc":"2 maccabees","ii maccabees":"2 maccabees","2 maccabees":"2 maccabees",
 "sus":"susanna","susanna":"susanna",
 "bel and the dragon":"bel-and-the-dragon","bel":"bel-and-the-dragon","bel-and-the-dragon":"bel-and-the-dragon",
 "additions to esther":"additions-to-esther","prayer of azariah":"prayer-of-azariah","pr. azariah":"prayer-of-azariah",
 "matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts","romans":"romans",
 "1 cor":"1 corinthians","1 corinthians":"1 corinthians","2 cor":"2 corinthians","2 corinthians":"2 corinthians",
 "galatians":"galatians","ephesians":"ephesians","philippians":"philippians","colossians":"colossians",
 "1 th":"1 thessalonians","1 thessalonians":"1 thessalonians",
 "2 th":"2 thessalonians","2 thessalonians":"2 thessalonians",
 "1 tim":"1 timothy","1 timothy":"1 timothy","2 tim":"2 timothy","2 timothy":"2 timothy",
 "titus":"titus","philemon":"philemon","hebrews":"hebrews","james":"james",
 "1 peter":"1 peter","2 peter":"2 peter","1 john":"1 john","2 john":"2 john","3 john":"3 john","jude":"jude","revelation":"revelation","rev":"revelation"
}

SLUG = {
 "genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numbers":"numbers","deuteronomy":"deuteronomy",
 "daniel":"daniel","isaiah":"isaiah",
 "1 maccabees":"1-maccabees","2 maccabees":"2-maccabees","wisdom":"wisdom","sirach":"sirach",
 "susanna":"susanna","bel-and-the-dragon":"bel-and-the-dragon","prayer-of-azariah":"prayer-of-azariah","additions-to-esther":"additions-to-esther",
 "matthew":"matthew","mark":"mark","luke":"luke","john":"john","acts":"acts","romans":"romans",
 "1 corinthians":"1-corinthians","2 corinthians":"2-corinthians","galatians":"galatians",
 "ephesians":"ephesians","philippians":"philippians","colossians":"colossians",
 "1 thessalonians":"1-thessalonians","2 thessalonians":"2-thessalonians",
 "1 timothy":"1-timothy","2 timothy":"2-timothy","titus":"titus","philemon":"philemon",
 "hebrews":"hebrews","james":"james","1 peter":"1-peter","2 peter":"2-peter",
 "1 john":"1-john","2 john":"2-john","3 john":"3-john","jude":"jude","revelation":"revelation"
}

def infer(label):
    t = ndash(label or "")
    m = re.match(r"^((?:[1-3]\s+)?[A-Za-z][A-Za-z .'-]+)", t)
    if not m: return None,None
    raw = stripdot(m.group(1))
    raw = ALIAS_BOOK.get(raw, raw)
    if raw in SLUG:
        if raw in ("wisdom","sirach","1 maccabees","2 maccabees","susanna","bel-and-the-dragon","prayer-of-azariah","additions-to-esther"):
            return "apocrypha", SLUG[raw]
        if raw in ("matthew","mark","luke","john","acts","romans","1 corinthians","2 corinthians","galatians","ephesians","philippians","colossians","1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon","hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation"):
            return "new-testament", SLUG[raw]
        return "tanakh", SLUG[raw]
    return None,None

fails = []
with FAILS.open() as f:
    header = next(f, "")
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 7: continue
        status = parts[3]
        if status == "OK": continue
        idx, head, label, _, canon, slug, ch = parts[:7]
        canon = (canon or "").strip().lower()
        slug = (slug or "").strip().lower()
        label = label.strip()
        if not canon or not slug:
            ic, islug = infer(label)
            if ic and islug:
                canon, slug = ic, islug
        if canon in CANON_MAP: canon = CANON_MAP[canon]
        fails.append([idx, head, label, canon, slug, ch])

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w", encoding="utf-8") as f:
    f.write("entry_index\theadword\tlabel\tcanon\tslug\tch\n")
    for row in fails:
        f.write("\t".join(str(x) for x in row) + "\n")

print(f"Wrote {OUT} with {len(fails)} suggestions")
