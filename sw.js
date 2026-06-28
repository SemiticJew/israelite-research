const CACHE_VERSION = 'sj-pwa-v92';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/offline.html',
  '/biblia.html',
  '/tanakh.html',
  '/newtestament.html',
  '/apocrypha.html',
  '/styles.css',
  '/css/app.css',
  '/js/include.js',
  '/js/app/app-shell.js',
  '/js/app/ai-mock.js',
  '/js/app-status.js',
  '/js/app-install-guide.js',
  '/js/app-update-prompt.js',
  '/js/app-quick-actions.js',
  '/js/app-mobile-sections.js',
  '/js/app-changelog.js',
  '/js/app-study-trails.js',
  '/js/app-reading-history.js',
  '/js/reader-navigation.js',
  '/js/reader-progress.js',
  '/js/reader-preferences.js',
  '/js/reader-chapter-search.js',
  '/js/reader-share-tools.js',
  '/js/reader-shortcuts.js',
  '/js/app-data-schema.js',
  '/js/app-offline-chapters.js',
  '/js/reader-offline-chapter.js',
  '/js/reader-verse-jump.js',
  '/js/reader-deep-link.js',
  '/js/app-bookmarks.js',
  '/js/app-highlights.js',
  '/js/app-expositions.js',
  '/js/app-data-tools.js',
  '/js/app-global-scripture-search.js',
  '/data/study-trails.json',
  '/data/scripture-search-index.json',
  '/data/tanakh/books.json',
  '/data/newtestament/books.json',
  '/data/apocrypha/books.json',
  '/data/app-changelog.json',
  '/data/app/courses.json',
  '/data/app/daily-precepts.json',
  '/data/app/doctrine-topics.json',
  '/data/app/practice-plans.json',
  '/data/app/watch-feed.json',
  '/site.webmanifest',
  '/data/lexicon/verse-strongs-order.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

const APP_SHELL = [
  '/',
  '/index.html',
  '/app.html',
  '/offline.html',
  '/styles.css',
  '/css/app.css',
  '/js/include.js',
  '/js/app/app-shell.js',
  '/js/app/ai-mock.js',
  '/search.html',
  '/biblia.html',
  '/articles.html',
  '/media.html',
  '/dietary-laws.html',
  '/tanakh.html',
  '/newtestament.html',
  '/apocrypha.html',
  '/ologies.html',
  '/website-app.html',
  '/bible-app.html',
  '/site.webmanifest',
  '/data/app/courses.json',
  '/data/app/daily-precepts.json',
  '/data/app/doctrine-topics.json',
  '/data/app/practice-plans.json',
  '/data/app/watch-feed.json',
  '/data/lexicon/verse-strongs-order.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !key.startsWith(CACHE_VERSION))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isHtmlRequest(request){
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

function shouldCacheRuntime(url){
  return url.origin === self.location.origin && (
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/data/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  );
}

async function networkFirst(request){
  try{
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  }catch(error){
    const cached = await caches.match(request);
    return cached || fallbackResponseFor(request);
  }
}

async function staleWhileRevalidate(request){
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if(response && response.ok){
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || fallbackResponseFor(request));

  return cached || fetchPromise;
}

function fallbackResponseFor(request){
  const url = new URL(request.url);
  if (url.pathname.endsWith('.json') || url.pathname.startsWith('/data/')){
    const body = url.pathname.endsWith('/books.json') ? '{}' : '[]';
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  return caches.match('/offline.html');
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if(request.method !== 'GET') return;

  if(isHtmlRequest(request)){
    event.respondWith(networkFirst(request));
    return;
  }

  if(shouldCacheRuntime(url)){
    event.respondWith(staleWhileRevalidate(request));
  }
});


self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
