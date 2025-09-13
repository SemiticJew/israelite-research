#!/usr/bin/env python3
# Generates tanakh.html, newtestament.html, apocrypha.html with periodic-table grids

import os, json, sys, re
ROOT = "/israelite-research"

def slug(s):
    s = s.replace("&","and")
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"\s+", "-", s.strip().lower())
    return s

TANAKH = [
  ("Genesis","Ge"),("Exodus","Ex"),("Leviticus","Lv"),("Numbers","Nu"),("Deuteronomy","Dt"),
  ("Joshua","Jos"),("Judges","Jdg"),("Ruth","Ru"),
  ("1 Samuel","1Sa"),("2 Samuel","2Sa"),("1 Kings","1Ki"),("2 Kings","2Ki"),
  ("1 Chronicles","1Ch"),("2 Chronicles","2Ch"),
  ("Ezra","Ezr"),("Nehemiah","Neh"),("Esther","Est"),
  ("Job","Job"),("Psalms","Ps"),("Proverbs","Pr"),("Ecclesiastes","Ecc"),("Song of Solomon","SoS"),
  ("Isaiah","Isa"),("Jeremiah","Jer"),("Lamentations","Lam"),("Ezekiel","Eze"),("Daniel","Dan"),
  ("Hosea","Hos"),("Joel","Joel"),("Amos","Am"),("Obadiah","Ob"),("Jonah","Jon"),
  ("Micah","Mic"),("Nahum","Nah"),("Habakkuk","Hab"),("Zephaniah","Zep"),("Haggai","Hag"),
  ("Zechariah","Zec"),("Malachi","Mal")
]

NEWTEST = [
  ("Matthew","Mt"),("Mark","Mk"),("Luke","Lk"),("John","Jn"),("Acts","Ac"),
  ("Romans","Rom"),("1 Corinthians","1Co"),("2 Corinthians","2Co"),
  ("Galatians","Gal"),("Ephesians","Eph"),("Philippians","Php"),("Colossians","Col"),
  ("1 Thessalonians","1Th"),("2 Thessalonians","2Th"),
  ("1 Timothy","1Ti"),("2 Timothy","2Ti"),("Titus","Tit"),("Philemon","Phm"),
  ("Hebrews","Heb"),("James","Jas"),("1 Peter","1Pe"),("2 Peter","2Pe"),
  ("1 John","1Jn"),("2 John","2Jn"),("3 John","3Jn"),("Jude","Jud"),("Revelation","Rev")
]

APOCR = [
  ("Tobit","Tb"),("Judith","Jdt"),("Additions to Esther","Add Est"),
  ("Wisdom","Wis"),("Sirach","Sir"),("Baruch","Bar"),("Letter of Jeremiah","Let Jer"),
  ("Prayer of Azariah","Pr Az"),("Susanna","Sus"),("Bel and the Dragon","Bel"),
  ("1 Maccabees","1Mac"),("2 Maccabees","2Mac"),
  ("1 Esdras","1Esd"),("2 Esdras","2Esd"),
  ("Prayer of Manasseh","Pr Man")
]

BASE = {
  "tanakh": (TANAKH, "Tanakh"),
  "newtestament": (NEWTEST, "New Testament"),
  "apocrypha": (APOCR, "Apocrypha")
}

CSS = r"""
  :root{
    --ink:#0b2340; --accent:#F17300; --brand:#054A91;
    --muted:#6b7280; --sky:#DBE4EE; --white:#fff;
    --tile:#f8fafc; --tile2:#eef5fd;
  }
  body{background:#fbfdff;}
  .container{max-width:1200px;margin:0 auto;padding:0 16px}
  .page-header{padding:28px 0 10px}
  .page-title{margin:0;font-size:2.1rem;font-weight:800;color:var(--ink)}
  .crumbs{color:var(--muted);font-size:.95rem;margin-top:6px}
  .pt-grid{
    display:grid; gap:12px; margin:16px 0 46px;
    grid-template-columns:repeat(auto-fill, minmax(140px,1fr));
  }
  .pt-card{
    position:relative; display:flex; flex-direction:column; gap:6px;
    min-height:142px; background:var(--white);
    border:1px solid var(--sky); border-radius:14px; text-decoration:none; color:inherit;
    padding:10px; box-shadow:0 1px 3px rgba(0,0,0,.03);
    transition:transform .08s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
  }
  .pt-card:hover{ transform:translateY(-2px); box-shadow:0 10px 26px rgba(0,0,0,.09); border-color:#cfd9e6; background:#fff; }
  .pt-top{display:flex; align-items:center; justify-content:flex-end}
  .pt-era{font-size:.78rem; color:var(--muted)}
  .pt-mid{flex:1 1 auto; display:flex; align-items:center; justify-content:center}
  .pt-abbr{font-size:1.9rem; font-weight:900; color:var(--accent); letter-spacing:.02em}
  .pt-abbr sup{font-size:.6em; position:relative; top:-.4em; color:var(--accent)}
  .pt-footer{border-top:1px solid var(--sky); padding-top:6px; font-weight:700; color:var(--brand)}
  /* Hover popover */
  .pt-card[data-hover]::after{
    content: attr(data-hover);
    position:absolute; left:10px; right:10px; bottom:100%;
    transform:translateY(6px); opacity:0; pointer-events:none;
    background:#fff; border:1px solid #e6ebf2; border-radius:10px;
    box-shadow:0 12px 34px rgba(0,0,0,.14);
    padding:.5rem .6rem; color:#0e1622; font-size:.9rem; line-height:1.35;
    transition:opacity .12s ease, transform .12s ease;
    z-index:10;
  }
  .pt-card:hover::after{ opacity:1; transform:translateY(0); }
  @media (max-width:520px){
    .pt-abbr{font-size:1.6rem}
    .pt-grid{grid-template-columns:repeat(auto-fill, minmax(120px,1fr))}
  }
"""

HJS = r"""
  document.addEventListener('DOMContentLoaded', ()=>{
    // no-op: hover content delivered via data-hover; links are static to per-book pages
  });
"""

TIPS = {
  "tanakh": "Torah • Prophets • Writings",
  "newtestament": "Gospels • Acts • Epistles • Revelation",
  "apocrypha": "Deuterocanon / Apocryphal Books"
}

def card_html(canon, title, abbr):
    # simple era labels by canon (optional)
    era = {
      "tanakh": "c. 15th–5th c. BCE",
      "newtestament": "1st c. CE",
      "apocrypha": "Intertestamental"
    }.get(canon, "")
    s = title
    sslug = slug(s)
    href = f"{ROOT}/{canon}/{sslug}.html"
    hover = f"{s} — Open chapters"
    # superscript for numbered books in abbr (e.g., 1Sa)
    abbr_out = re.sub(r'^(3|2|1)', r'<sup>\1</sup>', abbr)
    return f'''<a class="pt-card" href="{href}" aria-label="{s}" data-hover="{hover}">
  <div class="pt-top"><div class="pt-era">{era}</div></div>
  <div class="pt-mid"><div class="pt-abbr">{abbr_out}</div></div>
  <div class="pt-footer">{s}</div>
</a>'''

def build_page(canon):
    books, canon_title = BASE[canon]
    cards = "\n".join(card_html(canon, t, a) for (t,a) in books)
    tip = TIPS.get(canon, "")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{canon_title} — Semitic Jew</title>
<link rel="stylesheet" href="{ROOT}/styles.css"/>
<style>{CSS}</style>
</head>
<body class="{canon}-page">
<div id="site-header"></div>
<main class="container">
  <header class="page-header">
    <h1 class="page-title">{canon_title}</h1>
    <div class="crumbs">{tip}</div>
  </header>
  <section>
    <div class="pt-grid">
{cards}
    </div>
  </section>
</main>
<div id="site-footer"></div>
<script src="{ROOT}/js/include.js" defer></script>
<script>{HJS}</script>
</body>
</html>"""

def write_page(name, html):
    with open(name, "w", encoding="utf-8") as f:
        f.write(html)

os.makedirs(".", exist_ok=True)
write_page("tanakh.html", build_page("tanakh"))
write_page("newtestament.html", build_page("newtestament"))
write_page("apocrypha.html", build_page("apocrypha"))
print("Wrote: tanakh.html, newtestament.html, apocrypha.html")
