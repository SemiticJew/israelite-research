#!/usr/bin/env bash
set -euo pipefail

# Titles (with proper Roman numerals)
declare -A TITLES=(
  [matthew]="Matthew"
  [mark]="Mark"
  [luke]="Luke"
  [john]="John"
  [acts]="Acts"
  [romans]="Romans"
  [i-corinthians]="I Corinthians"
  [ii-corinthians]="II Corinthians"
  [galatians]="Galatians"
  [ephesians]="Ephesians"
  [philippians]="Philippians"
  [colossians]="Colossians"
  [i-thessalonians]="I Thessalonians"
  [ii-thessalonians]="II Thessalonians"
  [i-timothy]="I Timothy"
  [ii-timothy]="II Timothy"
  [titus]="Titus"
  [philemon]="Philemon"
  [hebrews]="Hebrews"
  [james]="James"
  [i-peter]="I Peter"
  [ii-peter]="II Peter"
  [i-john]="I John"
  [ii-john]="II John"
  [iii-john]="III John"
  [jude]="Jude"
  [revelation]="Revelation"
)

# Chapter counts
declare -A COUNTS=(
  [matthew]=28
  [mark]=16
  [luke]=24
  [john]=21
  [acts]=28
  [romans]=16
  [i-corinthians]=16
  [ii-corinthians]=13
  [galatians]=6
  [ephesians]=6
  [philippians]=4
  [colossians]=4
  [i-thessalonians]=5
  [ii-thessalonians]=3
  [i-timothy]=6
  [ii-timothy]=4
  [titus]=3
  [philemon]=1
  [hebrews]=13
  [james]=5
  [i-peter]=5
  [ii-peter]=3
  [i-john]=5
  [ii-john]=1
  [iii-john]=1
  [jude]=1
  [revelation]=22
)

mkdir -p newtestament

write_page () {
  local slug="$1" title="$2" total="$3"
  cat > "newtestament/${slug}.html" <<HTML
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
<main><header class="page-header"><div class="container"><h1 class="page-title">${title}</h1><div class="breadcrumb">New Testament → ${title}</div></div></header>
<section class="container"><div id="chapGrid" class="grid"></div></section></main>
<div id="site-footer"></div><script src="/israelite-research/js/include.js"></script>
<script>
const book='${slug}',total=${total};
const g=document.getElementById('chapGrid');
for(let i=1;i<=total;i++){
  const a=document.createElement('a');
  a.href=\`/israelite-research/newtestament/chapter.html?book=\${book}&ch=\${i}\`;
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

echo "Rebuilt NT book HTMLs with uniform style."
