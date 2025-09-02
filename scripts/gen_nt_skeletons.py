#!/usr/bin/env python3
import os, json, argparse
from pathlib import Path

BOOKS = [
    ("matthew", "Matthew", 28),
    ("mark", "Mark", 16),
    ("luke", "Luke", 24),
    ("john", "John", 21),
    ("acts", "Acts", 28),
    ("romans", "Romans", 16),
    ("1-corinthians", "1 Corinthians", 16),
    ("2-corinthians", "2 Corinthians", 13),
    ("galatians", "Galatians", 6),
    ("ephesians", "Ephesians", 6),
    ("philippians", "Philippians", 4),
    ("colossians", "Colossians", 4),
    ("1-thessalonians", "1 Thessalonians", 5),
    ("2-thessalonians", "2 Thessalonians", 3),
    ("1-timothy", "1 Timothy", 6),
    ("2-timothy", "2 Timothy", 4),
    ("titus", "Titus", 3),
    ("philemon", "Philemon", 1),
    ("hebrews", "Hebrews", 13),
    ("james", "James", 5),
    ("1-peter", "1 Peter", 5),
    ("2-peter", "2 Peter", 3),
    ("1-john", "1 John", 5),
    ("2-john", "2 John", 1),
    ("3-john", "3 John", 1),
    ("jude", "Jude", 1),
    ("revelation", "Revelation", 22),
]

def payload(book_title: str, ch: int):
    return {
        "book": book_title,
        "chapter": ch,
        "verses": [],       # fill later: [{"v":1, "t":"", "s":[]}, ...]
        "lexicon": {},      # Strong's entries keyed by number
        "commentary": ""    # personal notes placeholder
    }

def main():
    ap = argparse.ArgumentParser(description="Generate NT JSON skeletons.")
    ap.add_argument("--root", default="data/newtestament", help="Output root folder")
    ap.add_argument("--force", action="store_true", help="Overwrite existing files")
    args = ap.parse_args()

    root = Path(args.root)
    root.mkdir(parents=True, exist_ok=True)

    made, skipped = 0, 0
    for slug, title, chapters in BOOKS:
        out_dir = root / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        for ch in range(1, chapters + 1):
            p = out_dir / f"{ch}.json"
            if p.exists() and not args.force:
                skipped += 1
                continue
            with open(p, "w", encoding="utf-8") as f:
                json.dump(payload(title, ch), f, ensure_ascii=False, indent=2)
            made += 1

    print(f"Done. Created: {made}, Skipped (exists): {skipped}, Root: {root}")

if __name__ == "__main__":
    main()
