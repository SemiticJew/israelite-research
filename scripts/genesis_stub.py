import json, os, sys

# Accurate verse counts for Genesis 1–50 (KJV)
verse_counts = {
  1:31, 2:25, 3:24, 4:26, 5:32, 6:22, 7:24, 8:22, 9:29, 10:32,
  11:32, 12:20, 13:18, 14:24, 15:21, 16:16, 17:27, 18:33, 19:38, 20:18,
  21:34, 22:24, 23:20, 24:67, 25:34, 26:35, 27:46, 28:22, 29:35, 30:43,
  31:55, 32:32, 33:20, 34:31, 35:29, 36:43, 37:36, 38:30, 39:23, 40:23,
  41:57, 42:38, 43:34, 44:34, 45:28, 46:34, 47:31, 48:22, 49:33, 50:26
}

base = os.path.join("data","tanakh","Genesis")
os.makedirs(base, exist_ok=True)

# Don't overwrite chapter 1 if it already exists
for chap in range(1, 51):
    path = os.path.join(base, f"{chap}.json")
    if chap == 1 and os.path.exists(path):
        print(f"Keeping existing {path}")
        continue
    # Build verses with numbered stubs
    n = verse_counts[chap]
    verses = [{"num": i, "text": "", "crossRefs": [], "commentary": ""} for i in range(1, n+1)]
    obj = {"book": "Genesis", "chapter": chap, "verses": verses}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"Wrote {path} ({n} verses)")
print("Done.")
