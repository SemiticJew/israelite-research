from __future__ import annotations

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

HANDLE_URL = "https://www.youtube.com/@blksemitic"
CHANNEL_HANDLE = "@blksemitic"
OUT_PATH = Path("data/youtube-videos.json")

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}

def fetch_text(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 SemiticJew.org YouTube RSS Fetcher"
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")

def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 SemiticJew.org YouTube RSS Fetcher"
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()

def resolve_channel_id() -> str:
    html = fetch_text(HANDLE_URL)

    patterns = [
        r'"channelId":"(UC[^"]+)"',
        r'"externalId":"(UC[^"]+)"',
        r'<meta itemprop="channelId" content="(UC[^"]+)">',
        r'https://www\.youtube\.com/channel/(UC[^"/?]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            return match.group(1)

    raise RuntimeError(f"Unable to resolve channel ID from {HANDLE_URL}")

def text(node, path, default=""):
    found = node.find(path, NS)
    return found.text.strip() if found is not None and found.text else default

def attr(node, path, name, default=""):
    found = node.find(path, NS)
    return found.attrib.get(name, default) if found is not None else default

def parse_feed(raw: bytes, feed_url: str, channel_id: str):
    root = ET.fromstring(raw)

    videos = []
    for entry in root.findall("atom:entry", NS):
        video_id = text(entry, "yt:videoId")
        title = text(entry, "atom:title")
        link = ""

        link_el = entry.find("atom:link", NS)
        if link_el is not None:
            link = link_el.attrib.get("href", "")

        published = text(entry, "atom:published")
        updated = text(entry, "atom:updated")
        description = text(entry, "media:group/media:description")
        thumbnail = attr(entry, "media:group/media:thumbnail", "url")
        channel = text(entry, "atom:author/atom:name", "Semitic Jew")

        if not video_id:
            continue

        videos.append({
            "id": video_id,
            "title": title,
            "url": link or f"https://www.youtube.com/watch?v={video_id}",
            "embed": f"https://www.youtube-nocookie.com/embed/{video_id}?rel=0&modestbranding=1",
            "thumbnail": thumbnail or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "published": published,
            "updated": updated,
            "channel": channel,
            "description": description,
        })

    return {
        "source": feed_url,
        "channel_handle": CHANNEL_HANDLE,
        "channel_url": HANDLE_URL,
        "channel_id": channel_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "videos": videos[:12],
    }

def write_payload(payload):
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def main():
    try:
        channel_id = resolve_channel_id()
        feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        raw = fetch_bytes(feed_url)
        payload = parse_feed(raw, feed_url, channel_id)
        write_payload(payload)
        print(f"Wrote {len(payload['videos'])} videos to {OUT_PATH}")
    except Exception as e:
        if OUT_PATH.exists():
            print(f"YouTube feed unavailable; keeping existing {OUT_PATH}: {e}")
            return

        payload = {
            "source": HANDLE_URL,
            "channel_handle": CHANNEL_HANDLE,
            "channel_url": HANDLE_URL,
            "channel_id": "",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "videos": [],
        }
        write_payload(payload)
        print(f"YouTube feed unavailable; wrote empty fallback to {OUT_PATH}: {e}")

if __name__ == "__main__":
    main()
