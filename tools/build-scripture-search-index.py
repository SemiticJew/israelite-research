#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CANONS = [
    {
        "id": "tanakh",
        "label": "Tanakh",
        "data_path": ROOT / "data" / "tanakh",
        "reader_path": "/tanakh/chapter.html",
    },
    {
        "id": "newtestament",
        "label": "New Testament",
        "data_path": ROOT / "data" / "newtestament",
        "reader_path": "/newtestament/chapter.html",
    },
    {
        "id": "apocrypha",
        "label": "Apocrypha",
        "data_path": ROOT / "data" / "apocrypha",
        "reader_path": "/apocrypha/chapter.html",
    },
]

SPECIAL_BOOK_NAMES = {
    "psalm": "Psalm",
    "song-of-solomon": "Song of Solomon",
    "1-corinthians": "1 Corinthians",
    "2-corinthians": "2 Corinthians",
    "1-thessalonians": "1 Thessalonians",
    "2-thessalonians": "2 Thessalonians",
    "1-timothy": "1 Timothy",
    "2-timothy": "2 Timothy",
    "1-peter": "1 Peter",
    "2-peter": "2 Peter",
    "1-john": "1 John",
    "2-john": "2 John",
    "3-john": "3 John",
    "1-kings": "1 Kings",
    "2-kings": "2 Kings",
    "1-samuel": "1 Samuel",
    "2-samuel": "2 Samuel",
    "1-chronicles": "1 Chronicles",
    "2-chronicles": "2 Chronicles",
    "1-esdras": "1 Esdras",
    "2-esdras": "2 Esdras",
    "1-maccabees": "1 Maccabees",
    "2-maccabees": "2 Maccabees",
    "bel-and-the-dragon": "Bel and the Dragon",
}

def normalize(value):
    value = str(value or "").lower()
    value = re.sub(r"[^\w\s'-]", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()

def title_case_book(slug):
    if slug in SPECIAL_BOOK_NAMES:
        return SPECIAL_BOOK_NAMES[slug]

    words = []
    for part in slug.split("-"):
        if part.isdigit():
            words.append(part)
        elif part in {"of", "the", "and"}:
            words.append(part)
        else:
            words.append(part[:1].upper() + part[1:])

    name = " ".join(words)

    # Preserve lowercase connector words unless they start the title.
    for old, new in {
        " Of ": " of ",
        " The ": " the ",
        " And ": " and ",
    }.items():
        name = name.replace(old, new)

    return name

def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def build_index():
    entries = []
    skipped = []

    for canon in CANONS:
        books_path = canon["data_path"] / "books.json"
        books = load_json(books_path)

        if not isinstance(books, dict):
            raise ValueError(f"{books_path} must be a plain object of slug -> chapter count")

        for slug, chapter_count in books.items():
            book_name = title_case_book(slug)

            for chapter in range(1, int(chapter_count) + 1):
                chapter_path = canon["data_path"] / slug / f"{chapter}.json"

                if not chapter_path.exists():
                    skipped.append(str(chapter_path.relative_to(ROOT)))
                    continue

                chapter_data = load_json(chapter_path)
                verses = chapter_data.get("verses", [])

                for verse in verses:
                    text = verse.get("t", "")
                    verse_number = verse.get("v")

                    if not text or verse_number is None:
                        continue

                    entries.append({
                        "canon": canon["id"],
                        "canonLabel": canon["label"],
                        "book": book_name,
                        "slug": slug,
                        "chapter": chapter,
                        "verse": verse_number,
                        "text": text,
                        "normalizedText": normalize(text),
                        "readerPath": canon["reader_path"],
                    })

    return entries, skipped

def main():
    entries, skipped = build_index()

    output = {
        "version": 1,
        "generatedBy": "tools/build-scripture-search-index.py",
        "totalVerses": len(entries),
        "entries": entries,
    }

    output_path = ROOT / "data" / "scripture-search-index.json"
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote {output_path.relative_to(ROOT)}")
    print(f"Indexed verses: {len(entries)}")

    if skipped:
        print(f"Skipped missing chapters: {len(skipped)}")
        for item in skipped[:20]:
            print(f" - {item}")
        if len(skipped) > 20:
            print(f" - ...and {len(skipped) - 20} more")

if __name__ == "__main__":
    main()
