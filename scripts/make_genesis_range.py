#!/usr/bin/env python3
# Usage:
#   python3 scripts/make_genesis_range.py 42 43
# or to do "onward":
#   python3 scripts/make_genesis_range.py 42 50
#
# Writes: data/tanakh/genesis/<chapter>.json
# Schema per your site: { book, chapter, verses: [{num,text,crossRefs,commentary,"strongs": []}] }

import json, os, sys, time, urllib.parse, urllib.request

BASE_OUT = "data/tanakh/genesis"
BOOK     = "Genesis"
API      = "https://bible-api.com/{q}?translation=kjv"   # public-domain KJV

def fetch_chapter_text(book:str, chapter:int):
    q = f"{book} {chapter}"
    url = API.format(q=urllib.parse.quote(q))
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read().decode("utf-8"))
    # bible-api returns {"reference":"Genesis 42","verses":[{"book_id":"Gen","book_name":"Genesis","chapter":42,"verse":1,"text":"..."}], ...}
    verses = []
    for v in data.get("verses", []):
        verses.append({
            "num": int(v["verse"]),
            "text": v["text"].strip(),
        })
    return verses

# Minimal seed cross references for a handful of verses.
CROSS_SEED = {
    42: {
        1:  [ {"ref":"Genesis 41:56-57","note":"Famine drives nations to Egypt"} ],
        6:  [ {"ref":"Acts 7:11-12","note":"Famine in all the land"} ],
        18: [ {"ref":"Proverbs 1:7","note":"Fear of the LORD"} ],
        21: [ {"ref":"Genesis 37:23-28","note":"Their guilt re Joseph"} ],
        36: [ {"ref":"Genesis 37:28","note":"Midianites/Ishmaelites"} ],
    },
    43: {
        3:  [ {"ref":"Genesis 42:20","note":"Benjamin required as proof"} ],
        14: [ {"ref":"Genesis 28:3","note":"El Shaddai (God Almighty)"} ],
        23: [ {"ref":"Genesis 42:25","note":"Money in the sacks"} ],
        34: [ {"ref":"Genesis 45:24","note":"Joseph restrains himself"} ],
    }
}

# A few Strong’s seeds per chapter (tiny sampling to keep file manageable).
# Format you’ve used: [{"num":"Hxxxx","lemma":"...", "gloss":"..."}]
STRONGS_SEED = {
    42: {
        1:  [ {"num":"H7458","lemma":"ra‘ab","gloss":"famine"},
              {"num":"H4714","lemma":"Mitzrayim","gloss":"Egypt"} ],
        6:  [ {"num":"H8269","lemma":"sar","gloss":"ruler, prince"} ],
        18: [ {"num":"H3372","lemma":"yare’","gloss":"to fear, revere"} ],
        21: [ {"num":"H819","lemma":"’asham","gloss":"guilty"} ],
        36: [ {"num":"H4092","lemma":"Midyan","gloss":"Midian"},
              {"num":"H3459","lemma":"Yishma‘elim","gloss":"Ishmaelites"} ],
    },
    43: {
        3:  [ {"num":"H6743","lemma":"tsalach","gloss":"to prosper"} ],
        14: [ {"num":"H7706","lemma":"Shaddai","gloss":"Almighty"} ],
        23: [ {"num":"H7969","lemma":"shalosh","gloss":"three"},
              {"num":"H3701","lemma":"keseph","gloss":"silver, money"} ],
        34: [ {"num":"H4960","lemma":"mishteh","gloss":"banquet, drink"} ],
    }
}

def build_chapter_json(ch:int):
    verses = fetch_chapter_text(BOOK, ch)
    cross = CROSS_SEED.get(ch, {})
    strongs = STRONGS_SEED.get(ch, {})

    out = {
        "book": BOOK,
        "chapter": ch,
        "verses": []
    }
    for v in verses:
        n = v["num"]
        out["verses"].append({
            "num": n,
            "text": v["text"],
            "crossRefs": cross.get(n, []),
            "commentary": "",
            "strongs": strongs.get(n, [])
        })
    return out

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/make_genesis_range.py <start_chapter> <end_chapter>")
        sys.exit(1)

    start = int(sys.argv[1])
    end   = int(sys.argv[2])
    os.makedirs(BASE_OUT, exist_ok=True)

    for ch in range(start, end+1):
        j = build_chapter_json(ch)
        out_path = os.path.join(BASE_OUT, f"{ch}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(j, f, ensure_ascii=False, indent=2)
        print(f"Wrote {out_path}")
        time.sleep(0.4)  # gentle on API

if __name__ == "__main__":
    main()
