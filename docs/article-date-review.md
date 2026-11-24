# Article publication dates: open review

**Status:** no dates were changed. These six articles have conflicting evidence and are kept at their
current dates until the owner decides. Do not change them without that decision, and do not invent dates.

Audited 2026-11-24 across page metadata (`article:published_time`, `<time itemprop="datePublished">`), the
Articles-page cards, the article catalog and Git history. Every other article’s date matches its
“Publish …” commit. The three articles dated Oct 26, 2026 (Halloween, Pharmakeia, Credibility Is Not Proof)
are genuine: there are three separate “Publish” commits that day.

## Disputed (6)

| Article | Current date (everywhere) | Earlier evidence |
|---|---|---|
| `articles/gentiles.html` | 2026-07-02 | First committed 2025-08-24 (`ec565648` “Add article: Gentiles meaning + image”); page originally dated August 24, 2025 |
| `articles/hamites-historicity.html` | 2026-07-02 | First committed 2025-08-24 (`7799f7a0` “Add article: Historicity of the Hamites”); page originally dated 2025-08-24 |
| `articles/is-creation-logical.html` | 2026-07-02 | First committed 2025-08-15 (`76788fce`); page originally dated 2025-08-15 |
| `articles/is-scripture-and-logic-compatible.html` | 2026-07-02 | First committed 2025-08-15 (`76585db0`); page originally dated 2025-08-15 |
| `articles/is-truth-reliable.html` | 2026-07-02 | First committed 2025-08-16 (`3c553653` “Add article #3: Is Truth Reliable?”); page originally dated 2025-08-15 |
| `articles/three-laws-of-logic.html` | 2026-07-02 | First committed 2025-08-24 (`24048e97` “Add article: Three Laws of Logic”); page originally dated 2025-08-24 |

All six were changed from their 2025 dates to 2026-07-02 by the owner’s commit `517b4be0` “Correct historical
article publication dates” (2026-09-16). No commit touched these six files on 2026-07-02. That day’s only
article publication was “250 Years of Christianity” (`f3c7bba3`).

## If a date is changed later

Update it everywhere together, so the cards, archive, author modal, search and feeds stay consistent:

- the article page: `article:published_time`, the `<time id="pub-date" itemprop="datePublished">` value and visible text, and any JSON-LD `datePublished`
- the card in `articles.html` (`<time class="meta-date" datetime="…">`)
- the card in `articles-all.html`
- the profile list in `authors/semitic-jew.html` (the live list is rebuilt from `articles.html`)
- then rebuild `search-index.json` (CI does this) and `data/app/content-feed.json` (`tools/update_app_content_feed.py`)
