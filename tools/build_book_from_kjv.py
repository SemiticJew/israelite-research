#!/usr/bin/env python3
import csv, json, os, sys, re
from collections import defaultdict

CSV_PATH = os.environ.get("KJV_CSV", "tools/kjv-apocrypha.csv")
OUT_ROOT = os.environ.get("OUT_ROOT", "data")

# Book-family classification (kept minimal but robust)
TANAKH = {
    "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth",
    "1 samuel","2 samuel","1 kings","2 kings","1 chronicles","2 chronicles",
    "ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song of songs","song of solomon",
    "isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos","obadiah","jonah",
    "micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi"
}
NEW_TESTAMENT = {
    "matthew","mark","luke","john","acts","romans","1 corinthians","2 corinthians","galatians","ephesians",
    "philippians","colossians","1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon",
    "hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation"
}
APOCRYPHA_HINTS = {
    "1 esdras","2 esdras","tobit","judith","additions to esther","wisdom of solomon","sirach","ecclesiasticus",
    "baruch","letter of jeremiah","prayer of azariah","susanna","bel and the dragon",
    "prayer of manasseh","psalm 151","epistle to the laodiceans","laodiceans","additions of esther","additions esther"
}

# Use roman numerals for books with numbers (I, II, III)
ROMANS = {1:"i",2:"ii",3:"iii",4:"iv",5:"v"}

def norm_book(b:str)->str:
    b = b.strip()
    # normalize common variants
    b = re.sub(r"\s+", " ", b)
    return b

def slugify(book_name:str)->str:
    """
    Turn '1 John' -> 'i-john'
         '2 Esdras' -> 'ii-esdras'
         'Song of Solomon' -> 'song-of-solomon'
    """
    m = re.match(r"^\s*([1-5])\s+(.+)$", book_name, re.IGNORECASE)
    if m:
        n = int(m.group(1))
        rest = m.group(2).strip().lower()
        rest = re.sub(r"[^a-z0-9]+","-",rest).strip("-")
        return f"{ROMANS.get(n, str(n))}-{rest}"
    # no leading number
    s = book_name.lower()
    s = s.replace("canticles","song of songs")  # sometimes appears as Canticles
    s = re.sub(r"[^a-z0-9]+","-",s).strip("-")
    return s

def family_for(book_name:str)->str:
    b = book_name.lower().strip()
    if b in TANAKH:
        return "tanakh"
    if b in NEW_TESTAMENT:
        return "newtestament"
    # try a loose apocrypha match
    plain = re.sub(r"[^a-z0-9]+"," ",b)
    if plain in APOCRYPHA_HINTS or any(plain.startswith(x) for x in APOCRYPHA_HINTS):
        return "apocrypha"
    # numeric-prefixed variations
    if re.match(r"^[1-5]\s", b) and (
        re.sub(r"^[1-5]\s+","",b) in TANAKH or re.sub(r"^[1-5]\s+","",b) in NEW_TESTAMENT
    ):
        base = re.sub(r"^[1-5]\s+","",b)
        return "tanakh" if base in TANAKH else "newtestament"
    # Fall back: if it's not in Tanakh/NT, treat as Apocrypha
    return "apocrypha"

def ensure_dir(p):
    os.makedirs(p, exist_ok=True)

def main():
    if not os.path.exists(CSV_PATH):
        print(f"CSV not found: {CSV_PATH}", file=sys.stderr)
        sys.exit(1)

    # Group by (family, slug, chapter) -> list of verses
    books = defaultdict(lambda: defaultdict(list))  # books[(family, slug)][chapter] = list of (n, t)

    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # Expect columns: Book ID,Book,Chapter,Text,Count,Verse
        for row in reader:
            book_raw = norm_book(row["Book"])
            chapter = int(row["Chapter"])
            verse = int(row["Verse"])
            text = row["Text"].rstrip()

            fam = family_for(book_raw)
            slug = slugify(book_raw)
            books[(fam, slug)][chapter].append({"n": verse, "t": text})

    # Write out JSON files
    for (fam, slug), ch_map in books.items():
        for ch, verses in ch_map.items():
            verses.sort(key=lambda v: v["n"])
            out_dir = os.path.join(OUT_ROOT, fam, slug)
            ensure_dir(out_dir)
            out_file = os.path.join(out_dir, f"{ch}.json")
            with open(out_file, "w", encoding="utf-8") as wf:
                json.dump(verses, wf, ensure_ascii=False, separators=(",",":"))
    print("Done.")

if __name__ == "__main__":
    main()
