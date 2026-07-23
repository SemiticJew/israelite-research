#!/usr/bin/env python3
"""Manage Line Upon Line lesson metadata and media."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any

import update_app_content_feed


ROOT = Path(__file__).resolve().parents[1]
LESSON_PATH = ROOT / "data/app/line-upon-line.json"
VIDEO_DIR = ROOT / "media/scripture-explained"
POSTER_DIR = ROOT / "images/app/scripture-explained"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
VIDEO_EXTENSIONS = {".mp4"}
POSTER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def read_lessons() -> dict[str, Any]:
    with LESSON_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if payload.get("schemaVersion") != 1 or not isinstance(payload.get("lessons"), list):
        raise ValueError("Invalid line-upon-line metadata schema.")
    return payload


def write_lessons(payload: dict[str, Any]) -> None:
    update_app_content_feed.write_json_atomic(LESSON_PATH, payload)


def production_asset_name(lesson_id: str, source: Path) -> str:
    return f"{lesson_id}{source.suffix.lower()}"


def validate_media(path: Path, allowed_extensions: set[str], label: str) -> None:
    if not path.is_file():
        raise SystemExit(f"{label} does not exist: {path}")
    if path.suffix.lower() not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise SystemExit(f"{label} must use one of: {allowed}")
    if path.stat().st_size <= 0:
        raise SystemExit(f"{label} is empty: {path}")


def copy_asset(source: Path, target_dir: Path, lesson_id: str, replace: bool) -> Path:
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / production_asset_name(lesson_id, source)
    if target.exists() and not replace:
        raise SystemExit(f"Refusing to overwrite existing file without --replace: {target}")
    shutil.copy2(source, target)
    return target


def sort_lessons(lessons: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        lessons,
        key=lambda lesson: (
            update_app_content_feed.normalize_date(lesson.get("publishedAt", "")),
            lesson.get("id", ""),
        ),
        reverse=True,
    )


def command_list(_: argparse.Namespace) -> int:
    payload = read_lessons()
    for lesson in sort_lessons(payload["lessons"]):
        print(
            "\t".join(
                [
                    clean_text(lesson.get("id")),
                    clean_text(lesson.get("reference")),
                    clean_text(lesson.get("title")),
                    clean_text(lesson.get("publishedAt")),
                    clean_text(lesson.get("videoUrl")),
                    clean_text(lesson.get("posterUrl")),
                ]
            )
        )
    return 0


def command_add(args: argparse.Namespace) -> int:
    lesson_id = clean_text(args.id)
    if not ID_RE.fullmatch(lesson_id):
        raise SystemExit("Lesson ID must be lowercase letters, numbers, and hyphens.")

    video_source = Path(args.video).expanduser().resolve()
    poster_source = Path(args.poster).expanduser().resolve()
    validate_media(video_source, VIDEO_EXTENSIONS, "Video")
    validate_media(poster_source, POSTER_EXTENSIONS, "Poster")

    payload = read_lessons()
    lessons = payload["lessons"]
    existing = next((lesson for lesson in lessons if lesson.get("id") == lesson_id), None)
    if existing and not args.replace:
        raise SystemExit(f"Lesson ID already exists: {lesson_id}")

    video_target = copy_asset(video_source, VIDEO_DIR, lesson_id, args.replace)
    poster_target = copy_asset(poster_source, POSTER_DIR, lesson_id, args.replace)

    record = {
        "id": lesson_id,
        "reference": clean_text(args.reference),
        "title": clean_text(args.title),
        "description": clean_text(args.description),
        "publishedAt": update_app_content_feed.normalize_date(args.published_at),
        "duration": clean_text(args.duration),
        "posterUrl": "/" + poster_target.relative_to(ROOT).as_posix(),
        "videoUrl": "/" + video_target.relative_to(ROOT).as_posix(),
    }
    required = ["reference", "title", "publishedAt", "duration", "posterUrl", "videoUrl"]
    missing = [field for field in required if not record[field]]
    if missing:
        raise SystemExit(f"Missing required lesson fields: {', '.join(missing)}")

    lessons = [lesson for lesson in lessons if lesson.get("id") != lesson_id]
    lessons.append(record)
    payload["lessons"] = sort_lessons(lessons)
    write_lessons(payload)

    feed = update_app_content_feed.build_feed(argparse.Namespace(rss_url=""))
    update_app_content_feed.write_json_atomic(update_app_content_feed.CONTENT_FEED_PATH, feed)

    changed = [
        str(video_target.relative_to(ROOT)),
        str(poster_target.relative_to(ROOT)),
        str(LESSON_PATH.relative_to(ROOT)),
        str(update_app_content_feed.CONTENT_FEED_PATH.relative_to(ROOT)),
    ]
    print("Files changed:")
    for path in changed:
        print(f"- {path}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    list_parser = subparsers.add_parser("list")
    list_parser.set_defaults(func=command_list)

    add_parser = subparsers.add_parser("add")
    add_parser.add_argument("--id", required=True)
    add_parser.add_argument("--reference", required=True)
    add_parser.add_argument("--title", required=True)
    add_parser.add_argument("--description", default="")
    add_parser.add_argument("--published-at", required=True)
    add_parser.add_argument("--duration", required=True)
    add_parser.add_argument("--video", required=True)
    add_parser.add_argument("--poster", required=True)
    add_parser.add_argument("--replace", action="store_true")
    add_parser.set_defaults(func=command_add)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
