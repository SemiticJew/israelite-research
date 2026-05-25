from __future__ import annotations

import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = "UC6ukYTYZ8YqsSYq4-nl11gA"
FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
OUT_PATH = Path("data/youtube-videos.json")

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}

def text(node, path, default=""):
    found = node.find(path, NS)
    return found.text.strip() if found is not None and found.text else default

def attr(node, path, name, default=""):
    found = node.find(path, NS)
    return found.attrib.get(name, default) if found is not None else default

def fetch_xml(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "SemiticJew.org YouTube RSS Fetcher"
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()

def main():
    try:
        raw = fetch_xml(FEED_URL)
    except Exception as e:
        if OUT_PATH.exists():
            print(f"YouTube feed unavailable; keeping existing {OUT_PATH}: {e}")
            return
        payload = {
            "source": FEED_URL,
            "channel_id": CHANNEL_ID,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "videos": [],
        }
        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"YouTube feed unavailable; wrote empty fallback to {OUT_PATH}: {e}")
        return

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

    payload = {
        "source": FEED_URL,
        "channel_id": CHANNEL_ID,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "videos": videos[:12],
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(payload['videos'])} videos to {OUT_PATH}")

if __name__ == "__main__":
    main()
