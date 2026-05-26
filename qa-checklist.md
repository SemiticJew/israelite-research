# Semitic Jew Website QA Checklist

Use this checklist before and after major website updates.

## Core Pages to Test

- https://semiticjew.org/
- https://semiticjew.org/articles.html
- https://semiticjew.org/articles/is-creation-logical.html
- https://semiticjew.org/media.html
- https://semiticjew.org/tanakh.html
- https://semiticjew.org/tanakh/genesis.html
- https://semiticjew.org/tanakh/chapter.html?book=genesis&ch=1
- https://semiticjew.org/about.html

## Header and Navigation

- Header appears once.
- Footer appears once.
- Desktop navigation works.
- Mobile hamburger opens and closes correctly.
- Dropdown links go to the correct pages.
- Media appears under Resources.
- Catechism appears under Organization.
- Theme toggle works in light and dark mode.

## Homepage

- Featured Teaching videos populate.
- Featured Teaching cards align cleanly.
- Latest Videos populate from YouTube feed.
- Article links work.
- Mobile layout does not wiggle horizontally.

## Articles

- Articles page cards are visible in light mode.
- Articles page works in dark mode.
- Featured article cards align correctly.
- Recent Articles grid works on desktop.
- Recent Articles stack cleanly on mobile.
- Article pages have breadcrumbs.
- Article pages have social preview images.
- Article mobile view has clean spacing and no horizontal wiggle.

## Biblia

- Tanakh page loads.
- New Testament page loads.
- Apocrypha page loads.
- Book pages show correct chapter counts.
- Chapter reader pages load the correct book and chapter.
- Breadcrumbs show correctly:
  - Home › Biblia › Tanakh
  - Home › Biblia › Tanakh › Genesis
  - Home › Biblia › Tanakh › Genesis › Chapter 1

## Media

- Media page loads.
- Podcast Teachings populate.
- Latest Videos populate.
- YouTube links open correctly.
- Mobile media cards stack cleanly.

## About / Verification

- About page loads.
- Organization Verification section is visible.
- EIN is correct.
- Address is correct.
- Mission and projects are visible.
- Header/footer About link works.

## Final Git Check

Run before committing:

```bash
git status
```

After committing and pushing:

```bash
git log --oneline -n 5
```
