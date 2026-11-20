const CACHE = "sideline-shell-__VERSION__";
const ASSETS = __ASSETS__;
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await cache.addAll(
          ASSETS.map((url) => new Request(url, { cache: "reload" })),
        );
        // Updates wait until all older app windows close, or the operator requests an update.
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Keep previous versions while an older open tab can still request their chunks.
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data === "ACTIVATE") self.skipWaiting();
  if (event.data === "CHECK_READY")
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        const ready = (
          await Promise.all(ASSETS.map((url) => cache.match(url)))
        ).every(Boolean);
        event.source?.postMessage({ type: "OFFLINE_READY", ready });
      })(),
    );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (request.mode === "navigate")
        return (await cache.match("/index.html")) || fetch(request);
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
      // Older open clients may still need their content-addressed chunks.
      if (url.pathname.startsWith("/_nuxt/")) {
        const previous = await caches.match(request);
        if (previous) return previous;
      }
      return fetch(request);
    })(),
  );
});
