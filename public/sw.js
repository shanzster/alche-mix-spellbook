/*
 * AlcheMix service worker — conservative offline resilience.
 *
 * Strategy:
 *  - Precache the app shell ("/"), manifest, icons and logo on install.
 *  - Navigations (HTML): network-first, falling back to the cache and
 *    finally to the cached "/" shell when fully offline.
 *  - Same-origin static assets (scripts/styles/fonts/images, hashed
 *    /assets/ build files, 3d-models, targets.mind): stale-while-revalidate.
 *  - NEVER cache non-GET requests, cross-origin requests (Firebase /
 *    Google APIs / fonts CDNs), or anything under /api.
 *
 * Bump SW_VERSION to invalidate old caches on deploy.
 */

const SW_VERSION = "v1";
const CACHE_NAME = `alchemix-${SW_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/logo-outline.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("alchemix-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Static asset extensions we are happy to serve stale-while-revalidate. */
const STATIC_EXTENSIONS =
  /\.(?:js|mjs|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|ico|avif|gltf|glb|bin|mind|webmanifest|json)$/i;

function isStaticAsset(url) {
  if (url.pathname.startsWith("/assets/")) return true; // hashed build files
  if (url.pathname.startsWith("/3d-models/")) return true;
  return STATIC_EXTENSIONS.test(url.pathname);
}

/** Network-first for navigations; cache fallback; "/" shell as last resort. */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match("/");
    if (shell) return shell;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

/** Stale-while-revalidate for same-origin static assets. */
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  if (cached) return cached;
  const response = await network;
  if (response) return response;
  return new Response("Offline", { status: 503, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET requests are ever cached or intercepted.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch cross-origin requests (Firebase, Google APIs, font CDNs...).
  if (url.origin !== self.location.origin) return;

  // Never cache API/server-function traffic.
  if (url.pathname.startsWith("/api")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  }
  // Anything else: let the browser handle it normally.
});
