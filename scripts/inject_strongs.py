#!/usr/bin/env python3
import os, re, json, argparse, csv
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

STRONGS_PATTERN = re.compile(r'\bG(\d{1,5})\b')
ATTR_PATTERN = re.compile(r'data-strongs="(G\d{1,5})"')
BRACKET_PATTERN = re.compile(r'\[(G\d{1,5})\]')
PAREN_PATTERN = re.compile(r'\((G\d{1,5})\)')

def extract_strongs_from_text(text: str) -> List[str]:
    codes = set()
    for pat in (ATTR_PATTERN, BRACKET_PATTERN, PAREN_PATTERN, STRONGS_PATTERN):
        for m in pat.findall(text or ""):
            code = m if m.startswith("G") else f"G{m}"
            codes.add(code.upper())
    return sorted(codes, key=lambda x: int(x[1:]))

def load_sidecar_mapping(path: Optional[Path]) -> Dict[str, List[str]]:
    if not path:
        return {}
    if not path.exists():
        print(f"[warn] mapping file not found: {path}")
        return {}
    if path.suffix.lower() == ".json":
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        norm = {}
        for ref, codes in data.items():
            norm[ref] = [c.upper().replace("G", "G") if isinstance(c, str) else c for c in codes]
        return norm
    if path.suffix.lower() == ".csv":
        norm = {}
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ref = f'{row["book"].strip()} {int(row["chapter"])}:{int(row["verse"])}'
                codes = re.split(r'[|,]\s*', row["codes"].strip())
                norm[ref] = [c.strip().upper() for c in codes if c.strip()]
        return norm
    print(f"[warn] unsupported mapping file type: {path.suffix}")
    return {}

def verse_ref(book_slug: str, ch_num: int, v_num: int) -> str:
    book_name = book_slug.replace("-", " ").title()
    return f"{book_name} {ch_num}:{v_num}"

def process_chapter_file(fp: Path, book_slug: str, ch_num: int, sidecar: Dict[str, List[str]], inplace: bool):
    try:
        raw = fp.read_text(encoding="utf-8")
        data = json.loads(raw)
    except Exception as e:
        print(f"[error] failed to read {fp}: {e}")
        return (0,0,0)
    if not isinstance(data, list):
        print(f"[warn] {fp} is not a list of verses, skipping.")
        return (0,0,0)

    seen = changed = added_total = 0
    for v in data:
        if not isinstance(v, dict):
            continue
        vnum = v.get("v")
        text = v.get("t", "") or ""
        codes = set(extract_strongs_from_text(text))
        ref = verse_ref(book_slug, ch_num, int(vnum) if isinstance(vnum, int) else -1)
        if ref in sidecar:
            for c in sidecar[ref]:
                if c and isinstance(c, str):
                    codes.add(c.upper())
        new_codes = sorted(codes, key=lambda x: int(x[1:]))

        existing = v.get("s", [])
        existing_norm = sorted({c.upper() for c in existing if isinstance(c, str)}, key=lambda x: int(x[1:]))

        if new_codes != existing_norm:
            v["s"] = new_codes
            changed += 1
            added_total += max(0, len(new_codes) - len(existing_norm))
        seen += 1

    if inplace and changed:
        try:
            fp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        except Exception as e:
            print(f"[error] failed to write {fp}: {e}")

    return (seen, changed, added_total)

def main():
    ap = argparse.ArgumentParser(description="Inject Strong's Greek codes into verse lex arrays (s[]) by parsing text patterns and optional sidecar mapping.")
    ap.add_argument("--root", required=True, help="Root folder for NT data (e.g., data/newtestament)")
    ap.add_argument("--mapping", help="Optional sidecar mapping (JSON or CSV) mapping 'Book ch:vs' -> [codes]")
    ap.add_argument("--inplace", action="store_true", help="Write changes back to disk")
    ap.add_argument("--dry-run", action="store_true", help="Do not write; just show summary")
    args = ap.parse_args()

    root = Path(args.root)
    if not root.exists():
        print(f"[error] root not found: {root}")
        return

    sidecar = load_sidecar_mapping(Path(args.mapping)) if args.mapping else {}

    total_files = total_seen = total_changed = total_added = 0
    for book_dir in sorted(root.glob("*")):
        if not book_dir.is_dir():
            continue
        book_slug = book_dir.name
        for ch_file in sorted(book_dir.glob("*.json"), key=lambda p: int(p.stem) if p.stem.isdigit() else 10**9):
            ch_num = int(ch_file.stem) if p.stem.isdigit() else -1
            if ch_num < 1:
                continue
            seen, changed, added = process_chapter_file(ch_file, book_slug, ch_num, sidecar, inplace=args.inplace and not args.dry_run)
            total_files += 1
            total_seen += seen; total_changed += changed; total_added += added

    print("\n=== Strong's Injection Summary ===")
    print(f"Files scanned:    {total_files}")
    print(f"Verses inspected: {total_seen}")
    print(f"Verses updated:   {total_changed}")
    print(f"Codes added:      {total_added}")
    if not args.inplace or args.dry_run:
        print("\n(No files were modified. Use --inplace to write changes.)")

if __name__ == "__main__":
    main()
