import json, pathlib

DICT = pathlib.Path("data/israelite_dictionary.json")

CURATED = [
  {
    "match": r"^abraham$",
    "ref": {"label":"Sirach 44:19–21","canon":"apocrypha","slug":"sirach","ch":44,"vStart":19}
  },
  {
    "match": r"^alexander the great$",
    "ref": {"label":"1 Maccabees 1:1–4","canon":"apocrypha","slug":"1-maccabees","ch":1,"vStart":1}
  },
  {
    "match": r"^clean animals$",
    "ref": {"label":"2 Maccabees 6:18","canon":"apocrypha","slug":"2-maccabees","ch":6,"vStart":18}
  },
  {
    "match": r"^unclean animals$",
    "ref": {"label":"2 Maccabees 6:18","canon":"apocrypha","slug":"2-maccabees","ch":6,"vStart":18}
  },
  {
    "match": r"^he-goat \(daniel’s vision\)$|^he-goat \(daniel's vision\)$|^he[- ]goat \(daniel.?s vision\)$",
    "ref": {"label":"1 Maccabees 1:1","canon":"apocrypha","slug":"1-maccabees","ch":1,"vStart":1}
  },
]

import re

def load_entries(p):
    j = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(j, list):
        return j, "list", None
    return j.get("entries", []), "wrapped", j

def refs_array(entry):
    for k in ("bible_refs","biblical_refs","refs"):
        v = entry.get(k)
        if isinstance(v, list):
            return v, k
    entry.setdefault("bible_refs", [])
    return entry["bible_refs"], "bible_refs"

def already_has(arr, slug, ch, vStart):
    for r in arr:
        if isinstance(r, dict) and r.get("canon")=="apocrypha" and r.get("slug")==slug and r.get("ch")==ch:
            # If verse matches or no verse to compare, treat as existing
            if ("vStart" not in r) or r.get("vStart")==vStart:
                return True
    return False

entries, mode, root = load_entries(DICT)

added = 0
for e in entries:
    head = (e.get("headword") or "").strip().lower()
    for rule in CURATED:
        if re.search(rule["match"], head, flags=re.IGNORECASE):
            arr, key = refs_array(e)
            r = rule["ref"]
            if not already_has(arr, r["slug"], r["ch"], r["vStart"]):
                arr.append(dict(r))
                added += 1
            break  # one curated add per entry

if mode == "wrapped":
    root["entries"] = entries
    DICT.write_text(json.dumps(root, ensure_ascii=False, indent=2), encoding="utf-8")
else:
    DICT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Curated additions applied: {added}")
