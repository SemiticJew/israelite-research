#!/usr/bin/env python3
import json, csv, sys, shutil, time
from pathlib import Path

# CONFIG — adjust if your repo root differs
REPO_ROOT = Path(__file__).resolve().parents[1]
GENESIS_DIR = REPO_ROOT / "data" / "tanakh" / "genesis"
MAP_JSON = REPO_ROOT / "tools" / "genesis_xrefs.json"
MAP_CSV  = REPO_ROOT / "tools" / "genesis_xrefs.csv"

def load_mapping():
    if MAP_JSON.exists():
        with MAP_JSON.open("r", encoding="utf-8") as f:
            raw = json.load(f)
        # normalize keys like "1:1"
        return {str(k).strip(): list(dict.fromkeys(v)) for k, v in raw.items()}
    if MAP_CSV.exists():
        mapping = {}
        with MAP_CSV.open("r", encoding="utf-8") as f:
            rdr = csv.DictReader(f)
            for row in rdr:
                ch = str(row.get("chapter", "")).strip()
                vs = str(row.get("verse", "")).strip()
                refs = str(row.get("refs", "")).strip()
                if not ch or not vs: 
                    continue
                key = f"{int(ch)}:{int(vs)}"
                items = [r.strip() for r in refs.replace("|",";").split(";") if r.strip()]
                if key not in mapping: mapping[key] = []
                mapping[key].extend(items)
        # dedupe while keeping order
        return {k: list(dict.fromkeys(v)) for k, v in mapping.items()}
    print("No mapping file found. Provide tools/genesis_xrefs.json or tools/genesis_xrefs.csv", file=sys.stderr)
    sys.exit(1)

def backup_dir(src: Path) -> Path:
    stamp = time.strftime("%Y%m%d-%H%M%S")
    dst = src.parent / f"{src.name}.bak.{stamp}"
    shutil.copytree(src, dst)
    return dst

def merge_refs(existing, new_items):
    if not isinstance(existing, list): existing = []
    combined = list(dict.fromkeys([*(r.strip() for r in existing if r), *(r.strip() for r in new_items if r)]))
    # optional: sort alpha; comment out if you prefer order-preserving
    # combined.sort(key=lambda s: s.lower())
    return combined

def update_chapter(ch_path: Path, mapping: dict) -> int:
    """Returns number of verses updated in this chapter."""
    changed = 0
    ch_num = int(ch_path.stem)  # e.g., 1.json -> 1
    with ch_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        print(f"SKIP {ch_path}: not an array", file=sys.stderr)
        return 0

    for i, vobj in enumerate(data):
        vnum = vobj.get("v")
        if not isinstance(vnum, int):
            continue
        key = f"{ch_num}:{vnum}"
        if key in mapping and mapping[key]:
            before = list(vobj.get("c") or [])
            after = merge_refs(before, mapping[key])
            if after != before:
                vobj["c"] = after
                changed += 1
        # ensure fields exist
        if "c" not in vobj: vobj["c"] = []
        if "s" not in vobj: vobj["s"] = []

    with ch_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return changed

def main():
    if not GENESIS_DIR.exists():
        print(f"Missing: {GENESIS_DIR}", file=sys.stderr)
        sys.exit(1)

    mapping = load_mapping()
    backup = backup_dir(GENESIS_DIR)
    print(f"Backup created: {backup}")

    total_files = 0
    total_updates = 0
    for ch_path in sorted(GENESIS_DIR.glob("*.json"), key=lambda p: int(p.stem)):
        changed = update_chapter(ch_path, mapping)
        total_files += 1
        total_updates += changed
        print(f"Updated {ch_path.name}: {changed} verse(s)")

    print(f"\nDone. Files: {total_files}, verses updated: {total_updates}")

if __name__ == "__main__":
    main()
