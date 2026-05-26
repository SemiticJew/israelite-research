# Semitic Jew Website Styles Map

This document tracks the major CSS areas currently used across the site. Use this before editing `styles.css` so visual fixes are made carefully and intentionally.

## Main Stylesheet

Primary stylesheet:

```text
styles.css
```

Many pages also contain page-specific inline `<style>` blocks. When debugging a visual issue, check both:

```text
1. styles.css
2. the page's inline <style> block
```

## Major CSS Areas

### Global Layout / Theme
- body
- theme variables
- light/dark mode inheritance
- global background and text color
- containers
- overflow control

### Header / Navigation
- universal header partial
- desktop navigation
- dropdown menus
- rotating dropdown arrows
- mobile hamburger navigation
- mobile dropdown visibility

Related files:

```text
partials/header.html
styles.css
js/include.js
js/theme-toggle.js
```

### Footer
- footer columns
- Resources
- The Writings
- Legal
- social links
- newsletter area
- dark mode footer styles

Related files:

```text
partials/footer.html
styles.css
```

### Homepage
- hero
- featured teaching
- minimal video cards
- latest YouTube videos
- article previews
- support callout

Related files:

```text
index.html
js/youtube-featured-teachings.js
js/youtube-latest.js
data/youtube-videos.json
data/youtube-podcast-videos.json
```

### Articles Landing Page
- featured articles
- discovery region
- recent articles
- article labels
- card borders
- mobile editorial feed
- dark mode visibility

Related file:

```text
articles.html
```

### Article Archive
- articles-all.html
- archive hero
- search box
- theme filter
- article archive grid
- support callout

Related file:

```text
articles-all.html
```

### Individual Article Pages
- article title/header
- author row
- share buttons
- article body
- hero image
- mobile reading layout
- breadcrumbs

Related pages:

```text
articles/*.html
```

### Biblia / Canon Pages
- Tanakh page
- New Testament page
- Apocrypha page
- canon hero sections
- canon cards
- card hover underline removal
- breadcrumbs

Related pages:

```text
tanakh.html
newtestament.html
apocrypha.html
```

### Canon Book Pages
- book chapter grids
- chapter count cards
- breadcrumbs

Related pages:

```text
tanakh/*.html
newtestament/*.html
apocrypha/*.html
```

Related script:

```text
js/wire-chapter-cards.js
```

### Chapter Reader Pages
- chapter reader layout
- reader toolbar
- breadcrumbs
- footer/include cleanup
- mobile reader toolbar stacking

Related pages:

```text
tanakh/chapter.html
newtestament/chapter.html
apocrypha/chapter.html
```

Related script:

```text
js/nt-chapter.js
```

### Media Page
- media hero
- podcast teachings grid
- latest videos grid
- platform cards
- mobile media layout

Related files:

```text
media.html
js/media-page.js
```

### Support Callouts
- Support the Work blocks
- donate button
- nonprofit support language

Related pages:

```text
index.html
articles.html
articles-all.html
media.html
about.html
```

### Breadcrumbs
- visual breadcrumbs
- breadcrumb wrapping
- mobile behavior
- schema injection

Related files:

```text
js/breadcrumb-schema.js
styles.css
```

### Dark Mode
- dark backgrounds
- dark text colors
- article card visibility
- media cards
- footer contrast
- support callouts

Related files:

```text
styles.css
page-level inline styles
```

### Mobile Overrides
- mobile hamburger
- mobile dropdowns
- mobile article reading layout
- mobile articles feed
- mobile media cards
- canon card stacking
- overflow-x fixes

Related file:

```text
styles.css
```

## Cleanup Rule

Do not delete or merge CSS rules aggressively unless the visual result is checked on:

```text
https://semiticjew.org/
https://semiticjew.org/articles.html
https://semiticjew.org/articles-all.html
https://semiticjew.org/articles/is-creation-logical.html
https://semiticjew.org/media.html
https://semiticjew.org/tanakh.html
https://semiticjew.org/tanakh/genesis.html
https://semiticjew.org/tanakh/chapter.html?book=genesis&ch=1
https://semiticjew.org/about.html
```

## Recommended CSS Cleanup Strategy

1. Do not change visuals first.
2. Add comments/section markers.
3. Move only obviously related rules together.
4. Test desktop and mobile.
5. Test dark and light mode.
6. Commit small batches.
