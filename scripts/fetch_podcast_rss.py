#!/usr/bin/env python3
"""Cache the Semitic Jew podcast RSS (the feed Spotify and Apple Podcasts use) for the website.

    python3 scripts/fetch_podcast_rss.py

Writes data/podcast-episodes.json, read by js/media-page.js for the on-site audio player.
Run every 6 hours by .github/workflows/youtube-feed.yml. Only real items from the feed are written;
if the feed can't be fetched or parsed, the existing file is left untouched.

The mobile app's feed (tools/update_app_content_feed.py, Acast) is separate and unchanged; see
docs/podcast-feed-migration.md.
"""
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

# Verified 2026-11-24: Apple Podcasts lookup (id 1693178004) lists this as the show's feedUrl.
RSS_URL = "https://anchor.fm/s/d92a4020/podcast/rss"
OUT = Path("data/podcast-episodes.json")
ITUNES = "{http://www.itunes.com/dtds/podcast-1.0.dtd}"
LIMIT = 12
AUDIO_HOSTS = re.compile(r"^https://(anchor\.fm|[a-z0-9.-]+\.cloudfront\.net|[a-z0-9.-]+\.podcasters\.spotify\.com)/")


def clean(html_text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html_text or "")
    return re.sub(r"\s+", " ", unescape(text)).strip()


def iso(date_text: str) -> str:
    try:
        return parsedate_to_datetime(date_text).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError):
        return ""


def parse(raw: bytes) -> list[dict]:
    channel = ET.fromstring(raw).find("channel")
    if channel is None:
        raise ValueError("RSS has no <channel>")
    episodes = []
    for item in channel.findall("item"):
        enclosure = item.find("enclosure")
        audio = enclosure.get("url", "") if enclosure is not None else ""
        title = clean(item.findtext("title"))
        published = iso(item.findtext("pubDate") or "")
        if not (title and published and AUDIO_HOSTS.match(audio)):
            continue
        episodes.append({
            "id": clean(item.findtext("guid")) or audio,
            "title": title,
            "published": published,
            "duration": clean(item.findtext(f"{ITUNES}duration")),
            "audio": audio,
            "audioType": enclosure.get("type", "audio/mpeg") if enclosure is not None else "audio/mpeg",
            "link": clean(item.findtext("link")),
            "description": clean(item.findtext("description"))[:600],
        })
    episodes.sort(key=lambda e: e["published"], reverse=True)
    return episodes[:LIMIT]


def main() -> int:
    try:
        req = urllib.request.Request(RSS_URL, headers={"User-Agent": "semiticjew.org podcast feed cache"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            episodes = parse(resp.read())
    except Exception as exc:  # network or parse failure: keep the last good file
        print(f"Podcast RSS not updated: {exc}")
        return 0
    if not episodes:
        print("Podcast RSS had no usable episodes; keeping the existing file.")
        return 0
    payload = {"source": RSS_URL, "updated_at": datetime.now(timezone.utc).isoformat(), "episodes": episodes}
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(episodes)} episodes to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
