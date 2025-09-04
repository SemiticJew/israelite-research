#!/usr/bin/env bash
set -euo pipefail

# Slugs → Pretty Titles (Roman numerals where applicable)
declare -A TITLES=(
  [genesis]="Genesis"
  [exodus]="Exodus"
  [leviticus]="Leviticus"
  [numbers]="Numbers"
  [deuteronomy]="Deuteronomy"
  [joshua]="Joshua"
  [judges]="Judges"
  [ruth]="Ruth"
  [i-samuel]="I Samuel"
  [ii-samuel]="II Samuel"
  [i-kings]="I Kings"
  [ii-kings]="II Kings"
  [i-chronicles]="I Chronicles"
  [ii-chronicles]="II Chronicles"
  [ezra]="Ezra"
  [nehemiah]="Nehemiah"
  [esther]="Esther"
  [job]="Job"
  [psalms]="Psalms"
  [proverbs]="Proverbs"
  [ecclesiastes]="Ecclesiastes"
  [song-of-solomon]="Song of Solomon"
  [isaiah]="Isaiah"
  [jeremiah]="Jeremiah"
  [lamentations]="Lamentations"
  [ezekiel]="Ezekiel"
  [daniel]="Daniel"
  [hosea]="Hosea"
  [joel]="Joel"
  [amos]="Amos"
  [obadiah]="Obadiah"
  [jonah]="Jonah"
  [micah]="Micah"
  [nahum]="Nahum"
  [habakkuk]="Habakkuk"
  [zephaniah]="Zephaniah"
  [haggai]="Haggai"
  [zechariah]="Zechariah"
  [malachi]="Malachi"
)

# Chapter counts
declare -A COUNTS=(
  [genesis]=50
  [exodus]=40
  [leviticus]=27
  [numbers]=36
  [deuteronomy]=34
  [joshua]=24
  [judges]=21
  [ruth]=4
  [i-samuel]=31
  [ii-samuel]=24
  [i-kings]=22
  [ii-kings]=25
  [i-chronicles]=29
  [ii-chronicles]=36
  [ezra]=10
  [nehemiah]=13
  [esther]=10
  [job]=42
  [psalms]=150
  [proverbs]=31
  [ecclesiastes]=12
  [song-of-solomon]=8
  [isaiah]=66
  [jeremiah]=52
  [lamentations]=5
  [ezekiel]=48
  [daniel]=12
  [hosea]=14
  [joel]=3
  [amos]=9
  [obadiah]=1
  [jonah]=4
  [micah]=7
  [nahum]=3
  [habakkuk]=3
  [zephaniah]=3
  [haggai]=2
  [zechariah]=14
  [malachi]=4
)

mkdir -p tanakh

write_page () {
  local slug="$1" title="$2" total="$3"
  cat > "tanakh/${slug}.html" <<HTML
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title} — Chapters</title><link rel="stylesheet" href="/israelite-research/styles.css"/><style>
:root{--ink:#0b2340;--accent:#F17300;--brand:#054A91;--muted:#6b7280;--sky:#DBE4EE;--white:#fff}
.container{max-width:1200px;margin:0 auto;padding:0 16px}
.page-header{padding:24px 0 8px}.page-title{margin:0;font-size:2rem;font-weight:800;color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:10px;margin:16px 0 36px}
.ch{display:flex;align-items:center;justify-content:center;height:56px;border:1px solid var(--sky);background:var(--white);text-decoration:none;color:var(--brand);font-weight:800}
.ch:hover{box-shadow:0 4px 10px rgba(0,0,0,.06);transform:translateY(-1px)}
.breadcrumb{color:var(--muted);font-size:.9rem;margin-top:6px}
</style></head><body>
<div id="site-header"></div>
<main><header class="page-header"><div class="container"><h1 class="page-title">${title}</h1><div class="breadcrumb">Tanakh → ${title}</div></div></header>
<section class="container"><div id="chapGrid" class="grid"></div></section></main>
<div id="site-footer"></div><script src="/israelite-research/js/include.js"></script>
<script>
const book='${slug}',total=${total};
const g=document.getElementById('chapGrid');
for(let i=1;i<=total;i++){
  const a=document.createElement('a');
  a.href=\`/israelite-research/tanakh/chapter.html?book=\${book}&ch=\${i}\`;
  a.className='ch';
  a.textContent=i;
  g.appendChild(a);
}
</script><script src="/israelite-research/js/wire-chapter-cards.js"></script>
</body></html>
HTML
}

for slug in "${!TITLES[@]}"; do
  write_page "$slug" "${TITLES[$slug]}" "${COUNTS[$slug]}"
done

echo "Rebuilt Tanakh book HTMLs."
