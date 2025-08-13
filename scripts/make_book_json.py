import os, json, sys, re

canon = (sys.argv[1] if len(sys.argv)>1 else "tanakh").strip()
book  = (sys.argv[2] if len(sys.argv)>2 else "Genesis").strip()
base  = os.path.join("data", canon, book)

if not os.path.isdir(base):
    raise SystemExit(f"Missing folder: {base}")

chapters = []
for name in sorted(os.listdir(base), key=lambda x: int(re.sub(r'\D','',x) or '0')):
    if not name.endswith(".json") or name == "book.json": 
        continue
    path = os.path.join(base, name)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    chapters.append({
        "chapter": int(data.get("chapter")),
        "verses": data.get("verses", [])
    })

out = {"book": book, "chapters": chapters}
with open(os.path.join(base, "book.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f"Wrote {os.path.join(base,'book.json')} with {len(chapters)} chapters.")
