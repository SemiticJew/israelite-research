#!/usr/bin/env python3
"""
Fill israelite-research/data/newtestament/matthew/1..28.json
with KJV text from Project Gutenberg (public domain).

It prefers Matthew-only plaintext:
  https://www.gutenberg.org/files/8040/8040-0.txt  (primary)
  https://www.gutenberg.org/files/8040/8040.txt    (fallback)

Optional full KJV HTML fallback (slower to parse):
  https://www.gutenberg.org/files/10/10-h/10-h.htm

JSON shape per chapter:
{
  "book": "Matthew",
  "chapter": N,
  "verses": [{ "v": 1, "t": "Verse text...", "s": [] }, ...],
  "lexicon": {},
  "commentary": ""
}
"""
import re, json, sys
from pathlib import Path

import urllib.request

MAT_PLAINTEXT_URLS = [
    "https://www.gutenberg.org/files/8040/8040-0.txt",
    "https://www.gutenberg.org/files/8040/8040.txt",
]
FULL_KJV_HTML = "https://www.gutenberg.org/files/10/10-h/10-h.htm"

OUT_ROOT = Path("israelite-research/data/newtestament/matthew")
CHAPTERS = 28

CHAPTER_LINE = re.compile(r"^\s*Matthew\s+(\d+)\s*$", re.IGNORECASE)
VERSE_LINE   = re.compile(r"^\s*(\d+)\s+(.*\S)\s*$")

def http_get(url, timeout=30):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        enc = r.headers.get_content_charset() or "utf-8"
        return r.read().decode(enc, errors="replace")

def parse_matthew_plaintext(text: str):
    """Parse a Matthew-only plaintext dump (Gutenberg #8040)."""
    chapters = {}
    cur = None
    for line in text.splitlines():
        if not line.strip():
            continue
        m = CHAPTER_LINE.match(line)
        if m:
            cur = int(m.group(1))
            chapters[cur] = []
            continue
        if cur:
            mv = VERSE_LINE.match(line)
            if mv:
                v = int(mv.group(1)); t = mv.group(2)
                chapters[cur].append({"v": v, "t": t, "s": []})
    return chapters

def extract_matthew_from_full_kjv_html(html: str):
    """
    VERY simple extractor: find the 'The Gospel According to St. Matthew' header
    and read until the next gospel header. Works with 10-h.htm’s structure.
    """
    # Normalize for easier matching
    H = html
    # Anchor near Matthew heading
    start = H.lower().find("the gospel according to st. matthew")
    if start == -1:
        start = H.lower().find("the gospel according to saint matthew")
    if start == -1:
        return {}

    # End before Mark header
    end = H.lower().find("the gospel according to st. mark", start)
    if end == -1:
        end = len(H)

    segment = H[start:end]
    # Remove tags; crude but effective
    segment = re.sub(r"<[^>]+>", "\n", segment)
    segment = re.sub(r"\r", "", segment)

    chapters = {}
    cur = None
    for raw in segment.split("\n"):
        line = raw.strip()
        if not line:
            continue
        m = CHAPTER_LINE.match(line)
        if m:
            cur = int(m.group(1))
            chapters[cur] = []
            continue
        if cur:
            mv = VERSE_LINE.match(line)
            if mv:
                v = int(mv.group(1)); t = mv.group(2)
                chapters[cur].append({"v": v, "t": t, "s": []})
    return chapters

def load_or_seed(ch: int):
    p = OUT_ROOT / f"{ch}.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"book": "Matthew", "chapter": ch, "verses": [], "lexicon": {}, "commentary": ""}

def save(ch: int, obj):
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    p = OUT_ROOT / f"{ch}.json"
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def main():
    # Try plaintext Matthew endpoints
    data = {}
    for url in MAT_PLAINTEXT_URLS:
        try:
            txt = http_get(url)
            got = parse_matthew_plaintext(txt)
            if got and all(k in got for k in range(1, CHAPTERS+1)):
                data = got
                print(f"Loaded Matthew plaintext from {url}")
                break
        except Exception as e:
            print(f"[warn] could not fetch {url}: {e}")

    # Fallback to full KJV HTML extraction
    if not data:
        try:
            html = http_get(FULL_KJV_HTML)
            got = extract_matthew_from_full_kjv_html(html)
            if got:
                data = got
                print(f"Extracted Matthew from full KJV HTML {FULL_KJV_HTML}")
        except Exception as e:
            print(f"[warn] could not fetch full KJV HTML: {e}")

    if not data:
        print("ERROR: Could not obtain Matthew KJV text from Gutenberg endpoints.")
        sys.exit(1)

    made, missing = 0, []
    for ch in range(1, CHAPTERS+1):
        verses = data.get(ch, [])
        if not verses:
            missing.append(ch)
        obj = load_or_seed(ch)
        obj["book"] = "Matthew"
        obj["chapter"] = ch
        obj["verses"] = verses  # [{v,t,s:[]}, ...] already in shape
        if "lexicon" not in obj or not isinstance(obj.get("lexicon"), dict):
            obj["lexicon"] = {}
        if "commentary" not in obj or not isinstance(obj.get("commentary"), str):
            obj["commentary"] = ""
        save(ch, obj); made += 1

    print(f"Updated {made} JSON files under {OUT_ROOT}")
    if missing:
        print(f"WARNING: No verses parsed for chapters: {missing}")

if __name__ == "__main__":
    main()
