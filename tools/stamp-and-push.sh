#!/bin/bash
# Cache-bust core assets and trigger GitHub Pages rebuild

cd "$(dirname "$0")/.."

V="v=$(date +%Y%m%d%H%M%S)"

# Cache-bust styles and scripts in articles
for FILE in articles/*.html; do
  sed -i '' -e "s|/styles.css\\([\"']\\)|/styles.css?$V\\1|" "$FILE"
  sed -i '' -e "s|/js/xref-hover.js\\([\"']\\)|/js/xref-hover.js?$V\\1|" "$FILE"
  sed -i '' -e "s|/js/citations.js\\([\"']\\)|/js/citations.js?$V\\1|" "$FILE"
done

git add articles/*.html
git commit -m "chore: cache-bust CSS/JS on articles ($V)" || true
git commit --allow-empty -m "chore: trigger GitHub Pages rebuild"
git push
