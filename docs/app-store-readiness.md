# Semitic Jew App Store Readiness

This app is a PWA-first Bible study shell. Use this checklist before future TWA, Capacitor, iOS, or Android packaging work.

## Current PWA status

- `app.html` is the install entry point.
- `site.webmanifest` points to `/app.html` with standalone display.
- `sw.js` caches the app shell and key study assets.
- Offline behavior is limited to cached shell assets, saved local data, and any chapters/search data the browser or service worker has already cached.

## What still needs review before store packaging

- App store screenshots for phone and tablet.
- A production privacy policy URL.
- Review whether `website-app.html` should remain the primary install guide or be replaced with a store-specific landing page.
- Confirm icon cropping and maskable appearance across Android launchers.
- Decide whether a native wrapper should preserve the current offline caching model or use its own asset bundle.

## Future wrapper notes

- Capacitor or TWA can wrap the existing web app without rewriting the study logic.
- Keep `/app.html` as the canonical in-app route.
- Verify service worker behavior inside the wrapper early; don’t assume the wrapper will behave like Chrome on the open web.

## Release checklist

- Verify manifest, icons, and start URL.
- Verify onboarding, reader, search, study paths, saved library, and study chain flows.
- Verify offline fallback states on a clean device.
- Verify accessibility labels and modal dismissal.
- Verify local storage clearing behavior is documented.

