#!/usr/bin/env python3
"""
Merge classic Strong's Hebrew dictionary JS into strongs-hebrew.json

Inputs (expected paths):
- data/lexicon/strongs-hebrew.json
- data/lexicon/strongs-hebrew-dictionary.js   (var strongsHebrewDictionary = { ... })

Output (overwrites):
- data/lexicon/strongs-hebrew.json

What gets merged per key (e.g., H7225):
- xlit, pron, derivation, strongs_def, kjv_def  (only if present in the JS dictionary)
Keeps your existing fields (lemma, translit, pos, gloss, defs, refs) intact.
"""

import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "data" / "lexicon" / "strongs-hebrew.json"
DICT_JS   = ROOT / "data" / "lexicon" / "strongs-hebrew-dictionary.js"
DEBUG_DUMP = ROOT / "data" / "lexicon" / "_debug_strongs_hebrew_obj.json5"

def load_base_json(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[err] Could not read {p}: {e}")
        sys.exit(1)

def extract_js_object(js_text: str):
    """
    Try to extract the JS object assigned to strongsHebrewDictionary = { ... };
    Then convert to JSON-ish and parse.
    """
    m = re.search(
        r"strongsHebrewDictionary\s*=\s*({.*});?",
        js_text, re.S
    )
    if not m:
        raise ValueError("Could not find strongsHebrewDictionary in JS file")
    obj_text = m.group(1).strip()

    # Heuristic sanitation to JSON:
    # 1) ensure keys are quoted (simple dotted/word keys)
    obj_text = re.sub(r"(\s*)([A-Za-z0-9_.$]+)\s*:", r'\1"\2":', obj_text)
    # 2) single quotes -> double quotes
    obj_text = obj_text.replace("'", '"')
    # 3) Allow trailing commas by removing them before } or ]
    obj_text = re.sub(r",(\s*[}\]])", r"\1", obj_text)
    # 4) Remove JS comments (/*...*/ and //...)
    obj_text = re.sub(r"/\*.*?\*/", "", obj_text, flags=re.S)
    obj_text = re.sub(r"//.*?$", "", obj_text, flags=re.M)

    try:
        return json.loads(obj_text)
    except Exception as e:
        DEBUG_DUMP.write_text(obj_text, encoding="utf-8")
        raise ValueError(
            f"JSON parse failed. Wrote debug to {DEBUG_DUMP.name}\n{e}"
        )

def load_dict_js(p: Path):
    try:
        js = p.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        print(f"[err] Could not read {p}: {e}")
        sys.exit(1)
    return extract_js_object(js)

def merge_entry(dst: dict, add: dict):
    """
    Merge dictionary fields if present. Prefer existing values in dst;
    only add new fields or fill null/empty ones.
    """
    if not add:
        return dst
    # Fields we want to copy from the classic dictionary:
    for k in ("xlit", "pron", "derivation", "strongs_def", "kjv_def"):
        val = add.get(k)
        if val is None or (isinstance(val, str) and not val.strip()):
            continue
        # only set if missing
        if dst.get(k) in (None, ""):
            dst[k] = val
    return dst

def main():
    base = load_base_json(JSON_PATH)
    he_dict = load_dict_js(DICT_JS)

    if not isinstance(base, dict):
        print("[err] strongs-hebrew.json must be an object of H#### keys.")
        sys.exit(1)
    if not isinstance(he_dict, dict):
        print("[err] strongs-hebrew-dictionary.js extracted object is not a dict.")
        sys.exit(1)

    merged = 0
    created = 0
    updated = 0

    for key, dval in he_dict.items():
        # Normalize key e.g., "H07225" → "H7225"
        m = re.match(r'^[Hh]?0*([0-9]+)$', key) or re.match(r'^([Hh]\d+)$', key)
        if m:
            n = m.group(1)
            if not n.startswith(("H","h")):
                key_norm = f"H{int(n,10)}"
            else:
                key_norm = f"H{int(n[1:],10)}"
        else:
            key_norm = key.upper()

        if key_norm not in base:
            # create minimal skeleton if dictionary has something we don't have
            base[key_norm] = {}
            created += 1

        before = json.dumps(base[key_norm], ensure_ascii=False, sort_keys=True)
        base[key_norm] = merge_entry(base[key_norm], dval)
        after = json.dumps(base[key_norm], ensure_ascii=False, sort_keys=True)
        if before != after:
            updated += 1
        merged += 1

    # Write back
    JSON_PATH.write_text(json.dumps(base, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[ok] merged entries: {merged}  (updated: {updated}, created: {created})")
    print(f"[ok] wrote → {JSON_PATH}")

if __name__ == "__main__":
    main()
