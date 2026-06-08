#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CANONS = [
    ("tanakh", ROOT / "data" / "tanakh"),
    ("newtestament", ROOT / "data" / "newtestament"),
    ("apocrypha", ROOT / "data" / "apocrypha"),
]

REQUIRED_VERSE_KEYS = {"v", "t", "c", "s"}

def report_ok(message):
    print(f"OK: {message}")

def report_warn(message):
    print(f"WARN: {message}")

def report_fail(message, failures):
    failures.append(message)
    print(f"FAIL: {message}")

def load_json(path, failures):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as error:
        report_fail(f"Invalid JSON: {path.relative_to(ROOT)} — {error}", failures)
        return None

def validate_books_manifest(canon_id, canon_path, failures):
    manifest_path = canon_path / "books.json"

    if not manifest_path.exists():
        report_fail(f"{canon_id}: missing books.json", failures)
        return {}

    manifest = load_json(manifest_path, failures)

    if not isinstance(manifest, dict):
        report_fail(f"{canon_id}: books.json must be an object of slug -> chapter count", failures)
        return {}

    for slug, chapters in manifest.items():
        if not isinstance(slug, str) or not slug.strip():
            report_fail(f"{canon_id}: invalid book slug in books.json: {slug!r}", failures)

        if not isinstance(chapters, int) or chapters < 1:
            report_fail(f"{canon_id}/{slug}: invalid chapter count in books.json: {chapters!r}", failures)

    report_ok(f"{canon_id}: books.json loaded with {len(manifest)} books")
    return manifest

def validate_chapter_file(canon_id, slug, chapter_number, chapter_path, failures, book_chapter_count):
    if not chapter_path.exists():
        report_fail(f"{canon_id}/{slug}: missing chapter file {chapter_number}.json", failures)
        return

    data = load_json(chapter_path, failures)
    if data is None:
        return

    if not isinstance(data, dict):
        report_fail(f"{canon_id}/{slug}/{chapter_number}.json: root must be an object", failures)
        return

    total = data.get("total")
    verses = data.get("verses")

    if not isinstance(total, int) or total < 0:
        report_fail(f"{canon_id}/{slug}/{chapter_number}.json: total must be a non-negative integer", failures)

    if not isinstance(verses, list):
        report_fail(f"{canon_id}/{slug}/{chapter_number}.json: verses must be a list", failures)
        return

    if isinstance(total, int) and total not in {len(verses), book_chapter_count}:
        report_fail(
            f"{canon_id}/{slug}/{chapter_number}.json: total mismatch, total={total}, verses={len(verses)}, book_chapters={book_chapter_count}",
            failures
        )
    elif isinstance(total, int) and total == book_chapter_count and total != len(verses):
        report_warn(
            f"{canon_id}/{slug}/{chapter_number}.json: legacy total={total} appears to mean book chapter count, verses={len(verses)}"
        )

    seen = set()

    for index, verse in enumerate(verses, start=1):
        if not isinstance(verse, dict):
            report_fail(f"{canon_id}/{slug}/{chapter_number}.json: verse item {index} must be an object", failures)
            continue

        missing_keys = REQUIRED_VERSE_KEYS - set(verse.keys())
        if missing_keys:
            report_fail(
                f"{canon_id}/{slug}/{chapter_number}.json: verse item {index} missing keys {sorted(missing_keys)}",
                failures
            )

        verse_number = verse.get("v")
        text = verse.get("t")
        commentary = verse.get("c")
        strongs = verse.get("s")

        if not isinstance(verse_number, int) or verse_number < 1:
            report_fail(
                f"{canon_id}/{slug}/{chapter_number}.json: verse item {index} has invalid v={verse_number!r}",
                failures
            )
        else:
            if verse_number in seen:
                report_fail(
                    f"{canon_id}/{slug}/{chapter_number}.json: duplicate verse number {verse_number}",
                    failures
                )
            seen.add(verse_number)

        if not isinstance(text, str) or not text.strip():
            report_fail(
                f"{canon_id}/{slug}/{chapter_number}.json: verse {verse_number} has empty/non-string text",
                failures
            )

        if not isinstance(commentary, str):
            report_fail(
                f"{canon_id}/{slug}/{chapter_number}.json: verse {verse_number} c must be a string",
                failures
            )

        if not isinstance(strongs, list):
            report_fail(
                f"{canon_id}/{slug}/{chapter_number}.json: verse {verse_number} s must be a list",
                failures
            )
        else:
            for code in strongs:
                if not isinstance(code, str):
                    report_fail(
                        f"{canon_id}/{slug}/{chapter_number}.json: verse {verse_number} has non-string Strong's code {code!r}",
                        failures
                    )

    expected_numbers = list(range(1, len(verses) + 1))
    actual_numbers = [verse.get("v") for verse in verses if isinstance(verse, dict)]

    if actual_numbers != expected_numbers:
        # Additions to Esther uses inherited/legacy verse numbering in some files.
        # Allow strictly increasing non-duplicate numbering there as a warning.
        if slug == "addesth" and actual_numbers == sorted(actual_numbers) and len(actual_numbers) == len(set(actual_numbers)):
            report_warn(
                f"{canon_id}/{slug}/{chapter_number}.json: legacy verse numbering does not start at 1: {actual_numbers[:3]}...{actual_numbers[-3:]}"
            )
        else:
            report_fail(
                f"{canon_id}/{slug}/{chapter_number}.json: verse numbers not sequential from 1 to {len(verses)}",
                failures
            )

def validate_extra_files(canon_id, canon_path, manifest, failures):
    expected = set()

    for slug, chapter_count in manifest.items():
        expected.add(f"{slug}/")
        for chapter_number in range(1, chapter_count + 1):
            expected.add(f"{slug}/{chapter_number}.json")

    for path in canon_path.glob("*"):
        if path.name == "books.json":
            continue

        if path.is_dir() and f"{path.name}/" not in expected:
            if canon_id == "apocrypha":
                report_warn(f"{canon_id}: legacy/support folder exists but is not in active books.json: {path.relative_to(canon_path)}")
            else:
                report_fail(f"{canon_id}: folder exists but is not in books.json: {path.relative_to(canon_path)}", failures)

    for path in canon_path.glob("*/*.json"):
        rel = path.relative_to(canon_path).as_posix()
        if rel not in expected:
            if canon_id == "apocrypha":
                report_warn(f"{canon_id}: legacy/support chapter file exists but is not expected by active books.json: {rel}")
            else:
                report_fail(f"{canon_id}: chapter file exists but is not expected by books.json: {rel}", failures)

def validate_canon(canon_id, canon_path, failures):
    if not canon_path.exists():
        report_fail(f"{canon_id}: canon folder missing: {canon_path.relative_to(ROOT)}", failures)
        return

    manifest = validate_books_manifest(canon_id, canon_path, failures)

    total_books = 0
    total_chapters = 0

    for slug, chapter_count in manifest.items():
        total_books += 1
        book_path = canon_path / slug

        if not book_path.exists():
            report_fail(f"{canon_id}/{slug}: missing book folder", failures)
            continue

        if not book_path.is_dir():
            report_fail(f"{canon_id}/{slug}: book path is not a folder", failures)
            continue

        for chapter_number in range(1, chapter_count + 1):
            total_chapters += 1
            chapter_path = book_path / f"{chapter_number}.json"
            validate_chapter_file(canon_id, slug, chapter_number, chapter_path, failures, chapter_count)

    validate_extra_files(canon_id, canon_path, manifest, failures)
    report_ok(f"{canon_id}: checked {total_books} books and {total_chapters} expected chapters")

def validate_search_index(failures):
    index_path = ROOT / "data" / "scripture-search-index.json"

    if not index_path.exists():
        report_fail("data/scripture-search-index.json missing", failures)
        return

    data = load_json(index_path, failures)
    if data is None:
        return

    entries = data.get("entries")
    total = data.get("totalVerses")

    if not isinstance(entries, list):
        report_fail("scripture-search-index.json: entries must be a list", failures)
        return

    if not isinstance(total, int):
        report_fail("scripture-search-index.json: totalVerses must be an integer", failures)
    elif total != len(entries):
        report_fail(
            f"scripture-search-index.json: totalVerses mismatch, totalVerses={total}, entries={len(entries)}",
            failures
        )

    required_index_keys = {
        "canon",
        "canonLabel",
        "book",
        "slug",
        "chapter",
        "verse",
        "text",
        "normalizedText",
        "readerPath",
    }

    for index, entry in enumerate(entries[:25], start=1):
        if not isinstance(entry, dict):
            report_fail(f"scripture-search-index.json: entry {index} must be an object", failures)
            continue

        missing = required_index_keys - set(entry.keys())
        if missing:
            report_fail(f"scripture-search-index.json: entry {index} missing keys {sorted(missing)}", failures)

    report_ok(f"scripture-search-index.json loaded with {len(entries)} entries")

def main():
    failures = []

    print("DATA INTEGRITY CHECK")
    print("====================")

    for canon_id, canon_path in CANONS:
        print(f"\nChecking {canon_id}...")
        validate_canon(canon_id, canon_path, failures)

    print("\nChecking generated search index...")
    validate_search_index(failures)

    if failures:
        print("\nDATA INTEGRITY CHECK FAILED")
        print("===========================")
        print(f"Failures: {len(failures)}")
        sys.exit(1)

    print("\nDATA INTEGRITY CHECK PASSED")
    sys.exit(0)

if __name__ == "__main__":
    main()
