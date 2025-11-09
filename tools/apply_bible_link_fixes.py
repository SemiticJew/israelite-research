import json, pathlib, re, sys, csv

DICT = pathlib.Path("data/israelite_dictionary.json")
FIXES = pathlib.Path("tmp/bible_link_fixes.tsv")

def ndash(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
def norm_label(s): return re.sub(r"\s+"," ", ndash(s or "").strip()).lower()

def load_entries(p):
    j=json.loads(p.read_text(encoding="utf-8"))
    if isinstance(j, list):
        return j, "list"
    return j.get("entries", []), "wrapped", j

# Load fixes
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
        })

entries, mode, *rest = load_entries(DICT)
if not entries:
    print("No entries found.")
    sys.exit(0)

applied = 0
skipped = 0

for idx, fixes in fix_map.items():
    if idx < 0 or idx >= len(entries):
        skipped += len(fixes)
        continue
    e = entries[idx]
    # Determine refs array key
    refs_arr = None
    key_used = None
    for k in ("bible_refs","biblical_refs","refs"):
        if isinstance(e.get(k), list):
            refs_arr = e[k]
            key_used = k
            break
    if refs_arr is None:
        skipped += len(fixes)
        continue

    # Build lookup by normalized label
    by_label = {}
    for ref in refs_arr:
        if isinstance(ref, dict):
            by_label.setdefault(norm_label(ref.get("label","")), []).append(ref)

    for fx in fixes:
        lbl = fx["label"]
        target = by_label.get(norm_label(lbl), [])
        if not target:
            skipped += 1
            continue
        # apply to all matching labels in this entry
        for ref in target:
            changed = False
            if fx["canon"] and ref.get("canon") != fx["canon"]:
                ref["canon"] = fx["canon"]; changed = True
            if fx["slug"] and ref.get("slug") != fx["slug"]:
                ref["slug"] = fx["slug"]; changed = True
            if fx["ch"] and not ref.get("ch"):
                # Try to coerce int if numeric; otherwise leave as-is
                ch = fx["ch"]
                try: ch = int(ch)
                except: pass
                ref["ch"] = ch; changed = True
            if changed:
                applied += 1
            else:
                skipped += 1

# Write back
if mode == "wrapped":
    root = rest[0]
    root["entries"] = entries
    DICT.write_text(json.dumps(root, ensure_ascii=False, indent=2), encoding="utf-8")
else:
    DICT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Applied: {applied} | Skipped: {skipped}")
