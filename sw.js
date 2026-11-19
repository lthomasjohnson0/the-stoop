/*
 * Service worker: lets The Stoop install as an app and open without a connection.
 *
 * - The app's own files: network first, so updates show up right away, with the
 *   cached copy as the fallback when offline.
 * - Posters and backdrops from TMDB: cache first, since an image never changes.
 *   Capped so the cache can't grow forever.
 * - Fonts: served from cache, refreshed in the background.
 * - TMDB API calls are left alone and always go to the network.
 *
 * Bump VERSION whenever the list of app files changes.
 */
const VERSION = 'stoop-v3';
const SHELL_CACHE = `${VERSION}-shell`;
const IMAGE_CACHE = 'stoop-images';
const FONT_CACHE = 'stoop-fonts';
const IMAGE_LIMIT = 400;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './css/block.css',
  './js/films.js',
  './js/shows.js',
  './js/tmdb.js',
  './js/store.js',
  './js/recommend.js',
  './js/classroom.js',
  './js/app.js',
  './js/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES)
        // js/config.js is gitignored and may not exist, so cache it only if it's there.
        .then(() => cache.add('./js/config.js').catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.endsWith('-shell') && key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (url.hostname === 'image.tmdb.org') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, IMAGE_LIMIT));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // An offline navigation to any page in scope still opens the app.
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    throw error;
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
    trim(cache, limit);
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fresh;
}

// Drop the oldest entries once a cache passes its limit.
async function trim(cache, limit) {
  const keys = await cache.keys();
  const extra = keys.length - limit;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}
