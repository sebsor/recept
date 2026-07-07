const CACHE_NAME = 'our-menu-shell-v1';

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

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
