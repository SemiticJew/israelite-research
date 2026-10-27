"""Optional, privacy-preserving external integrations."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, time, timezone
from pathlib import Path
from typing import Any, Mapping


SENSITIVE_KEYS = {
    "email",
    "emails",
    "subscriber",
    "subscribers",
    "subscriber_email",
    "donor",
    "donors",
    "donor_name",
    "first_name",
    "last_name",
    "full_name",
    "contact",
    "contacts",
    "phone",
    "address",
}
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)


def sanitize_private_data(value: Any) -> Any:
    """Recursively remove identity/contact fields and email-like values."""
    if isinstance(value, Mapping):
        clean: dict[str, Any] = {}
        for key, child in value.items():
            normalized = str(key).strip().lower().replace("-", "_")
            compact = normalized.replace("_", "")
            if normalized in SENSITIVE_KEYS or compact in {
                "email",
                "emails",
                "subscriberemail",
                "donorname",
                "firstname",
                "lastname",
                "fullname",
                "phonenumber",
                "mailingaddress",
            }:
                continue
            sanitized = sanitize_private_data(child)
            if sanitized is not None:
                clean[str(key)] = sanitized
        return clean
    if isinstance(value, list):
        return [child for item in value if (child := sanitize_private_data(item)) is not None]
    if isinstance(value, str) and EMAIL_PATTERN.search(value):
        return None
    return value


def unavailable(name: str, reason: str) -> dict[str, Any]:
    return {"name": name, "status": "unavailable", "reason": reason, "metrics": {}}


class GoogleAnalyticsAdapter:
    """Aggregate-only GA4 Data API adapter using service-account credentials."""

    def __init__(self, env: Mapping[str, str] | None = None) -> None:
        self.env = env if env is not None else os.environ

    def collect(self, start: date, end: date) -> dict[str, Any]:
        property_id = self.env.get("GA4_PROPERTY_ID", "").strip()
        credentials_file = self.env.get("GA4_CREDENTIALS_FILE", "").strip()
        if not property_id or not credentials_file or not Path(credentials_file).is_file():
            return unavailable("googleAnalytics", "GA4 service-account credentials are not configured")
        try:
            from google.auth.transport.requests import Request as GoogleAuthRequest
            from google.oauth2 import service_account

            credentials = service_account.Credentials.from_service_account_file(
                credentials_file,
                scopes=["https://www.googleapis.com/auth/analytics.readonly"],
            )
            credentials.refresh(GoogleAuthRequest())
            token = credentials.token
        except (ImportError, OSError, ValueError, TypeError) as error:
            return unavailable("googleAnalytics", f"authentication unavailable: {type(error).__name__}")
        if not token:
            return unavailable("googleAnalytics", "authentication unavailable")
        endpoint = f"https://analyticsdata.googleapis.com/v1beta/properties/{urllib.parse.quote(property_id)}:runReport"
        body = {
            "dateRanges": [{"startDate": start.isoformat(), "endDate": end.isoformat()}],
            "metrics": [{"name": "activeUsers"}, {"name": "sessions"}, {"name": "screenPageViews"}],
        }
        request = urllib.request.Request(
            endpoint,
            data=json.dumps(body).encode("utf-8"),
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (OSError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as error:
            return unavailable("googleAnalytics", f"request failed: {type(error).__name__}")
        headers = [item.get("name", "") for item in payload.get("metricHeaders", [])]
        values = payload.get("rows", [{}])[0].get("metricValues", []) if payload.get("rows") else []
        metrics = {name: int(values[index].get("value", 0)) for index, name in enumerate(headers) if index < len(values)}
        return {"name": "googleAnalytics", "status": "available", "reason": "", "metrics": metrics}


class ZeffyAdapter:
    """Count successful Zeffy payments without retaining transaction records."""

    ENDPOINT = "https://api.zeffy.com/api/v1/payments"

    def __init__(self, env: Mapping[str, str] | None = None) -> None:
        self.env = env if env is not None else os.environ

    def collect(self, start: date, end: date) -> dict[str, Any]:
        token = self.env.get("ZEFFY_API_KEY", "").strip()
        if not token:
            return unavailable("zeffy", "ZEFFY_API_KEY is not configured")

        start_timestamp = int(datetime.combine(start, time.min, tzinfo=timezone.utc).timestamp())
        end_timestamp = int(datetime.combine(end, time.min, tzinfo=timezone.utc).timestamp())
        count = 0
        cursor = ""
        for _ in range(100):
            query = {
                "status": "succeeded",
                "created[gte]": start_timestamp,
                "created[lt]": end_timestamp,
                "limit": 100,
            }
            if cursor:
                query["starting_after"] = cursor
            request = urllib.request.Request(
                f"{self.ENDPOINT}?{urllib.parse.urlencode(query)}",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            )
            try:
                with urllib.request.urlopen(request, timeout=20) as response:
                    payload = json.loads(response.read().decode("utf-8"))
            except (OSError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as error:
                return unavailable("zeffy", f"request failed: {type(error).__name__}")

            records = payload.get("data", []) if isinstance(payload, dict) else []
            if not isinstance(records, list):
                return unavailable("zeffy", "API response did not match the documented pagination schema")
            count += len(records)
            if not payload.get("has_more"):
                return {
                    "name": "zeffy",
                    "status": "available",
                    "reason": "",
                    "metrics": {"successfulPaymentCount": count},
                }
            cursor = str(payload.get("next_cursor", "")).strip()
            if not cursor:
                return unavailable("zeffy", "API pagination cursor was unavailable")

        return unavailable("zeffy", "API pagination exceeded the safety limit")
