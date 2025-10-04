#!/usr/bin/env python3
# tools/merge_hebrew_dict_into_strongs.py
"""
Robustly merge classic Strong's Hebrew JS dictionary into strongs-hebrew.json.

Strategies:
  1) JXA eval + scan globals/exports for best candidate object (many H#### keys).
  2) If JXA not available or fails, try:
     - direct JSON (file starts with '{')
     - module.exports = {...} or var/const/let X = {...}
       using balanced-brace extraction (largest object literal in file).
Outputs:
  data/lexicon/strongs-hebrew.json (updated with xlit/pron/derivation/strongs_def/kjv_def if present)
"""

import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "data" / "lexicon" / "strongs-hebrew.json"
DICT_JS   = ROOT / "data" / "lexicon" / "strongs-hebrew-dictionary.js"

# ---------- IO ----------
def load_base_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))

# ---------- Utilities ----------
def normalize_key(k: str) -> str:
    k = str(k).strip()
    m = re.match(r'^(?:[Hh]0*)?(\d+)$', k) or re.match(r'^[Hh](\d+)$', k)
    return f"H{int(m.group(1),10)}" if m else k.upper()

def merge_entry(dst: dict, src: dict):
    # Only fill if missing/empty
    for k in ("xlit","pron","derivation","strongs_def","kjv_def"):
        v = src.get(k)
        if v is None: 
            continue
        if isinstance(v, str) and not v.strip():
            continue
        if k not in dst or (isinstance(dst.get(k), str) and not dst.get(k).strip()):
            dst[k] = v
    return dst

def looks_like_hebrew_map(d: dict) -> bool:
    if not isinstance(d, dict) or not d:
        return False
    # must have many H#### keys
    hits = sum(1 for k in list(d.keys())[:2000] if re.match(r'^H\d+$', str(k)))
    return hits >= 10  # lenient threshold

# ---------- Strategy 1: JXA evaluation ----------
def try_jxa_extract(js_path: Path):
    jxa = r'''
    ObjC.import('Foundation');
    function read(p){ return $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null).js; }
    function countH(obj){ var n=0; if(!obj||typeof obj!=='object') return 0;
      for (var k in obj){ if(/^H\d+$/.test(k)) n++; } return n; }
    function lexScore(d){
      if (!d || typeof d!=='object') return -1;
      var h = countH(d); if (h<=0) return -1;
      var s=0, c=0;
      for (var k in d){
        if(!/^H\d+$/.test(k)) continue;
        var v=d[k]; if (!v||typeof v!=='object') continue;
        if ('lemma' in v) s+=3;
        if ('gloss' in v) s+=2;
        if ('defs' in v) s+=2;
        if ('xlit' in v || 'translit' in v) s+=1;
        if ('derivation' in v) s+=1;
        c++; if (c>60) break;
      }
      return h + s*5;
    }
    function run(path){
      var s = read(path);
      var box = {};
      (new Function('with(this){' + s + '\n; return this; }')).call(box);

      var cands = [];
      function push(x){ try{ if (x && typeof x==='object') cands.push(x); }catch(e){} }
      // common exports
      push(box.strongsHebrewDictionary);
      push(box.STRONGS_HEBREW);
      push(box.strongsHebrew);
      if (typeof box.module==='object' && box.module && box.module.exports) push(box.module.exports);
      if (typeof box.exports==='object' && box.exports) push(box.exports.default || box.exports);

      // scan globals
      for (var k in box){ if (box.hasOwnProperty(k)) push(box[k]); }

      var best=null, bestScore=-1;
      for (var i=0;i<cands.length;i++){ var sc = lexScore(cands[i]); if(sc>bestScore){bestScore=sc;best=cands[i];} }
      if (!best || bestScore<100) throw new Error('No suitable dictionary found (score='+bestScore+').');

      return JSON.stringify(best);
    }
    run(ObjC.unwrap($(%s)));
    ''' % json.dumps(str(js_path))
    try:
        out = subprocess.check_output(["osascript","-l","JavaScript","-e", jxa], text=True, stderr=subprocess.STDOUT)
        obj = json.loads(out)
        return obj if looks_like_hebrew_map(obj) else None
    except Exception:
        return None

# ---------- Strategy 2: Parse as JSON or extract largest object ----------
def extract_largest_object_literal(text: str) -> dict:
    # If it looks like pure JSON already:
    txt = text.strip()
    if txt.startswith('{') and txt.rstrip().endswith('}'):
        try:
            j = json.loads(txt)
            if looks_like_hebrew_map(j): return j
        except Exception:
            pass

    # Remove comments
    txt = re.sub(r"/\*.*?\*/", "", txt, flags=re.S)
    txt = re.sub(r"//.*?$", "", txt, flags=re.M)

    # Find all potential object starts after '=' or at BOF
    starts = [m.end()-1 for m in re.finditer(r'=\s*{', txt)]
    if not starts:
        # fall back: first '{'
        m0 = txt.find('{')
        if m0 >= 0: starts = [m0]

    def find_balanced(end_from):
        depth = 0
        for i in range(end_from, len(txt)):
            ch = txt[i]
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i
        return -1

    best_segment = ''
    for st in starts:
        en = find_balanced(st)
        if en > st:
            seg = txt[st:en+1]
            if len(seg) > len(best_segment):
                best_segment = seg

    if not best_segment:
        raise ValueError("Could not locate a JS object literal in dictionary file.")

    # Normalize JS-ish to JSON
    obj = best_segment
    obj = re.sub(r'(?m)(^|\s|{|,)([A-Za-z_$][\w$]*)\s*:', r'\1"\2":', obj)  # quote bare keys
    obj = obj.replace("'", '"')
    obj = re.sub(r",(\s*[}\]])", r"\1", obj)  # trailing commas

    j = json.loads(obj)
    if not looks_like_hebrew_map(j):
        # allow maps keyed without H prefix (e.g., "430": {...})
        j2 = { normalize_key(k): v for k,v in j.items() }
        if looks_like_hebrew_map(j2): return j2
    return j

def load_dict(js_path: Path) -> dict:
    # 1) JXA
    obj = try_jxa_extract(js_path)
    if obj is not None:
        return obj
    # 2) Fallback parsing
    raw = js_path.read_text(encoding="utf-8", errors="replace")
    return extract_largest_object_literal(raw)

# ---------- Main ----------
def main():
    try:
        base = load_base_json(JSON_PATH)
    except Exception as e:
        print(f"[err] read {JSON_PATH}: {e}"); sys.exit(1)

    try:
        he = load_dict(DICT_JS)
    except Exception as e:
        print(f"[err] parse {DICT_JS}: {e}"); sys.exit(1)

    if not isinstance(he, dict) or not he:
        print("[err] parsed dictionary is empty or not a map"); sys.exit(1)

    merged = updated = created = 0
    for k, v in he.items():
        key = normalize_key(k)
        if key not in base:
            base[key] = {}; created += 1
        before = json.dumps(base[key], ensure_ascii=False, sort_keys=True)
        if isinstance(v, dict):
            # Normalize source fields (support alt spellings)
            if 'translit' in v and 'xlit' not in base[key]:
                base[key].setdefault('xlit', v.get('translit'))
            merge_entry(base[key], v)
        after = json.dumps(base[key], ensure_ascii=False, sort_keys=True)
        if before != after: updated += 1
        merged += 1

    JSON_PATH.write_text(json.dumps(base, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] merged entries: {merged}  (updated: {updated}, created: {created})")
    print(f"[ok] wrote → {JSON_PATH}")

if __name__ == "__main__":
    main()
