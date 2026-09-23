// service-worker.js — Mission TAT Gujrat
// Minimal service worker: mainly needed so PWABuilder/Chrome treats this as
// an installable PWA. It caches the app shell for basic offline support.

const CACHE_NAME = "mission-tat-gujrat-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for Firebase/API calls, cache-first for app shell
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Never cache Firebase/Firestore/Auth calls — always go to network
  if (url.includes("firestore.googleapis.com") ||
      url.includes("firebaseio.com") ||
      url.includes("identitytoolkit.googleapis.com") ||
      url.includes("googleapis.com")) {
    return; // let the browser handle it normally
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            // cache a copy of successful same-origin GET responses
            if (
              event.request.method === "GET" &&
              response &&
              response.status === 200 &&
              response.type === "basic"
            ) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
