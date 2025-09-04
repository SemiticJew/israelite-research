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
        # Expect: { "Matthew 1:1": ["G####", ...], ... }
        return { str(k): [str(c).upper() for c in v] for k,v in data.items() }
    if path.suffix.lower() == ".csv":
        norm: Dict[str, List[str]] = {}
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            # Headers must be: book,chapter,verse,codes
            for row in reader:
                book = (row.get("book") or "").strip()
                ch   = row.get("chapter")
                vs   = row.get("verse")
                codes_cell = (row.get("codes") or "").strip()
                if not book or ch is None or vs is None:
                    # Skip malformed rows
                    continue
                try:
                    ch_i = int(ch); vs_i = int(vs)
                except ValueError:
                    continue
                codes = [c.strip().upper() for c in re.split(r'[|,]\s*', codes_cell) if c.strip()]
                ref = f"{book} {ch_i}:{vs_i}"
                norm[ref] = codes
        return norm
    print(f"[warn] unsupported mapping file type: {path.suffix}")
    return {}

def verse_ref(book_slug: str, ch_num: int, v_num: Optional[int]) -> str:
    book_name = book_slug.replace("-", " ").title()
    if v_num is None:
        return f"{book_name} {ch_num}:?"
    try:
        return f"{book_name} {int(ch_num)}:{int(v_num)}"
    except Exception:
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
        if not isinstance(v, dict):
            continue
        vnum = v.get("v")
        text = v.get("t", "") or ""
        codes = set(extract_strongs_from_text(text))

        ref = verse_ref(book_slug, ch_num, vnum if isinstance(vnum, int) else None)
        if ref in sidecar:
            for c in sidecar[ref]:
                if c:
                    codes.add(c.upper())

        new_codes = sorted(codes, key=lambda x: int(x[1:]))
        existing = v.get("s", [])
        existing_norm = sorted({str(c).upper() for c in existing if isinstance(c, str)}, key=lambda x: int(x[1:]))

        if new_codes != existing_norm:
            v["s"] = new_codes
            changed += 1
            added_total += max(0, len(new_codes) - len(existing_norm))
            # Log exactly what changed
            print(f"[update] {ref} \u2192 {new_codes}")
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
        if ch_num < 1:
            continue
        s,c,a = process_chapter_file(ch_file, book_slug, ch_num, sidecar, inplace)
        total_files += 1; total_seen += s; total_changed += c; total_added += a
    return total_files, total_seen, total_changed, total_added

def is_book_dir(p: Path) -> bool:
    return p.is_dir() and any(q.suffix.lower()==".json" and q.stem.isdigit() for q in p.glob("*.json"))

def candidates_for_book(name_token: str) -> List[Path]:
    token = name_token.strip().lower().replace(" ", "-")
    cands = [
        BOOK_DIR_PARENT / token,
        BOOK_DIR_PARENT / token.replace("-", ""),
        BOOK_DIR_PARENT / token.capitalize(),
        BOOK_DIR_PARENT / token.replace("-", "").capitalize(),
    ]
    return cands

def auto_root_from_mapping(mapping_path: Optional[Path]) -> Optional[Path]:
    if not mapping_path:
        return None
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
        return mapping_path.parent
    return None

# -------------------- main --------------------
def main():
    ap = argparse.ArgumentParser(description="Inject Strong's Greek codes into verse lex arrays (s[]) by parsing verse text and/or a sidecar mapping.")
    ap.add_argument("--root", help="Parent folder of books (e.g., data/newtestament/) OR a single book folder (e.g., data/newtestament/Matthew/). Optional if --mapping filename includes the book name.")
    ap.add_argument("--mapping", help="Sidecar (CSV/JSON). May be a bare filename; the script also searches relative to --root and data/newtestament/.")
    ap.add_argument("--inplace", action="store_true", help="Write changes back to disk")
    ap.add_argument("--dry-run", action="store_true", help="Do not write; just show what would change")
    args = ap.parse_args()

    # Resolve mapping path (accept bare filename)
    sidecar: Dict[str, List[str]] = {}
    mpath: Optional[Path] = None
    if args.mapping:
        mpath = Path(args.mapping)
        if not mpath.exists() and args.root:
            cand = Path(args.root) / args.mapping
            if cand.exists():
                mpath = cand
        if not (mpath and mpath.exists()):
            cand = BOOK_DIR_PARENT / args.mapping
            if cand.exists():
                mpath = cand
        if mpath and mpath.exists():
            sidecar = load_sidecar_mapping(mpath)
        else:
            print(f"[warn] mapping file not found: {args.mapping}")

    # Resolve root (book or parent)
    root: Optional[Path] = Path(args.root).resolve() if args.root else None
    if not root:
        root = auto_root_from_mapping(mpath) if mpath else None
    if not root:
        root = BOOK_DIR_PARENT.resolve()

    if not root.exists():
        print(f"[error] root not found: {root}")
        return

    inplace = bool(args.inplace and not args.dry_run)

    total_files = total_seen = total_changed = total_added = 0

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
