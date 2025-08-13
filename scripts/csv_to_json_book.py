import csv, json, os, sys

canon = (sys.argv[1] if len(sys.argv)>1 else "tanakh").strip()
book  = (sys.argv[2] if len(sys.argv)>2 else "Genesis").strip()
csv_path = (sys.argv[3] if len(sys.argv)>3 else f"data/{canon}/{book}/{book.lower()}.csv")

base = os.path.join("data", canon, book)
os.makedirs(base, exist_ok=True)

chapters = {}
with open(csv_path, newline='', encoding='utf-8') as f:
    r = csv.DictReader(f)
    for row in r:
        c = int(row['chapter']); v = int(row['verse']); t = row['text']
        chapters.setdefault(c, []).append({
            "num": v,
            "text": t,
            "crossRefs": [],
            "commentary": ""
        })

# Write per-chapter files
for c in sorted(chapters):
    obj = {"book": book, "chapter": c, "verses": sorted(chapters[c], key=lambda x: x["num"])}
    with open(os.path.join(base, f"{c}.json"), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

# Write book.json
book_obj = {"book": book, "chapters": [{"chapter": c, "verses": sorted(chapters[c], key=lambda x: x["num"])} for c in sorted(chapters)]}
with open(os.path.join(base, "book.json"), "w", encoding="utf-8") as f:
    json.dump(book_obj, f, ensure_ascii=False, indent=2)

print(f"Done: wrote {len(chapters)} chapters and book.json for {book} in {base}")
