#!/usr/bin/env python3
import json, re, sys, argparse
from datetime import datetime

BOOK_MAP = {
    "genesis": ("tanakh","genesis"), "exodus": ("tanakh","exodus"), "leviticus": ("tanakh","leviticus"),
    "numbers": ("tanakh","numbers"), "deuteronomy": ("tanakh","deuteronomy"),
    "joshua": ("tanakh","joshua"), "judges": ("tanakh","judges"), "ruth": ("tanakh","ruth"),
    "1 samuel": ("tanakh","1-samuel"), "2 samuel": ("tanakh","2-samuel"),
    "1 kings": ("tanakh","1-kings"), "2 kings": ("tanakh","2-kings"),
    "isaiah": ("tanakh","isaiah"), "jeremiah": ("tanakh","jeremiah"),
    "matthew": ("newtestament","matthew"), "mark": ("newtestament","mark"), "luke": ("newtestament","luke"),
    "john": ("newtestament","john"), "acts": ("newtestament","acts")
}

def slugify_headword(s:str)->str:
    s=re.sub(r"[^\w\s\-]+","",s)
    return re.sub(r"\s+","-",s.strip().lower())

def parse_bible_label(label):
    m=re.match(r"^\s*([1-3]?\s*[A-Za-z][A-Za-z ]+)\s+(\d+):(\d+)(?:[–-](\d+))?",label)
    if not m: raise ValueError(f"Bad ref: {label}")
    book=m.group(1).strip().lower(); ch=int(m.group(2)); v1=int(m.group(3)); v2=m.group(4)
    canon,slug=BOOK_MAP.get(book,("tanakh",book.replace(" ","-")))
    out={"label":label,"canon":canon,"slug":slug,"ch":ch,"vStart":v1}
    if v2: out["vEnd"]=int(v2)
    return out

def load_db(path):
    with open(path,"r",encoding="utf-8") as f: data=json.load(f)
    return data["entries"] if isinstance(data,dict) and "entries" in data else data

def save_db(path,entries):
    with open(path,"w",encoding="utf-8") as f:
        json.dump({"version":"1.0","generated":datetime.utcnow().date().isoformat(),"entries":entries},f,ensure_ascii=False,indent=2)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("cmd",choices=["add","list"])
    ap.add_argument("--file","-f",default="data/israelite_dictionary.json")
    ap.add_argument("--headword"); ap.add_argument("--pos"); ap.add_argument("--definition")
    ap.add_argument("--bible_refs")
    args=ap.parse_args()

    db=load_db(args.file)
    if args.cmd=="list":
        for e in db: print(e.get("headword"),"(id:",e.get("id"),")"); return

    if args.cmd=="add":
        if not args.headword or not args.definition: sys.exit("headword and definition required")
        entry={"id":slugify_headword(args.headword),
               "letter":args.headword[0].upper(),
               "headword":args.headword,"pos":args.pos or "n.",
               "variants":[],"syllables":"","etymology":"",
               "definition":args.definition,"usage_notes":"",
               "see_also":[],"bible_refs":[]}
        if args.bible_refs:
            entry["bible_refs"]=[parse_bible_label(x.strip()) for x in args.bible_refs.split("|") if x.strip()]
        db.append(entry); db.sort(key=lambda x:x["headword"].lower())
        save_db(args.file,db)
        print("Added:",entry["headword"])

if __name__=="__main__": main()
