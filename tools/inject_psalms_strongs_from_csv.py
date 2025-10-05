#!/usr/bin/env python3
# tools/inject_psalms_strongs_from_csv.py
import csv, json, re
from pathlib import Path

CSV_PATH  = Path("data/lexicon/kjv_strongs.csv")  # use the full master CSV
PSALM_DIR = Path("data/tanakh/psalm")

HX = re.compile(r'\{([HG]\d{1,4})\}')
def extract_codes(text: str):
    if not text: return []
    # grab H#### / G####, ignore morphology like {(H8804)}
    codes = [m.group(1).upper() for m in HX.finditer(text)]
    # normalize e.g. H007 to H7 if needed
    norm = []
    seen = set()
    for c in codes:
        m = re.match(r'^([HG])0*(\d+)$', c)
        key = f"{m.group(1)}{int(m.group(2))}" if m else c
        if key not in seen:
            seen.add(key); norm.append(key)
    return norm

def load_psalm_rows(csv_path: Path):
    out = {}  # (chapter, verse) -> [codes]
    with csv_path.open(newline='', encoding='utf-8') as f:
        r = csv.DictReader(f)
        for row in r:
            try:
                if str(row.get("Book Number","")).strip() != "19":
                    continue
                ch = int(row["Chapter"])
                vs = int(row["Verse"])
                codes = extract_codes(row.get("Text",""))
                if codes:
                    out[(ch,vs)] = codes
            except Exception:
                continue
    return out

def main():
    idx = load_psalm_rows(CSV_PATH)
    total_rows = len(idx)
    files_changed = 0
    verses_injected = 0

    for jf in sorted(PSALM_DIR.glob("*.json")):
        ch = int(jf.stem)  # 1.json → 1
        data = json.loads(jf.read_text(encoding="utf-8"))
        changed = False
        for v in data.get("verses", []):
            key = (ch, int(v.get("v",0)))
            codes = idx.get(key, [])
            if codes and v.get("s",[]) != codes:
                v["s"] = codes
                changed = True
        if changed:
            jf.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            files_changed += 1
            verses_injected += sum(1 for v in data.get("verses",[]) if v.get("s"))

    print(f"[ok] Psalms CSV rows: {total_rows}")
    print(f"[ok] Files changed: {files_changed}")
    print(f"[ok] Verses with codes now set (counted across changed files): {verses_injected}")

if __name__ == "__main__":
    main()
