// ponytail: passthrough service worker, only here to satisfy PWA installability.
// Add offline caching if/when that's actually needed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
