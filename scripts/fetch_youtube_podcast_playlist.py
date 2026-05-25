from __future__ import annotations

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

PLAYLIST_ID = "PLvFSorNtgHVC_PKawdta23O5AfMIEcpd1"
PLAYLIST_URL = f"https://www.youtube.com/playlist?list={PLAYLIST_ID}"
RSS_URL = f"https://www.youtube.com/feeds/videos.xml?playlist_id={PLAYLIST_ID}"
OUT_PATH = Path("data/youtube-podcast-videos.json")

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}

def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 SemiticJew.org Podcast Playlist Fetcher"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()

def text(node, path, default=""):
    found = node.find(path, NS)
    return found.text.strip() if found is not None and found.text else default

def attr(node, path, name, default=""):
    found = node.find(path, NS)
    return found.attrib.get(name, default) if found is not None else default

def video_payload(video_id, title="", description="", published="", updated="", channel="Semitic Jew"):
    return {
        "id": video_id,
        "title": title or "Semitic Jew Podcast",
        "url": f"https://www.youtube.com/watch?v={video_id}&list={PLAYLIST_ID}",
        "embed": f"https://www.youtube-nocookie.com/embed/{video_id}?rel=0&modestbranding=1",
        "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        "published": published,
        "updated": updated,
        "channel": channel,
        "description": description,
    }

def parse_rss(raw: bytes):
    root = ET.fromstring(raw)
    videos = []

    for entry in root.findall("atom:entry", NS):
        video_id = text(entry, "yt:videoId")
        if not video_id:
            continue

        videos.append(video_payload(
            video_id=video_id,
            title=text(entry, "atom:title"),
            description=text(entry, "media:group/media:description"),
            published=text(entry, "atom:published"),
            updated=text(entry, "atom:updated"),
            channel=text(entry, "atom:author/atom:name", "Semitic Jew"),
        ))

    return videos

def parse_playlist_page(raw: bytes):
    html = raw.decode("utf-8", errors="ignore")

    ids = []
    seen = set()

    for match in re.finditer(r'"videoId":"([a-zA-Z0-9_-]{11})"', html):
        video_id = match.group(1)
        if video_id not in seen:
            seen.add(video_id)
            ids.append(video_id)

    videos = []
    for video_id in ids[:12]:
        title = ""
        near = html[max(0, html.find(video_id) - 1200): html.find(video_id) + 2200]
        title_match = re.search(r'"title":\{"runs":\[\{"text":"([^"]+)"\}\]', near)
        if title_match:
            title = title_match.group(1).encode("utf-8").decode("unicode_escape", errors="ignore")

        videos.append(video_payload(video_id=video_id, title=title))

    return videos

def write(videos):
    payload = {
        "source": PLAYLIST_URL,
        "rss": RSS_URL,
        "playlist_id": PLAYLIST_ID,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "videos": videos[:12],
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(payload['videos'])} podcast videos to {OUT_PATH}")

def main():
    try:
        videos = parse_rss(fetch(RSS_URL))
        if videos:
            write(videos)
            return
    except Exception as e:
        print(f"RSS unavailable, trying playlist page: {e}")

    try:
        videos = parse_playlist_page(fetch(PLAYLIST_URL))
        if videos:
            write(videos)
            return
    except Exception as e:
        print(f"Playlist page unavailable: {e}")

    if OUT_PATH.exists():
        print(f"Podcast playlist unavailable; keeping existing {OUT_PATH}")
        return

    write([])

if __name__ == "__main__":
    main()
