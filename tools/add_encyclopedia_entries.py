#!/usr/bin/env python3
import json, argparse, os, sys, re
DEFAULT_FILE = "data/israelite_dictionary.json"

BOOK_SLUGS = {
  "genesis": ("tanakh","genesis"), "exodus": ("tanakh","exodus"),
  "leviticus": ("tanakh","leviticus"), "numbers": ("tanakh","numbers"),
  "deuteronomy": ("tanakh","deuteronomy"), "isaiah": ("tanakh","isaiah"),
  "psalms": ("tanakh","psalms"), "john": ("newtestament","john"),
  "matthew": ("newtestament","matthew"), "revelation": ("newtestament","revelation"),
  "1 kings": ("tanakh","1-kings"), "deuteronomy": ("tanakh","deuteronomy"),
  "numbers": ("tanakh","numbers"), "proverbs": ("tanakh","proverbs"),
  "zechariah": ("tanakh","zechariah"), "1 samuel": ("tanakh","1-samuel"),
  "mark": ("newtestament","mark"), "isaiah": ("tanakh","isaiah")
}

REF_RE = re.compile(r'^\s*([1-3]?\s*[A-Za-z ]+)\s+(\d+):(\d+)(?:[–-](\d+))?\s*$')
def parse_ref(label):
    m = REF_RE.match(label.replace('\u00A0',' ').strip())
    if not m: return {"label": label}
    book = m.group(1).strip().lower()
    ch = int(m.group(2)); v1 = int(m.group(3)); v2 = m.group(4)
    canon, slug = BOOK_SLUGS.get(book, (None,None))
    d = {"label": label, "ch": ch, "vStart": v1}
    if v2: d["vEnd"] = int(v2)
    if canon: d["canon"] = canon
    if slug: d["slug"] = slug
    return d

def load_db(p):
    if not os.path.exists(p): return {"version":"1.0","entries":[]}
    with open(p,"r",encoding="utf-8") as f: j=json.load(f)
    if isinstance(j,list): return {"version":"1.0","entries":j}
    if "entries" not in j: j["entries"]=[]
    return j

def save_db(p,d):
    os.makedirs(os.path.dirname(p),exist_ok=True)
    with open(p,"w",encoding="utf-8") as f: json.dump(d,f,ensure_ascii=False,indent=2)

def make_id(h): return re.sub(r'[^a-z0-9]+','-',h.strip().lower()).strip('-')

def upsert(db,e):
    E=db["entries"]; by={x.get("id"):i for i,x in enumerate(E)}
    if e["id"] in by: E[by[e["id"]]]=e
    else: E.append(e)
    E.sort(key=lambda x:(x.get("headword","").lower(),x.get("id","")))

ap=argparse.ArgumentParser()
ap.add_argument("cmd",choices=["add","list"])
ap.add_argument("--file",default=DEFAULT_FILE)
ap.add_argument("--headword");ap.add_argument("--pos",default="n.")
ap.add_argument("--definition");ap.add_argument("--usage_notes",default=None)
ap.add_argument("--see_also",default=None)
ap.add_argument("--bible_refs",default=None)
a=ap.parse_args()

db=load_db(a.file)
if a.cmd=="list":
  [print(e.get("headword","?")) for e in db["entries"]]; sys.exit()

if not a.headword or not a.definition: sys.exit(1)
eid=make_id(a.headword)
e={"id":eid,"letter":a.headword[0].upper(),"headword":a.headword,"pos":a.pos,
   "variants":[a.headword],"syllables":"","etymology":"","definition":a.definition,
   "usage_notes":(a.usage_notes or ""), "see_also":[], "bible_refs":[]}
if a.see_also: e["see_also"]=[p.strip() for p in a.see_also.split(",") if p.strip()]
if a.bible_refs: e["bible_refs"]=[parse_ref(lbl) for lbl in a.bible_refs.split("|") if lbl.strip()]
upsert(db,e); save_db(a.file,db); print("Added:",a.headword)
