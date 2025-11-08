import json, re, sys, pathlib

DICT_PATH = pathlib.Path('data/israelite_dictionary.json')
XREF_PATH = pathlib.Path('js/xref-hover.js')

def read_json(p):
    data = json.loads(p.read_text())
    return data if isinstance(data, list) else data.get('entries', [])

def extract_known_books(p):
    src = p.read_text()
    known = set()
    for m in re.finditer(r'"([A-Za-z0-9 .]+)"\s*:', src):
        known.add(m.group(1).strip().rstrip('.'))
    for m in re.finditer(r'(^|\s)([A-Za-z][A-Za-z0-9. ]{1,20})\s*:', src):
        known.add(m.group(2).strip().rstrip('.'))
    return known

def normalize(s): return re.sub(r'[\u2012\u2013\u2014]', '-', s)
def split_refs(s):
    return [r.strip() for r in re.split(r'[,;|]', normalize(s or '')) if r.strip()]
def book_token(r):
    m = re.match(r'((?:[1-3]\s+)?[A-Za-z][A-Za-z.]+)', r)
    return m.group(1).rstrip('.') if m else None

entries = read_json(DICT_PATH)
known = extract_known_books(XREF_PATH)
used, unknown, examples = {}, {}, {}

for e in entries:
    refs = ', '.join(str(e.get(k,'')) for k in ('bible_refs','biblical_refs','refs'))
    for piece in split_refs(refs):
        book = book_token(piece)
        if not book: continue
        used[book] = used.get(book,0)+1
        if book not in known:
            unknown[book] = unknown.get(book,0)+1
            examples.setdefault(book, piece)

pathlib.Path('tmp/used-books.txt').write_text(
    '\n'.join(f"{k}\t{v}" for k,v in sorted(used.items())) + '\n'
)
pathlib.Path('tmp/unknown-books.txt').write_text(
    '\n'.join(f"{k}\t{v}\tExample: {examples[k]}" for k,v in sorted(unknown.items(), key=lambda x:-x[1])) + '\n'
)
print("Used books written to tmp/used-books.txt")
print("Unknown/mismatched books written to tmp/unknown-books.txt")
print(f"Known-book count scraped from xref-hover.js: {len(known)}")
