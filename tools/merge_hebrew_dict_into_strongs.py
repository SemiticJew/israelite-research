#!/usr/bin/env python3
# tools/merge_hebrew_dict_into_strongs.py
"""
Merge classic Strong's Hebrew JS dictionary into strongs-hebrew.json.

Upgrades:
- JXA evaluator now *hunts* for the right object by scanning globals and
  common exports, scoring candidates by number of H#### keys and presence
  of lexicon fields (lemma/gloss/defs/etc.).
- Falls back to sanitizer if JXA unavailable.

Inputs:
  data/lexicon/strongs-hebrew.json
  data/lexicon/strongs-hebrew-dictionary.js
Output:
  data/lexicon/strongs-hebrew.json
"""

import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "data" / "lexicon" / "strongs-hebrew.json"
DICT_JS   = ROOT / "data" / "lexicon" / "strongs-hebrew-dictionary.js"
DEBUG_JS5 = ROOT / "data" / "lexicon" / "_debug_strongs_hebrew_obj.json5"

# ---------- IO ----------
def load_base_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))

# ---------- JXA robust extractor ----------
def try_jxa_extract(js_path: Path):
    """
    Evaluate the JS via macOS JXA, then scan globals/exports for the best dictionary object.
    """
    jxa = r'''
    ObjC.import('Foundation');
    function countHKeys(obj){
      if (!obj || typeof obj !== 'object') return 0;
      var n=0; for (var k in obj){ if (/^H\d+$/.test(k)) n++; }
      return n;
    }
    function looksLexEntry(v){
      if (!v || typeof v!=='object') return 0;
      var s=0;
      if ('lemma' in v) s+=3;
      if ('gloss' in v) s+=2;
      if ('defs' in v) s+=2;
      if ('translit' in v || 'xlit' in v) s+=1;
      return s;
    }
    function scoreDict(d){
      if (!d || typeof d!=='object') return -1;
      var h = countHKeys(d);
      if (h<=0) return -1;
      // sample a few entries to see if they look lexicon-like
      var sample=0, lex=0;
      for (var k in d){
        if (!/^H\d+$/.test(k)) continue;
        var v = d[k];
        lex += looksLexEntry(v);
        sample++;
        if (sample>40) break;
      }
      return h + lex*5; // weight lexicon-ish fields
    }
    function run(argv){
      var path = argv[0];
      var s = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js;

      // Evaluate file inside an isolated scope
      var sandbox = {};
      var fn = new Function('with(this){ ' + s + '\n; return this; }');
      var ctx = fn.call(sandbox);

      // Collect candidates
      var candidates = [];
      function push(x){ try{ candidates.push(x); }catch(e){} }

      // Common names/exports
      push(ctx.strongsHebrewDictionary);
      push(ctx.STRONGS_HEBREW);
      push(ctx.strongsHebrew);
      push((typeof module!=='undefined' && module.exports) ? module.exports : null);
      push((typeof exports!=='undefined' && (exports.default || exports)) ? (exports.default || exports) : null);

      // Scan globals for big objects
      for (var k in ctx){
        if (!ctx.hasOwnProperty(k)) continue;
        var v = ctx[k];
        if (v && typeof v==='object') push(v);
      }

      // Score
      var best=null, bestScore=-1;
      for (var i=0;i<candidates.length;i++){
        var sc = scoreDict(candidates[i]);
        if (sc > bestScore){ bestScore = sc; best = candidates[i]; }
      }
      if (!best || bestScore < 100) throw new Error('No suitable Strong’s Hebrew dictionary object found (score='+bestScore+').');
      return JSON.stringify(best);
    }
    '''
    try:
      out = subprocess.check_output(
        ["osascript", "-l", "JavaScript", "-e", jxa, str(js_path)],
        stderr=subprocess.STDOUT,
        text=True
      )
      return json.loads(out)
    except Exception:
      return None

# ---------- Sanitizer fallback ----------
def sanitize_js_object(raw_text: str):
    # Try to find an object literal with lots of H#### keys
    # First, strip comments (rough)
    txt = re.sub(r"/\*.*?\*/", "", raw_text, flags=re.S)
    txt = re.sub(r"//.*?$", "", txt, flags=re.M)

    # Heuristic: find the largest {...} block that contains many H#### keys.
    # This is simplistic but often works if file is a single big assignment.
    m = re.search(r"=\s*({[\s\S]+});?\s*$", txt)
    if not m:
        raise ValueError("Could not locate a JS object assignment in dictionary file.")
    obj = m.group(1)

    # Quote bare keys and normalize
    obj = re.sub(r'(?m)(^|\s|{|,)([A-Za-z_$][\w$]*)\s*:', r'\1"\2":', obj)
    obj = obj.replace("'", '"')
    obj = re.sub(r",(\s*[}\]])", r"\1", obj)
    try:
        return json.loads(obj)
    except Exception as e:
        DEBUG_JS5.write_text(obj, encoding="utf-8")
        raise ValueError(f"JSON parse failed; wrote debug to {DEBUG_JS5.name}\n{e}")

def load_dict(js_path: Path):
    data = try_jxa_extract(js_path)
    if data is not None:
        return data
    raw = js_path.read_text(encoding="utf-8", errors="replace")
    return sanitize_js_object(raw)

# ---------- Merge ----------
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

def normalize_key(k: str) -> str:
    k = str(k).strip()
    m = re.match(r'^[Hh]?0*([0-9]+)$', k) or re.match(r'^[Hh]([0-9]+)$', k)
    return f"H{int(m.group(1),10)}" if m else k.upper()

def main():
    try:
        base = load_base_json(JSON_PATH)
    except Exception as e:
        print(f"[err] read {JSON_PATH}: {e}"); sys.exit(1)

    try:
        he = load_dict(DICT_JS)
    except Exception as e:
        print(f"[err] parse {DICT_JS}: {e}"); sys.exit(1)

    if not isinstance(base, dict) or not isinstance(he, dict):
        print("[err] invalid input structures"); sys.exit(1)

    merged = updated = created = 0
    for k, v in he.items():
        key = normalize_key(k)
        if key not in base:
            base[key] = {}; created += 1
        before = json.dumps(base[key], ensure_ascii=False, sort_keys=True)
        merge_entry(base[key], v if isinstance(v, dict) else {})
        after = json.dumps(base[key], ensure_ascii=False, sort_keys=True)
        if before != after: updated += 1
        merged += 1

    JSON_PATH.write_text(json.dumps(base, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] merged entries: {merged}  (updated: {updated}, created: {created})")
    print(f"[ok] wrote → {JSON_PATH}")

if __name__ == "__main__":
    main()
