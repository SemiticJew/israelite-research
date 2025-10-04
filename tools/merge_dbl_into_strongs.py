#!/usr/bin/env python3
# tools/merge_dbl_into_strongs.py
# Merge DBL NT RTF exports into data/lexicon/strongs-greek.json,
# enriching ONLY: lemma, translit, pos, gloss, defs

import argparse, json, re, sys, unicodedata
from pathlib import Path

# --- Helpers -----------------------------------------------------------------

GCODE_ANY = re.compile(r'(?:Strong[’\'s]?\s*[: ]\s*)?(?:<\s*[Gg]\s*(\d{1,5})\s*>|[Gg]\s*(\d{1,5})|(\d{1,5}))')
POS_WORDS = [
    "verb","noun","adjective","adverb","conjunction","preposition",
    "particle","pronoun","interjection","article","participle"
]
POS_MAP = {
    # common DBL/lexicon abbreviations
    "v": "verb", "vb": "verb", "vi": "verb", "vt": "verb",
    "n": "noun", "nn": "noun", "nf": "noun", "nm": "noun",
    "adj": "adjective", "adv": "adverb", "cj": "conjunction", "conj": "conjunction",
    "prep": "preposition", "part": "particle", "ptc": "participle",
    "pron": "pronoun", "intj": "interjection", "art": "article"
}

def nfc(s: str) -> str:
    return unicodedata.normalize('NFC', s or '').strip()

def rtf_to_text(rtf: str) -> str:
    # 1) decode \'hh hex
    def repl(m):
        hh = m.group(1)
        try: return bytes([int(hh,16)]).decode('latin-1')
        except: return ''
    s = re.sub(r"\\'([0-9A-Fa-f]{2})", repl, rtf)

    # 2) lightweight control removal; keep paragraph breaks
    s = s.replace('\\par', '\n')
    s = s.replace('\\tab', '\t')
    s = re.sub(r'\\[a-zA-Z]+\d* ?', '', s)         # strip control words
    s = re.sub(r'{\\\*[^{}]*}', '', s)             # drop special groups
    s = s.replace('{', '').replace('}', '')

    # 3) whitespace normalize
    s = s.replace('\r', '\n')
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()

def looks_greek(word: str) -> bool:
    return bool(re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', word))

def infer_pos(tokens_line: str) -> str:
    t = tokens_line.lower()
    # explicit long-form POS
    for w in POS_WORDS:
        if w in t: return w
    # abbrev map
    for abbr, full in POS_MAP.items():
        # match whole token or token with punctuation
        if re.search(rf'(^|\W){abbr}(\W|$)', t): return full
    return ""

def pick_gloss(lines: list[str]) -> str:
    # choose a short English phrase (ASCII letters, not a code, not a reference)
    for ln in lines:
        if len(ln) > 200: continue
        if re.search(r'[A-Za-z]', ln) and not re.search(r'\bTDNT\b|\bLN\b|\bBAGD\b', ln):
            if not GCODE_ANY.search(ln):
                return ln.strip()
    return ""

def parse_dbl_plaintext(txt: str):
    lines = [ln.strip() for ln in txt.splitlines()]
    # segment entries by blank lines
    entries, cur = [], []
    for ln in lines:
        if ln:
            cur.append(ln)
        elif cur:
            entries.append(cur); cur=[]
    if cur: entries.append(cur)

    records = []
    for block in entries:
        # find a strongs code anywhere in the block
        code = None
        for ln in block:
            m = GCODE_ANY.search(ln)
            if m:
                num = m.group(1) or m.group(2) or m.group(3)
                if num:
                    code = f"G{int(num)}"
                    break
        if not code: 
            continue

        # lemma = first token that looks Greek in the block
        lemma = ""
        for ln in block[:4]:  # usually near the top
            toks = ln.split()
            for t in toks:
                if looks_greek(t):
                    lemma = t
                    break
            if lemma: break

        # translit = next Latin token following lemma line
        translit = ""
        for ln in block[:4]:
            if looks_greek(ln):
                # take next latin-ish token on same line or next line
                after = re.sub(r'[^\x20-\x7E]', ' ', ln)  # strip non-ASCII
                parts = [p for p in after.split() if re.search(r'[A-Za-z]', p)]
                if parts:
                    translit = parts[-1]
                break
        if not translit:
            # fallback: any early ASCII-only word
            for ln in block[:4]:
                parts = [p for p in ln.split() if re.match(r'^[A-Za-z][A-Za-z\-]*$', p)]
                if parts: translit = parts[0]; break

        # POS: scan first 2–3 lines for pos hints
        pos = ""
        for ln in block[:3]:
            p = infer_pos(ln)
            if p: pos = p; break

        # gloss: choose a short english line near the top
        gloss = pick_gloss(block[0:6])

        rec = {
            "code": code,
            "lemma": nfc(lemma),
            "translit": translit.strip(),
            "pos": pos,
            "gloss": gloss,
            "defs": [gloss] if gloss else []
        }
        # require at least code + (lemma or gloss)
        if rec["lemma"] or rec["gloss"]:
            records.append(rec)

    # dedupe by (code, lemma, translit)
    uniq = {}
    for r in records:
        k = (r["code"], r["lemma"], r["translit"])
        if k not in uniq: uniq[k] = r
    return list(uniq.values())

def merge_records(strongs: dict, dbl_recs: list):
    merged=updates=created=0
    for r in dbl_recs:
        code = r["code"]
        if code not in strongs:
            strongs[code] = {
                "lemma": r["lemma"],
                "translit": r["translit"],
                "pos": r["pos"],
                "gloss": r["gloss"],
                "defs": list(r["defs"])
            }
            created += 1; merged += 1
            continue
        dst = strongs[code]; changed = False
        for k in ("lemma","translit","pos","gloss"):
            v = (r.get(k) or "").strip()
            if v and (not dst.get(k) or dst.get(k) != v):
                dst[k] = v; changed = True
        if r["defs"]:
            defs = list(dict.fromkeys((dst.get("defs") or []) + r["defs"]))
            if defs != dst.get("defs"):
                dst["defs"] = defs; changed = True
        if changed: updates += 1; merged += 1
    return merged, updates, created

# --- Main --------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dbl-root", default="data/lexicon/dbl")
    ap.add_argument("--strongs",  default="data/lexicon/strongs-greek.json")
    ap.add_argument("--out",      default="data/lexicon/strongs-greek.json")
    ap.add_argument("--pretty",   action="store_true")
    args = ap.parse_args()

    dbl_dir = Path(args.dbl_root)
    files = sorted(dbl_dir.glob("DBL_NT*.rtf"))
    if not files:
        print(f"[fatal] no DBL files in {dbl_dir}", file=sys.stderr); sys.exit(1)

    sp = Path(args.strongs)
    if not sp.exists():
        print(f"[fatal] missing Strong's JSON: {sp}", file=sys.stderr); sys.exit(2)
    try:
        strongs = json.loads(sp.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[fatal] bad Strong's JSON: {e}", file=sys.stderr); sys.exit(3)

    total_blocks=0; collected=[]
    for f in files:
        raw = f.read_text(encoding="utf-8", errors="ignore")
        plain = rtf_to_text(raw)
        recs = parse_dbl_plaintext(plain)
        total_blocks += len(recs)
        collected.extend(recs)
        print(f"[*] {f.name}: parsed {len(recs)} blocks")

    merged, updates, created = merge_records(strongs, collected)

    outp = Path(args.out); outp.parent.mkdir(parents=True, exist_ok=True)
    kw = dict(ensure_ascii=False)
    if args.pretty: kw["indent"]=2
    outp.write_text(json.dumps(strongs, **kw), encoding="utf-8")

    print(f"[ok] DBL blocks parsed: {total_blocks}")
    print(f"[ok] Merged: {merged}  (updated: {updates}, created new: {created})")
    print(f"[ok] Wrote → {outp}")

if __name__ == "__main__":
    main()
