#!/usr/bin/env python3
"""
Generate Apocrypha JSON structure:

  data/apocrypha/<book-slug>/<chapter>.json   # array of {v,t,c,s}
  data/apocrypha/<book-slug>/_meta.json       # {"book": "<Display>", "chapters": N}

Supports TWO input formats:

A) Pipe-delimited rows (your file):
   Header: "Book,chapter,verse,text"
   Rows:   <CODE>|<chapter>|<verse>|<text...>
   e.g.:   Es1|1|1|And Josias held the feast...

   Book codes map to display names via CODE_TO_NAME.

B) Free-text with headers:
   Book: <Display Name>
   Chapter 1
   1 In the beginning...

Default input path if none provided: data/apocrypha_book.txt
"""

import re, json, sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "apocrypha"

# ------- mapping from short codes to display names (extend if needed) -------
CODE_TO_NAME = {
    # Esdras
    "Es1": "1 Esdras",
    "Es2": "2 Esdras",

    # Maccabees
    "Ma1": "1 Maccabees",
    "Ma2": "2 Maccabees",
    "1Mac": "1 Maccabees",
    "2Mac": "2 Maccabees",
    "3Mac": "3 Maccabees",
    "4Mac": "4 Maccabees",

    # Common Apocrypha
    "Tob": "Tobit",
    "Jdt": "Judith",
    "Wis": "Wisdom of Solomon",
    "Sir": "Sirach (Ecclesiasticus)",
    "Bar": "Baruch",
    "Bel": "Bel and the Dragon",
    "Sus": "Susanna",

    # Additions / Letters / Prayers
    "Aes": "Additions to Esther",
    "Aza": "Prayer of Azariah (Song of the Three)",
    "Epj": "Letter of Jeremiah",
    "Lao": "Epistle to the Laodiceans",
    "Man": "Prayer of Manasseh",

    # Aliases
    "EpJer": "Letter of Jeremiah",
    "LetJer": "Letter of Jeremiah",
    "PrAzar": "Prayer of Azariah (Song of the Three)",
    "SongThr": "Song of the Three Holy Children",
    "AddDan": "Additions to Daniel",
    "AddEst": "Additions to Esther",
    "AddEsth": "Additions to Esther",
}

def slugify(name: str) -> str:
    s = name.strip().lower()
    s = s.replace(" (ecclesiasticus)", "")
    s = s.replace("&", "and").replace("’", "'").replace("—", "-")
    s = "-".join(s.split())
    s = "".join(ch for ch in s if ch.isalnum() or ch == "-")
    return s

def ensure_outdir(path: Path):
    path.mkdir(parents=True, exist_ok=True)

def write_book(book_slug: str, display: str, chapters_map: dict):
    out_dir = OUT / book_slug
    ensure_outdir(out_dir)
    max_ch = 0
    for ch, arr in chapters_map.items():
        n = int(ch)
        max_ch = max(max_ch, n)
        with (out_dir / f"{n}.json").open("w", encoding="utf-8") as f:
            json.dump(arr, f, ensure_ascii=False, indent=2)
    meta = {"book": display, "chapters": max_ch or len(chapters_map)}
    with (out_dir / "_meta.json").open("w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

# --------- Format A: pipe-delimited "CODE|ch|v|text" ------------------------
def try_parse_pipe_format(lines):
    """
    Returns dict: { slug: { ch: [ {v,t,c,s}, ... ] } } or None if not detected.
    """
    if not lines:
        return None

    # detect marker: header contains commas; data lines contain '|'
    header = lines[0].strip().lower()
    if not ("," in header and ("book" in header and "chapter" in header and "verse" in header)):
        return None

    store = defaultdict(lambda: defaultdict(list))
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.rstrip("\n").split("|", 3)
        if len(parts) < 3:
            # Allow CSV with commas instead of pipes? Try comma split as a fallback.
            parts = line.rstrip("\n").split(",", 3)
            if len(parts) < 3:
                continue
        code = parts[0].strip()
        ch_s = parts[1].strip()
        v_s  = parts[2].strip()
        txt  = parts[3] if len(parts) > 3 else ""

        if not code or not ch_s or not v_s:
            continue
        try:
            ch = int(ch_s)
            v  = int(v_s)
        except ValueError:
            continue

        display = CODE_TO_NAME.get(code, code)
        slug = slugify(display)
        store[slug][ch].append({"v": v, "t": txt.strip(), "c": [], "s": []})

    # Coerce to normal dicts and sort verses
    final = {}
    for slug, chmap in store.items():
        final[slug] = {}
        for ch, verses in chmap.items():
            verses.sort(key=lambda x: x["v"])
            final[slug][ch] = verses
    return final

# --------- Format B: Book:/Chapter/verse-lines ------------------------------
BOOK_PAT = re.compile(r"^\s*(?:Book:|BOOK:|#)\s*(.+?)\s*$")
CH_PAT   = re.compile(r"^\s*(?:Chapter|CHAPTER|CH|C)\s+(\d+)\s*$")
V_PAT    = re.compile(r"^\s*(\d+)[\.\):\-]?\s+(.*\S)\s*$")

def try_parse_free_text(lines):
    """
    Returns dict: { slug: { ch: [ {v,t,c,s}, ... ] } } or None if not detected.
    """
    current_book = None
    current_slug = None
    ch_num = None
    verses = []
    store = defaultdict(lambda: defaultdict(list))

    def flush_chapter():
        if current_slug and ch_num is not None and verses:
            store[current_slug][ch_num].extend(
                {"v": int(vn), "t": txt.strip(), "c": [], "s": []}
                for vn, txt in verses
            )

    for raw in lines:
        line = raw.rstrip("\n")
        if not line.strip():
            continue
        m = BOOK_PAT.match(line)
        if m:
            flush_chapter()
            current_book = m.group(1).strip()
            current_slug = slugify(current_book)
            ch_num = None
            verses = []
            continue
        if current_book is None and line.isupper() and len(line.split()) <= 6:
            flush_chapter()
            current_book = line.title().strip()
            current_slug = slugify(current_book)
            ch_num = None
            verses = []
            continue
        m = CH_PAT.match(line)
        if m:
            flush_chapter()
            ch_num = int(m.group(1))
            verses = []
            continue
        m = V_PAT.match(line)
        if m and current_slug and ch_num is not None:
            verses.append((m.group(1), m.group(2)))
            continue
        if current_slug and ch_num is None:
            mv = V_PAT.match(line)
            if mv:
                ch_num = 1
                verses = [(mv.group(1), mv.group(2))]
                continue

    # tail
    if current_slug and ch_num is not None:
        flush_chapter()

    if not store:
        return None

    # normalize
    final = {}
    for slug, chmap in store.items():
        final[slug] = {}
        for ch, arr in chmap.items():
            arr.sort(key=lambda x: x["v"])
            final[slug][ch] = arr
    return final

# ---------------------------------------------------------------------------
def main():
    # Input path
    if len(sys.argv) < 2:
        txt_path = Path("data/apocrypha_book.txt")
    else:
        txt_path = Path(sys.argv[1])

    if not txt_path.exists():
        print(f"[error] not found: {txt_path}", file=sys.stderr)
        sys.exit(2)

    lines = txt_path.read_text(encoding="utf-8", errors="ignore").splitlines()

    # Try pipe-delimited first; then free-text
    parsed = try_parse_pipe_format(lines)
    fmt = "pipe"
    if not parsed:
        parsed = try_parse_free_text(lines)
        fmt = "free-text"

    if not parsed:
        print("[error] could not detect input format (pipe or free-text).", file=sys.stderr)
        sys.exit(2)

    # Build display map for meta: derive display from slug (or reverse CODE_TO_NAME where possible)
    # For pipe format we can reconstruct display from slug via first encountered mapping
    # but simpler: humanize slug.
    def humanize(slug):
        parts = slug.split("-")
        def cap(w): return w if w.isdigit() else (w[:1].upper() + w[1:])
        return " ".join(cap(p) for p in parts)

    ensure_outdir(OUT)

    # Write out all books
    book_count = 0
    ch_count = 0
    verse_count = 0
    for slug, chmap in parsed.items():
        display = humanize(slug)
        # A nicer display if we can guess leading ordinal
        m = re.match(r"^([123])\-(.+)$", slug)
        if m:
            display = f"{m.group(1)} {humanize(m.group(2))}"
        write_book(slug, display, chmap)
        book_count += 1
        ch_count += len(chmap)
        for arr in chmap.values():
            verse_count += len(arr)

    print(f"[ok] Parsed format: {fmt}")
    print(f"[ok] Wrote {book_count} books, {ch_count} chapters, {verse_count} verses under {OUT}")

if __name__ == "__main__":
    main()
