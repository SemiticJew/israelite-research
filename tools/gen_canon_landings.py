#!/usr/bin/env python3
# Regenerate canon landing pages with simple centered title,
# centered card content, no hover descriptions, and grouped "periodic" sections.

import os, re

ROOT = "/israelite-research"

def slug(s):
    s = s.replace("&","and")
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"\s+", "-", s.strip().lower())
    return s

# ---- Canon data & groupings ----
TANAKH_GROUPS = [
  ("A", [("Genesis","Ge"),("Exodus","Ex"),("Leviticus","Lv"),("Numbers","Nu"),("Deuteronomy","Dt")]),
  ("B", [("Joshua","Jos"),("Judges","Jdg"),("Ruth","Ru"),("1 Samuel","1Sa"),("2 Samuel","2Sa"),("1 Kings","1Ki"),("2 Kings","2Ki"),("1 Chronicles","1Ch"),("2 Chronicles","2Ch"),("Ezra","Ezr"),("Nehemiah","Neh"),("Esther","Est")]),
  ("C", [("Job","Job"),("Psalms","Ps"),("Proverbs","Pr"),("Ecclesiastes","Ecc"),("Song of Solomon","SoS")]),
  ("D", [("Isaiah","Isa"),("Jeremiah","Jer"),("Lamentations","Lam"),("Ezekiel","Eze"),("Daniel","Dan")]),
  ("E", [("Hosea","Hos"),("Joel","Joel"),("Amos","Am"),("Obadiah","Ob"),("Jonah","Jon"),("Micah","Mic"),
         ("Nahum","Nah"),("Habakkuk","Hab"),("Zephaniah","Zep"),("Haggai","Hag"),("Zechariah","Zec"),("Malachi","Mal")]),
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
  .crumbs{color:var(--muted);font-size:.95rem;margin-top:6px}

  .sections{display:grid; gap:18px; margin:18px 0 48px}
  .sect{display:block}
  .sect-label{
    font-weight:800; color:var(--brand); letter-spacing:.06em;
    margin:2px 0 8px; text-align:left; font-size:.85rem;
  }
  .pt-grid{
    display:grid; gap:12px;
    grid-template-columns:repeat(auto-fill, minmax(140px,1fr));
  }

  .pt-card{
    position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:8px; min-height:142px; background:var(--white);
    border:1px solid var(--sky); border-radius:14px; text-decoration:none; color:inherit;
    padding:12px; box-shadow:0 1px 3px rgba(0,0,0,.03);
    transition:transform .08s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
    text-align:center;
  }
  .pt-card:hover{ transform:translateY(-2px); box-shadow:0 10px 26px rgba(0,0,0,.09); border-color:#cfd9e6; background:#fff; }

  .pt-era{font-size:.78rem; color:var(--muted)}
  .pt-abbr{font-size:1.9rem; font-weight:900; color:var(--accent); letter-spacing:.02em; line-height:1}
  .pt-abbr sup{font-size:.6em; position:relative; top:-.4em; color:var(--accent)}
  .pt-name{border-top:1px solid var(--sky); padding-top:6px; font-weight:700; color:var(--brand)}
  @media (max-width:520px){
    .pt-abbr{font-size:1.6rem}
    .pt-grid{grid-template-columns:repeat(auto-fill, minmax(120px,1fr))}
  }
"""

HJS = r""

def card(canon, title, abbr):
    era = {
      "tanakh": "Hebrew Bible",
      "newtestament": "1st c. CE",
      "apocrypha": "Intertestamental"
    }.get(canon, "")
    abbr_out = re.sub(r'^(3|2|1)', r'<sup>\1</sup>', abbr)
    href = f"{ROOT}/{canon}/{slug(title)}.html"
    return f'''<a class="pt-card" href="{href}" aria-label="{title}">
  <div class="pt-era">{era}</div>
  <div class="pt-abbr">{abbr_out}</div>
  <div class="pt-name">{title}</div>
</a>'''

def build_page(canon_key):
    title, groups = CANONS[canon_key]
    sects = []
    for label, books in groups:
      cards = "\n".join(card(canon_key, t, a) for (t,a) in books)
      sects.append(f'''<section class="sect">
  <div class="sect-label">{label}</div>
  <div class="pt-grid">
{cards}
  </div>
</section>''')
    sections_html = "\n".join(sects)
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
  <header class="page-header">
    <h1 class="page-title">{title}</h1>
  </header>
  <div class="sections">
{sections_html}
  </div>
</main>
<div id="site-footer"></div>
<script src="{ROOT}/js/include.js" defer></script>
<script>{HJS}</script>
</body>
</html>"""

def write_page(name, html):
    with open(name, "w", encoding="utf-8") as f:
        f.write(html)

write_page("tanakh.html",      build_page("tanakh"))
write_page("newtestament.html",build_page("newtestament"))
write_page("apocrypha.html",   build_page("apocrypha"))
print("Wrote canon landings with centered titles, centered cards, grouped periodic sections.")
