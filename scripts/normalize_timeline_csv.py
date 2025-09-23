import csv, re, sys, pathlib

SRC = pathlib.Path("data/raw/biblical_timeline.csv")
OUT = pathlib.Path("israelite-research/data/extra_sources.csv")
OUT.parent.mkdir(parents=True, exist_ok=True)

def to_int_year(val):
    if val is None: return None
    s = str(val).strip()
    if not s or s.lower() in ("nan","none"): return None
    m = re.search(r'(-?\d{1,4})', s)
    if not m: return None
    n = int(m.group(1))
    if n > 0 and re.search(r'\bBCE?\b', s, flags=re.I):
        n = -n
    return n

def pick_year(row):
    for key in ("N","P","G","F","S"):
        if key in row:
            y = to_int_year(row[key])
            if y is not None:
                return y
    for v in row.values():
        y = to_int_year(v)
        if y is not None:
            return y
    return None

def clean_str(x):
    return re.sub(r'\s+', ' ', str(x).strip()) if x is not None else ""

def main():
    if not SRC.exists():
        print(f"Source CSV not found: {SRC}", file=sys.stderr)
        sys.exit(1)

    with SRC.open(newline='', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        rows_out = []
        for row in reader:
            title = clean_str(row.get("C") or row.get("Event Title Description") or "")
            if not title:
                continue
            year = pick_year(row)
            if year is None:
                continue
            rec = {
                "year": year,
                "title": title,
                "era": clean_str(row.get("E") or row.get("Type of Dated Event") or ""),
                "type": clean_str(row.get("E") or ""),
                "region": "",
                "summary": clean_str(row.get("D") or row.get("Brief Information") or ""),
                "confidence": ""
            }
            rows_out.append(rec)

    rows_out.sort(key=lambda r: r["year"])

    with OUT.open("w", newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=["year","title","era","type","region","summary","confidence"])
        w.writeheader()
        w.writerows(rows_out)

    print(f"Wrote {len(rows_out)} records to {OUT}")

if __name__ == "__main__":
    main()
