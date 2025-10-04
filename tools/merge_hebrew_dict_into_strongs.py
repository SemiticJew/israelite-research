#!/usr/bin/env python3
# tools/merge_hebrew_dict_into_strongs.py
"""
Robustly merge classic Strong's Hebrew JS dictionary into strongs-hebrew.json.

Strategy:
1) Try macOS JXA (osascript -l JavaScript) to evaluate the JS and JSON.stringify the object.
2) If JXA not available or fails, fall back to a sanitizer that converts JS-ish to JSON.
3) Merge fields: xlit, pron, derivation, strongs_def, kjv_def (only add if missing).

Inputs:
- data/lexicon/strongs-hebrew.json
- data/lexicon/strongs-hebrew-dictionary.js

Output:
- data/lexicon/strongs-hebrew.json (overwritten)
"""

import json, re, subprocess, shlex, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "data" / "lexicon" / "strongs-hebrew.json"
DICT_JS   = ROOT / "data" / "lexicon" / "strongs-hebrew-dictionary.js"
DEBUG_JS5 = ROOT / "data" / "lexicon" / "_debug_strongs_hebrew_obj.json5"

def load_base_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))

def try_jxa_extract(js_path: Path):
    """
    Use macOS JXA to evaluate the JS and stringify global 'strongsHebrewDictionary'.
    Returns Python dict on success, or None on failure.
    """
    jxa = r'''
    ObjC.import('Foundation');
    function run(argv){
      var fm = $.NSFileManager.defaultManager;
      var path = argv[0];
      var s = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js;
      // Evaluate in a clean Function scope to avoid leaking variables
      var fn = new Function(s + "\n;return (this.strongsHebrewDictionary || strongsHebrewDictionary || (typeof module!=='undefined' && module.exports) || (typeof exports!=='undefined' && (exports.default || exports)) || null);");
      var obj = fn.call({});
      if (!obj) throw new Error("strongsHebrewDictionary variable not found.");
      return JSON.stringify(obj);
    }
    '''
    try:
        out = subprocess.check_output(
            ["osascript", "-l", "JavaScript", "-e", jxa, str(js_path)],
            stderr=subprocess.STDOUT,
            text=True
        )
        return json.loads(out)
    except Exception as e:
        return None

def sanitize_js_object(raw_text: str):
    """
    Fallback: extract `strongsHebrewDictionary = { ... };` and coerce to JSON.
    Not as bulletproof as JXA, but works for most clean JS object literals.
    """
    m = re.search(r"strongsHebrewDictionary\s*=\s*({.*});?\s*$", raw_text, re.S)
    if not m:
        raise ValueError("Could not locate strongsHebrewDictionary object in JS.")
    obj = m.group(1)

    # Strip block and line comments
    obj = re.sub(r"/\*.*?\*/", "", obj, flags=re.S)
    obj = re.sub(r"//.*?$", "", obj, flags=re.M)

    # Quote bare keys: foo: -> "foo":
    obj = re.sub(r'(?m)(^|\s|{|,)([A-Za-z_$][\w$]*)\s*:', r'\1"\2":', obj)

    # Convert single quotes to double quotes
    obj = obj.replace("'", '"')

    # Remove trailing commas before } or ]
    obj = re.sub(r",(\s*[}\]])", r"\1", obj)

    try:
        return json.loads(obj)
    except Exception as e:
        DEBUG_JS5.write_text(obj, encoding="utf-8")
        raise ValueError(f"JSON parse failed; wrote debug to {DEBUG_JS5.name}\n{e}")

def load_dict(js_path: Path):
    # 1) Prefer JXA
    data = try_jxa_extract(js_path)
    if data is not None:
        return data
    # 2) Fallback sanitizer
    raw = js_path.read_text(encoding="utf-8", errors="replace")
    return sanitize_js_object(raw)

def merge_entry(dst: dict, src: dict):
    """
    Only add these fields if they are missing/empty in dst:
    xlit, pron, derivation, strongs_def, kjv_def
    """
    if not isinstance(src, dict):
        return dst
    for k in ("xlit", "pron", "derivation", "strongs_def", "kjv_def"):
        v = src.get(k)
        if v is None: 
            continue
        if isinstance(v, str) and not v.strip():
            continue
        if k not in dst or (isinstance(dst.get(k), str) and not dst.get(k).strip()):
            dst[k] = v
    return dst

def normalize_key(k: str) -> str:
    k = str(k).strip()
    # Accept "H07225", "H7225", "7225", "h07225"
    m = re.match(r'^[Hh]?0*([0-9]+)$', k)
    if m:
        return f"H{int(m.group(1),10)}"
    m = re.match(r'^[Hh]([0-9]+)$', k)
    if m:
        return f"H{int(m.group(1),10)}"
    return k.upper()

def main():
    try:
        base = load_base_json(JSON_PATH)
    except Exception as e:
        print(f"[err] read {JSON_PATH}: {e}")
        sys.exit(1)

    try:
        he = load_dict(DICT_JS)
    except Exception as e:
        print(f"[err] parse {DICT_JS}: {e}")
        sys.exit(1)

    if not isinstance(base, dict):
        print("[err] strongs-hebrew.json must be an object of H#### keys.")
        sys.exit(1)
    if not isinstance(he, dict):
        print("[err] parsed dictionary is not an object.")
        sys.exit(1)

    merged = updated = created = 0
    for k, v in he.items():
        key = normalize_key(k)
        if key not in base:
            base[key] = {}
            created += 1
        before = json.dumps(base[key], ensure_ascii=False, sort_keys=True)
        merge_entry(base[key], v)
        after = json.dumps(base[key], ensure_ascii=False, sort_keys=True)
        if before != after:
            updated += 1
        merged += 1

    JSON_PATH.write_text(json.dumps(base, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] merged entries: {merged}  (updated: {updated}, created: {created})")
    print(f"[ok] wrote → {JSON_PATH}")

if __name__ == "__main__":
    main()
