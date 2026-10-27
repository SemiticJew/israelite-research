# Semitic Jew Weekly Publisher

Version 1 generates a verified weekly snapshot, an internal operations report, and a Zeffy-ready newsletter draft. It does not send newsletters, publish content, change the website, or read private ChatGPT conversations.

## How it works

The entry point is `automation/weekly_publisher/publisher.py`. For a configurable seven-day period it reads:

- Git commits and changed files.
- Article metadata and the site article/archive catalogs.
- `search-index.json`, `sitemap.xml`, and `data/app/content-feed.json`.
- Existing YouTube and podcast feed files under `data/`.
- changes concerning `christian-marxism.html`, `books.html`, related book assets, or the book reader script.
- `automation/weekly_publisher/project-status.json` for confirmed work that does not create commits.
- optional aggregate Google Analytics and Zeffy metrics when credentials are configured.

The four generated files are:

- `weekly-snapshot.json` — structured input for automation.
- `weekly-operations-report.md` — internal review report with confirmed and unavailable information separated.
- `weekly-newsletter-draft.md` — human-readable newsletter draft.
- `weekly-newsletter-draft.html` — escaped, script-free, form-free HTML suitable for review and import into Zeffy.

The default output directory is `automation/weekly_publisher/output/`. It is intentionally ignored by Git so weekly artifacts are not committed to `main`.

## Recording non-code project updates

Edit `automation/weekly_publisher/project-status.json`. Add one entry per confirmed update and use every documented field:

```json
{
  "project": "Project name",
  "confirmedUpdate": "A factual, verified update.",
  "status": "active",
  "date": "2026-10-27",
  "publicLink": "https://semiticjew.org/example.html",
  "metrics": {"publicAggregateCount": 12},
  "blocker": "",
  "nextAction": "The next confirmed action.",
  "subscriberAppropriate": true
}
```

Allowed status values are `not_reported`, `planned`, `active`, `blocked`, `completed`, and `ongoing`.

Rules:

- Record only confirmed facts.
- Leave `confirmedUpdate` empty and use `not_reported` when no update is verified.
- Never add subscriber emails, donor identities, contact lists, private notes, or private ChatGPT conversation content.
- Metrics must be aggregate and non-personal.
- Set `subscriberAppropriate` to `true` only for information suitable for a public newsletter.

## Run locally

The core implementation uses the Python standard library and the repository-supported `python3` command. Install the small optional authentication dependency before running with GA4 credentials:

```bash
python3 -m pip install -r automation/weekly_publisher/requirements.txt
python3 -m unittest discover -s automation/weekly_publisher/tests -v
python3 automation/weekly_publisher/publisher.py
```

Use a fixed end date for deterministic testing:

```bash
python3 automation/weekly_publisher/publisher.py \
  --as-of 2026-10-27 \
  --output-dir /tmp/semitic-jew-weekly
```

An ISO date is interpreted as 8:00 AM in `America/New_York`. An ISO datetime may also be supplied. The reporting window is start-inclusive and end-exclusive.

## Friday GitHub Actions workflow

`.github/workflows/weekly-publisher.yml` runs at `11:00 UTC` every Friday. That is 7:00 AM during Eastern daylight time and 6:00 AM during Eastern standard time, so it remains before 8:00 AM year-round.

The workflow:

1. Checks out full Git history.
2. Validates the project journal.
3. Runs the unit tests.
4. Generates all four files.
5. Uploads them as a 30-day workflow artifact.
6. Creates or updates one issue named `Weekly Publisher Review — YYYY-MM-DD` containing the operations report and Markdown newsletter draft.

Permissions are limited to `contents: read` and `issues: write`. Generated files are never committed by this workflow.

## Optional GitHub secrets

No secret is required for the core report. Optional integrations use only these secrets:

- `GA4_PROPERTY_ID`
- `GA4_SERVICE_ACCOUNT_JSON`
- `ZEFFY_API_KEY`

The GA4 adapter requests only aggregate `activeUsers`, `sessions`, and `screenPageViews` metrics through the Google Analytics Data API. The workflow writes `GA4_SERVICE_ACCOUNT_JSON` to a permission-restricted temporary file, exposes only that file to the adapter, and deletes it immediately after generation. It never prints the JSON, access token, service-account identity, private key, or temporary path. Grant the service account viewer access to the property identified by `GA4_PROPERTY_ID`.

The Zeffy adapter follows Zeffy's documented public API: `GET https://api.zeffy.com/api/v1/payments`, Bearer authentication with `ZEFFY_API_KEY`, cursor pagination, and Unix timestamp filters. It requests only succeeded payments for the reporting period, counts them in memory, and discards every transaction object. It never includes contacts, names, email addresses, donor identities, or transaction-level records in output.

Credentials are read at runtime. Never put credential values in the repository, project journal, generated files, workflow logs, or issue body. When either integration's required credentials are absent, the report records `unavailable` and continues.

## Retrieve the weekly artifact

1. Open the repository’s **Actions** tab.
2. Select **Semitic Jew Weekly Publisher**.
3. Open the latest successful Friday or manual run.
4. Download the `semitic-jew-weekly-publisher-<run-id>` artifact.
5. Review all four files before using the newsletter draft.

## Use with the Friday ChatGPT automation

Give the Friday automation the latest `weekly-snapshot.json` and `weekly-operations-report.md`. Treat confirmed fields as facts. Treat integration entries with `status: unavailable` as unavailable—never estimate them. Use `weekly-newsletter-draft.md` or `.html` as a starting draft only, and require human review before copying anything into Zeffy.

The automation should not supplement the report by inferring private conversations. If work did not create a repository record, add it to the project journal first.

## Test without sending or publishing

- Run the unit-test command above.
- Generate into `/tmp` with a fixed `--as-of` value.
- Leave optional secrets unset to test graceful unavailable states.
- Inspect the HTML for the absence of scripts, forms, personal data, and non-HTTPS public links.
- Use `workflow_dispatch` with an optional `as_of` value to exercise artifact and issue creation.

Neither the local command nor the workflow sends a newsletter, contacts subscribers, deploys the site, or commits generated files.
