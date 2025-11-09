import json, pathlib, re, sys, csv

DICT = pathlib.Path("data/israelite_dictionary.json")
FIXES = pathlib.Path("tmp/bible_link_fixes.tsv")

def ndash(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
def norm_label(s): return re.sub(r"\s+"," ", ndash(s or "").strip()).lower().replace(".", "")
def only_digits(s):
    try: return int(str(s).strip())
    except: return None

ALIASES = {
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
 "sus":"susanna","susanna":"susanna","bel and the dragon":"bel-and-the-dragon","bel":"bel-and-the-dragon","bel-and-the-dragon":"bel-and-the-dragon",
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

def parse_label(label):
    t = norm_label(label)
    m = re.match(r"^((?:[1-3]\s+)?[a-z][a-z '\-]+?)\s+(\d+)(?::(\d+))?", t)
    if not m: return None, None
    book = ALIASES.get(m.group(1).strip(), m.group(1).strip())
    ch   = only_digits(m.group(2))
    return book, ch

def load_entries(path):
    j=json.loads(path.read_text(encoding="utf-8"))
    if isinstance(j, list):
        return j, "list", None
    return j.get("entries", []), "wrapped", j

# Load suggestions
fix_map = {}
with FIXES.open(encoding="utf-8") as f:
    r = csv.DictReader(f, delimiter="\t")
    for row in r:
        try:
            idx = int(row["entry_index"])
        except:
            continue
        fix_map.setdefault(idx, []).append({
            "label": row.get("label","").strip(),
            "canon": (row.get("canon","") or "").strip(),
            "slug": (row.get("slug","") or "").strip(),
            "ch": row.get("ch","").strip(),
            "book": parse_label(row.get("label",""))[0],
            "ch_int": only_digits(parse_label(row.get("label",""))[1])
        })

entries, mode, root = load_entries(DICT)
applied = 0
skipped = 0

for idx, fixes in fix_map.items():
    if idx < 0 or idx >= len(entries):
        skipped += len(fixes)
        continue
    e = entries[idx]
    refs_arr = None
    for k in ("bible_refs","biblical_refs","refs"):
        if isinstance(e.get(k), list):
            refs_arr = e[k]
            break
    if refs_arr is None:
        skipped += len(fixes)
        continue

    # Precompute parsed info for each ref in entry
    parsed_refs = []
    for ref in refs_arr:
        if not isinstance(ref, dict): 
            parsed_refs.append(None); 
            continue
        lbl = ref.get("label","")
        b, c = parse_label(lbl)
        parsed_refs.append({"book": b, "ch": c, "label_norm": norm_label(lbl)})

    for fx in fixes:
        matched_any = False
        target_ch = only_digits(fx["ch"]) or fx["ch_int"]
        for ref, meta in zip(refs_arr, parsed_refs):
            if not isinstance(ref, dict): 
                continue
            if ref.get("canon") and ref.get("slug") and ref.get("ch"):
                continue
            ln = norm_label(ref.get("label",""))
            # Match priority: exact label → book+chapter → same chapter with missing canon/slug
            strict = ln == norm_label(fx["label"])
            book_ch = meta and fx["book"] and meta["book"] == fx["book"] and (target_ch is None or meta["ch"] == target_ch)
            ch_only = meta and (target_ch is not None) and (meta["ch"] == target_ch)
            if strict or book_ch or ch_only:
                changed = False
                if fx["canon"] and ref.get("canon") != fx["canon"]:
                    ref["canon"] = fx["canon"]; changed = True
                if fx["slug"] and ref.get("slug") != fx["slug"]:
                    ref["slug"] = fx["slug"]; changed = True
                if target_ch and not ref.get("ch"):
                    ref["ch"] = target_ch; changed = True
                if changed:
                    applied += 1
                    matched_any = True
        if not matched_any:
            skipped += 1

# Write back
if mode == "wrapped":
    root["entries"] = entries
    DICT.write_text(json.dumps(root, ensure_ascii=False, indent=2), encoding="utf-8")
else:
    DICT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Applied: {applied} | Skipped: {skipped}")
