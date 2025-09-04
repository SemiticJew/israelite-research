#!/usr/bin/env sh
set -eu

mkdir -p newtestament

gen_page() {
  slug="$1"; title="$2"; total="$3"
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

# slug|Title|Chapters
cat <<'LIST' | while IFS='|' read -r slug title total; do
matthew|Matthew|28
mark|Mark|16
luke|Luke|24
john|John|21
acts|Acts|28
romans|Romans|16
i-corinthians|I Corinthians|16
ii-corinthians|II Corinthians|13
galatians|Galatians|6
ephesians|Ephesians|6
philippians|Philippians|4
colossians|Colossians|4
i-thessalonians|I Thessalonians|5
ii-thessalonians|II Thessalonians|3
i-timothy|I Timothy|6
ii-timothy|II Timothy|4
titus|Titus|3
philemon|Philemon|1
hebrews|Hebrews|13
james|James|5
i-peter|I Peter|5
ii-peter|II Peter|3
i-john|I John|5
ii-john|II John|1
iii-john|III John|1
jude|Jude|1
revelation|Revelation|22
LIST
do
  gen_page "$slug" "$title" "$total"
done

echo "Rebuilt NT HTML pages (POSIX)."
