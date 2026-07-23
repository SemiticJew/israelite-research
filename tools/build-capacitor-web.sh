#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/capacitor-www"

rm -rf "$OUT"
mkdir -p "$OUT"

find "$ROOT" -maxdepth 1 -type f \( \
  -name "*.html" -o \
  -name "*.css" -o \
  -name "*.js" -o \
  -name "*.json" -o \
  -name "*.webmanifest" -o \
  -name "*.ico" -o \
  -name "*.png" -o \
  -name "*.svg" -o \
  -name "*.txt" -o \
  -name "*.xml" \
\) \
  ! -name "package.json" \
  ! -name "package-lock.json" \
  ! -name "*.tmp" \
  -exec cp {} "$OUT/" \;

for dir in assets css data images js partials articles tanakh newtestament apocrypha fonts icons media; do
  if [ -d "$ROOT/$dir" ]; then
    rsync -a \
      --exclude ".DS_Store" \
      --exclude "node_modules" \
      --exclude "update_author_archive_and_modal.py" \
      "$ROOT/$dir/" "$OUT/$dir/"
  fi
done

if [ ! -f "$OUT/app.html" ]; then
  echo "ERROR: app.html was not copied into capacitor-www"
  exit 1
fi

cp "$OUT/app.html" "$OUT/index.html"

mkdir -p "$OUT/js"

cat > "$OUT/js/capacitor-native-shell.js" <<'JS'
(() => {
  const isNativeShell =
    Boolean(window.Capacitor) ||
    location.protocol === "capacitor:" ||
    location.hostname === "localhost";

  if (!isNativeShell) return;

  function allowed(href) {
    if (!href || href.startsWith("#")) return true;

    const value = href.trim().toLowerCase();

    if (
      value.startsWith("mailto:") ||
      value.startsWith("tel:") ||
      value.startsWith("sms:")
    ) {
      return true;
    }

    try {
      const url = new URL(href, location.href);
      const isSemiticJewArticle =
        /^(www\.)?semiticjew\.org$/i.test(url.hostname) &&
        url.pathname.startsWith("/articles/");

      return (
        isSemiticJewArticle ||
        url.protocol === "capacitor:" ||
        url.protocol === "file:" ||
        url.hostname === location.hostname ||
        url.hostname === "localhost"
      );
    } catch {
      return false;
    }
  }

  function showNotice() {
    let notice = document.querySelector("[data-native-shell-notice]");

    if (!notice) {
      notice = document.createElement("div");
      notice.setAttribute("data-native-shell-notice", "true");
      notice.setAttribute("role", "status");
      notice.textContent =
        "External browsing is disabled in the Semitic Jew Institute app.";

      Object.assign(notice.style, {
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "18px",
        zIndex: "2147483647",
        padding: "12px 14px",
        borderRadius: "14px",
        background: "rgba(5, 74, 145, 0.96)",
        color: "#fff",
        font: "600 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        boxShadow: "0 16px 40px rgba(0,0,0,.25)"
      });

      document.body.appendChild(notice);
    }

    clearTimeout(window.__sjNativeNoticeTimer);
    window.__sjNativeNoticeTimer = setTimeout(() => notice.remove(), 3200);
  }

  const originalOpen = window.open;

  window.open = function guardedWindowOpen(url, target, features) {
    if (url && !allowed(String(url))) {
      showNotice();
      return null;
    }

    return originalOpen.call(window, url, target, features);
  };

  document.addEventListener(
    "click",
    event => {
      const anchor = event.target.closest && event.target.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");

      if (allowed(href)) {
        if (anchor.target === "_blank") {
          event.preventDefault();
          location.href = new URL(href, location.href).href;
        }

        return;
      }

      event.preventDefault();
      event.stopPropagation();
      showNotice();
    },
    true
  );
})();
JS

if [ -f "$OUT/js/include.js" ]; then
  perl -0pi -e 's#https://www\.googletagmanager\.com/gtag/js\?id=G-32TJCG51NH#about:blank#mg' "$OUT/js/include.js"
fi

while IFS= read -r -d '' html; do
  if ! grep -q "capacitor-native-shell.js" "$html"; then
    perl -0pi -e 's#</head>#  <script src="/js/capacitor-native-shell.js" defer></script>\n</head>#i' "$html"
  fi
done < <(find "$OUT" -type f -name "*.html" -print0)

echo "Built Capacitor web bundle at capacitor-www"

printf 'Normalizing generated Capacitor text whitespace...\n'
find "$OUT" -type f \( \
  -name "*.html" -o \
  -name "*.css" -o \
  -name "*.js" -o \
  -name "*.json" -o \
  -name "*.webmanifest" -o \
  -name "*.xml" -o \
  -name "*.tei.xml" -o \
  -name "*.svg" -o \
  -name "*.txt" -o \
  -name "*.rtf" -o \
  -name "*.ics" -o \
  -name "*.csv" -o \
  -name "*.tsv" \
\) -print0 | xargs -0 perl -pi -e 's/\r$//; s/[ \t]+$//; s/^ +(\t+)/$1/'
