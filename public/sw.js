/**
 * PWA — caché solo de assets estáticos; HTML y datos siempre red.
 */
/** Bump al cambiar hashing de assets (`/_app/`) para evitar HTML viejo apuntando a CSS borrado. */
const CACHE_NAME = "paso-chile-v3";
const STATIC_PATHS = new Set(["/logo.png", "/favicon_io/apple-touch-icon.png"]);

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(Array.from(STATIC_PATHS)).catch(() => {});
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    STATIC_PATHS.has(url.pathname) ||
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/favicon");

  if (!isStatic) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (!res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      });
    }),
  );
});
