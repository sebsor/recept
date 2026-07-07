const CACHE_NAME = 'our-menu-shell-v2';

// Only the app's own static files go in here — the shell that makes the
// app launchable and installable. Recipe data itself is never cached (see
// the fetch handler below) because this is a shared, synced tool: if we
// cached Supabase responses, you could open the app and see a stale
// recipe list, or worse, think a save succeeded when a write actually got
// silently served from cache instead of hitting the network.
const SHELL_ASSETS = [
  'index.html',
  'manifest.json',
  'logo.png',
  'logo.webp',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up caches from older versions of this service worker, so a
  // future redesign doesn't leave stale shell files sitting around forever.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Anything not on this exact origin (Supabase's API, Google Fonts, the
  // Supabase JS CDN script) is left completely alone — passed straight
  // through to the network, never intercepted or cached here.
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate: serve whatever's cached immediately (fast,
  // and works offline), but ALWAYS also fetch fresh in the background and
  // overwrite the cache for next time — regardless of whether anything
  // was cached already. This is what fixes the "installed app stuck on
  // day-one code" bug: a plain cache-first strategy only ever updates
  // when sw.js itself changes, so every index.html fix since day one
  // silently never reached anyone with the app already installed. With
  // this, the worst case is ONE stale load right after a change ships —
  // the very next launch is always current, with no version bump needed.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request)
        .then((response) => {
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached); // offline with nothing cached yet: fail gracefully

      return cached || networkFetch;
    })
  );
});
