"""Repository-backed collectors for the weekly publisher."""

from __future__ import annotations

import json
import subprocess
from datetime import date, datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable


def parse_datetime(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def in_period(value: str, start: datetime, end: datetime) -> bool:
    parsed = parse_datetime(value)
    if parsed is None:
        return False
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=start.tzinfo)
    return start <= parsed.astimezone(start.tzinfo) < end


def dedupe_records(records: Iterable[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    unique: dict[str, dict[str, Any]] = {}
    for record in records:
        value = str(record.get(key, "")).strip()
        if value and value not in unique:
            unique[value] = record
    return list(unique.values())


def _git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


def collect_git(root: Path, start: datetime, end: datetime) -> dict[str, Any]:
    raw = _git(
        root,
        "log",
        f"--since={start.isoformat()}",
        f"--until={end.isoformat()}",
        "--date=iso-strict",
        "--pretty=format:@@COMMIT@@%H%x1f%cI%x1f%s",
        "--name-only",
    )
    commits: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for line in raw.splitlines():
        if line.startswith("@@COMMIT@@"):
            digest, committed_at, subject = line.removeprefix("@@COMMIT@@").split("\x1f", 2)
            current = {
                "sha": digest,
                "committedAt": committed_at,
                "subject": subject,
                "files": [],
            }
            commits.append(current)
        elif current is not None and line.strip():
            current["files"].append(line.strip())
    changed_files = sorted({name for commit in commits for name in commit["files"]})
    return {"status": "available", "commits": commits, "changedFiles": changed_files}


class ArticleParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.title_parts: list[str] = []
        self.in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "meta":
            key = values.get("property") or values.get("name")
            content = values.get("content")
            if key and content:
                self.meta[key] = content
        elif tag == "link" and values.get("rel") == "canonical" and values.get("href"):
            self.meta["canonical"] = str(values["href"])
        elif tag == "h1" and "article-title" in str(values.get("class", "")):
            self.in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "h1":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)


def _article_record(root: Path, relative_path: str, commit_shas: set[str]) -> dict[str, Any] | None:
    path = root / relative_path
    if not path.is_file():
        return None
    parser = ArticleParser()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    title = " ".join(" ".join(parser.title_parts).split())
    canonical = parser.meta.get("canonical", "")
    if not title or not canonical:
        return None
    created_sha = _git(root, "log", "--diff-filter=A", "--format=%H", "--", relative_path).splitlines()
    change_type = "published" if created_sha and created_sha[0] in commit_shas else "modified"
    return {
        "path": relative_path,
        "title": title,
        "changeType": change_type,
        "publishedAt": parser.meta.get("article:published_time", ""),
        "description": parser.meta.get("description", parser.meta.get("og:description", "")),
        "url": canonical,
        "image": parser.meta.get("og:image", ""),
    }


def collect_articles(root: Path, git_data: dict[str, Any]) -> list[dict[str, Any]]:
    commit_shas = {commit["sha"] for commit in git_data.get("commits", [])}
    paths = sorted(
        path
        for path in git_data.get("changedFiles", [])
        if path.startswith("articles/") and path.endswith(".html")
    )
    return [record for path in paths if (record := _article_record(root, path, commit_shas))]


def collect_discovery(root: Path, articles: list[dict[str, Any]]) -> dict[str, Any]:
    articles_page = (root / "articles.html").read_text(encoding="utf-8", errors="replace")
    archive_page = (root / "articles-all.html").read_text(encoding="utf-8", errors="replace")
    search = json.loads((root / "search-index.json").read_text(encoding="utf-8"))
    sitemap = (root / "sitemap.xml").read_text(encoding="utf-8", errors="replace")
    app_feed = json.loads((root / "data/app/content-feed.json").read_text(encoding="utf-8"))
    search_urls = {entry.get("url") for entry in search if isinstance(entry, dict)}
    feed_urls = {entry.get("articleUrl") for entry in app_feed.get("articles", [])}
    checks = []
    for article in articles:
        relative_url = article["url"].removeprefix("https://semiticjew.org")
        checks.append(
            {
                "url": article["url"],
                "articleCatalog": relative_url in articles_page,
                "archive": relative_url in archive_page,
                "searchIndex": relative_url in search_urls,
                "sitemap": article["url"] in sitemap,
                "appFeed": article["url"] in feed_urls,
            }
        )
    return {
        "status": "available",
        "checks": checks,
        "catalogCounts": {
            "searchIndex": len(search),
            "appFeedArticles": len(app_feed.get("articles", [])),
        },
    }


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def collect_media(root: Path, start: datetime, end: datetime) -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    sources = [
        (root / "data/youtube-videos.json", "youtube"),
        (root / "data/youtube-podcast-videos.json", "youtube-podcast"),
    ]
    for path, kind in sources:
        if not path.is_file():
            continue
        payload = _load_json(path)
        for item in payload.get("videos", []):
            published = item.get("published", "")
            if in_period(published, start, end):
                records.append(
                    {
                        "id": item.get("id", ""),
                        "kind": kind,
                        "title": item.get("title", ""),
                        "publishedAt": published,
                        "url": item.get("url", ""),
                    }
                )
    app_feed_path = root / "data/app/content-feed.json"
    if app_feed_path.is_file():
        for item in _load_json(app_feed_path).get("podcasts", []):
            published = item.get("publishedAt", "")
            if in_period(published, start, end):
                records.append(
                    {
                        "id": item.get("id", item.get("episodeUrl", "")),
                        "kind": "podcast-rss",
                        "title": item.get("title", ""),
                        "publishedAt": published,
                        "url": item.get("episodeUrl", ""),
                    }
                )
    records = dedupe_records(records, "id")
    records.sort(key=lambda item: (item.get("publishedAt", ""), item.get("id", "")), reverse=True)
    return {"status": "available", "releases": records}


def collect_book_activity(root: Path, git_data: dict[str, Any]) -> dict[str, Any]:
    relevant = sorted(
        path
        for path in git_data.get("changedFiles", [])
        if "christian-marxism" in path.lower() or path in {"books.html", "js/book-readers.js"}
    )
    page = root / "christian-marxism.html"
    return {
        "status": "available" if page.is_file() else "unavailable",
        "changedFiles": relevant,
        "publicUrl": "https://semiticjew.org/christian-marxism.html" if page.is_file() else "",
        "changedThisPeriod": bool(relevant),
    }


def collect_project_journal(root: Path, start: datetime, end: datetime) -> dict[str, Any]:
    path = root / "automation/weekly_publisher/project-status.json"
    payload = _load_json(path)
    required = {
        "project",
        "confirmedUpdate",
        "status",
        "date",
        "publicLink",
        "metrics",
        "blocker",
        "nextAction",
        "subscriberAppropriate",
    }
    allowed_statuses = {"not_reported", "planned", "active", "blocked", "completed", "ongoing"}
    entries = []
    for index, entry in enumerate(payload.get("entries", [])):
        missing = required - set(entry)
        if missing:
            raise ValueError(f"project journal entry {index} is missing fields: {sorted(missing)}")
        if entry["status"] not in allowed_statuses:
            raise ValueError(f"project journal entry {index} has invalid status: {entry['status']}")
        if entry["publicLink"] and not entry["publicLink"].startswith("https://"):
            raise ValueError(f"project journal entry {index} publicLink must use HTTPS")
        if not isinstance(entry["metrics"], dict):
            raise ValueError(f"project journal entry {index} metrics must be an object")
        if not isinstance(entry["subscriberAppropriate"], bool):
            raise ValueError(f"project journal entry {index} subscriberAppropriate must be boolean")
        entry_date = entry.get("date")
        # Journal dates have calendar-day precision, so include the report's
        # ending calendar day even though timestamped sources remain end-exclusive.
        if entry_date is None or start.date() <= date.fromisoformat(entry_date) <= end.date():
            entries.append(entry)
    entries.sort(key=lambda item: (item.get("date") or "", item.get("project", "")), reverse=True)
    return {"status": "available", "entries": entries, "source": str(path.relative_to(root))}
