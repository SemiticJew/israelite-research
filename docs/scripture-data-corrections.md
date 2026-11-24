# Scripture data corrections (open)

Issues found during the Bible reader (Batch 1) and Biblia/book page (Batch 2) work. **None of them have
been changed.** Scripture datasets and canon mappings may only be edited after separate approval, as a
dedicated data-correction project. The site handles each case honestly in the meantime, as described below.

Check the current state with:

```sh
ls data/tanakh/hosea/ data/apocrypha/baruch/                       # chapter files present
python3 tools/build_scripture_pages.py --check                     # pages mark missing chapters from data/
node --test tests/scripture-pages.test.mjs                         # asserts Hosea 14 is marked, not dropped
```

## 1. Missing chapters

| Book page | Page lists | Reader text exists | What visitors see now |
|---|---|---|---|
| `tanakh/hosea.html` | 14 chapters | 1–13 (`data/tanakh/hosea/14.json` is missing; the KJV has 14) | Chapter 14 is linked but marked “not yet in the reader”; the reader says “Hosea has 13 chapters”. |
| `apocrypha/baruch.html` | “Chapters: 5”; the old grid linked 1–6 | 1–5 (the KJV counts the Letter of Jeremiah as Baruch 6) | Chapter 6 is still linked (to keep the existing URL), marked unavailable. |
| `apocrypha/letter-of-jeremiah.html` | 1 chapter | none | Linked and marked; the page notes the text isn’t in the reader yet. Before Batch 2 this page showed no chapters at all. |

**Decision needed:** add Hosea 14 (KJV) to `data/tanakh/hosea/`. For Baruch 6 and the Letter of Jeremiah, decide
whether the Letter belongs to Baruch 6, its own book, or both, and update `data/apocrypha/books.json` to match.

## 2. Apocrypha book pages without Apocrypha reader text (canon mapping)

The Apocrypha hub lists 15 books, but `data/apocrypha/books.json` holds 10. These book pages link to
`/apocrypha/chapter.html?book=<slug>`, and the reader shows “isn’t in the Apocrypha reader”:

| Book page (slug) | Chapters listed | Related data that already exists elsewhere |
|---|---|---|
| `judith` | 16 | `data/tanakh/judit/` (16 chapters), shown in the Tanakh reader as “Judith” |
| `additions-to-esther` | 6 | `data/tanakh/addesth/` (7 chapters) |
| `prayer-of-azariah` | 1 | `data/tanakh/adddan/` (1 chapter, “Additions to Daniel”) may contain it |
| `prayer-of-manasseh` | 1 | `data/tanakh/manassse/` (1 chapter; note the triple “s” slug) |
| `letter-of-jeremiah` | 1 | none (see Baruch above) |

**Decision needed:** whether these texts should be read under the Apocrypha (which would mean adding or
moving data, or mapping slugs), and whether `adddan`, `addesth`, `judit`, `manassse` should stay in the Tanakh data.
The reader currently lists those four after Malachi as “Additional Texts”, outside the Genesis→Malachi sequence.

## 3. Blank verse entries (29)

These verse records exist with empty text (or the literal `[]`). The reader shows “Verse text unavailable”
instead of the raw value.

- **Real KJV verse missing (fix needed):** `newtestament/revelation/22:21` (“The grace of our Lord Jesus Christ be with you all. Amen.”).
- **Probably extra slots** (the KJV has no such verse; the dataset has an extra empty entry, so it should probably be removed):
  `newtestament/1-peter/5:15`, `newtestament/revelation/12:18`, `tanakh/1-kings/2:47`, `tanakh/ezekiel/19:15`,
  `tanakh/jeremiah/51:65`, `tanakh/judges/5:32`.
- **Apocrypha versification differences to review:** `apocrypha/sirach/33:32–33`, `34:27–31`, `35:21–26`, `36:27–31`, `44:23`;
  `apocrypha/tobit/6:18`, `apocrypha/tobit/10:13`; `tanakh/judit/15:14`.

## 4. Related small fixes (not data)

- `tools/build_search_index.py` includes `<script>`/`<style>` contents when it builds summaries for pages without a
  meta description. Biblia now has a description, but the indexer should skip those elements.
