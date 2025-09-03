#!/usr/bin/env python3
import csv, json, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BOOK = "exodus"
CANON = "tanakh"

CSV_PATH   = REPO / "tools" / f"{BOOK}_kjv.csv"          # optional (chapter,verse,text)
COUNTS_JSON= REPO / "tools" / f"{BOOK}_verse_counts.json" # required if CSV absent
XREFS_JSON = REPO / "tools" / f"{BOOK}_xrefs.json"        # optional ({"ch:vs": ["Ref 1", ...]})
OUT_DIR    = REPO / "data" / CANON / BOOK

def load_csv_rows():
    if not CSV_PATH.exists():
        return None
    rows = []
    with CSV_PATH.open("r", encoding="utf-8") as f:
        rdr = csv.DictReader(f)
        need = {"chapter","verse","text"}
        if not need.issubset(set((rdr.fieldnames or []))):
            print(f"ERROR: {CSV_PATH} must have columns: chapter,verse,text", file=sys.stderr)
            sys.exit(1)
        for r in rdr:
            try:
                ch = int(str(r["chapter"]).strip())
                vs = int(str(r["verse"]).strip())
            except:
                continue
            t = (r.get("text") or "").strip()
            rows.append((ch, vs, t))
    return rows

def load_counts():
    if not COUNTS_JSON.exists():
        print(f"ERROR: Missing {COUNTS_JSON}. Provide verse counts or a CSV.", file=sys.stderr)
        sys.exit(1)
    with COUNTS_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)
    # normalize keys to int, values to int
    counts = {}
    for k, v in data.items():
        try:
            counts[int(k)] = int(v)
        except:
            pass
    return counts

def load_xrefs():
    if not XREFS_JSON.exists():
        return {}
    with XREFS_JSON.open("r", encoding="utf-8") as f:
        m = json.load(f)
    # normalize keys like "ch:vs" -> list[str]
    out = {}
    for k, v in m.items():
        try:
            ch, vs = k.split(":")
            key = f"{int(ch)}:{int(vs)}"
            out[key] = [s for s in (v or []) if isinstance(s, str) and s.strip()]
        except:
            continue
    return out

def ensure_outdir():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

def write_chapter(ch, verses, xmap):
    """verses: list of (vnum, text) tuples in numeric order"""
    arr = []
    for vnum, text in verses:
        key = f"{ch}:{vnum}"
        arr.append({
            "v": vnum,
            "t": text,
            "c": xmap.get(key, []),
            "s": []  # strongs placeholder for future enrichment
        })
    out = OUT_DIR / f"{ch}.json"
    with out.open("w", encoding="utf-8") as f:
        json.dump(arr, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Wrote {out.relative_to(REPO)} ({len(arr)} verses)")

def main():
    ensure_outdir()
    xrefs = load_xrefs()
    csv_rows = load_csv_rows()

    if csv_rows is not None:
        # build from CSV
        chapters = {}
        for ch, vs, t in csv_rows:
            chapters.setdefault(ch, []).append((vs, t if t else f"Exodus {ch}:{vs}"))
        for ch in sorted(chapters.keys()):
            verses = sorted(chapters[ch], key=lambda x: x[0])
            write_chapter(ch, verses, xrefs)
    else:
        # build from verse counts with placeholders
        counts = load_counts()
        for ch in sorted(counts.keys()):
            total = counts[ch]
            verses = [(v, f"Exodus {ch}:{v}") for v in range(1, total+1)]
            write_chapter(ch, verses, xrefs)

if __name__ == "__main__":
    main()
