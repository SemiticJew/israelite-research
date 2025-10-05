#!/usr/bin/env python3
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "data/lexicon/strongs-hebrew-dictionary.js"
OUT_JSON = ROOT / "data/lexicon/strongs-hebrew.json"

ALIASES = {
  "lemma":       ["lemma","Lemma","form","word","lex","headword"],
  "translit":    ["translit","Translit","xlit","transliteration","trans"],
  "pos":         ["pos","Pos","partOfSpeech","speech","morph","morphology"],
  "gloss":       ["gloss","Gloss","shortDef","brief","meaning","sense"],
  "derivation":  ["derivation","Derivation","from","root","etym","etymology"],
  "strongs_def": ["strongs_def","strongsDefinition","Strong","StrongDefinition","definition","def","Def"],
  "kjv_def":     ["kjv_def","kjvDefinition","KJV","kjv","usage","Use","KJVDefinition"],
}

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def to_jsonish(txt: str):
    # Try to extract the right-hand side of an assignment ...= { ... };
    m = re.search(r"=\s*({[\s\S]*});?\s*$", txt)
    if m: src = m.group(1)
    else:
        # take first top-level {...}
        i = txt.find("{")
        if i == -1: return None
        depth = 0
        j = None
        for k in range(i, len(txt)):
            c = txt[k]
            if c == "{": depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    j = k+1; break
        if j is None: return None
        src = txt[i:j]
    # js-ish -> json-ish
    src = re.sub(r'([,{]\s*)([A-Za-z_]\w*)(\s*:)', r'\1"\2"\3', src)  # quote keys
    src = src.replace("'", '"')                                        # single→double
    src = re.sub(r',\s*([}\]])', r'\1', src)                           # trailing commas
    try:
        return json.loads(src)
    except Exception:
        return None

def parse_with_jxa(js_path: Path):
    osa = r'''
    var path = '%s';
    var fm = ObjC.import('Foundation');
    var data = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js;
    var candidates = [];
    function scoreDict(d){
      if (!d || typeof d !== 'object') return 0;
      var keys = Object.keys(d);
      var n = keys.length, hit = 0;
      for (var i=0;i<keys.length;i++){
        if (/^H\d{1,5}$/.test(keys[i])) hit++;
      }
      return hit + n/1000;
    }
    try{ eval(data); }catch(e){}
    try{ candidates.push(this.strongsHebrewDictionary); }catch(e){}
    try{ candidates.push(this.STRONGS_HEBREW); }catch(e){}
    try{ candidates.push((this.module && this.module.exports) || null); }catch(e){}
    try{ candidates.push((this.exports && (this.exports.default||this.exports)) || null); }catch(e){}
    for (var k in this){ try{ if (this.hasOwnProperty(k)) candidates.push(this[k]); }catch(e){} }
    var best=null, score=-1;
    for (var i=0;i<candidates.length;i++){
      var s = scoreDict(candidates[i]);
      if (s > score){ score = s; best = candidates[i]; }
    }
    if (!best || score < 100) throw new Error('no dict');
    JSON.stringify(best);
    ''' % (str(js_path).replace("\\","\\\\").replace("'","\\'"))
    res = subprocess.run(["osascript","-l","JavaScript","-e",osa], capture_output=True, text=True)
    if res.returncode != 0: return None
    try: return json.loads(res.stdout)
    except Exception: return None

def pick(d: dict, keys):
    for base in keys:
        for k in (base, base.lower(), base.upper(), base.capitalize()):
            if k in d and d[k] not in (None,""):
                v = d[k]
                if isinstance(v, list): return "; ".join(str(x) for x in v if x not in (None,""))
                if isinstance(v, dict):
                    for c in ("text","value","def","definition","desc"):
                        if c in v and v[c]: return str(v[c])
                    return json.dumps(v, ensure_ascii=False)
                return str(v)
    return None

def norm_code(code: str) -> str:
    m = re.match(r'^[Hh]\s*0*([0-9]+)$', str(code).strip())
    if m: return f"H{int(m.group(1),10)}"
    return str(code).upper()

def scrape_entries(js: str):
    out = {}
    # 1) Pattern: "H1234": { ... }
    for m in re.finditer(r'"(H\d{1,5})"\s*:\s*{([^}]*)}', js):
        code = norm_code(m.group(1))
        blob = "{%s}" % m.group(2)
        try:
            j = to_jsonish(blob) or json.loads(re.sub(r'([A-Za-z_]\w*)\s*:', r'"\1":', blob.replace("'", '"')))
        except Exception:
            j = {}
        out[code] = j

    # 2) Pattern: { "code":"H1234", .... }
    for m in re.finditer(r'{[^{}]*"code"\s*:\s*"H\s*0*\d{1,5}"[^{}]*}', js):
        block = m.group(0)
        # normalise "H 0123" → "H123"
        block = re.sub(r'"code"\s*:\s*"H\s*0*([0-9]+)"', r'"code":"H\1"', block)
        blob = block
        try:
            j = to_jsonish(blob) or json.loads(re.sub(r'([A-Za-z_]\w*)\s*:', r'"\1":', blob.replace("'", '"')))
        except Exception:
            continue
        code = norm_code(j.get("code",""))
        if code and re.match(r'^H\d+$', code): out[code] = j
    return out

def load_source():
    txt = read(JS_PATH)
    # Try direct JSON-ish
    obj = to_jsonish(txt)
    if isinstance(obj, dict) and len(obj) > 100: return obj
    # JXA eval of the file, searching for best candidate
    jxa = parse_with_jxa(JS_PATH)
    if isinstance(jxa, dict) and len(jxa) > 100: return jxa
    # Scrape blocks
    scraped = scrape_entries(txt)
    if scraped: return scraped
    print(f"[err] could not obtain dictionary object from {JS_PATH}", file=sys.stderr)
    return {}

def merge():
    base = json.loads(read(OUT_JSON))
    src = load_source()
    updated = created = 0

    for k, v in src.items():
        code = norm_code(k if re.match(r'^H\d+$', str(k)) else v.get("code",""))
        if not code or not re.match(r'^H\d+$', code): continue

        dst = base.get(code, {})
        before = json.dumps(dst, ensure_ascii=False, sort_keys=True)
        out = dict(dst)

        lemma   = pick(v, ALIASES["lemma"])   or out.get("lemma")
        transl  = pick(v, ALIASES["translit"]) or out.get("translit")
        pos     = pick(v, ALIASES["pos"])     or out.get("pos")
        gloss   = pick(v, ALIASES["gloss"])   or out.get("gloss")
        deriv   = pick(v, ALIASES["derivation"])  or out.get("derivation")
        sdef    = pick(v, ALIASES["strongs_def"]) or out.get("strongs_def")
        kjv     = pick(v, ALIASES["kjv_def"])     or out.get("kjv_def")

        if lemma:   out["lemma"] = lemma
        if transl:  out["translit"] = transl
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
    print(f"[ok] Hebrew merged — updated={updated}, created={created}, total={len(base)}")

if __name__ == "__main__":
    merge()
