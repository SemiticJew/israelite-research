import os, re, subprocess, sys, json
ROOT = os.getcwd()
SITE_PREFIXES = ["israelite-research/","/israelite-research/","/"]
MONITORED_EXT = {".js",".css",".json",".geojson",".png",".jpg",".jpeg",".gif",".svg",".webp",".ico",".pdf",".map",".csv",".tsv",".txt"}
SKIP_DIRS = {".git","node_modules",".cache",".vite",".next","dist","build","out"}

def git_files():
    try:
        out = subprocess.check_output(["git","ls-files"], text=True)
        files = [f.strip() for f in out.splitlines() if f.strip()]
    except Exception:
        # fallback: walk filesystem
        files = []
        for d,_,fs in os.walk(ROOT):
            reld = os.path.relpath(d, ROOT)
            if reld == ".": reld = ""
            dn = os.path.basename(d)
            if dn in SKIP_DIRS: 
                continue
            for f in fs:
                p = os.path.join(reld, f) if reld else f
                files.append(p)
    return [f for f in files if not any(part in f.split(os.sep) for part in SKIP_DIRS)]

def norm_ref(ref, base_dir):
    ref = ref.strip()
    if not ref or ref.startswith("#"): return None
    if ref.startswith(("http://","https://","data:","mailto:","tel:")): return None
    if "?" in ref: ref = ref.split("?",1)[0]
    if "#" in ref: 
        # keep filename, drop fragment
        ref = ref.split("#",1)[0]
    # strip known site prefixes
    for pref in SITE_PREFIXES:
        if ref.startswith(pref):
            ref = ref[len(pref):]
            break
    # resolve relative vs absolute
    if ref.startswith("/"):
        ref = ref.lstrip("/")
    if not os.path.isabs(ref):
        ref = os.path.normpath(os.path.join(base_dir, ref))
    return ref

# patterns: src="", href="", url(...), import 'x', from "x", fetch("x"), new URL("x", import.meta.url)
rx_pairs = [
    re.compile(r'''(?:src|href)\s*=\s*["']([^"']+)["']''', re.I),
    re.compile(r'''url\(\s*["']?([^"')]+)["']?\s*\)''', re.I),
    re.compile(r'''import\s+(?:.+?\s+from\s+)?["']([^"']+)["']''', re.I),
    re.compile(r'''fetch\(\s*["']([^"']+)["']''', re.I),
    re.compile(r'''new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url''', re.I),
]

def referenced_files(all_files):
    refs=set()
    text_exts={".html",".htm",".js",".css",".json",".md",".mjs",".ts",".tsx",".jsx",".yml",".yaml"}
    for f in all_files:
        ext=os.path.splitext(f)[1].lower()
        if ext not in text_exts: 
            continue
        fp=os.path.join(ROOT,f)
        try:
            with open(fp,'r',encoding='utf-8') as fh:
                s=fh.read()
        except Exception:
            continue
        base=os.path.dirname(f)
        for rx in rx_pairs:
            for m in rx.findall(s):
                p = norm_ref(m, base)
                if not p: 
                    continue
                refs.add(p)
                # also consider if the reference points to a directory index.html
                if os.path.splitext(p)[1]=="":
                    refs.add(os.path.join(p,"index.html"))
    # also normalize refs by removing leading ./ or ../ that resolve to same file
    norm=set()
    for r in refs:
        r=os.path.normpath(r)
        if r.startswith("./"): r=r[2:]
        while r.startswith("../"):
            r=r[3:]
        norm.add(r)
    return norm

def main():
    files = git_files()
    files_set = set(os.path.normpath(f) for f in files)
    refs = referenced_files(files)
    # consider both with and without leading "./"
    refs_all=set()
    for r in refs:
        refs_all.add(r)
        refs_all.add(r.lstrip("./"))
    # filter to monitored extensions and within repo
    candidates = [f for f in files if os.path.splitext(f)[1].lower() in MONITORED_EXT]
    unused = sorted(f for f in candidates if f not in refs_all)
    used   = sorted(f for f in candidates if f in refs_all)
    report = {
        "total_tracked_files": len(files),
        "monitored_files": len(candidates),
        "used_files": len(used),
        "unused_files": len(unused),
        "unused_list": unused
    }
    print(json.dumps(report, indent=2))

if __name__=="__main__":
    main()
