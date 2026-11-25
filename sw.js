/* App shell cache for the standalone Classroom Digital Brain project. */
const CACHE_NAME = "classroom-codex-showcase-v13";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./studio.css",
  "./profile-intro.css?v=2",
  "./script.js?v=11",
  "./firebase-auth.js?v=1",
  "./firebase-config.js",
  "./manifest.json",
  "./icon.svg",
  "./assets/classroom-digital-brain-logo.svg",
  "./assets/classroom-digital-brain-logo.png",
  "./privacy.html",
  "./assets/vivek-portrait.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => (key.startsWith("classroom-digital-brain-") || key.startsWith("classroom-codex-")) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    // Keep Live Server and hosted updates fresh; use the cached shell only when offline.
    if (event.request.mode === "navigate") {
      try {
        const freshPage = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", freshPage.clone());
        return freshPage;
      } catch (error) {
        return caches.match("./index.html");
      }
    }
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      return await fetch(event.request);
    } catch (error) {
      if (event.request.mode === "navigate") return caches.match("./index.html");
      throw error;
    }
  })());
});
