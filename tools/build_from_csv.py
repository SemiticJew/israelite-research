#!/usr/bin/env python3
import csv, json, re
from pathlib import Path

# INPUT CSV (placed by you)
CSV_PATH = Path("tools/kjv-apocrypha.csv")  # columns: Book ID,Book,Chapter,Text,Count,Verse
OUT_BASE = Path("data/flat")               # new unified output root

# Slugify: lower, spaces->hyphens, strip punctuation, keep numeric ordinals (1-kings, 2-john, etc.)
def slugify_book(name: str) -> str:
    s = name.strip()
    # normalize Roman-style book names in CSV if present; keep numeric ordinals
    # (We preserve any leading number token; e.g., "1 Kings" → "1-kings", "II Samuel" → "ii-samuel" (rare))
    s = re.sub(r"^\s*([1-3])\s+", r"\1 ", s)           # normalize "1  Kings" → "1 Kings"
    s = re.sub(r"^\s*I{1,3}\s+", lambda m: str(len(m.group(0).strip())), s)  # "II John" → "2 John"
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s\-]+", "", s)               # drop punctuation
    s = re.sub(r"\s+", "-", s).strip("-")              # spaces → hyphens
    return s

# Extract Strong’s refs and remove them from text
STRONGS_RXES = [
    re.compile(r"\{([HG]\d{3,5})\}"),  # {H7225} / {G3056}
    re.compile(r"\(([HG]\d{3,5})\)"),  # (H7225) / (G3056)
    re.compile(r"\b([HG]\d{3,5})\b"),  # bare H7225 / G3056 (fallback)
]

def split_strongs(text: str):
    strongs = set()
    cleaned = text

    # collect and strip bracketed forms first
    for rx in STRONGS_RXES[:2]:
        def _collect(m):
            strongs.add(m.group(1))
            return ""  # remove from text
        cleaned = rx.sub(_collect, cleaned)

    # if any bare codes remain, collect but keep spacing tidy
    def _collect_bare(m):
        strongs.add(m.group(1))
        return ""
    cleaned = STRONGS_RXES[2].sub(_collect_bare, cleaned)

    # collapse any double spaces created by removals
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned, sorted(strongs)

# Read CSV and bucket into {slug: {chapter:int -> [verses...]}}
books = {}

with CSV_PATH.open(newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    # Expected headers: Book ID,Book,Chapter,Text,Count,Verse
    for row in reader:
        book_name = row.get("Book") or row.get("book") or ""
        ch_str = row.get("Chapter") or row.get("chapter") or ""
        v_str = row.get("Verse") or row.get("verse") or ""
        text = row.get("Text") or row.get("text") or ""

        if not (book_name and ch_str and v_str):
            continue

        slug = slugify_book(book_name)
        try:
            ch = int(ch_str)
            v = int(v_str)
        except ValueError:
            continue

        cleaned, strongs = split_strongs(text)

        books.setdefault(slug, {}).setdefault(ch, []).append({
            "v": v,
            "t": cleaned,
            "c": [],          # cross-refs placeholder
            "s": strongs,     # Strong's numbers extracted
            "note": ""        # commentary placeholder
        })

# Ensure output and write files
for slug, chapters in books.items():
    for ch, verses in chapters.items():
        verses_sorted = sorted(verses, key=lambda x: x["v"])
        out_dir = OUT_BASE / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{ch}.json"
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(verses_sorted, f, ensure_ascii=False, indent=2)

print(f"Built JSON chapters under {OUT_BASE}/<book-slug>/<chapter>.json")
