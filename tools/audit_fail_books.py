import re, csv, pathlib, collections

AUD = pathlib.Path("tmp/bible_link_audit.tsv")
OUT1 = pathlib.Path("tmp/fail_book_counts.tsv")
OUT2 = pathlib.Path("tmp/fail_samples.tsv")

def ndash(s): return re.sub(r"[\u2012\u2013\u2014]", "-", s or "")
def norm(s): return re.sub(r"\s+"," ", (s or "").strip()).lower()

def extract_book(label):
    if not label: return ""
    t = ndash(label)
    m = re.match(r"^((?:[1-3]|i{1,3})\s+)?([A-Za-z][A-Za-z .'\-]+?)(?=\s+\d)", t, flags=re.I)
    if not m: 
        # try up to colon (e.g., "Wis. 1:1")
        m2 = re.match(r"^((?:[1-3]|i{1,3})\s+)?([A-Za-z][A-Za-z .'\-]+?)(?=[:\s])", t, flags=re.I)
        if not m2: return ""
        prefix = (m2.group(1) or "").strip()
        book = (m2.group(2) or "").strip().replace(".", "")
        return norm((prefix + " " + book).strip())
    prefix = (m.group(1) or "").strip()
    book = (m.group(2) or "").strip().replace(".", "")
    return norm((prefix + " " + book).strip())

fails = []
with AUD.open(encoding="utf-8") as f:
    r = csv.DictReader(f, delimiter="\t")
    for row in r:
        if row.get("status") != "OK":
            fails.append(row)

ctr = collections.Counter()
for row in fails:
    b = extract_book(row.get("label",""))
    ctr[b] += 1

OUT1.parent.mkdir(parents=True, exist_ok=True)
with OUT1.open("w", encoding="utf-8") as f:
    f.write("book\tcount\n")
    for book, count in ctr.most_common():
        f.write(f"{book}\t{count}\n")

with OUT2.open("w", encoding="utf-8") as f:
    f.write("idx\theadword\tlabel\tstatus\tcanon\tslug\tch\tv\turl\n")
    for row in fails[:200]:
        f.write("\t".join([row.get(k,"") for k in ["entry_index","headword","label","status","book","category","ch","v","url"]])+"\n")

print(f"Wrote {OUT1} and {OUT2} with {len(fails)} FAIL rows")
