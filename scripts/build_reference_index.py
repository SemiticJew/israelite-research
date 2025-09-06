#!/usr/bin/env python3
# build_reference_index.py
#
# Normalize mixed Bible dictionary JSON files into a common schema:
#   { term: str, definitions: [str, ...], source: str }
#
# Input:  a folder (e.g., data/dictionaries) containing JSONs
# Output: data/dictionaries/_normalized/<source>.json
#         data/dictionaries/_normalized/combined.json
#
# Usage:
#   python3 scripts/build_reference_index.py data/dictionaries \
#       -o data/dictionaries/_normalized --minify
#
# Notes:
# - Easton/Hitchcock in the simple format will pass through unchanged.
# - Other schemas are gently coerced if possible (definition/def/body -> definitions[]).

import argparse, json, re, sys
from pathlib import Path

def read_json(p: Path):
    try:
        with p.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[warn] failed to read {p}: {e}", file=sys.stderr)
        return None

def to_list(x):
    if x is None: return []
    if isinstance(x, list): return [str(i).strip() for i in x if str(i).strip()]
    s = str(x).strip()
    return [s] if s else []

CLEAN_SRC_RE = re.compile(r'[_\- ]+')

def infer_source_name(path: Path):
    # e.g., hitchcock_bible_dictionary.json -> "Hitchcock"
    stem = path.stem.lower()
    # special cases
    if "easton" in stem: return "Easton"
    if "hitchcock" in stem: return "Hitchcock"
    if "smith" in stem: return "Smith"
    if "isbe" in stem: return "ISBE"
    if "nave" in stem or "naves" in stem: return "Nave"
    if "holman" in stem: return "Holman"
    if "zodhiate" in stem or "zodhiates" in stem: return "Zodhiates"
    if "israelite" in stem and "dictionary" in stem: return "ISD"
    # fallback: first token capitalized
    parts = CLEAN_SRC_RE.split(stem)
    return parts[0].capitalize() if parts else "Unknown"

def normalize_entry(row, source: str):
    """
    Accept rows in various shapes and normalize to:
      { "term": str, "definitions": [str,...], "source": str }
    """
    if not isinstance(row, dict):
        return None

    # Term fields commonly seen
    term = (row.get("term") or row.get("word") or row.get("title") or "").strip()
    if not term:
        return None

    # Definitions can appear under various keys
    defs = None
    for key in ("definitions", "definition", "def", "body", "text", "content"):
        if key in row:
            defs = row[key]
            break

    # Also handle entries like {"definitions": [{"p":"..."}]}
    if isinstance(defs, list) and defs and isinstance(defs[0], dict):
        # flatten common shapes
        flat = []
        for item in defs:
            if isinstance(item, dict):
                v = item.get("p") or item.get("text") or item.get("body") or item.get("def") or ""
                v = str(v).strip()
                if v: flat.append(v)
            else:
                v = str(item).strip()
                if v: flat.append(v)
        defs = flat

    # Coerce to list[str]
    definitions = to_list(defs)
    if not definitions:
        # try to build from other probable fields
        possible = []
        for k in ("abstract", "desc", "description"):
            if k in row:
                possible.append(str(row[k]).strip())
        definitions = [x for x in possible if x]

    if not definitions:
        # Discard entries without any meaningful content
        return None

    return {
        "term": term,
        "definitions": definitions,
        "source": source
    }

def main():
    ap = argparse.ArgumentParser(description="Normalize dictionary JSONs into a unified index.")
    ap.add_argument("input_dir", help="Directory containing dictionary JSON files")
    ap.add_argument("-o", "--outdir", default="data/dictionaries/_normalized", help="Output directory")
    ap.add_argument("--minify", action="store_true", help="Minify JSON output")
    args = ap.parse_args()

    in_dir = Path(args.input_dir).resolve()
    out_dir = Path(args.outdir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted([p for p in in_dir.glob("*.json") if p.name[0] != "_"])
    if not files:
        print(f"[error] no JSON files found in {in_dir}", file=sys.stderr)
        sys.exit(1)

    combined = []
    per_source = {}

    for jf in files:
        src = infer_source_name(jf)
        data = read_json(jf)
        if data is None:
            continue

        # Easton/Hitchcock often: list of {term, definitions}
        # Some packs: {"entries":[...]}
        entries = data if isinstance(data, list) else data.get("entries") if isinstance(data, dict) else None
        if not isinstance(entries, list):
            print(f"[warn] {jf.name}: unrecognized top-level shape; skipping")
            continue

        out_entries = []
        for row in entries:
            norm = normalize_entry(row, src)
            if norm:
                out_entries.append(norm)
                combined.append(norm)

        per_source.setdefault(src, []).extend(out_entries)
        print(f"[ok] {jf.name}: {len(out_entries)} normalized entries (source={src})")

    # Write per-source files
    for src, items in per_source.items():
        out_path = out_dir / f"{src.lower()}.json"
        with out_path.open("w", encoding="utf-8") as f:
            if args.minify:
                json.dump(items, f, ensure_ascii=False, separators=(",", ":"))
            else:
                json.dump(items, f, ensure_ascii=False, indent=2)
        print(f"[ok] wrote {len(items)} → {out_path}")

    # Write combined file
    combo_path = out_dir / "combined.json"
    with combo_path.open("w", encoding="utf-8") as f:
        if args.minify:
            json.dump(combined, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(combined, f, ensure_ascii=False, indent=2)
    print(f"[ok] total {len(combined)} entries → {combo_path}")

if __name__ == "__main__":
    main()
