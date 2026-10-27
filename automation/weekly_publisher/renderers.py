"""Deterministic report and newsletter renderers."""

from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any


def write_snapshot(snapshot: dict[str, Any], path: Path) -> None:
    path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def _link(label: str, url: str) -> str:
    return f"[{label}]({url})" if url else label


def _newsletter_updates(snapshot: dict[str, Any], limit: int = 5) -> list[dict[str, str]]:
    updates: list[dict[str, str]] = []
    for entry in snapshot.get("projects", {}).get("entries", []):
        if not entry.get("subscriberAppropriate") or not entry.get("confirmedUpdate"):
            continue
        updates.append(
            {
                "title": entry.get("project", "Project update"),
                "summary": entry.get("confirmedUpdate", ""),
                "url": entry.get("publicLink", ""),
            }
        )
    for article in snapshot.get("articles", []):
        updates.append(
            {
                "title": article.get("title", "New article"),
                "summary": article.get("description", "A new Semitic Jew article is available."),
                "url": article.get("url", ""),
            }
        )
    for release in snapshot.get("media", {}).get("releases", []):
        updates.append(
            {
                "title": release.get("title", "New release"),
                "summary": "A new Semitic Jew video or podcast release is available.",
                "url": release.get("url", ""),
            }
        )
    unique: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for update in updates:
        identity = (update["title"].casefold(), update["url"])
        if identity not in seen:
            seen.add(identity)
            unique.append(update)
    return unique[:limit]


def newsletter_model(snapshot: dict[str, Any]) -> dict[str, Any]:
    updates = _newsletter_updates(snapshot)
    period_end = snapshot["period"]["endDate"]
    subject = f"Semitic Jew Weekly — {period_end}"
    preview = updates[0]["title"] if updates else "Verified updates from Semitic Jew Inc"
    primary = next((item for item in updates if item.get("url")), None)
    return {
        "subject": subject,
        "previewText": f"{preview} and this week’s verified project updates.",
        "opening": "Shalom. Here are the verified Semitic Jew updates from this reporting week.",
        "updates": updates,
        "primaryCallToAction": {
            "label": f"Read: {primary['title']}" if primary else "Explore Semitic Jew",
            "url": primary["url"] if primary else "https://semiticjew.org/",
        },
        "supportAppeal": {
            "text": "If this work helps you, consider supporting Semitic Jew Inc.",
            "url": "https://semiticjew.org/donate.html",
        },
    }


def render_operations_report(snapshot: dict[str, Any]) -> str:
    period = snapshot["period"]
    lines = [
        f"# Semitic Jew Weekly Operations Report — {period['endDate']}",
        "",
        f"Reporting period: **{period['start']} through {period['end']}** ({period['timezone']})",
        "",
        "## Confirmed activity",
        "",
    ]
    commits = snapshot.get("git", {}).get("commits", [])
    lines.append(f"- Git commits: **{len(commits)}**")
    lines.append(f"- Changed files: **{len(snapshot.get('git', {}).get('changedFiles', []))}**")
    lines.append(f"- Published or modified articles: **{len(snapshot.get('articles', []))}**")
    lines.append(f"- Video or podcast releases: **{len(snapshot.get('media', {}).get('releases', []))}**")
    lines.extend(["", "### Articles", ""])
    if snapshot.get("articles"):
        for article in snapshot["articles"]:
            lines.append(f"- **{article['changeType'].title()}:** {_link(article['title'], article['url'])}")
    else:
        lines.append("- No repository-verified article publication or modification in this period.")
    lines.extend(["", "### Media releases", ""])
    releases = snapshot.get("media", {}).get("releases", [])
    if releases:
        for release in releases:
            lines.append(f"- {_link(release['title'], release['url'])} — {release['publishedAt']}")
    else:
        lines.append("- No dated release in the available repository feeds for this period.")
    lines.extend(["", "### Christian Marxism book page", ""])
    book = snapshot.get("christianMarxism", {})
    if book.get("changedThisPeriod"):
        lines.append(f"- Updated: {_link('public book page', book.get('publicUrl', ''))}")
        for changed in book.get("changedFiles", []):
            lines.append(f"  - `{changed}`")
    else:
        lines.append(f"- No repository change this period. Current page: {_link('Christian Marxism', book.get('publicUrl', ''))}")
    lines.extend(["", "### Project journal", ""])
    entries = snapshot.get("projects", {}).get("entries", [])
    if entries:
        for entry in entries:
            lines.append(f"- **{entry['project']}** — {entry['status']}: {entry.get('confirmedUpdate') or 'No confirmed update recorded.'}")
            if entry.get("blocker"):
                lines.append(f"  - Blocker: {entry['blocker']}")
            if entry.get("nextAction"):
                lines.append(f"  - Next action: {entry['nextAction']}")
    else:
        lines.append("- No project-journal entries fall within this reporting period.")
    lines.extend(["", "## Discovery and feed verification", ""])
    checks = snapshot.get("discovery", {}).get("checks", [])
    if checks:
        for check in checks:
            passed = all(check.get(name) for name in ("articleCatalog", "archive", "searchIndex", "sitemap", "appFeed"))
            lines.append(f"- {_link(check['url'], check['url'])}: {'verified' if passed else 'needs review'}")
    else:
        lines.append("- No changed article required cross-catalog verification.")
    lines.extend(["", "## Metrics and integrations", ""])
    for name in ("googleAnalytics", "zeffy"):
        integration = snapshot.get("integrations", {}).get(name, {})
        if integration.get("status") == "available":
            lines.append(f"- **{name}:** available — `{json.dumps(integration.get('metrics', {}), sort_keys=True)}`")
        else:
            lines.append(f"- **{name}:** unavailable — {integration.get('reason', 'not configured')}")
    lines.extend(
        [
            "",
            "## Assumptions and unavailable information",
            "",
            "- Repository records and the structured project journal are treated as the sources of truth.",
            "- No private ChatGPT conversations were accessed or inferred.",
            "- Missing optional metrics are reported as unavailable and are not estimated.",
            "- No subscriber, donor, or raw contact data is included.",
            "",
        ]
    )
    return "\n".join(lines)


def render_newsletter_markdown(snapshot: dict[str, Any]) -> str:
    model = newsletter_model(snapshot)
    lines = [
        f"# {model['subject']}",
        "",
        f"**Preview text:** {model['previewText']}",
        "",
        model["opening"],
        "",
    ]
    if model["updates"]:
        for update in model["updates"]:
            lines.extend([f"## {update['title']}", "", update["summary"], ""])
            if update["url"]:
                lines.extend([f"[Read more]({update['url']})", ""])
    else:
        lines.extend(["No subscriber-ready update was verified for this reporting period.", ""])
    cta = model["primaryCallToAction"]
    lines.extend([f"## {_link(cta['label'], cta['url'])}", ""])
    support = model["supportAppeal"]
    lines.extend([support["text"], "", f"[Support Semitic Jew Inc.]({support['url']})", ""])
    return "\n".join(lines)


def render_newsletter_html(snapshot: dict[str, Any]) -> str:
    model = newsletter_model(snapshot)
    subject = html.escape(model["subject"])
    preview = html.escape(model["previewText"])
    sections = []
    for update in model["updates"]:
        title = html.escape(update["title"])
        summary = html.escape(update["summary"])
        link = ""
        if update["url"].startswith("https://"):
            safe_url = html.escape(update["url"], quote=True)
            link = f'<p><a href="{safe_url}" style="color:#054A91;font-weight:700;">Read more</a></p>'
        sections.append(f'<h2 style="color:#0b2340;font-size:22px;">{title}</h2><p>{summary}</p>{link}')
    if not sections:
        sections.append("<p>No subscriber-ready update was verified for this reporting period.</p>")
    cta = model["primaryCallToAction"]
    support = model["supportAppeal"]
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{subject}</title>
</head>
<body style="margin:0;background:#f4f7fa;color:#162536;font-family:Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fa;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-collapse:collapse;">
        <tr><td style="padding:32px;line-height:1.6;">
          <h1 style="margin-top:0;color:#0b2340;font-size:28px;">{subject}</h1>
          <p>{html.escape(model['opening'])}</p>
          {''.join(sections)}
          <p style="text-align:center;margin:32px 0;"><a href="{html.escape(cta['url'], quote=True)}" style="display:inline-block;background:#F17300;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;">{html.escape(cta['label'])}</a></p>
          <hr style="border:0;border-top:1px solid #dfe6ed;margin:28px 0;">
          <p>{html.escape(support['text'])} <a href="{html.escape(support['url'], quote=True)}" style="color:#054A91;">Support the work</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
'''


def write_outputs(snapshot: dict[str, Any], output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = [
        output_dir / "weekly-snapshot.json",
        output_dir / "weekly-operations-report.md",
        output_dir / "weekly-newsletter-draft.md",
        output_dir / "weekly-newsletter-draft.html",
    ]
    write_snapshot(snapshot, paths[0])
    paths[1].write_text(render_operations_report(snapshot), encoding="utf-8")
    paths[2].write_text(render_newsletter_markdown(snapshot), encoding="utf-8")
    paths[3].write_text(render_newsletter_html(snapshot), encoding="utf-8")
    return paths
