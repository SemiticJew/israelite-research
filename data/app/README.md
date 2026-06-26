# Semitic Jew App Data

`/app.html` is the mobile-first institute dashboard. It loads data from this folder through `/js/app/app-shell.js`.

- `courses.json`: structured Study courses and lesson objects.
- `daily-precepts.json`: rotating daily precepts for the dashboard.
- `doctrine-topics.json`: starter doctrine topics for future retrieval and AI grounding.
- `watch-feed.json`: fallback Watch cards if the YouTube feed is unavailable.
- `practice-plans.json`: local practice modules saved with the `semiticJewAppProgress` localStorage key.

The Ask section currently uses `/js/app/ai-mock.js`. A real backend should replace `getStudyCompanionResponse()` with an authenticated API call that retrieves only from approved Semitic Jew content, Bible data, transcripts, articles, and saved user notes. Do not put API keys in browser code.
