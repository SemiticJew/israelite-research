import json, re, pathlib, csv

DICT = pathlib.Path("data/israelite_dictionary.json")
OUT  = pathlib.Path("tmp/apocrypha_suggestions.tsv")

def text_of(e):
    parts = [
        e.get("headword",""),
        e.get("definition",""),
        e.get("summary",""),
        e.get("usage_notes",""),
        ",".join(e.get("see_also",[])) if isinstance(e.get("see_also"), list) else e.get("see_also",""),
    ]
    return (" ".join(p for p in parts if p)).lower()

def has_apoc(e):
    for k in ("bible_refs","biblical_refs","refs"):
        v = e.get(k)
        if isinstance(v, list):
            for r in v:
                if isinstance(r, dict) and r.get("canon") == "apocrypha":
                    return True
    return False

# Curated themes -> suggested apocrypha reference + short rationale
THEMES = [
    # Hellenism / Alexander / Greek empire / horns (Daniel 8 context)
    (r"\b(alexander|macedon|greek|greece|hellen|he-?goat|goat|little horn|notable horn|daniel 8)\b",
     {"label":"1 Maccabees 1:1–4","slug":"1-maccabees","ch":1,"vStart":1,"rationale":"Hellenistic conquest under Alexander; historical prologue."}),
    # Idolatry, idols, images
    (r"\b(idol|idolatry|graven|images?)\b",
     {"label":"Wisdom 14:12","slug":"wisdom","ch":14,"vStart":12,"rationale":"Origin and vanity of idolatry."}),
    # Practical wisdom / instruction
    (r"\b(wisdom|instruction|prudence|understanding|fear of the lord)\b",
     {"label":"Sirach 1:1","slug":"sirach","ch":1,"vStart":1,"rationale":"The source and order of wisdom."}),
    # Almsgiving / charity / mercy
    (r"\b(alms?|almsgiving|charit(y|able)|give to the (poor|needy))\b",
     {"label":"Tobit 12:8–9","slug":"tobit","ch":12,"vStart":8,"rationale":"Almsgiving commended; its spiritual value."}),
    # Courage / deliverance in trial by fire
    (r"\b(furnace|fire|deliverance|faith under trial|azariah|hananiah|mishael)\b",
     {"label":"Prayer of Azariah 1:1","slug":"prayer-of-azariah","ch":1,"vStart":1,"rationale":"Prayer in the fiery furnace; steadfast faith."}),
    # Righteous judgment / false accusation
    (r"\b(false witness|false accusation|chaste|innocen(t|ce)|judge(ment)?\b)",
     {"label":"Susanna 1:63","slug":"susanna","ch":1,"vStart":63,"rationale":"Vindication from false accusers."}),
    # Dragon/Bel, temple frauds, exposure of idols
    (r"\b(bel|dragon|feed(ing)? the dragon|expos(e|ing) idols?)\b",
     {"label":"Bel and the Dragon 1:1","slug":"bel-and-the-dragon","ch":1,"vStart":1,"rationale":"Refutation of idolatry via Bel and the Dragon narratives."}),
    # Esther court intrigue / royal decrees (apocryphal additions)
    (r"\b(esther|mordecai|edict|royal decree)\b",
     {"label":"Additions to Esther 13:5","slug":"additions-to-esther","ch":13,"vStart":5,"rationale":"Royal decree context in Esther additions."}),
    # Heroic deliverance from oppressors
    (r"\b(judith|oppressor(s)?|deliverance|besieg(e|ed)|assyria(ns)?)\b",
     {"label":"Judith 8:14","slug":"judith","ch":8,"vStart":14,"rationale":"Judith counsels trust and action under siege."}),
    # Covenant remembrance / exile reflection
    (r"\b(exile|captiv(e|ity)|return|remnant|confession|peniten(ce|t))\b",
     {"label":"Baruch 4:1","slug":"baruch","ch":4,"vStart":1,"rationale":"Torah as the way of life in exile reflection."}),
    # Martyrdom / persecution / resurrection hope
    (r"\b(martyr(dom)?|persecut(ion|ed)|seven brothers|torture|resurrection)\b",
     {"label":"2 Maccabees 7:9","slug":"2-maccabees","ch":7,"vStart":9,"rationale":"Martyrdom and explicit hope in resurrection."}),
]

def pick_suggestion(text):
    for pat, sug in THEMES:
        if re.search(pat, text):
            return sug
    return None

def load_entries(p):
    j=json.loads(p.read_text(encoding="utf-8"))
    return j if isinstance(j,list) else j.get("entries",[])

entries = load_entries(DICT)
rows = []
for i,e in enumerate(entries):
    t = text_of(e)
    sug = pick_suggestion(t)
    has = has_apoc(e)
    rows.append({
        "index": i,
        "headword": e.get("headword",""),
        "has_apocrypha": "yes" if has else "no",
        "suggested_label": (sug or {}).get("label",""),
        "slug": (sug or {}).get("slug",""),
        "ch": (sug or {}).get("ch",""),
        "vStart": (sug or {}).get("vStart",""),
        "rationale": (sug or {}).get("rationale",""),
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["index","headword","has_apocrypha","suggested_label","slug","ch","vStart","rationale"], delimiter="\t")
    w.writeheader()
    for r in rows:
        w.writerow(r)

print(f"Wrote {OUT} with {len(rows)} rows")
