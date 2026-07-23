# App Content Publishing

Build 5 uses `data/app/content-feed.json` as the mobile app's live content manifest. The app can read a remote copy from `https://semiticjew.org/data/app/content-feed.json`, cache it, and fall back to the bundled manifest when offline.

Regenerate the manifest manually with:

```bash
python3 tools/update_app_content_feed.py
```

## Publishing A New Article

1. Publish the article HTML page under `articles/`.
2. Add the article card/link to `articles.html` using the existing article-card conventions.
3. Run:

```bash
python3 tools/update_app_content_feed.py
```

The generator reads `articles.html`, opens the linked article files, extracts title, excerpt, author, publication date, image, and canonical URL metadata, then updates `data/app/content-feed.json`.

## Publishing A New Podcast

Publish the episode through the normal Acast podcast host. The official RSS feed is:

```text
https://feeds.acast.com/public/shows/semitic-jew
```

The scheduled GitHub Actions workflow checks that RSS feed every six hours and imports the latest valid episodes into `data/app/content-feed.json`. If RSS is unavailable, the generator preserves the existing podcast entries instead of erasing them.

The workflow becomes active after Build 5 is merged into the deployment branch because scheduled GitHub Actions run from the repository default branch.

## Publishing A Line Upon Line Lesson

Use the helper command so media and metadata stay synchronized:

```bash
python3 tools/add_line_upon_line_lesson.py add \
  --id "004-example-lesson" \
  --reference "Genesis 1:1" \
  --title "Example Lesson" \
  --description "Example description." \
  --published-at "2026-07-23" \
  --duration "4 min" \
  --video "/path/to/source-video.mp4" \
  --poster "/path/to/source-poster.jpg"
```

The command validates the ID, rejects duplicate IDs, validates the MP4 and poster file, copies the video into `media/scripture-explained/`, copies the poster into `images/app/scripture-explained/`, appends metadata to `data/app/line-upon-line.json`, and regenerates `data/app/content-feed.json`.

List current lessons with:

```bash
python3 tools/add_line_upon_line_lesson.py list
```
