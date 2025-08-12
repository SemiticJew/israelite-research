import os, json, re, sys
canon = (sys.argv[1] if len(sys.argv)>1 else "tanakh").strip()
root = os.path.join("data", canon)
if not os.path.isdir(root):
    raise SystemExit(f"Missing folder: {root}")
counts = {}
for book in sorted(os.listdir(root)):
    bdir = os.path.join(root, book)
    if not os.path.isdir(bdir):
        continue
    bjson = os.path.join(bdir, "book.json")
    if os.path.isfile(bjson):
        with open(bjson, "r", encoding="utf-8") as f:
            data = json.load(f)
        counts[book] = len(data.get("chapters", []))
        continue
    chaps = []
    for name in os.listdir(bdir):
        if name.endswith(".json") and name != "book.json":
            m = re.match(r"(\d+)\.json$", name)
            if m:
                chaps.append(int(m.group(1)))
    counts[book] = max(chaps) if chaps else 1
out_path = os.path.join(root, "books.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(counts, f, ensure_ascii=False, indent=2)
print(f"Wrote {out_path} with {len(counts)} entries.")
