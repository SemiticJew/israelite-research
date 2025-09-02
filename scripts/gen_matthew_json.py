#!/usr/bin/env python3
import json
import os
from pathlib import Path

# Output directory (adjust if needed)
OUT_DIR = Path("data/bible/kjv/matthew")

# Matthew verse counts by chapter (1..28)
VERSE_COUNTS = [
    25, 23, 17, 25, 48, 34, 29, 34, 38, 42,
    30, 50, 58, 36, 39, 28, 27, 35, 30, 34,
    46, 46, 39, 51, 46, 75, 66, 20
]

def build_chapter_payload(ch_num: int, verse_count: int) -> dict:
    return {
        "book": "Matthew",
        "chapter": ch_num,
        "verses": [{"v": v, "t": "", "s": []} for v in range(1, verse_count + 1)],
        "lexicon": {},     # add Strong's entries here later
        "commentary": ""   # empty personal commentary (fill later)
    }

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for i, vc in enumerate(VERSE_COUNTS, start=1):
        payload = build_chapter_payload(i, vc)
        out_path = OUT_DIR / f"{i}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(VERSE_COUNTS)} files in {OUT_DIR}")

if __name__ == "__main__":
    main()
