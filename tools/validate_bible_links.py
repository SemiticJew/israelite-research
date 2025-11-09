import json, re, pathlib

BASE="/israelite-research"
DICT=pathlib.Path("data/israelite_dictionary.json")
OUT=pathlib.Path("tmp/bible_link_audit.tsv")

CANON_SLUG = {
  "daniel":      ("tanakh","daniel"),
  "genesis":     ("tanakh","genesis"),
  "isaiah":      ("tanakh","isaiah"),
  "1 maccabees": ("apocrypha","1-maccabees"),
  "2 maccabees": ("apocrypha","2-maccabees"),
  "wisdom":      ("apocrypha","wisdom"),
  "sirach":      ("apocrypha","sirach"),
}

def ndash(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")

def infer_from_label(label):
    t = ndash(label or "")
    m = re.match(r"^((?:[1-3]\s+)?[A-Za-z][A-Za-z .'-]+?)\s+(\d+):(\d+)", t)
    if not m: return None
    book = m.group(1).lower().replace(".","").strip()
    ch   = int(m.group(2))
    v    = int(m.group(3))
    canon, slug = CANON_SLUG.get(book, (None,None))
    if not canon: return None
    return canon, slug, ch, v

def build_url(canon, slug, ch, v=None):
    if canon=="apocrypha":
        return f"{BASE}/apocrypha/chapter.html?book={slug}&ch={ch}"
    if canon=="tanakh":
        return f"{BASE}/tanakh/chapter.html?book={slug}&ch={ch}"+(f"#v{v}" if v else "")
    if canon=="new-testament":
        return f"{BASE}/new-testament/chapter.html?book={slug}&ch={ch}"+(f"#v{v}" if v else "")
    return None

def load_entries(p):
    j=json.loads(p.read_text())
    return j if isinstance(j,list) else j.get("entries",[])

rows=[]
for i,e in enumerate(load_entries(DICT)):
    refs = e.get("bible_refs") or e.get("biblical_refs") or e.get("refs") or []
    if isinstance(refs, str):
        refs = []
    for r in refs:
        if not isinstance(r, dict):
            continue
        canon = r.get("canon")
        slug  = r.get("slug")
        ch    = r.get("ch")
        v     = r.get("vStart") or r.get("v") or None
        ok    = False
        if canon and slug and ch:
            url = build_url(canon, slug, ch, v)
            ok = url is not None
        else:
            inf = infer_from_label(r.get("label",""))
            if inf:
                canon, slug, ch, v = inf
                url = build_url(canon, slug, ch, v)
                ok = url is not None
            else:
                url = ""
        rows.append([i, e.get("headword",""), r.get("label",""), "OK" if ok else "FAIL", canon or "", slug or "", ch or "", v or "", url])

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w",encoding="utf-8") as f:
    f.write("idx\theadword\tlabel\tstatus\tcanon\tslug\tch\tv\turl\n")
    for row in rows:
        f.write("\t".join(str(x) for x in row)+"\n")

print(f"Wrote {OUT} with {sum(1 for r in rows if r[3]=='OK')} OK / {len(rows)} total")
