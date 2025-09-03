#!/usr/bin/env python3
import csv, json, argparse, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

def norm_header(name: str) -> str:
    return (name or "").strip().lower()

def load_kjv_rows(csv_path: Path, target_book: str):
    rows = []
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        rdr = csv.DictReader(f)
        if not rdr.fieldnames:
            print("ERROR: CSV has no headers.", file=sys.stderr); sys.exit(1)
        # map headers loosely
        headers = {norm_header(h): h for h in rdr.fieldnames}
        req = ["book","chapter","verse","text"]
        if not all(k in headers for k in req):
            print(f"ERROR: CSV must include headers: {', '.join(req)} (case-insensitive). Found: {rdr.fieldnames}", file=sys.stderr)
            sys.exit(1)
        h_book = headers["book"]; h_ch = headers["chapter"]; h_vs = headers["verse"]; h_tx = headers["text"]
        for r in rdr:
            b = (r.get(h_book) or "").strip()
            if not b: continue
            if b.lower() != target_book.lower():
                continue
            try:
                ch = int(str(r.get(h_ch,"")).strip())
                vs = int(str(r.get(h_vs,"")).strip())
            except:
                continue
            t = (r.get(h_tx) or "").strip()
            rows.append((ch, vs, t))
    if not rows:
        print(f"ERROR: No rows found for book '{target_book}' in {csv_path}", file=sys.stderr)
        sys.exit(1)
    return rows

def load_xrefs(book_slug: str):
    xrefs_path = REPO / "tools" / f"{book_slug}_xrefs.json"
    if not xrefs_path.exists(): return {}
    with xrefs_path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    out = {}
    for k, v in raw.items():
        try:
            ch, vs = k.split(":")
            key = f"{int(ch)}:{int(vs)}"
            out[key] = [s for s in (v or []) if isinstance(s, str) and s.strip()]
        except:
            continue
    return out

def ensure_outdir(canon: str, book_slug: str) -> Path:
    out_dir = REPO / "data" / canon / book_slug
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir

def write_chapter(out_dir: Path, ch: int, verses, xmap):
    arr = []
    for vnum, text in verses:
        key = f"{ch}:{vnum}"
        arr.append({
            "v": vnum,
            "t": text,
            "c": xmap.get(key, []),
            "s": []
        })
    out = out_dir / f"{ch}.json"
    with out.open("w", encoding="utf-8") as f:
        json.dump(arr, f, ensure_ascii=False, indent=2); f.write("\n")
    print(f"Wrote {out.relative_to(REPO)} ({len(arr)} verses)")

def main():
    ap = argparse.ArgumentParser(description="Build per-chapter JSON from a full KJV CSV (Book,Chapter,Verse,Text).")
    ap.add_argument("--canon", required=True, choices=["tanakh","newtestament"])
    ap.add_argument("--book", required=True, help="Book slug, e.g. exodus")
    ap.add_argument("--csv", required=True, help="Path to full KJV CSV with Book,Chapter,Verse,Text columns")
    args = ap.parse_args()

    book_slug = args.book.lower()
    # canonical display (simple title-case, keep hyphens/numbers formatted)
    display = " ".join(part.capitalize() if not part.isdigit() else part for part in book_slug.replace("-", " ").split())
    # special-cases that title-case mangles
    specials = {
        "1 samuel":"1 Samuel","2 samuel":"2 Samuel","1 kings":"1 Kings","2 kings":"2 Kings",
        "1 chronicles":"1 Chronicles","2 chronicles":"2 Chronicles","song of solomon":"Song of Solomon",
        "1 corinthians":"1 Corinthians","2 corinthians":"2 Corinthians","1 thessalonians":"1 Thessalonians",
        "2 thessalonians":"2 Thessalonians","1 timothy":"1 Timothy","2 timothy":"2 Timothy",
        "1 peter":"1 Peter","2 peter":"2 Peter","1 john":"1 John","2 john":"2 John","3 john":"3 John"
    }
    display = specials.get(display.lower(), display)

    csv_path = (REPO / args.csv) if not args.csv.startswith("/") else Path(args.csv)
    if not csv_path.exists():
        print(f"ERROR: CSV not found: {csv_path}", file=sys.stderr); sys.exit(1)

    rows = load_kjv_rows(csv_path, display)
    xmap = load_xrefs(book_slug)
    out_dir = ensure_outdir(args.canon, book_slug)

    chapters = {}
    for ch, vs, t in rows:
        chapters.setdefault(ch, []).append((vs, t))

    for ch in sorted(chapters.keys()):
        verses = sorted(chapters[ch], key=lambda x: x[0])
        write_chapter(out_dir, ch, verses, xmap)

if __name__ == "__main__":
    main()
