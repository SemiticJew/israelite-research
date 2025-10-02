#!/usr/bin/env python3
"""
tei_abbott_smith_to_json.py
Convert Abbott-Smith TEI XML to a Strong's-keyed JSON for your site.

Output shape (per key "G####"):
{
  "G3056": {
    "lemma": "λόγος",
    "translit": "logos",
    "pos": "noun",
    "gloss": "word; speech",
    "defs": ["word", "speech", "account", "reason"],
    "refs": ["John 1:1", "Luke 4:32"]
  }
}

Usage:
  python3 tools/tei_abbott_smith_to_json.py \
    --xml data/lexicon/abbott-smith.tei.xml \
    --out data/lexicon/abbott-smith.json

Options:
  --merge data/lexicon/strongs-greek.json  # merge into an existing lexicon, preferring existing fields
  --pretty                                  # pretty-print JSON
"""

import argparse, json, re, sys
from pathlib import Path
import xml.etree.ElementTree as ET

# --- Helpers -----------------------------------------------------------------

def text_or_none(node):
    if node is None:
        return None
    t = "".join(node.itertext()).strip()
    return t if t else None

def clean_space(s):
    if not s: return s
    return re.sub(r"\s+", " ", s).strip()

def norm_pos(s):
    if not s: return None
    s = clean_space(s)
    # light normalization
    s = s.replace("masc.", "masculine").replace("fem.", "feminine")
    s = s.replace("adj.", "adjective").replace("adv.", "adverb")
    s = s.replace("verb.", "verb")
    s = s.replace("noun.", "noun")
    return s

def uniq_list(seq):
    out, seen = [], set()
    for x in seq:
        if not x: continue
        k = x.strip()
        if k and k not in seen:
            seen.add(k)
            out.append(k)
    return out

def extract_strongs_id(entry, ns):
    """
    Try common TEI patterns for Strong's:
    <idno type="strong">G3056</idno> OR id attributes like @xml:id or @n.
    """
    # 1) idno[@type="strong"]
    for idno in entry.findall(".//tei:idno", ns):
        t = (idno.get("type") or "").lower()
        if t in ("strong", "strongs", "strong-number", "strong-number-greek"):
            code = clean_space(text_or_none(idno))
            if code and re.match(r"^[Gg]\d{1,5}$", code):
                return "G" + re.sub(r"^\D+", "", code)
    # 2) fallbacks: attributes like @n or @xml:id with G-code inside
    for attr in ("n", "{http://www.w3.org/XML/1998/namespace}id"):
        v = entry.get(attr)
        if v and re.search(r"[Gg]\d{1,5}", v):
            m = re.search(r"([Gg]\d{1,5})", v)
            if m:
                return "G" + re.sub(r"^\D+", "", m.group(1))
    # no Strong's id
    return None

def extract_lemma(entry, ns):
    """
    Prefer <form type="lemma"><orth>...</orth></form> then plain <orth>.
    """
    form_lemma = entry.find(".//tei:form[@type='lemma']/tei:orth", ns)
    if form_lemma is not None:
        return clean_space(text_or_none(form_lemma))
    orth = entry.find(".//tei:orth", ns)
    return clean_space(text_or_none(orth))

def extract_translit(entry, ns):
    """
    Look for <usg type='translit'> or <orth type='translit'>, or @rend/attr variants.
    """
    # usg (usage) blocks sometimes hold transliteration
    for usg in entry.findall(".//tei:usg", ns):
        t = (usg.get("type") or "").lower()
        if "translit" in t or "transcription" in t:
            tx = clean_space(text_or_none(usg))
            if tx: return tx
    # orth typed as transliteration
    for orth in entry.findall(".//tei:orth", ns):
        t = (orth.get("type") or "").lower()
        if "translit" in t:
            tx = clean_space(text_or_none(orth))
            if tx: return tx
    # mild heuristic: <pron> may contain it
    pron = entry.find(".//tei:pron", ns)
    return clean_space(text_or_none(pron))

def extract_pos(entry, ns):
    """
    POS often lives in <gramGrp> (e.g., <pos>, <gram>, nested text).
    """
    # <gramGrp> text
    g = entry.find(".//tei:gramGrp", ns)
    if g is not None:
        txt = clean_space(text_or_none(g))
        return norm_pos(txt)
    # any <pos> element
    p = entry.find(".//tei:pos", ns)
    return norm_pos(text_or_none(p))

def extract_senses(entry, ns):
    """
    Collect sense text as defs (short items) + build a primary gloss (first line).
    """
    defs, gloss = [], None

    # Preferred: <sense> elements
    for s in entry.findall(".//tei:sense", ns):
        st = clean_space(text_or_none(s))
        if st:
            defs.append(st)

    # Fallback: any <def> tags
    if not defs:
        for d in entry.findall(".//tei:def", ns):
            dt = clean_space(text_or_none(d))
            if dt:
                defs.append(dt)

    # Fallback: any <note type='gloss'> or similar
    if not defs:
        for n in entry.findall(".//tei:note", ns):
            t = (n.get("type") or "").lower()
            if "gloss" in t or "def" in t:
                nt = clean_space(text_or_none(n))
                if nt:
                    defs.append(nt)

    defs = uniq_list(defs)
    if defs:
        # create a short "gloss" from first def: take first clause/semicolon chunk
        g = re.split(r"[;—–\-•]|(?:\.\s+)", defs[0], maxsplit=1)
        gloss = clean_space(g[0])

    return defs, gloss

def extract_refs(entry, ns):
    """
    Gather biblical refs from <cit>/<quote> or <ref> texts (best-effort).
    """
    out = []
    # cit > quote holds examples
    for q in entry.findall(".//tei:cit/tei:quote", ns):
        qt = clean_space(text_or_none(q))
        if qt:
            # keep brief
            out.append(qt)
    # explicit <ref> (often "John 1:1", etc.)
    for r in entry.findall(".//tei:ref", ns):
        rt = clean_space(text_or_none(r))
        if rt:
            out.append(rt)
    # normalize & limit length
    out = [x if len(x) <= 80 else x[:77] + "…" for x in out]
    return uniq_list(out[:12])

# --- Main conversion ---------------------------------------------------------

def convert(xml_path: Path):
    # Handle TEI namespace
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}

    try:
        tree = ET.parse(str(xml_path))
    except Exception as e:
        print(f"[fatal] Could not parse TEI XML: {e}", file=sys.stderr)
        sys.exit(1)

    root = tree.getroot()

    # entries are typically under <TEI><text><body>... <entry>
    entries = root.findall(".//tei:entry", ns)
    if not entries:
        # some files use <entryFree>
        entries = root.findall(".//tei:entryFree", ns)

    out = {}

    for entry in entries:
        strongs = extract_strongs_id(entry, ns)
        if not strongs or not re.match(r"^G\d{1,5}$", strongs):
            # Skip entries that aren't keyed by a Greek Strong's number
            continue

        lemma = extract_lemma(entry, ns)
        translit = extract_translit(entry, ns)
        pos = extract_pos(entry, ns)
        defs, gloss = extract_senses(entry, ns)
        refs = extract_refs(entry, ns)

        rec = {
            "lemma": lemma or "",
            "translit": translit or "",
            "pos": pos or "",
            "gloss": gloss or "",
            "defs": defs or ([] if not gloss else [gloss]),
            "refs": refs,
        }
        out[strongs] = rec

    return out

def merge_into(primary: dict, secondary: dict):
    """
    Merge secondary into primary; keep existing primary fields, fill blanks from secondary.
    """
    for k, v in secondary.items():
        if k not in primary:
            primary[k] = v
            continue
        p = primary[k]
        # fill missing scalars
        for fld in ("lemma", "translit", "pos", "gloss"):
            if not p.get(fld) and v.get(fld):
                p[fld] = v[fld]
        # merge lists
        if v.get("defs"):
            p["defs"] = uniq_list((p.get("defs") or []) + v["defs"])
        if v.get("refs"):
            p["refs"] = uniq_list((p.get("refs") or []) + v["refs"])
    return primary

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xml", required=True, help="Path to Abbott-Smith TEI XML (e.g., data/lexicon/abbott-smith.tei.xml)")
    ap.add_argument("--out", required=True, help="Path to output JSON (e.g., data/lexicon/abbott-smith.json)")
    ap.add_argument("--merge", help="Optional existing lexicon JSON to merge into (e.g., data/lexicon/strongs-greek.json)")
    ap.add_argument("--pretty", action="store_true", help="Pretty-print output JSON")
    args = ap.parse_args()

    xml_path = Path(args.xml)
    out_path = Path(args.out)

    data = convert(xml_path)

    # Optional merge (fill gaps in existing lexicon)
    if args.merge:
        merge_path = Path(args.merge)
        if merge_path.exists():
            try:
                base = json.loads(merge_path.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"[warn] merge file not valid JSON: {e}", file=sys.stderr)
                base = {}
        else:
            base = {}
        data = merge_into(base, data)

    # Write
    kwargs = dict(ensure_ascii=False)
    if args.pretty:
        kwargs.update(indent=2)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, **kwargs), encoding="utf-8")

    print(f"[ok] Wrote {len(data)} entries → {out_path}")

if __name__ == "__main__":
    main()
