/* media-page.js — Media page (/media.html) and Publications hub (/publications.html).
   Data comes only from existing sources:
   - /data/podcast-episodes.json        (verified podcast RSS, cached by scripts/fetch_podcast_rss.py)
   - /data/youtube-videos.json          (channel uploads, same workflow)
   - /articles.html via window.loadArticleCatalog (js/article-catalog.js)
   - /books.html (book cards)
   Everything is built with DOM APIs (no HTML strings from data). Audio streams only when the
   visitor presses play (preload="none"). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : String(v));
    }
    kids.flat().forEach(k => { if (k != null && k !== false && k !== '') n.append(k instanceof Node ? k : String(k)); });
    return n;
  };
  const svg = path => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', path); s.append(p); return s; };
  const PLAY = 'M8 5v14l11-7z';
  const YT_WATCH = /^https:\/\/www\.youtube\.com\/(watch\?v=[\w-]{6,20}(&list=[\w-]+)?|shorts\/[\w-]{6,20})$/;
  const YT_THUMB = /^https:\/\/i\d?\.ytimg\.com\/vi\/[\w-]{6,20}\/[\w.-]+$/;

  // Episode descriptions start with the same support boilerplate; show the episode's own words instead.
  function cleanDescription(raw) {
    let t = String(raw || '');
    t = t.replace(/^\s*Support Semitic Jew Inc\.?[\s\S]*?Website:\s*\S+\s*/i, '');
    t = t.replace(/^\s*Support Semitic Jew(?: Inc\.?)?['’]s educational work:\s*(?:https?:\/\/\S+\s*)?/i, '');
    t = t.replace(/^(\s*#[\w-]+)+\s*/, '');
    t = t.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
    return t;
  }
  const truncate = (s, n) => { const t = String(s || '').trim(); if (t.length <= n) return t; const cut = t.slice(0, n - 1); return cut.slice(0, Math.max(cut.lastIndexOf(' '), n * .6)).trim() + '…'; };
  const formatDate = v => { const d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); };
  const safeVideos = data => (Array.isArray(data && data.videos) ? data.videos : []).filter(v => v && YT_WATCH.test(v.url || '') && YT_THUMB.test(v.thumbnail || ''));
  const getJSON = url => fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
  const empty = (list, text) => list && list.replaceChildren(el('li', { class: 'pub-empty', text }));

  // Long-form only: YouTube Shorts arrive with /shorts/ links in the channel feed and are always excluded.
  const longForm = vids => vids.filter(v => !/\/shorts\//.test(v.url));
  // Season/episode lessons (titles like "… | S3 E13") first, newest episode first; then other long-form uploads by date.
  const epNum = t => { const m = /\bS(\d{1,2})\s*\|?\s*E(\d{1,3})\b/i.exec(t || ''); return m ? [Number(m[1]), Number(m[2])] : null; };
  function teachings(vids) {
    const lf = longForm(vids);
    const eps = lf.filter(v => epNum(v.title)).sort((a, b) => { const x = epNum(a.title), y = epNum(b.title); return (y[0] - x[0]) || (y[1] - x[1]); });
    const rest = lf.filter(v => !epNum(v.title)).sort((a, b) => String(b.published).localeCompare(String(a.published)));
    return eps.concat(rest);
  }

  // Branded HTML5 audio from the verified podcast RSS (cached in /data/podcast-episodes.json).
  const AUDIO = /^https:\/\/(anchor\.fm|[a-z0-9.-]+\.cloudfront\.net|[a-z0-9.-]+\.podcasters\.spotify\.com)\//;
  const safeEpisodes = data => (Array.isArray(data && data.episodes) ? data.episodes : []).filter(e => e && e.title && AUDIO.test(e.audio || ''));
  const prettyDuration = d => { const p = String(d || '').split(':').map(Number); if (p.some(isNaN) || !p.length) return ''; const s = p.reduce((a, v) => a * 60 + v, 0); const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h} hr ${m} min` : `${m} min`; };
  function audioEpisode(e, featured) {
    const audio = el('audio', { controls: true, preload: 'none', src: e.audio, 'aria-label': `Play episode: ${e.title}` });
    audio.addEventListener('play', () => document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); }));
    const meta = [formatDate(e.published), prettyDuration(e.duration)].filter(Boolean).join(' · ');
    const desc = featured ? truncate(e.description, 260) : '';
    return el('article', { class: `pub-audio${featured ? ' is-featured' : ''}` },
      el('span', { class: 'pub-format', text: featured ? 'Latest episode' : 'Episode' }),
      el(featured ? 'h3' : 'h4', { class: 'pub-audio-title', text: e.title }),
      meta ? el('p', { class: 'pub-card-meta', text: meta }) : '',
      desc ? el('p', { class: 'pub-card-desc', text: desc }) : '',
      audio);
  }
  function renderPodcast(host, count, featureFirst) {
    if (!host) return;
    getJSON('/data/podcast-episodes.json').then(data => {
      const eps = safeEpisodes(data).slice(0, count);
      if (!eps.length) return empty(host, 'Episodes will appear here soon.');
      host.replaceChildren(...eps.map((e, i) => el('li', null, audioEpisode(e, featureFirst && i === 0))));
    }).catch(() => empty(host, 'Episodes are unavailable right now.'));
  }

  function thumb(src, contain) {
    return el('div', { class: `pub-thumb${contain ? ' is-contain' : ''}` }, el('img', { src, alt: '', loading: 'lazy', width: 480, height: 270 }));
  }
  function videoCard(v, format) {
    const t = thumb(v.thumbnail);
    t.append(el('span', { class: 'pub-play', 'aria-hidden': 'true' }, svg(PLAY)));
    const desc = truncate(cleanDescription(v.description), 140);
    return el('li', null, el('a', { class: 'pub-card', href: v.url, target: '_blank', rel: 'noopener' },
      t,
      el('div', { class: 'pub-card-body' },
        el('span', { class: 'pub-format', text: format }),
        el('h3', { class: 'pub-card-title', text: v.title }),
        desc ? el('p', { class: 'pub-card-desc', text: desc }) : '',
        el('span', { class: 'pub-card-meta' }, formatDate(v.published), el('span', { class: 'pub-sr', text: ' (opens YouTube in a new tab)' })))));
  }


  // ---------- Media page
  if ($('media-podcast-grid') || $('media-latest-grid')) {
    renderPodcast($('media-podcast-grid'), 8, true);
    getJSON('/data/youtube-videos.json').then(data => {
      const vids = teachings(safeVideos(data)).slice(0, 8);
      if (!vids.length) return empty($('media-latest-grid'), 'Video teachings will appear here soon.');
      $('media-latest-grid').replaceChildren(...vids.map(v => videoCard(v, epNum(v.title) ? `Season ${epNum(v.title)[0]} · Episode ${epNum(v.title)[1]}` : 'Video teaching')));
    }).catch(() => empty($('media-latest-grid'), 'Videos are unavailable right now.'));
  }

  // ---------- Publications hub
  const limit = id => Number(($(id) || {}).dataset?.limit) || 3;
  renderPodcast($('pub-podcast'), limit('pub-podcast'), true);
  if ($('pub-videos')) {
    getJSON('/data/youtube-videos.json').then(data => {
      const vids = teachings(safeVideos(data)).slice(0, limit('pub-videos'));
      vids.length ? $('pub-videos').replaceChildren(...vids.map(v => videoCard(v, epNum(v.title) ? `Season ${epNum(v.title)[0]} · Episode ${epNum(v.title)[1]}` : 'Video teaching'))) : empty($('pub-videos'), 'Video teachings will appear here soon.');
    }).catch(() => empty($('pub-videos'), 'Videos are unavailable right now.'));
  }
  if ($('pub-articles') && typeof window.loadArticleCatalog === 'function') {
    window.loadArticleCatalog().then(items => {
      const picks = items.filter(a => /^\/articles\/[a-z0-9-]+\.html$/.test(a.href)).slice(0, limit('pub-articles'));
      if (!picks.length) return empty($('pub-articles'), 'Articles will appear here soon.');
      $('pub-articles').replaceChildren(...picks.map(a => el('li', null, el('a', { class: 'pub-card', href: a.href },
        /^\/images\//.test(a.image || '') ? thumb(a.image, true) : '',
        el('div', { class: 'pub-card-body' },
          el('span', { class: 'pub-format', text: 'Article' }),
          el('h3', { class: 'pub-card-title', text: a.title }),
          a.excerpt ? el('p', { class: 'pub-card-desc', text: truncate(a.excerpt, 150) }) : '',
          el('span', { class: 'pub-card-meta', text: a.date ? formatDate(/^\d{4}-\d{2}-\d{2}$/.test(a.date) ? a.date + 'T12:00:00Z' : a.date) : '' }))))));
    }).catch(() => empty($('pub-articles'), 'Articles are unavailable right now.'));
  }
  if ($('pub-books')) {
    fetch('/books.html', { cache: 'no-store' }).then(r => r.text()).then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const cards = [...doc.querySelectorAll('.books-grid .hub-card')].map(card => {
        const title = (card.querySelector('h3') || {}).textContent || '';
        const sub = (card.querySelector('.book-subtitle') || {}).textContent || '';
        const status = (card.querySelector('.book-availability, .coming, .book-release') || {}).textContent || '';
        const img = card.querySelector('img.book-cover');
        const link = card.querySelector('a.book-more, a.cover-display');
        const href = link ? link.getAttribute('href') : '';
        const okHref = /^\/[a-z0-9-]+\.html$/.test(href) || /^https:\/\/[a-z0-9.-]+\.(gumroad\.com|amazon\.com)\//.test(href);
        const body = el('div', { class: 'pub-card-body' },
          el('span', { class: 'pub-format', text: 'Book' }),
          el('h3', { class: 'pub-card-title', text: title.trim() }),
          sub ? el('p', { class: 'pub-card-desc', text: sub.trim() }) : '',
          status ? el('span', { class: 'pub-card-meta', text: status.trim() }) : '');
        const cover = img && /^\/book-assets\//.test(img.getAttribute('src')) ? thumb(img.getAttribute('src'), true) : el('div', { class: 'pub-thumb' });
        const ext = okHref && /^https:/.test(href);
        return el('li', null, okHref ? el('a', { class: 'pub-card', href, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null }, cover, body) : el('div', { class: 'pub-card' }, cover, body));
      });
      cards.length ? $('pub-books').replaceChildren(...cards) : empty($('pub-books'), 'Books will appear here soon.');
    }).catch(() => empty($('pub-books'), 'Books are unavailable right now.'));
  }
})();
