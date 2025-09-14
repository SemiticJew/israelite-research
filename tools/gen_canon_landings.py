#!/usr/bin/env python3
# Canon landing pages generator with per-book composition dates.
# Usage:
#   python3 tools/gen_canon_landings.py                # writes all three
#   python3 tools/gen_canon_landings.py newtestament   # writes only NT
#   python3 tools/gen_canon_landings.py apocrypha      # writes only Apocrypha

import os, re, sys

ROOT = "/israelite-research"

def slug(s):
    s = s.replace("&","and")
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"\s+", "-", s.strip().lower())
    return s

# ---- Groupings ----
TANAKH_GROUPS = [
  ("A", [("Genesis","Ge","c. 15th–5th c. BCE"),("Exodus","Ex","c. 15th–5th c. BCE"),("Leviticus","Lv","c. 15th–5th c. BCE"),("Numbers","Nu","c. 15th–5th c. BCE"),("Deuteronomy","Dt","c. 15th–5th c. BCE")]),
  ("B", [("Joshua","Jos","c. 7th–5th c. BCE"),("Judges","Jdg","c. 7th–5th c. BCE"),("Ruth","Ru","c. 6th–4th c. BCE"),
         ("1 Samuel","1Sa","c. 7th–5th c. BCE"),("2 Samuel","2Sa","c. 7th–5th c. BCE"),
         ("1 Kings","1Ki","c. 7th–5th c. BCE"),("2 Kings","2Ki","c. 7th–5th c. BCE"),
         ("1 Chronicles","1Ch","c. 5th–4th c. BCE"),("2 Chronicles","2Ch","c. 5th–4th c. BCE"),
         ("Ezra","Ezr","c. 5th–4th c. BCE"),("Nehemiah","Neh","c. 5th–4th c. BCE"),("Esther","Est","c. 5th–4th c. BCE")]),
  ("C", [("Job","Job","c. 7th–4th c. BCE"),("Psalms","Ps","c. 10th–4th c. BCE"),
         ("Proverbs","Pr","c. 10th–4th c. BCE"),("Ecclesiastes","Ecc","c. 5th–3rd c. BCE"),
         ("Song of Solomon","SoS","c. 10th–4th c. BCE")]),
  ("D", [("Isaiah","Isa","c. 8th–6th c. BCE"),("Jeremiah","Jer","c. 7th–6th c. BCE"),
         ("Lamentations","Lam","c. 6th c. BCE"),("Ezekiel","Eze","c. 6th c. BCE"),("Daniel","Dan","c. 6th–2nd c. BCE")]),
  ("E", [("Hosea","Hos","c. 8th c. BCE"),("Joel","Joel","c. 9th–5th c. BCE"),("Amos","Am","c. 8th c. BCE"),
         ("Obadiah","Ob","c. 6th–5th c. BCE"),("Jonah","Jon","c. 8th–4th c. BCE"),
         ("Micah","Mic","c. 8th c. BCE"),("Nahum","Nah","c. 7th c. BCE"),("Habakkuk","Hab","c. 7th–6th c. BCE"),
         ("Zephaniah","Zep","c. 7th c. BCE"),("Haggai","Hag","c. 6th c. BCE"),("Zechariah","Zec","c. 6th–5th c. BCE"),
         ("Malachi","Mal","c. 5th c. BCE")]),
]

# New Testament with approximate composition dates
NEWTEST_GROUPS = [
  ("A", [("Matthew","Mt","c. 60–80 CE"),("Mark","Mk","c. 55–70 CE"),("Luke","Lk","c. 60–90 CE"),("John","Jn","c. 90–110 CE")]),
  ("B", [("Acts","Ac","c. 62–90 CE")]),
  ("C", [("Romans","Rom","c. 57 CE"),("1 Corinthians","1Co","c. 53–55 CE"),("2 Corinthians","2Co","c. 55–57 CE"),
         ("Galatians","Gal","c. 48–55 CE"),("Ephesians","Eph","c. 60–62 CE"),("Philippians","Php","c. 60–62 CE"),
         ("Colossians","Col","c. 60–62 CE"),("1 Thessalonians","1Th","c. 50–51 CE"),("2 Thessalonians","2Th","c. 50–52 CE"),
         ("1 Timothy","1Ti","c. 62–64 CE"),("2 Timothy","2Ti","c. 64–67 CE"),("Titus","Tit","c. 62–64 CE"),("Philemon","Phm","c. 60–62 CE")]),
  ("D", [("Hebrews","Heb","c. 60–90 CE"),("James","Jas","c. 45–62 CE"),("1 Peter","1Pe","c. 60–65 CE"),("2 Peter","2Pe","c. 60–68 CE"),
         ("1 John","1Jn","c. 90–110 CE"),("2 John","2Jn","c. 90–110 CE"),("3 John","3Jn","c. 90–110 CE"),("Jude","Jud","c. 60–90 CE")]),
  ("E", [("Revelation","Rev","c. 95–96 CE")]),
]

# Apocrypha with broad scholarly ranges
APOCR_GROUPS = [
  ("A", [("Tobit","Tb","3rd–2nd c. BCE"),("Judith","Jdt","late 2nd c. BCE"),("Additions to Esther","Add Est","2nd–1st c. BCE")]),
  ("B", [("Wisdom","Wis","late 1st c. BCE–early 1st c. CE"),("Sirach","Sir","early 2nd c. BCE"),("Baruch","Bar","2nd–1st c. BCE"),("Letter of Jeremiah","Let Jer","4th–2nd c. BCE")]),
  ("C", [("Prayer of Azariah","Pr Az","2nd–1st c. BCE"),("Susanna","Sus","2nd–1st c. BCE"),("Bel and the Dragon","Bel","2nd–1st c. BCE")]),
  ("D", [("1 Maccabees","1Mac","late 2nd c. BCE"),("2 Maccabees","2Mac","late 2nd c. BCE"),("1 Esdras","1Esd","2nd–1st c. BCE"),("2 Esdras","2Esd","late 1st–early 2nd c. CE")]),
  ("E", [("Prayer of Manasseh","Pr Man","2nd–1st c. BCE")]),
]

CANONS = {
  "tanakh":      ("Tanakh", TANAKH_GROUPS),
  "newtestament":("New Testament", NEWTEST_GROUPS),
  "apocrypha":   ("Apocrypha", APOCR_GROUPS),
}

CSS = r"""
  :root{ --ink:#0b2340; --accent:#F17300; --brand:#054A91; --muted:#6b7280; --sky:#DBE4EE; --white:#fff; }
  body{background:#fbfdff;}
  .container{max-width:1200px;margin:0 auto;padding:0 16px}
  .page-header{padding:28px 0 8px; text-align:center}
  .page-title{margin:0;font-size:2.2rem;font-weight:800;color:var(--ink)}
  .sections{display:grid; gap:18px; margin:18px 0 48px}
  .sect-label{font-weight:800;color:var(--brand);letter-spacing:.06em;margin:2px 0 8px;font-size:.85rem}
  .pt-grid{display:grid; gap:12px;grid-template-columns:repeat(auto-fill, minmax(140px,1fr))}
  .pt-card{display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:6px;min-height:142px;background:var(--white);border:1px solid var(--sky);border-radius:14px;
    text-decoration:none;color:inherit;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.03);
    transition:transform .08s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;text-align:center}
  .pt-card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.09);border-color:#cfd9e6;background:#fff}
  .pt-era{font-size:.78rem;color:var(--muted)}
  .pt-abbr{font-size:1.9rem;font-weight:900;color:var(--accent);letter-spacing:.02em;line-height:1}
  .pt-abbr sup{font-size:.6em;position:relative;top:-.4em;color:var(--accent)}
  .pt-name{border-top:1px solid var(--sky);padding-top:6px;font-weight:700;color:var(--brand)}
"""

def card(canon, title, abbr, date=None):
    href = f"{ROOT}/{canon}/{slug(title)}.html"
    abbr_out = re.sub(r'^(3|2|1)', r'<sup>\1</sup>', abbr)
    era = f'<div class="pt-era">{date}</div>' if date else ""
    return f'''<a class="pt-card" href="{href}" aria-label="{title}">
  {era}
  <div class="pt-abbr">{abbr_out}</div>
  <div class="pt-name">{title}</div>
</a>'''

def build_page(canon_key):
    title, groups = CANONS[canon_key]
    sects = []
    for label, books in groups:
        cards=[]
        for b in books:
            if len(b) == 3:
                cards.append(card(canon_key, b[0], b[1], b[2]))
            else:
                cards.append(card(canon_key, b[0], b[1], None))
        sects.append(f'''<section class="sect">
  <div class="sect-label">{label}</div>
  <div class="pt-grid">
{chr(10).join(cards)}
  </div>
</section>''')
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title>
<link rel="stylesheet" href="{ROOT}/styles.css"/>
<style>{CSS}</style>
</head>
<body class="{canon_key}-page">
<div id="site-header"></div>
<main class="container">
  <header class="page-header"><h1 class="page-title">{title}</h1></header>
  <div class="sections">
{chr(10).join(sects)}
  </div>
</main>
<div id="site-footer"></div>
<script src="{ROOT}/js/include.js" defer></script>
</body>
</html>"""

def write_page(name, html):
    with open(name, "w", encoding="utf-8") as f:
        f.write(html)

targets = sys.argv[1:] or ["tanakh","newtestament","apocrypha"]
if "tanakh" in targets:
    write_page("tanakh.html", build_page("tanakh"))
if "newtestament" in targets:
    write_page("newtestament.html", build_page("newtestament"))
if "apocrypha" in targets:
    write_page("apocrypha.html", build_page("apocrypha"))

print("Wrote:", ", ".join(t + ".html" for t in targets))
