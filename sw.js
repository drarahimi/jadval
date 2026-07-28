// Service Worker for جدولانه — PWA Support & Network-First Caching Strategy
const CACHE_NAME = "jadval-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./crossword.js",
  "./words.js",
  "./manifest.json",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First Strategy: Fetch from network first for instant Live Server updates, fallback to cache if offline
self.addEventListener("fetch", (e) => {
  const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if (isDev) {
    // In dev mode (Live Server / localhost), always fetch fresh files directly from network
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // In production, try network first to get latest updates, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});
