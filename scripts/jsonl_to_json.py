#!/usr/bin/env python3
# jsonl_to_json.py
#
# Convert one or more JSONL/NDJSON files into standard JSON arrays.
# Overwrites in place (backup first if needed).

import sys, json
from pathlib import Path

def convert(path: Path):
    lines = []
    with path.open("r", encoding="utf-8") as f:
        for ln in f:
            ln = ln.strip()
            if not ln:
                continue
            try:
                lines.append(json.loads(ln))
            except Exception as e:
                print(f"[warn] {path.name}: failed to parse line: {e}", file=sys.stderr)
    with path.open("w", encoding="utf-8") as f:
        json.dump(lines, f, ensure_ascii=False, indent=2)
    print(f"[ok] converted {path} → {len(lines)} objects")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/jsonl_to_json.py <file1.jsonl> [file2.jsonl...]")
        sys.exit(1)
    for arg in sys.argv[1:]:
        p = Path(arg)
        if not p.exists():
            print(f"[error] file not found: {p}")
            continue
        convert(p)

if __name__ == "__main__":
    main()
