#!/usr/bin/env python3
"""Regenerate the Semitic Jew app content feed.

Uses only Python standard-library modules so it can run in GitHub Actions
without extra dependencies.
"""

from __future__ import annotations

import argparse
import email.utils
import html
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
ARTICLES_INDEX = ROOT / "articles.html"
ARTICLES_DIR = ROOT / "articles"
LINE_UPON_LINE_PATH = ROOT / "data/app/line-upon-line.json"
CONTENT_FEED_PATH = ROOT / "data/app/content-feed.json"
PRODUCTION_ORIGIN = "https://semiticjew.org"
PODCAST_RSS_URL = "https://feeds.acast.com/public/shows/semitic-jew"
SCHEMA_VERSION = 1
MAX_PODCAST_EPISODES = 50


def clean_text(value: Any) -> str:
    text = html.unescape(str(value or ""))
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def strip_html(value: Any) -> str:
    return clean_text(value)


def utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def normalize_date(value: str) -> str:
    raw = clean_text(value)
    if not raw:
        return ""
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return f"{raw}T00:00:00Z"
    normalized = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        try:
            parsed = email.utils.parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            return raw
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return (
        parsed.astimezone(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def sort_key(item: dict[str, Any]) -> tuple[int, str]:
    date = item.get("publishedAt") or ""
    try:
        timestamp = int(
            datetime.fromisoformat(date.replace("Z", "+00:00")).timestamp()
        )
    except ValueError:
        timestamp = 0
    return (timestamp, item.get("id", ""))


def production_url(value: str) -> str:
    path = clean_text(value)
    if not path:
        return ""
    if path.startswith("https://"):
        return path
    if path.startswith("http://"):
        return ""
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{PRODUCTION_ORIGIN}{path}"


def stable_slug_from_path(path: str) -> str:
    return Path(path).stem.strip().lower()


class ArticleIndexParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        values = dict(attrs)
        href = clean_text(values.get("href"))
        if not href.startswith("/articles/") or not href.endswith(".html"):
            return
        if href.endswith("/article-template.html") or "template" in href:
            return
        if href not in self.links:
            self.links.append(href)


class ArticlePageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.metas: dict[str, str] = {}
        self.title_text = ""
        self.byline_text = ""
        self.published_time = ""
        self.in_title = False
        self.in_byline = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        tag = tag.lower()
        if tag == "meta":
            key = clean_text(values.get("property") or values.get("name"))
            content = clean_text(values.get("content"))
            if key and content:
                self.metas[key] = content
        elif tag == "link" and values.get("rel") == "canonical":
            href = clean_text(values.get("href"))
            if href:
                self.metas["canonical"] = href
        elif tag in {"h1", "h2"} and "article-title" in clean_text(values.get("class")):
            self.in_title = True
        elif tag == "span" and "byline-name" in clean_text(values.get("class")):
            self.in_byline = True
        elif tag == "time":
            published = clean_text(values.get("datetime"))
            if published and not self.published_time:
                self.published_time = published

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"h1", "h2"}:
            self.in_title = False
        elif tag.lower() == "span":
            self.in_byline = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_text += data
        if self.in_byline:
            self.byline_text += data


def load_existing_feed() -> dict[str, Any]:
    try:
        with CONTENT_FEED_PATH.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if isinstance(payload, dict) and payload.get("schemaVersion") == SCHEMA_VERSION:
            return payload
    except FileNotFoundError:
        pass
    except (json.JSONDecodeError, OSError) as error:
        print(f"Warning: could not read existing content feed: {error}", file=sys.stderr)
    return {"schemaVersion": SCHEMA_VERSION, "articles": [], "podcasts": [], "lessons": []}


def parse_article_page(path: Path, href: str) -> dict[str, Any] | None:
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except OSError as error:
        print(f"Warning: could not read article {path}: {error}", file=sys.stderr)
        return None

    parser = ArticlePageParser()
    parser.feed(source)
    title = clean_text(parser.title_text or parser.metas.get("og:title"))
    article_url = production_url(parser.metas.get("canonical") or href)
    if not title or not article_url:
        return None
    if "ARTICLE_TITLE" in title:
        return None

    return {
        "id": stable_slug_from_path(href),
        "title": title,
        "excerpt": clean_text(
            parser.metas.get("og:description") or parser.metas.get("description")
        ),
        "author": clean_text(parser.byline_text) or "Semitic Jew",
        "publishedAt": normalize_date(
            parser.metas.get("article:published_time", "") or parser.published_time
        ),
        "imageUrl": production_url(parser.metas.get("og:image", "")),
        "articleUrl": article_url,
    }


def load_articles() -> list[dict[str, Any]]:
    parser = ArticleIndexParser()
    parser.feed(ARTICLES_INDEX.read_text(encoding="utf-8", errors="replace"))
    articles: list[dict[str, Any]] = []
    for href in parser.links:
        path = ROOT / href.lstrip("/")
        if not path.is_file():
            continue
        article = parse_article_page(path, href)
        if article:
            articles.append(article)
    return articles


def rss_child_text(item: ElementTree.Element, names: list[str]) -> str:
    for name in names:
        child = item.find(name)
        if child is not None and child.text:
            return clean_text(child.text)
    for child in list(item):
        local = child.tag.split("}")[-1]
        if local in names and child.text:
            return clean_text(child.text)
    return ""


def rss_child_attr(item: ElementTree.Element, local_name: str, attr: str) -> str:
    for child in list(item):
        if child.tag.split("}")[-1] == local_name:
            return clean_text(child.attrib.get(attr, ""))
    return ""


def parse_podcasts_from_rss(xml_text: str) -> list[dict[str, Any]]:
    root = ElementTree.fromstring(xml_text)
    channel = root.find("channel")
    if channel is None:
        return []
    channel_image = ""
    image = channel.find("image")
    if image is not None:
        image_url = image.find("url")
        if image_url is not None and image_url.text:
            channel_image = clean_text(image_url.text)
    if not channel_image:
        channel_image = rss_child_attr(channel, "image", "href")

    episodes: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in channel.findall("item"):
        enclosure = item.find("enclosure")
        audio_url = clean_text(enclosure.attrib.get("url", "")) if enclosure is not None else ""
        if not audio_url.startswith("https://"):
            continue
        guid = rss_child_text(item, ["guid"])
        title = rss_child_text(item, ["title"])
        if not title:
            continue
        episode_id = re.sub(r"[^a-zA-Z0-9._:-]+", "-", guid or audio_url).strip("-")
        if not episode_id or episode_id in seen:
            continue
        seen.add(episode_id)
        image_url = rss_child_attr(item, "image", "href") or channel_image
        episodes.append(
            {
                "id": episode_id,
                "title": title,
                "description": strip_html(
                    rss_child_text(item, ["description", "summary"])
                ),
                "publishedAt": normalize_date(rss_child_text(item, ["pubDate"])),
                "duration": rss_child_text(item, ["duration"]),
                "imageUrl": image_url if image_url.startswith("https://") else "",
                "audioUrl": audio_url,
                "episodeUrl": production_or_https(
                    rss_child_text(item, ["link"])
                ),
            }
        )
    return sorted(episodes, key=sort_key, reverse=True)[:MAX_PODCAST_EPISODES]


def production_or_https(value: str) -> str:
    url = clean_text(value)
    return url if url.startswith("https://") else ""


def fetch_podcasts(rss_url: str) -> list[dict[str, Any]]:
    request = urllib.request.Request(
        rss_url,
        headers={"User-Agent": "SemiticJewContentFeed/1.0"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return parse_podcasts_from_rss(response.read().decode("utf-8", errors="replace"))


def load_lessons() -> list[dict[str, Any]]:
    with LINE_UPON_LINE_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if payload.get("schemaVersion") != SCHEMA_VERSION or not isinstance(
        payload.get("lessons"), list
    ):
        raise ValueError("Invalid line-upon-line metadata schema.")

    lessons: list[dict[str, Any]] = []
    seen: set[str] = set()
    for lesson in payload["lessons"]:
        lesson_id = clean_text(lesson.get("id"))
        if not lesson_id or lesson_id in seen:
            continue
        record = {
            "id": lesson_id,
            "reference": clean_text(lesson.get("reference")),
            "title": clean_text(lesson.get("title")),
            "description": clean_text(lesson.get("description")),
            "publishedAt": normalize_date(lesson.get("publishedAt", "")),
            "duration": clean_text(lesson.get("duration")),
            "posterUrl": clean_text(lesson.get("posterUrl")),
            "videoUrl": clean_text(lesson.get("videoUrl")),
        }
        if not all([record["reference"], record["title"], record["posterUrl"], record["videoUrl"]]):
            continue
        seen.add(lesson_id)
        lessons.append(record)
    return sorted(lessons, key=sort_key, reverse=True)


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=str(path.parent),
        delete=False,
    ) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temp_name = handle.name
    os.replace(temp_name, path)


def build_feed(args: argparse.Namespace) -> dict[str, Any]:
    existing = load_existing_feed()
    warnings: list[str] = []

    try:
        articles = load_articles()
    except Exception as error:  # noqa: BLE001 - source isolation is intentional
        warnings.append(f"article source failed; preserving existing articles: {error}")
        articles = existing.get("articles", [])

    try:
        lessons = load_lessons()
    except Exception as error:  # noqa: BLE001
        warnings.append(f"lesson source failed; preserving existing lessons: {error}")
        lessons = existing.get("lessons", [])

    rss_url = args.rss_url or os.environ.get("SJ_PODCAST_RSS_URL") or PODCAST_RSS_URL
    try:
        podcasts = fetch_podcasts(rss_url)
    except (urllib.error.URLError, TimeoutError, ElementTree.ParseError, OSError) as error:
        warnings.append(f"podcast RSS failed; preserving existing podcasts: {error}")
        podcasts = existing.get("podcasts", [])

    for warning in warnings:
        print(f"Warning: {warning}", file=sys.stderr)

    return {
        "schemaVersion": SCHEMA_VERSION,
        "updatedAt": utc_now_iso(),
        "articles": articles,
        "podcasts": sorted(podcasts, key=sort_key, reverse=True)[:MAX_PODCAST_EPISODES],
        "lessons": sorted(lessons, key=sort_key, reverse=True),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rss-url", default="")
    args = parser.parse_args()
    feed = build_feed(args)
    write_json_atomic(CONTENT_FEED_PATH, feed)
    print(
        "Updated data/app/content-feed.json "
        f"({len(feed['articles'])} articles, "
        f"{len(feed['podcasts'])} podcasts, "
        f"{len(feed['lessons'])} lessons)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
