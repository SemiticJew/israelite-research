#!/usr/bin/env python3
import argparse, os, re, sys, time
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("BeautifulSoup4 is required. Try: pip install beautifulsoup4 lxml", file=sys.stderr)
    sys.exit(2)

BOOKS = [
    "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
    "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther",
    "Job","Psalm","Psalms","Proverbs","Ecclesiastes","Song of Songs","Song of Solomon","Isaiah","Jeremiah",
    "Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum",
    "Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
    "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians",
    "Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
    "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
]

ABBR = {
    r"\bGen\b":"Genesis", r"\bGe\b":"Genesis", r"\bGn\b":"Genesis",
    r"\bEx\b":"Exodus", r"\bExod\b":"Exodus",
    r"\bLev\b":"Leviticus", r"\bLv\b":"Leviticus",
    r"\bNum\b":"Numbers", r"\bNm\b":"Numbers", r"\bNb\b":"Numbers",
    r"\bDeut\b":"Deuteronomy", r"\bDt\b":"Deuteronomy",
    r"\bJosh\b":"Joshua", r"\bJos\b":"Joshua", r"\bJsh\b":"Joshua",
    r"\bJudg\b":"Judges", r"\bJdg\b":"Judges",
    r"\bRth\b":"Ruth",
    r"\b1 Sam\b":"1 Samuel", r"\b2 Sam\b":"2 Samuel",
    r"\b1 Kgs\b":"1 Kings", r"\b2 Kgs\b":"2 Kings",
    r"\b1 Chr\b":"1 Chronicles", r"\b2 Chr\b":"2 Chronicles",
    r"\bNeh\b":"Nehemiah",
    r"\bEst\b":"Esther",
    r"\bJob\b":"Job",
    r"\bPs\b":"Psalm", r"\bPsa\b":"Psalm", r"\bPsalms\b":"Psalms",
    r"\bProv\b":"Proverbs", r"\bPr\b":"Proverbs",
    r"\bEccl\b":"Ecclesiastes", r"\bEcc\b":"Ecclesiastes",
    r"\bSong\b":"Song of Songs", r"\bSoS\b":"Song of Songs", r"\bSS\b":"Song of Songs",
    r"\bIsa\b":"Isaiah",
    r"\bJer\b":"Jeremiah",
    r"\bLam\b":"Lamentations",
    r"\bEzek\b":"Ezekiel",
    r"\bDan\b":"Daniel",
    r"\bHos\b":"Hosea",
    r"\bJoel\b":"Joel",
    r"\bAmos\b":"Amos",
    r"\bObad\b":"Obadiah",
    r"\bJon\b":"Jonah",
    r"\bMic\b":"Micah",
    r"\bNah\b":"Nahum",
    r"\bHab\b":"Habakkuk",
    r"\bZeph\b":"Zephaniah",
    r"\bHag\b":"Haggai",
    r"\bZech\b":"Zechariah",
    r"\bMal\b":"Malachi",
    r"\bMt\b":"Matthew", r"\bMatt\b":"Matthew",
    r"\bMk\b":"Mark",
    r"\bLk\b":"Luke",
    r"\bJn\b":"John",
    r"\bActs\b":"Acts",
    r"\bRom\b":"Romans",
    r"\b1 Cor\b":"1 Corinthians", r"\b2 Cor\b":"2 Corinthians",
    r"\bGal\b":"Galatians",
    r"\bEph\b":"Ephesians",
    r"\bPhil\b":"Philippians",
    r"\bCol\b":"Colossians",
    r"\b1 Thess\b":"1 Thessalonians", r"\b2 Thess\b":"2 Thessalonians",
    r"\b1 Tim\b":"1 Timothy", r"\b2 Tim\b":"2 Timothy",
    r"\bTitus\b":"Titus",
    r"\bPhilem\b":"Philemon", r"\bPhm\b":"Philemon",
    r"\bHeb\b":"Hebrews",
    r"\bJas\b":"James",
    r"\b1 Pet\b":"1 Peter", r"\b2 Pet\b":"2 Peter",
    r"\b1 Jn\b":"1 John", r"\b2 Jn\b":"2 John", r"\b3 Jn\b":"3 John",
    r"\bJude\b":"Jude",
    r"\bRev\b":"Revelation", r"\bApoc\b":"Revelation"
}

VERSE_CSS = """.verse{position:relative;text-decoration:underline dotted;cursor:help;color:var(--brand);font-weight:600;}
.verse::after{content: attr(data-ref) " — " attr(data-note); position:absolute; left:0; bottom:120%; background:#ffffff; color:var(--ink); border:1px solid var(--border); padding:.45rem .6rem; font-size:.85rem; line-height:1.35; border-radius:8px; white-space:normal; width:min(360px,85vw); box-shadow:0 8px 20px rgba(0,0,0,.12); opacity:0; transform:translateY(4px); pointer-events:none; transition:opacity .12s ease, transform .12s ease; z-index:30;}
.verse:hover::after{opacity:1; transform:translateY(0);}"""

EXCLUDE_DIRS = {"node_modules",".git",".next","dist","build","out","_site","vendor","public"}

book_names = sorted(set(list(BOOKS) + [k.strip(r"\b") for k in ABBR.keys()]), key=len, reverse=True)
book_part = r"(?:%s)" % "|".join(book_names)
# Book + space + Chapter:Verse with optional range (e.g., 3:16-17)
REF_RE = re.compile(rf"({book_part})\s+(\d+):(\d+(?:[–\-]\d+)?)")

def normalize_data_ref(s):
    out = s
    for pat, full in ABBR.items():
        out = re.sub(pat, full, out)
    return out

def ensure_head_assets(soup):
    head = soup.find("head")
    if not head:
        return
    page_text = soup.get_text(" ", strip=False)
    if ".verse{" not in page_text:
        style_tag = soup.new_tag("style")
        style_tag.string = VERSE_CSS
        head.append(style_tag)

def ensure_verses_js(soup):
    body = soup.find("body")
    if not body:
        return
    has_js = any(tag.get("src") == "/israelite-research/js/verses.js" for tag in soup.find_all("script"))
    if not has_js:
        s = soup.new_tag("script", src="/israelite-research/js/verses.js", defer=True)
        body.append(s)

def wrap_refs_in_node(node, soup):
    for child in list(node.children):
        if getattr(child, "name", None) in ["script","style"]:
            continue
        if getattr(child, "name", None) == "span":
            # if it's already a verse span, skip; else recurse
            if "verse" in (child.get("class") or []):
                continue
            wrap_refs_in_node(child, soup)
            continue
        if getattr(child, "name", None) is None:  # NavigableString
            text = str(child)
            if ":" not in text:
                continue
            def repl(m):
                ref = f"{m.group(1)} {m.group(2)}:{m.group(3)}"
                norm = normalize_data_ref(ref)
                return f'<span class="verse" data-ref="{norm}" data-note="">{ref}</span>'
            new_html = REF_RE.sub(repl, text)
            if new_html != text:
                child.replace_with(BeautifulSoup(new_html, "html.parser"))
        else:
            wrap_refs_in_node(child, soup)

def split_combined_refs(soup):
    for sp in soup.select("span.verse"):
        data_ref = sp.get("data-ref", "")
        if any(sep in data_ref for sep in [",",";"]):
            refs = [normalize_data_ref(r.strip()) for r in re.split(r"[;,]\s*", data_ref) if r.strip()]
            new_frag = BeautifulSoup("", "html.parser")
            for i, r in enumerate(refs):
                nsp = soup.new_tag("span", **{"class":"verse"})
                nsp["data-ref"] = r
                nsp["data-note"] = sp.get("data-note","")
                nsp.string = r
                new_frag.append(nsp)
                if i < len(refs) - 1:
                    new_frag.append(", ")
            sp.replace_with(new_frag)

def process_html(path: Path, dry_run=False, verbose=False):
    try:
        html = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        if verbose:
            print(f"[skip] {path} ({e})")
        return False

    soup = BeautifulSoup(html, "html.parser")
    before = str(soup)

    ensure_head_assets(soup)
    ensure_verses_js(soup)

    body = soup.find("body")
    if body:
        wrap_refs_in_node(body, soup)
        split_combined_refs(soup)

    after = str(soup)
    if after == before:
        if verbose:
            print(f"[nochange] {path}")
        return False

    if dry_run:
        if verbose:
            print(f"[dry-run would patch] {path}")
        return True

    # Backup
    ts = time.strftime("%Y%m%d-%H%M%S")
    backup = path.with_suffix(path.suffix + f".bak-{ts}")
    try:
        backup.write_text(html, encoding="utf-8")
    except Exception as e:
        print(f"[error] could not write backup for {path}: {e}", file=sys.stderr)
        return False

    # Write updated
    try:
        path.write_text(after, encoding="utf-8")
    except Exception as e:
        print(f"[error] could not write updated file for {path}: {e}", file=sys.stderr)
        return False

    if verbose:
        print(f"[patched] {path} (backup: {backup.name})")
    return True

def should_skip(p: Path):
    parts = set(p.parts)
    return any(x in parts for x in EXCLUDE_DIRS)

def main():
    ap = argparse.ArgumentParser(description="Patch inline Bible citations across HTML files sitewide.")
    ap.add_argument("--root", default=".", help="Repo root to scan (default=.)")
    ap.add_argument("--dry-run", action="store_true", help="Scan and report without writing changes")
    ap.add_argument("--verbose", action="store_true", help="Verbose output")
    ap.add_argument("--glob", default="**/*.html", help="Glob to match (default '**/*.html')")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    paths = list(root.glob(args.glob))
    if args.verbose:
        print(f"Scanning {len(paths)} HTML files under {root} ...")

    changed = 0
    for p in paths:
        if should_skip(p):
            continue
        if process_html(p, dry_run=args.dry_run, verbose=args.verbose):
            changed += 1

    if args.verbose or args.dry_run:
        print(f"Done. {'Would patch' if args.dry_run else 'Patched'} {changed} file(s).")

if __name__ == "__main__":
    main()
