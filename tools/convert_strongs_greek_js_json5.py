#!/usr/bin/env python3
import re, sys, json, json5
from pathlib import Path

CANDIDATES = [
  "data/lexicon/strongs-greek-dictionary.js",
  "data/lexicons/strongs-greek-dictionary.js",
  "js/lexicon/strongs-greek-dictionary.js",
]

def read_js():
  for p in CANDIDATES:
    f = Path(p)
    if f.exists():
      return f.read_text(encoding="utf-8"), p
  sys.exit("strongs-greek-dictionary.js not found in expected paths")

def extract_object(js):
  # strip block and line comments (safe for JSON5)
  js = re.sub(r"/\*.*?\*/", "", js, flags=re.S)
  js = re.sub(r"(^|\s)//[^\n]*", r"\1", js)

  m = re.search(r"=\s*{", js)
  if not m:
    sys.exit("No object literal found after '='")
  start = m.start() + js[m.start():].find('{')

  # brace-balance to find end
  i, n, in_str, esc, q = start, len(js), False, False, ""
  depth = 0
  while i < n:
    ch = js[i]
    if in_str:
      if esc:
        esc = False
      elif ch == "\\":
        esc = True
      elif ch == q:
        in_str = False
    else:
      if ch in ("'", '"'):
        in_str, q = True, ch
      elif ch == "{":
        depth += 1
      elif ch == "}":
        depth -= 1
        if depth == 0:
          end = i + 1
          break
    i += 1
  else:
    sys.exit("Unbalanced braces in JS file")

  obj_text = js[start:end]
  return obj_text

js, used = read_js()
obj_text = extract_object(js)
data = json5.loads(obj_text)  # JSON5 tolerant parser

out = Path("data/lexicon/strongs-greek.json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"[ok] Wrote {len(data)} entries → {out} (from {used})")
