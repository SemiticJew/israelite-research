#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_MANIFEST_FIELDS = [
    "name",
    "short_name",
    "description",
    "id",
    "start_url",
    "scope",
    "display",
    "background_color",
    "theme_color",
    "icons",
]

REQUIRED_FILES = [
    "site.webmanifest",
    "offline.html",
    "sw.js",
    "app.html",
    "favicon.ico",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "apple-touch-icon.png",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
]

REQUIRED_CACHE_ENTRIES = [
    "/offline.html",
    "/app.html",
    "/site.webmanifest",
    "/apple-touch-icon.png",
    "/android-chrome-192x192.png",
    "/android-chrome-512x512.png",
]

REQUIRED_HEAD_LINKS = [
    'rel="manifest"',
    'rel="apple-touch-icon"',
    'name="theme-color"',
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
]

def fail(message):
    print(f"FAIL: {message}")
    return False

def ok(message):
    print(f"OK: {message}")
    return True

def main():
    passed = True

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if path.exists():
            ok(f"{rel} exists")
        else:
            passed = fail(f"{rel} missing") and passed

    manifest_path = ROOT / "site.webmanifest"
    try:
        manifest = json.loads(manifest_path.read_text())
        ok("site.webmanifest is valid JSON")
    except Exception as error:
        fail(f"site.webmanifest is invalid JSON: {error}")
        sys.exit(1)

    for field in REQUIRED_MANIFEST_FIELDS:
        if manifest.get(field):
            ok(f"manifest field present: {field}")
        else:
            passed = fail(f"manifest field missing: {field}") and passed

    icons = manifest.get("icons", [])
    icon_sources = {icon.get("src") for icon in icons}
    for src in ["/android-chrome-192x192.png", "/android-chrome-512x512.png", "/apple-touch-icon.png"]:
        if src in icon_sources:
            ok(f"manifest icon present: {src}")
        else:
            passed = fail(f"manifest icon missing: {src}") and passed

    maskable_icons = [
        icon for icon in icons
        if "maskable" in str(icon.get("purpose", ""))
    ]
    if maskable_icons:
        ok("manifest includes maskable icon support")
    else:
        passed = fail("manifest has no maskable icon support") and passed

    for page_name in ["index.html", "app.html", "offline.html"]:
        page = (ROOT / page_name).read_text()
        for needle in REQUIRED_HEAD_LINKS:
            if needle in page:
                ok(f"{page_name} includes {needle}")
            else:
                passed = fail(f"{page_name} missing {needle}") and passed

    sw = (ROOT / "sw.js").read_text()

    version_match = re.search(r"const CACHE_VERSION = '([^']+)';", sw)
    if version_match:
        ok(f"service worker cache version: {version_match.group(1)}")
    else:
        passed = fail("service worker cache version missing") and passed

    for entry in REQUIRED_CACHE_ENTRIES:
        if entry in sw:
            ok(f"service worker caches {entry}")
        else:
            passed = fail(f"service worker missing cache entry {entry}") and passed

    if "caches.match('/offline.html')" in sw:
        ok("service worker has offline fallback")
    else:
        passed = fail("service worker offline fallback missing") and passed

    if passed:
        print("\nPWA READINESS CHECK PASSED")
        sys.exit(0)

    print("\nPWA READINESS CHECK FAILED")
    sys.exit(1)

if __name__ == "__main__":
    main()
