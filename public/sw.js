/**
 * Service worker minimal.
 *
 * Strategia:
 *  - cache statici (Cache First) per asset Next.js (_next/static/, public assets)
 *  - network-first per HTML page (cosi vediamo sempre dati freschi quando online)
 *  - niente cache di API/Server Actions (sempre live)
 *
 * No background sync, no push notifications in MVP.
 */

const CACHE_NAME = "todoist-tracker-v1";
const STATIC_ASSETS = ["/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API + auth + integrations: sempre network, mai cache
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    request.headers.get("accept")?.includes("text/event-stream")
  ) {
    return;
  }

  // Static assets: cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            return res;
          }),
      ),
    );
    return;
  }

  // HTML / SSR: network-first, fallback cache
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached ??
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            }),
          ),
        ),
    );
  }
});
