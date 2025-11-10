import json, pathlib, re

DICT = pathlib.Path("data/israelite_dictionary.json")

THEMES = [
  (r"\b(idol|idolatry|graven|image[s]?)\b",              {"label":"Wisdom 14:12","canon":"apocrypha","slug":"wisdom","ch":14,"vStart":12}),
  (r"\b(exile|captiv(e|ity)|remnant|return|confess|peniten)\b", {"label":"Baruch 4:1","canon":"apocrypha","slug":"baruch","ch":4,"vStart":1}),
  (r"\b(martyr|persecut|seven\s+brothers|resurrection)\b", {"label":"2 Maccabees 7:9","canon":"apocrypha","slug":"2-maccabees","ch":7,"vStart":9}),
  (r"\b(judith|oppressor|besieg|assyria)\b",              {"label":"Judith 8:14","canon":"apocrypha","slug":"judith","ch":8,"vStart":14}),
  (r"\b(esther|mordecai|edict|royal\s+decree)\b",         {"label":"Additions to Esther 13:5","canon":"apocrypha","slug":"additions-to-esther","ch":13,"vStart":5}),
  (r"\b(alms?|almsgiving|charit|give\s+to\s+the\s+(poor|needy))\b", {"label":"Tobit 12:8","canon":"apocrypha","slug":"tobit","ch":12,"vStart":8}),
  (r"\b(wisdom|prudence|understanding|fear\s+of\s+the\s+lord)\b", {"label":"Sirach 1:1","canon":"apocrypha","slug":"sirach","ch":1,"vStart":1}),
  (r"\b(furnace|fire|azariah|hananiah|mishael)\b",        {"label":"Prayer of Azariah 1:1","canon":"apocrypha","slug":"prayer-of-azariah","ch":1,"vStart":1}),
  (r"\b(bel|dragon|expos(e|ing)\s+idol|feed(ing)?\s+the\s+dragon)\b", {"label":"Bel and the Dragon 1:1","canon":"apocrypha","slug":"bel-and-the-dragon","ch":1,"vStart":1}),
  (r"\b(false\s+witness|false\s+accus|chaste|innocen)\b", {"label":"Susanna 1:63","canon":"apocrypha","slug":"susanna","ch":1,"vStart":63}),
]

def text_of(e):
    parts = [
        e.get("headword",""),
        e.get("definition",""),
        e.get("summary",""),
        e.get("usage_notes",""),
        " ".join(e.get("see_also",[]) if isinstance(e.get("see_also"), list) else [e.get("see_also","")]),
    ]
    return " ".join(p for p in parts if p).lower()

def has_apoc(arr):
    return any(isinstance(r,dict) and r.get("canon")=="apocrypha" for r in (arr or []))

def already_has(arr, ref):
    for r in (arr or []):
        if not isinstance(r, dict): continue
        if r.get("canon")=="apocrypha" and r.get("slug")==ref["slug"] and r.get("ch")==ref["ch"]:
            return True
    return False

def refs_array(entry):
    for k in ("bible_refs","biblical_refs","refs"):
        v = entry.get(k)
        if isinstance(v, list):
            return v, k
    entry.setdefault("bible_refs", [])
    return entry["bible_refs"], "bible_refs"

data = json.loads(DICT.read_text(encoding="utf-8"))
entries = data if isinstance(data,list) else data.get("entries",[])

added = 0
for e in entries:
    arr, key = refs_array(e)
    if has_apoc(arr):
        continue
    t = text_of(e)
    for pat, ref in THEMES:
        if re.search(pat, t):
            if not already_has(arr, ref):
                arr.append(dict(ref))
                added += 1
            break

if isinstance(data, list):
    DICT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
else:
    data["entries"]=entries
    DICT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Curated themed additions applied: {added}")
