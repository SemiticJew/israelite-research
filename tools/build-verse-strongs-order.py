#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "lexicon" / "kjv_strongs.csv"
OUT = ROOT / "data" / "lexicon" / "verse-strongs-order.json"

CANON_MANIFESTS = [
    ("tanakh", ROOT / "data" / "tanakh" / "books.json"),
    ("newtestament", ROOT / "data" / "newtestament" / "books.json"),
    ("apocrypha", ROOT / "data" / "apocrypha" / "books.json"),
]

ALIASES = {
    "psalms": "psalm",
    "songofsolomon": "song-of-solomon",
    "songofsongs": "song-of-solomon",
    "canticles": "song-of-solomon",
    "1samuel": "1-samuel",
    "2samuel": "2-samuel",
    "1kings": "1-kings",
    "2kings": "2-kings",
    "1chronicles": "1-chronicles",
    "2chronicles": "2-chronicles",
    "1corinthians": "1-corinthians",
    "2corinthians": "2-corinthians",
    "1thessalonians": "1-thessalonians",
    "2thessalonians": "2-thessalonians",
    "1timothy": "1-timothy",
    "2timothy": "2-timothy",
    "1peter": "1-peter",
    "2peter": "2-peter",
    "1john": "1-john",
    "2john": "2-john",
    "3john": "3-john",
}

WORD_CODE_RE = re.compile(r"([A-Za-z0-9][A-Za-z0-9'’\\-]*)\{([HG]\d+)\}")

def norm(value):
    return re.sub(r"[^a-z0-9]", "", str(value).lower())

def load_book_index():
    index = {}

    for canon, manifest_path in CANON_MANIFESTS:
        manifest = json.loads(manifest_path.read_text())

        for slug in manifest:
            index[norm(slug)] = (canon, slug)
            index[norm(slug.replace("-", " "))] = (canon, slug)

    for csv_name, slug in ALIASES.items():
        normalized_slug = norm(slug)
        if normalized_slug in index:
            index[norm(csv_name)] = index[normalized_slug]

    return index

def extract_terms(text):
    terms = []
    seen_positions = set()

    for match in WORD_CODE_RE.finditer(text or ""):
        word = match.group(1)
        code = match.group(2).upper()

        # Ignore morphology codes. Those look like H8799 but are wrapped separately
        # as {(H8799)} and do not match this word-code pattern.
        key = (match.start(), word, code)
        if key in seen_positions:
            continue

        seen_positions.add(key)
        terms.append({
            "word": word,
            "code": code
        })

    return terms

def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing source CSV: {SOURCE}")

    book_index = load_book_index()
    output = {}
    skipped_books = {}
    row_count = 0
    aligned_count = 0

    with SOURCE.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)

        for row in reader:
            if len(row) < 6:
                continue

            row_count += 1

            # Observed shape:
            # id, Book, book_number, chapter, verse, "Text with word{H/G####}"
            # Some grep output includes a line-number prefix, but the CSV itself does not.
            _id, book_name, _book_number, chapter, verse, text = row[:6]

            normalized_book = norm(book_name)
            found = book_index.get(normalized_book)

            if not found:
                skipped_books[book_name] = skipped_books.get(book_name, 0) + 1
                continue

            try:
                chapter_number = int(chapter)
                verse_number = int(verse)
            except ValueError:
                continue

            terms = extract_terms(text)
            if not terms:
                continue

            canon, slug = found
            key = f"{canon}/{slug}/{chapter_number}/{verse_number}"
            output[key] = terms
            aligned_count += 1

    payload = {
        "version": 1,
        "source": "data/lexicon/kjv_strongs.csv",
        "description": "Verse-level Strong's order generated from English KJV Strong's inline word-code data.",
        "entries": output
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")

    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"CSV rows read: {row_count}")
    print(f"Aligned verses: {aligned_count}")
    print(f"Skipped book names: {len(skipped_books)}")

    if skipped_books:
        for name, count in sorted(skipped_books.items())[:25]:
            print(f" - {name}: {count}")

if __name__ == "__main__":
    main()
