#!/usr/bin/env python3
import re, json, csv, argparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple

STRONGS_PATTERN = re.compile(r'\bG(\d{1,5})\b')
ATTR_PATTERN    = re.compile(r'data-strongs="(G\d{1,5})"')
BRACKET_PATTERN = re.compile(r'\[(G\d{1,5})\]')
PAREN_PATTERN   = re.compile(r'\((G\d{1,5})\)')

BOOK_DIR_PARENT = Path("data/newtestament")

# -------------------- helpers --------------------
def extract_strongs_from_text(text: str) -> List[str]:
    codes = set()
    for pat in (ATTR_PATTERN, BRACKET_PATTERN, PAREN_PATTERN, STRONGS_PATTERN):
        for m in pat.findall(text or ""):
            codes.add(m if str(m).startswith("G") else f"G{m}")
    return sorted({c.upper() for c in codes}, key=lambda x: int(x[1:]))

def load_sidecar_mapping(path: Optional[Path]) -> Dict[str, List[str]]:
    if not path:
        return {}
    if not path.exists():
        print(f"[warn] mapping file not found: {path}")
        return {}
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        return { str(k): [str(c).upper() for c in v] for k,v in data.items() }
    if path.suffix.lower() == ".csv":
        norm = {}
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ref = f'{row["book"].strip()} {int(row["chapter"])}:{int(row["verse"])}'
                codes = re.split(r'[|,]\s*', (row.get("codes") or "").strip())
                norm[ref] = [c.strip().upper() for c in codes if c.strip()]
        return norm
    print(f"[warn] unsupported mapping file type: {path.suffix}")
    return {}

def verse_ref(book_slug: str, ch_num: int, v_num: int) -> str:
    book_name = book_slug.replace("-", " ").title()
    return f"{book_name} {ch_num}:{v_num}"

def process_chapter_file(fp: Path, book_slug: str, ch_num: int, sidecar: Dict[str, List[str]], inplace: bool) -> Tuple[int,int,int]:
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[error] read {fp}: {e}")
        return (0,0,0)
    if not isinstance(data, list):
        print(f"[warn] {fp} not a list of verses, skipping.")
        return (0,0,0)

    seen = changed = added_total = 0
    for v in data:
        if not isinstance(v, dict): continue
        vnum = v.get("v")
        text = v.get("t", "") or ""
        codes = set(extract_strongs_from_text(text))

        ref = verse_ref(book_slug, ch_num, int(vnum) if isinstance(vnum, int) else -1)
        if ref in sidecar:
            for c in sidecar[ref]:
                if c: codes.add(c.upper())

        new_codes = sorted(codes, key=lambda x: int(x[1:]))
        existing = v.get("s", [])
        existing_norm = sorted({str(c).upper() for c in existing if isinstance(c, str)}, key=lambda x: int(x[1:]))

        if new_codes != existing_norm:
            v["s"] = new_codes
            changed += 1
            added_total += max(0, len(new_codes) - len(existing_norm))
        seen += 1

    if inplace and changed:
        try:
            fp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        except Exception as e:
            print(f"[error] write {fp}: {e}")

    return (seen, changed, added_total)

def process_book_dir(book_dir: Path, sidecar: Dict[str, List[str]], inplace: bool) -> Tuple[int,int,int,int]:
    book_slug = book_dir.name
    total_files = total_seen = total_changed = total_added = 0
    for ch_file in sorted(book_dir.glob("*.json"), key=lambda p: int(p.stem) if p.stem.isdigit() else 10**9):
        ch_num = int(ch_file.stem) if ch_file.stem.isdigit() else -1
        if ch_num < 1: continue
        s,c,a = process_chapter_file(ch_file, book_slug, ch_num, sidecar, inplace)
        total_files += 1; total_seen += s; total_changed += c; total_added += a
    return total_files, total_seen, total_changed, total_added

def is_book_dir(p: Path) -> bool:
    return p.is_dir() and any(q.suffix.lower()==".json" and q.stem.isdigit() for q in p.glob("*.json"))

def candidates_for_book(name_token: str) -> List[Path]:
    token = name_token.strip().lower().replace(" ", "-")
    cands = []
    for base in [token, token.capitalize()]:
        cands += [
            BOOK_DIR_PARENT / base,
            BOOK_DIR_PARENT / base.replace("-", ""),
        ]
    # also try immediate parent locations of the mapping file later
    return cands

def auto_root_from_mapping(mapping_path: Path) -> Optional[Path]:
    # Case A: mapping sits inside a book dir already
    if is_book_dir(mapping_path.parent):
        return mapping_path.parent
    # Case B: infer from filename like strongs_map_matthew.csv or matthew.csv
    m = re.search(r'(?:strongs[_-]map[_-])?([a-z0-9\-]+)\.(?:csv|json)$', mapping_path.name, re.I)
    if m:
        token = m.group(1).lower()
        for cand in candidates_for_book(token):
            if is_book_dir(cand):
                return cand
    # Case C: try one level up (mapping lives under data/newtestament/)
    if mapping_path.parent.name.lower() in {"newtestament","nt"} and mapping_path.parent.is_dir():
        # not specific enough—fallback to parent itself
        return mapping_path.parent
    return None

# -------------------- main --------------------
def main():
    ap = argparse.ArgumentParser(description="Inject Strong's Greek codes into verse lex arrays (s[]) by parsing text and/or a sidecar mapping.")
    ap.add_argument("--root", help="Parent folder of books (e.g., data/newtestament/) OR a single book folder (e.g., data/newtestament/Matthew/). Optional if --mapping filename includes the book name.")
    ap.add_argument("--mapping", help="Sidecar (CSV/JSON). If a bare filename is given, the script will also search relative to --root and infer the book.")
    ap.add_argument("--inplace", action="store_true", help="Write changes back to disk")
    ap.add_argument("--dry-run", action="store_true", help="Do not write; just show summary")
    args = ap.parse_args()

    # Resolve mapping path (accept bare filename)
    sidecar = {}
    mpath: Optional[Path] = None
    if args.mapping:
        mpath = Path(args.mapping)
        if not mpath.exists() and args.root:
            cand = Path(args.root) / args.mapping
            if cand.exists():
                mpath = cand
        if not mpath.exists():
            # also try relative to default parent
            cand = BOOK_DIR_PARENT / args.mapping
            if cand.exists():
                mpath = cand
        sidecar = load_sidecar_mapping(mpath) if mpath and mpath.exists() else {}

    # Resolve root
    root: Optional[Path] = Path(args.root).resolve() if args.root else None
    if not root:
        # attempt auto-detect from mapping
        root = auto_root_from_mapping(mpath) if mpath else None

    if not root:
        # fallback to the canonical parent for all NT books
        root = BOOK_DIR_PARENT.resolve()

    if not root.exists():
        print(f"[error] root not found: {root}")
        return

    inplace = bool(args.inplace and not args.dry_run)

    total_files = total_seen = total_changed = total_added = 0

    # If root is a book folder, process it directly; else process its subfolders that look like books
    if is_book_dir(root):
        f,s,c,a = process_book_dir(root, sidecar, inplace)
        total_files += f; total_seen += s; total_changed += c; total_added += a
    else:
        for book_dir in sorted(root.glob("*")):
            if is_book_dir(book_dir):
                f,s,c,a = process_book_dir(book_dir, sidecar, inplace)
                total_files += f; total_seen += s; total_changed += c; total_added += a

    print("\n=== Strong's Injection Summary ===")
    print(f"Files scanned:    {total_files}")
    print(f"Verses inspected: {total_seen}")
    print(f"Verses updated:   {total_changed}")
    print(f"Codes added:      {total_added}")
    if not inplace:
        print("\n(No files were modified. Use --inplace to write changes.)")

if __name__ == "__main__":
    main()
