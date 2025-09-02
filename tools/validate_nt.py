#!/usr/bin/env python3
import json, os, re, sys, shutil, glob, tempfile, subprocess

ROOT = "data/newtestament"

def git_mv(src, dst):
    try:
        subprocess.check_call(["git","mv","-f",src,dst])
        return True
    except Exception:
        # two-step for case-insensitive FS
        try:
            tmp = os.path.join(os.path.dirname(dst), ".__tmp__" + os.path.basename(dst))
            if os.path.exists(tmp): shutil.rmtree(tmp, ignore_errors=True)
            subprocess.check_call(["git","mv","-f",src,tmp])
            subprocess.check_call(["git","mv","-f",tmp,dst])
            return True
        except Exception:
            return False

def ensure_lower_dirs():
    changed = False
    if os.path.isdir(os.path.join(ROOT,"book")):
        # flatten layer
        for d in glob.glob(os.path.join(ROOT,"book","*")):
            if os.path.isdir(d):
                base = os.path.basename(d)
                target = os.path.join(ROOT, base)
                os.makedirs(target, exist_ok=True)
                for f in glob.glob(os.path.join(d,"*")):
                    git_mv(f, os.path.join(target, os.path.basename(f)))
        # remove extra layer (git if possible)
        try:
            subprocess.check_call(["git","rm","-r","-f",os.path.join(ROOT,"book")])
        except Exception:
            shutil.rmtree(os.path.join(ROOT,"book"), ignore_errors=True)
        changed = True
    # normalize to lowercase slugs
    for d in glob.glob(os.path.join(ROOT,"*")):
        if not os.path.isdir(d): continue
        base = os.path.basename(d)
        low  = base.lower()
        if base != low:
            if not git_mv(d, os.path.join(ROOT, low)):
                print(f"[ERR] rename failed: {d} -> {low}", file=sys.stderr)
                sys.exit(1)
            changed = True
    return changed

def as_list(v):
    if v is None: return []
    if isinstance(v, list): return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        return [p.strip() for p in re.split(r"[;,|\s]+", v) if p.strip()]
    return []

def as_text(d):
    if isinstance(d, dict):
        for k in ("t","text","kjv","darby","verseText"): 
            if k in d and d[k]: return str(d[k]).strip()
    return str(d).strip()

def as_int(x, default=None):
    try: return int(str(x).strip())
    except: return default

def normalize_chapter(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        print(f"[ERR] JSON parse: {path}: {e}")
        return False, 0
    # detect verses list
    if isinstance(raw, dict) and "verses" in raw and isinstance(raw["verses"], list):
        verses = raw["verses"]
    elif isinstance(raw, list):
        verses = raw
    elif isinstance(raw, dict):
        # dict keyed by verse numbers
        keys = sorted(raw.keys(), key=lambda x: int(x) if str(x).isdigit() else 10**9)
        verses = [raw[k] for k in keys]
    else:
        verses = [raw]
    out = []
    for i, item in enumerate(verses, 1):
        if isinstance(item, dict) and "v" in item and "t" in item and "c" in item and "s" in item:
            v = as_int(item["v"], i) or i
            t = str(item["t"])
            c = as_list(item["c"])
            s = as_list(item["s"])
            out.append({"v": v, "t": t, "c": c, "s": s})
            continue
        if isinstance(item, dict):
            v = as_int(item.get("v") or item.get("verse") or item.get("num"), i) or i
            t = as_text(item)
            c = as_list(item.get("c") or item.get("crossRefs") or item.get("crossrefs"))
            s = as_list(item.get("s") or item.get("strongs"))
            out.append({"v": v, "t": t, "c": c, "s": s})
        else:
            out.append({"v": i, "t": as_text(item), "c": [], "s": []})
    # only write if not already compliant
    write = True
    if isinstance(raw, list) and all(isinstance(x, dict) and set(x.keys()) <= {"v","t","c","s"} for x in raw):
        write = False
    if write:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        return True, len(out)
    return False, len(out)

def validate_all(autofix=True):
    changed = False
    changed |= ensure_lower_dirs()
    missing = []
    fixed   = 0
    total   = 0
    for book in sorted([d for d in glob.glob(os.path.join(ROOT,"*")) if os.path.isdir(d)]):
        bname = os.path.basename(book)
        one = os.path.join(book, "1.json")
        if not os.path.exists(one):
            missing.append(f"{bname}/1.json")
        for ch in sorted(glob.glob(os.path.join(book, "*.json")), key=lambda p: int(os.path.splitext(os.path.basename(p))[0]) if os.path.splitext(os.path.basename(p))[0].isdigit() else 10**9):
            total += 1
            if autofix:
                did, _ = normalize_chapter(ch)
                if did: fixed += 1; changed = True
            else:
                # validate shape
                try:
                    with open(ch, "r", encoding="utf-8") as f:
                        arr = json.load(f)
                    assert isinstance(arr, list)
                    for i,x in enumerate(arr,1):
                        assert isinstance(x,dict)
                        for k in ("v","t","c","s"): assert k in x
                except Exception as e:
                    print(f"[ERR] schema: {ch}: {e}")
                    return 2
    if missing:
        print("[WARN] Missing chapter 1 files:")
        for m in missing: print("  -", m)
    print(f"[OK] Checked {total} chapter files; normalized {fixed}; path changes={changed}")
    return 0 if not missing else 1

if __name__ == "__main__":
    sys.exit(validate_all(autofix=True))
