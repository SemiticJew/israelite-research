#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

def read_js(path_candidates):
    for p in path_candidates:
        f = Path(p)
        if f.exists():
            return f.read_text(encoding="utf-8")
    sys.exit("Could not find strongs-greek-dictionary.js")

def strip_comments(s):
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)        # /* ... */
    s = re.sub(r'(^|\s)//[^\n]*', r'\1', s)            # // ...
    return s

def extract_object(js):
    m = re.search(r'strongsGreekDictionary\s*=\s*({.*?});?\s*$', js, flags=re.S|re.M)
    if not m:
        # fallback: first { ... } after var strongsGreekDictionary
        m = re.search(r'strongsGreekDictionary\s*=\s*({.*)', js, flags=re.S)
        if not m:
            sys.exit("Could not locate object literal after strongsGreekDictionary =")
    return m.group(1)

def normalize_to_json(txt):
    # Remove comments first
    txt = strip_comments(txt)

    # Remove line breaks inside object to simplify some regex, but keep JSON formatting later
    # We'll still pretty-print on write.
    # Quote unquoted keys (allow hyphen/underscore/$ after first char)
    def quote_keys(m):
        return f'{m.group(1)}"{m.group(2)}":'
    txt = re.sub(r'([{\s,])\s*([A-Za-z_$][A-Za-z0-9_$\-]*)\s*:', quote_keys, txt)

    # Convert single-quoted strings to double quotes, respecting escapes
    # Strategy: replace only occurrences that start with a single quote and end with an unescaped single quote
    def sq_to_dq(m):
        body = m.group(1)
        body = body.replace('\\\'', "'").replace('"', '\\"')
        return f'"{body}"'
    txt = re.sub(r"\'([^\'\\]*(?:\\.[^\'\\]*)*)\'", sq_to_dq, txt)

    # Replace JS literals with JSON
    txt = re.sub(r'\btrue\b', 'true', txt)
    txt = re.sub(r'\bfalse\b', 'false', txt)
    txt = re.sub(r'\bnull\b', 'null', txt)

    # Remove trailing commas before } or ]
    txt = re.sub(r',(\s*[}\]])', r'\1', txt)

    # Ensure valid escapes for \xNN -> \u00NN
    txt = re.sub(r'\\x([0-9A-Fa-f]{2})', lambda m: '\\u00'+m.group(1), txt)

    return txt

def main():
    js = read_js([
        "data/lexicon/strongs-greek-dictionary.js",
        "data/lexicons/strongs-greek-dictionary.js"
    ])
    obj = extract_object(js)
    json_like = normalize_to_json(obj)

    try:
        data = json.loads(json_like)
    except Exception as e:
        # Dump context to help debug
        Path("data/lexicon/_debug_strongs_greek_obj.json5").write_text(json_like, encoding="utf-8")
        sys.exit(f"JSON parse failed. Wrote debug to data/lexicon/_debug_strongs_greek_obj.json5\n{e}")

    out = Path("data/lexicon/strongs-greek.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] Wrote {len(data)} entries → {out}")

if __name__ == "__main__":
    main()
