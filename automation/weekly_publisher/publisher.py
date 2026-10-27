#!/usr/bin/env python3
"""Generate the Semitic Jew weekly snapshot, operations report, and newsletter."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from automation.weekly_publisher.collectors import (  # type: ignore
        collect_articles,
        collect_book_activity,
        collect_discovery,
        collect_git,
        collect_media,
        collect_project_journal,
    )
    from automation.weekly_publisher.integrations import (  # type: ignore
        EMAIL_PATTERN,
        GoogleAnalyticsAdapter,
        ZeffyAdapter,
        sanitize_private_data,
    )
    from automation.weekly_publisher.renderers import write_outputs  # type: ignore
else:
    from .collectors import (
        collect_articles,
        collect_book_activity,
        collect_discovery,
        collect_git,
        collect_media,
        collect_project_journal,
    )
    from .integrations import EMAIL_PATTERN, GoogleAnalyticsAdapter, ZeffyAdapter, sanitize_private_data
    from .renderers import write_outputs


TIMEZONE = "America/New_York"
SCHEMA_VERSION = 1


def parse_as_of(value: str | None, timezone: ZoneInfo) -> datetime:
    if not value:
        return datetime.now(timezone).replace(microsecond=0)
    if len(value) == 10:
        return datetime.combine(datetime.fromisoformat(value).date(), time(8, 0), timezone)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone)
    return parsed.astimezone(timezone).replace(microsecond=0)


def build_snapshot(root: Path, as_of: datetime, days: int = 7) -> dict:
    start = as_of - timedelta(days=days)
    git_data = collect_git(root, start, as_of)
    articles = collect_articles(root, git_data)
    snapshot = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": as_of.isoformat(),
        "period": {
            "start": start.isoformat(),
            "end": as_of.isoformat(),
            "startDate": start.date().isoformat(),
            "endDate": as_of.date().isoformat(),
            "timezone": TIMEZONE,
            "days": days,
        },
        "sources": {
            "repository": "verified",
            "projectJournal": "verified",
            "privateChatConversations": "not accessed",
        },
        "git": git_data,
        "articles": articles,
        "discovery": collect_discovery(root, articles),
        "media": collect_media(root, start, as_of),
        "christianMarxism": collect_book_activity(root, git_data),
        "projects": collect_project_journal(root, start, as_of),
        "integrations": {
            "googleAnalytics": GoogleAnalyticsAdapter().collect(start.date(), as_of.date()),
            "zeffy": ZeffyAdapter().collect(start.date(), as_of.date()),
        },
    }
    sanitized = sanitize_private_data(snapshot)
    serialized = json.dumps(sanitized, ensure_ascii=False)
    if EMAIL_PATTERN.search(serialized):
        raise ValueError("privacy validation failed: an email-like value remains in the snapshot")
    return sanitized


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent / "output")
    parser.add_argument("--as-of", help="ISO date or datetime; dates resolve to 08:00 America/New_York")
    parser.add_argument("--days", type=int, default=7)
    args = parser.parse_args(argv)
    if args.days < 1 or args.days > 31:
        parser.error("--days must be between 1 and 31")
    timezone = ZoneInfo(TIMEZONE)
    as_of = parse_as_of(args.as_of, timezone)
    snapshot = build_snapshot(args.root.resolve(), as_of, args.days)
    paths = write_outputs(snapshot, args.output_dir.resolve())
    for path in paths:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
