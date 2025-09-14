#!/usr/bin/env python3
# Canon landing pages with centered titles, centered cards, grouped periodic sections,
# and Hebrew Bible (Tanakh) cards show composition dates.

import os, re

ROOT = "/israelite-research"

def slug(s):
    s = s.replace("&","and")
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"\s+", "-", s.strip().lower())
    return s

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

NEWTEST_GROUPS = [
  ("A", [("Matthew","Mt"),("Mark","Mk"),("Luke","Lk"),("John","Jn")]),
  ("B", [("Acts","Ac")]),
  ("C", [("Romans","Rom"),("1 Corinthians","1Co"),("2 Corinthians","2Co"),
         ("Galatians","Gal"),("Ephesians","Eph"),("Philippians","Php"),("Colossians","Col"),
         ("1 Thessalonians","1Th"),("2 Thessalonians","2Th"),("1 Timothy","1Ti"),("2 Timothy","2Ti"),
         ("Titus","Tit"),("Philemon","Phm")]),
  ("D", [("Hebrews","Heb"),("James","Jas"),("1 Peter","1Pe"),("2 Peter","2Pe"),
         ("1 John","1Jn"),("2 John","2Jn"),("3 John","3Jn"),("Jude","Jud")]),
  ("E", [("Revelation","Rev")]),
]

APOCR_GROUPS = [
  ("A", [("Tobit","Tb"),("Judith","Jdt"),("Additions to Esther","Add Est")]),
  ("B", [("Wisdom","Wis"),("Sirach","Sir"),("Baruch","Bar"),("Letter of Jeremiah","Let Jer")]),
  ("C", [("Prayer of Azariah","Pr Az"),("Susanna","Sus"),("Bel and the Dragon","Bel")]),
  ("D", [("1 Maccabees","1Mac"),("2 Maccabees","2Mac"),("1 Esdras","1Esd"),("2 Esdras","2Esd")]),
  ("E", [("Prayer of Manasseh","Pr Man")]),
]

CANONS = {
  "tanakh":      ("Tanakh", TANAKH_GROUPS),
  "newtestament":("New Testament", NEWTEST_GROUPS),
  "apocrypha":   ("Apocrypha", APOCR_GROUPS),
}

CSS = r"""
  :root{
    --ink:#0b2340; --accent:#F17300; --brand:#054A91;
    --muted:#6b7280; --sky:#DBE4EE; --white:#fff;
  }
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
            if canon_key=="tanakh":
                cards.append(card(canon_key, b[0], b[1], b[2]))
            else:
                cards.append(card(canon_key, b[0], b[1]))
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

with open("tanakh.html","w",encoding="utf-8") as f: f.write(build_page("tanakh"))
with open("newtestament.html","w",encoding="utf-8") as f: f.write(build_page("newtestament"))
with open("apocrypha.html","w",encoding="utf-8") as f: f.write(build_page("apocrypha"))
print("Wrote canon landing pages with dates for Tanakh.")
