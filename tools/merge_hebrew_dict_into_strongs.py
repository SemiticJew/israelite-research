#!/usr/bin/env python3
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "data/lexicon/strongs-hebrew-dictionary.js"
OUT_JSON = ROOT / "data/lexicon/strongs-hebrew.json"

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def try_parse_as_json_object(js_text: str):
    # Try to find an object literal assigned anywhere:  something = { ... };
    m = re.search(r"=\s*({[\s\S]*});?\s*$", js_text)
    if not m:
        # Fallback: take first top-level {...} block
        start = js_text.find("{")
        if start == -1: return None
        depth = 0
        for i in range(start, len(js_text)):
            c = js_text[i]
            if c == "{": depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    obj = js_text[start:i+1]
                    break
        else:
            return None
        raw = obj
    else:
        raw = m.group(1)

    # Heuristic: convert JS-ish to JSON-ish
    # 1) quote unquoted keys
    raw = re.sub(r'([,{]\s*)([A-Za-z_]\w*)(\s*:)', r'\1"\2"\3', raw)
    # 2) single -> double quotes
    raw = raw.replace("'", '"')
    # 3) remove trailing commas
    raw = re.sub(r',\s*([}\]])', r'\1', raw)
    try:
        return json.loads(raw)
    except Exception:
        return None

def parse_with_jxa(js_path: Path):
    osa = r'''
    ObjC.import('Foundation');
    var fm = $.NSFileManager.defaultManager;
    var path = '%s';
    var data = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js;
    var candidates = [];

    function scoreDict(d){
      if (!d || typeof d !== 'object') return 0;
      var keys = Object.keys(d);
      var n = keys.length;
      var k = 0;
      for (var i=0;i<keys.length;i++){
        var kk = keys[i];
        if (/^[H]\d{1,5}$/.test(kk)) k++;
      }
      return k + n/1000;
    }

    try {
      // Evaluate in loose function scope
      var sandbox = {};
      (function(){
        try{ eval(data); }catch(e){}
        for (var k in this) { try{
          if (this.hasOwnProperty(k)) candidates.push(this[k]);
        }catch(e){} }
      })();
    } catch(e){}

    // Also try simple global names
    try { candidates.push(this.strongsHebrewDictionary); } catch(e){}
    try { candidates.push(this.STRONGS_HEBREW); } catch(e){}
    try { candidates.push(this.module && this.module.exports); } catch(e){}
    try { candidates.push(this.exports && (this.exports.default || this.exports)); } catch(e){}

    var best=null, bestScore=-1;
    for (var i=0;i<candidates.length;i++){
      var s = scoreDict(candidates[i]);
      if (s > bestScore){ bestScore = s; best = candidates[i]; }
    }
    if (!best || bestScore < 100) {
      throw new Error('No suitable dictionary object found (score='+bestScore+').');
    }
    JSON.stringify(best);
    ''' % (str(js_path).replace("\\","\\\\").replace("'","\\'"))
    res = subprocess.run(["osascript", "-l", "JavaScript", "-e", osa], capture_output=True, text=True)
    if res.returncode != 0:
        return None
    try:
        return json.loads(res.stdout)
    except Exception:
        return None

def load_js_dict(js_path: Path):
    txt = read(js_path)
    obj = try_parse_as_json_object(txt)
    if obj: return obj
    # macOS JXA fallback
    return parse_with_jxa(js_path)

# ---------- merge helpers ----------
ALIASES = {
    "derivation": ["derivation","Derivation","from","root","etym","etymology"],
    "strongs_def": ["strongs_def","strongsDefinition","definition","def","Strong","StrongDefinition"],
    "kjv_def": ["kjv_def","kjvDefinition","KJV","kjv","usage"],
    "lemma": ["lemma","Lemma","word","form"],
    "translit": ["translit","xlit","transliteration","xlit_ascii","trans"],
    "pos": ["pos","partOfSpeech","speech","morph"],
    "gloss": ["gloss","shortDef","brief","meaning"],
}

def pick(d: dict, keys):
    for k in keys:
        for kk in (k, k.lower(), k.upper(), k.capitalize()):
            if kk in d and d[kk] not in (None, ""):
                v = d[kk]
                # normalise arrays/objects to text
                if isinstance(v, list):
                    return "; ".join(str(x) for x in v if x not in (None,""))
                if isinstance(v, dict):
                    # prefer text-like members
                    for c in ("text","value","def","definition","desc"):
                        if c in v and v[c]: return str(v[c])
                    return json.dumps(v, ensure_ascii=False)
                return str(v)
    return None

def norm_code(k: str) -> str:
    m = re.match(r'^[Hh]\s*0*([0-9]+)$', str(k).strip())
    if m: return f"H{int(m.group(1),10)}"
    m = re.match(r'^[Hh]([0-9]+)$', str(k).strip())
    if m: return f"H{int(m.group(1),10)}"
    return str(k).upper()

def merge():
    he_dict = load_js_dict(JS_PATH)
    if not he_dict or not isinstance(he_dict, dict):
        print(f"[err] parse {JS_PATH}: could not obtain dictionary object")
        sys.exit(1)

    base = json.loads(read(OUT_JSON))

    updated = created = 0
    for raw_key, src in he_dict.items():
        code = norm_code(raw_key)
        # only merge known Strong's codes (skip odd keys)
        if not re.match(r'^H[0-9]+$', code): continue

        dst = base.get(code, {})
        before = json.dumps(dst, ensure_ascii=False, sort_keys=True)

        # carry through existing fields
        out = dict(dst)

        # preferred canonical fields
        lemma = pick(src, ALIASES["lemma"]) or out.get("lemma")
        translit = pick(src, ALIASES["translit"]) or out.get("translit")
        pos = pick(src, ALIASES["pos"]) or out.get("pos")
        gloss = pick(src, ALIASES["gloss"]) or out.get("gloss")

        deriv = pick(src, ALIASES["derivation"]) or out.get("derivation")
        sdef  = pick(src, ALIASES["strongs_def"]) or out.get("strongs_def")
        kjv   = pick(src, ALIASES["kjv_def"]) or out.get("kjv_def")

        if lemma:   out["lemma"] = lemma
        if translit:out["translit"] = translit
        if pos:     out["pos"] = pos
        if gloss:   out["gloss"] = gloss
        if deriv:   out["derivation"] = deriv
        if sdef:    out["strongs_def"] = sdef
        if kjv:     out["kjv_def"] = kjv

        base[code] = out
        after = json.dumps(out, ensure_ascii=False, sort_keys=True)
        if before != after:
            if before == "{}": created += 1
            else: updated += 1

    OUT_JSON.write_text(json.dumps(base, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] Merged Hebrew: updated={updated}, created={created}, total={len(base)}")

if __name__ == "__main__":
    merge()
