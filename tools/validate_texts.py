#!/usr/bin/env python3
import os, json, sys

ROOT = "data"

def validate_file(path):
    ok = True
    with open(path, encoding="utf-8") as f:
        try:
            arr = json.load(f)
        except Exception as e:
            print(f"Invalid JSON: {path} — {e}")
            return False
    if not isinstance(arr, list):
        print(f"Not a list: {path}")
        return False
    prev = 0
    for i, v in enumerate(arr):
        if not isinstance(v, dict) or "n" not in v or "t" not in v:
            print(f"Bad verse at {path} index {i}")
            ok = False
            continue
        if not isinstance(v["n"], int) or v["n"] <= 0:
            print(f"Non-positive or non-int verse number at {path}: {v['n']}")
            ok = False
        if not isinstance(v["t"], str) or not v["t"].strip():
            print(f"Empty text at {path} verse {v.get('n')}")
            ok = False
        if v["n"] <= prev:
            print(f"Out-of-order verse numbers in {path} at {v['n']}")
            ok = False
        prev = v["n"]
    return ok

def main():
    ok = True
    for fam in ("tanakh","newtestament","apocrypha"):
        fam_dir = os.path.join(ROOT, fam)
        if not os.path.isdir(fam_dir): 
            continue
        for book_slug in os.listdir(fam_dir):
            bdir = os.path.join(fam_dir, book_slug)
            if not os.path.isdir(bdir): 
                continue
            for fn in os.listdir(bdir):
                if not fn.endswith(".json"): 
                    continue
                path = os.path.join(bdir, fn)
                if not validate_file(path):
                    ok = False
    if not ok:
        sys.exit(1)
    print("All good.")

if __name__ == "__main__":
    main()
