/**
 * Service Worker mínimo para PWA (instalable).
 * HTML y API van siempre a red; assets estáticos pueden cachearse.
 */
const CACHE_NAME = "paso-chile-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isStatic =
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname === "/logo.png";

  if (!isStatic) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (!res.ok || res.type === "opaque") return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      });
    }),
  );
});
