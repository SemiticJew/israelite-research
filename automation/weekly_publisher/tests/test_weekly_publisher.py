from __future__ import annotations

import json
import tempfile
import unittest
from unittest.mock import patch
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from automation.weekly_publisher.collectors import collect_project_journal, dedupe_records, in_period
from automation.weekly_publisher.integrations import (
    GoogleAnalyticsAdapter,
    ZeffyAdapter,
    sanitize_private_data,
)
from automation.weekly_publisher.renderers import (
    newsletter_model,
    render_newsletter_html,
    render_newsletter_markdown,
    write_outputs,
)


def sample_snapshot() -> dict:
    return {
        "schemaVersion": 1,
        "generatedAt": "2026-10-27T08:00:00-04:00",
        "period": {
            "start": "2026-10-20T08:00:00-04:00",
            "end": "2026-10-27T08:00:00-04:00",
            "startDate": "2026-10-20",
            "endDate": "2026-10-27",
            "timezone": "America/New_York",
            "days": 7,
        },
        "git": {"commits": [], "changedFiles": []},
        "articles": [
            {
                "title": "Verified Article",
                "description": "Confirmed public summary.",
                "url": "https://semiticjew.org/articles/verified.html",
                "changeType": "published",
            }
        ],
        "media": {"releases": []},
        "projects": {"entries": []},
        "christianMarxism": {"changedThisPeriod": False, "publicUrl": "https://semiticjew.org/christian-marxism.html"},
        "discovery": {"checks": []},
        "integrations": {
            "googleAnalytics": {"status": "unavailable", "reason": "not configured", "metrics": {}},
            "zeffy": {"status": "unavailable", "reason": "not configured", "metrics": {}},
        },
    }


class WeeklyPublisherTests(unittest.TestCase):
    def test_date_filter_is_start_inclusive_end_exclusive(self) -> None:
        zone = ZoneInfo("America/New_York")
        start = datetime(2026, 10, 20, 8, tzinfo=zone)
        end = datetime(2026, 10, 27, 8, tzinfo=zone)
        self.assertTrue(in_period("2026-10-20T08:00:00-04:00", start, end))
        self.assertTrue(in_period("2026-10-27T07:59:59-04:00", start, end))
        self.assertFalse(in_period("2026-10-20T07:59:59-04:00", start, end))
        self.assertFalse(in_period("2026-10-27T08:00:00-04:00", start, end))

    def test_deduplication_preserves_first_record(self) -> None:
        records = [{"id": "one", "value": 1}, {"id": "one", "value": 2}, {"id": "two", "value": 3}]
        self.assertEqual(dedupe_records(records, "id"), [records[0], records[2]])

    def test_project_journal_includes_end_calendar_date(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            journal = root / "automation/weekly_publisher/project-status.json"
            journal.parent.mkdir(parents=True)
            journal.write_text(json.dumps({"entries": [{
                "project": "Milestone",
                "confirmedUpdate": "Verified on the report date.",
                "status": "active",
                "date": "2026-10-27",
                "publicLink": "",
                "metrics": {},
                "blocker": "",
                "nextAction": "Record the next milestone.",
                "subscriberAppropriate": True,
            }]}))
            zone = ZoneInfo("America/New_York")
            result = collect_project_journal(
                root,
                datetime(2026, 10, 20, 9, 49, tzinfo=zone),
                datetime(2026, 10, 27, 9, 49, tzinfo=zone),
            )
        self.assertEqual([entry["project"] for entry in result["entries"]], ["Milestone"])

    def test_optional_integrations_are_unavailable_without_credentials(self) -> None:
        self.assertEqual(GoogleAnalyticsAdapter({}).collect(datetime(2026, 1, 1).date(), datetime(2026, 1, 2).date())["status"], "unavailable")
        self.assertEqual(ZeffyAdapter({}).collect(datetime(2026, 1, 1).date(), datetime(2026, 1, 2).date())["status"], "unavailable")

    def test_legacy_ga_access_token_is_not_accepted(self) -> None:
        result = GoogleAnalyticsAdapter({
            "GA4_PROPERTY_ID": "1234",
            "GA4_ACCESS_TOKEN": "legacy-token",
        }).collect(datetime(2026, 1, 1).date(), datetime(2026, 1, 2).date())
        self.assertEqual(result["status"], "unavailable")
        self.assertNotIn("legacy-token", json.dumps(result))

    def test_zeffy_uses_documented_read_only_request_and_aggregates_only(self) -> None:
        responses = [
            {"data": [{"email": "private@example.com"}], "has_more": True, "next_cursor": "cursor-1"},
            {"data": [{"first_name": "Private"}], "has_more": False, "next_cursor": None},
        ]

        class FakeResponse:
            def __init__(self, payload: dict) -> None:
                self.payload = payload

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self) -> bytes:
                return json.dumps(self.payload).encode("utf-8")

        with patch("automation.weekly_publisher.integrations.urllib.request.urlopen", side_effect=[FakeResponse(item) for item in responses]) as mocked:
            result = ZeffyAdapter({"ZEFFY_API_KEY": "secret-key"}).collect(
                datetime(2026, 1, 1).date(), datetime(2026, 1, 8).date()
            )

        self.assertEqual(result["metrics"], {"successfulPaymentCount": 2})
        self.assertNotIn("private@example.com", json.dumps(result))
        first_request = mocked.call_args_list[0].args[0]
        self.assertTrue(first_request.full_url.startswith("https://api.zeffy.com/api/v1/payments?"))
        self.assertIn("status=succeeded", first_request.full_url)
        self.assertEqual(first_request.get_header("Authorization"), "Bearer secret-key")

    def test_privacy_filter_removes_identity_and_contact_data(self) -> None:
        raw = {
            "donorName": "Private Person",
            "subscriber_email": "private@example.com",
            "metrics": {"donationCount": 4, "note": "contact private@example.com"},
        }
        clean = sanitize_private_data(raw)
        serialized = json.dumps(clean)
        self.assertNotIn("Private Person", serialized)
        self.assertNotIn("private@example.com", serialized)
        self.assertEqual(clean["metrics"]["donationCount"], 4)

    def test_newsletter_generation_is_safe_and_has_primary_cta(self) -> None:
        snapshot = sample_snapshot()
        model = newsletter_model(snapshot)
        markdown = render_newsletter_markdown(snapshot)
        html = render_newsletter_html(snapshot)
        self.assertEqual(len(model["updates"]), 1)
        self.assertIn("Verified Article", markdown)
        self.assertIn("https://semiticjew.org/articles/verified.html", html)
        self.assertNotIn("<script", html.lower())
        self.assertNotIn("<form", html.lower())
        self.assertNotIn("internal technical", html.lower())

    def test_newsletter_uses_no_more_than_five_verified_updates(self) -> None:
        snapshot = sample_snapshot()
        snapshot["articles"] = [
            {
                "title": f"Verified Article {index}",
                "description": f"Confirmed summary {index}.",
                "url": f"https://semiticjew.org/articles/verified-{index}.html",
                "changeType": "published",
            }
            for index in range(6)
        ]
        self.assertEqual(len(newsletter_model(snapshot)["updates"]), 5)

    def test_newsletter_guarantees_subscriber_project_milestones(self) -> None:
        snapshot = sample_snapshot()
        snapshot["articles"] = [
            {
                "title": f"Article {index}",
                "description": f"Summary {index}.",
                "url": f"https://semiticjew.org/articles/article-{index}.html",
                "changeType": "published",
            }
            for index in range(5)
        ]
        snapshot["projects"]["entries"] = [
            {
                "project": "Watchmen of Israel",
                "confirmedUpdate": "The gaming map for the Watchmen of Israel tower-defense game is completed.",
                "publicLink": "",
                "subscriberAppropriate": True,
            },
            {
                "project": "Little Hebrews",
                "confirmedUpdate": "Little Hebrews is published in the Apple App Store for iPhone and iPad.",
                "publicLink": "https://apps.apple.com/us/app/little-hebrews/id6816817782",
                "subscriberAppropriate": True,
            },
        ]

        model = newsletter_model(snapshot)
        titles = [update["title"] for update in model["updates"]]
        self.assertEqual(len(model["updates"]), 5)
        self.assertIn("Watchmen of Israel", titles)
        self.assertIn("Little Hebrews", titles)

    def test_all_four_outputs_are_written(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            paths = write_outputs(sample_snapshot(), Path(temp))
            self.assertEqual({path.name for path in paths}, {
                "weekly-snapshot.json",
                "weekly-operations-report.md",
                "weekly-newsletter-draft.md",
                "weekly-newsletter-draft.html",
            })
            self.assertTrue(all(path.is_file() for path in paths))


if __name__ == "__main__":
    unittest.main()
