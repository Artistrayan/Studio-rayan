// AetherForge Studio Service Worker - Cache Invalidation & Cleanup
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Pass through all fetch requests directly without intercepting or caching dev files
self.addEventListener('fetch', (event) => {
  return;
});
