# Podcast feed: proposed switch from Acast to Anchor (pending approval)

**Status:** documented only. Nothing in the app integration has been changed. Approval is required before
switching, because the mobile app reads the result.

## Current state (verified 2026-11-24)

| Source | URL | Content |
|---|---|---|
| Feed the app reads today (`PODCAST_RSS_URL` in `tools/update_app_content_feed.py`) | `https://feeds.acast.com/public/shows/semitic-jew` | 1 episode: “Semitic Jew Trailer” (July 2023) |
| Live podcast feed (the feed Apple Podcasts and Spotify use) | `https://anchor.fm/s/d92a4020/podcast/rss` | 48 episodes, latest Nov 20, 2026 |
| YouTube podcast playlist (used by `/media.html` and `/publications.html`) | `https://www.youtube.com/playlist?list=PLvFSorNtgHVC_PKawdta23O5AfMIEcpd1` | refreshed every 6 h by `.github/workflows/youtube-feed.yml` |

The Anchor feed was confirmed through Apple’s public lookup (`https://itunes.apple.com/lookup?id=1693178004` → `feedUrl`).
The same show is linked from the website’s “Follow on Spotify / Apple Podcasts” buttons:

- Spotify: `https://open.spotify.com/show/0GvSSHiBeVAmvHMIXP6lOi`
- Apple Podcasts: `https://podcasts.apple.com/us/podcast/semitic-jew/id1693178004`

On those platforms the show is titled “Israel Restored” (publisher “A Jew”). The website keeps the Semitic Jew
branding: the buttons don’t display the platform title, and no platform player is embedded.

## Effect of the switch

- `data/app/content-feed.json` → `podcasts` would go from 1 item (the 2023 trailer) to the live episodes.
- Episode titles, descriptions and artwork shown in the app would come from Anchor and carry the platform
  show’s naming. Review that branding in the app before switching.

## How to switch (after approval)

1. In `tools/update_app_content_feed.py`, change `PODCAST_RSS_URL` to `https://anchor.fm/s/d92a4020/podcast/rss`
   (or pass `--rss-url` in `.github/workflows/update-app-content-feed.yml` to try it first).
2. Run `python3 tools/update_app_content_feed.py` locally and review the `podcasts` entries in `data/app/content-feed.json`.
3. Check the app’s podcast screen before merging.
