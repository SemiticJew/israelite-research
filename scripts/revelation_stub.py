#!/usr/bin/env python3
"""
revelation_stub.py
------------------
Scaffold data files for the New Testament book of Revelation (GitHub Pages friendly).

Creates:
  data/newtestament/revelation/
    ├─ revelation.json        # metadata
    ├─ 1.json … 22.json       # chapter skeletons: {"book","chapter","verses":[]}

Optionally updates:
  data/newtestament/books.json  # adds/updates {"name":"Revelation","chapters":22}

Usage:
  python revelation_stub.py
  python revelation_stub.py --force
  python revelation_stub.py --update-books
  python revelation_stub.py --force --update-books
"""
from __future__ import annotations
import json
from pathlib import Path
import argparse
import sys

ROOT = Path(__file__).resolve().parent
REVELATION_DIR = ROOT / "data" / "newtestament" / "revelation"
BOOKS_JSON = ROOT / "data" / "newtestament" / "books.json"

META = {
    "name": "Revelation",
    "slug": "revelation",
    "aliases": ["Apocalypse"],
    "abbrev": "Rev",
    "chapters": 22,
    "author": "John the Apostle",
    "date": "c. AD 90–95"
}

def write_json(path: Path, obj: dict, force: bool=False) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        return False
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return True

def scaffold_revelation(force: bool=False) -> None:
    created = []
    meta_path = REVELATION_DIR / "revelation.json"
    if write_json(meta_path, META, force):
        created.append(str(meta_path.relative_to(ROOT)))

    for ch in range(1, META["chapters"] + 1):
        chapter_path = REVELATION_DIR / f"{ch}.json"
        chapter_obj = {
            "book": META["name"],
            "chapter": ch,
            "verses": []  # fill later with: {"num","text","crossRefs":[...], "commentary":"", "strongs":[...]}
        }
        if write_json(chapter_path, chapter_obj, force):
            created.append(str(chapter_path.relative_to(ROOT)))

    if created:
        print("Created/updated:")
        for p in created:
            print("  -", p)
    else:
        print("No files written (already exist). Use --force to overwrite.")

def update_books_json() -> None:
    entry = {"name": META["name"], "chapters": META["chapters"]}
    if not BOOKS_JSON.exists():
        # create a fresh list with Revelation only
        write_json(BOOKS_JSON, [entry], force=True)
        print(f"Created {BOOKS_JSON.relative_to(ROOT)} with Revelation.")
        return

    try:
        with BOOKS_JSON.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"ERROR: Could not parse {BOOKS_JSON}: {e}", file=sys.stderr)
        sys.exit(1)

    changed = False
    # Support either list[{"name","chapters"}] or dict{name:chapters}
    if isinstance(data, list):
        names = [b.get("name") for b in data if isinstance(b, dict)]
        if META["name"] in names:
            for b in data:
                if isinstance(b, dict) and b.get("name") == META["name"]:
                    if b.get("chapters") != META["chapters"]:
                        b["chapters"] = META["chapters"]
                        changed = True
        else:
            data.append(entry)
            changed = True
    elif isinstance(data, dict):
        prev = data.get(META["name"])
        if prev != META["chapters"]:
            data[META["name"]] = META["chapters"]
            changed = True
    else:
        print(f"ERROR: {BOOKS_JSON} has unexpected format.", file=sys.stderr)
        sys.exit(1)

    if changed:
        with BOOKS_JSON.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"Updated {BOOKS_JSON.relative_to(ROOT)} (added/changed Revelation).")
    else:
        print(f"No change needed in {BOOKS_JSON.relative_to(ROOT)}.")

def main():
    ap = argparse.ArgumentParser(description="Scaffold Revelation data files.")
    ap.add_argument("--force", action="store_true", help="overwrite existing files")
    ap.add_argument("--update-books", action="store_true", help="add/update Revelation in data/newtestament/books.json")
    args = ap.parse_args()

    scaffold_revelation(force=args.force)
    if args.update_books:
        update_books_json()

if __name__ == "__main__":
    main()
